import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  getBaileysStatus, 
  initBaileys, 
  logoutBaileys, 
  sendBaileysMessage 
} from "./server-baileys";
import {
  getD1ServerConfig,
  saveD1ServerConfig,
  queryCloudflareD1,
  migrateCloudflareD1,
  pushDataToCloudflareD1,
  pullDataFromCloudflareD1,
  deleteRecordFromCloudflareD1
} from "./server-d1";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Serve API routes in both dev and production with generous body size limit for document uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // WhatsApp Gateway status endpoint
  app.get("/api/baileys/status", async (req, res) => {
    try {
      const status = await getBaileysStatus();
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to get Baileys status" });
    }
  });

  // WhatsApp Gateway connect / initialize endpoint
  app.post("/api/baileys/connect", async (req, res) => {
    try {
      // Run the initialization in the background so the HTTP response is instantaneous
      initBaileys(true).catch(err => {
        console.error("Background Baileys init error:", err);
      });
      return res.json({ success: true, status: "initializing" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to connect Baileys" });
    }
  });

  // WhatsApp Gateway disconnect / logout endpoint
  app.post("/api/baileys/disconnect", async (req, res) => {
    try {
      await logoutBaileys();
      return res.json({ success: true, status: "disconnected" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to disconnect Baileys" });
    }
  });

  // API Proxy to send WhatsApp messages via internal Baileys Gateway
  app.post("/api/send-whatsapp", async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ status: false, reason: "Nomor telepon dan pesan harus diisi" });
      }

      const status = await getBaileysStatus();
      if (!status.connected) {
        return res.status(503).json({ 
          status: false, 
          reason: "WhatsApp Gateway Baileys belum terhubung. Silakan pindai QR barcode di panel Administrasi." 
        });
      }

      console.log(`[Proxy] Sending WhatsApp message to ${phone} via Baileys API directly.`);
      await sendBaileysMessage(phone, message);
      return res.json({ status: true, method: "baileys", message: "Sent via Baileys successfully" });
    } catch (error: any) {
      console.error("[Proxy] Error routing WhatsApp message:", error);
      return res.status(500).json({
        status: false,
        reason: error.message || "Internal server error during dispatch"
      });
    }
  });

  // =========================================================================
  // Cloudflare D1 Database REST Endpoints (sapa_pegawai: ad596f89-28c6-4266-ac02-90c60833b682)
  // =========================================================================

  // 1. Get current Cloudflare D1 configuration
  app.get("/api/d1/config", (req, res) => {
    const config = getD1ServerConfig();
    return res.json({
      database_name: config.database_name,
      database_id: config.database_id,
      account_id: config.account_id,
      has_token: !!config.api_token,
      token_preview: config.api_token ? `${config.api_token.slice(0, 4)}...${config.api_token.slice(-4)}` : ""
    });
  });

  // 2. Save / update Cloudflare D1 configuration
  app.post("/api/d1/config", (req, res) => {
    try {
      const updated = saveD1ServerConfig(req.body);
      return res.json({
        success: true,
        database_name: updated.database_name,
        database_id: updated.database_id,
        account_id: updated.account_id,
        has_token: !!updated.api_token
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Test Cloudflare D1 connectivity (GET and POST)
  const handleD1Test = async (req: any, res: any) => {
    const result = await queryCloudflareD1("SELECT 1 AS connected, datetime('now') AS server_time;", [], req.body || {});
    if (result.success) {
      return res.json({
        success: true,
        message: "⚡ Terhubung ke Cloudflare D1! Database sapa_pegawai siap melayani query.",
        data: result.results
      });
    }
    return res.status(200).json({
      success: false,
      message: result.error,
      needs_credentials: result.needs_credentials
    });
  };

  app.get("/api/d1/test", handleD1Test);
  app.post("/api/d1/test", handleD1Test);

  // 4. Execute direct query on Cloudflare D1
  app.post("/api/d1/query", async (req, res) => {
    const { sql, params, account_id, database_id, api_token } = req.body;
    if (!sql) {
      return res.status(400).json({ success: false, error: "SQL string required" });
    }
    const result = await queryCloudflareD1(sql, params || [], { account_id, database_id, api_token });
    return res.json(result);
  });

  // 5. Migrate SQL schema to Cloudflare D1
  app.post("/api/d1/migrate", async (req, res) => {
    const { sql, account_id, database_id, api_token } = req.body;
    if (!sql) {
      return res.status(400).json({ success: false, error: "SQL schema string required" });
    }
    console.log(`[Cloudflare D1] Migrating schema to database ${database_id || 'sapa_pegawai'}...`);
    const result = await migrateCloudflareD1(sql, { account_id, database_id, api_token });
    return res.json(result);
  });

  // 6. Push local client data to Cloudflare D1
  app.post("/api/d1/push", async (req, res) => {
    const { dbState, keysToSync, account_id, database_id, api_token } = req.body;
    if (!dbState) {
      return res.status(400).json({ success: false, error: "dbState payload required" });
    }
    console.log(`[Cloudflare D1] Pushing data to database ${database_id || 'sapa_pegawai'}...`);
    const result = await pushDataToCloudflareD1(dbState, keysToSync, { account_id, database_id, api_token });
    return res.json(result);
  });

  // 7. Pull live data from Cloudflare D1
  app.post("/api/d1/pull", async (req, res) => {
    const { account_id, database_id, api_token } = req.body;
    console.log(`[Cloudflare D1] Pulling data from database ${database_id || 'sapa_pegawai'}...`);
    const result = await pullDataFromCloudflareD1({ account_id, database_id, api_token });
    return res.json(result);
  });

  // 8. Delete record directly from Cloudflare D1
  app.post("/api/d1/delete", async (req, res) => {
    const { table, id, account_id, database_id, api_token } = req.body;
    if (!table || id === undefined) {
      return res.status(400).json({ success: false, error: "Parameter 'table' dan 'id' wajib diisi." });
    }
    console.log(`[Cloudflare D1] Deleting record id ${id} from table ${table}...`);
    const result = await deleteRecordFromCloudflareD1(table, id, { account_id, database_id, api_token });
    return res.json(result);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
