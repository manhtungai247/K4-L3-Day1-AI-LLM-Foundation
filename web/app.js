/**
 * LLM Lab Studio — Frontend Application Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initStatus();
  initChat();
  initArena();
  initTokens();
  initRetry();
});

/* ==========================================================================
   Tab Navigation
   ========================================================================== */
function initTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-tab");
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      tab.classList.add("active");
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add("active");
    });
  });
}

/* ==========================================================================
   Status & Provider Info
   ========================================================================== */
async function initStatus() {
  const providerEl = document.getElementById("status-provider");
  const modelEl = document.getElementById("status-model");
  const largeNameEl = document.getElementById("arena-large-name");
  const miniNameEl = document.getElementById("arena-mini-name");

  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error("API status error");
    const data = await res.json();

    if (providerEl) providerEl.textContent = `${data.provider} Sẵn Sàng`;
    if (modelEl) modelEl.textContent = data.mini_model || "Meta Llama";
    if (largeNameEl) largeNameEl.textContent = data.large_model;
    if (miniNameEl) miniNameEl.textContent = data.mini_model;
  } catch (err) {
    if (providerEl) {
      providerEl.textContent = "Chưa kết nối";
      providerEl.style.color = "var(--rose)";
    }
  }
}

/* ==========================================================================
   TAB 1: Chat Assistant & Streaming
   ========================================================================== */
function initChat() {
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const btnSend = document.getElementById("btn-send-msg");

  const statTurns = document.getElementById("stat-turns");
  const statTokens = document.getElementById("stat-tokens");
  const statCost = document.getElementById("stat-cost");
  const statLatency = document.getElementById("stat-latency");

  const tempSlider = document.getElementById("chat-temp");
  const tempVal = document.getElementById("chat-temp-val");
  const maxTokensSlider = document.getElementById("chat-maxtokens");
  const maxTokensVal = document.getElementById("chat-maxtokens-val");
  const modelSelect = document.getElementById("chat-model-select");

  const personaBtns = document.querySelectorAll(".persona-btn");
  const customPersonaBox = document.getElementById("custom-persona-box");
  const customPersonaInput = document.getElementById("custom-persona-input");
  const personaPreview = document.getElementById("active-persona-preview");

  const btnClear = document.getElementById("btn-clear-chat");
  const btnMemory = document.getElementById("btn-show-history");
  const modalMemory = document.getElementById("modal-memory");
  const btnCloseMemory = document.getElementById("btn-close-memory");
  const memoryContent = document.getElementById("memory-content");

  // State
  let activePersona = "Bạn là trợ giảng thân thiện của khóa AI, trả lời ngắn gọn, súc tích (dưới 100 từ) bằng tiếng Việt.";
  let chatHistory = []; // list of {role, content}
  let totalTurns = 0;
  let totalTokensCount = 0;
  let totalCostSum = 0.0;
  let isGenerating = false;

  // Slider displays
  if (tempSlider && tempVal) {
    tempSlider.addEventListener("input", (e) => {
      tempVal.textContent = parseFloat(e.target.value).toFixed(1);
    });
  }

  if (maxTokensSlider && maxTokensVal) {
    maxTokensSlider.addEventListener("input", (e) => {
      maxTokensVal.textContent = e.target.value;
    });
  }

  // Persona Selection
  personaBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      personaBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (btn.id === "persona-custom-toggle") {
        customPersonaBox.style.display = "block";
        if (customPersonaInput.value.trim()) {
          activePersona = customPersonaInput.value.trim();
        }
      } else {
        customPersonaBox.style.display = "none";
        activePersona = btn.getAttribute("data-persona");
      }
      if (personaPreview) personaPreview.textContent = activePersona;
    });
  });

  if (customPersonaInput) {
    customPersonaInput.addEventListener("input", (e) => {
      activePersona = e.target.value.trim() || "Bạn là một trợ lý AI thông minh.";
      if (personaPreview) personaPreview.textContent = activePersona;
    });
  }

  // Auto-resize textarea
  if (chatInput) {
    chatInput.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });

    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event("submit"));
      }
    });
  }

  // Clear Chat History
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      chatHistory = [];
      totalTurns = 0;
      totalTokensCount = 0;
      totalCostSum = 0.0;

      if (statTurns) statTurns.textContent = "0";
      if (statTokens) statTokens.textContent = "0";
      if (statCost) statCost.textContent = "$0.0000";
      if (statLatency) statLatency.textContent = "0.0s";

      chatMessages.innerHTML = `
        <div class="system-notice">
          <div class="notice-badge">System Prompt Cố Định</div>
          <div class="notice-text">${activePersona}</div>
        </div>
        <div class="message-bubble assistant-msg">
          <div class="msg-avatar">🤖</div>
          <div class="msg-body">
            <div class="msg-header">
              <span class="msg-author">Trợ lý AI</span>
              <span class="msg-time">Vừa xong</span>
            </div>
            <div class="msg-text">Lịch sử chat đã được làm mới! Bạn muốn hỏi về chủ đề gì tiếp theo?</div>
          </div>
        </div>
      `;
    });
  }

  // Memory Inspector
  if (btnMemory && modalMemory && memoryContent) {
    btnMemory.addEventListener("click", () => {
      modalMemory.style.display = "flex";
      if (chatHistory.length === 0) {
        memoryContent.innerHTML = "<p style='color:var(--text-subtle); text-align:center;'>Chưa có lịch sử tin nhắn trong bộ nhớ.</p>";
      } else {
        memoryContent.innerHTML = chatHistory.map((m, idx) => `
          <div class="memory-msg-item">
            <div class="memory-msg-role role-${m.role}">#${idx + 1} — ${m.role.toUpperCase()}</div>
            <div class="memory-msg-content">${escapeHtml(m.content)}</div>
          </div>
        `).join("");
      }
    });

    btnCloseMemory.addEventListener("click", () => {
      modalMemory.style.display = "none";
    });

    modalMemory.addEventListener("click", (e) => {
      if (e.target === modalMemory) modalMemory.style.display = "none";
    });
  }

  // Send message and stream response
  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message || isGenerating) return;

      // Add user message bubble
      appendMessage("user", message);
      chatInput.value = "";
      chatInput.style.height = "auto";
      isGenerating = true;
      btnSend.disabled = true;

      // Create assistant placeholder bubble with streaming cursor
      const assistantBubble = createAssistantMessageBubble();
      chatMessages.appendChild(assistantBubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      const textContainer = assistantBubble.querySelector(".msg-text");
      textContainer.classList.add("streaming-cursor");

      try {
        const payload = {
          persona: activePersona,
          message: message,
          history: chatHistory,
          temperature: parseFloat(tempSlider.value),
          max_tokens: maxTokensSlider ? parseInt(maxTokensSlider.value, 10) : 256,
          model: modelSelect ? modelSelect.value : "large"
        };

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Lỗi mạng khi kết nối stream");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedReply = "";
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop(); // keep remainder

          for (const block of lines) {
            const trimmed = block.trim();
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.replace("data:", "").trim();

            try {
              const data = JSON.parse(jsonStr);

              if (data.delta) {
                accumulatedReply += data.delta;
                textContainer.textContent = accumulatedReply;
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }

              if (data.done) {
                // Final metadata chunk
                totalTurns += 1;
                totalTokensCount += data.total_tokens || 0;
                totalCostSum += data.total_cost || 0.0;

                if (statTurns) statTurns.textContent = totalTurns;
                if (statTokens) statTokens.textContent = totalTokensCount;
                if (statCost) statCost.textContent = `$${totalCostSum.toFixed(5)}`;
                if (statLatency) statLatency.textContent = `${data.latency.toFixed(2)}s`;

                // Update assistant bubble metadata
                const metaSpan = assistantBubble.querySelector(".msg-time");
                if (metaSpan) metaSpan.textContent = `${data.latency.toFixed(1)}s • ${data.output_tokens} tokens`;

                // Update memory history (sliding window max 6)
                chatHistory.push({ role: "user", content: message });
                chatHistory.push({ role: "assistant", content: accumulatedReply });
                if (chatHistory.length > 6) {
                  chatHistory = chatHistory.slice(-6);
                }
              }

              if (data.error) {
                textContainer.textContent = `[Lỗi API: ${data.error}]`;
                textContainer.style.color = "var(--rose)";
              }
            } catch (err) {
              console.error("Lỗi parse SSE chunk:", err);
            }
          }
        }
      } catch (err) {
        textContainer.textContent = `[Lỗi: ${err.message}]`;
        textContainer.style.color = "var(--rose)";
      } finally {
        textContainer.classList.remove("streaming-cursor");
        isGenerating = false;
        btnSend.disabled = false;
        chatInput.focus();
      }
    });
  }

  function appendMessage(role, text) {
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${role === "user" ? "user-msg" : "assistant-msg"}`;
    bubble.innerHTML = `
      <div class="msg-avatar">${role === "user" ? "👤" : "🤖"}</div>
      <div class="msg-body">
        <div class="msg-header">
          <span class="msg-author">${role === "user" ? "Bạn" : "Trợ lý AI"}</span>
          <span class="msg-time">Vừa xong</span>
        </div>
        <div class="msg-text">${escapeHtml(text)}</div>
      </div>
    `;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function createAssistantMessageBubble() {
    const bubble = document.createElement("div");
    bubble.className = "message-bubble assistant-msg";
    bubble.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-body">
        <div class="msg-header">
          <span class="msg-author">Trợ lý AI</span>
          <span class="msg-time">Đang trả lời...</span>
        </div>
        <div class="msg-text"></div>
      </div>
    `;
    return bubble;
  }
}

/* ==========================================================================
   TAB 2: Model Comparison Arena
   ========================================================================== */
function initArena() {
  const btnRun = document.getElementById("btn-run-compare");
  const promptInput = document.getElementById("compare-prompt");
  const tempSlider = document.getElementById("compare-temp");
  const tempVal = document.getElementById("compare-temp-val");
  const toppSlider = document.getElementById("compare-topp");
  const toppVal = document.getElementById("compare-topp-val");
  const maxTokensSlider = document.getElementById("compare-maxtokens");
  const maxTokensVal = document.getElementById("compare-maxtokens-val");

  const g4oResp = document.getElementById("arena-large-response");
  const miniResp = document.getElementById("arena-mini-response");
  const g4oLat = document.getElementById("arena-large-latency");
  const miniLat = document.getElementById("arena-mini-latency");
  const g4oTok = document.getElementById("arena-large-tokens");
  const miniTok = document.getElementById("arena-mini-tokens");
  const g4oCost = document.getElementById("arena-large-cost");
  const miniCost = document.getElementById("arena-mini-cost");

  const summaryBar = document.getElementById("arena-summary-bar");
  const summaryText = document.getElementById("arena-summary-text");
  const chips = document.querySelectorAll(".chip-btn");

  if (tempSlider && tempVal) {
    tempSlider.addEventListener("input", (e) => {
      tempVal.textContent = parseFloat(e.target.value).toFixed(1);
    });
  }

  if (toppSlider && toppVal) {
    toppSlider.addEventListener("input", (e) => {
      toppVal.textContent = parseFloat(e.target.value).toFixed(2);
    });
  }

  if (maxTokensSlider && maxTokensVal) {
    maxTokensSlider.addEventListener("input", (e) => {
      maxTokensVal.textContent = e.target.value;
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      promptInput.value = chip.getAttribute("data-text");
      btnRun.click();
    });
  });

  if (btnRun) {
    btnRun.addEventListener("click", async () => {
      const prompt = promptInput.value.trim();
      if (!prompt) return;

      btnRun.disabled = true;
      btnRun.innerHTML = "<span class='btn-icon'>⏳</span><span>Đang xử lý cả 2 model...</span>";

      g4oResp.innerHTML = "<div class='empty-state'>Đang gọi model lớn...</div>";
      miniResp.innerHTML = "<div class='empty-state'>Đang gọi model nhỏ...</div>";
      g4oLat.textContent = "-- s";
      miniLat.textContent = "-- s";
      g4oTok.textContent = "--";
      miniTok.textContent = "--";
      g4oCost.textContent = "--";
      miniCost.textContent = "--";
      if (summaryBar) summaryBar.style.display = "none";

      try {
        const res = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            temperature: parseFloat(tempSlider.value),
            top_p: parseFloat(toppSlider.value),
            max_tokens: maxTokensSlider ? parseInt(maxTokensSlider.value, 10) : 256
          })
        });

        if (!res.ok) throw new Error("Lỗi khi so sánh hai model");
        const data = await res.json();

        g4oResp.textContent = data.gpt4o_response || "(Không có phản hồi)";
        miniResp.textContent = data.mini_response || "(Không có phản hồi)";

        g4oLat.textContent = `${data.gpt4o_latency}s`;
        miniLat.textContent = `${data.mini_latency}s`;

        g4oTok.textContent = `${data.gpt4o_tokens} tok`;
        miniTok.textContent = `${data.mini_tokens} tok`;

        g4oCost.textContent = `$${data.gpt4o_cost.toFixed(5)}`;
        miniCost.textContent = `$${data.mini_cost.toFixed(5)}`;

        // Summary Bar
        if (summaryBar && summaryText) {
          summaryBar.style.display = "flex";
          const speedRatio = (data.gpt4o_latency / Math.max(data.mini_latency, 0.001)).toFixed(1);
          const costRatio = (data.gpt4o_cost / Math.max(data.mini_cost, 0.000001)).toFixed(1);
          
          summaryText.innerHTML = `Model nhỏ phản hồi <strong>${data.mini_latency}s</strong> so với <strong>${data.gpt4o_latency}s</strong> của model lớn. Chi phí model lớn cao hơn khoảng <strong>${costRatio} lần</strong>.`;
        }
      } catch (err) {
        g4oResp.textContent = `Lỗi: ${err.message}`;
        miniResp.textContent = `Lỗi: ${err.message}`;
      } finally {
        btnRun.disabled = false;
        btnRun.innerHTML = "<span class='btn-icon'>⚡</span><span>Chạy So Sánh</span>";
      }
    });
  }
}

/* ==========================================================================
   TAB 3: Token Counter & Cost Calculator
   ========================================================================== */
function initTokens() {
  const tokenInput = document.getElementById("token-input-text");
  const btnCalc = document.getElementById("btn-calc-tokens");
  const calcStatus = document.getElementById("calc-status");

  const mTokens = document.getElementById("metric-tokens");
  const mWords = document.getElementById("metric-words");
  const mEst = document.getElementById("metric-est-words");
  const mDiff = document.getElementById("metric-diff");

  const g4oIn = document.getElementById("cost-gpt4o-in");
  const g4oOut = document.getElementById("cost-gpt4o-out");
  const miniIn = document.getElementById("cost-mini-in");
  const miniOut = document.getElementById("cost-mini-out");

  const btnVi = document.getElementById("btn-sample-vi");
  const btnEn = document.getElementById("btn-sample-en");

  const sampleVi = "Trí tuệ nhân tạo đang làm thay đổi mạnh mẽ cách con người làm việc và học tập mỗi ngày. Từ việc tự động hóa các tác vụ văn phòng đến hỗ trợ chẩn đoán y khoa, công nghệ này mang lại hiệu suất vượt bậc. Tại Việt Nam, nhiều doanh nghiệp và trường đại học đã bắt đầu tích hợp các giải pháp AI vào chương trình giảng dạy và quy trình vận hành. Điều này mở ra cơ hội phát triển to lớn nhưng cũng đòi hỏi chúng ta phải nhanh chóng nâng cao năng lực công nghệ và kỹ năng số để không bị tụt hậu phía sau.";
  
  const sampleEn = "Artificial intelligence is dramatically reshaping how people work and learn every day. From automating office routines to assisting complex medical diagnostics, this technology delivers unprecedented productivity gains. Across the world, enterprises and universities are integrating AI solutions into core curricula and operational workflows. This opens vast opportunities for economic growth while demanding that workforce digital skills rapidly advance to avoid obsolescence.";

  if (btnVi) {
    btnVi.addEventListener("click", () => {
      tokenInput.value = sampleVi;
      calculateTokens();
    });
  }

  if (btnEn) {
    btnEn.addEventListener("click", () => {
      tokenInput.value = sampleEn;
      calculateTokens();
    });
  }

  let debounceTimer = null;
  if (tokenInput) {
    tokenInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      if (calcStatus) calcStatus.textContent = "Đang tính...";
      debounceTimer = setTimeout(calculateTokens, 350);
    });
  }

  if (btnCalc) {
    btnCalc.addEventListener("click", calculateTokens);
  }

  async function calculateTokens() {
    const text = tokenInput.value;
    if (!text.trim()) {
      if (mTokens) mTokens.textContent = "0";
      if (mWords) mWords.textContent = "0";
      if (mEst) mEst.textContent = "0";
      if (mDiff) mDiff.textContent = "0%";
      if (calcStatus) calcStatus.textContent = "Sẵn sàng";
      return;
    }

    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
      });

      if (!res.ok) throw new Error("Lỗi API đếm token");
      const data = await res.json();

      if (mTokens) mTokens.textContent = data.tokens;
      if (mWords) mWords.textContent = data.words;
      if (mEst) mEst.textContent = data.estimated_by_words;
      if (mDiff) mDiff.textContent = `${data.diff_percent}%`;

      // Cost table
      if (g4oIn) g4oIn.textContent = `$${data.input_cost.toFixed(5)}`;
      if (g4oOut) g4oOut.textContent = `$${data.output_cost.toFixed(5)}`;

      // Mini price: input 0.00015, output 0.0006 per 1k
      const miniInCost = (data.tokens / 1000) * 0.00015;
      const miniOutCost = (data.tokens / 1000) * 0.0006;
      if (miniIn) miniIn.textContent = `$${miniInCost.toFixed(5)}`;
      if (miniOut) miniOut.textContent = `$${miniOutCost.toFixed(5)}`;

      if (calcStatus) calcStatus.textContent = "Đã cập nhật theo tiktoken";
    } catch (err) {
      if (calcStatus) calcStatus.textContent = `Lỗi: ${err.message}`;
    }
  }

  // Initial demo calculate
  if (tokenInput && !tokenInput.value) {
    tokenInput.value = sampleVi;
    calculateTokens();
  }
}

/* ==========================================================================
   TAB 4: Retry With Backoff Simulator
   ========================================================================== */
function initRetry() {
  const btnTrigger = document.getElementById("btn-trigger-retry");
  const failSelect = document.getElementById("fail-times-select");
  const retryLog = document.getElementById("retry-log");
  const steps = [
    document.getElementById("step-1"),
    document.getElementById("step-2"),
    document.getElementById("step-3"),
    document.getElementById("step-4"),
  ];

  if (btnTrigger) {
    btnTrigger.addEventListener("click", async () => {
      btnTrigger.disabled = true;
      btnTrigger.textContent = "⏳ Đang chạy giả lập retry...";
      
      // Reset visual steps
      steps.forEach((s) => {
        if (s) {
          s.classList.remove("active", "success", "failed");
        }
      });
      retryLog.textContent = "Bắt đầu gọi hàm retry_with_backoff(flaky_action, max_retries=3, base_delay=0.15s)...\n\n";

      const failTimes = parseInt(failSelect.value, 10);

      try {
        const res = await fetch("/api/retry-demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fail_times: failTimes })
        });

        const data = await res.json();
        const logs = data.logs || [];

        // Animate logs step by step
        for (let i = 0; i < logs.length; i++) {
          const item = logs[i];
          const stepEl = steps[item.attempt - 1];

          if (stepEl) stepEl.classList.add("active");
          await sleep(250);

          if (item.status === "fail") {
            if (stepEl) {
              stepEl.classList.remove("active");
              stepEl.classList.add("failed");
            }
            const delay = (0.15 * Math.pow(2, item.attempt - 1)).toFixed(2);
            retryLog.textContent += `[❌ Thất bại] ${item.msg}\n   └─ Áp dụng Exponential Backoff: Chờ delay = 0.15s * 2^${item.attempt - 1} = ${delay}s trước lần kế tiếp...\n\n`;
            await sleep(400);
          } else {
            if (stepEl) {
              stepEl.classList.remove("active");
              stepEl.classList.add("success");
            }
            retryLog.textContent += `[✅ Thành công] ${item.msg}\n   └─ Thao tác hoàn tất sau ${item.attempt} lần thử!\n`;
          }
        }

        if (!data.success) {
          retryLog.textContent += `\n[⛔ KẾT QUẢ] Đã hết số lần retry tối đa (max_retries=3) -> Ném exception ra ngoài.\n`;
        }
      } catch (err) {
        retryLog.textContent += `\n[Lỗi kết nối]: ${err.message}\n`;
      } finally {
        btnTrigger.disabled = false;
        btnTrigger.textContent = "🚀 Bắt Đầu Giả Lập Retry";
      }
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
