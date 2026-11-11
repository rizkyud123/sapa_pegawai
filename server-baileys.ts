import * as BaileysModule from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Handle both CJS bundled and ESM export shape for makeWASocket
const baileysAny = BaileysModule as any;
const makeWASocket = 
  typeof baileysAny.default === 'function' ? baileysAny.default :
  typeof baileysAny.default?.default === 'function' ? baileysAny.default.default :
  typeof baileysAny.makeWASocket === 'function' ? baileysAny.makeWASocket :
  baileysAny;

const useMultiFileAuthState = baileysAny.useMultiFileAuthState || baileysAny.default?.useMultiFileAuthState;
const DisconnectReason = baileysAny.DisconnectReason || baileysAny.default?.DisconnectReason;
const fetchLatestBaileysVersion = baileysAny.fetchLatestBaileysVersion || baileysAny.default?.fetchLatestBaileysVersion;
const Browsers = baileysAny.Browsers || baileysAny.default?.Browsers;

const oldAuthFolder = path.join(process.cwd(), 'auth_info_baileys');
const authFolder = process.env.BAILEYS_AUTH_DIR || path.join(os.tmpdir(), 'sapa_auth_info_baileys');

// Migrasi folder sesi autentikasi dari workspace ke /tmp agar tidak men-trigger file watcher restart
if (fs.existsSync(oldAuthFolder)) {
  try {
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }
    const files = fs.readdirSync(oldAuthFolder);
    for (const file of files) {
      const oldPath = path.join(oldAuthFolder, file);
      const newPath = path.join(authFolder, file);
      const stat = fs.statSync(oldPath);
      if (stat.isFile()) {
        fs.copyFileSync(oldPath, newPath);
        fs.unlinkSync(oldPath);
      }
    }
    try {
      fs.rmSync(oldAuthFolder, { recursive: true, force: true });
    } catch (e) {
      // Ignore if folder itself can't be deleted immediately
    }
    console.log('[Baileys] Successfully migrated session from workspace to /tmp/auth_info_baileys');
  } catch (migrateErr) {
    console.error('[Baileys] Failed to migrate session folder:', migrateErr);
  }
}

let sock: any = null;
let qrCodeDataUrl: string | null = null;
let connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'qr' = 'disconnected';
let myPhone: string | null = null;
let isInitializing = false;
let lastError: string | null = null;
let reconnectTimer: any = null;

export async function getBaileysStatus() {
  return {
    connected: connectionStatus === 'connected',
    status: connectionStatus,
    qr: qrCodeDataUrl,
    phone: myPhone,
    error: lastError,
    helpers: {
      hasPkg: true,
      hasMakeWASocket: typeof makeWASocket === 'function',
      hasUseState: typeof useMultiFileAuthState === 'function',
    }
  };
}

export async function initBaileys(forceRestart = false) {
  if (isInitializing) return;
  
  if (sock && !forceRestart) {
    if (connectionStatus === 'connected') {
      return;
    }
  }

  isInitializing = true;
  connectionStatus = 'connecting';
  lastError = null;
  
  try {
    console.log('[Baileys] Initializing WhatsApp socket...');
    
    if (typeof useMultiFileAuthState !== 'function') {
      throw new Error(`useMultiFileAuthState is not a function.`);
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    // Create silent logger to prevent huge logs
    const logger = pino({ level: 'silent' });
    
    if (typeof makeWASocket !== 'function') {
      throw new Error(`makeWASocket is not a function.`);
    }

    let version = [2, 3000, 1043857760] as [number, number, number];
    try {
      const v = await fetchLatestBaileysVersion();
      if (v && v.version) {
        version = v.version;
      }
    } catch (verErr) {
      console.warn('[Baileys] Using fallback WA web version:', verErr);
    }

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger,
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      emitOwnEvents: false,
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 3,
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        connectionStatus = 'qr';
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qr);
          console.log('[Baileys] New QR Code generated successfully.');
        } catch (err) {
          console.error('[Baileys] Failed to generate QR data URL:', err);
        }
      }
      
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;
        
        console.log(`[Baileys] Connection closed. Status Code: ${statusCode}. Reconnecting: ${shouldReconnect}`);
        
        myPhone = null;
        sock = null;
        
        // JANGAN hapus qrCodeDataUrl jika statusnya adalah 408 (QR Scan Timeout oleh WhatsApp)
        // agar layar UI pengguna tetap menampilkan barcode QR terakhir tanpa stuck di "Mempersiapkan Barcode QR..."
        if (statusCode !== 408) {
          connectionStatus = 'disconnected';
          qrCodeDataUrl = null;
        } else {
          // Tetap tandai status sebagai qr jika QR URL sudah pernah di-generate
          if (qrCodeDataUrl) {
            connectionStatus = 'qr';
          }
        }
        
        if (shouldReconnect) {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            initBaileys(true);
          }, 2000);
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        qrCodeDataUrl = null;
        const user = sock?.user;
        myPhone = user ? (user.id || '').split(':')[0] : null;
        console.log('[Baileys] Connection opened! Logged in as:', myPhone);
      }
    });
  } catch (error: any) {
    console.error('[Baileys] Error initializing Baileys:', error);
    lastError = error?.message || String(error);
    connectionStatus = 'disconnected';
    qrCodeDataUrl = null;
    myPhone = null;
    sock = null;
  } finally {
    isInitializing = false;
  }
}

export async function logoutBaileys() {
  console.log('[Baileys] Logging out and deleting session...');
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      // Ignore
    }
    try {
      sock.end(undefined);
    } catch (e) {
      // Ignore
    }
    sock = null;
  }
  
  connectionStatus = 'disconnected';
  qrCodeDataUrl = null;
  myPhone = null;

  if (fs.existsSync(authFolder)) {
    try {
      fs.rmSync(authFolder, { recursive: true, force: true });
      console.log('[Baileys] Auth session folder deleted.');
    } catch (err) {
      console.error('[Baileys] Failed to delete auth folder:', err);
    }
  }
}

export async function sendBaileysMessage(phone: string, message: string) {
  if (connectionStatus !== 'connected' || !sock) {
    throw new Error('WhatsApp is not connected yet. Please link your device via QR code first.');
  }
  
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }
  
  const jid = `${cleanPhone}@s.whatsapp.net`;
  console.log(`[Baileys] Sending message to ${jid}: ${message.substring(0, 50)}...`);
  
  const result = await sock.sendMessage(jid, { text: message });
  return result;
}

// Auto-start Baileys if session already exists
if (fs.existsSync(authFolder) && fs.readdirSync(authFolder).length > 0) {
  console.log('[Baileys] Existing auth session found. Auto-reconnecting...');
  initBaileys();
}
