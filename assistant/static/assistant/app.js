const chat = document.getElementById("chat");
const promptBox = document.getElementById("prompt");
const sendBtn = document.getElementById("send-btn");
const GREETING = "Hi! I'm Lala. Ask me anything about your lessons and I'll help you explore it.";
const isTouch = window.matchMedia("(pointer: coarse)").matches;
let busy = false;

function getCsrf() {
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  if (m) return decodeURIComponent(m[1]);
  const el = document.querySelector("[name=csrfmiddlewaretoken]");
  return el ? el.value : "";
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
function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = "message " + who;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

async function sendPrompt(text) {
  text = (text || "").trim();
  if (!text || busy) return;
  busy = true;
  addMessage(text, "user");
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

document.getElementById("clear-btn").addEventListener("click", () => {
  chat.innerHTML = "";
  addMessage(GREETING, "ai");
});

document.querySelectorAll(".chip").forEach((btn) => {
  btn.addEventListener("click", () => sendPrompt(btn.textContent));
});

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