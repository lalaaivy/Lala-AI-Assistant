const csrf = document.querySelector("[name=csrfmiddlewaretoken]").value;
const chat = document.getElementById("chat");
const promptBox = document.getElementById("prompt");

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = "message " + who;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

async function sendPrompt(text) {
  text = text.trim();
  if (!text) return;
  addMessage(text, "user");
  promptBox.value = "";
  const loading = addMessage("Thinking...", "ai");
  try {
    const res = await fetch("/ask/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
      body: JSON.stringify({ prompt: text }),
    });
    const data = await res.json();
    loading.textContent = data.reply || data.error;
  } catch (err) {
    loading.textContent = "Could not reach the server. Check your connection.";
  }
  chat.scrollTop = chat.scrollHeight;
}

document.getElementById("clear-btn").addEventListener("click", () => {
  chat.innerHTML = "";
  addMessage("Hi! I'm Lala. Ask me anything about your lessons and I'll help you understand it.", "ai");
});

promptBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt(promptBox.value);
  }
});

document.getElementById("clear-btn").addEventListener("click", () => {
  chat.innerHTML = "";
});

document.querySelectorAll(".chip").forEach((btn) => {
  btn.addEventListener("click", () => sendPrompt(btn.textContent));
});

// Offline detection
function updateStatus() {
  document.getElementById("offline-banner")
    .classList.toggle("d-none", navigator.onLine);
}
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();

// Service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
// Install button
let deferredPrompt = null;
const installBtn = document.getElementById("install-btn");

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

window.addEventListener("appinstalled", () => {
  installBtn.classList.add("d-none");
});