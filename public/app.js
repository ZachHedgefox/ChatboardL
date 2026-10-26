const messagesEl = document.getElementById("messages");
const form = document.getElementById("form");
const usernameEl = document.getElementById("username");
const textEl = document.getElementById("text");
const errorEl = document.getElementById("error");
const statusEl = document.getElementById("status");

const seen = new Set();

// Remember the username between visits
try { usernameEl.value = localStorage.getItem("chatboard-username") || ""; } catch {}

function render(msg) {
  if (seen.has(msg.id)) return;
  seen.add(msg.id);
  messagesEl.querySelector(".empty")?.remove();

  const nearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 80;

  const wrap = document.createElement("div");
  wrap.className = "msg" + (msg.username === usernameEl.value.trim() ? " mine" : "");

  const meta = document.createElement("div");
  meta.className = "meta";
  const name = document.createElement("strong");
  name.textContent = msg.username; // textContent => no HTML injection
  const time = new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  meta.append(name, " · " + time);

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = msg.text;

  wrap.append(meta, bubble);
  messagesEl.append(wrap);
  if (nearBottom) messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showEmpty() {
  if (!messagesEl.children.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No messages yet. Say hi!";
    messagesEl.append(p);
  }
}

async function loadHistory() {
  const res = await fetch("/api/messages");
  const list = await res.json();
  list.forEach(render);
  showEmpty();
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function connect() {
  const es = new EventSource("/api/stream");
  es.onopen = () => { statusEl.textContent = "live"; statusEl.classList.add("online"); };
  es.onmessage = (e) => render(JSON.parse(e.data));
  es.onerror = () => { statusEl.textContent = "reconnecting…"; statusEl.classList.remove("online"); };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  const username = usernameEl.value.trim();
  const text = textEl.value.trim();
  if (!username || !text) return;
  try { localStorage.setItem("chatboard-username", username); } catch {}

  const button = form.querySelector("button");
  button.disabled = true;
  try {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not send message.");
    textEl.value = "";
    textEl.focus();
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    button.disabled = false;
  }
});

loadHistory().then(connect).catch(() => { statusEl.textContent = "offline"; });
