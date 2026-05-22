import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // ─── Health check ─────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ─── Socket.IO ────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join a cafe room to receive only relevant order updates
    socket.on("join:cafe", (cafeId: string) => {
      socket.join(`cafe:${cafeId}`);
      console.log(`[Socket] ${socket.id} joined cafe:${cafeId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  // Emit helpers
  (app as any).emitToSafe = (cafeId: string, event: string, data: unknown) => {
    io.to(`cafe:${cafeId}`).emit(event, data);
    io.emit(event, data); // fallback broadcast
  };

  // ─── Vite Dev Middleware ───────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 QuickServerHub running → http://localhost:${PORT}`);
    console.log(`   Customer Menu : http://localhost:${PORT}/menu/cafe-atlas/1`);
    console.log(`   Dashboard     : http://localhost:${PORT}/dashboard`);
    console.log(`   Central Admin : http://localhost:${PORT}/admin\n`);
  });
}

startServer();
