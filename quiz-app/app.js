/** @type {typeof window.QUIZ_SECTIONS} */
const SECTIONS = window.QUIZ_SECTIONS || [];

const STORAGE = {
  theme: "quiz_theme",
  mode: "quiz_mode",
  section: "quiz_section",
  type: "quiz_type",
  index: "quiz_index",
  scores: "quiz_scores_v1",
};

const els = {
  loadStatus: document.getElementById("loadStatus"),
  statActive: document.getElementById("statActive"),
  sectionPanel: document.getElementById("sectionPanel"),
  sectionSelect: document.getElementById("sectionSelect"),
  typeFilter: document.getElementById("typeFilter"),
  progressBar: document.getElementById("progressBar"),
  progressText: document.getElementById("progressText"),
  qType: document.getElementById("qType"),
  qId: document.getElementById("qId"),
  qText: document.getElementById("qText"),
  qInteractive: document.getElementById("qInteractive"),
  revealBox: document.getElementById("revealBox"),
  revealAnswer: document.getElementById("revealAnswer"),
  btnPrev: document.getElementById("btnPrev"),
  btnNext: document.getElementById("btnNext"),
  btnReveal: document.getElementById("btnReveal"),
  btnTheme: document.getElementById("btnTheme"),
  gradePercent: document.getElementById("gradePercent"),
  gradeDetail: document.getElementById("gradeDetail"),
  gradeAttempt: document.getElementById("gradeAttempt"),
  btnResetScore: document.getElementById("btnResetScore"),
  qScoreBadge: document.getElementById("qScoreBadge"),
};

let allQuestions = [];
let activeList = [];
let currentIndex = 0;
let mode = "all";
let sectionKey = SECTIONS[0]?.key ?? "";
let typeFilter = "";
let revealVisible = false;
/** @type {Record<number, string[]>} */
const orderShuffleState = {};

/** @type {Record<string, "ok" | "bad">} — مفتاح = id السؤال */
let scoreById = {};

function loadScores() {
  try {
    const raw = localStorage.getItem(STORAGE.scores);
    const o = raw ? JSON.parse(raw) : {};
    scoreById = typeof o === "object" && o !== null ? o : {};
  } catch {
    scoreById = {};
  }
}

function persistScores() {
  try {
    localStorage.setItem(STORAGE.scores, JSON.stringify(scoreById));
  } catch {
    /* ignore quota */
  }
}

/** @param {boolean} isCorrect */
function recordAnswer(questionId, isCorrect) {
  scoreById[String(questionId)] = isCorrect ? "ok" : "bad";
  persistScores();
  updateGradeUI();
  syncQuestionScoreBadge(questionId);
}

function getScoreStatus(questionId) {
  return scoreById[String(questionId)];
}

function countScoresInActiveList() {
  let ok = 0;
  let bad = 0;
  for (const q of activeList) {
    const s = getScoreStatus(q.id);
    if (s === "ok") ok++;
    else if (s === "bad") bad++;
  }
  return { ok, bad, total: activeList.length };
}

function updateGradeUI() {
  const pctEl = els.gradePercent;
  const detEl = els.gradeDetail;
  const attEl = els.gradeAttempt;
  if (!pctEl || !detEl) return;

  const n = activeList.length;
  if (!n || !allQuestions.length) {
    pctEl.textContent = "—";
    detEl.textContent = "تظهر الدرجة بعد تحميل الأسئلة واختيار قائمة.";
    if (attEl) attEl.textContent = "";
    return;
  }

  const { ok, bad, total } = countScoresInActiveList();
  const pending = total - ok - bad;
  const attempted = ok + bad;
  const pctOfList = Math.round((ok / total) * 100);
  const pctOfAttempts = attempted > 0 ? Math.round((ok / attempted) * 100) : null;

  pctEl.textContent = `${pctOfList}%`;
  detEl.innerHTML = `في القائمة الحالية: <strong>${ok}</strong> صحيح · <strong>${bad}</strong> خطأ · <strong>${pending}</strong> لم يُحلّ بعد (من ${total}).`;
  if (attEl) {
    attEl.textContent =
      attempted > 0
        ? `دقة إجاباتك فيما جرّبتَ حله: ${pctOfAttempts}% (${ok} من ${attempted}).`
        : "جرّب الإجابة ثم التحقق ليُسجَّل السؤال.";
  }
}

function syncQuestionScoreBadge(questionId) {
  if (!els.qScoreBadge) return;
  const q = activeList[currentIndex];
  if (!q || q.id !== questionId) return;
  applyScoreBadgeToCurrentQuestion();
}

function applyScoreBadgeToCurrentQuestion() {
  const badge = els.qScoreBadge;
  if (!badge) return;
  const q = activeList[currentIndex];
  if (!q) {
    badge.classList.add("hidden");
    return;
  }
  const s = getScoreStatus(q.id);
  badge.classList.remove("hidden", "is-ok", "is-bad");
  if (s === "ok") {
    badge.textContent = "مسجّل: صحيح";
    badge.classList.add("is-ok");
    badge.setAttribute("aria-hidden", "false");
  } else if (s === "bad") {
    badge.textContent = "مسجّل: خطأ";
    badge.classList.add("is-bad");
    badge.setAttribute("aria-hidden", "false");
  } else {
    badge.classList.add("hidden");
    badge.textContent = "";
    badge.setAttribute("aria-hidden", "true");
  }
}

function clearAllScores() {
  scoreById = {};
  persistScores();
  updateGradeUI();
  applyScoreBadgeToCurrentQuestion();
}

function loadTheme() {
  const t = localStorage.getItem(STORAGE.theme);
  if (t === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    els.btnTheme.textContent = "وضع فاتح";
  } else {
    document.documentElement.removeAttribute("data-theme");
    els.btnTheme.textContent = "وضع داكن";
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(STORAGE.theme, "light");
    els.btnTheme.textContent = "وضع داكن";
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem(STORAGE.theme, "dark");
    els.btnTheme.textContent = "وضع فاتح";
  }
}

function loadPersistedFilters() {
  const m = localStorage.getItem(STORAGE.mode);
  if (m === "section" || m === "all") mode = m;
  const s = localStorage.getItem(STORAGE.section);
  if (s && SECTIONS.some((x) => x.key === s)) sectionKey = s;
  const ty = localStorage.getItem(STORAGE.type);
  if (ty !== null) typeFilter = ty;
  const idx = parseInt(localStorage.getItem(STORAGE.index) || "0", 10);
  if (!Number.isNaN(idx)) currentIndex = idx;
}

function saveState() {
  localStorage.setItem(STORAGE.mode, mode);
  localStorage.setItem(STORAGE.section, sectionKey);
  localStorage.setItem(STORAGE.type, typeFilter);
  localStorage.setItem(STORAGE.index, String(currentIndex));
}

function populateSectionSelect() {
  els.sectionSelect.innerHTML = "";
  for (const s of SECTIONS) {
    const opt = document.createElement("option");
    opt.value = s.key;
    opt.textContent = `${s.titleAr} (${s.startId}–${s.endId})`;
    els.sectionSelect.appendChild(opt);
  }
  els.sectionSelect.value = sectionKey;
}

function collectTypes(data) {
  const set = new Set();
  for (const q of data) {
    if (q.type) set.add(q.type);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ar"));
}

function populateTypeFilter(types) {
  const cur = typeFilter;
  els.typeFilter.innerHTML = '<option value="">كل الأنواع</option>';
  for (const t of types) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    els.typeFilter.appendChild(opt);
  }
  if (types.includes(cur)) els.typeFilter.value = cur;
  else typeFilter = "";
}

function validateQuestions(data) {
  if (!Array.isArray(data)) throw new Error("الملف ليس مصفوفة JSON");
  for (const q of data) {
    if (typeof q.id !== "number" || typeof q.question !== "string") {
      throw new Error("بنية سؤال غير صالحة (يتوقع id رقم و question نص)");
    }
  }
}

function ingestQuestions(data) {
  validateQuestions(data);
  allQuestions = data;
  populateTypeFilter(collectTypes(data));
  els.loadStatus.textContent = `تم تحميل ${data.length} سؤالاً`;
  els.loadStatus.classList.remove("muted");
}

async function tryFetchQuestions() {
  try {
    const res = await fetch("questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    ingestQuestions(data);
    rebuildActiveList(false);
  } catch {
    els.loadStatus.textContent =
      "لم يُحمّل questions.json. شغّل خادماً محلياً من مجلد التطبيق (مثلاً npx serve).";
    els.loadStatus.classList.add("muted");
    render();
  }
}

function getSectionRange() {
  const s = SECTIONS.find((x) => x.key === sectionKey);
  return s ? { start: s.startId, end: s.endId } : null;
}

function rebuildActiveList(resetIndex) {
  let list = [...allQuestions].sort((a, b) => a.id - b.id);
  if (mode === "section") {
    const r = getSectionRange();
    if (r) list = list.filter((q) => q.id >= r.start && q.id <= r.end);
  }
  if (typeFilter) list = list.filter((q) => q.type === typeFilter);
  activeList = list;
  if (resetIndex) currentIndex = 0;
  else if (currentIndex >= activeList.length) {
    currentIndex = Math.max(0, activeList.length - 1);
  }
  saveState();
  render();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseOrderSteps(answer) {
  if (!answer || typeof answer !== "string") return [];
  const parts = answer
    .split(/(?=\d+\.\s)/g)
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts;
  const alt = answer.split(/,\s*\d+\.\s*/).map((s) => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
  return alt.length >= 2 ? alt : parts;
}

function normalizeTf(s) {
  const t = (s || "").trim().toLowerCase();
  if (/^صح|^true|^yes/i.test(t) || t.includes("صح")) return "صح";
  if (/^خطأ|^false|^no/i.test(t) || t.includes("خطأ")) return "خطأ";
  return t;
}

function updateModeUI() {
  document.querySelectorAll(".segmented__btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.mode === mode);
  });
  els.sectionPanel.classList.toggle("hidden", mode !== "section");
}

function setProgress() {
  const n = activeList.length;
  const i = n ? currentIndex + 1 : 0;
  els.progressText.textContent = `${i} / ${n}`;
  const pct = n ? ((currentIndex + 1) / n) * 100 : 0;
  els.progressBar.style.setProperty("--p", `${pct}%`);
  els.progressBar.setAttribute("aria-valuenow", String(Math.round(pct)));
  els.progressBar.setAttribute("aria-valuemax", "100");
  els.statActive.textContent = String(n);
}

function render() {
  updateModeUI();
  setProgress();
  revealVisible = false;
  els.revealBox.classList.add("hidden");

  if (!activeList.length) {
    els.qType.textContent = "—";
    els.qId.textContent = "#";
    els.qText.textContent =
      allQuestions.length === 0
        ? "تأكد أن questions.json بجانب الصفحة وشغّل خادماً محلياً من مجلد التطبيق."
        : "لا توجد أسئلة تطابق الفلتر الحالي. غيّر القسم أو نوع السؤال.";
    els.qInteractive.innerHTML = "";
    els.btnPrev.disabled = true;
    els.btnNext.disabled = true;
    els.btnReveal.disabled = true;
    if (els.qScoreBadge) {
      els.qScoreBadge.classList.add("hidden");
      els.qScoreBadge.textContent = "";
    }
    updateGradeUI();
    return;
  }

  const q = activeList[currentIndex];
  els.qType.textContent = q.type || "—";
  els.qId.textContent = `#${q.id}`;
  els.qText.textContent = q.question;
  els.btnPrev.disabled = currentIndex <= 0;
  els.btnNext.disabled = currentIndex >= activeList.length - 1;
  els.btnReveal.disabled = false;

  els.qInteractive.innerHTML = "";
  const type = (q.type || "").trim();

  if (type === "صح وخطأ") {
    renderTrueFalse(q);
  } else if (type === "ترتيب") {
    renderOrdering(q);
  } else if (Array.isArray(q.options) && q.options.length > 1) {
    renderMcq(q);
  } else {
    renderOpen(q);
  }

  applyScoreBadgeToCurrentQuestion();
  updateGradeUI();
}

function renderTrueFalse(q) {
  const wrap = document.createElement("div");
  wrap.className = "tf-wrap";
  const fb = document.createElement("div");
  fb.className = "feedback hidden";
  fb.id = "tfFeedback";

  const mkBtn = (label, val) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = label;
    b.addEventListener("click", () => {
      wrap.querySelectorAll("button").forEach((x) => x.classList.remove("is-selected"));
      b.classList.add("is-selected");
      const ok = normalizeTf(val) === normalizeTf(q.answer);
      fb.classList.remove("hidden");
      fb.classList.toggle("feedback--ok", ok);
      fb.classList.toggle("feedback--bad", !ok);
      fb.textContent = ok ? "إجابة صحيحة" : "غير مطابقة — اضغط «كشف الإجابة» للمراجعة";
      recordAnswer(q.id, ok);
    });
    return b;
  };

  wrap.appendChild(mkBtn("صح", "صح"));
  wrap.appendChild(mkBtn("خطأ", "خطأ"));
  wrap.style.display = "flex";
  wrap.style.gap = "0.75rem";
  wrap.style.flexWrap = "wrap";
  els.qInteractive.appendChild(wrap);
  els.qInteractive.appendChild(fb);
}

function renderMcq(q) {
  const form = document.createElement("div");
  form.className = "options-list";
  const fb = document.createElement("div");
  fb.className = "feedback hidden";
  fb.id = "mcqFeedback";

  for (const opt of q.options) {
    const row = document.createElement("label");
    row.className = "option-row";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "mcq";
    radio.value = opt;
    const span = document.createElement("span");
    span.textContent = opt;
    row.appendChild(radio);
    row.appendChild(span);
    radio.addEventListener("change", () => {
      const model = (q.answer || "").trim();
      const picked = radio.value.trim();
      const ok =
        picked === model ||
        model.includes(picked) ||
        picked.includes(model) ||
        normalizeTf(picked) === normalizeTf(model);
      fb.classList.remove("hidden");
      fb.classList.toggle("feedback--ok", ok);
      fb.classList.toggle("feedback--bad", !ok);
      fb.textContent = ok ? "تطابق جيد" : "راجع الإجابة النموذجية";
      recordAnswer(q.id, ok);
    });
    form.appendChild(row);
  }
  els.qInteractive.appendChild(form);
  els.qInteractive.appendChild(fb);
}

function renderOpen(q) {
  const ta = document.createElement("textarea");
  ta.className = "text-input";
  ta.placeholder = "اكتب إجابتك هنا (للمقارنة الذاتية)";
  ta.rows = 4;
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "0.75rem";
  row.style.flexWrap = "wrap";
  row.style.marginTop = "0.5rem";
  const check = document.createElement("button");
  check.type = "button";
  check.className = "btn btn--secondary";
  check.textContent = "مقارنة سريعة";
  const fb = document.createElement("div");
  fb.className = "feedback hidden";
  check.addEventListener("click", () => {
    const u = ta.value.trim();
    const m = (q.answer || "").trim();
    if (!u) {
      fb.classList.remove("hidden", "feedback--ok");
      fb.classList.add("feedback--bad");
      fb.textContent = "اكتب إجابة أولاً";
      return;
    }
    const ok =
      u.toLowerCase() === m.toLowerCase() ||
      m.toLowerCase().includes(u.toLowerCase()) ||
      u.toLowerCase().includes(m.toLowerCase());
    fb.classList.remove("hidden");
    fb.classList.toggle("feedback--ok", ok);
    fb.classList.toggle("feedback--bad", !ok);
    fb.textContent = ok ? "يبدو أنها قريبة من النموذج" : "راجع الصياغة الكاملة في «كشف الإجابة»";
    recordAnswer(q.id, ok);
  });
  row.appendChild(check);
  els.qInteractive.appendChild(ta);
  els.qInteractive.appendChild(row);
  els.qInteractive.appendChild(fb);
}

function renderOrdering(q) {
  const correct = parseOrderSteps(q.answer);
  if (correct.length < 2) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "تعذر تحليل خطوات الترتيب آلياً. استخدم «كشف الإجابة».";
    els.qInteractive.appendChild(p);
    return;
  }

  if (!orderShuffleState[q.id]) {
    let shuffled = shuffle(correct);
    let guard = 0;
    while (shuffled.join("||") === correct.join("||") && guard++ < 8) {
      shuffled = shuffle(correct);
    }
    orderShuffleState[q.id] = shuffled;
  }

  const list = orderShuffleState[q.id];
  const ul = document.createElement("ul");
  ul.className = "order-list";

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    render();
  };

  list.forEach((text, i) => {
    const li = document.createElement("li");
    li.className = "order-item";
    const span = document.createElement("span");
    span.className = "order-item__text";
    span.textContent = text;
    const btns = document.createElement("div");
    btns.className = "order-item__btns";
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "↑";
    up.addEventListener("click", () => move(i, -1));
    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "↓";
    down.addEventListener("click", () => move(i, 1));
    btns.appendChild(up);
    btns.appendChild(down);
    li.appendChild(span);
    li.appendChild(btns);
    ul.appendChild(li);
  });

  const verify = document.createElement("button");
  verify.type = "button";
  verify.className = "btn btn--secondary";
  verify.style.marginTop = "0.75rem";
  verify.textContent = "تحقق من الترتيب";
  const fb = document.createElement("div");
  fb.className = "feedback hidden";
  verify.addEventListener("click", () => {
    const ok = list.every((t, i) => t === correct[i]);
    fb.classList.remove("hidden");
    fb.classList.toggle("feedback--ok", ok);
    fb.classList.toggle("feedback--bad", !ok);
    fb.textContent = ok ? "ترتيب صحيح" : "الترتيب لا يزال غير صحيح";
    recordAnswer(q.id, ok);
  });

  els.qInteractive.appendChild(ul);
  els.qInteractive.appendChild(verify);
  els.qInteractive.appendChild(fb);
}

function showReveal() {
  const q = activeList[currentIndex];
  if (!q) return;
  revealVisible = true;
  els.revealAnswer.textContent = q.answer ?? "—";
  els.revealBox.classList.remove("hidden");
}

function wireEvents() {
  document.querySelectorAll(".segmented__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      currentIndex = 0;
      rebuildActiveList(false);
    });
  });

  els.sectionSelect.addEventListener("change", () => {
    sectionKey = els.sectionSelect.value;
    currentIndex = 0;
    rebuildActiveList(false);
    render();
  });

  els.typeFilter.addEventListener("change", () => {
    typeFilter = els.typeFilter.value;
    currentIndex = 0;
    rebuildActiveList(false);
    render();
  });

  els.btnPrev.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      saveState();
      render();
    }
  });

  els.btnNext.addEventListener("click", () => {
    if (currentIndex < activeList.length - 1) {
      currentIndex++;
      saveState();
      render();
    }
  });

  els.btnReveal.addEventListener("click", showReveal);

  els.btnTheme.addEventListener("click", toggleTheme);

  if (els.btnResetScore) {
    els.btnResetScore.addEventListener("click", () => {
      if (confirm("مسح كل النتائج والدرجة المحفوظة على هذا المتصفح؟")) {
        clearAllScores();
      }
    });
  }
}

function init() {
  loadTheme();
  loadScores();
  populateSectionSelect();
  loadPersistedFilters();
  if (mode === "section") els.sectionSelect.value = sectionKey;

  wireEvents();
  tryFetchQuestions();
}

init();
