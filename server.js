// Zero-dependency chatboard server.
// - Serves the static files in /public
// - POST /api/messages  -> add a message
// - GET  /api/messages  -> list recent messages
// - GET  /api/stream    -> live updates via Server-Sent Events
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "messages.json");
const MAX_MESSAGES = 200;
const MAX_USERNAME = 24;
const MAX_TEXT = 500;

let messages = [];
try {
  messages = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch {
  messages = [];
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(messages), () => {});
  }, 250);
}

const clients = new Set();
function broadcast(msg) {
  const payload = `data: ${JSON.stringify(msg)}\n\n`;
  for (const res of clients) res.write(payload);
}

// Very small per-IP rate limit: 1 message per second
const lastPost = new Map();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJSON(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/messages" && req.method === "GET") {
    return sendJSON(res, 200, messages);
  }

  if (url.pathname === "/api/messages" && req.method === "POST") {
    const ip = req.socket.remoteAddress;
    const now = Date.now();
    if (now - (lastPost.get(ip) || 0) < 1000) {
      return sendJSON(res, 429, { error: "Slow down a little!" });
    }
    try {
      const data = JSON.parse(await readBody(req));
      const username = String(data.username || "").trim().slice(0, MAX_USERNAME);
      const text = String(data.text || "").trim().slice(0, MAX_TEXT);
      if (!username || !text) {
        return sendJSON(res, 400, { error: "Username and message are required." });
      }
      lastPost.set(ip, now);
      const msg = { id: now + "-" + Math.random().toString(36).slice(2, 8), username, text, time: now };
      messages.push(msg);
      if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
      save();
      broadcast(msg);
      return sendJSON(res, 201, msg);
    } catch {
      return sendJSON(res, 400, { error: "Bad request." });
    }
  }

  if (url.pathname === "/api/stream" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    clients.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => {
      clearInterval(ping);
      clients.delete(res);
    });
    return;
  }

  // Static files
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = path.normalize(path.join(PUBLIC_DIR, filePath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  });
});

server.listen(PORT, () => console.log(`Chatboard running at http://localhost:${PORT}`));
