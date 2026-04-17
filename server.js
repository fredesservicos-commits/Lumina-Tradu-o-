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
// Mapeamento de idiomas para o novo endpoint
const LANGUAGES_MAP = {
    "Portuguese": "pt",
    "Japanese": "ja",
    "Chinese": "zh",
    "French": "fr",
    "German": "de",
    "Spanish": "es"
};
// Azure configurations (will be used by the server instead of the browser later)
const azureKey = process.env.VITE_AZURE_KEY;
const azureEndpoint = process.env.VITE_AZURE_ENDPOINT;
const azureRegion = process.env.VITE_AZURE_REGION || "brazilsouth";
// Configuração de pastas (similar ao PDF)
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const OUTPUTS_DIR = path.join(process.cwd(), "outputs");
if (!fs.existsSync(UPLOADS_DIR))
    fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(OUTPUTS_DIR))
    fs.mkdirSync(OUTPUTS_DIR);
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const id = uuidv4();
        cb(null, `${id}_${file.originalname}`);
    },
});
const upload = multer({ storage });
async function startServer() {
    const app = express();
    const httpServer = createServer(app);
    const PORT = Number(process.env.PORT) || 3000;
    app.use(cors());
    app.use(compression({ level: 6, threshold: 512 }));
    app.use(express.json());
    // WebSocket Server
    const wss = new WebSocketServer({ noServer: true });
    const clients = new Map();
    // In-memory status tracking
    const tasks = new Map();
    // API Routes
    app.post("/api/translate", (req, res) => {
        upload.single("file")(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: `Upload error: ${err.message}` });
            }
            else if (err) {
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
            if (!file)
                return res.status(400).json({ error: "No file uploaded" });
            const userId = "standard-user"; // Idealmente viria do payload/auth
            const taskId = uuidv4().slice(0, 8);
            const targetLangCode = LANGUAGES_MAP[targetLang] || "pt";
            const inputUrlFull = process.env.VITE_AZURE_STORAGE_INPUT_URL;
            const targetUrlFull = process.env.VITE_AZURE_STORAGE_OUTPUT_URL;
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
            if (!uploadRes.ok)
                throw new Error(`Storage Upload Failed: ${uploadRes.status}`);
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
            if (fs.existsSync(file.path))
                fs.unlinkSync(file.path);
            // Limpeza do Storage (Opcional, mas mantido para boa prática)
            setTimeout(async () => {
                try {
                    const bsc = new BlobServiceClient(inputUrlFull);
                    const containerName = new URL(inputBase).pathname.split('/').pop();
                    const containerClient = bsc.getContainerClient(containerName);
                    await containerClient.getBlobClient(blobPath).deleteIfExists();
                    console.log(` > 🗑️ Auto-cleanup: deleted source blob ${blobPath}`);
                }
                catch (cleanupErr) {
                    console.warn(` > ⚠️ Auto-cleanup warning: ${cleanupErr.message}`);
                }
            }, 30 * 60 * 1000);
        }
        catch (error) {
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
            const operationLocation = req.query.url;
            if (!operationLocation)
                return res.status(400).json({ error: "Missing operationLocation" });
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
        }
        catch (error) {
            console.error(` > Erro no Status Proxy: ${error.message}`);
            res.status(500).json({ error: error.message });
        }
    });
    app.get("/api/azure/list-outputs", async (req, res) => {
        try {
            const outputUrl = process.env.VITE_AZURE_STORAGE_OUTPUT_URL;
            const [baseUrl, sas] = outputUrl.split('?');
            const listUrl = `${baseUrl}?restype=container&comp=list&${sas}`;
            console.log(`--- Proxy: Listando Arquivos de Saída ---`);
            const response = await fetch(listUrl);
            const xml = await response.text();
            const files = xml.match(/<Name>(.*?)<\/Name>/g) || [];
            const fileNames = files.map(f => f.replace(/<\/?Name>/g, ''));
            console.log(` > Encontrados ${fileNames.length} arquivos.`);
            res.json({ files: fileNames });
        }
        catch (error) {
            console.error(` > Erro ao listar outputs: ${error.message}`);
            res.status(500).json({ error: error.message });
        }
    });
    // PROXY DE DOWNLOAD: Resolve o problema de env variables no frontend
    app.get("/api/download/:userId/:taskId/:filename", async (req, res) => {
        try {
            const { userId, taskId, filename } = req.params;
            const outputUrlFull = process.env.VITE_AZURE_STORAGE_OUTPUT_URL;
            const [baseUrl, sas] = outputUrlFull.split('?');
            const blobPath = `${userId}/${taskId}/${filename}`;
            // Encode o filename para a requisição interna à Azure, mas mantém a estrutura de pastas
            const encodedBlobPath = `${userId}/${taskId}/${encodeURIComponent(filename)}`;
            const downloadUrl = `${baseUrl}/${encodedBlobPath}?${sas}`;
            console.log(` > Proxy Download: ${blobPath} (Encoded: ${encodedBlobPath})`);
            const response = await fetch(downloadUrl);
            if (!response.ok)
                throw new Error(`Download failed: ${response.status}`);
            const contentType = response.headers.get("Content-Type") || "application/pdf";
            res.setHeader("Content-Type", contentType);
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            const arrayBuffer = await response.arrayBuffer();
            res.send(Buffer.from(arrayBuffer));
        }
        catch (error) {
            console.error(` > Erro no Proxy Download: ${error.message}`);
            res.status(404).send("Arquivo não encontrado ou erro no servidor.");
        }
    });
    // Vite middleware
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath, {
            maxAge: '1y',
            etag: true,
            lastModified: true,
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                }
                else if (filePath.match(/\.(js|css|woff|woff2)$/)) {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                }
                else if (filePath.match(/\.(png|jpg|jpeg|gif|ico|svg|webp)$/)) {
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
        const url = new URL(request.url, `http://${request.headers.host}`);
        const taskIdMatch = url.pathname.match(/\/ws\/(.+)/);
        if (taskIdMatch) {
            const taskId = taskIdMatch[1];
            wss.handleUpgrade(request, socket, head, (ws) => {
                if (!clients.has(taskId))
                    clients.set(taskId, new Set());
                clients.get(taskId).add(ws);
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
                    if (clients.get(taskId)?.size === 0)
                        clients.delete(taskId);
                });
            });
        }
        else {
            socket.destroy();
        }
    });
    httpServer.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
startServer();
