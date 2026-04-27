const BANK = {
  TAHRIR: "tahrir",
  SHAM: "sham",
};

const BANK_JSON = {
  tahrir: "quiz-app/questions-tahrir-sinai.json",
  sham: "quiz-app/questions-sham-el-nesim.json",
};

/** @type {string | null} */
let quizBank = null;

function getSections() {
  if (quizBank === BANK.SHAM) {
    return window.QUIZ_SECTIONS_SHAM || [];
  }
  return window.QUIZ_SECTIONS || [];
}

const STORAGE = {
  theme: "quiz_theme",
  mode: "quiz_mode",
  section: "quiz_section",
  type: "quiz_type",
  index: "quiz_index",
  bank: "quiz_bank",
  scoresTahrir: "quiz_scores_tahrir",
  scoresSham: "quiz_scores_sham",
  scoresLegacy: "quiz_scores_v1",
};

const els = {
  bankPicker: document.getElementById("bankPicker"),
  appMain: document.getElementById("appMain"),
  btnPickSham: document.getElementById("btnPickSham"),
  btnPickTahrir: document.getElementById("btnPickTahrir"),
  btnChangeBank: document.getElementById("btnChangeBank"),
  topbarSubtitle: document.getElementById("topbarSubtitle"),
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
  examModal: document.getElementById("examModal"),
  examModalBackdrop: document.getElementById("examModalBackdrop"),
  btnOpenExam: document.getElementById("btnOpenExam"),
  btnExamCancel: document.getElementById("btnExamCancel"),
  btnExamStart: document.getElementById("btnExamStart"),
  examCountInput: document.getElementById("examCountInput"),
  examTypeSelect: document.getElementById("examTypeSelect"),
  examPoolHint: document.getElementById("examPoolHint"),
  examBanner: document.getElementById("examBanner"),
  examBannerText: document.getElementById("examBannerText"),
  btnExitExam: document.getElementById("btnExitExam"),
  examSectionList: document.getElementById("examSectionList"),
  btnExamSecAll: document.getElementById("btnExamSecAll"),
  btnExamSecClear: document.getElementById("btnExamSecClear"),
};

let allQuestions = [];
let activeList = [];
let currentIndex = 0;
let mode = "all";
let sectionKey = "";
let typeFilter = "";
let revealVisible = false;
let examSessionActive = false;
/** وصف آخر فلتر نوع استُخدم في الاختبار (للشريط) */
let examSessionTypeLabel = "";
/** ملخص الأقسام المختارة في الاختبار */
let examSessionSectionLabel = "";
/** @type {Record<number, string[]>} */
const orderShuffleState = {};

/** @type {Record<string, "ok" | "bad">} — مفتاح = id السؤال */
let scoreById = {};

function getScoresStorageKey() {
  if (quizBank === BANK.SHAM) return STORAGE.scoresSham;
  return STORAGE.scoresTahrir;
}

function migrateLegacyScores() {
  try {
    const legacy = localStorage.getItem(STORAGE.scoresLegacy);
    if (legacy && !localStorage.getItem(STORAGE.scoresTahrir)) {
      localStorage.setItem(STORAGE.scoresTahrir, legacy);
    }
  } catch {
    /* ignore */
  }
}

function loadScores() {
  if (!quizBank) {
    scoreById = {};
    return;
  }
  try {
    const raw = localStorage.getItem(getScoresStorageKey());
    const o = raw ? JSON.parse(raw) : {};
    scoreById = typeof o === "object" && o !== null ? o : {};
  } catch {
    scoreById = {};
  }
}

function persistScores() {
  if (!quizBank) return;
  try {
    localStorage.setItem(getScoresStorageKey(), JSON.stringify(scoreById));
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
  const sections = getSections();
  const m = localStorage.getItem(STORAGE.mode);
  if (m === "section" || m === "all") mode = m;
  const s = localStorage.getItem(STORAGE.section);
  if (s && sections.some((x) => x.key === s)) sectionKey = s;
  else sectionKey = sections[0]?.key ?? "";
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

/** @param {{ startId: number, endId: number, ranges?: [number, number][] }} s */
function getSectionIdRanges(s) {
  if (Array.isArray(s.ranges) && s.ranges.length) return s.ranges;
  return [[s.startId, s.endId]];
}

/** @param {{ startId: number, endId: number, ranges?: [number, number][] }} s */
function formatSectionRangeLabel(s, maxId) {
  const ranges = getSectionIdRanges(s);
  return ranges
    .map(([a, b]) => {
      const hugeEnd = b >= Number.MAX_SAFE_INTEGER - 1000;
      const endDisp = hugeEnd ? (maxId > 0 ? maxId : "…") : b;
      return a === endDisp ? `${a}` : `${a}–${endDisp}`;
    })
    .join("، ");
}

function populateSectionSelect() {
  const sections = getSections();
  els.sectionSelect.innerHTML = "";
  let maxId = 0;
  if (allQuestions.length) {
    maxId = Math.max(...allQuestions.map((q) => q.id));
  }
  for (const s of sections) {
    const opt = document.createElement("option");
    opt.value = s.key;
    opt.textContent = `${s.titleAr} (${formatSectionRangeLabel(s, maxId)})`;
    els.sectionSelect.appendChild(opt);
  }
  if (!sections.some((x) => x.key === sectionKey)) {
    sectionKey = sections[0]?.key ?? "";
  }
  if (sections.some((x) => x.key === sectionKey)) {
    els.sectionSelect.value = sectionKey;
  }
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
  populateSectionSelect();
  els.loadStatus.textContent = `تم تحميل ${data.length} سؤالاً`;
  els.loadStatus.classList.remove("muted");
  if (els.btnOpenExam) els.btnOpenExam.disabled = data.length === 0;
}

async function tryFetchQuestionsForBank() {
  if (!quizBank) return;
  const path = BANK_JSON[quizBank];
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    ingestQuestions(data);
    rebuildActiveList(false);
  } catch {
    els.loadStatus.textContent = `لم يُحمّل ${path}. شغّل خادماً من جذر المشروع (مثلاً npx serve).`;
    els.loadStatus.classList.add("muted");
    if (els.btnOpenExam) els.btnOpenExam.disabled = true;
    render();
  }
}

function getCurrentSectionRanges() {
  const s = getSections().find((x) => x.key === sectionKey);
  return s ? getSectionIdRanges(s) : null;
}

function showBankPicker() {
  if (els.bankPicker) els.bankPicker.classList.remove("hidden");
  if (els.appMain) els.appMain.classList.add("hidden");
}

function hideBankPicker() {
  if (els.bankPicker) els.bankPicker.classList.add("hidden");
  if (els.appMain) els.appMain.classList.remove("hidden");
}

function updateHeroSubtitle() {
  if (!els.topbarSubtitle) return;
  if (quizBank === BANK.SHAM) {
    els.topbarSubtitle.textContent = "شم النسيم — بنك أسئلة عربي";
  } else if (quizBank === BANK.TAHRIR) {
    els.topbarSubtitle.textContent = "تحرير سيناء — نموذج إنجليزي (شهادة أساسيات التحول الرقمي)";
  } else {
    els.topbarSubtitle.textContent = "شهادة أساسيات التحول الرقمي";
  }
}

function clearOrderShuffleState() {
  for (const k of Object.keys(orderShuffleState)) {
    delete orderShuffleState[k];
  }
}

function startBank(bank) {
  quizBank = bank;
  localStorage.setItem(STORAGE.bank, bank);
  clearOrderShuffleState();
  hideBankPicker();
  migrateLegacyScores();
  loadScores();
  loadPersistedFilters();
  populateSectionSelect();
  if (getSections().some((x) => x.key === sectionKey)) {
    els.sectionSelect.value = sectionKey;
  }
  updateHeroSubtitle();
  els.loadStatus.textContent = "جاري تحميل الأسئلة…";
  tryFetchQuestionsForBank();
}

function buildFilteredList(typeVal) {
  let list = [...allQuestions].sort((a, b) => a.id - b.id);
  if (mode === "section") {
    const ranges = getCurrentSectionRanges();
    if (ranges) list = list.filter((q) => ranges.some(([a, b]) => q.id >= a && q.id <= b));
  }
  if (typeVal) list = list.filter((q) => q.type === typeVal);
  return list;
}

/** @param {string[]} sectionKeys */
function buildExamPool(typeVal, sectionKeys) {
  let list = [...allQuestions].sort((a, b) => a.id - b.id);
  let keys = sectionKeys.filter(Boolean);
  if (!keys.length) keys = ["all"];
  const sections = getSections();
  if (!keys.includes("all")) {
    const ranges = [];
    for (const key of keys) {
      const s = sections.find((x) => x.key === key);
      if (s) ranges.push(...getSectionIdRanges(s));
    }
    if (ranges.length) {
      list = list.filter((q) => ranges.some(([a, b]) => q.id >= a && q.id <= b));
    } else {
      list = [];
    }
  }
  if (typeVal) list = list.filter((q) => q.type === typeVal);
  return list;
}

function getExamSelectedSectionKeys() {
  if (!els.examSectionList) return [];
  return [...els.examSectionList.querySelectorAll("input[type=checkbox]:checked")].map((cb) => cb.value);
}

/** @param {string[]} keys */
function formatExamSectionSummary(keys) {
  if (!keys.length || keys.includes("all")) return "كل الملف";
  if (keys.length === 1) {
    const s = getSections().find((x) => x.key === keys[0]);
    return s ? s.titleAr : keys[0];
  }
  return `${keys.length} أقسام`;
}

function populateExamSectionList() {
  const container = els.examSectionList;
  if (!container) return;
  container.innerHTML = "";
  const sections = getSections();
  const mkRow = (key, title, checked) => {
    const lab = document.createElement("label");
    lab.className = "exam-section-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = key;
    cb.checked = checked;
    const span = document.createElement("span");
    span.textContent = title;
    lab.appendChild(cb);
    lab.appendChild(span);
    container.appendChild(lab);
  };
  if (!sections.some((s) => s.key === "all")) {
    mkRow("all", "كل الملف (جميع الأقسام)", true);
  }
  for (const s of sections) {
    mkRow(s.key, s.titleAr, s.key === "all");
  }
}

function examSectionsSelectAll() {
  els.examSectionList?.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.checked = true;
  });
  updateExamModalPoolHint();
}

function examSectionsResetToAll() {
  const cbs = [...(els.examSectionList?.querySelectorAll("input[type=checkbox]") || [])];
  cbs.forEach((cb) => {
    cb.checked = false;
  });
  const allCb = cbs.find((c) => c.value === "all");
  if (allCb) allCb.checked = true;
  else if (cbs[0]) cbs[0].checked = true;
  updateExamModalPoolHint();
}

function updateExamBanner() {
  if (!els.examBanner || !els.examBannerText) return;
  if (examSessionActive && activeList.length) {
    els.examBanner.classList.remove("hidden");
    els.examBannerText.textContent = `اختبار عشوائي · ${examSessionSectionLabel} · ${examSessionTypeLabel} · ${activeList.length} سؤالاً`;
  } else {
    els.examBanner.classList.add("hidden");
    els.examBannerText.textContent = "";
  }
}

function populateExamTypeSelect() {
  if (!els.examTypeSelect) return;
  const types = collectTypes(allQuestions);
  const cur = els.examTypeSelect.value;
  els.examTypeSelect.innerHTML = '<option value="">كل الأنواع</option>';
  for (const t of types) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    els.examTypeSelect.appendChild(opt);
  }
  if (types.includes(cur)) els.examTypeSelect.value = cur;
}

function updateExamModalPoolHint() {
  if (!els.examPoolHint || !els.examCountInput || !els.examTypeSelect) return;
  let secKeys = getExamSelectedSectionKeys();
  if (!secKeys.length) secKeys = ["all"];
  const pool = buildExamPool(els.examTypeSelect.value, secKeys);
  const n = pool.length;
  if (n === 0) {
    els.examPoolHint.textContent =
      "لا توجد أسئلة مطابقة لهذا الجمع (أقسام + نوع). غيّر التحديد أو النوع.";
    els.examCountInput.max = "1";
    els.examCountInput.value = "1";
    return;
  }
  const secSummary = formatExamSectionSummary(secKeys);
  els.examPoolHint.textContent = `النطاق: ${secSummary} — متاح ${n} سؤالاً للاختيار العشوائي.`;
  els.examCountInput.max = String(n);
  const want = parseInt(els.examCountInput.value, 10);
  const def = Number.isNaN(want) || want < 1 ? Math.min(10, n) : want;
  els.examCountInput.value = String(Math.min(def, n));
}

function openExamModal() {
  if (!els.examModal || !allQuestions.length) return;
  populateExamSectionList();
  populateExamTypeSelect();
  updateExamModalPoolHint();
  els.examModal.classList.remove("hidden");
  els.examCountInput?.focus();
}

function closeExamModal() {
  els.examModal?.classList.add("hidden");
}

function startRandomExam() {
  if (!els.examTypeSelect || !els.examCountInput) return;
  const typeVal = els.examTypeSelect.value;
  let secKeys = getExamSelectedSectionKeys();
  if (!secKeys.length) secKeys = ["all"];
  const pool = buildExamPool(typeVal, secKeys);
  if (!pool.length) {
    alert("لا توجد أسئلة مطابقة. غيّر الأقسام أو نوع السؤال.");
    return;
  }
  let n = parseInt(els.examCountInput.value, 10);
  if (Number.isNaN(n) || n < 1) n = 1;
  n = Math.min(n, pool.length);
  examSessionTypeLabel = typeVal || "كل الأنواع";
  examSessionSectionLabel = formatExamSectionSummary(secKeys);
  clearOrderShuffleState();
  activeList = shuffle(pool).slice(0, n);
  examSessionActive = true;
  currentIndex = 0;
  closeExamModal();
  saveState();
  updateExamBanner();
  render();
}

function exitExamSession() {
  examSessionTypeLabel = "";
  examSessionSectionLabel = "";
  currentIndex = 0;
  rebuildActiveList(true);
}

function rebuildActiveList(resetIndex) {
  examSessionActive = false;
  examSessionTypeLabel = "";
  examSessionSectionLabel = "";
  updateExamBanner();
  activeList = buildFilteredList(typeFilter);
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
        ? quizBank
          ? `تأكد أن ملف البنك موجود (${BANK_JSON[quizBank] || ""}) وشغّل خادماً من جذر المشروع.`
          : "اختر بنك الأسئلة من الشاشة الأولى."
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
      if (confirm("مسح كل النتائج والدرجة المحفوظة لهذا البنك على هذا المتصفح؟")) {
        clearAllScores();
      }
    });
  }

  if (els.btnPickSham) {
    els.btnPickSham.addEventListener("click", () => startBank(BANK.SHAM));
  }
  if (els.btnPickTahrir) {
    els.btnPickTahrir.addEventListener("click", () => startBank(BANK.TAHRIR));
  }
  if (els.btnOpenExam) {
    els.btnOpenExam.addEventListener("click", () => openExamModal());
  }
  if (els.btnExamCancel) {
    els.btnExamCancel.addEventListener("click", () => closeExamModal());
  }
  if (els.examModalBackdrop) {
    els.examModalBackdrop.addEventListener("click", () => closeExamModal());
  }
  if (els.btnExamStart) {
    els.btnExamStart.addEventListener("click", () => startRandomExam());
  }
  if (els.examTypeSelect) {
    els.examTypeSelect.addEventListener("change", () => updateExamModalPoolHint());
  }
  if (els.examSectionList) {
    els.examSectionList.addEventListener("change", () => updateExamModalPoolHint());
  }
  if (els.btnExamSecAll) {
    els.btnExamSecAll.addEventListener("click", () => examSectionsSelectAll());
  }
  if (els.btnExamSecClear) {
    els.btnExamSecClear.addEventListener("click", () => examSectionsResetToAll());
  }
  if (els.btnExitExam) {
    els.btnExitExam.addEventListener("click", () => exitExamSession());
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.examModal && !els.examModal.classList.contains("hidden")) {
      closeExamModal();
    }
  });

  if (els.btnChangeBank) {
    els.btnChangeBank.addEventListener("click", () => {
      if (confirm("تغيير البنك يعيد تحميل الأسئلة. المتابعة؟")) {
        localStorage.removeItem(STORAGE.bank);
        quizBank = null;
        allQuestions = [];
        activeList = [];
        currentIndex = 0;
        examSessionActive = false;
        examSessionTypeLabel = "";
        examSessionSectionLabel = "";
        updateExamBanner();
        clearOrderShuffleState();
        scoreById = {};
        showBankPicker();
        els.qText.textContent = "اختر بنك الأسئلة للبدء.";
        els.loadStatus.textContent = "اختر البنك لتحميل الأسئلة…";
        render();
      }
    });
  }
}

function init() {
  loadTheme();
  wireEvents();
  const saved = localStorage.getItem(STORAGE.bank);
  if (saved === BANK.TAHRIR || saved === BANK.SHAM) {
    quizBank = saved;
    migrateLegacyScores();
    hideBankPicker();
    loadScores();
    loadPersistedFilters();
    populateSectionSelect();
    if (getSections().some((x) => x.key === sectionKey)) {
      els.sectionSelect.value = sectionKey;
    }
    updateHeroSubtitle();
    tryFetchQuestionsForBank();
  } else {
    showBankPicker();
  }
}

init();
