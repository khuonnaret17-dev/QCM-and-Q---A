import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import fs from 'fs';
import Database from 'better-sqlite3';
import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenAI } from '@google/genai';

// Initialize Database
const db = new Database('bot.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    response_type TEXT NOT NULL, -- 'text' or 'document'
    content TEXT, -- For text responses
    file_data BLOB, -- For document responses
    filename TEXT,
    mime_type TEXT
  );
  CREATE TABLE IF NOT EXISTS subscribers (
    chat_id TEXT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT,
    username TEXT,
    text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

let bot: TelegramBot | null = null;

// Helper to start bot if token exists
function startBotInstance(token: string) {
  if (bot) {
    bot.stopPolling();
  }
  bot = new TelegramBot(token, { polling: true });
  
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text;
    const username = msg.chat.username;
    const firstName = msg.chat.first_name;

    // Save/Update Subscriber
    try {
      db.prepare(`
        INSERT INTO subscribers (chat_id, username, first_name) 
        VALUES (?, ?, ?) 
        ON CONFLICT(chat_id) DO UPDATE SET 
          username = excluded.username,
          first_name = excluded.first_name
      `).run(chatId, username || null, firstName || null);
    } catch (e) {
      console.error('Error saving subscriber:', e);
    }

    if (!text) return;

    // Log Message
    try {
      db.prepare('INSERT INTO message_logs (chat_id, username, text) VALUES (?, ?, ?)').run(chatId, username || firstName || 'Unknown', text);
    } catch (e) {
      console.error('Error logging message:', e);
    }

    console.log(`Received message: ${text} from ${chatId}`);

    // Handle /start command
    if (text === '/start') {
      bot?.sendMessage(chatId, "សួស្តី! ខ្ញុំជា Bot ឆ្លាតវៃ។ អ្នកអាចសួរអ្វីមកខ្ញុំក៏បាន ឬប្រើ /sendfile ដើម្បីទទួលឯកសារ។");
      return;
    }

    // Handle /sendfile command
    if (text === '/sendfile') {
      try {
        const filePath = 'document.pdf';
        if (fs.existsSync(filePath)) {
          bot?.sendDocument(chatId, filePath, { caption: "នេះជាឯកសាររបស់អ្នក!" });
        } else {
          bot?.sendMessage(chatId, "រកមិនឃើញឯកសារទេ។");
        }
      } catch (e) {
        bot?.sendMessage(chatId, "រកមិនឃើញឯកសារទេ។");
      }
      return;
    }

    // 1. Check for matching rule
    const rule = db.prepare('SELECT * FROM rules WHERE lower(keyword) = lower(?)').get(text.trim());

    if (rule) {
      console.log(`Matched rule: ${rule.keyword}`);
      if (rule.response_type === 'text') {
        bot?.sendMessage(chatId, rule.content);
      } else if (rule.response_type === 'document' && rule.file_data) {
        bot?.sendDocument(chatId, rule.file_data, {}, {
          filename: rule.filename,
          contentType: rule.mime_type,
        });
      }
      return; // Stop if rule matched
    }

    // 2. If no rule matched, check if AI is enabled
    const aiConfig = db.prepare("SELECT value FROM config WHERE key = 'ai_enabled'").get() as { value: string } | undefined;
    if (aiConfig && aiConfig.value === 'true') {
      if (!process.env.GEMINI_API_KEY) {
        bot?.sendMessage(chatId, "សូមអភ័យទោស, API Key របស់ Gemini មិនទាន់បានកំណត់នៅក្នុងប្រព័ន្ធទេ។");
        return;
      }

      try {
        bot?.sendChatAction(chatId, 'typing');
        
        // Simple context retrieval: Find rules that contain words from the query
        // This is a basic keyword search to give the AI some ground truth from the database
        const keywords = text.split(' ').filter(w => w.length > 3).slice(0, 3);
        let context = "";
        
        if (keywords.length > 0) {
           const query = `SELECT content FROM rules WHERE ` + keywords.map(() => `content LIKE ?`).join(' OR ') + ` LIMIT 3`;
           const params = keywords.map(k => `%${k}%`);
           const rows = db.prepare(query).all(...params) as { content: string }[];
           if (rows.length > 0) {
             context = "Here is some relevant text from the Cambodian Criminal Code database that might help answer the user's question:\n\n" + 
                       rows.map(r => r.content).join('\n---\n') + "\n\n";
           }
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `User Question: ${text}\n\n${context}`,
          config: {
            systemInstruction: "You are a helpful legal assistant bot for Cambodia, specializing in the Criminal Code. Use the provided context if relevant, but also rely on your general knowledge of Cambodian law. Answer in Khmer. Be polite, professional, and concise. If the user asks for legal advice, include a disclaimer that you are an AI.",
          }
        });
        
        if (response.text) {
          bot?.sendMessage(chatId, response.text, { parse_mode: 'Markdown' });
        } else {
          bot?.sendMessage(chatId, "I'm sorry, I couldn't generate a response.");
        }
      } catch (error: any) {
        console.error('Gemini API Error:', error);
        bot?.sendMessage(chatId, `Sorry, I'm having trouble thinking right now. (Error: ${error.message || 'Unknown'})`);
      }
    }
  });

  console.log('Bot started with polling.');
}

// Try to load token on startup
const savedToken = db.prepare("SELECT value FROM config WHERE key = 'bot_token'").get() as { value: string } | undefined;
const DEFAULT_TOKEN = '7183547347:AAGGSEvjWl3VIud_xKUBXhtkhmH9DBulfT8';

if (savedToken && savedToken.value) {
  try {
    startBotInstance(savedToken.value);
  } catch (e) {
    console.error('Failed to start bot on launch:', e);
  }
} else {
  // Initialize with the user-provided token
  try {
    db.prepare("INSERT INTO config (key, value) VALUES ('bot_token', ?)").run(DEFAULT_TOKEN);
    startBotInstance(DEFAULT_TOKEN);
    console.log('Initialized bot with default token');
  } catch (e) {
    console.error('Failed to initialize default token:', e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Bot Management API ---

  app.get('/api/bot/status', (req, res) => {
    res.json({ 
      running: !!bot, 
      tokenConfigured: !!savedToken 
    });
  });

  app.post('/api/bot/start', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    try {
      // Save token
      db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('bot_token', ?)").run(token);
      
      // Start bot
      startBotInstance(token);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error starting bot:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/bot/stop', (req, res) => {
    if (bot) {
      bot.stopPolling();
      bot = null;
    }
    res.json({ success: true });
  });

  app.get('/api/bot/ai-status', (req, res) => {
    const aiConfig = db.prepare("SELECT value FROM config WHERE key = 'ai_enabled'").get() as { value: string } | undefined;
    res.json({ enabled: aiConfig?.value === 'true' });
  });

  app.post('/api/bot/ai-toggle', (req, res) => {
    const { enabled } = req.body;
    db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('ai_enabled', ?)").run(enabled ? 'true' : 'false');
    res.json({ success: true, enabled });
  });

  // --- Rules Management API ---

  app.get('/api/rules', (req, res) => {
    const rules = db.prepare('SELECT id, keyword, response_type, content, filename FROM rules').all();
    res.json(rules);
  });

  app.post('/api/rules', upload.single('file'), (req, res) => {
    try {
      const { keyword, responseType, content } = req.body;
      const file = req.file;

      if (!keyword || !responseType) {
        return res.status(400).json({ error: 'Keyword and Response Type are required' });
      }

      if (responseType === 'text') {
        db.prepare('INSERT INTO rules (keyword, response_type, content) VALUES (?, ?, ?)').run(keyword, 'text', content);
      } else if (responseType === 'document') {
        if (!file) return res.status(400).json({ error: 'File is required for document type' });
        
        db.prepare('INSERT INTO rules (keyword, response_type, file_data, filename, mime_type) VALUES (?, ?, ?, ?, ?)').run(
          keyword, 
          'document', 
          file.buffer, 
          file.originalname, 
          file.mimetype
        );
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error adding rule:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/rules/:id', (req, res) => {
    db.prepare('DELETE FROM rules WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- Broadcast API ---

  app.get('/api/subscribers', (req, res) => {
    const count = db.prepare('SELECT COUNT(*) as count FROM subscribers').get() as { count: number };
    res.json(count);
  });

  app.get('/api/dashboard/stats', (req, res) => {
    const subscribers = db.prepare('SELECT COUNT(*) as count FROM subscribers').get() as { count: number };
    const rules = db.prepare('SELECT COUNT(*) as count FROM rules').get() as { count: number };
    const messages = db.prepare('SELECT COUNT(*) as count FROM message_logs').get() as { count: number };
    res.json({
      subscribers: subscribers.count,
      rules: rules.count,
      messages: messages.count
    });
  });

  app.get('/api/dashboard/logs', (req, res) => {
    const logs = db.prepare('SELECT * FROM message_logs ORDER BY id DESC LIMIT 50').all();
    res.json(logs);
  });

  app.post('/api/broadcast', upload.single('file'), async (req, res) => {
    try {
      const { message } = req.body;
      const file = req.file;

      if (!bot) return res.status(400).json({ error: 'Bot is not running' });
      if (!message && !file) return res.status(400).json({ error: 'Message or File is required' });

      const subscribers = db.prepare('SELECT chat_id FROM subscribers').all() as { chat_id: string }[];
      let successCount = 0;
      let failCount = 0;

      // In a real app, use a queue. For this demo, we loop (careful with rate limits)
      for (const sub of subscribers) {
        try {
          if (file) {
            await bot.sendDocument(sub.chat_id, file.buffer, { caption: message }, {
              filename: file.originalname,
              contentType: file.mimetype,
            });
          } else if (message) {
            await bot.sendMessage(sub.chat_id, message);
          }
          successCount++;
          // Small delay to be nice to API
          await new Promise(resolve => setTimeout(resolve, 50)); 
        } catch (e) {
          console.error(`Failed to send to ${sub.chat_id}:`, e);
          failCount++;
        }
      }

      res.json({ success: true, sent: successCount, failed: failCount });
    } catch (error: any) {
      console.error('Broadcast error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Manual Send API (Existing Logic) ---
  // API Route for sending file to Telegram
  const uploadMiddleware = upload.single('file');

  app.post('/api/send', (req, res) => {
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
           return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
           return res.status(500).json({ error: `Upload error: ${err.message}` });
        }
      }

      try {
        const { botToken, chatId, caption } = req.body;
        const file = req.file;

        // Use the saved token if not provided in request
        let tokenToUse = botToken;
        if (!tokenToUse) {
           const saved = db.prepare("SELECT value FROM config WHERE key = 'bot_token'").get() as { value: string } | undefined;
           if (saved) tokenToUse = saved.value;
        }

        if (!tokenToUse || !chatId || !file) {
          return res.status(400).json({ error: 'Missing required fields: botToken (or configured bot), chatId, or file.' });
        }

        const cleanBotToken = tokenToUse.trim();
        const cleanChatId = chatId.trim();

        // Removed strict client-side validation to allow Telegram API to handle various ID formats (including usernames)
        if (!cleanChatId) {
           return res.status(400).json({ error: 'Chat ID is required.' });
        }

        const form = new FormData(); // Using native FormData (Node 18+)
        form.append('chat_id', cleanChatId);
        
        const blob = new Blob([file.buffer], { type: file.mimetype });
        form.append('document', blob, file.originalname);
        
        if (caption) {
          form.append('caption', caption);
        }

        const telegramUrl = `https://api.telegram.org/bot${cleanBotToken}/sendDocument`;

        const response = await fetch(telegramUrl, {
          method: 'POST',
          body: form,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(JSON.stringify(data));
        }

        res.json({ success: true, data });
      } catch (error: any) {
        console.error('Error sending to Telegram:', error.message || error);
        res.status(500).json({ 
          error: 'Failed to send file to Telegram.', 
          details: error.message || error 
        });
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving (if built)
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
