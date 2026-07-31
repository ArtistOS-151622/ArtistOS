import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PAIRING_CODE_TIMEOUT_MS = Number(process.env.WHATSAPP_PAIRING_TIMEOUT_MS || 60_000);
const PAIRING_CODE_RENEW_MS = Number(process.env.WHATSAPP_PAIRING_RENEW_MS || 170_000);
const CLIENT_INITIALIZE_TIMEOUT_MS = Number(process.env.WHATSAPP_INITIALIZE_TIMEOUT_MS || 120_000);
const MAX_TRANSIENT_SEND_RETRIES = Number(process.env.WHATSAPP_MAX_TRANSIENT_SEND_RETRIES || 3);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanupStaleLock() {
  try {
    // 1. Remove Chrome's SingletonLock file
    const lockFile = path.join(__dirname, 'sessions_data', 'session', 'SingletonLock');
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log('[WA] 🧹 Removed stale SingletonLock');
    }
  } catch (e) {
    console.warn('[WA] cleanupStaleLock (lock file, non-fatal):', e.message);
  }
  try {
    // 2. Kill any orphaned Chrome process still locking the session dir
    const sessionDir = path.join(__dirname, 'sessions_data');
    execSync(`pkill -f "${sessionDir}" 2>/dev/null || true`);
  } catch (_) {
    // pkill exits non-zero if nothing matched — that's fine
  }
}

function clearLocalAuthSession() {
  try {
    const sessionDir = path.join(__dirname, 'sessions_data', 'session');
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log('[WA] 🧹 Cleared local auth session for fresh pairing');
    }
  } catch (e) {
    console.warn('[WA] clearLocalAuthSession (non-fatal):', e.message);
  }
}

function parseSpintax(text) {
  const regex = /\{([^{}]*)\}/g;
  let out = text;
  while (regex.test(out)) {
    out = out.replace(regex, (_, contents) => {
      const parts = contents.split('|');
      return parts[Math.floor(Math.random() * parts.length)];
    });
  }
  return out;
}

function replaceVariables(text, customer) {
  const name = customer.customer_name || customer.name || 'there';
  return text.replace(/\{\{name\}\}/gi, name);
}

function getRetryCount(errorMessage) {
  const match = errorMessage?.match(/\[retry:(\d+)\]/);
  return match ? Number(match[1]) : 0;
}

async function setDeviceStatus(id, status, extra = {}) {
  const { error } = await supabase
    .from('whatsapp_devices')
    .update({ session_status: status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id);
  if (error) console.error('[WA] setDeviceStatus error:', error.message);
}

function clearPairingTimeout() {
  if (pairingTimeout) {
    clearTimeout(pairingTimeout);
    pairingTimeout = null;
  }
}

function startPairingTimeout(deviceId) {
  clearPairingTimeout();
  pairingTimeout = setTimeout(async () => {
    if (activeDeviceId !== deviceId || isReady) return;

    console.error(`[WA] Pairing code timeout for device ${deviceId}`);
    await doDisconnect('PAIRING_CODE_TIMEOUT');
  }, PAIRING_CODE_TIMEOUT_MS);
}

// ─── State ────────────────────────────────────────────────────────────────────

let client = null;
let isReady = false;
let isStarting = false;
let isWaitingForScan = false;
let activeDeviceId = null;
let isBusy = false;                // lock: one message in-flight at a time
let frameErrorCount = 0;           // consecutive frame errors
let reconnectCooldownUntil = 0;    // timestamp — don't retry auto-reconnect before this
let pairingTimeout = null;
let pendingPairingPhoneNumber = null;
let isRequestingPairingCode = false;

function startHealthServer() {
  const port = process.env.PORT;
  if (!port) return;

  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200);
      res.end(JSON.stringify({
        ok: true,
        service: 'artistos-whatsapp-worker',
        ready: isReady,
        starting: isStarting,
        waitingForPairing: isWaitingForScan,
        activeDeviceId,
      }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: 'Not found' }));
  });

  server.listen(Number(port), '0.0.0.0', () => {
    console.log(`[WA] Health server listening on port ${port}`);
  });
}

// ─── Client factory ───────────────────────────────────────────────────────────

function buildClient() {
  const puppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ],
    timeout: 60000, // 60 seconds timeout to prevent infinite hang on VPS
  };

  // Support Render/VPS environments where Puppeteer's browser cache must be resolved explicitly.
  let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;
  if (!executablePath) {
    try {
      executablePath = puppeteer.executablePath();
      console.log(`[WA] Using Puppeteer Chrome: ${executablePath}`);
    } catch (e) {
      console.warn('[WA] Could not resolve Puppeteer Chrome path:', e.message);
    }
  }
  if (executablePath) {
    puppeteerConfig.executablePath = executablePath;
  }

  const clientOptions = {
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, 'sessions_data') }),
    puppeteer: puppeteerConfig,
    deviceName: 'ArtistOS',
    browserName: 'Chrome',
  };

  return new Client(clientOptions);
}

// ─── Client lifecycle ─────────────────────────────────────────────────────────

async function handlePairingCode(code) {
  if (!activeDeviceId || !code) return;

  clearPairingTimeout();
  const { data } = await supabase
    .from('whatsapp_devices')
    .select('session_data')
    .eq('id', activeDeviceId)
    .single();

  console.log(`[WA] 🔑 Pairing Code Generated: ${code}`);
  isStarting = false;
  isWaitingForScan = true;
  await setDeviceStatus(activeDeviceId, 'PAIRING_CODE_READY', {
    session_data: {
      ...(data?.session_data || {}),
      pairingCode: code,
      pairingCodeGeneratedAt: new Date().toISOString(),
      lastError: null,
    },
  });
}

function attachEvents(c) {
  c.on('loading_screen', (percent, message) => {
    console.log(`[WA] Loading WhatsApp Web ${percent}%: ${message}`);
  });

  c.on('authenticated', () => {
    console.log('[WA] Authenticated with WhatsApp Web');
  });

  c.on('change_state', (state) => {
    console.log(`[WA] State changed: ${state}`);
  });

  c.on('code', async (code) => {
    await handlePairingCode(code);
  });

  c.on('qr', async () => {
    if (!activeDeviceId) return;

    if (!pendingPairingPhoneNumber) {
      console.warn('[WA] QR event received, but no phone number is pending for pairing.');
      return;
    }

    if (isRequestingPairingCode) return;
    isRequestingPairingCode = true;

    try {
      console.log(`[WA] QR bootstrap ready. Requesting pairing code for ${pendingPairingPhoneNumber}…`);
      const code = await c.requestPairingCode(
        pendingPairingPhoneNumber,
        true,
        PAIRING_CODE_RENEW_MS
      );
      await handlePairingCode(code);
    } catch (e) {
      console.error('[WA] ❌ Pairing code request error:', e.message);
      await doDisconnect('PAIRING_CODE_REQUEST_FAILED');
    } finally {
      isRequestingPairingCode = false;
    }
  });

  c.on('ready', async () => {
    console.log('[WA] ✅ Client ready!');
    clearPairingTimeout();
    isReady = true;
    isStarting = false;
    isWaitingForScan = false;
    frameErrorCount = 0; // reset error counter on fresh connect
    if (activeDeviceId) {
      await setDeviceStatus(activeDeviceId, 'CONNECTED', {
        last_connected_at: new Date().toISOString(),
        session_data: null,
      });
    }
  });

  c.on('auth_failure', async (msg) => {
    console.error('[WA] ❌ Auth failure:', msg);
    await doDisconnect('AUTH_FAILURE');
  });

  c.on('disconnected', async (reason) => {
    console.log('[WA] 🔌 Disconnected:', reason);
    await doDisconnect(reason);
  });
}

async function doDisconnect(reason) {
  clearPairingTimeout();
  isReady = false;
  isStarting = false;
  isWaitingForScan = false;
  isBusy = false;
  pendingPairingPhoneNumber = null;
  isRequestingPairingCode = false;

  if (activeDeviceId) {
    console.log(`[WA] Device ${activeDeviceId} → DISCONNECTED (${reason})`);
    await setDeviceStatus(activeDeviceId, 'DISCONNECTED', {
      session_data: {
        lastError: reason,
        disconnectedAt: new Date().toISOString(),
      },
    });
    activeDeviceId = null;
  }

  if (client) {
    try { await client.destroy(); } catch (_) {}
    client = null;
  }

  cleanupStaleLock();
}

async function startClient(deviceId, reason = 'REQUESTING_PAIRING_CODE') {
  if (isStarting || isReady || isWaitingForScan) return;

  // Cooldown for auto-reconnect so we don't spam retries every 3s
  if (reason === 'CONNECTED' && Date.now() < reconnectCooldownUntil) return;

  // Destroy any stale client instance
  if (client) {
    try { await client.destroy(); } catch (_) {}
    client = null;
  }

  // Kill orphaned Chrome + remove lock file
  cleanupStaleLock();
  // Give OS a moment to release file handles
  await new Promise(r => setTimeout(r, 500));

  console.log(`[WA] Starting client for device ${deviceId} (reason: ${reason})…`);
  isStarting = true;
  activeDeviceId = deviceId;

  let phoneNumber;
  if (reason === 'REQUESTING_PAIRING_CODE') {
    const { data, error } = await supabase
      .from('whatsapp_devices')
      .select('session_data')
      .eq('id', deviceId)
      .single();

    if (error || !data?.session_data?.phoneNumber) {
      console.error('[WA] Missing phone number for pairing request.');
      isStarting = false;
      activeDeviceId = null;
      await setDeviceStatus(deviceId, 'DISCONNECTED', {
        session_data: {
          lastError: 'MISSING_PHONE_NUMBER',
          disconnectedAt: new Date().toISOString(),
        },
      });
      return;
    }

    phoneNumber = data.session_data.phoneNumber;
    pendingPairingPhoneNumber = phoneNumber;
    console.log(`[WA] 📱 Requesting pairing code for ${phoneNumber}…`);
    clearLocalAuthSession();
    startPairingTimeout(deviceId);
  }

  client = buildClient();
  attachEvents(client);

  try {
    await Promise.race([
      client.initialize(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('CLIENT_INITIALIZE_TIMEOUT')), CLIENT_INITIALIZE_TIMEOUT_MS);
      }),
    ]);
  } catch (e) {
    console.error('[WA] ❌ Initialize error:', e.message);
    if (e.message.includes('timeout') || e.message.includes('browser') || e.message.includes('sandbox')) {
      console.error('[WA] 💡 VPS FIX: Ensure Chrome dependencies are installed (e.g. libnss3, libasound2) or set PUPPETEER_EXECUTABLE_PATH');
    }
    isStarting = false;
    client = null;
    activeDeviceId = null;
    clearPairingTimeout();
    cleanupStaleLock();
    if (reason === 'REQUESTING_PAIRING_CODE') {
      // User explicitly requested — mark disconnected so UI shows the error
      await setDeviceStatus(deviceId, 'DISCONNECTED', {
        session_data: {
          lastError: 'INITIALIZE_FAILED',
          details: e.message,
          disconnectedAt: new Date().toISOString(),
        },
      });
    } else {
      // Auto-reconnect failed — back off 30s before next attempt
      reconnectCooldownUntil = Date.now() + 30_000;
      console.log('[WA] Auto-reconnect failed — retrying in 30s…');
    }
  }
}

// ─── Queue processor ──────────────────────────────────────────────────────────

async function processQueue() {
  // ── Phase 1: ensure a client is running if a device needs one ──
  if (!isReady && !isWaitingForScan && !isStarting) {
    const { data } = await supabase
      .from('whatsapp_devices')
      .select('id, session_status')
      .in('session_status', ['REQUESTING_PAIRING_CODE', 'CONNECTED'])
      .order('updated_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const reason = data[0].session_status; // 'REQUESTING_PAIRING_CODE' or 'CONNECTED'
      await startClient(data[0].id, reason);
    }
    return;
  }

  if (!isReady) return; // still starting or scanning

  // ── Phase 2: process one pending message (with lock) ──
  if (isBusy) return;

  let msg, campaign, customer;
  try {
    const { data: messages, error } = await supabase
      .from('broadcast_messages')
      .select('*, broadcast_campaigns(*), customers(*)')
      .in('status', ['PENDING', 'RETRYING'])
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;
    if (!messages || messages.length === 0) return;

    msg = messages[0];
    campaign = msg.broadcast_campaigns;
    customer = msg.customers;
  } catch (err) {
    console.error('[WA] DB fetch error:', err.message);
    return;
  }

  if (!campaign || !customer?.phone) {
    await markMessageStatus(msg.id, 'FAILED', 'Missing campaign or customer data');
    return;
  }

  // Business hours gate
  if (campaign.business_hours_only) {
    const h = new Date().getHours();
    if (h < 8 || h >= 21) {
      return; // silent skip
    }
  }

  // Acquire lock BEFORE delay so only one message is in-flight
  isBusy = true;

  try {
    const customerName = customer.customer_name || customer.name || 'Unknown';
    console.log(`[WA] Processing: ${customerName} (${customer.phone})`);

    const { data: connectedDevice } = await supabase
      .from('whatsapp_devices')
      .select('id')
      .eq('session_status', 'CONNECTED')
      .limit(1)
      .maybeSingle();

    if (!connectedDevice) {
      await markMessageStatus(msg.id, 'RETRYING', 'WhatsApp is not connected. Waiting for reconnection...');
      await doDisconnect('DEVICE_NOT_CONNECTED');
      return;
    }

    // Delay (skip for first message in campaign)
    const { count: sentCount } = await supabase
      .from('broadcast_messages')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .eq('status', 'SENT');

    const isFirst = sentCount === 0;
    const minDelay = campaign.min_delay_sec ?? 240;
    const maxDelay = campaign.max_delay_sec ?? 300;
    const delayMs = isFirst
      ? 0
      : Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000;

    if (delayMs > 0) {
      console.log(`[WA] Waiting ${delayMs / 1000}s before sending…`);
      await new Promise(r => setTimeout(r, delayMs));
    }

    // Resolve phone → WhatsApp internal ID
    const sanitized = customer.phone.replace(/[^0-9]/g, '');
    const numberId = await client.getNumberId(sanitized);
    if (!numberId) {
      await markMessageStatus(msg.id, 'FAILED', `${sanitized} is not registered on WhatsApp`);
      return;
    }
    const chatId = numberId._serialized;

    // Simulate typing
    try {
      const chat = await client.getChatById(chatId);
      await chat.sendStateTyping();
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
      await chat.clearState();
    } catch (_) {}

    // Build message text
    let finalMessage = replaceVariables(campaign.message_template, customer);
    finalMessage = parseSpintax(finalMessage);

    // Send: image+caption OR plain text
    if (campaign.image_url) {
      try {
        const media = await MessageMedia.fromUrl(campaign.image_url, { unsafeMime: true });
        await client.sendMessage(chatId, media, { caption: finalMessage });
      } catch (imgErr) {
        console.warn('[WA] Image load failed, falling back to text only:', imgErr.message);
        await client.sendMessage(chatId, finalMessage);
      }
    } else {
      await client.sendMessage(chatId, finalMessage);
    }

    await markMessageStatus(msg.id, 'SENT', null, finalMessage, campaign.id);
    console.log(`[WA] ✓ Sent to ${customer.phone}${campaign.image_url ? ' (with image)' : ''}`);
  } catch (err) {
    const isFrameError =
      err.message?.includes('detached') ||
      err.message?.includes('Session closed') ||
      err.message?.includes('Target closed') ||
      err.message?.includes('Protocol error');

    if (isFrameError) {
      frameErrorCount++;
      console.error(`[WA] ⚠️  Frame error during send (${frameErrorCount}/3) — ${err.message}`);
      if (msg) {
        const retryCount = getRetryCount(msg.error_message) + 1;
        if (retryCount >= MAX_TRANSIENT_SEND_RETRIES) {
          await markMessageStatus(
            msg.id,
            'FAILED',
            'WhatsApp session was unstable. Please reconnect WhatsApp and retry this campaign.',
            null,
            campaign?.id,
          );
        } else {
          await markMessageStatus(
            msg.id,
            'RETRYING',
            `[retry:${retryCount}] WhatsApp session was busy. Retrying automatically...`,
          );
        }
      }
      if (frameErrorCount >= 3) {
        console.error('[WA] 3 consecutive frame errors — triggering full reconnect…');
        frameErrorCount = 0;
        await doDisconnect('FRAME_ERROR');
      }
    } else {
      frameErrorCount = 0; // reset on non-frame errors
      console.error('[WA] ✗ Send error:', err.message);
      if (msg) {
        await markMessageStatus(msg.id, 'FAILED', err.message, null, campaign?.id);
      }
    }
  } finally {
    isBusy = false;
  }
}

// ─── Message status updater ───────────────────────────────────────────────────

async function markMessageStatus(id, status, errorMsg = null, formattedMsg = null, campaignId = null) {
  const update = { status, updated_at: new Date().toISOString() };
  update.error_message = errorMsg;
  if (formattedMsg) update.formatted_message = formattedMsg;
  if (status === 'SENT') update.sent_at = new Date().toISOString();

  await supabase.from('broadcast_messages').update(update).eq('id', id);

  if (campaignId) {
    const { count } = await supabase
      .from('broadcast_messages')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .in('status', ['PENDING', 'RETRYING']);

    if (count === 0) {
      console.log(`[WA] Campaign ${campaignId} completed!`);
      await supabase
        .from('broadcast_campaigns')
        .update({ status: 'COMPLETED' })
        .eq('id', campaignId);
    }
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────

cleanupStaleLock();
startHealthServer();

// Reset stale Pairing devices on startup (not CONNECTED — those auto-reconnect)
await supabase
  .from('whatsapp_devices')
  .update({ session_status: 'DISCONNECTED', session_data: null })
  .in('session_status', ['REQUESTING_PAIRING_CODE', 'PAIRING_CODE_READY']);

console.log('[WA] Service started. Polling every 3s…');
setInterval(processQueue, 3000);
