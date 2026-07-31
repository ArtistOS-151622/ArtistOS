import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the main project
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Starting WhatsApp Integration Service...');

// Spintax Parser
function parseSpintax(text) {
  const spintaxRegex = /\{([^{}]*)\}/g;
  let parsedText = text;
  while (spintaxRegex.test(parsedText)) {
    parsedText = parsedText.replace(spintaxRegex, (match, contents) => {
      const parts = contents.split('|');
      return parts[Math.floor(Math.random() * parts.length)];
    });
  }
  return parsedText;
}

// Variable Replacer
function replaceVariables(text, customer) {
  let newText = text;
  const name = customer.customer_name || customer.name || "there";
  newText = newText.replace(/\{\{name\}\}/gi, name);
  return newText;
}

// Global client (simplified for this script, normally you'd manage a pool of clients per device ID)
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './sessions_data' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
});

let isClientReady = false;
let isClientStarting = false;
let isClientWaitingForScan = false;
let activeDeviceId = null;

// Helper to find an active device to link to
async function getDeviceToLink() {
  const { data } = await supabase
    .from('whatsapp_devices')
    .select('id')
    .in('session_status', ['DISCONNECTED', 'QR_READY', 'REQUESTING_QR'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data?.id || null;
}

client.on('qr', async (qr) => {
  console.log('\n======================================================');
  console.log('📱 WhatsApp QR Code Generated!');
  console.log('Pushing to Supabase so frontend can display it...');
  console.log('======================================================\n');
  
  isClientStarting = false;
  isClientWaitingForScan = true;
  
  if (!activeDeviceId) {
    activeDeviceId = await getDeviceToLink();
  }
  
  if (activeDeviceId) {
    await supabase
      .from('whatsapp_devices')
      .update({ 
        session_status: 'QR_READY',
        session_data: { qr }
      })
      .eq('id', activeDeviceId);
  }
});

client.on('ready', async () => {
  console.log('WhatsApp Client is ready!');
  isClientReady = true;
  isClientStarting = false;
  isClientWaitingForScan = false;
  
  if (!activeDeviceId) {
    activeDeviceId = await getDeviceToLink();
  }
  
  if (activeDeviceId) {
    await supabase
      .from('whatsapp_devices')
      .update({ 
        session_status: 'CONNECTED',
        last_connected_at: new Date().toISOString(),
        session_data: null // Clear QR
      })
      .eq('id', activeDeviceId);
  }
});

client.on('auth_failure', async msg => {
  console.error('AUTHENTICATION FAILURE', msg);
  isClientStarting = false;
  isClientWaitingForScan = false;
  if (activeDeviceId) {
    await supabase
      .from('whatsapp_devices')
      .update({ session_status: 'DISCONNECTED', session_data: null })
      .eq('id', activeDeviceId);
  }
  
  // Destroy client, processQueue will restart it ONLY if someone requests it again
  console.log("Destroying client due to auth failure...");
  try { await client.destroy(); } catch(e) {}
});

client.on('disconnected', async (reason) => {
  console.log('Client was logged out or disconnected', reason);
  isClientReady = false;
  isClientStarting = false;
  isClientWaitingForScan = false;
  if (activeDeviceId) {
    await supabase
      .from('whatsapp_devices')
      .update({ session_status: 'DISCONNECTED', session_data: null })
      .eq('id', activeDeviceId);
  }

  // Destroy client, processQueue will restart it ONLY if someone requests it again
  console.log("Destroying client due to disconnect...");
  try { await client.destroy(); } catch(e) {}
});

// Worker Loop
async function processQueue() {
  if (!isClientReady && !isClientWaitingForScan) {
    if (!isClientStarting) {
      // Check if any device needs the client (CONNECTED or REQUESTING_QR)
      const { data } = await supabase
        .from('whatsapp_devices')
        .select('id, session_status')
        .in('session_status', ['CONNECTED', 'REQUESTING_QR'])
        .order('updated_at', { ascending: false })
        .limit(1);
        
      if (data && data.length > 0) {
        console.log(`Found device ${data[0].id} with status ${data[0].session_status}. Starting client...`);
        isClientStarting = true;
        activeDeviceId = data[0].id;
        try { 
          await client.initialize(); 
        } catch(e) { 
          console.error("Initialize error:", e);
          isClientStarting = false;
        }
      }
    }
    return;
  }

  try {
    // Find pending messages
    const { data: messages, error } = await supabase
      .from('broadcast_messages')
      .select('*, broadcast_campaigns(*), customers(*)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;

    if (messages && messages.length > 0) {
      const messageRecord = messages[0];
      const campaign = messageRecord.broadcast_campaigns;
      const customer = messageRecord.customers;

      if (!campaign || !customer || !customer.phone) {
        await markMessageStatus(messageRecord.id, 'FAILED', 'Missing campaign or customer data');
        return;
      }

      // Check Business Hours
      if (campaign.business_hours_only) {
        const currentHour = new Date().getHours();
        if (currentHour < 8 || currentHour >= 21) {
          console.log('Outside business hours, skipping for now...');
          return; // Skip this iteration
        }
      }

      console.log(`Processing message for ${customer.name} (${customer.phone})...`);

      // Prepare Message
      let finalMessage = replaceVariables(campaign.message_template, customer);
      finalMessage = parseSpintax(finalMessage);

      // Format Phone Number (Assuming international format without +)
      const sanitizedPhone = customer.phone.replace(/[^0-9]/g, '');
      
      // Resolve the number to get the correct internal ID (fixes "No LID for user" errors)
      const numberId = await client.getNumberId(sanitizedPhone);
      if (!numberId) {
        throw new Error(`Phone number ${sanitizedPhone} is not registered on WhatsApp`);
      }
      const chatId = numberId._serialized;

      // Check if this is the first message for this campaign
      const { count: sentCount } = await supabase
        .from('broadcast_messages')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'SENT');
        
      const isFirstMessage = sentCount === 0;

      // Random Delay logic to mimic human
      const minDelay = campaign.min_delay_sec || 240; // Default 4 mins
      const maxDelay = campaign.max_delay_sec || 300; // Default 5 mins
      
      // Send immediately if it's the first message, otherwise delay
      const delayMs = isFirstMessage ? 0 : Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000;
      
      if (delayMs > 0) {
        console.log(`Waiting for ${delayMs / 1000} seconds before sending...`);
        await new Promise(resolve => setTimeout(resolve, delayMs)); // Simulating the wait BEFORE sending
      } else {
        console.log(`First message in campaign, sending immediately without delay...`);
      }
      
      // Simulate Typing
      try {
        const chat = await client.getChatById(chatId);
        await chat.sendStateTyping();
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
        await chat.clearState();
      } catch (e) {
        console.error('Error simulating typing (chat might not exist yet):', e.message);
      }

      // Send Message
      try {
        await client.sendMessage(chatId, finalMessage);
        await markMessageStatus(messageRecord.id, 'SENT', null, finalMessage, campaign.id);
        console.log(`Message successfully sent to ${customer.phone}`);
      } catch (sendError) {
        console.error(`Failed to send to ${customer.phone}:`, sendError);
        await markMessageStatus(messageRecord.id, 'FAILED', sendError.message, null, campaign.id);
      }

    }
  } catch (err) {
    console.error('Queue processor error:', err);
  }
}

async function markMessageStatus(id, status, errorMsg = null, formattedMsg = null, campaignId = null) {
  const updateData = {
    status,
    updated_at: new Date().toISOString()
  };
  
  if (errorMsg) updateData.error_message = errorMsg;
  if (formattedMsg) updateData.formatted_message = formattedMsg;
  if (status === 'SENT') updateData.sent_at = new Date().toISOString();

  await supabase
    .from('broadcast_messages')
    .update(updateData)
    .eq('id', id);

  // Check if campaign is finished
  if (campaignId) {
    const { count, error } = await supabase
      .from('broadcast_messages')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'PENDING');

    if (!error && count === 0) {
      console.log(`Campaign ${campaignId} completed!`);
      await supabase
        .from('broadcast_campaigns')
        .update({ status: 'COMPLETED' })
        .eq('id', campaignId);
    }
  }
}

// Start polling every 10 seconds
setInterval(processQueue, 10000);
