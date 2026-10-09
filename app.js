// config
const PUBLIC_API_KEY = "";
const PRIMARY_MODEL = "gemini-3.5-flash";
const FALLBACK_MODELS = [PRIMARY_MODEL, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

// state
let db = null;
let currentSessionId = null;
let isGenerating = false;

// dom elements
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");

const chatList = document.getElementById("chatList");
const newChatBtn = document.getElementById("newChatBtn");
const sessionCount = document.getElementById("sessionCount");

const messagesArea = document.getElementById("messagesArea");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const dbStatusBadge = document.getElementById("dbStatusBadge");

const apiKeyModal = document.getElementById("apiKeyModal");
const openApiKeyBtn = document.getElementById("openApiKeyBtn");
const closeApiKeyBtn = document.getElementById("closeApiKeyBtn");
const apiKeyForm = document.getElementById("apiKeyForm");
const apiKeyInput = document.getElementById("apiKeyInput");
const apiKeyBtnText = document.getElementById("apiKeyBtnText");

// init sqlite database
async function initSQLite() {
  try {
    const SQL = await window.initSqlJs({
      locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
    });

    const savedDb = localStorage.getItem("may_lo_yar_may_sqlite");
    if (savedDb) {
      const uInt8Array = new Uint8Array(JSON.parse(savedDb));
      db = new SQL.Database(uInt8Array);
    } else {
      db = new SQL.Database();
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    saveDbToLocalStorage();
    dbStatusBadge.textContent = "● SQLite Active";
    dbStatusBadge.className = "inline-block bg-neo-green border border-black rounded-full px-2 py-0.5 text-[10px] md:text-xs font-bold shadow-neo-sm";

    loadSessions();
  } catch (err) {
    console.error("SQLite Init Error:", err);
    dbStatusBadge.textContent = "⚠️ Local Storage Fallback";
  }
}

// save db to localstorage
function saveDbToLocalStorage() {
  if (!db) return;
  try {
    const binaryData = db.export();
    localStorage.setItem("may_lo_yar_may_sqlite", JSON.stringify(Array.from(binaryData)));
  } catch (err) {
    console.warn("Storage quota warning:", err.message);
  }
}

// get api key
function getApiKey() {
  const customKey = localStorage.getItem("GEMINI_API_KEY");
  if (customKey && customKey.trim()) return customKey.trim();

  if (PUBLIC_API_KEY && PUBLIC_API_KEY.trim()) return PUBLIC_API_KEY.trim();

  return "";
}

// update key button state
function updateApiKeyUI() {
  const key = getApiKey();
  if (key) {
    if (localStorage.getItem("GEMINI_API_KEY")) {
      apiKeyBtnText.textContent = "🔑 Custom Key (ပြင်မည်)";
    } else {
      apiKeyBtnText.textContent = "🔑 Public Key Active";
    }
    apiKeyInput.value = key;
  } else {
    apiKeyBtnText.textContent = "🔑 Gemini Key ထည့်ရန်";
    apiKeyInput.value = "";
  }
}

// api key modal controls
openApiKeyBtn.onclick = () => apiKeyModal.classList.remove("hidden");
closeApiKeyBtn.onclick = () => apiKeyModal.classList.add("hidden");
apiKeyModal.onclick = (e) => {
  if (e.target === apiKeyModal) apiKeyModal.classList.add("hidden");
};

apiKeyForm.onsubmit = (e) => {
  e.preventDefault();
  const key = apiKeyInput.value.trim();
  if (!key) return;
  localStorage.setItem("GEMINI_API_KEY", key);
  updateApiKeyUI();
  apiKeyModal.classList.add("hidden");
  alert("Gemini API Key ကို Browser တွင် အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!");
};

// send message to gemini api
async function callGemini(contents, systemPrompt = "") {
  const apiKey = getApiKey();
  if (!apiKey) {
    apiKeyModal.classList.remove("hidden");
    throw new Error("ကျေးဇူးပြု၍ ပထမဦးစွာ Gemini API Key ကို ထည့်သွင်းပေးပါခင်ဗျာ။");
  }

  let lastErrorMessage = "";

  // try fallback models if server is busy
  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const currentModel = FALLBACK_MODELS[i];

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

      const requestBody = { contents };
      if (systemPrompt) {
        requestBody.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || "";
        const errorCode = data.error?.code || response.status;

        // invalid or expired key
        if (
          errorCode === 400 &&
          (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API key not valid") || errorMsg.includes("not found"))
        ) {
          apiKeyModal.classList.remove("hidden");
          throw new Error("သင်ထည့်ထားသော Gemini API Key မှားယွင်းနေပါသည် သို့မဟုတ် သက်တမ်းကုန်ဆုံးသွားပါပြီ။ ကျေးဇူးပြု၍ Key အသစ် ပြန်လည်ထည့်ပေးပါ။");
        }

        // high demand - try next model
        if (
          errorCode === 503 ||
          errorMsg.includes("high demand") ||
          errorMsg.includes("overloaded") ||
          errorMsg.includes("temporarily unavailable")
        ) {
          console.warn(`Model ${currentModel} busy. Trying fallback...`);
          lastErrorMessage = "Google Server တွင် လက်ရှိ အသုံးပြုသူ များပြားနေပါသည် (High Demand)။ ခေတ္တစောင့်ဆိုင်းပြီး ပြန်လည်မေးမြန်းပေးပါခင်ဗျာ။";
          continue;
        }

        // rate limit
        if (errorCode === 429 || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("Quota exceeded")) {
          console.warn(`Model ${currentModel} rate limited. Trying fallback...`);
          lastErrorMessage = "အခမဲ့ API Quota ခေတ္တပြည့်သွားပါပြီ (Rate Limit)။ စက္ကန့် ၃၀ ခန့် စောင့်ဆိုင်းပြီးမှ ထပ်မံမေးမြန်းပေးပါခင်ဗျာ။";
          continue;
        }

        throw new Error(errorMsg || "Gemini API Error occurred");
      }

      // safety filter
      const candidate = data.candidates?.[0];
      if (candidate?.finishReason === "SAFETY") {
        return "⚠️ တောင်းပန်ပါတယ်ခင်ဗျာ။ ဤမေးခွန်းသည် Google Safety စည်းမျဉ်းအရ အဖြေထုတ်ပေးခြင်းကို ကန့်သတ်ထားပါသည် (Safety Filtered)။";
      }

      // empty response check
      const replyText = candidate?.content?.parts?.[0]?.text;
      if (!replyText || !replyText.trim()) {
        throw new Error("Gemini မှ စာသားအဖြေ ထုတ်မပေးနိုင်ခဲ့ပါ။ အခြားမေးခွန်းတစ်ခု စမ်းမေးကြည့်ပေးပါခင်ဗျာ။");
      }

      return replyText;
    } catch (fetchErr) {
      if (fetchErr.message.includes("Failed to fetch") || fetchErr.name === "TypeError") {
        throw new Error("အင်တာနက်လိုင်း မရှိပါ သို့မဟုတ် Network ပြတ်တောက်နေပါသည် (Network Disconnected)။");
      }
      lastErrorMessage = fetchErr.message;
    }
  }

  throw new Error(lastErrorMessage || "အဖြေထုတ်ယူရာတွင် အဆင်မပြေဖြစ်သွားပါသည်ခင်ဗျာ။ ပြန်လည်မေးမြန်းပေးပါ။");
}

// load session list from sqlite
function loadSessions() {
  if (!db) return;
  chatList.innerHTML = "";

  const stmt = db.prepare("SELECT id, title FROM sessions ORDER BY created_at DESC");
  const sessions = [];
  while (stmt.step()) {
    sessions.push(stmt.getAsObject());
  }
  stmt.free();

  sessionCount.textContent = sessions.length;

  if (sessions.length === 0) {
    chatList.innerHTML = `
      <div class="text-xs font-bold text-black/60 p-3 text-center bg-white/70 border border-black rounded-lg">
        မှတ်တမ်း မရှိသေးပါ
      </div>
    `;
    return;
  }

  sessions.forEach((s) => {
    const isActive = s.id === currentSessionId;
    const item = document.createElement("div");

    item.className = `group flex items-center justify-between p-2 rounded-lg border-2 border-black font-bold text-xs cursor-pointer shadow-neo-sm transition-all ${
      isActive
        ? "bg-neo-yellow translate-x-[-1px] translate-y-[-1px] shadow-neo"
        : "bg-white hover:bg-neo-pink hover:translate-x-[-1px] hover:translate-y-[-1px]"
    }`;

    const titleSpan = document.createElement("span");
    titleSpan.className = "truncate flex-1 pr-2";
    titleSpan.textContent = s.title;
    titleSpan.onclick = () => {
      selectSession(s.id);
      if (window.innerWidth < 768) closeSidebar();
    };

    const delBtn = document.createElement("button");
    delBtn.className =
      "opacity-0 group-hover:opacity-100 p-1 hover:bg-red-400 border border-black rounded text-[10px] transition-opacity shrink-0";
    delBtn.title = "ဖျက်မည်";
    delBtn.innerHTML = "🗑️";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`"${s.title}" စကားဝိုင်းကို ဖျက်လိုပါသလား?`)) {
        deleteSession(s.id);
      }
    };

    item.appendChild(titleSpan);
    item.appendChild(delBtn);
    chatList.appendChild(item);
  });
}

// select active session
function selectSession(sessionId) {
  if (isGenerating || !db) return;
  currentSessionId = sessionId;
  loadSessions();

  messagesArea.innerHTML = "";

  const stmt = db.prepare("SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC");
  stmt.bind([sessionId]);

  let count = 0;
  while (stmt.step()) {
    const msg = stmt.getAsObject();
    appendMessage(msg.role, msg.content);
    count++;
  }
  stmt.free();

  if (count === 0) {
    renderWelcomeCard();
  }
}

// delete session
function deleteSession(sessionId) {
  if (!db) return;
  db.run("DELETE FROM messages WHERE session_id = ?", [sessionId]);
  db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
  saveDbToLocalStorage();

  if (currentSessionId === sessionId) {
    currentSessionId = null;
    renderWelcomeCard();
  }
  loadSessions();
}

// initial welcome card
function renderWelcomeCard() {
  messagesArea.innerHTML = `
    <div class="max-w-md bg-neo-yellow border-[3px] border-black rounded-xl p-5 shadow-neo">
      <div class="inline-block bg-white border border-black rounded-md px-2 py-0.5 text-xs font-black mb-2 shadow-neo-sm">
        🤖 မေးလိုရာမေး AI
      </div>
      <h4 class="font-extrabold text-base md:text-lg mb-1">မင်္ဂလာပါခင်ဗျာ!</h4>
      <p class="text-xs md:text-sm font-medium leading-relaxed">
        မေးလိုရာ အကြောင်းအရာများကို စတင်မေးမြန်းနိုင်ပါပြီ။
      </p>
      <div class="mt-3 pt-3 border-t border-black/30 flex flex-wrap gap-1.5 text-[11px] font-bold">
        <span class="bg-white border border-black rounded px-2 py-0.5">⚡ Gemini 3.5 Flash</span>
        <span class="bg-neo-green border border-black rounded px-2 py-0.5">💾 Browser SQLite</span>
      </div>
    </div>
  `;
}

// append message bubble
function appendMessage(role, text) {
  const isUser = role === "user";
  const wrapper = document.createElement("div");

  wrapper.className = `max-w-[85%] md:max-w-[75%] p-4 rounded-xl border-2 border-black shadow-neo font-medium text-xs md:text-sm leading-relaxed ${
    isUser
      ? "self-end bg-neo-green text-black whitespace-pre-wrap"
      : "self-start bg-white text-black markdown-body"
  }`;

  if (isUser) {
    wrapper.textContent = text;
  } else {
    if (window.marked && typeof window.marked.parse === "function") {
      wrapper.innerHTML = window.marked.parse(text);
    } else {
      wrapper.textContent = text;
    }

    const footerDiv = document.createElement("div");
    footerDiv.className = "mt-3 pt-2 border-t border-black/30 flex items-center justify-between";

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn neo-press";
    copyBtn.innerHTML = "📋 ကူးယူမည်";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      copyBtn.innerHTML = "✅ ကူးယူပြီး!";
      setTimeout(() => (copyBtn.innerHTML = "📋 ကူးယူမည်"), 2000);
    };
    footerDiv.appendChild(copyBtn);

    wrapper.appendChild(footerDiv);
  }

  messagesArea.appendChild(wrapper);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// handle chat submit
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isGenerating) return;

  const text = userInput.value.trim();
  if (!text) return;

  if (!getApiKey()) {
    apiKeyModal.classList.remove("hidden");
    return;
  }

  if (!currentSessionId) {
    currentSessionId = "session_" + Date.now();
    const title = text.slice(0, 30) + (text.length > 30 ? "..." : "");
    db.run("INSERT INTO sessions (id, title) VALUES (?, ?)", [currentSessionId, title]);
    saveDbToLocalStorage();
    loadSessions();
  }

  appendMessage("user", text);
  userInput.value = "";
  db.run("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)", [currentSessionId, "user", text]);
  saveDbToLocalStorage();

  const tempThinking = document.createElement("div");
  tempThinking.className =
    "self-start max-w-[75%] p-3 rounded-xl border-2 border-black shadow-neo bg-white text-xs font-black flex items-center gap-2";
  tempThinking.innerHTML = `
    <span class="inline-block w-2.5 h-2.5 bg-neo-yellow border border-black rounded-full animate-bounce"></span>
    <span>မေးလိုရာမေး AI စဉ်းစားနေပါသည်...</span>
  `;
  messagesArea.appendChild(tempThinking);
  messagesArea.scrollTop = messagesArea.scrollHeight;

  isGenerating = true;
  sendBtn.disabled = true;

  try {
    const stmt = db.prepare("SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC");
    stmt.bind([currentSessionId]);
    const historyContents = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      historyContents.push({
        role: row.role === "user" ? "user" : "model",
        parts: [{ text: row.content }],
      });
    }
    stmt.free();

    const systemPrompt = `သင်သည် "မေးလိုရာမေး AI" အမည်ရှိသော အသိဉာဏ်မြင့်မားပြီး အကူအညီပေးနိုင်သော မြန်မာ/အင်္ဂလိပ် နှစ်ဘာသာသုံး လက်ထောက်ဖြစ်ပါသည်။
အသုံးပြုသူ၏ မေးခွန်းများကို ယဉ်ကျေးပျူငှာစွာနှင့် ရှင်းလင်းတိကျစွာ ဖြေကြားပေးပါ။ လိုအပ်ပါက သပ်ရပ်သော Markdown formatting ဖြင့် ဖြေကြားပေးပါ။`;

    const replyText = await callGemini(historyContents, systemPrompt);

    if (tempThinking.parentNode) messagesArea.removeChild(tempThinking);

    appendMessage("model", replyText);
    db.run("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)", [currentSessionId, "model", replyText]);
    saveDbToLocalStorage();
  } catch (err) {
    if (tempThinking.parentNode) messagesArea.removeChild(tempThinking);
    appendMessage("model", `⚠️ အမှားဖြစ်ပေါ်သွားပါသည်: ${err.message}`);
  } finally {
    isGenerating = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});

// new chat button
newChatBtn.onclick = () => {
  if (isGenerating) return;
  currentSessionId = null;
  renderWelcomeCard();
  loadSessions();
  if (window.innerWidth < 768) closeSidebar();
};

// mobile sidebar toggle
function openSidebar() {
  sidebar.classList.remove("-translate-x-[110%]");
  sidebarOverlay.classList.remove("hidden");
}

function closeSidebar() {
  sidebar.classList.add("-translate-x-[110%]");
  sidebarOverlay.classList.add("hidden");
}

if (toggleSidebarBtn) toggleSidebarBtn.onclick = openSidebar;
if (closeSidebarBtn) closeSidebarBtn.onclick = closeSidebar;
if (sidebarOverlay) sidebarOverlay.onclick = closeSidebar;

// init on load
window.addEventListener("DOMContentLoaded", () => {
  updateApiKeyUI();
  initSQLite();
});
