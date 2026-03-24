import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

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

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  app.use(cors());
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

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
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
