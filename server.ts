import express from "express";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import "dotenv/config";
import { BlobServiceClient } from "@azure/storage-blob";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";


// Mapeamento de idiomas para o novo endpoint
const LANGUAGES_MAP: Record<string, string> = {
  "Portuguese": "pt",
  "Japanese": "ja",
  "Chinese": "zh",
  "French": "fr",
  "German": "de",
  "Spanish": "es"
};

// Azure configurations (will be used by the server instead of the browser later)
const azureKey = process.env.VITE_AZURE_KEY!;
const azureEndpoint = process.env.VITE_AZURE_ENDPOINT!;
const azureRegion = process.env.VITE_AZURE_REGION || "brazilsouth";

// Stripe Configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

if (!stripe) {
  console.warn("⚠️ AVISO: STRIPE_SECRET_KEY não encontrada no .env. As funcionalidades de pagamento estarão desativadas.");
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";


// Configuração de pastas (similar ao PDF)
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const OUTPUTS_DIR = path.join(process.cwd(), "outputs");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const id = uuidv4();
    cb(null, `${id}_${file.originalname}`);
  },
});

const upload = multer({ storage });

// Supabase Admin Client (para gerenciar quotas)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function countCharacters(filePath: string, mimetype: string): Promise<number> {
  const fileBuffer = fs.readFileSync(filePath);
  
  if (mimetype === "application/pdf") {
    const data = await pdf(fileBuffer);
    return data.text.replace(/\s+/g, "").length;
  } 
  
  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const data = await mammoth.extractRawText({ buffer: fileBuffer });
    return data.value.replace(/\s+/g, "").length;
  }

  return 0;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(compression({ level: 6, threshold: 512 }));
  app.use(express.json());

  // WebSocket Server
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map<string, Set<WebSocket>>();

  // In-memory status tracking
  const tasks = new Map<string, { status: string; outputUrl?: string; error?: string; progress?: any }>();

  // API Routes
  app.post("/api/translate", (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(500).json({ error: `Unknown upload error: ${err.message}` });
      }

      const file = req.file;
      const targetLang = req.body.targetLang || "Portuguese";

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const taskId = file.filename.split("_")[0];
      tasks.set(taskId, { status: "processing", progress: { percentage: 0, message: "Starting..." } });

      res.json({ taskId, filename: file.filename });
    });
  });

  app.get("/api/status/:id", (req, res) => {
    const task = tasks.get(req.params.id);
    res.json(task || { status: "not_found" });
  });

  app.post("/api/complete/:id", (req, res) => {
    const { outputUrl } = req.body;
    tasks.set(req.params.id, { status: "completed", outputUrl });
    res.json({ success: true });
  });

  // NOVO: Tradução Baseada em Container (Modo Robusto - API v2024-05-01)
  app.post("/api/azure/translate-sync", upload.single("file"), async (req, res) => {
    console.log("--- Proxy: Iniciando Tradução BATCH (Modo Robusto) ---");
    try {
      const { targetLang } = req.body;
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      // 0. Autenticação e Verificação de Quota
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Não autenticado" });

      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authError || !user) return res.status(401).json({ error: "Sessão inválida" });

      const { data: profile, error: dbError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (dbError || !profile) {
        console.error(` > [DEBUG] Perfil não encontrado para o usuário: ${user.id}`);
        console.error(` > [DEBUG] Erro do Banco de Dados:`, dbError);
        console.warn(` > [DICA] Certifique-se de que a SUPABASE_SERVICE_ROLE_KEY está correta no seu arquivo .env.`);
        return res.status(404).json({ 
          error: "Perfil não encontrado", 
          details: dbError?.message || "O usuário existe no Auth mas não tem um registro na tabela profiles." 
        });
      }

      // Contagem de caracteres
      const charCount = await countCharacters(file.path, file.mimetype);
      console.log(` > Proxy: Arquivo detectado com ${charCount} caracteres.`);

      // Lógica de Proteção de Margem e Quotas Lumina
      const isFreePlan = profile.plan_type === "free" || !profile.plan_type;
      
      // 1. Limite por ARQUIVO (Plano Free: 5000 chars)
      if (isFreePlan && charCount > 5000) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(403).json({ 
          error: "Limite do Plano Free excedido", 
          details: `O plano gratuito permite arquivos de até 5.000 caracteres. Este arquivo tem ${charCount}. Faça o upgrade para o Plano Professional!` 
        });
      }

      // 2. Limite de FILES por MÊS (Plano Free: 2 arquivos)
      if (isFreePlan && profile.files_this_month >= 2) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(403).json({ 
          error: "Limite mensal atingido", 
          details: `Você já traduziu o limite de 2 arquivos mensais do plano gratuito. Faça o upgrade para continuar!` 
        });
      }

      // 3. Limite de QUOTA TOTAL (Para planos pagos)
      if (profile.characters_used + charCount > profile.quota_limit) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(403).json({ 
          error: "Limite de quota atingido", 
          details: `Seu plano atual permite mais ${profile.quota_limit - profile.characters_used} caracteres. Este arquivo requer ${charCount}. Adquira créditos avulsos!` 
        });
      }

      const userId = user.id;
      const taskId = uuidv4().slice(0, 8);
      const targetLangCode = LANGUAGES_MAP[targetLang] || "pt";
      
      const inputUrlFull = process.env.VITE_AZURE_STORAGE_INPUT_URL!;
      const targetUrlFull = process.env.VITE_AZURE_STORAGE_OUTPUT_URL!;
      
      const [inputBase, inputSas] = inputUrlFull.split('?');
      const [targetBase, targetSas] = targetUrlFull.split('?');
      
      // Construção de caminhos (Mantendo USER_ID/TASK_ID para compatibilidade com Frontend)
      const blobPath = `${userId}/${taskId}/${encodeURIComponent(file.originalname)}`;
      const folderPrefix = `${userId}/${taskId}/`;
      const uploadUrl = `${inputBase}/${blobPath}?${inputSas}`;

      // 1. Upload do arquivo para o Storage (Usando a subpasta da tarefa como prefixo)
      console.log(` > Proxy: Uploading to Azure Storage: ${blobPath}`);
      const fileBuffer = fs.readFileSync(file.path);
      const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
              "x-ms-blob-type": "BlockBlob",
              "x-ms-version": "2024-11-04",
              "Content-Type": file.mimetype || "application/pdf"
          },
          body: fileBuffer
      });

      if (!uploadRes.ok) throw new Error(`Storage Upload Failed: ${uploadRes.status}`);

      // 2. Chamar Tradutor (DOCUMENT TRANSLATION v2024-05-01 - Modo Container + Prefixo)
      const endpoint = `${azureEndpoint.replace(/\/$/, "")}/translator/document/batches?api-version=2024-05-01`;
      
      const payload = {
          inputs: [{
              source: { 
                  sourceUrl: `${inputBase}/?${inputSas}`, // A barra antes do ? é necessária para algumas versões da API
                  filter: { prefix: folderPrefix }
              },
              targets: [{ 
                  targetUrl: `${targetBase}/?${targetSas}`, 
                  language: targetLangCode
              }]

          }]
      };

      console.log(` > Proxy: Iniciando Job no Azure (v2024-05-01)...`);
      
      const response = await fetch(endpoint, {
          method: "POST",
          headers: {
              "Ocp-Apim-Subscription-Key": azureKey,
              "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
      });

      if (response.status !== 202) {
          const errorData = await response.text();
          throw new Error(`Azure Batch Error: ${response.status} - ${errorData}`);
      }

      const operationLocation = response.headers.get("operation-location");
      res.json({ operationLocation, taskId, userId });

      // Auto-cleanup do arquivo local (o do storage fica por 30 min conforme planejado antes)
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      // Limpeza do Storage (Opcional, mas mantido para boa prática)
      setTimeout(async () => {
        try {
          const bsc = new BlobServiceClient(inputUrlFull);
          const containerName = new URL(inputBase).pathname.split('/').pop()!;
          const containerClient = bsc.getContainerClient(containerName);
          await containerClient.getBlobClient(blobPath).deleteIfExists();
          console.log(` > 🗑️ Auto-cleanup: deleted source blob ${blobPath}`);
        } catch (cleanupErr: any) {
          console.warn(` > ⚠️ Auto-cleanup warning: ${cleanupErr.message}`);
        }
      }, 30 * 60 * 1000);

      // 3. Atualizar quota no Supabase após sucesso no disparo
      await supabaseAdmin.rpc('increment_chars', { 
        user_id: userId, 
        amount: charCount 
      });

      // 4. Incrementar contador de arquivos para plano Free
      if (isFreePlan) {
        await supabaseAdmin
          .from('profiles')
          .update({ files_this_month: (profile.files_this_month || 0) + 1 })
          .eq('id', userId);
      }

    } catch (error: any) {
      console.error(` > Erro Crítico no Proxy: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });


  // Azure Translator Proxy Routes (Original Batch - Keep for legacy/status check)

  app.post("/api/azure/translate", async (req, res) => {
    // Redireciona para o novo endpoint robusto interno
    console.log("--- Proxy: Redirecionando Tradução Legada ---");
    res.status(400).json({ error: "Use /api/azure/translate-sync for robust document translation" });
  });


  app.get("/api/azure/status", async (req, res) => {
    try {
      const operationLocation = req.query.url as string;
      if (!operationLocation) return res.status(400).json({ error: "Missing operationLocation" });
      
      console.log(`--- Proxy: Verificando Status ---`);
      const response = await fetch(operationLocation, {
        headers: { 
          "Ocp-Apim-Subscription-Key": azureKey,
          "Ocp-Apim-Subscription-Region": azureRegion
        }
      });
      
      const data = await response.json();
      console.log(` > Status Atual: ${data.status}`);
      
      if (data.status === "Failed" || data.status === "ValidationFailed") {
        console.error(` > ❌ Erro Detalhado: ${JSON.stringify(data.error || data.summary || data, null, 2)}`);
      }
      
      res.json(data);
    } catch (error: any) {
      console.error(` > Erro no Status Proxy: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/azure/list-outputs", async (req, res) => {
    try {
      const outputUrl = process.env.VITE_AZURE_STORAGE_OUTPUT_URL!;
      const [baseUrl, sas] = outputUrl.split('?');
      const listUrl = `${baseUrl}?restype=container&comp=list&${sas}`;
      
      console.log(`--- Proxy: Listando Arquivos de Saída ---`);
      const response = await fetch(listUrl);
      const xml = await response.text();
      
      const files = xml.match(/<Name>(.*?)<\/Name>/g) || [];
      const fileNames = files.map(f => f.replace(/<\/?Name>/g, ''));
      
      console.log(` > Encontrados ${fileNames.length} arquivos.`);
      res.json({ files: fileNames });
    } catch (error: any) {
      console.error(` > Erro ao listar outputs: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // --- STRIPE ENDPOINTS ---

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe não está configurado no servidor. Verifique o seu .env." });
      }
      const { priceId, userId, planType } = req.body;
      
      if (!priceId || !userId) {
        return res.status(400).json({ error: "Price ID e User ID são obrigatórios" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment", // Alterado para aceitar preços únicos (One-time) em vez de assinaturas
        success_url: `${req.headers.origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/?canceled=true`,
        metadata: {
          userId,
          planType, // 'professional', 'elite', 'business' ou 'credits'
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Erro ao criar sessão de checkout:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe) return res.status(500).send("Stripe não configurado");
    const sig = req.headers["stripe-signature"]!;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, planType } = session.metadata!;
      
      console.log(`✅ Pagamento confirmado para usuário ${userId} - Plano: ${planType}`);

      // Mapeamento de Quotas baseadas no Manual de Monetização
      const QUOTAS: Record<string, number> = {
        'professional': 400000,
        'elite': 850000,
        'business': 1800000,
        'credits': 50000, // Bloco de 50k
      };

      const charIncrement = QUOTAS[planType] || 0;

      if (planType === "credits") {
        // Apenas adiciona à quota existente
        await supabaseAdmin.rpc('increment_quota_limit', { 
          user_id: userId, 
          amount: charIncrement 
        });
      } else {
        console.log(` > Aplicando atualização de plano: ${planType} para o limite ${charIncrement}`);
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ 
            plan_type: planType, 
            quota_limit: charIncrement,
            characters_used: 0, 
            files_this_month: 0
          })
          .eq("id", userId);

        if (updateError) {
          console.error(` ❌ Erro ao atualizar perfil no Supabase:`, updateError);
        } else {
          console.log(` ✨ Perfil atualizado com sucesso no banco de dados.`);
        }
      }
    }

    res.json({ received: true });
  });

  // PROXY DE DOWNLOAD: Resolve o problema de env variables no frontend
  app.get("/api/download/:userId/:taskId/:filename", async (req, res) => {
    try {
      const { userId, taskId, filename } = req.params;
      const outputUrlFull = process.env.VITE_AZURE_STORAGE_OUTPUT_URL!;
      const [baseUrl, sas] = outputUrlFull.split('?');
      
      const blobPath = `${userId}/${taskId}/${filename}`;
      // Encode o filename para a requisição interna à Azure, mas mantém a estrutura de pastas
      const encodedBlobPath = `${userId}/${taskId}/${encodeURIComponent(filename)}`;
      const downloadUrl = `${baseUrl}/${encodedBlobPath}?${sas}`;
      
      console.log(` > Proxy Download: ${blobPath} (Encoded: ${encodedBlobPath})`);
      
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      
      const contentType = response.headers.get("Content-Type") || "application/pdf";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
      
    } catch (error: any) {
      console.error(` > Erro no Proxy Download: ${error.message}`);
      res.status(404).send("Arquivo não encontrado ou erro no servidor.");
    }
  });

  // Vite middleware (FORÇADO PARA DESENVOLVIMENTO)
  if (true || process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: '1y',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.match(/\.(js|css|woff|woff2)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.match(/\.(png|jpg|jpeg|gif|ico|svg|webp)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // WebSocket Upgrade Handling
  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const taskIdMatch = url.pathname.match(/\/ws\/(.+)/);

    if (taskIdMatch) {
      const taskId = taskIdMatch[1];
      wss.handleUpgrade(request, socket, head, (ws) => {
        if (!clients.has(taskId)) clients.set(taskId, new Set());
        clients.get(taskId)!.add(ws);

        ws.on("message", (data) => {
          // Broadcast progress messages for this task
          const message = data.toString();
          const parsed = JSON.parse(message);
          
          // Update task state
          const task = tasks.get(taskId);
          if (task) {
            task.progress = parsed;
            tasks.set(taskId, task);
          }

          // Send to all clients watching this task
          clients.get(taskId)?.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        });

        ws.on("close", () => {
          clients.get(taskId)?.delete(ws);
          if (clients.get(taskId)?.size === 0) clients.delete(taskId);
        });
      });
    } else {
      socket.destroy();
    }
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
