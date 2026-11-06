// ==========================================================================
// 1. CONFIGURATION & SUPABASE INITIALIZATION
// ==========================================================================
const SUPABASE_URL = "https://hqrbqqdjbswbvfhhqefw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcmJxcWRqYnN3YnZmaGhxZWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjI5ODgsImV4cCI6MjEwNzAzODk4OH0.iTay17X_Ysep1r-NLPSWpAzlQF-fmBb0sw1v7ptsdpE";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================================================
// 2. UNIVERSAL ANSWER NORMALIZATION & REUSABLE OUTLINE ICONS
// ==========================================================================
function isOptionMatching(optId, answerKey) {
  if (optId === null || optId === undefined || answerKey === null || answerKey === undefined) return false;
  const o = String(optId).trim().toUpperCase();
  const a = String(answerKey).trim().toUpperCase();
  if (o === a) return true;
  if ((o === 'A' && a === '1') || (o === '1' && a === 'A')) return true;
  if ((o === 'B' && a === '2') || (o === '2' && a === 'B')) return true;
  if ((o === 'C' && a === '3') || (o === '3' && a === 'C')) return true;
  if ((o === 'D' && a === '4') || (o === '4' && a === 'D')) return true;
  return false;
}

function getNormalizedCorrectAnswerId(rawAnswer, optionsArray) {
  if (!optionsArray || !Array.isArray(optionsArray)) return String(rawAnswer || "");
  let ca = "";
  if (typeof rawAnswer === "object" && rawAnswer !== null) { 
    ca = String(rawAnswer.en || rawAnswer.text || rawAnswer.id || "").trim(); 
  } else {
    ca = String(rawAnswer || "").trim();
    if (ca.startsWith("{") && ca.endsWith("}")) { 
      try { 
        let p = JSON.parse(ca); 
        ca = String(p.en || p.text || p.id || "").trim(); 
      } catch(e) { 
        ca = ca.trim(); 
      } 
    }
  }
  let matched = optionsArray.find(o => {
    let oid = String(o.id || "").trim();
    let ot = String(o.en || o.text || "").trim();
    return isOptionMatching(oid, ca) || isOptionMatching(ot, ca) || o.isCorrect === true || o.is_correct === true;
  });
  return matched ? String(matched.id) : (ca || String(rawAnswer));
}

// 🚀 UNIVERSAL OPTIONS JSON PARSER (ZERO-CRASH FALLBACK)
function parseQuestionOptions(optionsRaw) {
  if (Array.isArray(optionsRaw)) return optionsRaw;
  if (!optionsRaw) return [];
  try {
    return typeof optionsRaw === 'string' ? JSON.parse(optionsRaw) : optionsRaw;
  } catch (e) {
    return [];
  }
}

// 🚀 CRASH-PROOF CENTRALIZED STORAGE ENGINE (WITH IN-MEMORY FALLBACK)
const appStorage = {
  _mem: new Map(),
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch (e) {
      return this._mem.has(key) ? this._mem.get(key) : fallback;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, String(val));
    } catch (e) {
      console.warn("Storage quota/access issue, fallback to memory:", key);
      this._mem.set(key, String(val));
    }
  },
  getJSON(key, fallback = null) {
    try {
      const raw = this.get(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  setJSON(key, obj) {
    try {
      this.set(key, JSON.stringify(obj));
    } catch (e) {
      console.warn("JSON stringify/storage error for:", key, e);
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      this._mem.delete(key);
    }
  }
};

// 🚀 CENTRALIZED TCS iON EXAM CONSOLE MOUNT ENGINE (ATOMIC & DRIFT-FREE)
function mountExamSession(testMeta, questionsList, sectionName = "General") {
  isExamFinished = false;
  switchView("viewExam", true);

  activeTest = {
    id: testMeta.id,
    title: testMeta.title || "Assessment",
    subject: testMeta.subject || activeSubject || "General Studies",
    total_duration_minutes: testMeta.total_duration_minutes || 15
  };

  // DOM Header & Title Telemetry
  const examTitleEl = document.getElementById("examTitle");
  if (examTitleEl) examTitleEl.innerText = activeTest.title;

  const breadcrumbEl = document.getElementById("subjectLabelBreadcrumb");
  if (breadcrumbEl) breadcrumbEl.innerText = activeTest.subject;

  const mobileTitleEl = document.getElementById("mobileExamTitle");
  if (mobileTitleEl) mobileTitleEl.innerText = activeTest.title;

  const sectionTabsEl = document.getElementById("sectionTabs");
  if (sectionTabsEl) {
    sectionTabsEl.innerHTML = `<button type="button" class="section-tab">Section 1: ${sectionName} (${questionsList.length} Qs)</button>`;
  }

  // Timer & State Teardown
  timeRemaining = activeTest.total_duration_minutes * 60;
  testQuestions = questionsList;
  userResponses = {};

  testQuestions.forEach((q, idx) => {
    userResponses[idx] = { selected: null, status: idx === 0 ? 1 : 0, timeSpent: 0 };
  });

  renderQuestion(0);
  startExamTimer();
}
// 🚀 SYNCHRONOUS LOCAL CALENDAR DATE HELPER (AVOIDS MIDNIGHT TIMEZONE DRIFT)
function getLocalDateString(d = new Date()) {
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
}

// 🎯 UNIVERSAL ATTEMPT DATE RESOLVER (CONVERTS UTC TO CANDIDATE LOCAL DATE)
function getAttemptLocalDate(dateVal) {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return getLocalDateString(d);
  } catch (e) {
    return "";
  }
}

// 🔀 FAST FISHER-YATES ARRAY SHUFFLER
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 👑 SUNDAY REVISION PROTOCOL HELPER
function isSunday() {
  return new Date().getDay() === 0;
}

const clockSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
const docSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
const bookmarkOutlineSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
const bookmarkFilledSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
const starIconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
const checkIconSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const crossIconSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

// ==========================================================================
// 3. GLOBAL STATE & APPLICATION ROUTING (LOOP-FREE ROUTING & EXIT ENGINE)
// ==========================================================================
const MAIN_TABS = ['viewDashboard', 'viewLibrary', 'viewAnalytics', 'viewProfile'];

let currentCandidate = null, catalogData = [], activeSubject = null, userAttemptHistory = [], userWeakQuestions = [], currentLang = "en", currentFilter = "all";
let userPlaylists = [], userPlaylistItems = [], dailyPerf = { total_questions_attempted: 0, is_century_hit: false, streak_count: 0, id: null };
let selectedTestForPlaylist = null, currentThreeDotsTestId = null, activePlaylistMenuTarget = null, pendingDeleteTarget = null;
let librarySelectionMode = false, targetPlaylistForSelection = null;
let activeTest = null, testQuestions = [], practiceQuestions = [], currentIndex = 0, flashcardIndex = 0, userResponses = {}, timeRemaining = 15 * 60, timerInterval = null, isExamFinished = false;
let subjectRadarChartInstance = null, alertEngineStarted = false;

// 🚀 RENDER LOCKS & DEBOUNCING FOR PLAYLIST / AUTH ENGINE
let isRenderingPlaylists = false;
let pendingPlaylistRender = false;
let isAuthSessionInitializing = false;

// 🚀 PRE-FLIGHT MISSION BRIEFING & SHUFFLE STATE (DEFAULT: ON)
let activeBriefingTestId = null;
let isShuffleEnabled = true;

// 🚀 IN-MEMORY CACHE FOR BOOSTER POOL (PREVENTS DUPLICATE RPC FETCHES)
let cachedBoosterPool = null;
let lastBoosterFetchTime = 0;
 
let isExitingApp = false;
let activeTacticalDate = null;
let cachedWeeklyContext = null;

// 🔥 STATE FOR QUIZ & READ MODES
let activePracticeMode = "read"; // 🚀 Formally declared active practice mode state
let currentPracticeContext = null; // { type: 'test', id: 12 } ya { type: 'booster' } ya { type: 'mistake_bank' }
let localQuizState = { answers: {}, starred: new Set(), isFinished: false, filter: "all" };
let localReadState = { starred: new Set(), filter: "all" };

// 🗂️ STATE FOR 3D SPATIAL LEITNER FLASHCARDS
let flashcardDeck = [];
let flashcardOriginalCount = 0;
let flashcardMasteredCount = 0;
let isFlashcardFlipped = false;
let isFlashcardListenerActive = false;

window.toggleShuffleSetting = function(val) {
  isShuffleEnabled = !!val;
};

if ("serviceWorker" in navigator) { 
  window.addEventListener("load", () => { 
    navigator.serviceWorker.register("./service-worker.js").catch(err => console.error("SW Error:", err)); 
  }); 
}

// 🚀 UNIVERSAL BILINGUAL RESOLVER & PARSER
function resolveBilingualField(raw) {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object") return raw;
  const str = String(raw).trim();
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  }
  return str;
}

function getLocalizedText(obj) {
  const parsed = resolveBilingualField(obj);
  let text = "";
  if (typeof parsed === "object" && parsed !== null) { 
    // 🚀 FIX: parsed.text को सपोर्ट दिया गया ताकि नया JSONB format खाली न हो
    const englishText = parsed.en || parsed.text || "";
    if (currentLang === "hi") { 
      text = parsed.hi ? parsed.hi : (englishText ? `${englishText}\n\n*(यह सामग्री अभी हिंदी में उपलब्ध नहीं है)*` : ""); 
    } else { 
      text = englishText || parsed.hi || ""; 
    } 
  } else { 
    text = String(parsed || ""); 
  } 
  return typeof text === "string" ? text.replace(/\\n/g, "\n") : String(text || "");
}

function formatExplanation(exp) {
  if (!exp) return "Yet to add explanation";
  const parsed = resolveBilingualField(exp);
  let text = "";
  if (typeof parsed === "object" && parsed !== null) { 
    // 🚀 FIX: parsed.text को भी चेक करें
    text = currentLang === "hi" 
      ? (parsed.hi || parsed.text || parsed.en || "") 
      : (parsed.en || parsed.text || parsed.hi || ""); 
  } else { 
    text = String(parsed || "").trim(); 
  } 
  text = String(text || "").trim(); 
  if (!text || text === '{"en":""}' || text === '{"hi":""}' || text === '{"text":""}' || text === '{"en":"","hi":""}' || text === 'null' || text === 'undefined') { 
    return "Yet to add explanation"; 
  } 
  return text.replace(/\\n/g, "\n");
}

function initPlaylistSwipeGestures() {
  let startX = 0, startY = 0;
  let activeWrapper = null, activeTile = null, activeBackdrop = null;
  let currentTranslateX = 0;
  let isHorizontalGesture = null;
  let hasHapticTriggered = false;

  document.addEventListener("touchstart", (e) => {
    const wrapper = e.target.closest(".swipe-item-wrapper");
    if (!wrapper) {
      document.querySelectorAll(".swipe-item-wrapper .set-tile").forEach(t => {
        if (t.style.transform && t.style.transform !== "translateX(0px)") {
          t.style.transition = "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)";
          t.style.transform = "translateX(0px)";
        }
      });
      return;
    }

    if (e.target.closest("button")) return;

    const tile = wrapper.querySelector(".set-tile");
    const backdrop = wrapper.querySelector(".swipe-action-backdrop");
    if (!tile) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentTranslateX = 0;

    activeWrapper = wrapper;
    activeTile = tile;
    activeBackdrop = backdrop;
    isHorizontalGesture = null;
    hasHapticTriggered = false;
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    if (!activeWrapper || !activeTile) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - startX;
    const diffY = touchY - startY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    if (isHorizontalGesture === null) {
      if (absX > 6 && absX >= absY) {
        isHorizontalGesture = true;
      } else if (absY > 12 && absY > absX * 1.5) {
        isHorizontalGesture = false;
      }
    }

    if (!isHorizontalGesture) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    if (diffX <= 0) {
      currentTranslateX = diffX;
      activeTile.style.transition = "none";
      activeTile.style.transform = `translateX(${currentTranslateX}px)`;

      const wrapperWidth = activeWrapper.offsetWidth || 300;
      const isPastThreshold = Math.abs(currentTranslateX) > (wrapperWidth * 0.45);

      if (activeBackdrop) {
        activeBackdrop.classList.toggle("is-active-threshold", isPastThreshold);
      }

      // Haptic tick upon crossing commit threshold
      if (isPastThreshold && !hasHapticTriggered) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate(15); } catch(err) {}
        }
        hasHapticTriggered = true;
      } else if (!isPastThreshold && hasHapticTriggered) {
        hasHapticTriggered = false;
      }
    }
  }, { passive: false });

  const endGesture = () => {
    if (!activeWrapper || !activeTile) return;

    const wrapper = activeWrapper;
    const tile = activeTile;
    const backdrop = activeBackdrop;
    const wrapperWidth = wrapper.offsetWidth || 300;
    const shouldCommit = isHorizontalGesture && (Math.abs(currentTranslateX) > (wrapperWidth * 0.45));

    activeWrapper = null;
    activeTile = null;
    activeBackdrop = null;
    isHorizontalGesture = null;

    if (shouldCommit) {
      // 🚀 Threshold cross hone par card wahin ke wahin turant gayab ho jayega (No left sliding out)
      const pId = wrapper.getAttribute("data-playlist-id");
      const testId = wrapper.getAttribute("data-test-id");
      const pName = wrapper.closest(".mission-playlist-card")?.querySelector(".playlist-title")?.innerText || "Playlist";

      window.executeSwipeRemove(pId, testId, pName, wrapper);

    } else {
      // Safe snap back
      tile.style.transition = "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)";
      tile.style.transform = "translateX(0px)";
      if (backdrop) backdrop.classList.remove("is-active-threshold");
    }
  };

  document.addEventListener("touchend", endGesture, { passive: true });
  document.addEventListener("touchcancel", endGesture, { passive: true });
}

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.style.overscrollBehaviorY = 'none'; 
  document.body.style.overscrollBehaviorY = 'none';

  // 🚀 0ms SYNCHRONOUS PWA EXIT GATE (Fixes instant cold-swipe closing)
  if (!history.state || history.state.page !== 'dashboard') {
    history.replaceState({ page: 'exit-gate' }, '', window.location.pathname);
    history.pushState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');
  }

  setupAppEvents(); 
  initAuthSessionWatcher(); 
  setupMobileExamGestures();
  initAnalyticsCarousels();
  initPlaylistSwipeGestures();
  window.addEventListener('resize', () => {
    const bottomNav = document.getElementById('mobileBottomNav');
    if (bottomNav) {
      const activeView = Array.from(document.querySelectorAll('.view-screen')).find(v => v.style.display === 'flex')?.id;
      if (librarySelectionMode || document.body.classList.contains("staging-active")) {
        bottomNav.style.setProperty("display", "none", "important");
        bottomNav.classList.add("nav-hidden");
      } else if (window.innerWidth <= 768 && MAIN_TABS.includes(activeView)) {
        bottomNav.style.setProperty("display", "flex", "important");
        bottomNav.classList.remove("nav-hidden");
      } else {
        bottomNav.style.setProperty("display", "none", "important");
        bottomNav.classList.add("nav-hidden");
      }
    }
  });
});

function updateDesktopNav(viewId) {
  document.querySelectorAll('.desk-nav-btn').forEach(btn => {
    btn.classList.remove('active');
    const id = btn.id || "";
    if (viewId === 'viewDashboard' && id.startsWith('deskNavHome')) btn.classList.add('active');
    if (viewId === 'viewLibrary' && id.startsWith('deskNavLib')) btn.classList.add('active');
    if (viewId === 'viewAnalytics' && id.startsWith('deskNavStats')) btn.classList.add('active');
    if (viewId === 'viewProfile' && id.startsWith('deskNavProfile')) btn.classList.add('active');
  });
}

// 🚀 INSTANT 0ms HEADER TELEMETRY SYNC (STREAK + ACCURACY TOGETHER)
function updateHeaderBadges() {
  const isMobile = window.innerWidth <= 768;
  const roll = currentCandidate?.roll_number;

  // 1. Streak Sync
  const streak = dailyPerf?.streak_count || 0;
  ['headerStreakCount', 'headerStreakCount_lib', 'headerStreakCount_stats', 'headerStreakCount_prof'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = streak + (isMobile ? "" : " Days");
  });

  // 2. Accuracy Sync (0ms Cache)
  const cachedAcc = roll ? appStorage.get("cache_accuracy_" + roll) : null;
  const accText = cachedAcc !== null ? cachedAcc + "%" : "--%";
  ['headerAccuracyCount', 'headerAccuracyCount_lib', 'headerAccuracyCount_stats', 'headerAccuracyCount_prof'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = accText;
  });
}

// 🚀 UNIVERSAL MODAL DOM TOGGLE HELPER
function toggleModalDOM(modalId, isOpen, displayType = "flex") {
  const el = document.getElementById(modalId);
  if (!el) return false;
  if (isOpen) {
    el.style.setProperty("display", displayType, "important");
    el.style.pointerEvents = "auto";
  } else {
    el.style.setProperty("display", "none", "important");
    el.style.pointerEvents = "none";
  }
  return true;
}

// 🚀 UNIFIED & LOOP-BASED OVERLAY DISMISSAL (ZERO REDUNDANCY)
function closeAllOverlaysAndPopups() {
  let closedSomething = false;

  const isVisible = (id) => {
    const el = document.getElementById(id);
    if (!el) return false;
    return el.style.display === 'flex' || el.style.display === 'block' || el.classList.contains('open');
  };

  // Declarative Overlay Registry
  const OVERLAYS = [
    { id: 'threeDotsMenuOverlay', action: closeThreeDotsMenu },
    { id: 'playlistActionMenuOverlay', action: closePlaylistActionMenu },
    { id: 'playlistBottomSheetOverlay', action: closePlaylistBottomSheet },
    { id: 'missionBriefingModal', action: closeMissionBriefingModal },
    { id: 'appNoticeModal', action: closeAppNoticeModal },
    { id: 'createPlaylistModal', action: closeCreatePlaylistModal },
    { id: 'editPlaylistModal', action: closeEditPlaylistModal },
    { id: 'deletePlaylistConfirmModal', action: closeDeletePlaylistModal },
    { id: 'abortExamModal', action: closeAbortExamModal },
    { id: 'practiceModeSwitcherSheet', action: closePracticeModeSwitcher }
  ];

  for (const item of OVERLAYS) {
    if (isVisible(item.id)) {
      item.action();
      closedSomething = true;
    }
  }

  const submitModal = document.getElementById('submitModalContainer');
  if (submitModal && isVisible('submitModalContainer') && submitModal.innerHTML !== "") { 
    closeExamModal(); 
    closedSomething = true; 
  }

  const exitModal = document.getElementById('exitConfirmModal');
  if (exitModal && isVisible('exitConfirmModal')) {
    exitModal.style.display = 'none';
  }

  return closedSomething;
}

function renderViewDOM(viewId) {
  ["viewLogin", "viewDashboard", "viewLibrary", "viewExam", "viewSolutions", "viewAnalytics", "viewPractice", "viewProfile"].forEach(id => {
    const el = document.getElementById(id); 
    if (el) el.style.display = (id === viewId) ? "flex" : "none";
  });

  const bottomNav = document.getElementById('mobileBottomNav');
  if (bottomNav) { 
    if (librarySelectionMode || document.body.classList.contains("staging-active")) {
      bottomNav.style.setProperty("display", "none", "important");
      bottomNav.classList.add("nav-hidden");
    } else if (window.innerWidth <= 768 && MAIN_TABS.includes(viewId)) {
      bottomNav.style.setProperty("display", "flex", "important");
      bottomNav.classList.remove("nav-hidden");
    } else {
      bottomNav.style.setProperty("display", "none", "important");
      bottomNav.classList.add("nav-hidden");
    }
  }

  const navMap = { viewDashboard: 'navHomeBtn', viewLibrary: 'navLibraryBtn', viewAnalytics: 'navAnalyticsBtn', viewProfile: 'navProfileBtn' };
  if (navMap[viewId]) updateBottomNav(document.getElementById(navMap[viewId]));
  updateDesktopNav(viewId);
}

window.switchView = function(viewId, pushHistory = true) {
  closeAllOverlaysAndPopups();
  const currentActiveView = Array.from(document.querySelectorAll('.view-screen')).find(v => v.style.display === 'flex')?.id;
  if (currentActiveView === viewId) return;

  // 🧹 DOCKED FILTER STRIP CLEANUP (Prevents ghost bars when switching away from Practice)
  if (viewId !== 'viewPractice') {
    const readBar = document.getElementById("readFixedFilterBar");
    if (readBar) readBar.classList.remove("show-dock");
  }

  // 🎯 LIBRARY STAGING SELECTION TEARDOWN
  if (librarySelectionMode && viewId !== 'viewLibrary') {
    librarySelectionMode = false;
    targetPlaylistForSelection = null;
    document.body.classList.remove("staging-active");
    const dock = document.getElementById("libraryFloatingDock");
    if (dock) dock.style.display = "none";
    const scroller = document.getElementById("stagingDomainScroller");
    if (scroller) scroller.style.display = "none";
    const toast = document.getElementById("selectionToast");
    if (toast) {
      toast.classList.remove("show");
      toast.style.display = "none";
    }
  }

  renderViewDOM(viewId);

  // 🚀 0ms LIVE ANALYTICS SYNC: Fetch and render metrics immediately on tab entry
  if (viewId === 'viewAnalytics') {
    fetchStudentAnalytics(false);
  }

  if (pushHistory) {
    if (viewId === 'viewDashboard') {
      history.pushState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');
    } else if (MAIN_TABS.includes(viewId)) {
      if (history.state?.page === 'main-tab') {
        history.replaceState({ page: 'main-tab', view: viewId }, '', '#' + viewId);
      } else {
        history.pushState({ page: 'main-tab', view: viewId }, '', '#' + viewId);
      }
    } else {
      history.pushState({ page: 'sub-view', view: viewId }, '', '#' + viewId);
    }
  }
};

window.addEventListener("popstate", function(e) {
  if (typeof isExitingApp !== 'undefined' && isExitingApp) return;

  const currentActiveView = Array.from(document.querySelectorAll('.view-screen')).find(v => v.style.display === 'flex')?.id;

  if (currentActiveView === 'viewExam' && !isExamFinished) { 
    history.pushState({ page: 'sub-view', view: 'viewExam' }, '', '#viewExam'); 
    abortExamSession(); 
    return; 
  }

  if (closeAllOverlaysAndPopups()) {
    history.pushState({ 
      page: MAIN_TABS.includes(currentActiveView) ? (currentActiveView === 'viewDashboard' ? 'dashboard' : 'main-tab') : 'sub-view', 
      view: currentActiveView 
    }, '', '#' + currentActiveView);
    return; 
  }

  const searchBar = document.getElementById("mastheadSearchBar");
  if (searchBar && searchBar.style.display === "flex") { 
    toggleMastheadSearch(false); 
    history.pushState(e.state || { page: 'main-tab', view: 'viewLibrary' }, '', window.location.hash);
    return; 
  }

  if (['viewPractice', 'viewSolutions'].includes(currentActiveView)) {
    isExamFinished = true;
    if (e.state && e.state.view) {
      renderViewDOM(e.state.view);
      if (e.state.view === 'viewLibrary' && activeSubject) {
        const hub = document.getElementById("subjectHubStage");
        const exp = document.getElementById("setsExplorerStage");
        if (hub) hub.style.display = "none";
        if (exp) exp.style.display = "block";
      }
      return;
    }
  }

  if (currentActiveView === 'viewLibrary') {
    const setsExp = document.getElementById("setsExplorerStage");
    if (setsExp && setsExp.style.display === "block") {
      returnToSubjectHub(true);
      return; 
    }
  }

  if (librarySelectionMode) {
    cancelLibrarySelectionMode();
    return; 
  }

  if (e.state && e.state.view) {
    renderViewDOM(e.state.view);
    return;
  }

  if (['viewLibrary', 'viewAnalytics', 'viewProfile'].includes(currentActiveView)) {
    renderViewDOM('viewDashboard');
    history.replaceState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');
    return; 
  }

  // 🚀 HOME EXIT GATE: Native Double-Back Trigger
  if (!e.state || e.state.page === 'exit-gate' || currentActiveView === 'viewDashboard') {
    handleNativeExitTrigger();
    return;
  }
});

function setupMobileExamGestures() {
  const panel = document.querySelector(".tcs-side-panel"), overlay = document.getElementById("paletteOverlay");
  const examWorkspace = document.querySelector(".question-workspace");
  if (!panel || !examWorkspace) return;

  if (!document.getElementById("paletteGrabHandle")) {
    const h = document.createElement("div");
    h.id = "paletteGrabHandle";
    h.style.cssText = "width: 44px; height: 5px; background: var(--border-color); border-radius: 4px; margin: 8px auto 4px auto; flex-shrink: 0; cursor: grab;";
    panel.insertBefore(h, panel.firstChild);
  }

  // 1. Palette Drawer Pull-Down Gesture
  let pStartY = 0, pStartX = 0;
  panel.addEventListener("touchstart", (e) => {
    if (window.innerWidth > 768) return;
    pStartY = e.touches[0].clientY;
    pStartX = e.touches[0].clientX;
  }, { passive: true });

  panel.addEventListener("touchend", (e) => {
    if (window.innerWidth > 768 || !panel.classList.contains("open")) return;
    if ((e.changedTouches[0].clientY - pStartY) > 50 && Math.abs(e.changedTouches[0].clientX - pStartX) < 80) {
      panel.classList.remove("open");
      if (overlay) {
        overlay.classList.remove("open");
        overlay.style.pointerEvents = "none";
      }
    }
  }, { passive: true });

  // 2. 🚀 Edge-Safe Center-Only Horizontal Swipe Navigation
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  const EDGE_DEADZONE = 30; // Kinare ke 30px me swipe disable rahega (OS back gesture safe)
  const SWIPE_THRESHOLD = 50; // Minimum drag distance
  const MAX_PERPENDICULAR = 45; // Vertical scrolling ke waqt horizontal swipe lock rahega

  examWorkspace.addEventListener("touchstart", (e) => {
    if (window.innerWidth > 768 || isExamFinished) return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  examWorkspace.addEventListener("touchend", (e) => {
    if (window.innerWidth > 768 || isExamFinished || !testQuestions.length) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX;
    const diffY = touch.clientY - touchStartY;
    const duration = Date.now() - touchStartTime;

    // Edge check: Agar touch screen ke bilkul kinare se start hua toh ignore karein (OS Back Safe)
    if (touchStartX <= EDGE_DEADZONE || touchStartX >= (window.innerWidth - EDGE_DEADZONE)) return;

    // Fast horizontal swipe check
    if (Math.abs(diffX) >= SWIPE_THRESHOLD && Math.abs(diffY) <= MAX_PERPENDICULAR && duration <= 400) {
      if (diffX < 0) {
        // Swipe Left -> Next Question
        if (currentIndex + 1 < testQuestions.length) {
          renderQuestion(currentIndex + 1);
        }
      } else {
        // Swipe Right -> Previous Question
        if (currentIndex - 1 >= 0) {
          renderQuestion(currentIndex - 1);
        }
      }
    }
  }, { passive: true });
}

window.updateBottomNav = function(clickedBtn) {
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  if (clickedBtn) clickedBtn.classList.add('active');
};

window.toggleProfileDrawer = function() { 
  switchView('viewProfile'); 
};


// ==========================================================================
// 4. AUTHENTICATION & CANDIDATE SESSION
// ==========================================================================
let initHash = window.location.hash || window.location.href;
if (initHash.includes("type=recovery")) sessionStorage.setItem("recovery_mode", "true");

function initAuthSessionWatcher() {
  if (sessionStorage.getItem("recovery_mode") === "true") return showPasswordResetUI();
  
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (sessionStorage.getItem("recovery_mode") === "true") return showPasswordResetUI();
    if (session && session.user && session.user.email_confirmed_at) {
      if (!currentCandidate && !isAuthSessionInitializing) {
        isAuthSessionInitializing = true;
        initCandidateSession(session.user).finally(() => { isAuthSessionInitializing = false; });
      }
    } else { 
      currentCandidate = null; 
      switchView("viewLogin", false); 
    }
  });

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY" || sessionStorage.getItem("recovery_mode") === "true") { 
      sessionStorage.setItem("recovery_mode", "true"); 
      return showPasswordResetUI(); 
    }
    if (event === "SIGNED_OUT" || !session || !session.user || !session.user.email_confirmed_at) { 
      currentCandidate = null; 
      return switchView("viewLogin"); 
    }
    if ((!currentCandidate || currentCandidate.email !== session.user.email.toLowerCase()) && !isAuthSessionInitializing) {
      isAuthSessionInitializing = true;
      initCandidateSession(session.user).finally(() => { isAuthSessionInitializing = false; });
    }
  });
}

function showPasswordResetUI() {
  switchView("viewLogin");
  ["signInForm", "registerForm", "forgotForm", "authNavTabs"].forEach(id => { 
    const el = document.getElementById(id); 
    if (el) el.style.display = "none"; 
  });
  const resetForm = document.getElementById("resetPasswordForm");
  if (resetForm) {
    resetForm.style.display = "block";
    if (!document.getElementById("btnCancelReset")) {
      const b = document.createElement("button"); 
      b.id = "btnCancelReset"; 
      b.type = "button"; 
      b.innerText = "Cancel & Sign Out";
      b.style.cssText = "background:none; border:none; color:var(--danger); font-size:12px; font-weight:bold; width:100%; margin-top:16px; cursor:pointer; text-decoration:underline;";
      b.onclick = () => { 
        sessionStorage.removeItem("recovery_mode"); 
        supabaseClient.auth.signOut().then(() => { window.location.href = window.location.pathname; }); 
      };
      resetForm.appendChild(b);
    }
  }
  showAuthNotice("Security Verified! Enter your new password below.", false);
}

async function initCandidateSession(user) {
  if (sessionStorage.getItem("recovery_mode") === "true") return showPasswordResetUI();
  try {
    const userEmail = (user.email || "").toLowerCase();
    const { data: student } = await supabaseClient.from("students").select("*").eq("email", userEmail).maybeSingle();
    if (student) {
      currentCandidate = student;
    } else {
      const roll = user.user_metadata?.roll_number || "ROLL-" + Math.floor(1000 + Math.random() * 9000);
      const name = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split("@")[0];
      const { data: newS, error: insErr } = await supabaseClient.from("students").upsert({ roll_number: roll, full_name: name, email: userEmail }, { onConflict: "email" }).select().single();
      if (insErr) throw insErr;
      currentCandidate = newS;
    }
    const nameEl = document.getElementById("editProfileName"); if (nameEl) nameEl.value = currentCandidate.full_name || "";
    const rollEl = document.getElementById("editProfileRoll"); if (rollEl) rollEl.value = currentCandidate.roll_number || "";
    const targetEl = document.getElementById("editProfileTarget"); if (targetEl) targetEl.value = currentCandidate.target_exam || "";
    const pName = document.getElementById("dashCandidateName"); if (pName) pName.innerText = currentCandidate.full_name || "Candidate";
    const pRoll = document.getElementById("dashCandidateRoll"); if (pRoll) pRoll.innerText = "ROLL: " + (currentCandidate.roll_number || "---");
    mountDashboard(true);
  } catch (err) { 
    showAuthNotice("Candidate profile load failed: " + err.message); 
    switchView("viewLogin"); 
  }
}

function showAuthNotice(msg, isError = true) {
  const box = document.getElementById("authErrorMsg"); 
  if (!box) return;
  box.innerText = msg; 
  box.style.display = "block";
  box.style.background = isError ? "var(--danger-bg-subtle)" : "var(--success-bg-subtle)";
  box.style.borderColor = isError ? "var(--danger)" : "var(--success)"; 
  box.style.color = isError ? "var(--danger)" : "var(--success-dark)";
}

// ==========================================================================
// 5. APPLICATION EVENTS & INTERACTIVE CONTROLLERS
// ==========================================================================
function applyTopicFilter(filter = currentFilter) {
  currentFilter = filter;
  const searchInput = document.getElementById("topicSearchInput");
  const searchQuery = (searchInput?.value || "").trim().toLowerCase();

  document.querySelectorAll(".topic-accordion-card").forEach(card => {
    let visibleCount = 0;
    const body = card.querySelector(".topic-accordion-body");
    const tiles = card.querySelectorAll(".set-tile:not(.mistake-bank-tile)");
    const hTitle = card.querySelector(".topic-title")?.innerText.toLowerCase() || "";
    const headerMatchesSearch = searchQuery ? hTitle.includes(searchQuery) : false;

    tiles.forEach(tile => {
      const tileStatus = tile.getAttribute("data-status") || "unattempted";
      const matchesFilter = (filter === "all" || tileStatus === filter);

      let matchesSearch = true;
      if (searchQuery) {
        if (!headerMatchesSearch) {
          const sTitle = tile.querySelector(".set-tile-title")?.innerText.toLowerCase() || "";
          matchesSearch = sTitle.includes(searchQuery);
        }
      }

      if (matchesFilter && matchesSearch) {
        tile.style.display = "";
        visibleCount++;
      } else {
        tile.style.display = "none";
      }
    });

    if (visibleCount > 0) {
      card.style.display = "block";
      if (searchQuery) {
        card.classList.add("open");
        if (body) body.style.display = "block";
      }
    } else {
      card.style.display = "none";
    }
  });

  // 🎯 Manage Subject Mistake Vault Visibility in Filters
  const sTile = document.getElementById("subjectMistakeVault");
  if (sTile) {
    const isClean = sTile.classList.contains("state-clean");
    if (searchQuery) {
      sTile.style.display = "none";
    } else if (filter === "mastered") {
      sTile.style.display = isClean ? "" : "none";
    } else {
      sTile.style.display = isClean ? (filter === "all" ? "" : "none") : "";
    }
  }
}

function filterAccordionCards(query) {
  applyTopicFilter(currentFilter);
  if (!query) {
    document.querySelectorAll(".topic-accordion-card").forEach(card => {
      card.classList.remove("open");
      const body = card.querySelector(".topic-accordion-body");
      if (body) body.style.display = "none";
    });
  }
}

window.toggleSecondaryPlaylist = function(headerElement) {
  const card = headerElement.closest('.playlist-accordion-card');
  if (!card) return;
  const wasExpanded = card.classList.contains('expanded');

  // सभी सेकेंडरी और कस्टम प्लेलिस्ट को पहले कोलैप्स करें
  document.querySelectorAll('.playlist-accordion-card').forEach(c => {
    // Today's Payload कार्ड को छोड़कर बाकी सभी को बंद रखें
    if (c.id !== 'todayPayloadCard') {
      c.classList.remove('expanded');
      c.classList.add('collapsed');
      const pill = c.querySelector('.playlist-count-pill');
      if (pill && !pill.innerText.includes('▼')) {
        pill.innerText = pill.innerText.replace('▲', '▼');
      }
    }
  });

  // अगर क्लिक किया गया कार्ड पहले से खुला नहीं था, तो उसे खोलें
  if (!wasExpanded) {
    card.classList.remove('collapsed');
    card.classList.add('expanded');
    const pill = card.querySelector('.playlist-count-pill');
    if (pill) {
      pill.innerText = pill.innerText.replace('▼', '▲');
    }
  }
};

function setupAppEvents() {
  document.addEventListener("click", (e) => {
    const pMenu = document.getElementById("playlistActionMenu");
    if (pMenu && pMenu.style.display !== "none" && !pMenu.contains(e.target) && !e.target.closest(".btn-playlist-dots")) closePlaylistActionMenu();
    const tMenu = document.getElementById("threeDotsMenu");
    if (tMenu && tMenu.style.display !== "none" && !tMenu.contains(e.target) && !e.target.closest(".btn-three-dots")) closeThreeDotsMenu();
  });

  const tomHeader = document.querySelector("#tomorrowPlaylistCard .playlist-header");
  if (tomHeader) tomHeader.onclick = () => window.toggleSecondaryPlaylist(tomHeader);
  const weekHeader = document.querySelector("#weekPlaylistCard .playlist-header");
  if (weekHeader) weekHeader.onclick = () => window.toggleSecondaryPlaylist(weekHeader);
  const starredHeader = document.querySelector("#starredPlaylistCard .playlist-header");
  if (starredHeader) starredHeader.onclick = () => window.toggleSecondaryPlaylist(starredHeader);

  const tabIn = document.getElementById("tabSignIn"), 
        tabReg = document.getElementById("tabRegister"), 
        fIn = document.getElementById("signInForm"), 
        fReg = document.getElementById("registerForm"), 
        fForgot = document.getElementById("forgotForm"), 
        fReset = document.getElementById("resetPasswordForm"), 
        aErr = document.getElementById("authErrorMsg");

  tabIn?.addEventListener("click", () => { 
    tabIn.classList.add("active"); 
    tabReg?.classList.remove("active"); 
    if (fIn) fIn.style.display = "block"; 
    if (fReg) fReg.style.display = "none"; 
    if (fForgot) fForgot.style.display = "none"; 
    if (fReset) fReset.style.display = "none"; 
    if (aErr) aErr.style.display = "none"; 
  });

  tabReg?.addEventListener("click", () => { 
    tabReg.classList.add("active"); 
    tabIn?.classList.remove("active"); 
    if (fReg) fReg.style.display = "block"; 
    const st = document.getElementById("regFieldsStep"), sc = document.getElementById("regSuccessCard"); 
    if (st) st.style.display = "none"; 
    if (sc) sc.style.display = "block"; 
    if (fIn) fIn.style.display = "none"; 
    if (fForgot) fForgot.style.display = "none"; 
    if (fReset) fReset.style.display = "none"; 
    if (aErr) aErr.style.display = "none"; 
  });

  document.getElementById("btnOpenForgot")?.addEventListener("click", () => { 
    if (fIn) fIn.style.display = "none"; 
    if (fReg) fReg.style.display = "none"; 
    if (fReset) fReset.style.display = "none"; 
    if (fForgot) fForgot.style.display = "block"; 
    const em = document.getElementById("forgotEmailStep"), su = document.getElementById("forgotSuccessStep"); 
    if (em) em.style.display = "block"; 
    if (su) su.style.display = "none"; 
    if (aErr) aErr.style.display = "none"; 
  });

  document.getElementById("btnBackToSignIn")?.addEventListener("click", () => tabIn?.click());
  document.getElementById("btnBackToSignInFromReg")?.addEventListener("click", () => tabIn?.click());
  
  document.getElementById("btnGoogleAuth")?.addEventListener("click", async () => { 
    if (aErr) aErr.style.display = "none"; 
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } }); 
    if (error) showAuthNotice(error.message); 
  });

  fIn?.addEventListener("submit", async (e) => {
    e.preventDefault(); 
    const email = document.getElementById("inputSignInEmail")?.value.trim().toLowerCase(), password = document.getElementById("inputSignInPass")?.value, btn = document.getElementById("btnSignInSubmit");
    if (aErr) aErr.style.display = "none"; 
    if (btn) { btn.innerText = "Authenticating..."; btn.disabled = true; }
    try { 
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password }); 
      if (error) throw error; 
      if (!data.user?.email_confirmed_at) { 
        await supabaseClient.auth.signOut(); 
        throw new Error("Email not verified. Please verify using link dispatched to inbox."); 
      } 
      await initCandidateSession(data.user); 
    } catch (err) { 
      showAuthNotice(err.message || "Invalid credentials."); 
    } finally { 
      if (btn) { btn.innerText = "Authenticate & Enter"; btn.disabled = false; } 
    }
  });

  fReg?.addEventListener("submit", async (e) => {
    e.preventDefault(); 
    const name = document.getElementById("inputRegName")?.value.trim(), roll = document.getElementById("inputRegRoll")?.value.trim().toUpperCase(), email = document.getElementById("inputRegEmail")?.value.trim().toLowerCase(), password = document.getElementById("inputRegPass")?.value, btn = document.getElementById("btnRegisterSubmit");
    if (aErr) aErr.style.display = "none"; 
    if (btn) { btn.innerText = "Sending Link..."; btn.disabled = true; }
    try { 
      const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { full_name: name, roll_number: roll }, emailRedirectTo: window.location.origin } }); 
      if (error) throw error; 
      const st = document.getElementById("regFieldsStep"), sc = document.getElementById("regSuccessCard"); 
      if (st) st.style.display = "none"; 
      if (sc) sc.style.display = "block"; 
    } catch (err) { 
      showAuthNotice(err.message || "Registration failed."); 
    } finally { 
      if (btn) { btn.innerText = "Create Profile & Send Link"; btn.disabled = false; } 
    }
  });

  fReset?.addEventListener("submit", async (e) => {
    e.preventDefault(); 
    const newPass = document.getElementById("inputNewPassword")?.value, btn = document.getElementById("btnSaveNewPassword");
    if (!newPass || newPass.length < 6) return showAuthNotice("Password must contain at least 6 characters.");
    if (btn) { btn.innerText = "Updating..."; btn.disabled = true; }
    try { 
      const { error } = await supabaseClient.auth.updateUser({ password: newPass }); 
      if (error) throw error; 
      sessionStorage.removeItem("recovery_mode"); 
      if (window.history?.replaceState) window.history.replaceState(null, null, window.location.pathname); 
      setTimeout(async () => { 
        const { data: { session } } = await supabaseClient.auth.getSession(); 
        if (session?.user) await initCandidateSession(session.user); 
      }, 1200); 
    } catch (err) { 
      showAuthNotice(err.message || "Password update failed."); 
    } finally { 
      if (btn) { btn.innerText = "Update Password & Enter"; btn.disabled = false; } 
    }
  });

  document.getElementById("btnSaveProfile")?.addEventListener("click", async () => {
    const newName = document.getElementById("editProfileName")?.value.trim(), newTarget = document.getElementById("editProfileTarget")?.value.trim();
    try { 
      const { error } = await supabaseClient.from("students").update({ full_name: newName, target_exam: newTarget }).eq("roll_number", currentCandidate.roll_number); 
      if (error) throw error; 
      currentCandidate.full_name = newName; 
      currentCandidate.target_exam = newTarget; 
      const dName = document.getElementById("dashCandidateName"); 
      if (dName) dName.innerText = newName; 
      showAppNoticeModal("Profile Updated", "Changes Saved Successfully", "Your profile details and target exam specifications have been updated.", "👤", "Return to Home", () => switchView('viewDashboard')); 
    } catch (err) { 
      showAppNoticeModal("Profile Error", "Update Failed", err.message, "⚠️", "Dismiss"); 
    }
  });

  document.getElementById("btnLogoutDrawer")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut(); 
    currentCandidate = null; 
    sessionStorage.removeItem("recovery_mode"); 
    switchView("viewLogin"); 
    document.getElementById("tabSignIn")?.click();
  });

  const themeBtns = document.querySelectorAll(".theme-toggle-btn");
  if (appStorage.get("theme") === "dark") { 
    document.body.classList.add("dark-theme"); 
    themeBtns.forEach(b => b.innerText = "☀️"); 
  }
  themeBtns.forEach(btn => {
    btn.onclick = () => {
      document.body.classList.toggle("dark-theme"); 
      const isDark = document.body.classList.contains("dark-theme");
      appStorage.set("theme", isDark ? "dark" : "light"); 
      themeBtns.forEach(b => b.innerText = isDark ? "☀️" : "🌙");
      if (document.getElementById('viewAnalytics')?.style.display === 'flex') fetchStudentAnalytics();
    };
  });

  document.querySelectorAll('.filter-chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip-btn').forEach(b => b.classList.remove('active'));
      const t = e.target.closest('.filter-chip-btn'); 
      if (t) { 
        t.classList.add('active'); 
        currentFilter = t.getAttribute('data-filter') || "all"; 
        applyTopicFilter(currentFilter); 
      }
    });
  });

  document.getElementById("topicSearchInput")?.addEventListener("input", (e) => filterAccordionCards(e.target.value.trim().toLowerCase()));
  document.getElementById("btnSaveNext")?.addEventListener("click", () => { if (!userResponses[currentIndex]) return; userResponses[currentIndex].status = (userResponses[currentIndex].selected !== null) ? 2 : 1; advanceNextQuestion(); });
  document.getElementById("btnMarkReview")?.addEventListener("click", () => { if (!userResponses[currentIndex]) return; userResponses[currentIndex].status = (userResponses[currentIndex].selected !== null) ? 4 : 3; advanceNextQuestion(); });
  document.getElementById("btnClear")?.addEventListener("click", () => { if (!userResponses[currentIndex]) return; userResponses[currentIndex].selected = null; userResponses[currentIndex].status = 1; renderQuestion(currentIndex); });
  document.getElementById("btnSubmit")?.addEventListener("click", () => showExamSummaryModal());
  document.getElementById("langSwitch")?.addEventListener("change", (e) => { currentLang = e.target.value; if (document.getElementById("viewExam")?.style.display === "flex") renderQuestion(currentIndex); });
  document.getElementById("btnMobilePalette")?.addEventListener("click", (e) => { 
    e.stopPropagation(); 
    const p = document.querySelector(".tcs-side-panel"), ov = document.getElementById("paletteOverlay"), isOpen = p?.classList.contains("open"); 
    if (isOpen) { p?.classList.remove("open"); if (ov) { ov.classList.remove("open"); ov.style.pointerEvents = "none"; } } 
    else { p?.classList.add("open"); if (ov) { ov.classList.add("open"); ov.style.pointerEvents = "auto"; } } 
  });
  document.getElementById("paletteOverlay")?.addEventListener("click", () => { 
    document.querySelector(".tcs-side-panel")?.classList.remove("open"); 
    const ov = document.getElementById("paletteOverlay"); 
    if (ov) { ov.classList.remove("open"); ov.style.pointerEvents = "none"; } 
  });
}

function start5PMEngine() {
  if (alertEngineStarted) return; 
  alertEngineStarted = true;
  setInterval(() => {
    if (!currentCandidate) return; 
    const d = new Date(), dateStr = d.toDateString();
    if (d.getHours() === 17 && !appStorage.get("5pm_alert_" + dateStr)) {
      const tomLoad = parseInt(appStorage.get("tomorrow_load_" + currentCandidate.roll_number, "0"));
      if (tomLoad === 0) showAppNoticeModal("Tomorrow's Queue", "Target Queue Empty", "Tomorrow's Playlist has no sets staged. Add sets before you sleep to maintain your Century Streak!", "⏳", "Explore Library");
      else if (tomLoad < 100) showAppNoticeModal("Tomorrow's Queue", "Target Load Incomplete", `Tomorrow has only ${tomLoad} questions staged (Target is 100). Add more sets!`, "⚠️", "Add Sets");
      else showAppNoticeModal("Tomorrow's Queue", "Target Locked", `Tomorrow's payload is locked & ready (${tomLoad} Questions).`, "🎯", "Dismiss");
      appStorage.set("5pm_alert_" + dateStr, "true");
    }
  }, 60000);
}

// ==========================================================================
// 6. CUSTOM IN-APP MODALS (ALERT, CREATE, EDIT & DELETE PLAYLIST)
// ==========================================================================

window.showAppNoticeModal = function(title, heading, message, icon = '🎯', actionText = 'Explore Library', actionCallback = null, secText = 'Dismiss', secCallback = null) {
  const modal = document.getElementById("appNoticeModal"); 
  if (!modal) return alert(message);
  
  document.getElementById("noticeModalTitle").innerText = title; 
  document.getElementById("noticeHeading").innerText = heading; 
  document.getElementById("noticeMessage").innerText = message; 
  document.getElementById("noticeIconBadge").innerText = icon;

  const actionBtn = document.getElementById("btnNoticeAction") || modal.querySelector(".notice-modal-actions .btn-primary");
  if (actionBtn) { 
    actionBtn.innerText = actionText; 
    actionBtn.onclick = () => { 
      closeAppNoticeModal(); 
      if (actionCallback) actionCallback(); 
      else { switchView("viewLibrary"); returnToSubjectHub(true); } 
    }; 
  }

  const secBtn = document.getElementById("btnNoticeSecondary") || modal.querySelector(".notice-modal-actions .btn-secondary");
  if (secBtn) {
    secBtn.innerText = secText;
    secBtn.onclick = () => {
      closeAppNoticeModal();
      if (secCallback) secCallback();
    };
  }

  toggleModalDOM("appNoticeModal", true);
};

window.closeAppNoticeModal = () => toggleModalDOM("appNoticeModal", false);

window.handleNoticeAction = function() { 
  closeAppNoticeModal(); 
  switchView("viewLibrary"); 
  returnToSubjectHub(true); 
};

window.openCreatePlaylistModal = function(fromSpecificTest = false) { 
  if (!fromSpecificTest) selectedTestForPlaylist = null;
  const inp = document.getElementById("inputNewPlaylistName"); 
  if (inp) inp.value = ""; 
  toggleModalDOM("createPlaylistModal", true);
  setTimeout(() => inp?.focus(), 60); 
};

window.closeCreatePlaylistModal = () => toggleModalDOM("createPlaylistModal", false);

window.handleCreatePlaylistSubmit = async function(e) {
  e.preventDefault(); 
  const inp = document.getElementById("inputNewPlaylistName"), name = inp ? inp.value.trim() : ""; 
  if (!name) return;
  const btn = document.getElementById("btnSubmitNewPlaylist"); 
  if (btn) { btn.innerText = "Creating..."; btn.disabled = true; }
  try { 
    const existing = userPlaylists.find(p => p.playlist_name.trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      closeCreatePlaylistModal();
      showSelectionToast(`Playlist "${name}" already exists`);
      return;
    }
    const { error } = await supabaseClient
      .from("playlists")
      .insert({ student_roll: currentCandidate.roll_number, playlist_name: name, is_system_playlist: false, display_order: 10 });
    if (error) throw error;
    
    closeCreatePlaylistModal(); 
    await fetchPlaylistsAndCheckRollover(); 
    await renderHomePlaylists(); 
    
    // 🚀 NEW: नई बनी प्लेलिस्ट को तुरंत साफ़-सुथरे तरीके से Expand (Open) करें
    autoExpandPlaylistCard(name);

    if (selectedTestForPlaylist) {
      openPlaylistBottomSheet(selectedTestForPlaylist);
    }
  } catch(err) { 
    showAppNoticeModal("Playlist Error", "Could Not Create Playlist", err.message, "⚠️", "Retry", () => openCreatePlaylistModal(Boolean(selectedTestForPlaylist))); 
  } finally { 
    if (btn) { btn.innerText = "Create Playlist"; btn.disabled = false; } 
  }
};

window.promptNewPlaylist = () => openCreatePlaylistModal(false);
window.promptNewPlaylistFromSheet = () => openCreatePlaylistModal(true);

window.openPlaylistActionMenu = function(event, playlistId, playlistName, isSystem = false) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  closeThreeDotsMenu();
  let realId = playlistId;
  if (String(playlistId).startsWith('system_')) { 
    const matched = userPlaylists.find(p => p.playlist_name === playlistName); 
    realId = matched ? matched.id : playlistId; 
  }
  activePlaylistMenuTarget = { id: realId, name: playlistName, isSystem };

  const menu = document.getElementById("playlistActionMenu"), 
        overlay = document.getElementById("playlistActionMenuOverlay"), 
        btnEdit = document.getElementById("btnPlaylistActionEdit"), 
        btnClear = document.getElementById("btnPlaylistActionClear"),
        btnDel = document.getElementById("btnPlaylistActionDelete");

  if (!menu) return;

  if (isSystem) { 
    if (btnEdit) btnEdit.style.display = "none"; 
    if (btnClear) btnClear.style.display = "flex";
    if (btnDel) btnDel.style.display = "none"; 
  } else { 
    if (btnEdit) btnEdit.style.display = "flex"; 
    if (btnClear) btnClear.style.display = "flex";
    if (btnDel) btnDel.style.display = "flex"; 
  }

  const btnRect = event.currentTarget.getBoundingClientRect();
  menu.style.display = "block"; 
  menu.style.zIndex = "3200"; 
  if (overlay) { 
    overlay.style.display = "block"; 
    overlay.style.zIndex = "3100"; 
    overlay.style.pointerEvents = "auto"; 
    overlay.classList.add("open"); 
  }
  const menuWidth = 180; 
  let leftPos = btnRect.right - menuWidth; 
  if (leftPos < 10) leftPos = 10;
  let topPos = btnRect.bottom + 6; 
  if (topPos + 120 > window.innerHeight) topPos = Math.max(10, btnRect.top - 120);
  menu.style.top = `${topPos}px`; 
  menu.style.left = `${leftPos}px`;
};

window.closePlaylistActionMenu = function() {
  const menu = document.getElementById("playlistActionMenu"), overlay = document.getElementById("playlistActionMenuOverlay");
  if (menu) menu.style.display = "none";
  if (overlay) { 
    overlay.style.display = "none"; 
    overlay.style.pointerEvents = "none"; 
    overlay.classList.remove("open"); 
  }
  activePlaylistMenuTarget = null;
};

window.triggerEditPlaylistFromMenu = function() { 
  const t = activePlaylistMenuTarget; 
  closePlaylistActionMenu(); 
  if (!t || t.isSystem) return; 
  openEditPlaylistModal(t.id, t.name); 
};

window.triggerClearPlaylistFromMenu = function() {
  const t = activePlaylistMenuTarget;
  closePlaylistActionMenu();
  if (!t) return;
  openDeletePlaylistModal(t.id, t.name, true);
};

window.triggerDeletePlaylistFromMenu = function() { 
  const t = activePlaylistMenuTarget; 
  closePlaylistActionMenu(); 
  if (!t || t.isSystem) return; 
  openDeletePlaylistModal(t.id, t.name, false); 
};

window.openEditPlaylistModal = function(pId, pName) {
  const idIn = document.getElementById("editPlaylistId");
  const nameIn = document.getElementById("inputEditPlaylistName");
  if (idIn) idIn.value = pId; 
  if (nameIn) nameIn.value = pName;
  toggleModalDOM("editPlaylistModal", true);
  setTimeout(() => nameIn?.focus(), 60); 
};

window.closeEditPlaylistModal = () => toggleModalDOM("editPlaylistModal", false);

window.handleEditPlaylistSubmit = async function(e) {
  e.preventDefault(); 
  const pId = document.getElementById("editPlaylistId")?.value, newName = document.getElementById("inputEditPlaylistName")?.value.trim();
  if (!pId || !newName) return; 
  const btn = document.getElementById("btnSubmitEditPlaylist"); 
  if (btn) { btn.innerText = "Saving..."; btn.disabled = true; }
  try { 
    const { error } = await supabaseClient.from("playlists").update({ playlist_name: newName }).eq("id", pId); 
    if (error) throw error; 
    closeEditPlaylistModal(); 
    await fetchPlaylistsAndCheckRollover(); 
    await renderHomePlaylists(); 
  } catch (err) { 
    showAppNoticeModal("Update Error", "Failed to Rename Playlist", err.message, "⚠️", "Dismiss"); 
  } finally { 
    if (btn) { btn.innerText = "Save Changes"; btn.disabled = false; } 
  }
};

window.openDeletePlaylistModal = function(pId, pName, isClearOnly) {
  pendingDeleteTarget = { id: pId, name: pName, isClearOnly };
  const tEl = document.getElementById("deleteModalTitle"); 
  const hEl = document.getElementById("deleteModalHeading"); 
  const msgEl = document.getElementById("deleteModalMessage"); 
  const btn = document.getElementById("btnConfirmDeletePlaylist");

  if (isClearOnly) {
    if (tEl) tEl.innerText = `Clear ${pName}`; 
    if (hEl) hEl.innerText = `Clear all sets from ${pName}?`;
    if (msgEl) msgEl.innerText = `This will remove all queued question sets from "${pName}". The playlist container itself will remain intact.`;
    if (btn) { btn.innerText = "Yes, Clear Sets"; btn.onclick = confirmDeletePlaylist; }
  } else {
    if (tEl) tEl.innerText = "Delete Playlist"; 
    if (hEl) hEl.innerText = `Delete "${pName}"?`;
    if (msgEl) msgEl.innerText = `This playlist and all its queued items will be permanently deleted.`;
    if (btn) { btn.innerText = "Yes, Delete"; btn.onclick = confirmDeletePlaylist; }
  }
  toggleModalDOM("deletePlaylistConfirmModal", true);
};

window.closeDeletePlaylistModal = function() { 
  toggleModalDOM("deletePlaylistConfirmModal", false);
  pendingDeleteTarget = null; 
};

window.confirmDeletePlaylist = async function() {
  if (!pendingDeleteTarget) return; 
  const { id, isClearOnly } = pendingDeleteTarget, btn = document.getElementById("btnConfirmDeletePlaylist");
  if (btn) { btn.innerText = "Processing..."; btn.disabled = true; }
  try { 
    if (isClearOnly) { 
      const { error } = await supabaseClient.from("playlist_items").delete().eq("playlist_id", id).eq("student_roll", currentCandidate.roll_number); 
      if (error) throw error; 
    } else { 
      await supabaseClient.from("playlist_items").delete().eq("playlist_id", id); 
      const { error } = await supabaseClient.from("playlists").delete().eq("id", id); 
      if (error) throw error; 
    }
    closeDeletePlaylistModal(); 
    await fetchPlaylistsAndCheckRollover(); 
    await renderHomePlaylists(); 
  } catch (err) { 
    showAppNoticeModal("Error", "Action Failed", err.message, "⚠️", "Dismiss"); 
  } finally { 
    if (btn) btn.disabled = false; 
  }
};

// ==========================================================================
// 7. PRE-FLIGHT MISSION BRIEFING CONTROLLER (SUNDAY CRUCIBLE & SPEEDBUMP INTEGRATED)
// ==========================================================================

window.openMissionBriefingModal = async function(testId, bypassSundayCheck = false) {
  const isSun = typeof isSunday === 'function' ? isSunday() : (new Date().getDay() === 0);

  // 👑 Sunday Soft Friction: अनअटेम्प्टेड रेगुलर सेट्स पर जेंटल स्पीडबम्प (रिवीजन प्राथमिकता के लिए)
  if (isSun && testId > 0 && !bypassSundayCheck) {
    const isAtt = userAttemptHistory.some(a => String(a.test_id) === String(testId));
    if (!isAtt) {
      return showAppNoticeModal(
        "Revision Day Alert",
        "Sunday Revision Protocol",
        "Today is dedicated to Sunday Crucible Revision! Are you sure you want to tackle new territory before clearing your weekly backlog?",
        "👑",
        "Back to Crucible",
        () => switchView("viewDashboard"),
        "Continue Anyway",
        () => openMissionBriefingModal(testId, true)
      );
    }
  }

  activeBriefingTestId = testId;
  const modal = document.getElementById("missionBriefingModal");
  if (!modal) return;

  const shufToggle = document.getElementById("toggleShuffleMode");
  if (shufToggle) shufToggle.checked = isShuffleEnabled;

  // 🎯 Distinct Theme Toggler for Mistake Bank Modal
  const sheet = modal.querySelector(".mission-briefing-sheet");
  if (testId === -3) {
    if (sheet) sheet.classList.add("theme-mistake-briefing");
  } else {
    if (sheet) sheet.classList.remove("theme-mistake-briefing");
  }

  if (testId === -1) {
    // 🚀 TODAY'S PAYLOAD BOOSTER / SUNDAY CRUCIBLE EXAM
    const todayStr = getLocalDateString();
    const isBoosterAttempted = userAttemptHistory.some(a => Number(a.test_id) === -1 && getAttemptLocalDate(a.attempt_date) === todayStr);
    const poolLimit = isSun ? 100 : 25;
    const boosterQuestions = await compileMasteryBoosterPool(poolLimit, false, isBoosterAttempted);
    const qCount = boosterQuestions.length;

    if (qCount === 0) {
      return showAppNoticeModal(
        "Notice",
        "No Pending Reviews",
        isSun 
          ? "You have zero pending reviews and mistakes from this week! Outstanding job." 
          : "You have no pending mistakes or review questions right now. Attempt new sets from Library to fuel future booster reviews.",
        "🛡️",
        "Dismiss"
      );
    }

    const durationMins = Math.max(3, Math.ceil(qCount * 0.6));
    const mistakeCount = boosterQuestions.filter(q => q.isMistake).length;
    const recallCount = qCount - mistakeCount;
    
    // 🎯 APPROACH 2: DYNAMIC 70% THRESHOLD (MAX 50 Qs)
    const poolSize = qCount;
    const requiredThreshold = Math.min(50, Math.ceil(poolSize * 0.70));

    document.getElementById("briefingSubjectBadge").innerText = isSun ? "SUNDAY CRUCIBLE EXAM" : "BONUS MASTERY BOOSTER";
    const statusBadge = document.getElementById("briefingStatusBadge");
    const examCard = modal.querySelector(".briefing-mode-card.mode-exam");

    if (isBoosterAttempted) {
      statusBadge.className = "briefing-status-tag status-mastered";
      statusBadge.innerText = isSun ? "CRUCIBLE CONQUERED" : "COMPLETED TODAY";
      document.getElementById("briefingScoreMeta").innerText = "Today's quota completed • Practice modes active";
      if (examCard) {
        examCard.style.opacity = "0.45";
        examCard.style.pointerEvents = "none";
        examCard.setAttribute("title", "Exam Mode is locked: Completed for today.");
        const tag = examCard.querySelector(".briefing-mode-tag");
        if (tag) tag.innerText = "LOCKED (COMPLETED)";
      }
    } else {
      statusBadge.className = "briefing-status-tag status-progress";
      statusBadge.innerText = `${qCount} DUE`;
      
      // 🎯 Display clear target in briefing modal
      if (isSun) {
        document.getElementById("briefingScoreMeta").innerText = `Target: Min ${requiredThreshold} of ${poolSize} Qs for Streak`;
      } else {
        document.getElementById("briefingScoreMeta").innerText = `${mistakeCount} Mistakes • ${recallCount} Recall`;
      }

      if (examCard) {
        examCard.style.opacity = "1";
        examCard.style.pointerEvents = "auto";
        examCard.removeAttribute("title");
        const tag = examCard.querySelector(".briefing-mode-tag");
        if (tag) tag.innerText = "TCS SIMULATION";
      }
    }
    
    document.getElementById("briefingSetTitle").innerText = isSun ? "Weekly Backlog & Mastery Crucible" : "Mistakes & Active Retention Booster";
    document.getElementById("briefingDurationMeta").innerText = `⏱️ ${durationMins}m`;
    document.getElementById("briefingQuestionsMeta").innerText = `📄 ${qCount} Questions`;
  } else if (testId === -3) {
    // 🎯 DEDICATED SUBJECT MISTAKE BANK PRE-FLIGHT BRIEFING (POWERED BY TELEMETRY)
    const telemetry = getSubjectMistakeTelemetry(activeSubject);

    if (telemetry.inReviewCount === 0) {
      return showAppNoticeModal("Notice", "Zero Leaks", `No active mistakes found in ${activeSubject}.`, "🛡️", "Dismiss");
    }

    document.getElementById("briefingSubjectBadge").innerText = `${activeSubject.toUpperCase()} MISTAKE VAULT`;
    const statusBadge = document.getElementById("briefingStatusBadge");
    const examCard = modal.querySelector(".briefing-mode-card.mode-exam");

    if (telemetry.dueCount > 0) {
      statusBadge.className = "briefing-status-tag status-progress";
      statusBadge.innerText = `${telemetry.dueCount} DUE`;
      document.getElementById("briefingQuestionsMeta").innerText = `📄 ${telemetry.dueCount} Due (${telemetry.inReviewCount} In Pipeline)`;
      document.getElementById("briefingScoreMeta").innerText = `4-Stage Spaced Repetition Loop`;
      if (examCard) {
        examCard.style.opacity = "1";
        examCard.style.pointerEvents = "auto";
        examCard.removeAttribute("title");
        const tag = examCard.querySelector(".briefing-mode-tag");
        if (tag) tag.innerText = "TCS SIMULATION";
      }
    } else {
      // 🚀 EXAM MODE FREEZE (ONLY WHEN 0 DUE TODAY)
      statusBadge.className = "briefing-status-tag status-mastered";
      statusBadge.innerText = `0 DUE TODAY`;
      document.getElementById("briefingQuestionsMeta").innerText = `📄 0 Due (${telemetry.inReviewCount} In Pipeline)`;
      document.getElementById("briefingScoreMeta").innerText = `Today's quota completed • Practice modes active`;
      if (examCard) {
        examCard.style.opacity = "0.45";
        examCard.style.pointerEvents = "none";
        examCard.setAttribute("title", "Exam Mode is locked: 0 questions due today.");
        const tag = examCard.querySelector(".briefing-mode-tag");
        if (tag) tag.innerText = "LOCKED (0 DUE)";
      }
    }

    document.getElementById("briefingSetTitle").innerText = `${activeSubject} Error Rehabilitation Node`;
    document.getElementById("briefingDurationMeta").innerText = `⏱️ ${telemetry.durationMins}m`;
  } else {
    // 📁 REGULAR CATALOG QUESTION SET
    const setCat = catalogData.find(c => String(c.test_id) === String(testId));
    if (!setCat) return;

    const qCount = setCat.total_questions || 10;
    const durationMins = setCat.total_duration_minutes || 15;
    const attempts = userAttemptHistory.filter(a => String(a.test_id) === String(testId));
    const isAtt = attempts.length > 0;
    const bestScore = isAtt ? Math.max(...attempts.map(a => parseFloat(a.score))) : 0;
    const maxMarks = qCount * 2;
    const pct = (maxMarks > 0 && isAtt) ? (bestScore / maxMarks) * 100 : 0;

    document.getElementById("briefingSubjectBadge").innerText = (setCat.subject || activeSubject || "GENERAL STUDIES").toUpperCase();
    
    const statusBadge = document.getElementById("briefingStatusBadge");
    if (!isAtt) {
      statusBadge.className = "briefing-status-tag status-unattempted";
      statusBadge.innerText = "UNATTEMPTED";
    } else if (pct >= 100) {
      statusBadge.className = "briefing-status-tag status-mastered";
      statusBadge.innerText = `MASTERED ${bestScore}/${maxMarks}`;
    } else {
      statusBadge.className = "briefing-status-tag status-progress";
      statusBadge.innerText = `IN PROGRESS (${bestScore}/${maxMarks})`;
    }

    document.getElementById("briefingSetTitle").innerText = setCat.test_title || "Question Set";
    document.getElementById("briefingDurationMeta").innerText = `⏱️ ${durationMins}m`;
    document.getElementById("briefingQuestionsMeta").innerText = `📄 ${qCount} Questions`;
    document.getElementById("briefingScoreMeta").innerText = isAtt 
      ? `★ Best: ${bestScore}/${maxMarks} (${Math.round(pct)}%) • ${attempts.length} Att`
      : `★ Best: Untested`;
  }

  modal.style.setProperty("display", "flex", "important");
  modal.style.pointerEvents = "auto";
};

window.closeMissionBriefingModal = function() {
  const modal = document.getElementById("missionBriefingModal");
  if (modal) {
    modal.style.setProperty("display", "none", "important");
    modal.style.pointerEvents = "none";
    modal.querySelector(".mission-briefing-sheet")?.classList.remove("theme-mistake-briefing");
    
    // 🚀 Restore Exam card for other sets
    const examCard = modal.querySelector(".briefing-mode-card.mode-exam");
    if (examCard) {
      examCard.style.opacity = "1";
      examCard.style.pointerEvents = "auto";
      examCard.removeAttribute("title");
      const tag = examCard.querySelector(".briefing-mode-tag");
      if (tag) tag.innerText = "TCS SIMULATION";
    }
  }
  activeBriefingTestId = null;
};

window.executeBriefingMode = function(mode) {
  const tId = activeBriefingTestId;
  closeMissionBriefingModal();
  if (tId === null || tId === undefined) return;

  // Flashcard singular ko plural normalize karein taaki engine crash na ho
  const normalizedMode = (mode === 'flashcard' || mode === 'flashcards') ? 'flashcards' : mode;
  
  if (tId === -1) {
    launchBoosterMode(normalizedMode);
  } else if (tId === -3) {
    launchSubjectMistakeMode(normalizedMode);
  } else {
    if (normalizedMode === 'exam') {
      launchAssessment(tId);
    } else {
      launchPracticeMode(tId, normalizedMode);
    }
  }
};

// ==========================================================================
// 8. HOME DECK & PLAYLIST ENGINE (QUANTUM CORE BOOSTER & ANTI-DRIFT ROLLOVER)
// ==========================================================================
function getMilestoneBeaconHtml(count) {
  if (count >= 300) {
    return `
      <span class="milestone-beacon-pip beacon-tier-300" title="Apex Tier Conquered (300+ Qs)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
        </svg>
      </span>`;
  }
  if (count >= 200) {
    return `
      <span class="milestone-beacon-pip beacon-tier-200" title="Overdrive Tier (200+ Qs)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </span>`;
  }
  if (count >= 100) {
    return `
      <span class="milestone-beacon-pip beacon-tier-100" title="Target Lock Secured (100+ Qs)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="7"></circle>
          <line x1="12" y1="2" x2="12" y2="5"></line>
          <line x1="12" y1="19" x2="12" y2="22"></line>
          <line x1="2" y1="12" x2="5" y2="12"></line>
          <line x1="19" y1="12" x2="22" y2="12"></line>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
        </svg>
      </span>`;
  }
  return "";
}

function getMilestoneTelemetryHtml(attemptedCount = 0, masteredCount = 0, isSundayMode = false, isSundayHit = false) {
  const count = Number(attemptedCount) || 0;
  const mastered = Number(masteredCount) || 0;

  const svgTarget = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line></svg>`;
  const svgFlag = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`;
  const svgShield = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>`;
  const svgCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const svgLightning = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
  const svgFastForward = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>`;
  const svgDiamond = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"></path></svg>`;
  const svgStar = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

  if (isSundayMode) {
    return `
      <div class="honest-satellite-cluster">
        <span class="telemetry-pill pill-tier-crucible">${svgTarget} ${count} Qs</span>
        <span class="telemetry-pill pill-tier-crucible">${isSundayHit ? svgShield : svgFlag} ${isSundayHit ? 'CONQUERED' : 'CRUCIBLE'}</span>
      </div>
    `;
  }

  if (count < 100) {
    const deficit = Math.max(0, 100 - count);
    return `
      <div class="honest-satellite-cluster">
        <span class="telemetry-pill pill-tier-ascent">${svgTarget} ${count} / 100 Qs</span>
        <span class="telemetry-pill pill-tier-deficit">${svgFlag} ${deficit} REM</span>
      </div>
    `;
  }

  if (count < 200) {
    const surplus = count - 100;
    const rightContent = mastered > 0
      ? `${svgCheck} ${mastered} MAST (+${surplus})`
      : `${svgFlag} +${surplus} SURPLUS`;
    return `
      <div class="honest-satellite-cluster">
        <span class="telemetry-pill pill-tier-secured">${svgShield} 100 SECURED</span>
        <span class="telemetry-pill pill-tier-secured">${rightContent}</span>
      </div>
    `;
  }

  if (count < 300) {
    const buffer = count - 100;
    return `
      <div class="honest-satellite-cluster">
        <span class="telemetry-pill pill-tier-overdrive">${svgLightning} 200+ OVERDRIVE</span>
        <span class="telemetry-pill pill-tier-overdrive">${svgFastForward} +${buffer} BUFFER</span>
      </div>
    `;
  }

  const apexYield = count - 100;
  return `
    <div class="honest-satellite-cluster">
      <span class="telemetry-pill pill-tier-apex">${svgDiamond} 300+ APEX</span>
      <span class="telemetry-pill pill-tier-apex">${svgStar} +${apexYield} YIELD</span>
    </div>
  `;
}

window.toggleMilestoneVisibility = function() {
  const card = document.getElementById("dailyMilestoneCard");
  if (!card) return;

  const isCollapsed = card.classList.toggle("milestone-collapsed");
  appStorage.set("milestone_collapsed", isCollapsed ? "true" : "false");
};

async function mountDashboard(isInitialLoad = false) {
  const cName = document.getElementById("dashCandidateName"); 
  if (cName) cName.innerText = currentCandidate?.full_name || "Candidate";
  const rollEl = document.getElementById("dashCandidateRoll"); 
  if (rollEl) rollEl.innerText = "ROLL: " + (currentCandidate?.roll_number || "---");

  // 1. LocalStorage से 0ms Instant State Restore
  const roll = currentCandidate?.roll_number;
  if (roll) {
    const todayStr = getLocalDateString();
    const cachedPerf = appStorage.getJSON("cache_daily_perf_" + roll, null);
    if (cachedPerf && cachedPerf.target_date === todayStr) {
      dailyPerf = cachedPerf;
    } else if (cachedPerf) {
      // 🚀 Naya din shuru: Agar kal target hit tha toh streak barkarar rahegi, par aaj ka count 0 se shuru hoga
      const streakCarry = cachedPerf.is_century_hit ? (cachedPerf.streak_count || 0) : 0;
      dailyPerf = {
        student_roll: roll,
        target_date: todayStr,
        total_questions_attempted: 0,
        total_correct: 0,
        is_century_hit: false,
        streak_count: streakCarry,
        id: null
      };
    }
    userPlaylists = appStorage.getJSON("cache_playlists_" + roll, userPlaylists);
    userPlaylistItems = appStorage.getJSON("cache_playlist_items_" + roll, userPlaylistItems);
    catalogData = appStorage.getJSON("cache_catalog_data", catalogData);
  }

  // 👑 Sunday Golden UI & Header Sync (Immediate 0ms UI Swap)
  const isSun = isSunday();
  document.body.classList.toggle("sunday-mode", isSun);

  const pTag = document.getElementById("dashPortalTag") || document.querySelector("#viewDashboard .portal-tag");
  const pSub = document.getElementById("dashPortalSub") || document.querySelector("#viewDashboard .portal-sub");
  if (pTag) pTag.innerText = isSun ? "REVISION PROTOCOL" : "HOME";
  if (pSub) pSub.innerText = isSun ? "Sunday Crucible Deck" : "Execution Deck";

  const cIcon = document.getElementById("centuryIcon"), 
        cTitle = document.getElementById("centuryTitleText"), 
        cSub = document.getElementById("centurySubtitleText"),
        cMeter = document.getElementById("centuryLoadText");

  const cachedCount = dailyPerf?.total_questions_attempted || 0;
  const cachedCorrect = dailyPerf?.total_correct || 0;

  if (cIcon) cIcon.innerText = isSun ? "👑" : "🎯";
  if (cTitle) cTitle.innerText = isSun ? "Sunday Revision Target" : "Daily Milestone";
  if (cSub) {
    if (isSun) {
      cSub.innerText = "Weekly Backlog & Mastery Crucible";
    } else if (cachedCount >= 100) {
      cSub.innerText = `Scale: Total Attempted (${cachedCount} Qs) • Overdrive Active`;
    } else {
      cSub.innerText = "100-Question Target & Precision Barometer";
    }
  }

  // 🚀 0ms Anti-Flicker Badge & Hyperdrive Beam Initialization
  const isOverdriveInit = !isSun && cachedCount >= 100;
  const attFillInit = document.getElementById("centuryAttemptedFill");
  const masFillInit = document.getElementById("centuryMasteredFill");
  const capFillInit = document.getElementById("centuryCapacityFill");
  const trackInit = attFillInit?.parentElement || document.querySelector(".multi-tier-track") || document.querySelector(".century-progress-track");

  // Decouple Staging fill permanently
  if (capFillInit) capFillInit.style.display = "none";

  if (attFillInit && masFillInit) {
    if (cachedCount >= 100) {
      attFillInit.style.width = "100%";
      const masInitPct = cachedCount > 0 ? Math.min(100, Math.round((cachedCorrect / cachedCount) * 100)) : 0;
      masFillInit.style.width = masInitPct + "%";
    } else {
      attFillInit.style.width = Math.min(100, cachedCount) + "%";
      masFillInit.style.width = Math.min(cachedCount, cachedCorrect) + "%";
    }
  }

  // Hyperdrive dynamic physical beam mounting on track
  if (trackInit) {
    trackInit.classList.toggle("hyperdrive-active-track", isOverdriveInit);
    const existingBeam = trackInit.querySelector(".hyperdrive-physical-beam");
    if (isOverdriveInit) {
      if (!existingBeam) {
        const beamLayer = document.createElement("div");
        beamLayer.className = "hyperdrive-physical-beam";
        beamLayer.innerHTML = `<div class="hyperdrive-flare-head"></div>`;
        trackInit.appendChild(beamLayer);
      }
    } else if (existingBeam) {
      existingBeam.remove();
    }
  }

  // 🎯 1. Dedicated Slot mein Achievement Beacon mount karein
  const beaconSlot = document.getElementById("milestoneBeaconSlot");
  if (beaconSlot) {
    beaconSlot.innerHTML = getMilestoneBeaconHtml(cachedCount);
  }

  // 🎯 2. cMeter mein 4-Tier Crisp Telemetry Pills rahengi
  if (cMeter) {
    cMeter.innerHTML = getMilestoneTelemetryHtml(cachedCount, dailyPerf?.total_correct || 0, isSun, dailyPerf?.is_century_hit);
  }

  // 🚀 स्ट्रीक बैज को 0ms पर सही संख्या के साथ पेंट करें
  updateHeaderBadges();
  
  // स्क्रीन तुरंत बिना किसी लोडर के दिखेगी
  renderViewDOM('viewDashboard');
  if (catalogData.length > 0 && userPlaylists.length > 0) {
    renderHomePlaylists();
  }

  if (!history.state || history.state.page !== 'dashboard') {
    history.pushState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');
  }

  // 🚀 WATERFALL ELIMINATED: सभी कॉल्स एक साथ (Parallel) चलेंगी
  await Promise.allSettled([
    fetchPlaylistsAndCheckRollover(),
    fetchWeakQuestions(),
    fetchTestCatalog()
  ]);

  await renderHomePlaylists();

  const todayCard = document.getElementById("todayPayloadCard");
  if (todayCard) {
    todayCard.classList.remove("collapsed");
    todayCard.classList.add("expanded");
  }

  fetchStudentAnalytics(true);
  start5PMEngine();

  // 🚀 Restore Milestone Collapse State on Mount
  const isCollapsedSaved = appStorage.get("milestone_collapsed") === "true";
  const card = document.getElementById("dailyMilestoneCard");
  if (card && isCollapsedSaved) {
    card.classList.add("milestone-collapsed");
  }
}

async function fetchPlaylistsAndCheckRollover() {
  if (!currentCandidate) return; 
  const roll = currentCandidate.roll_number;
  try {
    let { data: pData, error: pErr } = await supabaseClient
      .from("playlists")
      .select("*")
      .eq("student_roll", roll)
      .order("display_order", { ascending: true });
    if (pErr) console.error("Playlists fetch error:", pErr);
    
    const required = [
      { name: 'Today', order: 1 }, 
      { name: 'Tomorrow', order: 2 }, 
      { name: 'This Week', order: 3 },
      { name: 'Starred Sets', order: 4 }
    ];
    let missing = [];
    if (!pData || pData.length === 0) {
      missing = required.map(r => ({ student_roll: roll, playlist_name: r.name, is_system_playlist: true, display_order: r.order }));
    } else {
      required.forEach(r => { 
        if (!pData.some(p => p.playlist_name === r.name)) {
          missing.push({ student_roll: roll, playlist_name: r.name, is_system_playlist: true, display_order: r.order }); 
        }
      });
    }
    if (missing.length > 0) {
      await supabaseClient.from("playlists").insert(missing);
      const { data: refData } = await supabaseClient
        .from("playlists")
        .select("*")
        .eq("student_roll", roll)
        .order("display_order", { ascending: true });
      pData = refData || pData || [];
    }

    const uniquePlaylists = [];
    const seenPlaylistNames = new Set();
    (pData || []).forEach(p => {
      const pNameKey = (p.playlist_name || "").trim().toLowerCase();
      if (!seenPlaylistNames.has(pNameKey)) {
        seenPlaylistNames.add(pNameKey);
        uniquePlaylists.push(p);
      }
    });
    userPlaylists = uniquePlaylists;

    const { data: piData } = await supabaseClient
      .from("playlist_items")
      .select("*")
      .eq("student_roll", roll);
    const uniqueItems = [];
    const seenItemKeys = new Set();
    (piData || []).forEach(item => {
      const key = `${item.playlist_id}_${item.test_id}`;
      if (!seenItemKeys.has(key)) {
        seenItemKeys.add(key);
        uniqueItems.push(item);
      }
    });
    userPlaylistItems = uniqueItems;

    const todayStr = getLocalDateString();
    
    // 🚀 Sirf candidate ke attempts query honge
    const { data: todayAttRows } = await supabaseClient
      .from("test_attempts")
      .select("test_id, total_correct, total_incorrect, attempt_date")
      .eq("student_roll", roll);

    // 🚀 FIX: getAttemptLocalDate ensures local date match (No timezone drop)
    const uniqueSetsAttemptedToday = new Map();
    (todayAttRows || []).forEach(a => {
      const attDate = getAttemptLocalDate(a.attempt_date);
      const tid = Number(a.test_id);
      if (attDate === todayStr && (tid > 0 || (tid === -1 && isSunday()))) {
        const attemptedInRun = (a.total_correct || 0) + (a.total_incorrect || 0);
        const prevAttempted = uniqueSetsAttemptedToday.get(tid) || 0;
        if (attemptedInRun > prevAttempted) {
          uniqueSetsAttemptedToday.set(tid, attemptedInRun);
        }
      }
    });

    const actualExamAttemptedToday = Array.from(uniqueSetsAttemptedToday.values()).reduce((sum, q) => sum + q, 0);

    let { data: dpData } = await supabaseClient
      .from("daily_performance")
      .select("*")
      .eq("student_roll", roll)
      .eq("target_date", todayStr)
      .maybeSingle();

    const isSun = isSunday();

    const targetHitToday = isSun 
      ? Boolean(dpData?.is_century_hit) 
      : (actualExamAttemptedToday >= 100);

    const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
    const { data: yData } = await supabaseClient
      .from("daily_performance")
      .select("streak_count, is_century_hit")
      .eq("student_roll", roll)
      .eq("target_date", yesterday)
      .maybeSingle();

    const baseStreak = (yData && yData.is_century_hit) ? (yData.streak_count || 0) : 0;
    const correctStreakToday = targetHitToday ? (baseStreak + 1) : baseStreak;

    // 🎯 GROUND TRUTH FIX: Hamesha actual database attempts ko hi maanein
    const resolvedAttempted = actualExamAttemptedToday;
    const resolvedHit = targetHitToday;

    if (dpData) {
      if (
        dpData.total_questions_attempted !== resolvedAttempted || 
        dpData.is_century_hit !== resolvedHit ||
        dpData.streak_count !== correctStreakToday
      ) {
        dpData.total_questions_attempted = resolvedAttempted;
        dpData.is_century_hit = resolvedHit;
        dpData.streak_count = correctStreakToday;

        await supabaseClient.from("daily_performance").update({
          total_questions_attempted: resolvedAttempted,
          is_century_hit: resolvedHit,
          streak_count: correctStreakToday
        }).eq("id", dpData.id);
      }
      dailyPerf = dpData;
    } else {
      const { data: insData } = await supabaseClient.from("daily_performance").insert({ 
        student_roll: roll, 
        target_date: todayStr, 
        total_questions_attempted: resolvedAttempted, 
        is_century_hit: resolvedHit,
        streak_count: correctStreakToday 
      }).select().single();
      if (insData) dailyPerf = insData;
    }

    updateHeaderBadges();

    appStorage.setJSON("cache_daily_perf_" + roll, dailyPerf);
    appStorage.setJSON("cache_playlists_" + roll, userPlaylists);
    appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);

    // 🚀 Date-Aware Smart Rollover Engine (Only Truly Unattempted Sets go to Backlog)
    const serverLastRollover = currentCandidate?.last_rollover_date;
    if (serverLastRollover !== todayStr && !isSunday()) {
      const todayList = userPlaylists.find(p => p.playlist_name === 'Today');
      const tomorrowList = userPlaylists.find(p => p.playlist_name === 'Tomorrow');
      const weekList = userPlaylists.find(p => p.playlist_name === 'This Week');

      if (todayList && tomorrowList) {
        const targetRolloverDate = serverLastRollover || getLocalDateString(new Date(Date.now() - 86400000));
        const todayItems = userPlaylistItems.filter(pi => String(pi.playlist_id) === String(todayList.id));
        const weekItemTestIds = new Set(
          userPlaylistItems
            .filter(pi => weekList && String(pi.playlist_id) === String(weekList.id))
            .map(pi => String(pi.test_id))
        );

        const testIdsToDelete = [];
        const testIdsToBacklog = [];

        todayItems.forEach(item => {
          const tid = String(item.test_id);
          // Check if set was attempted on the rollover date or today
          const wasAttemptedOnDate = (todayAttRows || []).some(a => 
            String(a.test_id) === tid && 
            (getAttemptLocalDate(a.attempt_date) === targetRolloverDate || getAttemptLocalDate(a.attempt_date) === todayStr)
          );

          if (wasAttemptedOnDate || weekItemTestIds.has(tid)) {
            // Attempted or already in backlog: Dismiss from Today without polluting backlog
            testIdsToDelete.push(item.test_id);
          } else {
            // Truly unattempted on that day: Move to This Week Backlog
            testIdsToBacklog.push(item.test_id);
          }
        });

        if (testIdsToDelete.length > 0) {
          await supabaseClient
            .from("playlist_items")
            .delete()
            .eq("playlist_id", todayList.id)
            .eq("student_roll", roll)
            .in("test_id", testIdsToDelete);
        }

        if (testIdsToBacklog.length > 0 && weekList) {
          await supabaseClient
            .from("playlist_items")
            .update({ playlist_id: weekList.id, is_rollover: true })
            .eq("playlist_id", todayList.id)
            .eq("student_roll", roll)
            .in("test_id", testIdsToBacklog);
        }

        await supabaseClient
          .from("playlist_items")
          .update({ playlist_id: todayList.id })
          .eq("playlist_id", tomorrowList.id)
          .eq("student_roll", roll);
      }

      await supabaseClient.from("students").update({ last_rollover_date: todayStr }).eq("roll_number", roll);
      if (currentCandidate) currentCandidate.last_rollover_date = todayStr;

      const { data: piData2 } = await supabaseClient.from("playlist_items").select("*").eq("student_roll", roll);
      userPlaylistItems = piData2 || [];
      appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);
    }
  } catch (error) { 
    console.error("Playlist Init Error:", error); 
  }
}

// 🚀 REVISION & MISTAKE POOL COMPILER (CLOSED-LOOP SPACED RECALL PRIORITY QUEUE)
async function compileMasteryBoosterPool(maxLimit = 25, forceRefresh = false, allowAllWeak = false) {
  if (!forceRefresh && cachedBoosterPool && (Date.now() - lastBoosterFetchTime < 15000)) {
    return cachedBoosterPool;
  }

  let assembled = [];
  const seenIds = new Set();
  const now = new Date();

  // 1. केवल वही गलतियाँ जो आज के लिए ड्यू (Due) हैं
  const mistakePool = userWeakQuestions.filter(q => 
    q.times_wrong > 0 && 
    (q.mastery_streak || 0) < 4 && 
    (allowAllWeak || !q.next_review_at || new Date(q.next_review_at) <= now)
  );

  // 🎯 INTELLIGENT SRS PRIORITY SORTING:
  // Priority 1: ताज़ा गलतियाँ (Streak 0) सबसे पहले (Newest Errors First)
  // Priority 2: पाइपलाइन रिव्यु (Streak 1-3) - छोटा स्ट्रीक पहले, फिर Overdue तारीख
  // Priority 3: टाइम्स रॉन्ग टाई-ब्रेकर
  mistakePool.sort((a, b) => {
    const streakA = a.mastery_streak || 0;
    const streakB = b.mastery_streak || 0;

    // Fresh Mistakes (Streak 0) को सर्वोच्च प्राथमिकता
    if (streakA === 0 && streakB !== 0) return -1;
    if (streakB === 0 && streakA !== 0) return 1;

    // दोनों Fresh हैं तो जो सबसे ताज़ा है वो पहले आएगा
    if (streakA === 0 && streakB === 0) {
      const dateA = new Date(a.last_attempt_date || 0);
      const dateB = new Date(b.last_attempt_date || 0);
      return dateB - dateA;
    }

    // दोनों पाइपलाइन में हैं: Streak 1 पहले, फिर Streak 2, फिर 3
    if (streakA !== streakB) return streakA - streakB;
    const revA = new Date(a.next_review_at || 0);
    const revB = new Date(b.next_review_at || 0);
    if (revA.getTime() !== revB.getTime()) return revA - revB;

    return (b.times_wrong || 0) - (a.times_wrong || 0);
  });

  mistakePool.slice(0, maxLimit).forEach(item => {
    const qd = item.question_data || {};
    const qid = String(item.question_id || qd.id);
    if (!seenIds.has(qid)) {
      seenIds.add(qid);
      const opts = parseQuestionOptions(qd.options);
      assembled.push({
        id: qid,
        subject: item.subject || qd.subject || "General Studies",
        content: qd.content,
        options: opts,
        correctAnswer: getNormalizedCorrectAnswerId(qd.correct_answer || qd.correctAnswer, opts),
        explanation: qd.explanation,
        isMistake: true
      });
    }
  });

  // 2. यदि गलतियाँ 25 से कम हैं, तो बचे हुए स्लॉट एक्टिव रिकॉल से भरेंगे
  const remainingNeeded = maxLimit - assembled.length;
  if (remainingNeeded > 0 && currentCandidate?.roll_number) {
    try {
      const { data: recallRows, error: rpcErr } = await supabaseClient.rpc('get_retention_pool', {
        p_roll: currentCandidate.roll_number,
        p_needed: remainingNeeded
      });

      if (rpcErr) throw rpcErr;

      if (recallRows && recallRows.length > 0) {
        recallRows.forEach(q => {
          const qid = String(q.id);
          if (!seenIds.has(qid)) {
            seenIds.add(qid);
            const opts = parseQuestionOptions(q.options);
            assembled.push({
              id: qid,
              subject: q.subject || "General Studies",
              content: q.content,
              options: opts,
              correctAnswer: getNormalizedCorrectAnswerId(q.correct_answer, opts),
              explanation: q.explanation,
              isMistake: false
            });
          }
        });
      }
    } catch (err) {
      console.error("Database retention pool RPC error:", err);
    }
  }

  const result = assembled.map((q, idx) => ({ ...q, qNum: idx + 1 }));
  cachedBoosterPool = result;
  lastBoosterFetchTime = Date.now();
  return result;
}

window.launchBoosterMode = async function(mode = 'exam') {
  const isSun = isSunday();
  const todayStr = getLocalDateString();
  const isBoosterAttempted = userAttemptHistory.some(a => Number(a.test_id) === -1 && getAttemptLocalDate(a.attempt_date) === todayStr);

  if (mode === 'exam' && isBoosterAttempted) {
    return showAppNoticeModal(
      "Exam Mode Locked",
      "Completed for Today",
      "You have already completed today's official Booster Exam session. You can continue practicing in Quiz, Flashcard, or Read mode!",
      "🛡️",
      "Dismiss"
    );
  }

  let boosterQuestions = await compileMasteryBoosterPool(isSun ? 100 : 25, true, isBoosterAttempted);
  if (!boosterQuestions.length) {
    return showAppNoticeModal("Notice", "No Pending Reviews", "You have no pending mistakes or review questions right now.", "⚪", "Dismiss");
  }

  if (isShuffleEnabled) {
    boosterQuestions = shuffleArray(boosterQuestions);
    boosterQuestions.forEach((q, idx) => { q.qNum = idx + 1; });
  }

  const qCount = boosterQuestions.length;

  if (mode === 'exam') {
    const boosterDuration = isSun 
      ? Math.min(60, Math.max(15, Math.ceil(qCount * 0.6))) 
      : Math.max(3, Math.ceil(qCount * 0.6));

    mountExamSession({
      id: -1,
      title: isSun ? "Sunday Crucible Exam" : "Bonus Mastery Booster",
      subject: isSun ? "Sunday Crucible" : "Bonus Booster",
      total_duration_minutes: boosterDuration
    }, boosterQuestions, isSun ? 'Weekly Backlog Clearance' : 'Active Review');
  } else {
    // 🚀 Record active context for one-way exam switcher routing
    currentPracticeContext = { type: 'booster' };

    practiceQuestions = boosterQuestions;
    const tEl = document.getElementById("practiceSetTitle");
    const subEl = document.getElementById("practiceMetaSub");
    const boosterTitle = isSun ? "Sunday Crucible" : "Bonus Mastery Booster";

    if (tEl) {
      tEl.innerText = boosterTitle;
      tEl.title = boosterTitle;
    }
    if (subEl) {
      subEl.innerText = `${isSun ? 'Weekly Backlog' : 'Mistakes & Recall'} • ${qCount} Questions`;
    }

    switchView("viewPractice", true);
    window.setPracticeMode(mode);
  }
};

// 🚀 1. PURE SET SCORE & TELEMETRY CALCULATOR (SINGLE SOURCE OF TRUTH)
function getSetScoreMeta(testId, defaultQuestions = 10) {
  const c = catalogData.find(x => String(x.test_id) === String(testId));
  const qCount = c ? (c.total_questions || defaultQuestions) : defaultQuestions;
  const maxMarks = qCount * 2;
  const duration = c ? (c.total_duration_minutes || 15) : 15;
  const title = c ? c.test_title : "Question Set";

  const attempts = userAttemptHistory.filter(a => String(a.test_id) === String(testId));
  const isAtt = attempts.length > 0;
  const bestScore = isAtt ? Math.max(...attempts.map(a => parseFloat(a.score))) : 0;
  const bestPct = (maxMarks > 0 && isAtt) ? (bestScore / maxMarks) * 100 : 0;
  const status = isAtt ? (bestPct >= 100 ? 'mastered' : 'revise') : 'unattempted';

  return { setCat: c, testId, title, qCount, maxMarks, duration, attempts, isAtt, bestScore, bestPct, status };
}

// 🚀 2. UNIVERSAL ATOMIC SET TILE BUILDER (DASHBOARD & LIBRARY UNIFIED)
function renderSetTileHtml(setOrItem, options = {}) {
  const testId = setOrItem.test_id;
  const meta = getSetScoreMeta(testId);
  const setCat = meta.setCat || setOrItem;
  if (!setCat) return "";

  const isRoll = (setOrItem.is_rollover || options.isRollover) ? `<span class="set-rollover-tag">⚠️ ROLLOVER</span>` : '';
  
  let badgeHtml = '';
  let historyHtml = '<span style="color:var(--text-muted);">Not attempted yet</span>';

  if (meta.isAtt && meta.attempts.length > 0) {
    const latestScore = parseFloat(meta.attempts[0].score);
    const latestPct = meta.maxMarks > 0 ? (latestScore / meta.maxMarks) * 100 : 0;
    const formattedLatest = Number.isInteger(latestScore) ? latestScore : latestScore.toFixed(1);

    let latestStyle = "background:var(--warning-bg-subtle); color:var(--warning-dark); border:1px solid var(--warning-border);";
    if (latestPct >= 100) {
      latestStyle = "background:var(--success-bg-subtle); color:var(--success-dark); border:1px solid var(--success-border);";
    } else if (latestPct < 50) {
      latestStyle = "background:var(--danger-bg-subtle); color:var(--danger-dark); border:1px solid var(--danger-border);";
    }
    badgeHtml = `<div class="set-status-badge" style="${latestStyle}">${formattedLatest}/${meta.maxMarks}</div>`;

    const formattedBest = Number.isInteger(meta.bestScore) ? meta.bestScore : meta.bestScore.toFixed(1);
    let bestColor = 'var(--warning-dark)';
    if (meta.bestPct >= 100) bestColor = 'var(--success-dark)';
    else if (meta.bestPct < 50) bestColor = 'var(--danger-dark)';

    historyHtml = `<span style="color:${bestColor}; font-weight:700;">★ Best: ${formattedBest}/${meta.maxMarks} (${Math.round(meta.bestPct)}%) | Att: ${meta.attempts.length}</span>`;
  }

  const isStagingMode = options.isLibrary && librarySelectionMode;
  let headerActions = '';
  let footerAction = '';

  if (isStagingMode) {
    const inTarget = targetPlaylistForSelection && userPlaylistItems.some(pi => pi.playlist_id === targetPlaylistForSelection.id && String(pi.test_id) === String(testId));
    headerActions = badgeHtml;
    footerAction = `
      <button type="button" class="btn-bookmark-stage ${inTarget ? 'saved' : ''}" id="btnStage_${testId}" onclick="toggleDirectStaging(${testId})">
        ${inTarget ? bookmarkFilledSvg : bookmarkOutlineSvg}
        <span class="stage-label">${inTarget ? 'Saved to playlist' : 'Save to playlist'}</span>
      </button>
    `;
  } else {
    const starredPl = userPlaylists.find(p => p.playlist_name === 'Starred Sets');
    const isStarred = starredPl && userPlaylistItems.some(pi => pi.playlist_id === starredPl.id && String(pi.test_id) === String(testId));
    const pIdArg = options.playlistId ? `'${options.playlistId}'` : 'null';
    const pNameArg = options.playlistName ? `'${options.playlistName.replace(/'/g, "\\'")}'` : 'null';

    headerActions = `
      ${badgeHtml}
      <button type="button" class="btn-star-set ${isStarred ? 'starred' : ''}" data-test-id="${testId}" onclick="toggleStarSet(event, ${testId})" title="${isStarred ? 'Unstar set' : 'Star set'}">
        ${starIconSvg}
      </button>
      <button type="button" class="btn-three-dots" onclick="openThreeDotsMenu(event, ${testId}, ${pIdArg}, ${pNameArg})" title="Options">⋮</button>
    `;
    footerAction = `
      <div class="set-action-footer">
        <button type="button" class="btn-launch-set" onclick="openMissionBriefingModal(${testId})">
          <span>▶</span> <span>${meta.isAtt ? 'Retake / Review' : 'Start Session'}</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="set-tile" data-test-id="${testId}" data-status="${meta.status}">
      <div class="set-tile-header">
        <div class="set-tile-title-group">
          ${isRoll}
          <div class="set-tile-title">${meta.title}</div>
        </div>
        <div style="display:flex; gap: 6px; align-items: center; flex-shrink: 0;">
          ${headerActions}
        </div>
      </div>
      <div class="set-tile-meta"><span>${clockSvg} ${meta.duration}m</span><span>${docSvg} ${meta.qCount} Qs</span></div>
      <div class="set-score-info">${historyHtml}</div>
      ${footerAction}
    </div>
  `;
}

// 🔒 100% Backward-Compatible Wrapper for Dashboard/Playlists (YouTube-Style Swipe-to-Remove)
function renderPlaylistSetTileHtml(item, pName) {
  const tileHtml = renderSetTileHtml(item, { isRollover: item.is_rollover, isLibrary: false, playlistId: item.playlist_id, playlistName: pName });
  const pId = item.playlist_id;
  const tId = item.test_id;

  return `
    <div class="swipe-item-wrapper" data-test-id="${tId}" data-playlist-id="${pId}">
      <div class="swipe-action-backdrop" onclick="executeSwipeRemove('${pId}', ${tId}, '${pName.replace(/'/g, "\\'")}', this)">
        <span class="swipe-action-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
          <span>Remove</span>
        </span>
      </div>
      ${tileHtml}
    </div>
  `;
}

// 🚀 REUSABLE FLIP REMOVE ENGINE (Instantly hides target & smoothly glides siblings up)
function animateAndRemoveWrapper(wrapper, onComplete) {
  if (!wrapper || !wrapper.parentElement) {
    if (onComplete) onComplete();
    return;
  }
  const container = wrapper.parentElement;
  const siblings = Array.from(container.children).filter(child => child !== wrapper && child.nodeType === 1);

  const firstPositions = new Map();
  siblings.forEach(child => {
    firstPositions.set(child, child.getBoundingClientRect());
  });

  wrapper.style.display = 'none';

  siblings.forEach(child => {
    const firstRect = firstPositions.get(child);
    const lastRect = child.getBoundingClientRect();
    const deltaX = firstRect.left - lastRect.left;
    const deltaY = firstRect.top - lastRect.top;

    if (deltaX !== 0 || deltaY !== 0) {
      child.style.transition = 'none';
      child.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      siblings.forEach(child => {
        child.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)';
        child.style.transform = '';
      });
    });
  });

  setTimeout(() => {
    siblings.forEach(child => { child.style.transition = ''; });
    if (onComplete) onComplete();
  }, 280);
}

window.executeSwipeRemove = async function(pId, testId, pName, el) {
  const wrapper = el?.closest('.swipe-item-wrapper') || document.querySelector(`.swipe-item-wrapper[data-playlist-id="${pId}"][data-test-id="${testId}"]`);
  lastRemovedPayload = { pId, testId, pName };

  const undoAction = async () => {
    if (!lastRemovedPayload) return;
    const { pId: undoPid, testId: undoTid, pName: undoPname } = lastRemovedPayload;
    await togglePlaylistMembership(undoPid, undoTid, false);
    showSelectionToast(`Restored to "${undoPname}"`);
    lastRemovedPayload = null;
  };

  if (wrapper) {
    animateAndRemoveWrapper(wrapper, async () => {
      await togglePlaylistMembership(pId, testId, true);
      showSelectionToast(`Removed from "${pName}"`, undoAction);
    });
  } else {
    await togglePlaylistMembership(pId, testId, true);
    showSelectionToast(`Removed from "${pName}"`, undoAction);
  }
};

// ⭐ 1-TAP STAR SET CONTROLLER (Ensures Header Star Button Works)
window.toggleStarSet = async function(event, testId) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  const starredList = userPlaylists.find(p => p.playlist_name === 'Starred Sets');
  if (!starredList || !currentCandidate) return;
  const inList = userPlaylistItems.some(pi => pi.playlist_id === starredList.id && String(pi.test_id) === String(testId));
  await togglePlaylistMembership(starredList.id, testId, inList);
};

function getPlaylistAddBtnHtml(pId, pName) {
  return `<button type="button" class="btn-create-playlist-trigger" style="margin-top: 10px; grid-column: 1 / -1;" onclick="enableLibrarySelectionMode('${pId}', '${pName.replace(/'/g, "\\'")}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add Sets to ${pName}</span></button>`;
}

// 🚀 ATOMIC SECONDARY PLAYLIST CONTAINER RENDERER (DRY ENGINE)
function renderSecondaryPlaylistStream(playlistName, containerId, countPillId, cardId, emptyMessage, cachedScroll = 0) {
  const container = document.getElementById(containerId);
  const badge = document.getElementById(countPillId);
  const playlist = userPlaylists.find(p => p.playlist_name === playlistName);
  if (!playlist || !container) return;

  const items = userPlaylistItems.filter(pi => pi.playlist_id === playlist.id);
  const prevScroll = cachedScroll || container.scrollTop;

  const setsHtml = items.length > 0
    ? items.map(i => renderPlaylistSetTileHtml(i, playlistName)).join("")
    : `<div style="text-align:center; padding:18px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;">${emptyMessage}</div>`;

  container.innerHTML = setsHtml + getPlaylistAddBtnHtml(playlist.id, playlistName);
  container.scrollTop = prevScroll;

  if (badge) badge.innerText = `${items.length} Sets ▼`;

  const header = document.querySelector(`#${cardId} .playlist-header`);
  if (header) header.onclick = () => window.toggleSecondaryPlaylist(header);
}



async function renderHomePlaylists() {
  if (isRenderingPlaylists) {
    pendingPlaylistRender = true;
    return;
  }
  isRenderingPlaylists = true;

  try {
    const todayContainer = document.getElementById("todayPlaylistContainer"), 
          tomorrowContainer = document.getElementById("tomorrowPlaylistContainer"), 
          weekContainer = document.getElementById("weekPlaylistContainer"), 
          starredContainer = document.getElementById("starredPlaylistContainer"),
          customContainer = document.getElementById("customPlaylistsContainer");

    if (!todayContainer || !tomorrowContainer || !weekContainer) return;

    // 🚀 1. CACHE SCROLL POSITIONS BEFORE WIPING TO PREVENT JUMPING
    const todayScrollParent = todayContainer.closest('.playlist-sets-stream') || todayContainer;
    const scrollMap = {
      today: todayScrollParent.scrollTop,
      tomorrow: tomorrowContainer.scrollTop,
      week: weekContainer.scrollTop,
      starred: starredContainer ? starredContainer.scrollTop : 0
    };

    todayContainer.innerHTML = ""; 
    tomorrowContainer.innerHTML = ""; 
    weekContainer.innerHTML = ""; 
    if (starredContainer) starredContainer.innerHTML = "";

    // 🚀 2. COMPILE BOOSTER TILE HTML
    let boosterTileHtml = "";
    const isSun = isSunday();
    const todayStr = getLocalDateString();
    const boosterAttemptedToday = userAttemptHistory.some(a => Number(a.test_id) === -1 && getAttemptLocalDate(a.attempt_date) === todayStr);
    const boosterLimit = isSun ? 100 : 25;
    const boosterQuestions = await compileMasteryBoosterPool(boosterLimit, false, boosterAttemptedToday);
    const qCount = boosterQuestions.length;
    const tileTitle = isSun ? "Sunday Crucible Exam" : "Bonus Mastery Booster";
    const tileThemeClass = isSun ? "sunday-crucible-tile" : "";

    if (boosterAttemptedToday) {
      boosterTileHtml = `
        <div class="set-tile dynamic-revision-tile ${tileThemeClass} state-clean">
          <div class="set-tile-header">
            <div class="set-tile-title-group">
              <div class="set-tile-title">${tileTitle}</div>
            </div>
            <div style="display:flex; gap: 6px; align-items: center; flex-shrink: 0;">
              <span class="set-status-badge status-mastered" style="background:var(--success-bg-subtle); color:var(--success-dark); border:1px solid var(--success-border); font-weight:800;">${isSun ? 'Crucible Done 👑' : 'Quota Met ✓'}</span>
            </div>
          </div>
          <div class="set-tile-meta">
            <span>${clockSvg} Done</span>
            <span>${docSvg} ${qCount} Qs</span>
            <span style="font-size:10px; color:var(--success); font-weight:700;">(Spaced Recall)</span>
          </div>
          <div class="set-score-info" style="display: block !important; overflow: visible !important; white-space: normal !important; line-height: 1.55 !important; padding-top: 4px !important; margin-bottom: 12px !important; min-height: auto !important;">
            <span style="color:var(--success); font-weight:600; display: inline-block;">✓ Today's quota completed!</span>
          </div>
          <div class="set-action-footer">
            <button type="button" class="btn-launch-set btn-booster-review" style="background: linear-gradient(135deg, #15803d, #16a34a) !important; color: #ffffff !important; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3) !important;" onclick="openMissionBriefingModal(-1)">
              <span>📖</span> <span style="color:#ffffff !important; font-weight:700;">Review & Practice</span>
            </button>
          </div>
        </div>
      `;
    } else if (qCount === 0) {
      boosterTileHtml = `
        <div class="set-tile dynamic-revision-tile ${tileThemeClass} state-clean">
          <div class="set-tile-header">
            <div class="set-tile-title-group">
              <div class="set-tile-title">${tileTitle}</div>
            </div>
            <div style="display:flex; gap: 6px; align-items: center; flex-shrink: 0;">
              <span class="clean-slate-pill">0 Due • All Clear</span>
            </div>
          </div>
          <div class="set-tile-meta">
            <span>${clockSvg} 0m</span>
            <span>${docSvg} 0 Qs</span>
            <span style="font-size:10px; color:var(--success-dark); font-weight:700;">(100% Spaced Review Sync)</span>
          </div>
          <div class="set-score-info" style="display: block !important; overflow: visible !important; white-space: normal !important; line-height: 1.55 !important; padding-top: 4px !important; margin-bottom: 12px !important;">
            <span style="color:var(--success-dark); font-weight:600; display: inline-block;">✓ Mistake Bank Cleared • Zero Reviews Due</span>
          </div>
          <div class="set-action-footer">
            <button type="button" class="btn-launch-set" disabled title="All reviews optimal. Attempt new questions from Library.">
              <span>🛡️</span> <span>System Optimal</span>
            </button>
          </div>
        </div>
      `;
    } else {
      const durationMins = Math.max(3, Math.ceil(qCount * 0.6));
      const mistakeCount = boosterQuestions.filter(q => q.isMistake).length;
      const recallCount = qCount - mistakeCount;
      const poolDetail = mistakeCount > 0 && recallCount > 0 
        ? `${mistakeCount} Mistakes • ${recallCount} Active Recall` 
        : (mistakeCount > 0 ? `${mistakeCount} Mistakes for Review` : `${recallCount} Active Recall Questions`);

      boosterTileHtml = `
        <div class="set-tile dynamic-revision-tile ${tileThemeClass} state-active">
          <div class="set-tile-header">
            <div class="set-tile-title-group">
              <div class="set-tile-title">${tileTitle}</div>
            </div>
            <div style="display:flex; gap: 6px; align-items: center; flex-shrink: 0;">
              <div class="set-status-badge status-progress" style="background:var(--warning-bg-subtle); color:var(--warning-dark); border:1px solid var(--warning-border);">
                ${qCount} Due
              </div>
            </div>
          </div>
          <div class="set-tile-meta">
            <span>${clockSvg} ${durationMins}m</span>
            <span>${docSvg} ${qCount} Qs</span>
            <span style="font-size:10px; color:var(--warning); font-weight:700;">(${isSun ? 'Weekly Backlog Clearance' : 'Bonus • Excluded from 100-Q Target'})</span>
          </div>
          <div class="set-score-info" style="display: block !important; overflow: visible !important; white-space: normal !important; line-height: 1.55 !important; padding-top: 4px !important; margin-bottom: 12px !important;">
            <span style="color:var(--warning-dark); font-weight:700; display: inline-block;">⚡ ${poolDetail}</span>
          </div>
          <div class="set-action-footer">
            <button type="button" class="btn-launch-set" onclick="openMissionBriefingModal(-1)">
              <span>${isSun ? '⚔️' : '▶'}</span> <span>${isSun ? 'Launch Sunday Crucible' : 'Start Booster Session'}</span>
            </button>
          </div>
        </div>
      `;
    }

    // 🚀 3. RENDER TODAY'S PAYLOAD DIRECTLY
    let todayLoad = 0, tomorrowLoad = 0;
    const todayList = userPlaylists.find(p => p.playlist_name === 'Today'), 
          tomorrowList = userPlaylists.find(p => p.playlist_name === 'Tomorrow'), 
          weekList = userPlaylists.find(p => p.playlist_name === 'This Week'),
          starredList = userPlaylists.find(p => p.playlist_name === 'Starred Sets');

    if (todayList) {
      const items = userPlaylistItems.filter(pi => pi.playlist_id === todayList.id);
      items.forEach(i => {
        const c = catalogData.find(x => String(x.test_id) === String(i.test_id));
        todayLoad += c ? (c.total_questions || 10) : 10;
      });
      
      const setsHtml = items.length > 0 
        ? items.map(i => renderPlaylistSetTileHtml(i, 'Today')).join("") 
        : `<div style="text-align:center; padding:18px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;">No sets queued for today yet.</div>`;
      
      todayContainer.innerHTML = boosterTileHtml + setsHtml + getPlaylistAddBtnHtml(todayList.id, 'Today');
      todayScrollParent.scrollTop = scrollMap.today;
      const pill = document.getElementById("todayCountPill"); 
      if (pill) pill.innerText = `${items.length} Sets ▼`;
    }

    // 🚀 4. ATOMIC SECONDARY PLAYLIST RENDERING VIA HELPER
    if (tomorrowList) {
      const items = userPlaylistItems.filter(pi => pi.playlist_id === tomorrowList.id);
      items.forEach(i => {
        const c = catalogData.find(x => String(x.test_id) === String(i.test_id));
        tomorrowLoad += c ? (c.total_questions || 10) : 10;
      });
      renderSecondaryPlaylistStream('Tomorrow', 'tomorrowPlaylistContainer', 'tomorrowCountPill', 'tomorrowPlaylistCard', 'Queue is empty.', scrollMap.tomorrow);
    }

    if (weekList) {
      renderSecondaryPlaylistStream('This Week', 'weekPlaylistContainer', 'weekCountPill', 'weekPlaylistCard', 'Backlog is empty.', scrollMap.week);
    }

    if (starredList && starredContainer) {
      renderSecondaryPlaylistStream('Starred Sets', 'starredPlaylistContainer', 'starredCountPill', 'starredPlaylistCard', 'No starred sets yet. Click ☆ on any set to save here.', scrollMap.starred);
    }
    
    // 🚀 5. ATOMIC BATCHED RENDER FOR CUSTOM PLAYLISTS
    if (customContainer) {
      const customLists = userPlaylists.filter(p => !['Today', 'Tomorrow', 'This Week', 'Starred Sets'].includes(p.playlist_name));
      customContainer.innerHTML = customLists.map(playlist => {
        const items = userPlaylistItems.filter(pi => pi.playlist_id === playlist.id);
        return `
          <div class="mission-playlist-card collapsed playlist-accordion-card">
            <div class="playlist-header" onclick="window.toggleSecondaryPlaylist(this)">
              <div class="playlist-header-left"><h3 class="playlist-title">${playlist.playlist_name}</h3></div>
              <div class="playlist-header-right">
                <span class="playlist-count-pill">${items.length} Sets ▼</span>
                <button type="button" class="btn-playlist-dots" onclick="event.stopPropagation(); openPlaylistActionMenu(event, '${playlist.id}', '${playlist.playlist_name.replace(/'/g, "\\'")}', false)" title="Playlist Options">⋮</button>
              </div>
            </div>
            <div class="playlist-body">
              <div class="playlist-sets-stream sets-card-grid">${items.length > 0 ? items.map(i => renderPlaylistSetTileHtml(i, playlist.playlist_name)).join("") : `<div style="text-align:center; padding:18px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;">No sets in ${playlist.playlist_name}.</div>`}</div>
              ${getPlaylistAddBtnHtml(playlist.id, playlist.playlist_name)}
            </div>
          </div>
        `;
      }).join("");
    }

    // 🎯 6. DECOUPLED CENTURY BAROMETER TELEMETRY (PURE UNIQUE ATTEMPTS & HONEST MASTERY)
    const targetQ = 100;
    const actualAttemptedCount = dailyPerf.total_questions_attempted || 0;
    const todayAttempts = userAttemptHistory.filter(a => getAttemptLocalDate(a.attempt_date) === todayStr && (Number(a.test_id) > 0 || (Number(a.test_id) === -1 && isSunday())));

    // Unique test_id ke hisab se best mastered count calculate karein (No Double Counting)
    const uniqueMasteredSets = new Map();
    todayAttempts.forEach(a => { 
      const tid = Number(a.test_id);
      let qc = 10;
      if (tid > 0) {
        const c = catalogData.find(x => String(x.test_id) === String(tid));
        qc = c ? (c.total_questions || 10) : 10;
      } else {
        qc = (a.total_correct || 0) + (a.total_incorrect || 0) || 100;
      }

      let masteredThisRun = 0;
      if (parseFloat(a.score) >= (qc * 2)) masteredThisRun = qc; 
      else if (a.total_correct) masteredThisRun = a.total_correct;

      const prevMastered = uniqueMasteredSets.get(tid) || 0;
      if (masteredThisRun > prevMastered) {
        uniqueMasteredSets.set(tid, masteredThisRun);
      }
    });

    const todayMasteredQ = Array.from(uniqueMasteredSets.values()).reduce((sum, q) => sum + q, 0);

    const isSunHit = isSun && dailyPerf.is_century_hit;
    const isOverdrive = !isSun && actualAttemptedCount >= 100;

    let attPct = 0;
    let masPct = 0;

    if (isSunHit) {
      attPct = 100;
      masPct = 100;
    } else if (actualAttemptedCount >= 100) {
      // 🚀 OVERDRIVE MODE: Scale represents total attempted questions (100% full bar)
      attPct = 100;
      masPct = actualAttemptedCount > 0 ? Math.min(100, Math.round((todayMasteredQ / actualAttemptedCount) * 100)) : 0;
    } else {
      // 🚀 TARGET MODE: Scale represents fixed 100-question baseline target
      attPct = Math.min(100, Math.round((actualAttemptedCount / 100) * 100));
      masPct = Math.min(attPct, Math.round((todayMasteredQ / 100) * 100));
    }

    const capFill = document.getElementById("centuryCapacityFill"), 
          attFill = document.getElementById("centuryAttemptedFill"), 
          masFill = document.getElementById("centuryMasteredFill"), 
          meterText = document.getElementById("centuryLoadText"),
          subText = document.getElementById("centurySubtitleText");
    const trackElement = attFill?.parentElement || document.querySelector(".multi-tier-track") || document.querySelector(".century-progress-track");

    // (A) Staging Fill Decoupled & Dual-Scale Fills (Green = Correct, Red = Errors)
    if (capFill) capFill.style.display = "none";
    if (attFill) attFill.style.width = attPct + "%"; 
    if (masFill) masFill.style.width = masPct + "%";

    // (B) Dynamic Subtitle Scale Indicator
    if (subText) {
      if (isSun) {
        subText.innerText = "Weekly Backlog & Mastery Crucible";
      } else if (actualAttemptedCount >= 100) {
        subText.innerText = `Scale: Total Attempted (${actualAttemptedCount} Qs) • Overdrive Active`;
      } else {
        subText.innerText = "100-Question Target & Precision Barometer";
      }
    }

    // (C) Dynamic Legend Telemetry
    const legendEl = document.querySelector(".century-tier-legend");
    if (legendEl) {
      const todayErrors = Math.max(0, actualAttemptedCount - todayMasteredQ);
      if (actualAttemptedCount >= 100) {
        legendEl.innerHTML = `
          <span class="tier-legend-item"><span class="tier-dot tier-dot-mastered"></span> Correct (${todayMasteredQ})</span>
          <span class="tier-legend-item"><span class="tier-dot tier-dot-error"></span> Errors (${todayErrors})</span>
          <span class="tier-legend-item" style="color:var(--warning-dark); font-family:var(--font-mono); font-weight:800;">⚡ Overdrive (${actualAttemptedCount} Qs Scale)</span>
        `;
      } else {
        const remCount = Math.max(0, 100 - actualAttemptedCount);
        legendEl.innerHTML = `
          <span class="tier-legend-item"><span class="tier-dot tier-dot-mastered"></span> Correct (${todayMasteredQ})</span>
          <span class="tier-legend-item"><span class="tier-dot tier-dot-error"></span> Errors (${todayErrors})</span>
          <span class="tier-legend-item"><span class="tier-dot tier-dot-remaining"></span> Deficit (${remCount})</span>
        `;
      }
    }

    // (D) 🚀 Zebra Crossing Laser Beam + Shimmer Sweep (Active when >= 100 Qs)
    if (trackElement) {
      trackElement.classList.toggle("hyperdrive-active-track", isOverdrive);
      const existingBeam = trackElement.querySelector(".hyperdrive-physical-beam");
      if (isOverdrive) {
        if (!existingBeam) {
          const beamLayer = document.createElement("div");
          beamLayer.className = "hyperdrive-physical-beam";
          beamLayer.innerHTML = `<div class="hyperdrive-flare-head"></div>`;
          trackElement.appendChild(beamLayer);
        }
      } else if (existingBeam) {
        existingBeam.remove();
      }
    }

    // (C) 🛰️ Dedicated Slot mein Beacon update karein
    const beaconSlot = document.getElementById("milestoneBeaconSlot");
    if (beaconSlot) {
      beaconSlot.innerHTML = getMilestoneBeaconHtml(actualAttemptedCount);
    }

    // 🎯 cMeter mein 4-Tier Crisp Telemetry Pills rahengi
    if (meterText) {
      meterText.innerHTML = getMilestoneTelemetryHtml(actualAttemptedCount, todayMasteredQ, isSun, isSunHit);
    }

    if (currentCandidate?.roll_number) {
      appStorage.set("tomorrow_load_" + currentCandidate.roll_number, tomorrowLoad);
    }
  } finally {
    isRenderingPlaylists = false;
    if (pendingPlaylistRender) {
      pendingPlaylistRender = false;
      renderHomePlaylists();
    }
  }
}

// ==========================================================================
// 🚀 REFINED SELECTION MODE: FAST DOMAIN SCROLLER & FLOATING DOCK ENGINE
// ==========================================================================
let toastTimer = null;
let lastRemovedPayload = null;
window.showSelectionToast = function(msg, undoCallback = null) {
  const toast = document.getElementById("selectionToast");
  const msgEl = document.getElementById("selectionToastText");
  const undoBtn = document.getElementById("btnToastUndo");
  if (!toast || !msgEl) return;
  msgEl.innerText = msg;

  if (undoCallback && typeof undoCallback === "function") {
    if (undoBtn) {
      undoBtn.style.display = "inline-flex";
      undoBtn.onclick = () => {
        undoCallback();
        toast.classList.remove("show");
        setTimeout(() => { toast.style.display = "none"; }, 250);
      };
    }
  } else if (undoBtn) {
    undoBtn.style.display = "none";
    undoBtn.onclick = null;
  }

  toast.style.display = "block";
  void toast.offsetWidth;
  toast.classList.add("show");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (!toast.classList.contains("show")) toast.style.display = "none";
    }, 250);
  }, 3500);
};

function renderStagingDomainScroller() {
  const scroller = document.getElementById("stagingDomainScroller");
  if (!scroller) return;

  const subjectsMap = {};
  catalogData.forEach(r => {
    const s = (r.subject || "General Studies").trim();
    if (!subjectsMap[s]) subjectsMap[s] = 0;
    subjectsMap[s]++;
  });

  const sortedSubjects = Object.keys(subjectsMap).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  let html = "";
  sortedSubjects.forEach(sub => {
    const isActive = sub.toLowerCase() === (activeSubject || "").toLowerCase();
    html += `
      <button type="button" class="staging-domain-chip ${isActive ? 'active' : ''}" onclick="switchStagingSubject('${sub.replace(/'/g, "\\'")}')">
        <span>${sub}</span>
        <span class="chip-count">${subjectsMap[sub]}</span>
      </button>
    `;
  });

  scroller.innerHTML = html;
  scroller.style.display = librarySelectionMode ? "flex" : "none";
}

window.switchStagingSubject = function(subName) {
  activeSubject = (subName || "General Studies").trim();
  const tEl = document.getElementById("explorerSubjectTitle");
  if (tEl) tEl.innerText = activeSubject;
  const sEl = document.getElementById("explorerSubjectStats");
  
  const stats = getSubjectMasteryStats(activeSubject);
  if (sEl) sEl.innerText = `${stats.totalSets} Sets • ${stats.masteredCount} Mastered`;

  renderStagingDomainScroller();
  renderTopicSets();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function updateStagingDockUI() {
  const dock = document.getElementById("libraryFloatingDock");
  const scroller = document.getElementById("stagingDomainScroller");
  if (!dock) return;
  if (!librarySelectionMode || !targetPlaylistForSelection) {
    dock.style.display = "none";
    if (scroller) scroller.style.display = "none";
    return;
  }

  dock.style.display = "block";
  const setsExp = document.getElementById("setsExplorerStage");
  if (setsExp && setsExp.style.display === "block") {
    renderStagingDomainScroller();
  } else if (scroller) {
    scroller.style.display = "none";
  }

  const nameEl = document.getElementById("dockTargetPlaylistName");
  if (nameEl) nameEl.innerText = targetPlaylistForSelection.name;

  const stagedItems = userPlaylistItems.filter(pi => pi.playlist_id === targetPlaylistForSelection.id);
  let totalQs = 0;
  stagedItems.forEach(item => {
    const c = catalogData.find(x => String(x.test_id) === String(item.test_id));
    totalQs += c ? (c.total_questions || 10) : 10;
  });

  const counterEl = document.getElementById("dockStagedCounter");
  if (counterEl) {
    counterEl.innerText = `${stagedItems.length} Sets Selected (${totalQs} Qs)`;
  }
}

window.enableLibrarySelectionMode = function(pId, pName) { 
  librarySelectionMode = true; 
  targetPlaylistForSelection = { id: pId, name: pName }; 
  
  document.body.classList.add("staging-active");

  switchView('viewLibrary'); 
  updateBottomNav(document.getElementById('navLibraryBtn')); 

  const hub = document.getElementById("subjectHubStage");
  const exp = document.getElementById("setsExplorerStage");
  toggleMastheadSearch(false);
  if (exp) exp.style.display = "none";
  if (hub) hub.style.display = "block";

  const scroller = document.getElementById("stagingDomainScroller");
  if (scroller) scroller.style.display = "none";

  renderSubjectHubGrid();
  updateStagingDockUI();

  window.scrollTo({ top: 0, behavior: 'instant' });
};

function autoExpandPlaylistCard(pName) {
  if (!pName) return;
  const nameClean = pName.trim().toLowerCase();
  if (nameClean === 'today') {
    const c = document.getElementById('todayPayloadCard');
    if (c && c.classList.contains('collapsed')) { c.classList.remove('collapsed'); c.classList.add('expanded'); }
  } else {
    document.querySelectorAll('.mission-column-secondary .playlist-accordion-card').forEach(c => {
      c.classList.remove('expanded');
      c.classList.add('collapsed');
    });

    if (nameClean === 'tomorrow') {
      const c = document.getElementById('tomorrowPlaylistCard');
      if (c) { c.classList.remove('collapsed'); c.classList.add('expanded'); }
    } else if (nameClean === 'this week') {
      const c = document.getElementById('weekPlaylistCard');
      if (c) { c.classList.remove('collapsed'); c.classList.add('expanded'); }
    } else if (nameClean === 'starred sets' || nameClean === 'starred') {
      const c = document.getElementById('starredPlaylistCard');
      if (c) { c.classList.remove('collapsed'); c.classList.add('expanded'); }
    } else {
      document.querySelectorAll('#customPlaylistsContainer .playlist-accordion-card').forEach(card => {
        const titleEl = card.querySelector('.playlist-title');
        if (titleEl && titleEl.innerText.trim().toLowerCase() === nameClean) {
          card.classList.remove('collapsed');
          card.classList.add('expanded');
        }
      });
    }
  }
}

window.cancelLibrarySelectionMode = async function() { 
  const targetName = targetPlaylistForSelection?.name || "Playlist";
  const targetId = targetPlaylistForSelection?.id;
  const stagedCount = userPlaylistItems.filter(pi => pi.playlist_id === targetId).length;
  librarySelectionMode = false; 
  targetPlaylistForSelection = null; 

  const dock = document.getElementById("libraryFloatingDock"); 
  if (dock) dock.style.display = "none"; 
  const scroller = document.getElementById("stagingDomainScroller"); 
  if (scroller) scroller.style.display = "none";

  const toast = document.getElementById("selectionToast");
  if (toast) {
    toast.classList.remove("show");
    toast.style.display = "none";
  }

  document.body.classList.remove("staging-active");
  switchView('viewDashboard');
  updateBottomNav(document.getElementById('navHomeBtn'));

  if (stagedCount > 0) {
    showSelectionToast(`✓ ${targetName} updated (${stagedCount} Sets ready)`);
  } else {
    showSelectionToast(`✓ ${targetName} queue updated`);
  }

  await fetchPlaylistsAndCheckRollover(); 
  renderTopicSets(); 
  await renderHomePlaylists();
  autoExpandPlaylistCard(targetName);
};

window.toggleDirectStaging = async function(testId) {
  if (!librarySelectionMode || !targetPlaylistForSelection || !currentCandidate) return;
  const pId = targetPlaylistForSelection.id;
  const pName = targetPlaylistForSelection.name;
  const roll = currentCandidate.roll_number;

  const inTarget = userPlaylistItems.some(pi => String(pi.playlist_id) === String(pId) && String(pi.test_id) === String(testId));
  const btn = document.getElementById(`btnStage_${testId}`);
  if (inTarget) {
    userPlaylistItems = userPlaylistItems.filter(pi => !(pi.playlist_id === pId && String(pi.test_id) === String(testId)));
    if (btn) {
      btn.classList.remove("saved");
      btn.innerHTML = `${bookmarkOutlineSvg} <span class="stage-label">Save to playlist</span>`;
    }
    showSelectionToast(`Removed from "${pName}"`);
    try {
      await supabaseClient.from("playlist_items").delete().eq("playlist_id", pId).eq("test_id", testId).eq("student_roll", roll);
    } catch (err) {
      console.error("Remove from playlist error:", err);
    }
  } else {
    userPlaylistItems.push({ playlist_id: pId, test_id: testId, student_roll: roll });
    if (btn) {
      btn.classList.add("saved");
      btn.innerHTML = `${bookmarkFilledSvg} <span class="stage-label">Saved to playlist</span>`;
    }
    showSelectionToast(`Added to "${pName}"`);
    try {
      await supabaseClient.from("playlist_items").insert({ playlist_id: pId, test_id: testId, student_roll: roll });
    } catch (err) {
      console.error("Add to playlist error:", err);
    }
  }

  updateStagingDockUI();
};

let currentThreeDotsPlaylistContext = null;

window.openThreeDotsMenu = function(event, testId, playlistId = null, playlistName = null) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  currentThreeDotsTestId = testId; 
  currentThreeDotsPlaylistContext = (playlistId && playlistName) ? { playlistId, playlistName } : null;
  closePlaylistActionMenu();
  const menu = document.getElementById("threeDotsMenu"), overlay = document.getElementById("threeDotsMenuOverlay"); 
  if (!menu || !overlay) return;

  const btnRemove = document.getElementById("btnPopupRemoveFromPlaylist");
  const labelRemove = document.getElementById("labelPopupRemoveFromPlaylist");
  if (btnRemove && labelRemove) {
    if (currentThreeDotsPlaylistContext) {
      const friendlyPlaylistNames = {
        'Today': "Today's Payload",
        'Tomorrow': "Tomorrow's Queue",
        'This Week': "This Week Backlog",
        'Starred Sets': "Starred Sets"
      };
      const displayName = friendlyPlaylistNames[playlistName] || playlistName;
      labelRemove.innerText = `Remove from ${displayName}`;
      btnRemove.style.display = "flex";
    } else {
      btnRemove.style.display = "none";
    }
  }

  const btnRect = event.currentTarget.getBoundingClientRect();
  menu.style.display = "block"; 
  menu.style.zIndex = "3200"; 
  overlay.style.display = "block"; 
  overlay.style.zIndex = "3100"; 
  overlay.style.pointerEvents = "auto"; 
  overlay.classList.add("open");
  const menuWidth = 230; 
  let leftPos = btnRect.right - menuWidth; 
  if (leftPos < 10) leftPos = 10;
  let topPos = btnRect.bottom + 6; 
  const estHeight = currentThreeDotsPlaylistContext ? 92 : 48;
  if (topPos + estHeight > window.innerHeight) topPos = Math.max(10, btnRect.top - estHeight);
  menu.style.top = `${topPos}px`; 
  menu.style.left = `${leftPos}px`;
};

window.closeThreeDotsMenu = function() {
  const menu = document.getElementById("threeDotsMenu"), overlay = document.getElementById("threeDotsMenuOverlay");
  if (menu) menu.style.display = "none";
  if (overlay) { 
    overlay.style.display = "none"; 
    overlay.style.pointerEvents = "none"; 
    overlay.classList.remove("open"); 
  }
  currentThreeDotsPlaylistContext = null;
};

window.triggerBottomSheetFromMenu = function() { 
  const tId = currentThreeDotsTestId;
  closeThreeDotsMenu(); 
  if (tId) openPlaylistBottomSheet(tId); 
};

window.triggerRemoveFromPlaylistFromMenu = function() {
  if (!currentThreeDotsTestId || !currentThreeDotsPlaylistContext) return;
  const { playlistId, playlistName } = currentThreeDotsPlaylistContext;
  const testId = currentThreeDotsTestId;
  closeThreeDotsMenu();
  executeSwipeRemove(playlistId, testId, playlistName);
};

window.openPlaylistBottomSheet = function(testId) {
  selectedTestForPlaylist = testId;
  const bs = document.getElementById("playlistBottomSheet"), overlay = document.getElementById("playlistBottomSheetOverlay"), opts = document.getElementById("bottomSheetOptionsContainer");
  if (!bs || !opts) return;
  let html = "";
  userPlaylists.forEach(p => {
    const inList = userPlaylistItems.some(pi => pi.playlist_id === p.id && String(pi.test_id) === String(testId));
    const icon = p.playlist_name === 'Today' ? '🔥' : 
                 (p.playlist_name === 'Tomorrow' ? '⏳' : 
                 (p.playlist_name === 'This Week' ? '📅' : 
                 (p.playlist_name === 'Starred Sets' ? '⭐' : '📁')));
                 
    const bookmarkSvg = inList
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--tcs-blue-accent)" stroke="var(--tcs-blue-accent)" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path><polyline points="9 10 12 13 16 8" stroke="#ffffff" stroke-width="2" fill="none"></polyline></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
    html += `
      <div class="playlist-select-row" onclick="togglePlaylistMembership('${p.id}', ${testId}, ${inList})">
        <div class="playlist-select-left"><span class="playlist-select-icon">${icon}</span><span class="playlist-select-title">${p.playlist_name}</span></div>
        <div style="display:flex; align-items:center; gap:8px;">${inList ? '<span style="color:var(--success-dark); font-weight:800; font-size:11.5px; letter-spacing:0.3px;">SAVED</span>' : ''}<span class="playlist-select-checkbox">${bookmarkSvg}</span></div>
      </div>
    `;
  });
  opts.innerHTML = html;
  overlay.style.display = "block"; 
  overlay.style.pointerEvents = "auto"; 
  overlay.classList.add("open"); 
  bs.style.bottom = "0";
};

window.closePlaylistBottomSheet = function() {
  const bs = document.getElementById("playlistBottomSheet"), overlay = document.getElementById("playlistBottomSheetOverlay");
  if (bs) bs.style.bottom = "-500px";
  if (overlay) { 
    overlay.classList.remove("open"); 
    overlay.style.pointerEvents = "none"; 
    setTimeout(() => { if (!overlay.classList.contains("open")) overlay.style.display = "none"; }, 250); 
  }
};

window.togglePlaylistMembership = async function(pId, testId, inList) {
  if (!currentCandidate) return;
  const roll = currentCandidate.roll_number;

  // 1. Instant 0ms Local Memory Toggle (String-safe comparison)
  if (inList) {
    userPlaylistItems = userPlaylistItems.filter(
      pi => !(String(pi.playlist_id) === String(pId) && String(pi.test_id) === String(testId))
    );
  } else {
    userPlaylistItems.push({ playlist_id: pId, test_id: testId, student_roll: roll });
  }

  // 0ms Cache Sync (Taaki page refresh hone par instant update barkarar rahe)
  appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);

  // 2. Star Icon State Sync (Agar toggled playlist 'Starred Sets' hai)
  const starredList = userPlaylists.find(p => p.playlist_name === 'Starred Sets');
  if (starredList && String(starredList.id) === String(pId)) {
    document.querySelectorAll(`.btn-star-set[data-test-id="${testId}"]`).forEach(btn => {
      btn.classList.toggle("starred", !inList);
      btn.title = !inList ? "Unstar set" : "Star set";
    });
  }

  // 3. Instant UI Re-render (Modal sirf tabhi refresh hoga jab pehle se screen par open ho)
  const overlay = document.getElementById("playlistBottomSheetOverlay");
  if (overlay && overlay.classList.contains("open")) {
    openPlaylistBottomSheet(testId);
  }
  renderHomePlaylists();

  // 4. Background Cloud Sync with Revert Handling
  try {
    if (inList) {
      const { error: delErr } = await supabaseClient
        .from("playlist_items")
        .delete()
        .eq("playlist_id", pId)
        .eq("test_id", testId)
        .eq("student_roll", roll);
      if (delErr) throw delErr;
    } else {
      const { error: insErr } = await supabaseClient
        .from("playlist_items")
        .insert({ playlist_id: pId, test_id: testId, student_roll: roll });
      if (insErr) throw insErr;
    }
  } catch (err) { 
    console.error("Cloud playlist sync failed, reverting:", err); 
    
    // Fail hone par exact state revert karein
    if (inList) { 
      userPlaylistItems.push({ playlist_id: pId, test_id: testId, student_roll: roll }); 
    } else { 
      userPlaylistItems = userPlaylistItems.filter(
        pi => !(String(pi.playlist_id) === String(pId) && String(pi.test_id) === String(testId))
      ); 
    } 

    // Cache revert sync
    appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);

    // Star icon revert sync
    if (starredList && String(starredList.id) === String(pId)) {
      document.querySelectorAll(`.btn-star-set[data-test-id="${testId}"]`).forEach(btn => {
        btn.classList.toggle("starred", inList);
        btn.title = inList ? "Unstar set" : "Star set";
      });
    }

    if (overlay && overlay.classList.contains("open")) {
      openPlaylistBottomSheet(testId);
    }
    renderHomePlaylists(); 
    showSelectionToast("Network sync failed. Changes reverted."); 
  }
};

// ==========================================================================
// 9. TELEMETRY, MISTAKE BANK & DEDUPLICATED NATURAL DICTIONARY SORT
// ==========================================================================
async function fetchWeakQuestions() {
  if (!currentCandidate) return;
  try {
    const { data: stats } = await supabaseClient.from("student_question_stats").select("*").eq("student_roll", currentCandidate.roll_number);
    let weakQs = stats || []; 
    const qIds = weakQs.map(q => q.question_id).filter(Boolean);
    if (qIds.length > 0) {
      const { data: fresh } = await supabaseClient.from('questions').select('id, content, options, correct_answer, explanation').in('id', qIds);
      if (fresh) { 
        userWeakQuestions = weakQs.map(wq => ({ ...wq, question_data: fresh.find(f => String(f.id) === String(wq.question_id)) || wq.question_data })); 
        return; 
      }
    }
    userWeakQuestions = weakQs;
  } catch (err) { 
    console.error("Mistake Bank Load Error:", err); 
  }
}

// 🚀 CENTRALIZED LEITNER MISTAKE TELEMETRY COMPILER
function getSubjectMistakeTelemetry(subName) {
  const activeClean = (subName || activeSubject || "").trim().toLowerCase();
  const now = new Date();

  const allMistakes = (userWeakQuestions || []).filter(q => 
    (q.subject || "").trim().toLowerCase() === activeClean &&
    (q.times_wrong || 0) > 0 && 
    (q.mastery_streak || 0) < 4
  );

  const dueMistakes = allMistakes.filter(q => !q.next_review_at || new Date(q.next_review_at) <= now);
  
  // 🎯 FIX: (q.times_wrong || 0) > 0 check add kiya taaki analytics aur vault tally karein
  const clearedCount = (userWeakQuestions || []).filter(q => 
    (q.subject || "").trim().toLowerCase() === activeClean &&
    (q.times_wrong || 0) > 0 &&
    (q.mastery_streak || 0) >= 4
  ).length;

  const loopCount = allMistakes.filter(q => (q.mastery_streak || 0) > 0).length;
  const freshCount = allMistakes.filter(q => (q.mastery_streak || 0) === 0).length;
  const dueCount = dueMistakes.length;
  const inReviewCount = allMistakes.length;
  const durationMins = Math.max(3, Math.ceil((dueCount || inReviewCount) * 0.6));

  return { allMistakes, dueMistakes, dueCount, inReviewCount, loopCount, freshCount, clearedCount, durationMins };
}

async function fetchTestCatalog() {
  const hub = document.getElementById("subjectHubContainer"); 
  if (!hub) return;
  hub.innerHTML = "<p style='padding:20px; color:var(--text-muted);'>Compiling Subject Mastery Matrix...</p>";
  
  let allCat = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data: catChunk, error: catErr } = await supabaseClient
      .from("view_test_catalog")
      .select("*")
      .range(from, from + step - 1);

    if (catErr) {
      console.error("Catalog fetch error:", catErr);
      break;
    }
    if (!catChunk || catChunk.length === 0) break;
    allCat = allCat.concat(catChunk);
    if (catChunk.length < step) break;
    from += step;
  }

  if (allCat.length === 0) {
    hub.innerHTML = "<p style='padding:20px; color:var(--danger);'>Catalog failed to load.</p>";
    return;
  }

  const unique = [], seen = new Set();
  allCat.forEach(r => { 
    const id = String(r.test_id); 
    if (!seen.has(id)) { 
      seen.add(id); 
      r.subject = (r.subject || "General Studies").trim(); 
      r.topic = (r.topic || "Core Practice").trim(); 
      unique.push(r); 
    } 
  });
  catalogData = unique;
  appStorage.setJSON("cache_catalog_data", catalogData);
  const { data: hist } = await supabaseClient.from("test_attempts").select("test_id, score, total_correct, total_incorrect, attempt_date, time_spent_seconds").eq("student_roll", currentCandidate.roll_number).order("attempt_date", { ascending: false });
  userAttemptHistory = hist || []; 
  renderSubjectHubGrid();
}

// 🚀 SUBJECT MASTERY STATS HELPER (DRY COMPILER)
function getSubjectMasteryStats(subName) {
  const clean = (subName || "General Studies").trim().toLowerCase();
  const subSets = catalogData.filter(r => (r.subject || "General Studies").trim().toLowerCase() === clean);
  let masteredCount = 0;
  let totalAtt = 0;
  let sumPct = 0;
  let attemptedSets = 0;

  subSets.forEach(setItem => {
    const meta = getSetScoreMeta(setItem.test_id);
    if (meta.isAtt) {
      totalAtt += meta.attempts.length;
      attemptedSets++;
      sumPct += meta.bestPct;
      if (meta.status === 'mastered') masteredCount++;
    }
  });

  const totalSets = subSets.length;
  const remaining = totalSets - masteredCount;
  const progPct = totalSets > 0 ? Math.round((masteredCount / totalSets) * 100) : 0;
  const avgAcc = attemptedSets > 0 ? Math.round(sumPct / attemptedSets) : 0;

  return { subSets, totalSets, masteredCount, remaining, progPct, avgAcc, totalAtt };
}

function renderSubjectHubGrid() {
  const container = document.getElementById("subjectHubContainer"); 
  if (!container) return; 
  container.innerHTML = "";
  
  const subjects = Array.from(new Set(catalogData.map(r => (r.subject || "General Studies").trim())));
  subjects.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).forEach(subName => {
    const stats = getSubjectMasteryStats(subName);
    
    let sClass = "pill-untested", sText = "Untested";
    if (stats.masteredCount === stats.totalSets && stats.totalSets > 0) { sClass = "pill-mastered"; sText = "Mastered"; }
    else if (stats.totalAtt > 0) { sClass = "pill-progress"; sText = `${stats.progPct}% Complete`; }

    const tile = document.createElement("div"); 
    tile.className = "subject-mastery-tile";
    tile.innerHTML = `
      <div class="tile-top-row"><span class="tile-subject-title">${subName}</span><span class="tile-status-pill ${sClass}">${sText}</span></div>
      <div class="tile-progress-container"><div class="tile-progress-labels"><span>Mastery Progress</span><span>${stats.progPct}%</span></div><div class="tile-progress-track"><div class="tile-progress-fill" style="width: ${stats.progPct}%;"></div></div></div>
      <div class="tile-metrics-grid">
        <div class="tile-metric-item"><span class="tile-metric-label">Mastered</span><span class="tile-metric-value" style="color:var(--success-dark);">${stats.masteredCount} <small style="font-size:10px; color:var(--text-muted);">/${stats.totalSets}</small></span></div>
        <div class="tile-metric-item"><span class="tile-metric-label">Remaining</span><span class="tile-metric-value" style="color:var(--warning-dark);">${stats.remaining} Sets</span></div>
        <div class="tile-metric-item"><span class="tile-metric-label">Avg Accuracy</span><span class="tile-metric-value">${stats.avgAcc > 0 ? stats.avgAcc + '%' : '--'}</span></div>
      </div>
      <div class="tile-action-footer"><span style="color:var(--text-muted); font-size:11px; font-weight:600;">${stats.totalAtt} Attempts Logged</span><span>Explore Sets ➔</span></div>
    `;

    // 🚀 TACTILE EVENT: टच करते ही पहले कार्ड दबेगा, फिर 90ms बाद नेविगेट होगा
    tile.onclick = (e) => {
      tile.classList.add("tile-touch-active");
      setTimeout(() => {
        tile.classList.remove("tile-touch-active");
        drillDownToSubject(subName);
      }, 35);
    };

    container.appendChild(tile);
  });
}

window.toggleMastheadSearch = function(isOpen) {
  const def = document.getElementById("mastheadDefaultBar"), bar = document.getElementById("mastheadSearchBar"), inp = document.getElementById("topicSearchInput");
  if (isOpen) { 
    if (def) def.style.display = "none"; 
    if (bar) { bar.style.display = "flex"; if (inp) { inp.value = ""; inp.focus(); } } 
  } else { 
    if (bar) bar.style.display = "none"; 
    if (def) def.style.display = "flex"; 
    if (inp) { inp.value = ""; filterAccordionCards(""); } 
  }
};

window.drillDownToSubject = function(subName, pushHistory = true) {
  activeSubject = (subName || "General Studies").trim(); 
  const hub = document.getElementById("subjectHubStage");
  const exp = document.getElementById("setsExplorerStage");
  const tEl = document.getElementById("explorerSubjectTitle");
  const sEl = document.getElementById("explorerSubjectStats");

  const stats = getSubjectMasteryStats(activeSubject);
  if (tEl) tEl.innerText = activeSubject; 
  if (sEl) sEl.innerText = `${stats.totalSets} Sets • ${stats.masteredCount} Mastered`;

  toggleMastheadSearch(false); 

  if (hub) hub.style.display = "none"; 
  if (exp) {
    exp.classList.remove("stage-enter-active");
    void exp.offsetWidth; // Force Reflow
    exp.style.display = "block";
    exp.classList.add("stage-enter-active");
  }

  currentFilter = "all"; 
  document.querySelectorAll('.filter-chip-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-filter') === 'all'));
  
  renderTopicSets(); 
  window.scrollTo({ top: 0, behavior: 'instant' });

  if (pushHistory) {
    history.pushState({ page: 'sets-explorer', view: 'viewLibrary', subView: 'setsExplorer', subject: activeSubject }, "", "#subject_" + encodeURIComponent(activeSubject));
  }
};

window.returnToSubjectHub = function(fromPopState = false) {
  if (!fromPopState && history.state?.subView === 'setsExplorer') return history.back();

  const hub = document.getElementById("subjectHubStage");
  const exp = document.getElementById("setsExplorerStage");
  
  toggleMastheadSearch(false); 
  if (exp) exp.style.display = "none"; 
  
  if (hub) {
    hub.classList.remove("stage-enter-active");
    void hub.offsetWidth;
    hub.style.display = "block"; 
    hub.classList.add("stage-enter-active");
  }

  const scroller = document.getElementById("stagingDomainScroller");
  if (scroller) scroller.style.display = librarySelectionMode ? "flex" : "none";

  renderSubjectHubGrid(); 
  if (librarySelectionMode) updateStagingDockUI();

  window.scrollTo({ top: 0, behavior: 'instant' });
  if (!fromPopState) {
    history.replaceState({ page: 'main-tab', view: 'viewLibrary', subView: 'hub' }, "", "#viewLibrary");
  }
};

function renderTopicSets() {
  const container = document.getElementById("topicsContainer"); 
  if (!container) return; 
  container.innerHTML = "";
  
  updateStagingDockUI();

  // 🎯 CYBER-VAULT ACCORDION (100% WIDTH STRIP + BALANCED 2-COLUMN BENTO ON PC)
  const mbContainer = document.getElementById("subjectMistakeTileContainer") || document.getElementById("subjectMistakeBankContainer");
  if (mbContainer) {
    if (librarySelectionMode) {
      mbContainer.innerHTML = "";
    } else {
      const tel = getSubjectMistakeTelemetry(activeSubject);

      // 🚀 VAULT ALWAYS EXPANDS IF MISTAKES EXIST OR WERE CLEARED
      if (tel.inReviewCount > 0 || tel.clearedCount > 0) {
        const isCaughtUp = (tel.dueCount === 0);

        mbContainer.innerHTML = `
          <div class="mistake-vault-card ${isCaughtUp ? 'state-clean' : ''}" id="subjectMistakeVault" data-status="${isCaughtUp ? 'mastered' : 'unattempted'}">
            <div class="vault-header" onclick="this.parentElement.classList.toggle('open')">
              <div class="vault-header-left">
                <div class="vault-glyph-box" style="${isCaughtUp ? 'background: var(--success-bg-subtle); border-color: var(--success-border); color: var(--success-dark); box-shadow: none;' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    ${isCaughtUp ? '<polyline points="9 12 11 14 15 10"></polyline>' : '<line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
                  </svg>
                </div>
                <div class="vault-title-group">
                  <span class="vault-title-text">${activeSubject} Mistake Vault</span>
                  <span class="vault-tag-pill" style="${isCaughtUp ? 'background: var(--success-bg-subtle); color: var(--success-dark); border-color: var(--success-border);' : ''}">${isCaughtUp ? 'ALL CAUGHT UP' : 'QUARANTINE'}</span>
                </div>
              </div>
              <div class="vault-header-right">
                <div class="vault-telemetry-pill" style="${isCaughtUp ? 'border-color: var(--success-border); color: var(--success-dark);' : ''}">
                  <span class="vault-radar-dot" style="${isCaughtUp ? 'background: var(--success); box-shadow: 0 0 8px var(--success);' : ''}"></span>
                  <span>${tel.dueCount > 0 ? `${tel.dueCount} DUE` : `0 DUE (${tel.inReviewCount} In Review)`}</span>
                </div>
                <div class="vault-chevron-bubble">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            <div class="vault-body">
              <div class="vault-natural-grid">
                
                ${isCaughtUp ? `
                <div class="set-tile vault-set-tile" data-status="mastered" style="border-left-color: var(--success) !important; background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, var(--bg-surface-elevated) 100%) !important;">
                  <div class="set-tile-header">
                    <div class="set-tile-title-group">
                      <div class="set-tile-title">Comprehensive Mistake Drill</div>
                    </div>
                    <div class="set-status-badge status-mastered" style="background:var(--success-bg-subtle); color:var(--success-dark); border:1px solid var(--success-border);">
                      0 Due • Done
                    </div>
                  </div>
                  <div class="set-tile-meta">
                    <span>${clockSvg} Done Today</span>
                    <span>${docSvg} ${tel.inReviewCount} In Pipeline</span>
                    <span style="font-size:10px; color:var(--success-dark); font-weight:700;">(4-Stage Loop)</span>
                  </div>
                  <div class="set-score-info">
                    <span style="color:var(--success-dark); font-weight:600;">✓ Today's quota attempted! (${tel.inReviewCount} in review)</span>
                  </div>
                  <div class="set-action-footer">
                    <button type="button" class="btn-launch-set" style="background: linear-gradient(135deg, #15803d, #16a34a) !important; box-shadow: 0 2px 8px var(--success-bg-subtle);" onclick="openMissionBriefingModal(-3)">
                      <span>📖</span> <span>Review & Practice</span>
                    </button>
                  </div>
                </div>
                ` : `
                <div class="set-tile vault-set-tile" data-status="unattempted">
                  <div class="set-tile-header">
                    <div class="set-tile-title-group">
                      <div class="set-tile-title">Comprehensive Mistake Drill</div>
                    </div>
                    <div class="set-status-badge status-progress" style="background:var(--danger-bg-subtle); color:var(--danger-dark); border:1px solid var(--danger-border);">
                      ${tel.dueCount} Due
                    </div>
                  </div>
                  <div class="set-tile-meta">
                    <span>${clockSvg} ${tel.durationMins}m</span>
                    <span>${docSvg} ${tel.dueCount} Qs</span>
                    <span style="font-size:10px; color:var(--danger-dark); font-weight:700;">(4-Stage Loop)</span>
                  </div>
                  <div class="set-score-info">
                    <span style="color:var(--danger-dark); font-weight:600;">⚠️ ${tel.freshCount} Fresh • ${tel.loopCount} In Review</span>
                  </div>
                  <div class="set-action-footer">
                    <button type="button" class="btn-launch-set" onclick="openMissionBriefingModal(-3)">
                      <span>▶</span> <span>Launch Session</span>
                    </button>
                  </div>
                </div>
                `}

                <div class="vault-status-hud">
                  <div class="hud-header">
                    <span class="hud-title">Retention Loops</span>
                    <span style="font-size:9.5px; font-weight:700; color:var(--text-muted); font-family:var(--font-mono);">LEITNER</span>
                  </div>
                  <div class="hud-grid">
                    <div class="hud-cell cell-fresh">
                      <div class="hud-label">Streak 0</div>
                      <div class="hud-val" style="color:var(--danger-dark);">${tel.freshCount}</div>
                    </div>
                    <div class="hud-cell cell-loop">
                      <div class="hud-label">Streak 1–3</div>
                      <div class="hud-val" style="color:var(--warning-dark);">${tel.loopCount}</div>
                    </div>
                    <div class="hud-cell cell-cleared">
                      <div class="hud-label">Mastered</div>
                      <div class="hud-val" style="color:var(--success-dark);">${tel.clearedCount}</div>
                    </div>
                  </div>
                  <div class="hud-note">
                    🛡️ Clear 4 consecutive spaced intervals to permanently master weak questions into long-term recall.
                  </div>
                </div>

              </div>
            </div>
          </div>
        `;
      } else {
        mbContainer.innerHTML = "";
      }
    }
  }

  const filtered = catalogData.filter(r => (r.subject || "General Studies").trim().toLowerCase() === (activeSubject || "").trim().toLowerCase());
  let totalSets = filtered.length, unattempted = 0, revise = 0, mastered = 0;
  filtered.forEach(s => {
    const meta = getSetScoreMeta(s.test_id);
    if (!meta.isAtt) unattempted++;
    else if (meta.status === 'mastered') mastered++;
    else revise++;
  });

  document.querySelectorAll('.filter-chip-btn').forEach(b => {
    const f = b.getAttribute('data-filter');
    if (f === 'all') b.innerText = `All (${totalSets})`;
    else if (f === 'unattempted') b.innerText = `⚡ Unattempted (${unattempted})`;
    else if (f === 'revise') b.innerText = `🔄 Revise (<70%) (${revise})`;
    else if (f === 'mastered') b.innerText = `🏆 Mastered (${mastered})`;
  });

  const grouped = {}; 
  filtered.forEach(item => { 
    const k = (item.topic || "Core Practice").trim(); 
    if (!grouped[k]) grouped[k] = []; 
    grouped[k].push(item); 
  });

  Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' })).forEach(([topicName, sets]) => {
    let topicMastered = 0; 
    const uniqueSets = [], seenIds = new Set();
    
    sets.forEach(item => {
      const idK = String(item.test_id);
      if (!seenIds.has(idK)) { 
        seenIds.add(idK); 
        uniqueSets.push(item); 
      }
    });

    const processed = [];
    uniqueSets.forEach(setItem => {
      const meta = getSetScoreMeta(setItem.test_id);
      if (meta.status === 'mastered') topicMastered++;
      processed.push(setItem);
    });

    if (processed.length === 0) return;
    
    processed.sort((a, b) => {
      const titleA = String(a.test_title || "").trim();
      const titleB = String(b.test_title || "").trim();
      return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const progPct = uniqueSets.length > 0 ? (topicMastered / uniqueSets.length) * 100 : 0;
    const groupCard = document.createElement("div"); 
    groupCard.className = "topic-accordion-card"; 
    
    const header = document.createElement("div"); 
    header.className = "topic-accordion-header";
    header.innerHTML = `
      <div class="header-left"><span class="icon-folder">📁</span><span class="topic-title" style="color: inherit; font-size: 14px; font-weight: 700;">${topicName}</span></div>
      <div class="header-right"><span class="subtopic-tag">${topicMastered}/${uniqueSets.length} Mastered</span><svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div>
      <div class="acc-progress-track"><div class="acc-progress-fill" style="width: ${progPct}%;"></div></div>
    `;

    const body = document.createElement("div"); 
    body.className = "topic-accordion-body"; 
    const setsGrid = document.createElement("div"); 
    setsGrid.className = "sets-card-grid";

    // 🚀 UNIFIED STREAMLINED RENDER (ZERO REPETITIVE HTML)
    setsGrid.innerHTML = processed.map(setItem => renderSetTileHtml(setItem, { isLibrary: true })).join("");

    body.appendChild(setsGrid); 
    groupCard.appendChild(header); 
    groupCard.appendChild(body); 
    container.appendChild(groupCard);
    
    header.onclick = () => {
      const isOpen = groupCard.classList.contains("open");
      container.querySelectorAll(".topic-accordion-card").forEach(c => {
        if (c !== groupCard) c.classList.remove("open");
      });
      groupCard.classList.toggle("open", !isOpen);
    };
  });

  applyTopicFilter(currentFilter);
}

// 🚀 PRODUCTION-GRADE LEITNER SRS GATEKEEPER
const REVIEW_INTERVALS_DAYS = [1, 3, 6, 15];

async function syncMistakeBank(payloads) {
  if (!payloads?.length || !currentCandidate) return;
  try {
    const qIds = payloads.map(p => p.question_id ? String(p.question_id) : String(Math.abs((p.question_data?.content || "").length * 999)));
    
    const { data: existingRows } = await supabaseClient
      .from("student_question_stats")
      .select("id, question_id, times_wrong, times_correct, mastery_streak, next_review_at")
      .eq("student_roll", currentCandidate.roll_number)
      .in("question_id", qIds);

    const exMap = new Map((existingRows || []).map(r => [String(r.question_id), r]));
    const updates = [];
    const inserts = [];
    const now = new Date();
    const nowIso = now.toISOString();

    for (const p of payloads) {
      const qId = p.question_id ? String(p.question_id) : String(Math.abs((p.question_data?.content || "").length * 999));
      const ex = exMap.get(qId);

      if (ex) {
        // 🎯 1. TIME GATEKEEPER: Check if card was due today
        const isDue = !ex.next_review_at || new Date(ex.next_review_at) <= now;
        let nStreak = ex.mastery_streak || 0;
        let nRevIso = ex.next_review_at;

        if (p.isCorrect) {
          if (isDue) {
            // Sahi attempt + Due date reached = Advance Streak
            nStreak = Math.min(4, nStreak + 1);
            let nRev = new Date();
            if (nStreak < 4) {
              nRev.setDate(nRev.getDate() + REVIEW_INTERVALS_DAYS[nStreak - 1]);
              nRev.setHours(0, 0, 0, 0); // ⏰ Midnight anchor (Din me kisi bhi waqt attempt ho sake)
              nRevIso = nRev.toISOString();
            } else {
              nRev.setFullYear(nRev.getFullYear() + 100); // 🏆 Permanently Mastered
              nRevIso = nRev.toISOString();
            }
          }
          // Agar Due nahi tha aur exam me sahi hua: Streak aur next_review_at freeze rahenge
        } else {
          // ❌ Galti hui: Reset to Streak 0, Due Tomorrow Midnight
          nStreak = 0;
          let nRev = new Date();
          nRev.setDate(nRev.getDate() + 1);
          nRev.setHours(0, 0, 0, 0); // ⏰ Kal subah se available
          nRevIso = nRev.toISOString();
        }

        updates.push(supabaseClient.from("student_question_stats").update({ 
          subject: p.subject,
          times_wrong: p.isCorrect ? ex.times_wrong : (ex.times_wrong || 0) + 1, 
          times_correct: p.isCorrect ? (ex.times_correct || 0) + 1 : ex.times_correct, 
          mastery_streak: nStreak, 
          next_review_at: nRevIso, 
          last_attempt_date: nowIso, 
          question_data: p.question_data 
        }).eq("id", ex.id));

      } else {
        // 🎯 2. ZERO-POLLUTION GUARD: Sahi sawal pehli baar me mistake bank me nahi ghusega
        if (!p.isCorrect) {
          let nRev = new Date();
          nRev.setDate(nRev.getDate() + 1);
          nRev.setHours(0, 0, 0, 0); // ⏰ Kal subah se due

          inserts.push({ 
            student_roll: p.student_roll, 
            subject: p.subject, 
            question_id: qId, 
            question_data: p.question_data, 
            times_wrong: 1, 
            times_correct: 0, 
            mastery_streak: 0, 
            next_review_at: nRev.toISOString(),
            last_attempt_date: nowIso 
          });
        }
      }
    }

    if (inserts.length > 0) await supabaseClient.from("student_question_stats").insert(inserts);
    if (updates.length > 0) await Promise.allSettled(updates);
    
    cachedBoosterPool = null;
    lastBoosterFetchTime = 0;
    await fetchWeakQuestions();
  } catch (e) { 
    console.error("Mistake Bank Sync Error:", e); 
  }
}


window.launchSubjectMistakeMode = function(mode = 'quiz') {
  const telemetry = getSubjectMistakeTelemetry(activeSubject);

  if (!telemetry.allMistakes.length) {
    return showAppNoticeModal("Mistake Bank Cleared", "Zero Active Leaks! 🎉", `All flagged questions for ${activeSubject} have been mastered.`, "🏆", "Explore Sets");
  }

  if (mode === 'exam' && !telemetry.dueMistakes.length) {
    return showAppNoticeModal("Exam Mode Locked", "0 Due Today", "All due mistakes for today have already been attempted. You can use Flashcard, Quiz, or Read mode to practice anytime!", "🛡️", "Dismiss");
  }

  // 🚀 Exam drills only due questions. Practice/Quiz/Read/Flashcards allow drilling all pipeline questions anytime!
  const targetList = (mode === 'exam') ? telemetry.dueMistakes : telemetry.allMistakes;

  let qList = targetList.map((item, i) => {
    const qData = item.question_data || {};
    const opts = parseQuestionOptions(qData.options);
    return {
      qNum: i + 1,
      id: item.question_id || qData.id,
      content: qData.content,
      options: opts,
      correctAnswer: getNormalizedCorrectAnswerId(qData.correct_answer || qData.correctAnswer, opts),
      explanation: qData.explanation,
      masteryStreak: item.mastery_streak || 0
    };
  });

  if (isShuffleEnabled) {
    qList = shuffleArray(qList);
    qList.forEach((q, idx) => { q.qNum = idx + 1; });
  }

  const qCount = qList.length;

  if (mode === 'exam') {
    mountExamSession({
      id: -3,
      title: `${activeSubject} Mistake Exam`,
      subject: activeSubject,
      total_duration_minutes: Math.max(3, Math.ceil(qCount * 0.6))
    }, qList, 'Weak Area Clearance');
  } else {
    currentPracticeContext = { type: 'mistake_bank', forceAll: true };
    practiceQuestions = qList;

    const tEl = document.getElementById("practiceSetTitle");
    const subEl = document.getElementById("practiceMetaSub");
    const mbTitle = `${activeSubject} Mistake Bank`;

    if (tEl) {
      tEl.innerText = mbTitle;
      tEl.title = mbTitle;
    }
    if (subEl) {
      subEl.innerText = `${activeSubject} • ${qCount} Questions`;
    }

    switchView("viewPractice", true);
    window.setPracticeMode(mode);
  }
};



window.launchAssessment = async function(testId) {
  isExamFinished = false; 
  switchView("viewExam", true);
  const pLine = document.getElementById("examProgressLine"), cBox = document.getElementById("questionContent"), rEl = document.getElementById("examCandidateRoll");
  if (pLine) pLine.style.width = "0%"; 
  if (cBox) cBox.innerText = "Configuring assessment runtime..."; 
  if (rEl) rEl.innerText = currentCandidate?.roll_number || "---";

  try { 
    const { data: tInfo, error: tErr } = await supabaseClient.from("tests").select("id, title, total_duration_minutes").eq("id", testId).maybeSingle(); 
    if (tErr || !tInfo) throw new Error("Test details missing.");
    
    // 🎯 Catalog से सही सब्जेक्ट निकालें ताकि गलती 'General' में न जाए
    const setCat = catalogData.find(c => String(c.test_id) === String(testId));
    const testSubject = (setCat?.subject || activeSubject || "General Studies").trim();

    activeTest = { ...tInfo, subject: testSubject }; 
    document.getElementById("examTitle").innerText = activeTest.title || "Assessment"; 
    document.getElementById("subjectLabelBreadcrumb").innerText = testSubject;
    
    const mTitle = document.getElementById("mobileExamTitle");
    if (mTitle) mTitle.innerText = activeTest.title || "Assessment";

    timeRemaining = (activeTest.total_duration_minutes || 15) * 60;
    
    const { data: sections, error: sErr } = await supabaseClient.from("test_sections").select("id, section_name").eq("test_id", testId).limit(1); 
    if (sErr || !sections?.length) throw new Error("No sections configured.");
    document.getElementById("sectionTabs").innerHTML = `<button type="button" class="section-tab">Section 1: ${sections[0].section_name || "General"}</button>`;
    
    const { data: qData, error: qErr } = await supabaseClient.from("test_section_questions").select(`question_number, questions (id, content, options, correct_answer, explanation)`).eq("section_id", sections[0].id).order("question_number", { ascending: true });
    if (qErr || !qData?.length) throw new Error("Questions failed to load.");

    testQuestions = qData.map(item => {
      const q = Array.isArray(item.questions) ? item.questions[0] : item.questions; 
      if (!q) return null;
      const opts = parseQuestionOptions(q.options);
      return { 
        qNum: item.question_number, 
        id: q.id, 
        subject: testSubject,
        content: q.content, 
        options: opts, 
        correctAnswer: getNormalizedCorrectAnswerId(q.correct_answer, opts), 
        explanation: q.explanation 
      };
    }).filter(Boolean);

    if (isShuffleEnabled) {
      testQuestions = shuffleArray(testQuestions);
      testQuestions.forEach((q, idx) => { q.qNum = idx + 1; });
    }

    mountExamSession(activeTest, testQuestions, sections[0].section_name || "General");
  } catch (err) { 
    showAppNoticeModal("Assessment Error", "Cannot Launch Exam", err.message, "⚠️", "Back to Home", () => switchView("viewDashboard")); 
  }
};

window.abortExamSession = () => toggleModalDOM("abortExamModal", true);
window.closeAbortExamModal = () => toggleModalDOM("abortExamModal", false);

window.executeAbortExam = function() { 
  closeAbortExamModal(); 
  if (timerInterval) clearInterval(timerInterval); 
  isExamFinished = true; 
  userResponses = {};
  activeTest = null;
  history.back(); 
};

function renderQuestion(index) {
  if (!testQuestions[index]) return; 
  currentIndex = index;
  const q = testQuestions[index], st = userResponses[index]; 
  if (st.status === 0) st.status = 1;
  const pLine = document.getElementById("examProgressLine"); 
  if (pLine) pLine.style.width = `${((index + 1) / testQuestions.length) * 100}%`;
  document.getElementById("qDisplayNumber").innerText = q.qNum; 
  document.getElementById("questionContent").innerText = getLocalizedText(q.content);
  const optBox = document.getElementById("optionsContainer"); 
  if (!optBox) return; 
  optBox.innerHTML = "";
  (q.options || []).forEach(opt => {
    const row = document.createElement("label"); 
    row.className = "option-row";
    const radio = document.createElement("input"); 
    radio.type = "radio"; 
    radio.name = "currentOpt"; 
    radio.value = String(opt.id);
    if (st.selected === String(opt.id)) radio.checked = true;
    radio.onchange = () => { userResponses[currentIndex].selected = String(opt.id); };
    const span = document.createElement("span"); 
    span.innerText = getLocalizedText({ en: opt.en || opt.text, hi: opt.hi });
    row.appendChild(radio); 
    row.appendChild(span); 
    optBox.appendChild(row);
  });
  renderPaletteGrid(); 
  updateStatusMatrix();
  if (window.innerWidth <= 768) { 
    document.querySelector(".tcs-side-panel")?.classList.remove("open"); 
    const ov = document.getElementById("paletteOverlay"); 
    if (ov) { ov.classList.remove("open"); ov.style.pointerEvents = "none"; } 
  }
}

function advanceNextQuestion() {
  if (currentIndex + 1 < testQuestions.length) {
    renderQuestion(currentIndex + 1);
  } else {
    renderPaletteGrid(); 
    updateStatusMatrix(); 
    document.querySelector(".tcs-side-panel")?.classList.add("open");
    const ov = document.getElementById("paletteOverlay"); 
    if (ov && window.innerWidth <= 768) { 
      ov.classList.add("open"); 
      ov.style.pointerEvents = "auto"; 
    }
  }
}

function updateStatusMatrix() {
  let ans = 0, nAns = 0, nVis = 0, rev = 0, aRev = 0;
  Object.values(userResponses).forEach(r => { 
    if (r.status === 0) nVis++; 
    else if (r.status === 1) nAns++; 
    else if (r.status === 2) ans++; 
    else if (r.status === 3) rev++; 
    else if (r.status === 4) aRev++; 
  });
  ["cntAnswered", "cntNotAnswered", "cntNotVisited", "cntReview", "cntAnsReview"].forEach((id, i) => { 
    const el = document.getElementById(id); 
    if (el) el.innerText = [ans, nAns, nVis, rev, aRev][i]; 
  });
}

function startExamTimer() {
  if (timerInterval) clearInterval(timerInterval);
  const up = () => { 
    const f = `${String(Math.floor(timeRemaining / 60)).padStart(2, "0")}:${String(timeRemaining % 60).padStart(2, "0")}`; 
    document.getElementById("timerDisplay").innerText = f; 
    const m = document.getElementById("mobileTimerDisplay"); 
    if (m) m.innerText = f; 
  };
  up(); 
  timerInterval = setInterval(() => { 
    if (timeRemaining <= 0) { 
      clearInterval(timerInterval); 
      showExamSummaryModal(); 
      return; 
    } 
    timeRemaining--; 
    up(); 
  }, 1000);
}

window.closeExamModal = function() { 
  const m = document.getElementById("submitModalContainer"); 
  if (m) { m.className = ""; m.innerHTML = ""; m.style.cssText = "display: none !important;"; } 
};

window.showExamSummaryModal = function() {
  let ans = 0, nAns = 0, nVis = 0, rev = 0, aRev = 0;
  Object.values(userResponses).forEach(r => { 
    if (r.status === 0) nVis++; 
    else if (r.status === 1) nAns++; 
    else if (r.status === 2) ans++; 
    else if (r.status === 3) rev++; 
    else if (r.status === 4) aRev++; 
  });
  let modal = document.getElementById("submitModalContainer");
  if (!modal) { 
    modal = document.createElement("div"); 
    modal.id = "submitModalContainer"; 
    document.body.appendChild(modal); 
  }
  modal.className = "tcs-modal-overlay"; 
  modal.style.setProperty("display", "flex", "important");
  modal.innerHTML = `
    <div class="tcs-modal-box">
      <div class="tcs-modal-header">Exam Final Summary</div>
      <div class="tcs-modal-body">
        <table class="modal-summary-table">
          <thead><tr><th>Status Category</th><th>Total Count</th></tr></thead>
          <tbody>
            <tr><td>Total Questions</td><td>${testQuestions.length}</td></tr>
            <tr><td>Answered</td><td style="color:var(--success-dark); font-weight:bold;">${ans}</td></tr>
            <tr><td>Not Answered</td><td style="color:var(--danger-dark); font-weight:bold;">${nAns}</td></tr>
            <tr><td>Marked for Review</td><td style="color:var(--c-review); font-weight:bold;">${rev}</td></tr>
            <tr><td>Answered & Marked for Review</td><td style="color:var(--c-review); font-weight:bold;">${aRev}</td></tr>
            <tr><td>Not Visited</td><td>${nVis}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="tcs-modal-footer">
        <button type="button" class="tcs-btn btn-secondary" onclick="closeExamModal()">Back to Exam</button>
        <button type="button" class="tcs-btn btn-submit" id="btnConfirmSubmit" onclick="confirmAndFinishExam()">Confirm & Submit</button>
      </div>
    </div>`;
};

window.confirmAndFinishExam = function() { 
  const btn = document.getElementById("btnConfirmSubmit"); 
  if (btn) { btn.innerText = "Submitting..."; btn.disabled = true; } 
  if (timerInterval) clearInterval(timerInterval); 
  renderScorecard(); 
};

// 🚀 CRITICAL FIX: INSTANT IN-MEMORY TELEMETRY RECORDING & ZERO-LAG UNIQUE ATTEMPT SYNC
function renderScorecard() {
  let correct = 0, incorrect = 0, unattempted = 0, statsPayload = [];
  testQuestions.forEach((q, idx) => {
    const uAns = userResponses[idx].selected, st = userResponses[idx].status;
    const qSubj = q.subject || activeTest?.subject || activeSubject || "General Studies";

    if (!uAns) { 
      unattempted++; 
      statsPayload.push({ student_roll: currentCandidate.roll_number, subject: qSubj, question_id: q.id, question_data: q, isCorrect: false }); 
    } else if (isOptionMatching(uAns, q.correctAnswer)) { 
      correct++; 
      statsPayload.push({ student_roll: currentCandidate.roll_number, subject: qSubj, question_id: q.id, question_data: q, isCorrect: st !== 4 }); 
    } else { 
      incorrect++; 
      statsPayload.push({ student_roll: currentCandidate.roll_number, subject: qSubj, question_id: q.id, question_data: q, isCorrect: false }); 
    }
  });

  const actuallyAttemptedThisExam = correct + incorrect;
  const score = (correct * 2.00) - (incorrect * 0.50);
  const tSecs = Math.max(0, ((activeTest.total_duration_minutes || 15) * 60) - timeRemaining);
  const tMins = Math.ceil(tSecs / 60);
  const nowIso = new Date().toISOString();

  const localAttemptRecord = {
    test_id: activeTest.id,
    score: score,
    total_correct: correct,
    total_incorrect: incorrect,
    time_spent_seconds: tSecs,
    attempt_date: nowIso
  };
  userAttemptHistory.unshift(localAttemptRecord);

  const isSun = isSunday();
  const isCrucible = (activeTest.id === -1);
  const isRegular = (activeTest.id > 0);

  let hit = false;
  let shouldIncrementStreak = false;
  let requiredSundayAttempts = 0;

  // 🚀 0ms SYNCHRONOUS UNIQUE TELEMETRY UPDATE
  if (activeTest.id > 0 || (activeTest.id === -1 && isSun)) {
    const todayStr = getLocalDateString();
    const prevAttemptsOfThisSetToday = userAttemptHistory.filter(a => 
      String(a.test_id) === String(activeTest.id) && 
      getAttemptLocalDate(a.attempt_date) === todayStr
    );
    const isRetakeToday = prevAttemptsOfThisSetToday.length > 1;

    let incrementalAttempted = actuallyAttemptedThisExam;
    let incrementalCorrect = correct;

    if (isRetakeToday) {
      const prevBestAttempted = Math.max(...prevAttemptsOfThisSetToday.slice(1).map(a => (a.total_correct || 0) + (a.total_incorrect || 0)), 0);
      const prevBestCorrect = Math.max(...prevAttemptsOfThisSetToday.slice(1).map(a => (a.total_correct || 0)), 0);

      incrementalAttempted = Math.max(0, actuallyAttemptedThisExam - prevBestAttempted);
      incrementalCorrect = Math.max(0, correct - prevBestCorrect);
    }

    dailyPerf.total_questions_attempted = (dailyPerf.total_questions_attempted || 0) + incrementalAttempted;
    dailyPerf.total_correct = (dailyPerf.total_correct || 0) + incrementalCorrect;
    
    // 🎯 APPROACH 2: 70% POOL THRESHOLD WITH 50-Q FATIGUE CAP
    if (isSun) {
      const poolSize = testQuestions.length || 0;
      requiredSundayAttempts = poolSize > 0 ? Math.min(50, Math.ceil(poolSize * 0.70)) : 0;
      hit = isCrucible && (actuallyAttemptedThisExam >= requiredSundayAttempts) && (requiredSundayAttempts > 0);
    } else {
      hit = isRegular && (dailyPerf.total_questions_attempted >= 100);
    }

    if (hit && !dailyPerf.is_century_hit) {
      dailyPerf.streak_count = (dailyPerf.streak_count || 0) + 1;
      dailyPerf.is_century_hit = true;
      shouldIncrementStreak = true;
    }

    const tList = userPlaylists.find(p => p.playlist_name === 'Today');
    if (tList) {
      userPlaylistItems = userPlaylistItems.filter(pi => !(String(pi.playlist_id) === String(tList.id) && String(pi.test_id) === String(activeTest.id)));
    }

    appStorage.setJSON("cache_daily_perf_" + currentCandidate.roll_number, dailyPerf);
    appStorage.setJSON("cache_playlist_items_" + currentCandidate.roll_number, userPlaylistItems);
  }

  cachedBoosterPool = null;
  lastBoosterFetchTime = 0;

  let modal = document.getElementById("submitModalContainer");
  if (!modal) { 
    modal = document.createElement("div"); 
    modal.id = "submitModalContainer"; 
    document.body.appendChild(modal); 
  }
  modal.className = "tcs-modal-overlay"; 
  modal.style.setProperty("display", "flex", "important");
  modal.innerHTML = `
    <div class="tcs-modal-box">
      <div class="tcs-modal-header" style="background:var(--success-dark);">Assessment Scorecard & Analysis</div>
      <div class="tcs-modal-body">
        <div class="score-highlight-card">
          <h2 class="score-highlight-title">Score: ${score.toFixed(2)} / ${(testQuestions.length * 2)}</h2>
          <p>Time Taken: ${Math.floor(tSecs / 60)}m ${tSecs % 60}s | Marking: +2.00 | -0.50</p>
        </div>
        <table class="modal-summary-table">
          <tbody>
            <tr><td>Correct Answers</td><td style="color:var(--success-dark); font-weight:bold;">${correct} (+${(correct * 2).toFixed(2)})</td></tr>
            <tr><td>Incorrect Answers</td><td style="color:var(--danger-dark); font-weight:bold;">${incorrect} (-${(incorrect * 0.50).toFixed(2)})</td></tr>
            <tr><td>Unattempted</td><td>${unattempted}</td></tr>
            <tr><td>Accuracy</td><td>${actuallyAttemptedThisExam > 0 ? (((correct / actuallyAttemptedThisExam) * 100).toFixed(1)) : 0}%</td></tr>
          </tbody>
        </table>
        <div id="syncStatusMsg" style="font-size:12px; color:var(--tcs-blue-accent); text-align:center; font-weight:600; margin-top:8px;">Syncing results to database...</div>
      </div>
      <div class="tcs-modal-footer">
        <button type="button" class="tcs-btn btn-secondary" onclick="openSolutionsView()">View Detailed Solutions</button>
        <button type="button" class="tcs-btn btn-primary" onclick="closeExamAndReload()">Return to Home</button>
      </div>
    </div>`;

  (async () => {
    try {
      // 🚀 FIX: attempt_date explicitly passed to Supabase
      const { error: insErr } = await supabaseClient.from("test_attempts").insert({ 
        student_roll: currentCandidate.roll_number, 
        test_id: activeTest.id, 
        score, 
        total_correct: correct, 
        total_incorrect: incorrect, 
        time_spent_seconds: tSecs,
        attempt_date: nowIso 
      });
      if (insErr) throw insErr;

      const sMsg = document.getElementById("syncStatusMsg"); 
      if (sMsg) { 
        sMsg.style.color = "var(--success-dark)"; 
        sMsg.innerText = "✔ Progress & Metrics Synced Successfully"; 
      }

      if (activeTest.id > 0 || (activeTest.id === -1 && isSun)) {
        if (shouldIncrementStreak) {
          if (isSun) {
            showAppNoticeModal(
              "Sunday Crucible",
              "Crucible Milestone Met! 👑",
              `Weekly Backlog cleared (${actuallyAttemptedThisExam}/${testQuestions.length} Qs attempted • Min target was ${requiredSundayAttempts}). Streak +1 secured!`,
              "🎉",
              "View Dashboard"
            );
          } else {
            showAppNoticeModal(
              "Daily Milestone",
              "Baseline Target Hit! 🔥",
              "You completed your 100-Question Target for today! Streak +1 secured.",
              "🎉",
              "Keep Going"
            );
          }
        } else if (isSun && isCrucible && !dailyPerf.is_century_hit) {
          showAppNoticeModal(
            "Crucible Incomplete",
            "Target Not Reached ⚠️",
            `Aapne ${actuallyAttemptedThisExam} questions attempt kiye. Sunday streak ke liye kam se kam ${requiredSundayAttempts} questions attempt karna zaroori tha. Streak update nahi hui.`,
            "⏳",
            "Dismiss"
          );
        }

        const todayStr = getLocalDateString();
        // 🚀 FIX: Upsert by (student_roll, target_date) so it never fails even if id is null
        const { data: upsertedPerf } = await supabaseClient.from("daily_performance").upsert({ 
          student_roll: currentCandidate.roll_number,
          target_date: todayStr,
          total_questions_attempted: dailyPerf.total_questions_attempted, 
          is_century_hit: dailyPerf.is_century_hit, 
          streak_count: dailyPerf.streak_count 
        }, { onConflict: "student_roll,target_date" }).select().single();
        
        if (upsertedPerf) dailyPerf = upsertedPerf;

        const tList = userPlaylists.find(p => p.playlist_name === 'Today');
        if (tList && activeTest.id > 0) {
          await supabaseClient.from("playlist_items").delete().match({ 
            playlist_id: tList.id, 
            test_id: activeTest.id, 
            student_roll: currentCandidate.roll_number 
          });
        }
      }

      const today = getLocalDateString();
      const { data: att } = await supabaseClient.from("daily_attendance").select("id, total_minutes_spent").eq("student_roll", currentCandidate.roll_number).eq("study_date", today).maybeSingle();
      if (att) await supabaseClient.from("daily_attendance").update({ total_minutes_spent: att.total_minutes_spent + tMins }).eq("id", att.id);
      else await supabaseClient.from("daily_attendance").insert({ student_roll: currentCandidate.roll_number, study_date: today, total_minutes_spent: tMins });

      if (statsPayload.length) await syncMistakeBank(statsPayload);
    } catch (e) { 
      console.error("Score Sync Error:", e); 
      const sMsg = document.getElementById("syncStatusMsg"); 
      if (sMsg) { 
        sMsg.style.color = "var(--danger-dark)"; 
        sMsg.innerText = "⚠ Saved in local session (Cloud sync failed)"; 
      }
    }
  })();
}

// 🚀 INSTANT 0ms OPTIMISTIC RETURN TO HOME
window.closeExamAndReload = function() { 
  closeExamModal(); 
  isExamFinished = true; 

  // 1. 0ms पर तुरंत डैशबोर्ड खोलें (User को कोई लैग फील नहीं होगा)
  updateHeaderBadges();
  renderHomePlaylists(); 
  renderSubjectHubGrid(); 
  if (activeSubject) renderTopicSets(); 
  switchView('viewDashboard'); 

  // 2. बैकग्राउंड में फ्रेश डेटा सिंक करें (Non-blocking)
  (async () => {
    try {
      const { data: hist } = await supabaseClient
        .from("test_attempts")
        .select("test_id, score, total_correct, total_incorrect, attempt_date, time_spent_seconds")
        .eq("student_roll", currentCandidate.roll_number)
        .order("attempt_date", { ascending: false });
      if (hist && hist.length > 0) userAttemptHistory = hist;

      await fetchPlaylistsAndCheckRollover();
      await renderHomePlaylists();
      
      // 🚀 Background Sync: Analytics DOM को ताज़ा स्टेट के साथ तैयार रखें
      fetchStudentAnalytics(false);
    } catch (e) { 
      console.error("Background sync after exam:", e); 
    }
  })();
};

// ==========================================================================
// 🚀 EXAM SOLUTIONS VIEW WITH 3-WAY SMART FILTER (ALL, PRIORITY, MISTAKES)
// ==========================================================================
let currentSolutionsFilter = "all";

window.openSolutionsView = function() {
  closeExamModal();
  const examTitleEl = document.getElementById("solExamTitle");
  if (examTitleEl) examTitleEl.innerText = activeTest?.title || "Assessment";
  
  switchView("viewSolutions", false);
  history.replaceState({ view: 'viewSolutions' }, "", "#viewSolutions");
  
  currentSolutionsFilter = "all";
  renderSolutionsUI();
};

window.filterSolutionsView = function(filterType) {
  currentSolutionsFilter = filterType;
  renderSolutionsUI();
};

function renderSolutionsUI() {
  const container = document.getElementById("solutionsContainer");
  if (!container) return;
  container.innerHTML = "";

  const totalCount = testQuestions.length;
  let wrongCount = 0;
  let skippedCount = 0;

  // 1. Calculate Mistakes & Skipped Counts
  testQuestions.forEach((q, idx) => {
    const resp = userResponses[idx];
    const uAns = resp ? resp.selected : null;
    if (!uAns) {
      skippedCount++;
    } else if (!isOptionMatching(uAns, q.correctAnswer)) {
      wrongCount++;
    }
  });

  const priorityCount = wrongCount + skippedCount;

  // 2. Fixed Sub-Header Dock (Scroll Container ke Bahar Place Hoga)
  let filterToolbar = document.getElementById("solutionsFixedFilterBar");
  if (!filterToolbar) {
    filterToolbar = document.createElement("div");
    filterToolbar.id = "solutionsFixedFilterBar";
    filterToolbar.className = "solutions-filter-strip";
    container.parentNode.insertBefore(filterToolbar, container);
  }

  // 🚀 "All Questions" ko compact "All" kiya gaya taaki teeno pills 1 line me fit hon
  filterToolbar.innerHTML = `
    <button type="button" class="sol-filter-btn btn-all ${currentSolutionsFilter === 'all' ? 'active' : ''}" onclick="filterSolutionsView('all')">
      <span>All</span>
      <span class="filter-badge">${totalCount}</span>
    </button>
    <button type="button" class="sol-filter-btn btn-priority ${currentSolutionsFilter === 'priority' ? 'active' : ''}" onclick="filterSolutionsView('priority')" title="Mistakes & Skipped Questions">
      <span>⚡ Priority</span>
      <span class="filter-badge">${priorityCount}</span>
    </button>
    <button type="button" class="sol-filter-btn btn-wrong ${currentSolutionsFilter === 'wrong' ? 'active' : ''}" onclick="filterSolutionsView('wrong')" title="Incorrect Answers Only">
      <span>❌ Mistakes</span>
      <span class="filter-badge">${wrongCount}</span>
    </button>
  `;

  // 3. Mock State for Universal Card Builder
  const mockReviewState = {
    answers: userResponses,
    starred: new Set(),
    isFinished: true
  };

  // 4. Render Filtered Question Cards
  let visibleCount = 0;
  testQuestions.forEach((q, idx) => {
    const resp = userResponses[idx];
    const uAns = resp ? resp.selected : null;
    const isWrong = Boolean(uAns && !isOptionMatching(uAns, q.correctAnswer));
    const isSkipped = Boolean(!uAns);

    if (currentSolutionsFilter === 'wrong' && !isWrong) return;
    if (currentSolutionsFilter === 'priority' && !(isWrong || isSkipped)) return;

    visibleCount++;
    const card = buildQuestionCardDOM(q, idx, 'review', mockReviewState, false);
    container.appendChild(card);
  });

  // 5. Clean Slate Empty Notice
  if (visibleCount === 0) {
    const emptyNotice = document.createElement("div");
    emptyNotice.style.cssText = "text-align:center; padding:48px 16px; color:var(--text-muted); font-size:13.5px; font-weight:700;";
    if (currentSolutionsFilter === 'wrong') {
      emptyNotice.innerHTML = `
        <div style="font-size:32px; margin-bottom:10px;">🎯</div>
        <strong style="color:var(--success-dark); font-size:15px; display:block;">Zero Mistakes!</strong>
        <p style="margin-top:4px; font-weight:500; font-size:12.5px;">You answered every attempted question correctly in this session.</p>
      `;
    } else if (currentSolutionsFilter === 'priority') {
      emptyNotice.innerHTML = `
        <div style="font-size:32px; margin-bottom:10px;">🏆</div>
        <strong style="color:var(--success-dark); font-size:15px; display:block;">Flawless Execution!</strong>
        <p style="margin-top:4px; font-weight:500; font-size:12.5px;">All questions were attempted accurately with zero skips and zero errors.</p>
      `;
    }
    container.appendChild(emptyNotice);
  }
}

function renderPaletteGrid() {
  const grid = document.getElementById("paletteGrid"); 
  if (!grid) return; 
  grid.innerHTML = "";
  testQuestions.forEach((q, idx) => {
    const btn = document.createElement("button"); 
    btn.type = "button"; 
    btn.className = "palette-btn"; 
    btn.innerText = q.qNum;
    if (idx === currentIndex) btn.classList.add("active-q");
    const st = userResponses[idx].status;
    if (st === 0) btn.classList.add("not-visited"); 
    else if (st === 1) btn.classList.add("not-answered"); 
    else if (st === 2) btn.classList.add("answered"); 
    else if (st === 3) btn.classList.add("review"); 
    else if (st === 4) btn.classList.add("ans-review");
    btn.onclick = () => renderQuestion(idx); 
    grid.appendChild(btn);
  });
}

// ==========================================================================
// 10. REFACTORED PERFORMANCE ANALYTICS & TELEMETRY ENGINE
// ==========================================================================

// 📈 DYNAMIC SPARKLINE SVG GENERATOR (SYNTAX FIXED)
function drawSparkline(id, data, color) {
  const el = document.getElementById(id); 
  if (!el) return; 
  if (!data?.length) return el.innerHTML = '';
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = Math.max(max - min, 1);
  const len = Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => `${(i / len) * 60},${28 - (((v - min) / range) * 22)}`).join(" ");
  el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 60 30" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// 🚀 8.1: TOP STATS & SPARKLINES RENDERER
function renderAnalyticsTopStats(telemetry) {
  const { accVal, nCorr, nIncorr, streak, avgSpd, accTrends, speedTrends, attMap } = telemetry;

  // 1. Header Badges Sync
  ['headerStreakCount', 'headerStreakCount_lib', 'headerStreakCount_stats', 'headerStreakCount_prof'].forEach(id => { 
    const el = document.getElementById(id); 
    if (el) el.innerText = streak + (window.innerWidth <= 768 ? "" : " Days"); 
  });
  ['headerAccuracyCount', 'headerAccuracyCount_lib', 'headerAccuracyCount_stats', 'headerAccuracyCount_prof'].forEach(id => { 
    const el = document.getElementById(id); 
    if (el) el.innerText = accVal + "%"; 
  });

  // 2. Top Metric Cards
  const eAcc = document.getElementById("statAccuracy"); 
  if (eAcc) eAcc.innerHTML = `<div style="display:flex; align-items:baseline; gap:6px;"><span>${accVal}%</span><span style="font-size:10px; font-weight:700; color:var(--success-dark); font-family:var(--font-family);">+${nCorr}</span><span style="font-size:10px; font-weight:700; color:var(--danger-dark); font-family:var(--font-family);">-${nIncorr}</span></div>`;
  
  const eStr = document.getElementById("statStreak"); 
  if (eStr) eStr.innerHTML = `<div style="display:flex; align-items:baseline; gap:6px;"><span>${streak} 🔥</span><span style="font-size:10px; font-weight:700; color:var(--tcs-blue-accent); font-family:var(--font-family); text-transform:uppercase;">${streak > 2 ? 'Consistent' : 'Starting'}</span></div>`;
  
  const eSpd = document.getElementById("statSpeed"); 
  if (eSpd) eSpd.innerHTML = `<div style="display:flex; align-items:baseline; gap:6px;"><span>${avgSpd}s</span><span style="font-size:10px; font-weight:700; color:var(--tcs-blue-accent); font-family:var(--font-family); text-transform:uppercase;">${avgSpd <= 15 ? 'Rapid' : (avgSpd > 35 ? 'Thorough' : 'Balanced')}</span></div>`;

  // 3. Dynamic Sparklines
  drawSparkline("sparkAccuracy", accTrends.slice(-10), "var(--tcs-blue-accent)");
  drawSparkline("sparkStreak", Object.keys(attMap).sort((a,b) => new Date(a) - new Date(b)).slice(-10).map(d => attMap[d] || 0), "var(--warning)");
  drawSparkline("sparkSpeed", speedTrends.slice(-10), "var(--success)");
}

function getTacticalStatsForDate(d, atts = [], attMap = {}) {
  const isToday = (d === getLocalDateString());
  let dCorr = 0;
  let dIncorr = 0;
  let dSecs = 0;
  const dMasteredTests = new Set();

  (atts || []).forEach(a => {
    const attDate = getAttemptLocalDate(a.attempt_date);
    if (attDate === d) {
      dCorr += (a.total_correct || 0);
      dIncorr += (a.total_incorrect || 0);
      dSecs += (a.time_spent_seconds || 0);

      if (Number(a.test_id) > 0) {
        const cat = catalogData.find(item => String(item.test_id) === String(a.test_id));
        const tQs = cat ? (cat.total_questions || 10) : ((a.total_correct || 0) + (a.total_incorrect || 0) || 10);
        const maxM = tQs * 2;
        const pct = maxM > 0 ? (parseFloat(a.score || 0) / maxM) * 100 : 0;
        if (pct >= 100) dMasteredTests.add(String(a.test_id));
      }
    }
  });

  const dQAttempted = dCorr + dIncorr;
  const dGross = dCorr * 2.0;
  const dBleed = Math.round(dIncorr * 0.5 * 100) / 100;
  const dNet = Math.round((dGross - dBleed) * 100) / 100;
  const dAcc = dQAttempted > 0 ? Math.round((dCorr / dQAttempted) * 100) : 0;
  const dAvgPace = dQAttempted > 0 ? Math.round(dSecs / dQAttempted) : 0;

  let dPromoted = 0;
  let dFreshErrors = 0;
  (userWeakQuestions || []).forEach(q => {
    if (getAttemptLocalDate(q.last_attempt_date) === d) {
      if ((q.mastery_streak || 0) > 0) dPromoted++;
      else if ((q.times_wrong || 0) > 0) dFreshErrors++;
    }
  });

  const dMins = attMap[d] || 0;

  return {
    date: d,
    isToday,
    dCorr,
    dIncorr,
    dQAttempted,
    dGross,
    dBleed,
    dNet,
    dAcc,
    dAvgPace,
    dPromoted,
    dFreshErrors,
    dMins,
    dMasteredCount: dMasteredTests.size
  };
}

window.switchTacticalDate = function(targetDate) {
  if (!cachedWeeklyContext || !cachedWeeklyContext.past7.includes(targetDate)) return;
  activeTacticalDate = targetDate;
  renderWeeklyConsistencyTrack(cachedWeeklyContext);
};

window.stepTacticalDate = function(dir) {
  if (!cachedWeeklyContext) return;
  const { past7 } = cachedWeeklyContext;
  const currIdx = past7.indexOf(activeTacticalDate || past7[0]);
  if (currIdx === -1) return;
  const nextIdx = currIdx - dir;
  if (nextIdx >= 0 && nextIdx < past7.length) {
    window.switchTacticalDate(past7[nextIdx]);
  }
};

function renderWeeklyConsistencyTrack(context) {
  const { attMap = {}, past7 = [], todayStr, dailyQuestionsMap = {}, atts = [] } = context;
  const extra = document.getElementById("extraAnalyticsSummary");
  if (!extra || !past7.length) return;

  if (!activeTacticalDate || !past7.includes(activeTacticalDate)) {
    activeTacticalDate = todayStr || past7[0];
  }

  const currIdx = past7.indexOf(activeTacticalDate);
  const canStepBack = currIdx < past7.length - 1;
  const canStepForward = currIdx > 0;

  let dateLabel = "Today";
  if (currIdx === 1) {
    dateLabel = "Yesterday";
  } else if (currIdx > 1) {
    const dObj = new Date(activeTacticalDate);
    dateLabel = dObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  const dStats = getTacticalStatsForDate(activeTacticalDate, atts, attMap);
  const isToday = dStats.isToday;

  const dots = past7.slice().reverse().map(d => {
    const mins = attMap[d] || 0;
    const qCount = dailyQuestionsMap[d] || 0;
    const dayLabel = new Date(d).toLocaleDateString('en-US', { weekday: 'narrow' });
    const dateFormatted = new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isActive = (d === activeTacticalDate);

    let nodeClass = "node-tier-inactive";
    let nodeIcon = "•";
    let hoverTitle = `${dateFormatted}: Rest / Inactive`;

    const isThisToday = (d === todayStr);
    const isSundayCentury = isThisToday && isSunday() && dailyPerf?.is_century_hit;

    if (qCount >= 300) {
      nodeClass = "node-tier-crown";
      nodeIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`;
      hoverTitle = `${dateFormatted}: Apex Crucible Conquered (${qCount} Qs • ${Math.floor(mins / 60)}h ${mins % 60}m)`;
    } else if (qCount >= 200) {
      nodeClass = "node-tier-overdrive";
      nodeIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      hoverTitle = `${dateFormatted}: Double Century Overdrive (${qCount} Qs • ${Math.floor(mins / 60)}h ${mins % 60}m)`;
    } else if (qCount >= 100 || isSundayCentury) {
      nodeClass = "node-tier-century";
      nodeIcon = "✓";
      hoverTitle = `${dateFormatted}: Daily Milestone Secured (${qCount} Qs • ${Math.floor(mins / 60)}h ${mins % 60}m)`;
    } else if (mins > 0 || qCount > 0) {
      nodeClass = "node-tier-presence";
      nodeIcon = "✓";
      hoverTitle = `${dateFormatted}: Session Logged (${qCount} Qs • ${mins}m)`;
    }

    return `
      <div class="weekly-node-col ${isActive ? 'node-active-day' : ''}" onclick="switchTacticalDate('${d}')" title="Tap to view ${dateFormatted} metrics">
        <span class="weekly-node-day">${dayLabel}</span>
        <span class="weekly-track-node ${nodeClass}" title="${hoverTitle}">${nodeIcon}</span>
      </div>
    `;
  }).join("");

  let last7Mins = 0;
  past7.forEach(d => { last7Mins += (attMap[d] || 0); });

  let verdictHtml = "";
  if (dStats.dQAttempted === 0 && dStats.dMins === 0) {
    verdictHtml = `
      <div class="today-tactical-footer">
        <span>🎯 <strong>Ready for Action:</strong> ${isToday ? "No tests attempted today. Launch today's payload to start tracking daily output!" : "No sessions or practice tests logged on this date."}</span>
      </div>
    `;
  } else if (dStats.dBleed === 0 && dStats.dCorr > 0) {
    verdictHtml = `
      <div class="today-tactical-footer verdict-green">
        <span>🏆 <strong>Flawless Precision:</strong> Zero negative penalties ${isToday ? "today" : "on this date"}! 100% score retention across attempted sets.</span>
      </div>
    `;
  } else if (dStats.dGross > 0 && (dStats.dBleed / dStats.dGross) > 0.20) {
    verdictHtml = `
      <div class="today-tactical-footer verdict-red">
        <span>⚠️ <strong>Penalty Warning:</strong> Negative bleed (-${dStats.dBleed.toFixed(1)}) took over 20% of ${isToday ? "today's" : "that day's"} earnings. Curtail 50/50 doubts.</span>
      </div>
    `;
  } else {
    verdictHtml = `
      <div class="today-tactical-footer verdict-blue">
        <span>⚡ <strong>Disciplined Scoring:</strong> +${dStats.dNet.toFixed(1)} net marks realized with ${dStats.dAcc}% strike-rate.</span>
      </div>
    `;
  }

  const formatNetVal = dStats.dNet > 0 ? `+${dStats.dNet.toFixed(1)}` : (dStats.dNet < 0 ? `${dStats.dNet.toFixed(1)}` : `0.0`);
  const netColorStyle = dStats.dNet > 0 ? "color:var(--success-dark);" : (dStats.dNet < 0 ? "color:var(--danger-dark);" : "color:var(--text-main);");
  const accColorStyle = dStats.dAcc >= 80 ? "color:var(--success-dark);" : (dStats.dAcc >= 60 ? "color:var(--warning-dark);" : "color:var(--danger-dark);");

  extra.innerHTML = `
    <div class="profile-section-card" id="tacticalSheetCard" style="padding:14px 16px; border-left:4px solid var(--success); display:flex; flex-direction:column; justify-content:space-between; user-select:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <h4 style="font-size:13.5px; font-weight:800; color:var(--tcs-blue-header); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">🎯 ${isToday ? "Today's" : (currIdx === 1 ? "Yesterday's" : dateLabel)} Balance Sheet</h4>
        <div class="tactical-stepper-wrap">
          <button type="button" class="btn-stepper-nav" onclick="stepTacticalDate(-1)" title="Previous Day" ${canStepBack ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="stepper-date-label">${dateLabel}</span>
          <button type="button" class="btn-stepper-nav" onclick="stepTacticalDate(1)" title="Next Day" ${canStepForward ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>

      <div class="today-bento-grid tactical-sheet-body">
        <div class="today-bento-cell">
          <span class="today-bento-label">Net Realized P&L</span>
          <strong class="today-bento-value" style="${netColorStyle}">${formatNetVal}</strong>
          <span class="today-bento-sub">+${dStats.dGross.toFixed(1)} Earned • -${dStats.dBleed.toFixed(1)} Bleed</span>
        </div>

        <div class="today-bento-cell">
          <span class="today-bento-label">Daily Strike-Rate</span>
          <strong class="today-bento-value" style="${accColorStyle}">${dStats.dAcc}%</strong>
          <span class="today-bento-sub">${dStats.dCorr} Correct • ${dStats.dIncorr} Wrong</span>
        </div>

        <div class="today-bento-cell">
          <span class="today-bento-label">Vault Recovery Delta</span>
          <strong class="today-bento-value" style="color:var(--success-dark);">${dStats.dPromoted > 0 ? `+${dStats.dPromoted}` : '0'} Promoted</strong>
          <span class="today-bento-sub">vs ${dStats.dFreshErrors} New Leaks Flagged</span>
        </div>

        <div class="today-bento-cell">
          <span class="today-bento-label">Time & Solving Pace</span>
          <strong class="today-bento-value" style="color:var(--tcs-blue-accent);">${dStats.dMins >= 60 ? `${Math.floor(dStats.dMins / 60)}h ${dStats.dMins % 60}m` : `${dStats.dMins}m`}</strong>
          <span class="today-bento-sub">${dStats.dMasteredCount} Mastered Sets • ${dStats.dAvgPace > 0 ? `Avg ${dStats.dAvgPace}s/Q` : '--'}</span>
        </div>
      </div>

      ${verdictHtml}
    </div>

    <div class="profile-section-card" style="padding:14px 16px; border-left:4px solid var(--tcs-blue-accent); display:flex; flex-direction:column; justify-content:space-between;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="font-size:13.5px; font-weight:800; color:var(--tcs-blue-header); margin:0;">📊 Weekly Consistency Track</h4>
        <span style="font-size:11px; font-weight:700; color:var(--tcs-blue-accent); font-family:var(--font-mono);">${Object.keys(attMap).filter(d => past7.includes(d)).length} / 7 Days Active</span>
      </div>
      <div class="weekly-track-container">${dots}</div>
      <div style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--text-muted); margin-top:auto;">
        <span>Total: <strong style="color:var(--tcs-blue-accent); font-family:var(--font-mono);">${Math.floor(last7Mins / 60)}h ${last7Mins % 60}m</strong></span>
        <span>Daily Pace: <strong style="color:var(--tcs-blue-accent); font-family:var(--font-mono);">${Math.round(last7Mins / 7)}m / day</strong></span>
      </div>
    </div>
  `;

  const cardEl = document.getElementById("tacticalSheetCard");
  if (cardEl) {
    let tStartX = 0;
    let tStartY = 0;
    let tStartTime = 0;

    cardEl.addEventListener("touchstart", (e) => {
      tStartX = e.touches[0].clientX;
      tStartY = e.touches[0].clientY;
      tStartTime = Date.now();
    }, { passive: true });

    cardEl.addEventListener("touchend", (e) => {
      const diffX = e.changedTouches[0].clientX - tStartX;
      const diffY = e.changedTouches[0].clientY - tStartY;
      const duration = Date.now() - tStartTime;

      if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.2 && duration < 500) {
        if (diffX < 0) {
          window.stepTacticalDate(-1);
        } else {
          window.stepTacticalDate(1);
        }
      }
    }, { passive: true });
  }
}

// 🚀 8.3: SYLLABUS, DOMAIN INSIGHTS & RADAR VIEW RENDERER
function renderDomainCompetencyMatrix(matrixData) {
  const { subStats, attemptedTests, masteredTests } = matrixData;

  // 1. Dual-Track Syllabus Progress
  const totalCatalogCount = catalogData.length || 1;
  const coveredPct = Math.min(100, Math.round((attemptedTests.size / totalCatalogCount) * 100));
  const masteredPct = Math.min(100, Math.round((masteredTests.size / totalCatalogCount) * 100));

  const eSyl = document.getElementById("syllabusPercentTxt");
  if (eSyl) eSyl.innerText = `${coveredPct}% Covered • ${masteredPct}% Mastered`;
  const attFill = document.getElementById("syllabusAttemptedFill");
  if (attFill) attFill.style.width = coveredPct + "%";
  const masFill = document.getElementById("syllabusLinearFill");
  if (masFill) masFill.style.width = masteredPct + "%";

  const sAttCount = document.getElementById("sylAttemptedCount");
  if (sAttCount) sAttCount.innerText = `${attemptedTests.size}/${totalCatalogCount}`;
  const sMasCount = document.getElementById("sylMasteredCount");
  if (sMasCount) sMasCount.innerText = `${masteredTests.size}/${totalCatalogCount}`;

  // 2. Strongest & Weakest Domain Insights
  let bestSub = null, worstSub = null;
  Object.entries(subStats).forEach(([name, data]) => {
    const acc = data.max > 0 ? (data.earned / data.max) * 100 : 0;
    const info = { name, acc, ...data };
    if (!bestSub || info.acc > bestSub.acc) bestSub = info; 
    if (!worstSub || info.acc < worstSub.acc) worstSub = info;
  });

  const iS = document.getElementById("insightStrong"); 
  if (iS) iS.innerHTML = bestSub?.sets > 0 
    ? `<div style="display:flex; justify-content:space-between; align-items:center;"><strong>🔥 Strongest Domain: ${bestSub.name}</strong><span style="font-weight:800; font-family:var(--font-mono); color:var(--success-dark);">${Math.round(bestSub.acc)}%</span></div><div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">High strike-rate across ${bestSub.sets} unique sets (${bestSub.correct} correct answers).</div>` 
    : `<strong>🔥 Strongest:</strong> Complete sets to identify your core strength.`;
  
  const iW = document.getElementById("insightWeak"); 
  if (iW) iW.innerHTML = worstSub?.sets > 0 
    ? `<div style="display:flex; justify-content:space-between; align-items:center;"><strong>⚠️ Priority Focus: ${worstSub.name}</strong><span style="font-weight:800; font-family:var(--font-mono); color:var(--danger-dark);">${Math.round(worstSub.acc)}%</span></div><div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">Negative penalty bleed: <strong style="color:var(--danger-dark);">-${(worstSub.incorrect * 0.50).toFixed(1)} Marks</strong> (${worstSub.incorrect} wrong in best attempts). Curtail guesswork here.</div>` 
    : `<strong>⚠️ Priority Focus:</strong> Attempt diagnostic assessments to flag weaker domains.`;

  // 3. Grid Viewport (Batched DOM Build)
  const isMobileViewport = window.innerWidth <= 768;
  const subList = Array.from(new Set(catalogData.map(c => (c.subject || "").trim()).filter(Boolean))).map(s => {
    const st = subStats[s] || { earned: 0, max: 0, sets: 0 }; 
    return { subject: s, pct: st.max > 0 ? Math.max(0, Math.round((st.earned / st.max) * 100)) : 0 };
  });

  const gView = document.getElementById("gridViewport");
  if (gView) { 
    gView.innerHTML = subList.map(item => `
      <div class="micro-domain-chip">
        <div class="micro-chip-top">
          <span class="micro-chip-title" title="${item.subject}">${item.subject}</span>
          <span class="micro-chip-val">${item.pct}%</span>
        </div>
        <div class="micro-chip-bar">
          <div class="micro-chip-fill" style="width: ${item.pct}%;"></div>
        </div>
      </div>
    `).join("");
  }

  // 4. Radar Canvas Drawing
  const isAnalyticsVisible = document.getElementById("viewAnalytics")?.style.display === "flex";
  const rCanvas = document.getElementById("subjectRadarChart");
  if (rCanvas && window.Chart && isAnalyticsVisible) {
    const isDark = document.body.classList.contains("dark-theme"), 
          gColor = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(15, 23, 42, 0.08)", 
          aColor = isDark ? "#38bdf8" : "#2563eb";

    if (subjectRadarChartInstance) subjectRadarChartInstance.destroy();
    subjectRadarChartInstance = new Chart(rCanvas, {
      type: 'radar',
      data: { 
        labels: subList.map(s => s.subject.length > 12 ? s.subject.substring(0, 10) + ".." : s.subject), 
        datasets: [{ 
          label: 'Competency %', 
          data: subList.map(s => s.pct), 
          backgroundColor: isDark ? "rgba(56, 189, 248, 0.25)" : "rgba(37, 99, 235, 0.18)", 
          borderColor: aColor, 
          borderWidth: 2, 
          pointBackgroundColor: aColor, 
          pointRadius: 3 
        }] 
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { display: false } }, 
        scales: { 
          r: { 
            angleLines: { color: gColor }, 
            grid: { color: gColor }, 
            pointLabels: { color: isDark ? "#94a3b8" : "#475569", font: { size: 10, weight: '700' } }, 
            suggestedMin: 0, 
            suggestedMax: 100, 
            ticks: { display: false, stepSize: 25 } 
          } 
        } 
      }
    });
  }
}

window.scrollMasterySlide = function(index) {
  const track = document.getElementById("masteryCarouselTrack");
  if (!track) return;
  track.scrollTo({ left: index * (track.offsetWidth || 1), behavior: 'smooth' });
};

window.scrollBleedSlide = function(index) {
  const track = document.getElementById("bleedCarouselTrack");
  if (!track) return;
  track.scrollTo({ left: index * (track.offsetWidth || 1), behavior: 'smooth' });
};

function initAnalyticsCarousels() {
  const mTrack = document.getElementById("masteryCarouselTrack");
  const mDot0 = document.getElementById("masteryDot0");
  const mDot1 = document.getElementById("masteryDot1");
  if (mTrack && mDot0 && mDot1) {
    mTrack.addEventListener("scroll", () => {
      const width = mTrack.offsetWidth || 1;
      const idx = Math.round(mTrack.scrollLeft / width);
      mDot0.classList.toggle("active", idx === 0);
      mDot1.classList.toggle("active", idx !== 0);
      if (idx === 0 && subjectRadarChartInstance) {
        try { subjectRadarChartInstance.resize(); } catch (e) {}
      }
    }, { passive: true });
  }

  const bTrack = document.getElementById("bleedCarouselTrack");
  const bDot0 = document.getElementById("bleedDot0");
  const bDot1 = document.getElementById("bleedDot1");
  if (bTrack && bDot0 && bDot1) {
    bTrack.addEventListener("scroll", () => {
      const width = bTrack.offsetWidth || 1;
      const idx = Math.round(bTrack.scrollLeft / width);
      bDot0.classList.toggle("active", idx === 0);
      bDot1.classList.toggle("active", idx !== 0);
    }, { passive: true });
  }
}

function renderAuditAndRetentionEngines(totals = {}, subStats = {}) {
  const nCorr = totals.nCorr || 0;
  const nIncorr = totals.nIncorr || 0;
  const totalQ = totals.totalQ || (nCorr + nIncorr);

  const allMistakes = (typeof userWeakQuestions !== "undefined" && Array.isArray(userWeakQuestions))
    ? userWeakQuestions.filter(q => (q.times_wrong || 0) > 0)
    : [];
  
  const totalMistakes = allMistakes.length;
  const masteredMistakes = allMistakes.filter(q => (q.mastery_streak || 0) >= 4).length;
  const loopMistakes = allMistakes.filter(q => (q.mastery_streak || 0) >= 1 && (q.mastery_streak || 0) < 4).length;
  const unaddressedMistakes = allMistakes.filter(q => (q.mastery_streak || 0) === 0).length;

  const recoveryRate = totalMistakes > 0 ? Math.round((masteredMistakes / totalMistakes) * 100) : 0;
  const activePipelineRate = totalMistakes > 0 ? Math.min(100, Math.round(((masteredMistakes + loopMistakes) / totalMistakes) * 100)) : 0;

  const fBadge = document.getElementById("funnelRateBadge");
  if (fBadge) fBadge.innerText = `${recoveryRate}% RECOVERED`;

  const fActiveFill = document.getElementById("funnelActiveFill");
  if (fActiveFill) fActiveFill.style.width = `${activePipelineRate}%`;

  const fMasteredFill = document.getElementById("funnelMasteredFill");
  if (fMasteredFill) fMasteredFill.style.width = `${recoveryRate}%`;

  const fUnaddressed = document.getElementById("funnelUnaddressedVal");
  if (fUnaddressed) fUnaddressed.innerText = unaddressedMistakes;

  const fLoop = document.getElementById("funnelLoopVal");
  if (fLoop) fLoop.innerText = loopMistakes;

  const fCleared = document.getElementById("funnelClearedVal");
  if (fCleared) fCleared.innerText = masteredMistakes;

  const fNote = document.getElementById("funnelFooterNote");
  if (fNote) {
    if (totalMistakes === 0) {
      fNote.style.borderLeftColor = "var(--success)";
      fNote.innerHTML = `🛡️ <strong style="color:var(--success-dark);">Clean Slate:</strong> Zero mistakes logged. All questions attempted accurately!`;
    } else if (recoveryRate >= 75) {
      fNote.style.borderLeftColor = "var(--success)";
      fNote.innerHTML = `🏆 <strong style="color:var(--success-dark);">Exceptional Retention:</strong> ${masteredMistakes} of ${totalMistakes} mistakes permanently mastered into long-term recall.`;
    } else if (loopMistakes > 0) {
      fNote.style.borderLeftColor = "var(--warning)";
      fNote.innerHTML = `⚡ <strong style="color:var(--warning-dark);">${loopMistakes} questions</strong> advancing through the review loop. Clear upcoming Mastery Booster sets to lock them into Streak 4.`;
    } else {
      fNote.style.borderLeftColor = "var(--danger)";
      fNote.innerHTML = `⚠️ <strong style="color:var(--danger-dark);">${unaddressedMistakes} fresh errors</strong> awaiting first review. Launch Mistake Bank or Daily Booster to start the recovery cycle.`;
    }
  }

  const formatScore = (val) => {
    const num = Number(val);
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  const grossEarned = nCorr * 2.00;
  const penaltyBleed = nIncorr * 0.50;
  const netRealized = Math.max(0, grossEarned - penaltyBleed);

  let bleedPercentage = "0.0";
  let scoreEfficiency = 0;

  if (grossEarned > 0) {
    bleedPercentage = ((penaltyBleed / grossEarned) * 100).toFixed(1);
    scoreEfficiency = Math.max(0, Math.min(100, Math.round((netRealized / grossEarned) * 100)));
  } else if (penaltyBleed > 0) {
    bleedPercentage = "100.0";
    scoreEfficiency = 0;
  }

  const bBadge = document.getElementById("bleedRatioBadge");
  if (bBadge) bBadge.innerText = `-${formatScore(penaltyBleed)} MARKS LOST`;

  const bGrossVal = document.getElementById("bleedGrossVal");
  if (bGrossVal) bGrossVal.innerText = `+${formatScore(grossEarned)}`;
  const bGrossSub = document.getElementById("bleedGrossSub");
  if (bGrossSub) bGrossSub.innerHTML = `<span>${nCorr} ✓</span> <small>(+2)</small>`;

  const bPenVal = document.getElementById("bleedPenaltyVal");
  if (bPenVal) bPenVal.innerText = `-${formatScore(penaltyBleed)}`;
  const bPenSub = document.getElementById("bleedPenaltySub");
  if (bPenSub) bPenSub.innerHTML = `<span>${nIncorr} ✗</span> <small>(-0.5)</small>`;

  const bNetVal = document.getElementById("bleedNetVal");
  if (bNetVal) bNetVal.innerText = `${formatScore(netRealized)}`;
  const bNetSub = document.getElementById("bleedNetSub");
  if (bNetSub) bNetSub.innerText = `${scoreEfficiency}% Retained`;

  // 🎯 3. SUBJECT-WISE LEAK MATRIX COMPILER (Multi-Factor Risk & Precision Locked)
  const matrixContainer = document.getElementById("subjectLeakMatrixContainer");
  const subjectList = Object.entries(subStats)
    .map(([name, data]) => {
      const wrong = data.incorrect || 0;
      const correct = data.correct || 0;
      const attempted = correct + wrong;
      // Precision-safe loss calculation (avoid binary floating-point drift)
      const loss = Math.round(wrong * 0.5 * 100) / 100;
      const errorRate = attempted > 0 ? Math.round((wrong / attempted) * 100) : 0;
      return { name, wrong, correct, loss, attempted, errorRate };
    })
    .filter(s => s.attempted > 0)
    .sort((a, b) => {
      // Primary Sort: Sabse zyada marks loss
      if (b.loss !== a.loss) return b.loss - a.loss;
      // Secondary Tie-Breaker: Zyada error rate pehle aayegi
      return b.errorRate - a.errorRate;
    });

  if (matrixContainer) {
    if (subjectList.length === 0) {
      matrixContainer.innerHTML = `<div style="text-align:center; padding:12px; font-size:11px; color:var(--text-muted);">Attempt mock sets to map subject-wise penalties.</div>`;
    } else {
      matrixContainer.innerHTML = subjectList.map(item => {
        let riskClass = "risk-safe";
        let riskLabel = "Safe";

        // Balanced Risk Algorithm considering both absolute bleed and error percentage
        if (item.loss >= 4.0 || (item.attempted >= 4 && item.errorRate >= 35)) {
          riskClass = "risk-high";
          riskLabel = "High Risk";
        } else if (item.loss >= 1.5 || (item.attempted >= 4 && item.errorRate >= 15)) {
          riskClass = "risk-moderate";
          riskLabel = "Moderate";
        }

        return `
          <div class="leak-matrix-row ${riskClass}">
            <div class="leak-row-left">
              <span class="leak-subject-title">${item.name}</span>
              <span class="leak-subject-sub">${item.wrong} wrong out of ${item.attempted} attempts (${item.errorRate}% error rate)</span>
            </div>
            <div class="leak-row-right">
              <span class="leak-marks-tag">-${formatScore(item.loss)}</span>
              <span class="leak-risk-badge">${riskLabel}</span>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  const bNote = document.getElementById("bleedFooterNote");
  if (bNote) {
    if (totalQ === 0) {
      bNote.className = "bleed-verdict-card verdict-neutral";
      bNote.innerHTML = `
        <div class="verdict-header">
          <span class="verdict-status-pill pill-neutral">🛡️ ZERO TELEMETRY</span>
        </div>
        <div class="verdict-body">
          Attempt mock sets to evaluate guesswork penalties and score retention.
        </div>
      `;
    } else if (penaltyBleed === 0) {
      bNote.className = "bleed-verdict-card verdict-success";
      bNote.innerHTML = `
        <div class="verdict-header">
          <span class="verdict-status-pill pill-success">🎯 100% EFFICIENCY</span>
          <span class="verdict-metric-pill pill-metric-success">0.0% BLEED</span>
        </div>
        <div class="verdict-body">
          <strong>Sniper Precision:</strong> Zero negative deductions. Every question attempted was correct!
        </div>
      `;
    } else if (grossEarned === 0 || parseFloat(bleedPercentage) > 20) {
      bNote.className = "bleed-verdict-card verdict-danger";
      bNote.innerHTML = `
        <div class="verdict-header">
          <span class="verdict-status-pill pill-danger">⚠️ ${bleedPercentage}% BLEED</span>
          <span class="verdict-metric-pill pill-metric-danger">-${formatScore(penaltyBleed)} MARKS</span>
        </div>
        <div class="verdict-body">
          Negative deductions are severely eroding your score (${nIncorr} wrong). Practice skipping 50/50 doubts immediately.
        </div>
      `;
    } else if (parseFloat(bleedPercentage) > 10) {
      bNote.className = "bleed-verdict-card verdict-warning";
      bNote.innerHTML = `
        <div class="verdict-header">
          <span class="verdict-status-pill pill-warning">⚡ CONTROLLED BLEED</span>
          <span class="verdict-metric-pill pill-metric-warning">${bleedPercentage}% BLEED</span>
        </div>
        <div class="verdict-body">
          Moderately disciplined scoring with -${formatScore(penaltyBleed)} marks lost. Minimizing doubtful attempts will boost your rank.
        </div>
      `;
    } else {
      bNote.className = "bleed-verdict-card verdict-success";
      bNote.innerHTML = `
        <div class="verdict-header">
          <span class="verdict-status-pill pill-success">🏆 ${scoreEfficiency}% HIGH EFFICIENCY</span>
          <span class="verdict-metric-pill pill-metric-success">${bleedPercentage}% BLEED</span>
        </div>
        <div class="verdict-body">
          <strong>Outstanding Exam Discipline:</strong> Minimal guesswork penalty (${bleedPercentage}% bleed). Examination-ready accuracy.
        </div>
      `;
    }
  }

  const dNote = document.getElementById("bleedDomainVerdictNote");
  if (dNote) {
    const worstSub = subjectList.length > 0 ? subjectList[0] : null;

    if (!worstSub || worstSub.loss === 0) {
      dNote.className = "bleed-verdict-card verdict-success";
      dNote.innerHTML = `
        <div class="verdict-header">
          <span class="verdict-status-pill pill-success">🎯 ALL DOMAINS SAFE</span>
        </div>
        <div class="verdict-body">
          Flawless discipline across all domains. Zero negative marking deductions logged.
        </div>
      `;
    } else {
      const isCritical = worstSub.loss >= 4.0;
      dNote.className = `bleed-verdict-card ${isCritical ? 'verdict-danger' : 'verdict-warning'}`;
      dNote.innerHTML = `
        <div class="verdict-header">
          <span class="verdict-status-pill ${isCritical ? 'pill-danger' : 'pill-warning'}">⚠️ PRIMARY TARGET: ${worstSub.name.toUpperCase()}</span>
          <span class="verdict-metric-pill ${isCritical ? 'pill-metric-danger' : 'pill-metric-warning'}">-${formatScore(worstSub.loss)} MARKS</span>
        </div>
        <div class="verdict-body">
          Biggest score leak is occurring in <strong>${worstSub.name}</strong> (${worstSub.wrong} wrong attempts). Skipping doubtful questions here will instantly improve your net cutoff.
        </div>
      `;
    }
  }
}

// 🚀 LEAN ORCHESTRATOR: FETCH STUDENT ANALYTICS
let _isFetchingStats = false;
window.fetchStudentAnalytics = async function(isSilent = false) {
  if (_isFetchingStats) return; 
  _isFetchingStats = true;

  try {
    const todayStr = getLocalDateString();

    // 1. Parallel Database Retrieval (Waterfall Eliminated)
    const [attemptsRes, attendanceRes] = await Promise.all([
      supabaseClient
        .from("test_attempts")
        .select("test_id, score, total_correct, total_incorrect, attempt_date, time_spent_seconds")
        .eq("student_roll", currentCandidate.roll_number)
        .order("attempt_date", { ascending: true }),
      supabaseClient
        .from("daily_attendance")
        .select("study_date, total_minutes_spent")
        .eq("student_roll", currentCandidate.roll_number)
    ]);

    const atts = attemptsRes.data || [];
    const attnd = attendanceRes.data || [];

    // 2. Telemetry Aggregation
    const bestMap = {}; 
    let totalSecs = 0, nCorr = 0, nIncorr = 0;
    const speedTrends = [];
    const accTrends = [];
    const dailyQuestionsMap = {};

    atts.forEach(a => {
      totalSecs += (a.time_spent_seconds || 0); 
      nCorr += (a.total_correct || 0); 
      nIncorr += (a.total_incorrect || 0);

      const qInAttempt = (a.total_correct || 0) + (a.total_incorrect || 0);
      if (qInAttempt > 0) {
        speedTrends.push(Math.round((a.time_spent_seconds || 0) / qInAttempt));
        accTrends.push(Math.max(0, Math.round(((a.total_correct || 0) / qInAttempt) * 100)));
      }

      const dStr = (a.attempt_date || "").split("T")[0];
      if (dStr && (Number(a.test_id) > 0 || Number(a.test_id) === -1)) {
        dailyQuestionsMap[dStr] = (dailyQuestionsMap[dStr] || 0) + qInAttempt;
      }

      const tid = String(a.test_id); 
      if (!bestMap[tid] || parseFloat(a.score) > parseFloat(bestMap[tid].score)) {
        bestMap[tid] = a;
      }
    });

    dailyQuestionsMap[todayStr] = Math.max(dailyQuestionsMap[todayStr] || 0, dailyPerf?.total_questions_attempted || 0);

    // 3. Subject Competency Stats Compilation (Robust Fallback & Portfolio Sync)
    const subStats = {};
    const masteredTests = new Set();
    const attemptedTests = new Set();
    let portfolioCorrect = 0;
    let portfolioIncorrect = 0;

    Object.values(bestMap).forEach(a => {
      if (Number(a.test_id) <= 0) return;

      const cat = catalogData.find(item => String(item.test_id) === String(a.test_id));
      const subj = (cat?.subject || a.subject || "General Studies").trim();
      const tQs = cat ? (cat.total_questions || 10) : ((a.total_correct || 0) + (a.total_incorrect || 0) || 10);
      const maxM = tQs * 2;
      const pct = maxM > 0 ? Math.max(0, (parseFloat(a.score || 0) / maxM) * 100) : 0;

      attemptedTests.add(String(a.test_id));
      if (pct >= 100) masteredTests.add(String(a.test_id));

      if (!subStats[subj]) {
        subStats[subj] = { earned: 0, max: 0, correct: 0, incorrect: 0, sets: 0 };
      }
      const cCount = a.total_correct || 0;
      const iCount = a.total_incorrect || 0;

      subStats[subj].earned += parseFloat(a.score || 0); 
      subStats[subj].max += maxM; 
      subStats[subj].correct += cCount; 
      subStats[subj].incorrect += iCount; 
      subStats[subj].sets += 1;

      portfolioCorrect += cCount;
      portfolioIncorrect += iCount;
    });

    // 4. Today's Tactical Filters & Deep Telemetry
    const todayMasteredTests = new Set();
    let todayCorr = 0;
    let todayIncorr = 0;
    let todaySecs = 0;

    atts.forEach(a => {
      const attDate = getAttemptLocalDate(a.attempt_date);
      if (attDate === todayStr) {
        todayCorr += (a.total_correct || 0);
        todayIncorr += (a.total_incorrect || 0);
        todaySecs += (a.time_spent_seconds || 0);

        if (Number(a.test_id) > 0) {
          const cat = catalogData.find(item => String(item.test_id) === String(a.test_id));
          const tQs = cat ? (cat.total_questions || 10) : ((a.total_correct || 0) + (a.total_incorrect || 0) || 10);
          const maxM = tQs * 2;
          const pct = maxM > 0 ? (parseFloat(a.score || 0) / maxM) * 100 : 0;
          if (pct >= 100) todayMasteredTests.add(String(a.test_id));
        }
      }
    });

    const todayQAttempted = todayCorr + todayIncorr;
    const todayGross = todayCorr * 2.0;
    const todayBleed = Math.round(todayIncorr * 0.5 * 100) / 100;
    const todayNet = Math.round((todayGross - todayBleed) * 100) / 100;
    const todayAcc = todayQAttempted > 0 ? Math.round((todayCorr / todayQAttempted) * 100) : 0;
    const todayAvgPace = todayQAttempted > 0 ? Math.round(todaySecs / todayQAttempted) : 0;

    let todayPromoted = 0;
    let todayFreshErrors = 0;
    (userWeakQuestions || []).forEach(q => {
      if (getAttemptLocalDate(q.last_attempt_date) === todayStr) {
        if ((q.mastery_streak || 0) > 0) todayPromoted++;
        else if ((q.times_wrong || 0) > 0) todayFreshErrors++;
      }
    });

    const todayStats = {
      todayCorr,
      todayIncorr,
      todayQAttempted,
      todayGross,
      todayBleed,
      todayNet,
      todayAcc,
      todayAvgPace,
      todayPromoted,
      todayFreshErrors
    };

    const totalQ = nCorr + nIncorr;
    const accVal = totalQ > 0 ? ((nCorr / totalQ) * 100).toFixed(1) : "0.0";
    const avgSpd = totalQ > 0 ? Math.round(totalSecs / totalQ) : 0;
    if (currentCandidate?.roll_number) appStorage.set("cache_accuracy_" + currentCandidate.roll_number, accVal);

    // 5. Attendance & Past 7 Days Mapping
    let todayMins = 0;
    const attMap = {};
    const past7 = [];
    for (let i = 0; i < 7; i++) { 
      let dt = new Date(); 
      dt.setDate(dt.getDate() - i); 
      past7.push(getLocalDateString(dt)); 
    }
    attnd.forEach(r => { 
      const m = r.total_minutes_spent || 0; 
      attMap[r.study_date] = m; 
      if (r.study_date === todayStr) todayMins = m; 
    });

    const streak = dailyPerf?.streak_count || 0;

    cachedWeeklyContext = {
      attMap,
      past7,
      todayStr,
      dailyQuestionsMap,
      atts,
      attnd
    };

    // 🎯 6. DISPATCH TO DEDICATED SUB-ENGINES
    renderAnalyticsTopStats({ accVal, nCorr, nIncorr, streak, avgSpd, accTrends, speedTrends, attMap });
    renderWeeklyConsistencyTrack(cachedWeeklyContext);
    renderDomainCompetencyMatrix({ subStats, attemptedTests, masteredTests });
    renderAuditAndRetentionEngines({ nCorr: portfolioCorrect, nIncorr: portfolioIncorrect, totalQ: (portfolioCorrect + portfolioIncorrect) }, subStats);
    // 7. Heatmap
    renderHeatmap(attMap);

  } catch (err) { 
    console.error("Analytics Error:", err); 
  } finally { 
    _isFetchingStats = false; 
  }
};


// 🗓️ 30-DAY ATTENDANCE HEATMAP RENDERER (100% COMPLETE & AUTO-DOCK TO TODAY)
function renderHeatmap(attMap) {
  const container = document.getElementById("heatmapContainer"); 
  if (!container) return; 
  container.innerHTML = "";
  let tooltip = document.getElementById("heatmapTooltip");
  if (!tooltip) { 
    tooltip = document.createElement("div"); 
    tooltip.id = "heatmapTooltip"; 
    tooltip.className = "custom-heatmap-tooltip"; 
    document.body.appendChild(tooltip); 
  }

  let totalMinsMonth = 0;
  let activeDaysMonth = 0;
  const today = new Date();

  // 🚀 Single-pass: Metrics calculation aur DOM cells rendering (Purana Logic 100% Intact)
  for (let i = 29; i >= 0; i--) { 
    let d = new Date(today); 
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const mins = attMap[dateStr] || 0;

    if (mins > 0) {
      totalMinsMonth += mins;
      activeDaysMonth++;
    }

    const cell = document.createElement("div"); 
    cell.className = "heatmap-cell";
    if (mins > 90) cell.classList.add("hm-lvl-4"); 
    else if (mins > 45) cell.classList.add("hm-lvl-3"); 
    else if (mins > 15) cell.classList.add("hm-lvl-2"); 
    else if (mins > 0) cell.classList.add("hm-lvl-1"); 
    else cell.classList.add("absent"); 
    
    cell.onmouseenter = () => {
      const h = Math.floor(mins / 60), rm = mins % 60;
      tooltip.innerHTML = `
        <div style="font-weight:700; color:var(--text-muted); font-size:10px; margin-bottom:2px; letter-spacing:0.3px;">${displayDate}</div>
        <div style="font-size:12.5px; font-family:var(--font-mono); font-weight:800; color:${mins > 45 ? 'var(--success)' : (mins > 0 ? 'var(--tcs-blue-accent)' : 'var(--text-muted)')};">⏱️ ${mins === 0 ? 'No activity' : (h > 0 ? `${h}h ${rm}m` : `${rm} mins`)}</div>
      `;
      tooltip.classList.add("show"); 
      
      const r = cell.getBoundingClientRect(); 
      const tipWidth = tooltip.offsetWidth || 135;
      const tipHeight = tooltip.offsetHeight || 42;
      const halfTip = tipWidth / 2;
      
      let idealLeft = r.left + (r.width / 2);
      if (idealLeft - halfTip < 14) idealLeft = halfTip + 14;
      else if (idealLeft + halfTip > window.innerWidth - 14) idealLeft = window.innerWidth - halfTip - 14;
      
      let idealTop = r.top - tipHeight - 8;
      if (idealTop < 8) idealTop = r.bottom + 8;
      
      tooltip.style.left = `${idealLeft}px`; 
      tooltip.style.top = `${idealTop}px`; 
      tooltip.style.transform = `translate(-50%, 0)`;
    };
    cell.onmouseleave = () => tooltip.classList.remove("show");
    container.appendChild(cell);
  }

  // Monthly Stats Header Strip Update (Same as before)
  const statsStrip = document.getElementById("heatmapStatsStrip");
  if (statsStrip) {
    const h = Math.floor(totalMinsMonth / 60);
    const m = totalMinsMonth % 60;
    statsStrip.innerText = `${h}h ${m}m Active • ${activeDaysMonth}/30 Days Logged`;
  }

  // 🚀 ONLY ADDITION: Page load par scroll bar right edge (Today) par dock rahega
  const scrollWrapper = container.closest('.heatmap-scroll-wrapper') || container.parentElement || container;
  if (scrollWrapper) {
    requestAnimationFrame(() => {
      scrollWrapper.scrollLeft = scrollWrapper.scrollWidth;
    });
  }
}
// 📱 MOBILE ANALYTICS SEGMENTED CONTROLLER (PRESERVED)
window.switchAnalyticsTab = function(tabKey) {
  const grid = document.querySelector(".advanced-analytics-grid");
  const btnDomains = document.getElementById("btnAnalyticsTabDomains");
  const btnAudit = document.getElementById("btnAnalyticsTabAudit");

  if (!grid) return;

  if (tabKey === 'audit') {
    grid.classList.remove("show-domains");
    grid.classList.add("show-audit");
    btnDomains?.classList.remove("active");
    btnAudit?.classList.add("active");
  } else {
    grid.classList.remove("show-audit");
    grid.classList.add("show-domains");
    btnAudit?.classList.remove("active");
    btnDomains?.classList.add("active");
  }
};
// ==========================================================================
// 11. MULTI-MODE PRACTICE (READ/FLASHCARD/QUIZ - REFINED TOP BARS)
// ==========================================================================

// 🚀 SMOOTH SCROLL WITH INSTANT TOUCH FOCUS RELEASE
window.scrollToTopOfPractice = function() {
  const btn = document.getElementById("btnScrollTopPractice");
  if (btn) btn.blur(); // 📱 मोबाइल ब्राउज़र से स्टिकी फ़ोकस तुरंत हटाएगा

  const container = document.getElementById("practiceContainer");
  if (container) {
    container.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

// 🧭 200px स्क्रॉल के बाद बटन खुद-ब-खुद स्मूथली पॉप-अप होगा
function initPracticeScrollTracker() {
  const container = document.getElementById("practiceContainer");
  const btn = document.getElementById("btnScrollTopPractice");
  if (!container || !btn) return;

  container.addEventListener("scroll", () => {
    if (activePracticeMode === "flashcards") {
      btn.classList.remove("visible");
      return;
    }
    if (container.scrollTop > 200) {
      btn.classList.add("visible");
    } else {
      btn.classList.remove("visible");
    }
  }, { passive: true });
}

// Ensure initialization when app boots
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPracticeScrollTracker);
} else {
  initPracticeScrollTracker();
}

window.launchPracticeMode = async function(testId, mode) {
  // 🚀 Record active context for one-way exam switcher routing
  currentPracticeContext = { type: 'test', id: testId };

  switchView("viewPractice", true);

  const container = document.getElementById("practiceContainer");
  const tEl = document.getElementById("practiceSetTitle");
  const subEl = document.getElementById("practiceMetaSub");

  if (tEl) {
    tEl.innerText = "Connecting to Exam Node...";
    tEl.title = "Connecting...";
  }
  if (subEl) {
    subEl.innerText = "Compiling question matrix...";
  }

  if (container) {
    container.innerHTML = `
      <div class="practice-loader-card">
        <div class="quantum-loader-sphere">
          <div class="quantum-ring ring-1"></div>
          <div class="quantum-ring ring-2"></div>
          <div class="quantum-core"></div>
        </div>
        <div class="loader-status-text">INITIALIZING PRACTICE ENGINE</div>
        <div class="loader-status-sub">Compiling question matrix & active telemetry...</div>
        <div class="loader-progress-track">
          <div class="loader-progress-shimmer"></div>
        </div>
      </div>
    `;
  }

  try {
    const { data: tInfo } = await supabaseClient.from("tests").select("id, title").eq("id", testId).single();
    const { data: sections } = await supabaseClient.from("test_sections").select("id").eq("test_id", testId).limit(1); 
    if (!sections?.length) throw new Error("Sections not configured");

    const { data: qData, error: qErr } = await supabaseClient
      .from("test_section_questions")
      .select(`question_number, questions (id, content, options, correct_answer, explanation)`)
      .eq("section_id", sections[0].id)
      .order("question_number", { ascending: true });

    if (qErr || !qData?.length) throw new Error("Questions payload empty");

    practiceQuestions = qData.map(item => {
      const q = Array.isArray(item.questions) ? item.questions[0] : item.questions; 
      if (!q) return null;
      const opts = parseQuestionOptions(q.options);
      return { 
        qNum: item.question_number, 
        id: q.id, 
        content: q.content, 
        options: opts, 
        correctAnswer: getNormalizedCorrectAnswerId(q.correct_answer, opts), 
        explanation: q.explanation 
      };
    }).filter(Boolean);

    if (isShuffleEnabled) {
      practiceQuestions = shuffleArray(practiceQuestions);
      practiceQuestions.forEach((q, idx) => { q.qNum = idx + 1; });
    }

    // 🚀 TWO-TIER METADATA POPULATION
    const setCat = catalogData.find(c => String(c.test_id) === String(testId));
    const subjName = (setCat?.subject || activeSubject || "General Studies").trim();
    const qCount = practiceQuestions.length;
    const setTitle = tInfo ? tInfo.title : (setCat?.test_title || "Practice Set");

    if (tEl) {
      tEl.innerText = setTitle;
      tEl.title = setTitle;
    }
    if (subEl) {
      subEl.innerText = `${subjName} • ${qCount} Questions`;
    }

    window.setPracticeMode(mode);

  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding:60px 20px; color:var(--danger);">
          <div style="font-size:36px; margin-bottom:12px;">⚠️</div>
          <h4 style="font-size:16px; font-weight:800; margin-bottom:6px;">Runtime Synchronization Failed</h4>
          <p style="font-size:12.5px; color:var(--text-muted);">${err.message}</p>
        </div>
      `;
    }
  }
};



function renderReadUI() {
  const container = document.getElementById("practiceContainer");
  if (!container) return;
  container.innerHTML = "";

  const totalQ = practiceQuestions.length;
  const stCount = localReadState.starred.size;

  // 🚀 FIXED SUB-HEADER DOCK (Sirf tabhi dikhega jab .show-dock class lagegi)
  let filterToolbar = document.getElementById("readFixedFilterBar");
  if (!filterToolbar) {
    filterToolbar = document.createElement("div");
    filterToolbar.id = "readFixedFilterBar";
    filterToolbar.className = "read-filter-strip";
    container.parentNode.insertBefore(filterToolbar, container);
  }
  filterToolbar.classList.add("show-dock");

  filterToolbar.innerHTML = `
    <button type="button" class="read-filter-btn btn-all ${localReadState.filter === 'all' ? 'active' : ''}" onclick="filterReadMode('all')">
      <span>All</span>
      <span class="filter-badge" id="readTotalBadge">${totalQ}</span>
    </button>
    <button type="button" class="read-filter-btn btn-starred ${localReadState.filter === 'starred' ? 'active' : ''}" onclick="filterReadMode('starred')" title="Starred Questions Only">
      <span>⭐ Starred</span>
      <span class="filter-badge" id="readStarredBadge">${stCount}</span>
    </button>
  `;

  let renderedCount = 0;
  practiceQuestions.forEach((q, idx) => {
    if (localReadState.filter === 'starred' && !localReadState.starred.has(idx)) return;
    renderedCount++;

    const card = buildQuestionCardDOM(q, idx, 'read', localReadState, false);
    container.appendChild(card);
  });

  if (renderedCount === 0 && localReadState.filter === 'starred') {
    const emptyNotice = document.createElement("div");
    emptyNotice.style.cssText = "text-align:center; padding:48px 16px; color:var(--text-muted); font-size:13.5px; font-weight:700;";
    emptyNotice.innerHTML = `
      <div style="font-size:32px; margin-bottom:10px;">⭐</div>
      <strong style="color:var(--warning-dark); font-size:15px; display:block;">No Starred Questions!</strong>
      <p style="margin-top:4px; font-weight:500; font-size:12.5px;">Click ☆ on any question above to star it for quick revision.</p>
    `;
    container.appendChild(emptyNotice);
  }

  }



window.filterReadMode = function(t) { 
  localReadState.filter = t; 
  renderReadUI(); 
};


function renderQuizUI() {
  const container = document.getElementById("practiceContainer");
  if (!container) return;
  container.innerHTML = "";
  const isMB = (document.getElementById("practiceSetTitle")?.innerText || "").includes("Mistake Bank");

  if (localQuizState.isFinished) {
    const totalQ = practiceQuestions.length;
    const maxMarks = totalQ * 2;
    const attCount = Object.keys(localQuizState.answers).length;
    const unattCount = totalQ - attCount;
    let corrCount = 0, wrCount = 0;
    Object.values(localQuizState.answers).forEach(a => { if (a.isCorrect) corrCount++; else wrCount++; });
    const score = (corrCount * 2.00) - (wrCount * 0.50);
    const acc = attCount > 0 ? Math.round((corrCount / attCount) * 100) : 0;
    const attRate = totalQ > 0 ? Math.round((attCount / totalQ) * 100) : 0;
    const stCount = localQuizState.starred.size;

    let priorityCount = 0;
    practiceQuestions.forEach((q, idx) => {
      const isAns = localQuizState.answers[idx] !== undefined;
      const isWr = isAns && !localQuizState.answers[idx].isCorrect;
      const isSt = localQuizState.starred.has(idx);
      const isUnatt = !isAns;
      if (isWr || isSt || isUnatt) priorityCount++;
    });

    const banner = document.createElement("div");
    banner.className = "quiz-score-banner";
    banner.innerHTML = `
      <div class="quiz-score-header">
        <h4 class="quiz-score-header-title">📊 Session Scorecard</h4>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="quiz-score-badge">${attCount} / ${totalQ} SOLVED</span>
          <button type="button" class="btn-retake-glyph" onclick="triggerQuizRetake()" title="Retake Quiz from Question 1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="quiz-score-grid">
        ${isMB ? `
          <div class="quiz-score-item stat-item-score">
            <span class="label">Attempted</span>
            <span class="value" style="color:var(--tcs-blue-accent);">${attCount} <small style="font-size:10px; opacity:0.7;">/${totalQ}</small></span>
          </div>
          <div class="quiz-score-item stat-item-accuracy">
            <span class="label">Accuracy</span>
            <span class="value" style="color:var(--c-review);">${acc}%</span>
          </div>
          <div class="quiz-score-item stat-item-promoted">
            <span class="label">Promoted</span>
            <span class="value" style="color:var(--success-dark);">${corrCount} ✅</span>
          </div>
          <div class="quiz-score-item stat-item-demoted">
            <span class="label">Demoted</span>
            <span class="value" style="color:var(--danger-dark);">${wrCount} ⚠️</span>
          </div>
          <div class="quiz-score-item stat-item-unattempted">
            <span class="label">Skipped</span>
            <span class="value" style="color:var(--text-muted);">${unattCount}</span>
          </div>
          <div class="quiz-score-item stat-item-rate">
            <span class="label">Cleared</span>
            <span class="value" style="color:var(--success);">${totalQ > 0 ? Math.round((corrCount / totalQ) * 100) : 0}%</span>
          </div>
        ` : `
          <div class="quiz-score-item stat-item-score">
            <span class="label">Score</span>
            <span class="value" style="color:var(--tcs-blue-accent);">${score.toFixed(2)} <small style="font-size:10px; opacity:0.7;">/${maxMarks}</small></span>
          </div>
          <div class="quiz-score-item stat-item-accuracy">
            <span class="label">Accuracy</span>
            <span class="value" style="color:var(--c-review);">${acc}%</span>
          </div>
          <div class="quiz-score-item stat-item-rate">
            <span class="label">Attempted</span>
            <span class="value" style="color:var(--warning-dark);">${attRate}%</span>
          </div>
          <div class="quiz-score-item stat-item-correct">
            <span class="label">Correct</span>
            <span class="value" style="color:var(--success-dark);">+${corrCount}</span>
          </div>
          <div class="quiz-score-item stat-item-incorrect">
            <span class="label">Wrong</span>
            <span class="value" style="color:var(--danger-dark);">-${wrCount}</span>
          </div>
          <div class="quiz-score-item stat-item-unattempted">
            <span class="label">Skipped</span>
            <span class="value" style="color:var(--text-muted);">${unattCount}</span>
          </div>
        `}
      </div>
      <div class="quiz-filter-strip">
        <button type="button" class="quiz-chip-btn ${localQuizState.filter === 'all' ? 'active' : ''}" onclick="filterQuizReview('all')">All (${totalQ})</button>
        <button type="button" class="quiz-chip-btn chip-priority ${localQuizState.filter === 'priority' ? 'active' : ''}" onclick="filterQuizReview('priority')" title="Mistakes, Starred & Unattempted questions"><span>⚡</span> Priority (${priorityCount})</button>
        <button type="button" class="quiz-chip-btn chip-wrong ${localQuizState.filter === 'wrong' ? 'active' : ''}" onclick="filterQuizReview('wrong')"><span>❌</span> Mistakes (${wrCount})</button>
        <button type="button" class="quiz-chip-btn chip-starred ${localQuizState.filter === 'starred' ? 'active' : ''}" onclick="filterQuizReview('starred')"><span>⭐</span> Starred (${stCount})</button>
      </div>
    `;
    container.appendChild(banner);
  }

  practiceQuestions.forEach((q, idx) => {
    const isAns = localQuizState.answers[idx] !== undefined;
    const isWr = isAns && !localQuizState.answers[idx].isCorrect;
    const isSt = localQuizState.starred.has(idx);
    const isUnatt = !isAns;

    if (localQuizState.isFinished) {
      if (localQuizState.filter === 'wrong' && !isWr) return;
      if (localQuizState.filter === 'starred' && !isSt) return;
      if (localQuizState.filter === 'priority' && !(isWr || isSt || isUnatt)) return;
    }

    // 🚀 USE UNIVERSAL CARD BUILDER
    const card = buildQuestionCardDOM(q, idx, 'quiz', localQuizState, isMB);
    container.appendChild(card);
  });

  if (!localQuizState.isFinished) {
    const f = document.createElement("div");
    f.className = "quiz-footer-actions";
    f.innerHTML = `
      <button type="button" class="btn-finish-quiz" onclick="finishQuizSession(this)" title="Submit and review performance">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
          <line x1="4" y1="22" x2="4" y2="15"></line>
        </svg>
        <span>Finish & Review</span>
      </button>
    `;
    container.appendChild(f);
  }
}

// 🚀 UNIFIED QUESTION STAR CONTROLLER (READ & QUIZ MODES - ZERO LOGIC LOSS)
window.toggleQuestionStar = function(mode, idx) {
  const isRead = mode === 'read';
  const stateObj = isRead ? localReadState : localQuizState;
  
  // 1. Common Memory State Toggle
  if (stateObj.starred.has(idx)) {
    stateObj.starred.delete(idx);
  } else {
    stateObj.starred.add(idx);
  }
  const nowStarred = stateObj.starred.has(idx);

  // 2. Common DOM Sync (Card & Star Button)
  const card = document.getElementById(`${mode}Card_${idx}`);
  if (card) {
    card.classList.toggle("card-starred", nowStarred);
    const btn = card.querySelector(".btn-star-q");
    if (btn) {
      btn.classList.toggle("starred", nowStarred);
      btn.title = nowStarred ? "Unstar Question" : "Star for Revision";
      btn.blur(); // 📱 Mobile tap focus turant clear karega (prevents sticky highlight)
    }
  }

  // 3. Mode-Specific Counter & Telemetry Updates
  if (isRead) {
    // 📖 Read Mode: Instant zero-lag badge counter update (Hamesha active)
    const starBadge = document.getElementById("readStarredBadge");
    if (starBadge) starBadge.innerText = `${stateObj.starred.size}`;

    // Read Mode Live Filter Visibility
    if (stateObj.filter === 'starred' && card) {
      card.style.display = nowStarred ? "block" : "none";
    }
  } else {
    // 🎯 Quiz Mode: Sirf tab update hoga jab session finish ho chuka ho
    if (stateObj.isFinished) {
      // (A) Scorecard Star Stat Update
      const starStat = document.querySelector(".quiz-score-item.stat-item-starred .value");
      if (starStat) starStat.innerText = `${stateObj.starred.size} ⭐`;

      // (B) Dynamic Priority Count Recalculation (Mistakes + Starred + Unattempted)
      let priorityCount = 0;
      practiceQuestions.forEach((q, i) => {
        const isAns = stateObj.answers[i] !== undefined;
        const isWr = isAns && !stateObj.answers[i].isCorrect;
        const isSt = stateObj.starred.has(i);
        const isUnatt = !isAns;
        if (isWr || isSt || isUnatt) priorityCount++;
      });

      // (C) Filter Chips Update
      const prioBtn = document.querySelector(".quiz-chip-btn.chip-priority");
      if (prioBtn) prioBtn.innerHTML = `<span>⚡</span> Priority (${priorityCount})`;
      const starBtn = document.querySelector(".quiz-chip-btn.chip-starred");
      if (starBtn) starBtn.innerHTML = `<span>⭐</span> Starred (${stateObj.starred.size})`;

      // (D) Quiz Mode Live Filter Visibility
      if (stateObj.filter === 'starred' && card) {
        card.style.display = nowStarred ? "block" : "none";
      }
    }
  }
};

// 🔒 100% Backward-Compatible Wrappers (Taaki HTML ya Card Builder ka koi bhi onclick na toote)
window.toggleReadStar = function(idx) {
  window.toggleQuestionStar('read', idx);
};

window.toggleQuizStar = function(idx) {
  window.toggleQuestionStar('quiz', idx);
};


window.finishQuizSession = function(btnElement) {
  if (localQuizState.isFinished) return;

  const btn = btnElement || document.querySelector(".btn-finish-quiz");
  if (btn) {
    btn.classList.add("is-submitting");
    btn.innerHTML = `
      <span class="btn-micro-spinner"></span>
      <span>Compiling Score...</span>
    `;
  }

  // 🚀 320ms Tactile Buffer: User ko click register feel hota hai aur result smooth aata hai
  setTimeout(() => {
    localQuizState.isFinished = true;
    localQuizState.filter = "all";
    renderQuizUI();
    scrollToTopOfPractice();
  }, 320);
};

// 🚀 MODERN HAPTIC & SHUTTER QUIZ RETAKE CONTROLLER
window.triggerQuizRetake = function() {
  if (!practiceQuestions || !practiceQuestions.length) return;

  // 1. Mobile Native Haptic Tick (अगर डिवाइस सपोर्ट करे)
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(15); } catch(e) {}
  }

  // 2. Micro-Icon Spring Spin
  const btn = document.querySelector(".btn-retake-glyph");
  if (btn) btn.classList.add("spinning");

  // 3. Smooth Shutter Fade-Out (बिना झटके का व्यूफ़ोल्ड रीसेट)
  const container = document.getElementById("practiceContainer");
  if (container) container.classList.add("shutter-out");

  setTimeout(() => {
    // State Clean Reset
    localQuizState = { answers: {}, starred: new Set(), isFinished: false, filter: "all" };

    if (isShuffleEnabled) {
      practiceQuestions = shuffleArray(practiceQuestions);
    }
    practiceQuestions.forEach((q, idx) => { q.qNum = idx + 1; });

    // Re-render UI & Scroll to Top instantly while invisible
    renderQuizUI();
    scrollToTopOfPractice();

    // 4. Smooth Shutter Fade-In (वापस मक्खन की तरह प्रकट होना)
    requestAnimationFrame(() => {
      if (container) container.classList.remove("shutter-out");
    });
  }, 160);
};

window.filterQuizReview = function(t) { 
  localQuizState.filter = t; 
  renderQuizUI(); 
};



function renderFlashcardCardDOM() {
  const container = document.getElementById("practiceContainer");
  if (!container) return;
  container.innerHTML = "";

  // 1. Completion State (All Backlog & Leaks 100% Cleared)
  if (!flashcardDeck.length) {
    container.innerHTML = `
      <div class="practice-loader-card" style="padding: 40px 24px; animation: modalFadeIn 0.3s ease-out;">
        <div style="font-size: 48px; margin-bottom: 12px;">🏆</div>
        <h3 style="font-size: 18px; font-weight: 800; color: var(--tcs-blue-header); margin-bottom: 6px;">Deck Fully Conquered!</h3>
        <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.5;">Zero recall leaks remaining. All ${flashcardOriginalCount} questions verified in active memory.</p>
        <button type="button" class="btn-primary" style="height: 38px; padding: 0 20px; font-size: 12.5px;" onclick="resetFlashcardDeck()">
          <span>↺ Restart Deck</span>
        </button>
      </div>
    `;
    return;
  }

  const q = flashcardDeck[0];
  const cOpt = (q.options || []).find(o => isOptionMatching(o.id, q.correctAnswer));
  const cText = cOpt ? getLocalizedText({ en: cOpt.en || cOpt.text, hi: cOpt.hi }) : "";
  const remainingInDeck = flashcardDeck.length;
  const progressPct = Math.round((flashcardMasteredCount / flashcardOriginalCount) * 100);

  // Stack Depth Visual Logic (2 layers behind)
  const layer1Html = remainingInDeck > 1 ? `<div class="flashcard-stack-layer"></div>` : "";
  const layer2Html = remainingInDeck > 2 ? `<div class="flashcard-stack-layer layer-2"></div>` : "";

  // Telemetry Strip + Top Progress Line
  const telemetryHtml = `
    <div class="fc-telemetry-strip">
      <span>REMAINING: <strong>${remainingInDeck}</strong></span>
      <span>MASTERED: <strong style="color:var(--success);">${progressPct}%</strong></span>
    </div>
    <div class="fc-progress-bar" style="max-width:580px; margin:0 auto 16px auto;">
      <div class="fc-progress-fill" style="width: ${progressPct}%;"></div>
    </div>
  `;

  // 3D Card Stage
  const stageHtml = `
    <div class="flashcard-deck-stage">
      ${layer2Html}
      ${layer1Html}
      <div class="flashcard-3d-card" id="flashcardBox" onclick="toggleFlashcard3DFlip()">
        <!-- FRONT FACE -->
        <div class="flashcard-face flashcard-front">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="briefing-badge">QUESTION • Q${q.qNum}</span>
            <span style="font-size:11px; font-weight:700; color:var(--text-muted);">Tap to Reveal ↺</span>
          </div>
          <div class="flashcard-content-scroll">
            <h3 style="font-size:17.5px; line-height:1.6; color:var(--text-main); font-weight:600; text-align:center;">
              ${getLocalizedText(q.content)}
            </h3>
          </div>
          <div style="text-align:center; font-size:11px; font-weight:700; color:var(--text-muted); font-family:var(--font-mono);">
            SPACEBAR OR TAP TO FLIP
          </div>
        </div>

        <!-- BACK FACE (HIERARCHICAL RECALL) -->
        <div class="flashcard-face flashcard-back">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="briefing-badge" style="background:var(--success-bg-subtle); color:var(--success-dark); border-color:var(--success-border);">ANSWER</span>
            <span style="font-size:11px; font-weight:700; color:var(--text-muted);">Tap to Flip ↻</span>
          </div>
          <div class="flashcard-content-scroll" style="text-align:center;">
            <div class="flashcard-punchline">${cText}</div>
            <div class="flashcard-context"><strong>Takeaway Context:</strong><br/>${formatExplanation(q.explanation)}</div>
          </div>
          <div style="text-align:center; font-size:11px; font-weight:700; color:var(--text-muted); font-family:var(--font-mono);">
            RATE RETENTION TO ADVANCE
          </div>
        </div>
      </div>
    </div>
  `;

  // Action Dock
  const dockHtml = `
    <div class="flashcard-controls-dock">
      <button type="button" class="btn-fc-hard" onclick="handleFlashcardGrading(false)">
        <span>⚠️ Forgot / Hard</span>
        <span class="fc-badge-key">1</span>
      </button>
      <button type="button" class="btn-fc-mastered" onclick="handleFlashcardGrading(true)">
        <span>✔ Mastered</span>
        <span class="fc-badge-key">2</span>
      </button>
    </div>
  `;

  container.innerHTML = telemetryHtml + stageHtml + dockHtml;
  setupFlashcardTouchGestures();
}

// 🔄 3D FLIP CONTROLLER (WITH PHANTOM-TAP SWIPE LOCK)
let isSwipingCard = false;

window.toggleFlashcard3DFlip = function() {
  if (isSwipingCard) return; // स्वाइप के तुरंत बाद ग़लती से फ्लिप नहीं होगा
  const card = document.getElementById("flashcardBox");
  if (!card) return;
  isFlashcardFlipped = !isFlashcardFlipped;
  card.classList.toggle("is-flipped", isFlashcardFlipped);
};

// 🎯 UPDATED: FLASHCARD PRACTICE DOES NOT TOUCH MISTAKE BANK DATABASE
window.handleFlashcardGrading = async function(isMastered) {
  if (!flashcardDeck.length) return;
  const currentQ = flashcardDeck.shift(); // Remove from front

  if (isMastered) {
    flashcardMasteredCount++;
    // Database sync yahan se poori tarah hata diya gaya hai
  } else {
    // 🚀 ZERO-LEAK RE-QUEUE: Insert exactly 3 cards deeper in the current deck
    const reinsertIndex = Math.min(flashcardDeck.length, 3);
    flashcardDeck.splice(reinsertIndex, 0, currentQ);
  }

  isFlashcardFlipped = false;
  renderFlashcardCardDOM();
};

// ⌨️ SINGLE-KEY PC PRODUCTIVITY FLOW
function setupFlashcardKeyboardShortcuts() {
  if (isFlashcardListenerActive) return;
  isFlashcardListenerActive = true;

  window.addEventListener("keydown", (e) => {
    const isPracticeView = document.getElementById("viewPractice")?.style.display === "flex";
    const isFcMode = activePracticeMode === "flashcards"; // 🚀 Clean Variable State
    if (!isPracticeView || !isFcMode || !flashcardDeck.length) return;

    if (e.code === "Space") {
      e.preventDefault();
      toggleFlashcard3DFlip();
    } else if (e.key === "1" || e.code === "ArrowLeft") {
      e.preventDefault();
      handleFlashcardGrading(false);
    } else if (e.key === "2" || e.code === "ArrowRight") {
      e.preventDefault();
      handleFlashcardGrading(true);
    }
  });
}


// 📱 ERGONOMIC ONE-HANDED TOUCH SENSORS (BOTH HAND SAFE)
function setupFlashcardTouchGestures() {
  const card = document.getElementById("flashcardBox");
  if (!card || window.innerWidth > 768) return;

  let startX = 0, startY = 0, startTime = 0;
  card.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  card.addEventListener("touchmove", (e) => {
    const diffX = e.touches[0].clientX - startX;
    const diffY = e.touches[0].clientY - startY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 20) {
      card.classList.toggle("swipe-right", diffX > 0);
      card.classList.toggle("swipe-left", diffX < 0);
    }
  }, { passive: true });

  card.addEventListener("touchend", (e) => {
    const diffX = e.changedTouches[0].clientX - startX;
    const diffY = e.changedTouches[0].clientY - startY;
    const elapsed = Date.now() - startTime;
    card.classList.remove("swipe-left", "swipe-right");

    const isHorizontalMotion = Math.abs(diffX) > (Math.abs(diffY) * 1.15);
    
    if (Math.abs(diffX) > 45 && isHorizontalMotion && elapsed < 550) {
      isSwipingCard = true;
      setTimeout(() => { isSwipingCard = false; }, 320); // 320ms के लिए क्लिक लॉक

      if (diffX > 0) {
        handleFlashcardGrading(true);  // Swiped Right = Mastered
      } else {
        handleFlashcardGrading(false); // Swiped Left = Forgot / Hard
      }
    }
  }, { passive: true });
}


// 🚀 SEMANTIC VECTOR GLYPHS (CHECK-SQUARE FOR QUIZ)
const MODE_ICONS = {
  read: `<svg class="mode-glyph glyph-read" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
  quiz: `<svg class="mode-glyph glyph-quiz" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
  flashcards: `<svg class="mode-glyph glyph-fc" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2" ry="2"></rect><path d="M21 7v12a2 2 0 0 1-2 2H7"></path></svg>`
};

// 🎛️ MICRO-MODE SWITCHER CONTROLLER (AUTO SCROLL-ORB TOGGLE)
function updatePracticeModeHeader(titleText, modeKey) {
  activePracticeMode = modeKey;
  const iconWrap = document.getElementById("practiceModeIconWrap");
  if (iconWrap) {
    iconWrap.innerHTML = MODE_ICONS[modeKey] || "";
  }
  const btn = document.getElementById("btnPracticeModeSwitcher");
  if (btn) {
    btn.title = `Current Mode: ${titleText} (Tap to Switch)`;
  }

  // 🚀 READ & QUIZ MEIN DIKHEGA, FLASHCARDS MEIN AUTOMATICALLY HIDE HO JAYEGA
  const scrollDock = document.querySelector(".practice-scroll-dock");
  if (scrollDock) {
    scrollDock.style.display = (modeKey === "flashcards") ? "none" : "block";
  }
}

window.setPracticeMode = function(modeKey) {
  let targetMode = (modeKey || "read").toLowerCase();
  if (targetMode === "flashcard") targetMode = "flashcards";
  activePracticeMode = targetMode;

  // 🎯 STRICT ZERO-LEAK GUARD: Agar mode 'read' nahi hai toh strip ko foran gayab karein
  const readBar = document.getElementById("readFixedFilterBar");
  if (readBar) {
    if (targetMode === "read") {
      readBar.classList.add("show-dock");
    } else {
      readBar.classList.remove("show-dock");
    }
  }

  const modeTitles = {
    read: "Read Mode",
    quiz: "Instant Quiz",
    flashcards: "Flashcards"
  };

  updatePracticeModeHeader(modeTitles[targetMode] || "Practice", targetMode);

  if (targetMode === "read") {
    localReadState = { starred: new Set(), filter: "all" };
    renderReadUI();
  } else if (targetMode === "quiz") {
    localQuizState = { answers: {}, starred: new Set(), isFinished: false, filter: "all" };
    renderQuizUI();
  } else if (targetMode === "flashcards") {
    flashcardDeck = (practiceQuestions && practiceQuestions.length) ? [...practiceQuestions] : [];
    flashcardOriginalCount = flashcardDeck.length;
    flashcardMasteredCount = 0;
    flashcardIndex = 0;
    isFlashcardFlipped = false;
    setupFlashcardKeyboardShortcuts();
    renderFlashcardCardDOM();
  }

  scrollToTopOfPractice();
};

// 🔄 Flashcard Reset with Face Alignment
window.resetFlashcardDeck = function() {
  flashcardDeck = [...practiceQuestions];
  flashcardOriginalCount = practiceQuestions.length;
  flashcardMasteredCount = 0;
  isFlashcardFlipped = false;
  renderFlashcardCardDOM();
};

// 🎛️ MODAL POPUP CONTROLLERS (ONLY ONCE)
window.openPracticeModeSwitcher = function() {
  const sheet = document.getElementById("practiceModeSwitcherSheet");
  const overlay = document.getElementById("practiceModeSwitcherOverlay");
  const shuffleToggle = document.getElementById("togglePracticeSwitchShuffle");
  if (!sheet || !overlay) return;

  if (shuffleToggle) shuffleToggle.checked = isShuffleEnabled;

  ['read', 'quiz', 'flashcards'].forEach(m => {
    const btn = document.getElementById(`modeBtn_${m}`);
    if (btn) btn.classList.toggle("active-mode", m === activePracticeMode);
  });

  overlay.style.display = "block";
  overlay.style.pointerEvents = "auto";
  sheet.style.display = "block";
};

window.closePracticeModeSwitcher = function() {
  const sheet = document.getElementById("practiceModeSwitcherSheet");
  const overlay = document.getElementById("practiceModeSwitcherOverlay");
  if (sheet) sheet.style.display = "none";
  if (overlay) {
    overlay.style.display = "none";
    overlay.style.pointerEvents = "none";
  }
};

// 🎛️ SINGLE CENTRAL DISPATCH SWITCHER
window.switchActivePracticeMode = function(targetMode) {
  closePracticeModeSwitcher();

  // 1. Exam Mode Speedbump
  if (targetMode === "exam") {
    showAppNoticeModal(
      "Official Examination",
      "Launch TCS iON Exam Console?",
      "Once you enter Exam Mode, official testing rules apply: active countdown timer, negative marking (+2.00 / -0.50), and no switching back without aborting.",
      "🎯",
      "Yes, Launch Exam",
      () => executeExamLaunchFromPractice(),
      "Stay in Practice"
    );
    return;
  }

  if (targetMode === activePracticeMode || !practiceQuestions || !practiceQuestions.length) return;

  // 2. Shuffle Setting Check
  const shuffleToggle = document.getElementById("togglePracticeSwitchShuffle");
  if (shuffleToggle) isShuffleEnabled = shuffleToggle.checked;

  if (isShuffleEnabled) {
    practiceQuestions = shuffleArray(practiceQuestions);
  }
  practiceQuestions.forEach((q, idx) => { q.qNum = idx + 1; });

  // 3. Dispatch
  window.setPracticeMode(targetMode);
};


// 🚀 UNIVERSAL QUESTION CARD BUILDER (ZERO-REDUNDANCY & REVIEW-SAFE)
function buildQuestionCardDOM(q, idx, mode, stateObj, isMB = false) {
  const isSt = stateObj.starred ? stateObj.starred.has(idx) : false;
  let badgeHtml = '';
  let oHtml = '';
  let showExp = false;
  
  const isReview = mode === 'review';
  const isQuiz = mode === 'quiz';
  const isRead = mode === 'read';
  
  let sAns = null;
  if (isQuiz || isReview) {
    sAns = stateObj.answers && stateObj.answers[idx] !== undefined ? stateObj.answers[idx] : null;
  }

  // 1. Header Badge Logic
  if (isReview) {
    const uAns = sAns ? sAns.selected : null;
    const isUserCorrect = uAns && isOptionMatching(uAns, q.correctAnswer);
    const sText = uAns ? (isUserCorrect ? "Right" : "Wrong") : "Skipped";
    const sClass = uAns ? (isUserCorrect ? "sol-status-correct" : "sol-status-incorrect") : "sol-status-unattempted";
    badgeHtml = `<span class="sol-status-badge ${sClass}">${sText}</span>`;
    showExp = true;
  } else if (isQuiz) {
    if (sAns) {
      badgeHtml = `<span id="quizBadge_${idx}" class="sol-status-badge ${sAns.isCorrect ? 'sol-status-correct' : 'sol-status-incorrect'}">${sAns.isCorrect ? 'Right' : 'Wrong'}</span>`;
      showExp = true; 
    } else if (stateObj.isFinished) {
      badgeHtml = `<span id="quizBadge_${idx}" class="sol-status-badge sol-status-unattempted">Skipped</span>`;
      showExp = true;
    } else {
      badgeHtml = `<span id="quizBadge_${idx}" class="sol-status-badge" style="display:none;"></span>`;
    }
  }

  // 2. Options Iteration Logic
  oHtml = (q.options || []).map(opt => {
    const oid = String(opt.id);
    let oCls = (isRead || isReview) ? "sol-option" : "option-row";
    let feedbackSymbol = "";
    let bubbleHtml = "";

    const isActualCorrect = isOptionMatching(oid, q.correctAnswer);
    const uAnsStr = sAns ? sAns.selected : null;

    if (isRead) {
      if (isActualCorrect) {
        oCls += " sol-opt-correct";
        feedbackSymbol = `<span class="opt-feedback-indicator badge-correct" title="Correct Answer">${checkIconSvg}</span>`;
      }
    } 
    else if (isReview) {
      let bubbleCls = "sol-radio-bubble bubble-neutral";
      let bubbleIcon = "";
      if (isActualCorrect) {
        oCls += " sol-opt-correct";
        bubbleCls = "sol-radio-bubble bubble-correct";
        bubbleIcon = checkIconSvg;
      } else if (uAnsStr && isOptionMatching(oid, uAnsStr)) {
        oCls += " sol-opt-wrong";
        bubbleCls = "sol-radio-bubble bubble-wrong";
        bubbleIcon = crossIconSvg;
      }
      bubbleHtml = `<span class="${bubbleCls}">${bubbleIcon}</span>`;
    } 
    else if (isQuiz) {
      if (sAns) {
        if (isActualCorrect) {
          oCls += " sol-opt-correct";
          feedbackSymbol = `<span class="opt-feedback-indicator badge-correct">${checkIconSvg}</span>`;
        } else if (isOptionMatching(oid, uAnsStr) && !sAns.isCorrect) {
          oCls += " sol-opt-wrong";
          feedbackSymbol = `<span class="opt-feedback-indicator badge-wrong">${crossIconSvg}</span>`;
        }
      } else if (stateObj.isFinished && isActualCorrect) {
        oCls += " sol-opt-correct";
        feedbackSymbol = `<span class="opt-feedback-indicator badge-correct">${checkIconSvg}</span>`;
      }
      oCls += ` quiz-opt-${idx}`;
    }

    const isClickable = isQuiz && !sAns && !stateObj.isFinished;
    const styleStr = isClickable ? 'cursor:pointer;' : 'pointer-events:none;';
    const dataAttr = isQuiz ? `data-opt-id="${opt.id}"` : "";

    return `
      <div class="${oCls}" ${dataAttr} style="${styleStr}">
        ${isReview ? bubbleHtml : `<span class="opt-index-badge">${opt.id}</span>`}
        <span class="${isReview ? 'sol-option-text' : 'opt-text-label'}">${getLocalizedText({ en: opt.en || opt.text, hi: opt.hi })}</span>
        ${feedbackSymbol}
      </div>
    `;
  }).join("");

  // 3. Assemble Card HTML (Review Mode me Star Button Hide Rahega)
  const card = document.createElement("div");
  card.className = `solution-card ${isSt ? 'card-starred' : ''}`;
  card.id = `${mode}Card_${idx}`;
  card.style.marginBottom = isRead ? "16px" : "20px";

  const starBtnHtml = isReview ? '' : `
    <button type="button" class="btn-star-q ${isSt ? 'starred' : ''}" onclick="${isRead ? 'toggleReadStar' : 'toggleQuizStar'}(${idx})" title="${isSt ? 'Remove Star' : 'Star for Revision'}">
      ${starIconSvg}
    </button>
  `;

  card.innerHTML = `
    <div class="sol-q-header">
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="sol-q-title">Question ${q.qNum}</span>
        ${badgeHtml}
      </div>
      ${starBtnHtml}
    </div>
    <div class="sol-content">${getLocalizedText(q.content)}</div>
    <div id="${mode}Opts_${idx}">${oHtml}</div>
    <div id="${mode}Exp_${idx}" class="sol-explanation" style="display:${(isRead || showExp) ? 'block' : 'none'};"><strong>Explanation:</strong><br/>${formatExplanation(q.explanation)}</div>
  `;

  // 4. Attach Click Handlers for Live Quiz
  if (isQuiz && !sAns && !stateObj.isFinished) {
    card.querySelectorAll(`.quiz-opt-${idx}`).forEach(row => {
      row.onclick = async () => {
        const selId = row.getAttribute("data-opt-id");
        const isC = isOptionMatching(selId, q.correctAnswer);
        stateObj.answers[idx] = { selected: selId, isCorrect: isC };

        const badge = document.getElementById(`quizBadge_${idx}`);
        if (badge) {
          badge.style.display = "inline-flex";
          badge.className = `sol-status-badge ${isC ? 'sol-status-correct' : 'sol-status-incorrect'}`;
          badge.innerText = isC ? 'Right' : 'Wrong';
        }

        card.querySelectorAll(`.quiz-opt-${idx}`).forEach(el => {
          el.style.pointerEvents = "none";
          const optVal = el.getAttribute("data-opt-id");
          if (isOptionMatching(optVal, q.correctAnswer)) {
            el.classList.remove("sol-opt-wrong");
            el.classList.add("sol-opt-correct");
            if (!el.querySelector(".opt-feedback-indicator")) {
              const ind = document.createElement("span");
              ind.className = "opt-feedback-indicator badge-correct";
              ind.innerHTML = checkIconSvg;
              el.appendChild(ind);
            }
          } else if (isOptionMatching(optVal, selId) && !isC) {
            el.classList.add("sol-opt-wrong");
            if (!el.querySelector(".opt-feedback-indicator")) {
              const ind = document.createElement("span");
              ind.className = "opt-feedback-indicator badge-wrong";
              ind.innerHTML = crossIconSvg;
              el.appendChild(ind);
            }
          }
        });

        const exp = document.getElementById(`quizExp_${idx}`);
        if (exp) exp.style.display = "block";

      };
    });
  }

  return card;
}

// 🚀 EXECUTE ONE-WAY EXAM LAUNCH
function executeExamLaunchFromPractice() {
  if (!currentPracticeContext) return;

  if (currentPracticeContext.type === 'test' && currentPracticeContext.id) {
    launchAssessment(currentPracticeContext.id);
  } else if (currentPracticeContext.type === 'booster') {
    launchBoosterMode('exam');
  } else if (currentPracticeContext.type === 'mistake_bank') {
    launchSubjectMistakeMode('exam');
  }
}

// ==========================================================================
// 12. PWA NATIVE DOUBLE-BACK EXIT ENGINE (ZERO-GLITCH)
// ==========================================================================
let lastExitSwipeTime = 0;

function handleNativeExitTrigger() {
  const now = Date.now();

  // 🚀 2 सेकंड के भीतर दोबारा बैक स्वाइप हुआ -> सीधे क्लोज़
  if (now - lastExitSwipeTime < 2000) {
    isExitingApp = true;
    history.back(); // Android OS को ऐप बंद करने देता है
    return;
  }

  lastExitSwipeTime = now;

  // हिस्ट्री स्टेट को री-आर्म करें ताकि दूसरा स्वाइप काम करे
  history.pushState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');

  // नेटिव स्टाइल टोस्ट दिखाएं
  showSelectionToast("Press back again to exit");
}
