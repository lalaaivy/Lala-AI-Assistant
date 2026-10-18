const chat = document.getElementById("chat");
const promptBox = document.getElementById("prompt");
const sendBtn = document.getElementById("send-btn");
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const historyEl = document.getElementById("history");
const STORE = "lala-chats-v1";
const NEW_TITLE = "New chat";
const isTouch = window.matchMedia("(pointer: coarse)").matches;
let busy = false;
let chats = [];      // saved conversations, newest first
let current = null;  // the conversation on screen

function getCsrf() {
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  if (m) return decodeURIComponent(m[1]);
  const el = document.querySelector("[name=csrfmiddlewaretoken]");
  return el ? el.value : "";
}

/* ---------- Saved history (stored in this browser) ---------- */
function loadChats() {
  try {
    const list = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}
function saveChats() {
  try { localStorage.setItem(STORE, JSON.stringify(chats.slice(0, 30))); } catch (e) {}
}

/* ---------- Markdown + math rendering ---------- */
if (window.DOMPurify) {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

function mathToHtml(tex, display) {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false });
  } catch (e) {
    return "";
  }
}

function renderMarkdown(text) {
  const store = [];
  const keep = (tex, display) => {
    store.push(mathToHtml(tex.trim(), display));
    return "@@MATH" + (store.length - 1) + "@@";
  };

  let t = text;
  if (window.katex) {
    t = t
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => keep(m, true))
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => keep(m, true))
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => keep(m, false))
      .replace(/\$([^\s$][^$\n]*?[^\s$]|[^\s$])\$/g, (_, m) => keep(m, false));
  }

  let html = marked.parse(t, { breaks: true });
  html = DOMPurify.sanitize(html);
  return html.replace(/@@MATH(\d+)@@/g, (_, i) => store[Number(i)] || "");
}

function setReply(el, text) {
  if (window.marked && window.DOMPurify) {
    el.classList.add("md");
    el.innerHTML = renderMarkdown(text);
  } else {
    el.textContent = text;   // libraries not loaded: show plain text
  }
}

/* ---------- Chat ---------- */
function showHero() {
  chat.appendChild(document.getElementById("hero-tpl").content.cloneNode(true));
}

// Adds a name label + bubble; returns the bubble
function addMessage(text, who) {
  const hero = chat.querySelector(".empty");
  if (hero) hero.remove();

  const row = document.createElement("div");
  row.className = "row " + who;
  const name = document.createElement("div");
  name.className = "name";
  name.textContent = who === "ai" ? "Lala" : "You";
  const bubble = document.createElement("div");
  bubble.className = "message " + who;
  bubble.textContent = text;
  row.append(name, bubble);
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
  return bubble;
}

function render() {
  chat.innerHTML = "";
  if (!current.msgs.length) {
    showHero();   // planet + greeting on an empty chat
  } else {
    current.msgs.forEach((m) => {
      const bubble = addMessage(m.text, m.who);
      if (m.who === "ai") setReply(bubble, m.text);
    });
  }
  chat.scrollTop = chat.scrollHeight;
  renderHistory();
}

function newChat() {
  current = { id: Date.now().toString(36), title: NEW_TITLE, msgs: [] };
  render();
  closeDrawer();
  if (!isTouch) promptBox.focus();
}

async function sendPrompt(text) {
  text = (text || "").trim();
  if (!text || busy) return;
  busy = true;
  const convo = current;

  addMessage(text, "user");
  convo.msgs.push({ who: "user", text });
  if (convo.title === NEW_TITLE) convo.title = text.slice(0, 40);
  if (!chats.includes(convo)) chats.unshift(convo);
  saveChats();
  renderHistory();
  promptBox.value = "";

  const loading = addMessage("Thinking...", "ai");
  try {
    const res = await fetch("/ask/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      credentials: "same-origin",
      body: JSON.stringify({ prompt: text }),
    });
    const raw = await res.text();
    let data = {};
    try { data = JSON.parse(raw); } catch (e) {}
    if (res.ok && data.reply) {
      setReply(loading, data.reply);
      convo.msgs.push({ who: "ai", text: data.reply });
      chats = [convo, ...chats.filter((c) => c !== convo)];  // move to top
      saveChats();
      renderHistory();
    } else {
      loading.textContent = data.error || ("Server error " + res.status + ". Please refresh the page and try again.");
    }
  } catch (err) {
    loading.textContent = "Could not reach the server. Check your connection.";
  }
  busy = false;
  chat.scrollTop = chat.scrollHeight;
}

sendBtn.addEventListener("click", () => sendPrompt(promptBox.value));

promptBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !isTouch) {
    e.preventDefault();
    sendPrompt(promptBox.value);
  }
});

document.getElementById("new-btn").addEventListener("click", newChat);
document.getElementById("new-chat").addEventListener("click", newChat);

document.querySelectorAll(".chip").forEach((btn) => {
  btn.addEventListener("click", () => sendPrompt(btn.textContent));
});

/* ---------- Menu + history drawer ---------- */
function openDrawer() {
  renderHistory();
  drawer.classList.add("open");
  overlay.classList.add("open");
  document.getElementById("close-drawer").focus();
}
function closeDrawer() {
  drawer.classList.remove("open");
  overlay.classList.remove("open");
}

function renderHistory() {
  historyEl.innerHTML = "";
  if (!chats.length) {
    const empty = document.createElement("div");
    empty.className = "hist-empty";
    empty.textContent = "No chats yet.";
    historyEl.appendChild(empty);
    return;
  }
  chats.forEach((c) => {
    const item = document.createElement("div");
    item.className = "hist-item" + (c === current ? " active" : "");

    const open = document.createElement("button");
    open.className = "hist-open";
    open.textContent = c.title;
    open.addEventListener("click", () => {
      current = c;
      render();
      closeDrawer();
    });

    const del = document.createElement("button");
    del.className = "hist-del";
    del.textContent = "×";
    del.setAttribute("aria-label", "Delete chat");
    del.addEventListener("click", () => {
      if (!confirm("Delete this chat?")) return;
      chats = chats.filter((x) => x !== c);
      saveChats();
      if (c === current) newChat(); else renderHistory();
    });

    item.append(open, del);
    historyEl.appendChild(item);
  });
}

document.getElementById("menu-btn").addEventListener("click", openDrawer);
document.getElementById("close-drawer").addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

/* ---------- Start ---------- */
chats = loadChats();
current = { id: Date.now().toString(36), title: NEW_TITLE, msgs: [] };
render();

/* ---------- Offline detection ---------- */
function updateStatus() {
  document.getElementById("offline-banner")
    .classList.toggle("d-none", navigator.onLine);
}
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();

/* ---------- Service worker ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

/* ---------- Install button ---------- */
let deferredPrompt = null;
const installBtn = document.getElementById("install-btn");
if (installBtn) {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove("d-none");
  });
  installBtn.addEventListener("click", async () => {
    installBtn.classList.add("d-none");
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
  });
  window.addEventListener("appinstalled", () => installBtn.classList.add("d-none"));
}