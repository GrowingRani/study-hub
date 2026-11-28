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
    topic: testMeta.topic || "",
    sections: Array.isArray(testMeta.sections) ? testMeta.sections : null,
    total_duration_minutes: testMeta.total_duration_minutes || 15
  };

  // DOM Header & Title Telemetry
  const examTitleEl = document.getElementById("examTitle");
  if (examTitleEl) examTitleEl.innerText = activeTest.title;

  const breadcrumbEl = document.getElementById("subjectLabelBreadcrumb");
  if (breadcrumbEl) breadcrumbEl.innerText = activeTest.subject;

  const mobileTitleEl = document.getElementById("mobileExamTitle");
  if (mobileTitleEl) mobileTitleEl.innerText = activeTest.title;

  const rollEl = document.getElementById("examCandidateRoll");
  if (rollEl) rollEl.innerText = currentCandidate?.roll_number || "---";

  const sectionTabsEl = document.getElementById("sectionTabs");
  if (sectionTabsEl) {
    if (activeTest.sections && activeTest.sections.length > 1) {
      sectionTabsEl.innerHTML = activeTest.sections.map((sec, sIdx) =>
        `<button type="button" class="section-tab ${sIdx === 0 ? "active-section-tab" : ""}" data-sec-start="${sec.startIndex}" onclick="renderQuestion(${sec.startIndex})">${sec.name} (${sec.count})</button>`
      ).join("");
    } else {
      sectionTabsEl.innerHTML = `<button type="button" class="section-tab active-section-tab">Section 1: ${sectionName} (${questionsList.length} Qs)</button>`;
    }
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

// 🎯 UNIVERSAL ATTEMPT DATE RESOLVER (MEMOIZED FOR ZERO-CPU OVERHEAD)
const _attemptDateCache = new Map();
function getAttemptLocalDate(dateVal) {
  if (!dateVal) return "";
  const key = String(dateVal);
  if (_attemptDateCache.has(key)) return _attemptDateCache.get(key);
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const resolved = getLocalDateString(d);
    if (_attemptDateCache.size > 2000) _attemptDateCache.clear();
    _attemptDateCache.set(key, resolved);
    return resolved;
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
const threeDotsSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2.35"></circle><circle cx="12" cy="12" r="2.35"></circle><circle cx="12" cy="19" r="2.35"></circle></svg>`;
const flagIconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`;

// ==========================================================================
// 3. GLOBAL STATE & APPLICATION ROUTING (LOOP-FREE ROUTING & EXIT ENGINE)
// ==========================================================================
const MAIN_TABS = ['viewDashboard', 'viewLibrary', 'viewAnalytics', 'viewProfile'];

let currentCandidate = null, catalogData = [], activeSubject = null, userAttemptHistory = [], userWeakQuestions = [], currentLang = "en";
let userPlaylists = [], userPlaylistItems = [], dailyPerf = { total_questions_attempted: 0, is_century_hit: false, streak_count: 0, id: null };
let selectedTestForPlaylist = null, currentThreeDotsTestId = null, activePlaylistMenuTarget = null, pendingDeleteTarget = null, activeSubjectMenuTarget = null;
let librarySelectionMode = false, targetPlaylistForSelection = null;
let activeTest = null, testQuestions = [], practiceQuestions = [], currentIndex = 0, userResponses = {}, timeRemaining = 15 * 60, timerInterval = null, isExamFinished = false;
let subjectRadarChartInstance = null, alertEngineStarted = false;

// 🚀 RENDER LOCKS & DEBOUNCING FOR PLAYLIST / AUTH ENGINE
let isRenderingPlaylists = false;
let pendingPlaylistRender = false;
let isAuthSessionInitializing = false;
let activeDashboardPlaylistId = null;
let isMobilePlaylistStageOpen = false;
let ytPlaylistFilter = "all";
let ytStageFilter = "all";
let ytStageSort = "default";
let ytStageSearchQuery = "";
let isYtStageSearchOpen = false;
let activeLibTopicKey = null;
let isMobileLibTopicOpen = false;
let libStageFilter = "all";
let libStageSort = "default";
let libTopicSearchQuery = "";
let isLibTopicSearchOpen = false;
let activeSortSheetScope = "dashboard";
let userFlaggedQuestions = [];
let activeFlagTarget = null;
let auditQueueFilter = "all";
let auditQueueSearchQuery = "";
let pendingVerifyQuestionId = null;
let userStarredQuestions = [];
let userStarredQuestionIdSet = new Set();
let activeStarredChunkIndex = 0;
let activeStarredTopicFilter = "all";
const _questionHydrationCache = new Map();
let hubSubjectFilter = "all";
let hubSubjectSearchQuery = "";
let customMockConfig = {
  selectedSubjects: {},
  poolFilter: "all",
  orderMode: "mixed"
};

// 🚀 PRE-FLIGHT MISSION BRIEFING & SHUFFLE STATE (DEFAULT: ON)
let activeBriefingTestId = null;
let activeMistakeChunkIndex = 0;
let isShuffleEnabled = true;

// 🚀 IN-MEMORY CACHE & O(1) INDEXES (PREVENTS DUPLICATE RPC & LINEAR SCANS)
let cachedBoosterPool = null;
let lastBoosterFetchTime = 0;
let hasLoadedWeakQuestions = false;
let catalogMap = new Map();
let attemptsByTestMap = new Map();
let _attemptHistoryPromise = null;
let _lastAttemptFetchTime = 0;
let _activeScoreSyncPromise = null;

function rebuildDataIndexes() {
  catalogMap = new Map((catalogData || []).map(item => [String(item.test_id), item]));
  const grouped = new Map();
  (userAttemptHistory || []).forEach(att => {
    const tid = String(att.test_id);
    if (!grouped.has(tid)) grouped.set(tid, []);
    grouped.get(tid).push(att);
  });
  attemptsByTestMap = grouped;
}
 
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
      if (absX > 10 && absX > absY * 1.35) {
        isHorizontalGesture = true;
      } else if (absY > 8 && absY >= absX) {
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
      const pName = wrapper.closest("[data-playlist-name]")?.getAttribute("data-playlist-name") || "Playlist";

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
  syncCanonicalModeIcons();
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
    { id: 'subjectActionMenuOverlay', action: closeSubjectActionMenu },
    { id: 'playlistBottomSheetOverlay', action: closePlaylistBottomSheet },
    { id: 'missionBriefingModal', action: closeMissionBriefingModal },
    { id: 'appNoticeModal', action: closeAppNoticeModal },
    { id: 'createPlaylistModal', action: closeCreatePlaylistModal },
    { id: 'editPlaylistModal', action: closeEditPlaylistModal },
    { id: 'deletePlaylistConfirmModal', action: closeDeletePlaylistModal },
    { id: 'abortExamModal', action: closeAbortExamModal },
    { id: 'practiceModeSwitcherSheet', action: closePracticeModeSwitcher },
    { id: 'stageSortBottomSheetOverlay', action: closeStageSortSheet },
    { id: 'questionFlagBottomSheetOverlay', action: closeQuestionFlagSheet },
    { id: 'auditQueueModal', action: closeAuditQueueModal },
    { id: 'customMockModal', action: closeCustomMockModal }
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

  const isMobile = window.innerWidth <= 768;
  document.body.classList.toggle("mobile-playlist-active", viewId === "viewDashboard" && isMobilePlaylistStageOpen && isMobile);
  document.body.classList.toggle("mobile-lib-topic-active", viewId === "viewLibrary" && isMobileLibTopicOpen && isMobile);

  const bottomNav = document.getElementById('mobileBottomNav');
  if (bottomNav) { 
    if (librarySelectionMode || document.body.classList.contains("staging-active")) {
      bottomNav.style.setProperty("display", "none", "important");
      bottomNav.classList.add("nav-hidden");
    } else if (isMobile && MAIN_TABS.includes(viewId)) {
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
  if (currentActiveView === viewId) {
    if (viewId === 'viewDashboard' && isMobilePlaylistStageOpen) {
      closeMobilePlaylistStage(false);
    } else if (viewId === 'viewLibrary') {
      if (isMobileLibTopicOpen) closeMobileLibTopicStage(false);
      else if (document.getElementById("setsExplorerStage")?.style.display === "block") returnToSubjectHub(false);
    }
    return;
  }

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
  if (viewId === 'viewProfile') {
    renderProfileFlaggedQueue();
  }

  if (pushHistory) {
    if (viewId === 'viewDashboard') {
      if (isMobilePlaylistStageOpen && window.innerWidth <= 768 && activeDashboardPlaylistId) {
        history.pushState({ page: 'playlist-detail', view: 'viewDashboard', playlistId: String(activeDashboardPlaylistId) }, '', '#playlist_' + encodeURIComponent(String(activeDashboardPlaylistId)));
      } else {
        history.pushState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');
      }
    } else if (viewId === 'viewLibrary' && isMobileLibTopicOpen && window.innerWidth <= 768 && activeLibTopicKey) {
      history.pushState({ page: 'lib-topic', view: 'viewLibrary', subView: 'setsExplorer', subject: activeSubject, topic: activeLibTopicKey }, '', '#topic_' + encodeURIComponent(activeLibTopicKey));
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
      if (e.state.view === 'viewDashboard') {
        const shouldShowPlaylist = Boolean(e.state.page === "playlist-detail" && window.innerWidth <= 768);
        if (shouldShowPlaylist && e.state.playlistId) {
          activeDashboardPlaylistId = String(e.state.playlistId);
        }
        isMobilePlaylistStageOpen = shouldShowPlaylist;
        document.body.classList.toggle("mobile-playlist-active", shouldShowPlaylist);
        renderRecentHistoryShelf();
        renderHomePlaylists();
      } else if (e.state.view === 'viewLibrary' && activeSubject) {
        const hub = document.getElementById("subjectHubStage");
        const exp = document.getElementById("setsExplorerStage");
        if (hub) hub.style.display = "none";
        if (exp) exp.style.display = "block";
        isMobileLibTopicOpen = Boolean(e.state.page === "lib-topic" && window.innerWidth <= 768);
        document.body.classList.toggle("mobile-lib-topic-active", isMobileLibTopicOpen);
        renderTopicSets();
      }
      return;
    }
  }

  if (currentActiveView === 'viewLibrary') {
    if (isLibTopicSearchOpen) {
      toggleLibTopicSearch(false);
      history.pushState(e.state || { page: "lib-topic", view: "viewLibrary" }, "", window.location.hash);
      return;
    }
    if (isMobileLibTopicOpen) {
      closeMobileLibTopicStage(true);
      return;
    }
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

  if (currentActiveView === 'viewDashboard' && isYtStageSearchOpen) {
    toggleYtStageSearch(false);
    history.pushState(e.state || { page: "playlist-detail", view: "viewDashboard" }, "", window.location.hash);
    return;
  }

  if (currentActiveView === 'viewDashboard' && isMobilePlaylistStageOpen) {
    closeMobilePlaylistStage(true);
    return;
  }

  if (e.state && e.state.view) {
    if (e.state.view === 'viewDashboard') {
      isMobilePlaylistStageOpen = Boolean(e.state.page === 'playlist-detail' && window.innerWidth <= 768);
      if (isMobilePlaylistStageOpen && e.state.playlistId) {
        activeDashboardPlaylistId = String(e.state.playlistId);
      }
      renderHomePlaylists();
    } else if (e.state.view === 'viewLibrary') {
      isMobileLibTopicOpen = Boolean(e.state.page === 'lib-topic' && window.innerWidth <= 768);
      if (document.getElementById("setsExplorerStage")?.style.display === "block") renderTopicSets();
    } else if (e.state.view === 'viewProfile') {
      renderProfileFlaggedQueue();
    }
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

function setupAppEvents() {
  document.addEventListener("click", (e) => {
    const pMenu = document.getElementById("playlistActionMenu");
    if (pMenu && pMenu.style.display !== "none" && !pMenu.contains(e.target) && !e.target.closest(".btn-playlist-dots")) closePlaylistActionMenu();
    const tMenu = document.getElementById("threeDotsMenu");
    if (tMenu && tMenu.style.display !== "none" && !tMenu.contains(e.target) && !e.target.closest(".btn-three-dots:not(.btn-subject-dots)")) closeThreeDotsMenu();
    const sMenu = document.getElementById("subjectActionMenu");
    if (sMenu && sMenu.style.display !== "none" && !sMenu.contains(e.target) && !e.target.closest(".btn-subject-dots")) closeSubjectActionMenu();
  });

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
    if (st) st.style.display = "block"; 
    if (sc) sc.style.display = "none"; 
    if (fIn) fIn.style.display = "none"; 
    if (fForgot) fForgot.style.display = "none"; 
    if (fReset) fReset.style.display = "none"; 
    if (aErr) aErr.style.display = "none"; 
  });

  fForgot?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("inputForgotEmail")?.value.trim().toLowerCase();
    const btn = document.getElementById("btnSendResetLink");
    if (!email) return showAuthNotice("Please enter your registered email.");
    if (aErr) aErr.style.display = "none";
    if (btn) { btn.innerText = "Sending..."; btn.disabled = true; }
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
      const em = document.getElementById("forgotEmailStep"), su = document.getElementById("forgotSuccessStep");
      if (em) em.style.display = "none";
      if (su) su.style.display = "block";
    } catch (err) {
      showAuthNotice(err.message || "Failed to send reset link.");
    } finally {
      if (btn) { btn.innerText = "Send Recovery Link"; btn.disabled = false; }
    }
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

  document.getElementById("topicSearchInput")?.addEventListener("input", () => {
    if (document.getElementById("setsExplorerStage")?.style.display === "block") renderTopicSets();
  });

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
    // 👑 शनिवार शाम 5 बजे अगले दिन रविवार (Sunday Crucible) है, इसलिए Tomorrow Queue अलर्ट स्किप करें
    if (d.getDay() === 6) return;

    if (d.getHours() === 17 && !appStorage.get("5pm_alert_" + dateStr)) {
      const tomLoad = parseInt(appStorage.get("tomorrow_load_" + currentCandidate.roll_number, "0"));
      const tomList = userPlaylists.find(p => p.playlist_name === 'Tomorrow');
      const openTomorrowStaging = tomList ? () => enableLibrarySelectionMode(tomList.id, 'Tomorrow') : null;

      if (tomLoad === 0) {
        showAppNoticeModal("Tomorrow's Queue", "Target Queue Empty", "Tomorrow's Playlist has no sets staged. Add sets before you sleep to maintain your Century Streak!", "⏳", "Stage Sets", openTomorrowStaging);
      } else if (tomLoad < 100) {
        showAppNoticeModal("Tomorrow's Queue", "Target Load Incomplete", `Tomorrow has only ${tomLoad} questions staged (Target is 100). Add more sets!`, "⚠️", "Add More Sets", openTomorrowStaging);
      } else {
        showAppNoticeModal(
          "Tomorrow's Queue",
          "Target Locked",
          `Tomorrow's payload is locked & ready (${tomLoad} Questions).`,
          "🎯",
          "View Queue",
          () => {
            switchView("viewDashboard");
            autoExpandPlaylistCard("Tomorrow");
          },
          "Got It"
        );
      }
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
  const actualWidth = menu.offsetWidth || 160;
  let leftPos = btnRect.right - actualWidth;
  if (leftPos + actualWidth > window.innerWidth - 12) leftPos = window.innerWidth - actualWidth - 12;
  if (leftPos < 12) leftPos = 12;

  const actualHeight = menu.offsetHeight || 100;
  let topPos = btnRect.bottom + 5;
  if (topPos + actualHeight > window.innerHeight - 12) topPos = Math.max(12, btnRect.top - actualHeight - 5);
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
  const modal = document.getElementById("deletePlaylistConfirmModal");
  const tEl = document.getElementById("deleteModalTitle"); 
  const hEl = document.getElementById("deleteModalHeading"); 
  const msgEl = document.getElementById("deleteModalMessage"); 
  const btn = document.getElementById("btnConfirmDeletePlaylist");
  const badge = modal?.querySelector(".notice-icon-badge");

  if (modal) modal.classList.toggle("is-clear-mode", Boolean(isClearOnly));

  // Calculate live set & question telemetry for the target playlist
  const items = userPlaylistItems.filter(pi => String(pi.playlist_id) === String(pId));
  let totalQs = 0;
  items.forEach(i => {
    const c = catalogMap.get(String(i.test_id));
    totalQs += c ? (c.total_questions || 10) : 10;
  });

  if (hEl) {
    let scopePill = document.getElementById("deleteModalScopePill");
    if (!scopePill) {
      scopePill = document.createElement("div");
      scopePill.id = "deleteModalScopePill";
      scopePill.className = "delete-scope-pill";
      hEl.parentNode.insertBefore(scopePill, hEl);
    }
    scopePill.innerText = items.length > 0
      ? `${items.length} ${items.length === 1 ? "SET" : "SETS"} • ${totalQs} QUESTIONS`
      : "EMPTY PLAYLIST";
  }

  if (badge) {
    badge.innerHTML = isClearOnly
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
  }

  if (btn) btn.disabled = false;

  if (isClearOnly) {
    if (tEl) tEl.innerText = "Queue Reset"; 
    if (hEl) hEl.innerText = `Clear "${pName}"?`; 
    if (msgEl) msgEl.innerText = `All queued sets will be removed from this playlist. Your playlist folder will remain intact.`; 
    if (btn) { btn.innerText = "Clear Sets"; btn.onclick = confirmDeletePlaylist; }
  } else {
    if (tEl) tEl.innerText = "Permanent Removal"; 
    if (hEl) hEl.innerText = `Delete "${pName}"?`; 
    if (msgEl) msgEl.innerText = `This playlist and its queued references will be removed. You can undo immediately from the toast.`; 
    if (btn) { btn.innerText = "Delete Playlist"; btn.onclick = confirmDeletePlaylist; }
  }
  toggleModalDOM("deletePlaylistConfirmModal", true);
};

let lastDeletedPlaylistSnapshot = null;

window.closeDeletePlaylistModal = function() { 
  toggleModalDOM("deletePlaylistConfirmModal", false);
  pendingDeleteTarget = null; 
};

window.triggerUndoPlaylistDelete = async function() {
  if (!lastDeletedPlaylistSnapshot || !currentCandidate) return;
  const snap = lastDeletedPlaylistSnapshot;
  lastDeletedPlaylistSnapshot = null;
  const roll = currentCandidate.roll_number;

  try {
    let targetPlaylistId = snap.playlist.id;
    if (!snap.isClearOnly) {
      const { data: restoredPl, error: plErr } = await supabaseClient
        .from("playlists")
        .insert({
          student_roll: roll,
          playlist_name: snap.playlist.playlist_name,
          is_system_playlist: Boolean(snap.playlist.is_system_playlist),
          display_order: snap.playlist.display_order ?? 10
        })
        .select()
        .single();
      if (plErr) throw plErr;
      targetPlaylistId = restoredPl.id;
    }

    if (snap.items.length > 0) {
      const rowsToInsert = snap.items.map(it => ({
        playlist_id: targetPlaylistId,
        test_id: it.test_id,
        student_roll: roll,
        is_rollover: Boolean(it.is_rollover)
      }));
      const { error: itemsErr } = await supabaseClient.from("playlist_items").insert(rowsToInsert);
      if (itemsErr) throw itemsErr;
    }

    await fetchPlaylistsAndCheckRollover();
    await renderHomePlaylists();
    autoExpandPlaylistCard(snap.playlist.playlist_name);
    showSelectionToast(`Restored "${snap.playlist.playlist_name}"`);
  } catch (err) {
    console.error("Undo playlist delete failed:", err);
    showSelectionToast("Could not restore playlist.");
  }
};

window.confirmDeletePlaylist = async function() {
  if (!pendingDeleteTarget) return; 
  const { id, name, isClearOnly } = pendingDeleteTarget, btn = document.getElementById("btnConfirmDeletePlaylist");
  if (btn) { btn.innerText = "Processing..."; btn.disabled = true; }

  const playlistObj = userPlaylists.find(p => String(p.id) === String(id)) || { id, playlist_name: name, is_system_playlist: false, display_order: 10 };
  const itemsBackup = userPlaylistItems.filter(pi => String(pi.playlist_id) === String(id)).map(pi => ({ ...pi }));

  try { 
    if (isClearOnly) { 
      const { error } = await supabaseClient.from("playlist_items").delete().eq("playlist_id", id).eq("student_roll", currentCandidate.roll_number); 
      if (error) throw error; 
    } else { 
      await supabaseClient.from("playlist_items").delete().eq("playlist_id", id); 
      const { error } = await supabaseClient.from("playlists").delete().eq("id", id); 
      if (error) throw error; 
    }
    lastDeletedPlaylistSnapshot = { playlist: { ...playlistObj }, items: itemsBackup, isClearOnly };
    closeDeletePlaylistModal(); 
    await fetchPlaylistsAndCheckRollover(); 
    await renderHomePlaylists(); 
    showSelectionToast(
      isClearOnly ? `Cleared "${name}"` : `Deleted "${name}"`,
      window.triggerUndoPlaylistDelete
    );
  } catch (err) { 
    showAppNoticeModal("Error", "Action Failed", err.message, "⚠️", "Dismiss"); 
  } finally { 
    if (btn) btn.disabled = false; 
  }
};

// ==========================================================================
// 7. PRE-FLIGHT MISSION BRIEFING CONTROLLER (SUNDAY CRUCIBLE & SPEEDBUMP INTEGRATED)
// ==========================================================================

window.openMissionBriefingModal = async function(testId, bypassSundayCheck = false, chunkIndex = 0, topicFilter = "all") {
  if (testId === -3) {
    activeMistakeChunkIndex = typeof chunkIndex === 'number' ? chunkIndex : 0;
  } else if (testId === -4 || testId === -5) {
    activeStarredChunkIndex = typeof chunkIndex === 'number' ? chunkIndex : 0;
    activeStarredTopicFilter = topicFilter || "all";
  }
const isSun = typeof isSunday === 'function' ? isSunday() : (new Date().getDay() === 0);

  // 👑 Sunday Soft Friction: अनअटेम्प्टेड रेगुलर सेट्स पर जेंटल स्पीडबम्प (रिवीजन प्राथमिकता के लिए)
  if (isSun && testId > 0 && !bypassSundayCheck) {
    const isAtt = userAttemptHistory.some(a => String(a.test_id) === String(testId));
    if (!isAtt) {
      return showAppNoticeModal(
        "Revision Day Alert",
        "Sunday Revision Protocol",
        "Today is dedicated to Sunday Crucible Revision! Are you sure you want to tackle new territory before completing your weekly review?",
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

  syncCanonicalModeIcons();
  const shufToggle = document.getElementById("toggleShuffleMode");
  if (shufToggle) shufToggle.checked = isShuffleEnabled;
  const examTagEl = modal.querySelector(".briefing-mode-card.mode-exam .briefing-mode-tag");
  if (examTagEl && testId !== -1) {
    examTagEl.innerText = isSun ? "SUNDAY PROTOCOL" : "TCS SIMULATION";
  }

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
    const boosterQuestions = await compileMasteryBoosterPool(poolLimit, false, isSun);
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
    const sundayBestAtt = isSun
      ? userAttemptHistory
          .filter(a => Number(a.test_id) === -1 && getAttemptLocalDate(a.attempt_date) === todayStr)
          .reduce((max, a) => Math.max(max, (a.total_correct || 0) + (a.total_incorrect || 0)), 0)
      : 0;
    const isQuotaCompleted = isSun
      ? Boolean(dailyPerf?.is_century_hit || (requiredThreshold > 0 && sundayBestAtt >= requiredThreshold))
      : isBoosterAttempted;

    document.getElementById("briefingSubjectBadge").innerText = isSun ? "SUNDAY CRUCIBLE EXAM" : "BONUS MASTERY BOOSTER";
    const statusBadge = document.getElementById("briefingStatusBadge");
    const examCard = modal.querySelector(".briefing-mode-card.mode-exam");

    if (isQuotaCompleted) {
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
      statusBadge.innerText = (isSun && sundayBestAtt > 0) ? `${sundayBestAtt}/${requiredThreshold} TARGET` : `${qCount} DUE`;
      
      // 🎯 Display clear target in briefing modal
      if (isSun) {
        document.getElementById("briefingScoreMeta").innerText = sundayBestAtt > 0
          ? `Best: ${sundayBestAtt}/${requiredThreshold} Qs • Retry Exam to secure Streak`
          : `Target: Min ${requiredThreshold} of ${poolSize} Qs for Streak`;
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
    
    document.getElementById("briefingSetTitle").innerText = isSun ? "Weekly Mastery & Retention Crucible" : "Mistakes & Active Retention Booster";
    document.getElementById("briefingDurationMeta").innerText = `⏱️ ${durationMins}m`;
    document.getElementById("briefingQuestionsMeta").innerText = `📄 ${qCount} Questions`;
  } else if (testId === -3) {
    // 🎯 DEDICATED SUBJECT MISTAKE BANK PRE-FLIGHT BRIEFING (DUE QUESTIONS ONLY)
    const telemetry = getSubjectMistakeTelemetry(activeSubject);

    if (telemetry.inReviewCount === 0) {
      return showAppNoticeModal("Notice", "Zero Leaks", `No active mistakes found in ${activeSubject}.`, "🛡️", "Dismiss");
    }

    if (telemetry.dueCount === 0) {
      return showAppNoticeModal("All Caught Up", "0 Due Today", `Today's review quota for ${activeSubject} is completed. New questions will be scheduled tomorrow!`, "🛡️", "Dismiss");
    }

    const pool = telemetry.dueMistakes;
    const CHUNK_SIZE = 25;
    const totalChunks = Math.max(1, Math.ceil(pool.length / CHUNK_SIZE));
    const safeChunkIdx = Math.min(activeMistakeChunkIndex, totalChunks - 1);
    const startIdx = safeChunkIdx * CHUNK_SIZE;
    const chunkQs = pool.slice(startIdx, startIdx + CHUNK_SIZE);
    const qCount = chunkQs.length;
    const durationMins = Math.max(3, Math.ceil(qCount * 0.6));
    const setNum = safeChunkIdx + 1;
    const chunkTitle = totalChunks > 1 
      ? `${activeSubject} Mistake Drill - Set ${setNum}` 
      : `${activeSubject} Error Rehabilitation Node`;

    document.getElementById("briefingSubjectBadge").innerText = `${activeSubject.toUpperCase()} MISTAKE VAULT`;
    const statusBadge = document.getElementById("briefingStatusBadge");
    const examCard = modal.querySelector(".briefing-mode-card.mode-exam");

    statusBadge.className = "briefing-status-tag status-progress";
    statusBadge.innerText = `${qCount} DUE`;
    document.getElementById("briefingQuestionsMeta").innerText = `📄 ${qCount} Questions (Set ${setNum} of ${totalChunks})`;
    document.getElementById("briefingScoreMeta").innerText = `4-Stage Spaced Repetition Loop`;
    if (examCard) {
      examCard.style.opacity = "1";
      examCard.style.pointerEvents = "auto";
      examCard.removeAttribute("title");
      const tag = examCard.querySelector(".briefing-mode-tag");
      if (tag) tag.innerText = "TCS SIMULATION";
    }

    document.getElementById("briefingSetTitle").innerText = chunkTitle;
    document.getElementById("briefingDurationMeta").innerText = `⏱️ ${durationMins}m`;
  } else if (testId === -4 || testId === -5) {
    const isTopicScoped = testId === -5;
    const starTel = getStarredTelemetry(activeSubject, activeStarredTopicFilter);
    const pool = starTel.filteredStarred;
    if (!pool.length) {
      return showAppNoticeModal("No Starred Questions", "Empty Starred Deck", "Tap ☆ on any question while studying to save it here.", "⭐", "Dismiss");
    }

    const CHUNK_SIZE = 25;
    const totalChunks = Math.max(1, Math.ceil(pool.length / CHUNK_SIZE));
    const safeChunkIdx = Math.min(activeStarredChunkIndex, totalChunks - 1);
    const chunkQs = pool.slice(safeChunkIdx * CHUNK_SIZE, (safeChunkIdx + 1) * CHUNK_SIZE);
    const qCount = chunkQs.length;
    const durationMins = Math.max(3, Math.ceil(qCount * 0.6));
    const setNum = safeChunkIdx + 1;
    const scopeLabel = isTopicScoped ? activeStarredTopicFilter : (activeStarredTopicFilter !== "all" ? activeStarredTopicFilter : activeSubject);
    const chunkTitle = totalChunks > 1
      ? `${scopeLabel} Starred - Set ${setNum}`
      : `${scopeLabel} Starred Questions`;

    document.getElementById("briefingSubjectBadge").innerText = isTopicScoped ? "TOPIC STARRED BANK" : `${activeSubject.toUpperCase()} STARRED VAULT`;
    const statusBadge = document.getElementById("briefingStatusBadge");
    statusBadge.className = "briefing-status-tag status-progress";
    statusBadge.innerText = `${qCount} STARRED`;
    document.getElementById("briefingQuestionsMeta").innerText = `📄 ${qCount} Questions (Set ${setNum} of ${totalChunks})`;
    document.getElementById("briefingScoreMeta").innerText = `High-Yield Revision • Zero Vault Conflict`;
    document.getElementById("briefingSetTitle").innerText = chunkTitle;
    document.getElementById("briefingDurationMeta").innerText = `⏱️ ${durationMins}m`;
  } else {
    // 📁 REGULAR CATALOG QUESTION SET
    const meta = getSetScoreMeta(testId);
    const setCat = meta.setCat;
    if (!setCat) return;

    const { qCount, duration: durationMins, attempts, isAtt, bestScore, maxMarks, bestPct: pct } = meta;

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
  } else if (tId === -4 || tId === -5) {
    launchStarredBankMode(normalizedMode, tId === -5);
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

function getMilestoneTelemetryHtml(attemptedCount = 0, masteredCount = 0, isSundayMode = false, isSundayHit = false, poolTotal = 0) {
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
    const ratioLabel = poolTotal > 0 ? `${count} / ${poolTotal} Qs` : `${count} Qs`;
    return `
      <div class="honest-satellite-cluster">
        <span class="telemetry-pill pill-tier-crucible">${svgTarget} ${ratioLabel}</span>
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

// ==========================================================================
// 🕒 YOUTUBE-STYLE RECENT HISTORY ENGINE (LRU 12-SET HORIZONTAL SHELF)
// ==========================================================================
const MAX_RECENT_HISTORY = 12;

function getRecentHistoryList() {
  const roll = currentCandidate?.roll_number;
  if (!roll) return [];
  const raw = appStorage.getJSON("recent_history_" + roll, []);
  if (!Array.isArray(raw)) return [];
  if (catalogData.length > 0) {
    return raw.filter(item => catalogMap.has(String(item.test_id)));
  }
  return raw;
}

function formatHistoryTimeAgo(ts) {
  if (!ts) return "";
  const diffMins = Math.max(0, Math.floor((Date.now() - Number(ts)) / 60000));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

window.recordSetHistory = function(testId, mode = "read") {
  const roll = currentCandidate?.roll_number;
  const numId = Number(testId);
  if (!roll || !numId || numId <= 0) return;

  let normMode = String(mode || "read").toLowerCase();
  if (normMode === "flashcard") normMode = "flashcards";
  if (!["read", "quiz", "flashcards", "exam"].includes(normMode)) normMode = "read";

  const key = "recent_history_" + roll;
  const existing = appStorage.getJSON(key, []);
  const filtered = (Array.isArray(existing) ? existing : []).filter(item => String(item.test_id) !== String(numId));
  filtered.unshift({ test_id: numId, mode: normMode, timestamp: Date.now() });

  appStorage.setJSON(key, filtered.slice(0, MAX_RECENT_HISTORY));
  renderRecentHistoryShelf();
};

window.resumeFromHistory = function(testId, mode = "read") {
  const numId = Number(testId) || testId;
  if (mode === "exam") {
    launchAssessment(numId);
  } else {
    launchPracticeMode(numId, mode);
  }
};

window.removeRecentHistoryItem = function(event, testId) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  const roll = currentCandidate?.roll_number;
  if (!roll) return;

  const key = "recent_history_" + roll;
  const prevList = appStorage.getJSON(key, []);
  const nextList = prevList.filter(item => String(item.test_id) !== String(testId));
  appStorage.setJSON(key, nextList);
  renderRecentHistoryShelf();

  showSelectionToast("Removed from history", () => {
    appStorage.setJSON(key, prevList);
    renderRecentHistoryShelf();
    showSelectionToast("History item restored");
  });
};

window.clearAllRecentHistory = function() {
  const roll = currentCandidate?.roll_number;
  if (!roll) return;

  const key = "recent_history_" + roll;
  const prevList = appStorage.getJSON(key, []);
  if (!prevList.length) return;

  appStorage.setJSON(key, []);
  renderRecentHistoryShelf();

  showSelectionToast("Recent history cleared", () => {
    appStorage.setJSON(key, prevList);
    renderRecentHistoryShelf();
    showSelectionToast("Recent history restored");
  });
};

function renderRecentHistoryShelf() {
  const milestoneCard = document.getElementById("dailyMilestoneCard");
  if (!milestoneCard) return;

  let section = document.getElementById("recentHistorySection");
  if (!section) {
    section = document.createElement("section");
    section.id = "recentHistorySection";
    section.className = "recent-history-section";
    milestoneCard.insertAdjacentElement("afterend", section);
  }

  const list = getRecentHistoryList();
  if (!list.length || !catalogData.length) {
    section.style.display = "none";
    section.innerHTML = "";
    return;
  }

  const modeLabels = {
    read: `${getModeSvg("read", 12)}<span>Read</span>`,
    quiz: `${getModeSvg("quiz", 12)}<span>Quiz</span>`,
    flashcards: `${getModeSvg("flashcards", 12)}<span>Cards</span>`,
    exam: `${getModeSvg("exam", 12)}<span>Exam</span>`
  };

  const cardsHtml = list.map(item => {
    const meta = getSetScoreMeta(item.test_id);
    if (!meta.setCat) return "";

    const subj = (meta.setCat.subject || "General").trim();
    const timeAgo = formatHistoryTimeAgo(item.timestamp);
    const modeKey = item.mode || "read";
    const resumeLabel = modeLabels[modeKey] || "▶ Resume";
    const scoreText = meta.isAtt
      ? `★ ${Number.isInteger(meta.bestScore) ? meta.bestScore : meta.bestScore.toFixed(1)}/${meta.maxMarks}`
      : `${meta.qCount} Qs`;

    return `
      <div class="history-mini-card mode-${modeKey}" onclick="openMissionBriefingModal(${item.test_id})" title="Tap for options or click Resume">
        <div class="history-card-top">
          <div class="history-meta-left">
            <span class="history-sub-pill">${subj}</span>
            <span class="history-time-ago">• ${timeAgo}</span>
          </div>
          <button type="button" class="btn-remove-history" onclick="removeRecentHistoryItem(event, ${item.test_id})" title="Remove">✕</button>
        </div>
        <div class="history-card-title">${meta.title}</div>
        <div class="history-card-footer">
          <span class="history-score-tag">${scoreText}</span>
          <button type="button" class="btn-history-resume" onclick="event.stopPropagation(); resumeFromHistory(${item.test_id}, '${modeKey}')">${resumeLabel}</button>
        </div>
      </div>
    `;
  }).join("");

  if (!cardsHtml.trim()) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  section.innerHTML = `
    <div class="recent-history-header">
      <div class="recent-history-title-wrap">
        <h4 class="recent-history-title">🕒 Recently Viewed</h4>
        <span class="recent-history-count">${list.length}</span>
      </div>
      <button type="button" class="btn-clear-history" onclick="clearAllRecentHistory()">Clear</button>
    </div>
    <div class="recent-history-track">${cardsHtml}</div>
  `;
}

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
    userStarredQuestions = appStorage.getJSON("cache_starred_questions_" + roll, userStarredQuestions);
    userStarredQuestionIdSet = new Set((userStarredQuestions || []).map(s => String(s.question_id)));
    catalogData = appStorage.getJSON("cache_catalog_data", catalogData);
    rebuildDataIndexes();
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
      cSub.innerText = "Weekly Review & Mastery Crucible";
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

  const savedSunPoolInit = (isSun && roll) ? appStorage.getJSON(`daily_booster_pool_${roll}_${getLocalDateString()}`, []) : [];
  const sunPoolTotalInit = savedSunPoolInit.length;

  if (attFillInit && masFillInit) {
    if (isSun) {
      const sunAttPct = sunPoolTotalInit > 0 ? Math.min(100, Math.round((cachedCount / sunPoolTotalInit) * 100)) : 0;
      const sunMasPct = sunPoolTotalInit > 0 ? Math.min(sunAttPct, Math.round((cachedCorrect / sunPoolTotalInit) * 100)) : 0;
      attFillInit.style.width = sunAttPct + "%";
      masFillInit.style.width = sunMasPct + "%";
    } else if (cachedCount >= 100) {
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
      cMeter.innerHTML = getMilestoneTelemetryHtml(cachedCount, dailyPerf?.total_correct || 0, isSun, dailyPerf?.is_century_hit, sunPoolTotalInit);
    }

  // 🚀 स्ट्रीक बैज को 0ms पर सही संख्या के साथ पेंट करें
  updateHeaderBadges();
  
  // स्क्रीन तुरंत बिना किसी लोडर के दिखेगी
  renderViewDOM('viewDashboard');
  renderRecentHistoryShelf();
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
    fetchTestCatalog(),
    fetchUserQuestionFlags(),
    fetchUserStarredQuestions()
  ]);

  renderRecentHistoryShelf();
  await renderHomePlaylists();

  fetchStudentAnalytics(true);
  start5PMEngine();

  // 🚀 Restore Milestone Collapse State on Mount
  const isCollapsedSaved = appStorage.get("milestone_collapsed") === "true";
  const card = document.getElementById("dailyMilestoneCard");
  if (card && isCollapsedSaved) {
    card.classList.add("milestone-collapsed");
  }
}

// 🚀 SINGLE-FLIGHT ATTEMPT HISTORY SYNC (ELIMINATES 3x DUPLICATE NETWORK CALLS)
async function syncAttemptHistory(forceRefresh = false) {
  if (!currentCandidate?.roll_number) return [];
  if (!forceRefresh && userAttemptHistory.length > 0 && (Date.now() - _lastAttemptFetchTime < 10000)) {
    return userAttemptHistory;
  }
  if (_attemptHistoryPromise) return _attemptHistoryPromise;

  const roll = currentCandidate.roll_number;
  _attemptHistoryPromise = (async () => {
    try {
      const { data: hist, error } = await supabaseClient
        .from("test_attempts")
        .select("test_id, score, total_correct, total_incorrect, attempt_date, time_spent_seconds")
        .eq("student_roll", roll)
        .order("attempt_date", { ascending: false });
      if (!error && Array.isArray(hist)) {
        userAttemptHistory = hist;
        _lastAttemptFetchTime = Date.now();
        rebuildDataIndexes();
      }
      return userAttemptHistory;
    } finally {
      _attemptHistoryPromise = null;
    }
  })();

  return _attemptHistoryPromise;
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
    const todayAttRows = await syncAttemptHistory(false);

    // 🚀 FIX: getAttemptLocalDate ensures local date match (No timezone drop)
    const uniqueSetsAttemptedToday = new Map();
    let customMockAttemptedToday = 0;
    (todayAttRows || []).forEach(a => {
      const attDate = getAttemptLocalDate(a.attempt_date);
      const tid = Number(a.test_id);
      if (attDate === todayStr && (tid > 0 || tid === -6 || (tid === -1 && isSunday()))) {
        const attemptedInRun = (a.total_correct || 0) + (a.total_incorrect || 0);
        if (tid === -6) {
          customMockAttemptedToday += attemptedInRun;
        } else {
          const prevAttempted = uniqueSetsAttemptedToday.get(tid) || 0;
          if (attemptedInRun > prevAttempted) {
            uniqueSetsAttemptedToday.set(tid, attemptedInRun);
          }
        }
      }
    });

    const actualExamAttemptedToday = Array.from(uniqueSetsAttemptedToday.values()).reduce((sum, q) => sum + q, 0) + customMockAttemptedToday;

    let { data: dpData } = await supabaseClient
      .from("daily_performance")
      .select("*")
      .eq("student_roll", roll)
      .eq("target_date", todayStr)
      .maybeSingle();

    const isSun = isSunday();
    const savedSunPool = isSun ? appStorage.getJSON(`daily_booster_pool_${roll}_${todayStr}`, []) : [];
    const sunReq = savedSunPool.length > 0 ? Math.min(50, Math.ceil(savedSunPool.length * 0.70)) : 0;
    const sunCrucibleAtt = uniqueSetsAttemptedToday.get(-1) || 0;

    const targetHitToday = isSun 
      ? Boolean(dpData?.is_century_hit || (dailyPerf?.target_date === todayStr && dailyPerf?.is_century_hit) || (sunReq > 0 && sunCrucibleAtt >= sunReq))
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

// 🚀 UNIFIED CROSS-DEVICE BOOSTER & SUNDAY CRUCIBLE POOL COMPILER (ATOMIC RPC)
async function compileMasteryBoosterPool(maxLimit = 25, forceRefresh = false, allowAllWeak = false) {
  const isSun = typeof isSunday === 'function' ? isSunday() : (new Date().getDay() === 0);
  const roll = currentCandidate?.roll_number;
  if (!roll) return [];

  const todayStr = getLocalDateString();
  const dailyCacheKey = `daily_booster_pool_${roll}_${todayStr}`;

  // 1. 0ms Local Device Cache (Mon-Sat 25 Qs & Sunday 100 Qs दोनों के लिए)
  const lockedDailyPool = appStorage.getJSON(dailyCacheKey, null);
  if (Array.isArray(lockedDailyPool) && lockedDailyPool.length > 0) {
    cachedBoosterPool = lockedDailyPool;
    lastBoosterFetchTime = Date.now();
    return lockedDailyPool.slice(0, maxLimit);
  }

  // 2. Single Atomic PostgreSQL RPC Call (Mobile <-> PC 100% Synced)
  try {
    const { data: poolRows, error: rpcErr } = await supabaseClient.rpc('get_daily_booster_pool', {
      p_roll: roll,
      p_date: todayStr,
      p_is_sunday: isSun,
      p_limit: maxLimit
    });
    if (rpcErr) throw rpcErr;

    if (Array.isArray(poolRows) && poolRows.length > 0) {
      const result = poolRows.map((q, idx) => {
        const opts = parseQuestionOptions(q.options);
        return {
          qNum: idx + 1,
          id: String(q.id),
          subject: q.subject || "General Studies",
          content: q.content,
          options: opts,
          correctAnswer: getNormalizedCorrectAnswerId(q.correct_answer, opts),
          explanation: q.explanation,
          isMistake: Boolean(q.is_mistake)
        };
      });

      cachedBoosterPool = result;
      lastBoosterFetchTime = Date.now();

      try {
        const prefix = `daily_booster_pool_${roll}_`;
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith(prefix) && k !== dailyCacheKey) localStorage.removeItem(k);
        });
        // पुराने sunday_crucible_pool_ कीज़ साफ़ करें
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith(`sunday_crucible_pool_${roll}_`)) localStorage.removeItem(k);
        });
      } catch (e) {}

      appStorage.setJSON(dailyCacheKey, result);
      return result.slice(0, maxLimit);
    }
    return [];
  } catch (err) {
    console.error("Daily Booster RPC error:", err);
    return [];
  }
}

window.launchBoosterMode = async function(mode = 'exam') {
  const isSun = isSunday();
  const todayStr = getLocalDateString();
  const isBoosterAttempted = userAttemptHistory.some(a => Number(a.test_id) === -1 && getAttemptLocalDate(a.attempt_date) === todayStr);

  let boosterQuestions = await compileMasteryBoosterPool(isSun ? 100 : 25, false, isSun);
  if (!boosterQuestions.length) {
    return showAppNoticeModal("Notice", "No Pending Reviews", "You have no pending mistakes or review questions right now.", "⚪", "Dismiss");
  }

  const sunReqThreshold = isSun ? Math.min(50, Math.ceil(boosterQuestions.length * 0.70)) : 0;
  const sunBestAtt = isSun
    ? userAttemptHistory
        .filter(a => Number(a.test_id) === -1 && getAttemptLocalDate(a.attempt_date) === todayStr)
        .reduce((max, a) => Math.max(max, (a.total_correct || 0) + (a.total_incorrect || 0)), 0)
    : 0;
  const isQuotaCompleted = isSun
    ? Boolean(dailyPerf?.is_century_hit || (sunReqThreshold > 0 && sunBestAtt >= sunReqThreshold))
    : isBoosterAttempted;

  if (mode === 'exam' && isQuotaCompleted) {
    return showAppNoticeModal(
      "Exam Mode Locked",
      isSun ? "Crucible Conquered" : "Completed for Today",
      isSun
        ? "You have already conquered today's Sunday Crucible Exam! You can continue practicing in Quiz, Flashcard, or Read mode."
        : "You have already completed today's official Booster Exam session. You can continue practicing in Quiz, Flashcard, or Read mode!",
      "🛡️",
      "Dismiss"
    );
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
    }, boosterQuestions, isSun ? 'Comprehensive Weekly Review' : 'Active Review');
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
      subEl.innerText = `${isSun ? 'Weekly Review' : 'Mistakes & Recall'} • ${qCount} Questions`;
    }

    switchView("viewPractice", true);
    window.setPracticeMode(mode);
  }
};

// 🚀 1. PURE O(1) SET SCORE & TELEMETRY CALCULATOR (SINGLE SOURCE OF TRUTH)
function getSetScoreMeta(testId, defaultQuestions = 10) {
  const tidStr = String(testId);
  const c = catalogMap.get(tidStr) || catalogData.find(x => String(x.test_id) === tidStr);
  const qCount = c ? (c.total_questions || defaultQuestions) : defaultQuestions;
  const maxMarks = qCount * 2;
  const duration = c ? (c.total_duration_minutes || 15) : 15;
  const title = c ? c.test_title : "Question Set";

  const attempts = attemptsByTestMap.get(tidStr) || [];
  const isAtt = attempts.length > 0;
  const bestScore = isAtt ? Math.max(...attempts.map(a => parseFloat(a.score))) : 0;
  const bestPct = (maxMarks > 0 && isAtt) ? (bestScore / maxMarks) * 100 : 0;
  const status = isAtt ? (bestPct >= 100 ? 'mastered' : 'revise') : 'unattempted';

  return { setCat: c, testId, title, qCount, maxMarks, duration, attempts, isAtt, bestScore, bestPct, status };
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

window.triggerUndoPlaylistRemove = async function() {
  if (!lastRemovedPayload) return;
  const { pId, testId, pName } = lastRemovedPayload;
  lastRemovedPayload = null;
  await togglePlaylistMembership(pId, Number(testId) || testId, false);
  showSelectionToast(`Restored to "${pName}"`);
};

window.executeSwipeRemove = async function(pId, testId, pName, el) {
  const numericTestId = Number(testId) || testId;
  const isViewingThisPlaylist = String(activeDashboardPlaylistId) === String(pId);
  const wrapper = el?.closest('.swipe-item-wrapper') || (isViewingThisPlaylist ? document.querySelector(`.yt-playlist-stage .swipe-item-wrapper[data-playlist-id="${pId}"][data-test-id="${numericTestId}"]`) : null);
  lastRemovedPayload = { pId, testId: numericTestId, pName };

  if (wrapper && wrapper.offsetParent !== null) {
    animateAndRemoveWrapper(wrapper, async () => {
      wrapper.remove();
      await togglePlaylistMembership(pId, numericTestId, true, true);
      showSelectionToast(`Removed from "${pName}"`, window.triggerUndoPlaylistRemove);
    });
  } else {
    await togglePlaylistMembership(pId, numericTestId, true, true);
    showSelectionToast(`Removed from "${pName}"`, window.triggerUndoPlaylistRemove);
  }
};

// ⭐ 1-TAP STAR SET CONTROLLER (ZERO-BLINK IN-PLACE SYNC)
window.toggleStarSet = async function(event, testId) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  const btnEl = event?.currentTarget;
  if (btnEl) btnEl.blur();

  const starredList = userPlaylists.find(p => p.playlist_name === 'Starred Sets');
  if (!starredList || !currentCandidate) return;

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(10); } catch (e) {}
  }

  const inList = userPlaylistItems.some(pi => String(pi.playlist_id) === String(starredList.id) && String(pi.test_id) === String(testId));

  if (inList) {
    await window.executeSwipeRemove(starredList.id, testId, 'Starred Sets', null);
  } else {
    await togglePlaylistMembership(starredList.id, testId, false, true);
    showSelectionToast(`Added to "Starred Sets"`);
  }
};

function getPlaylistAddBtnHtml(pId, pName) {
  return `<button type="button" class="btn-create-playlist-trigger" style="margin-top: 10px; grid-column: 1 / -1;" onclick="enableLibrarySelectionMode('${pId}', '${pName.replace(/'/g, "\\'")}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add Sets to ${pName}</span></button>`;
}

function getPlaylistVisualTheme(pName) {
  const n = (pName || "").trim().toLowerCase();
  if (n === "today") return { theme: "theme-today", heroClass: "hero-today", category: "execution", icon: "🔥", label: "Today's Payload", tag: "PRIMARY EXECUTION", artBg: "linear-gradient(135deg, #1e3a8a, #2563eb)" };
  if (n === "tomorrow") return { theme: "theme-tomorrow", heroClass: "hero-tomorrow", category: "staging", icon: "⏳", label: "Tomorrow's Queue", tag: "NEXT DAY STAGING", artBg: "linear-gradient(135deg, #0c4a6e, #0284c7)" };
  if (n === "this week") return { theme: "theme-week", heroClass: "hero-week", category: "staging", icon: "📅", label: "This Week Backlog", tag: "ROLLOVER & WEEKLY", artBg: "linear-gradient(135deg, #78350f, #d97706)" };
  if (n === "starred sets") return { theme: "theme-starred", heroClass: "hero-starred", category: "curated", icon: "⭐", label: "Starred Sets", tag: "VIP BOOKMARKS", artBg: "linear-gradient(135deg, #92400e, #f59e0b)" };
  return { theme: "theme-custom", heroClass: "", category: "curated", icon: "📁", label: pName, tag: "CUSTOM COLLECTION", artBg: "linear-gradient(135deg, #4c1d95, #7c3aed)" };
}

async function renderHomePlaylists() {
  if (isRenderingPlaylists) {
    pendingPlaylistRender = true;
    return;
  }
  isRenderingPlaylists = true;

  try {
    const deckContainer = document.querySelector("#viewDashboard .mission-deck-container");
    if (!deckContainer) return;

    // 🚀 1. COMPILE PINNED BOOSTER STRIP HTML (ABOVE TODAY'S GRID)
    const isSun = isSunday();
    const todayStr = getLocalDateString();
    const boosterAttemptedToday = userAttemptHistory.some(a => Number(a.test_id) === -1 && getAttemptLocalDate(a.attempt_date) === todayStr);
    const boosterLimit = isSun ? 100 : 25;
    const boosterQuestions = await compileMasteryBoosterPool(boosterLimit, false, isSun);
    const qCount = boosterQuestions.length;
    const stripTitle = isSun ? "Sunday Crucible Exam" : "Bonus Mastery Booster";

    const sunTargetPre = isSun ? (qCount > 0 ? Math.min(50, Math.ceil(qCount * 0.70)) : 0) : 100;
    const sunBestPre = isSun
      ? userAttemptHistory
          .filter(a => Number(a.test_id) === -1 && getAttemptLocalDate(a.attempt_date) === todayStr)
          .reduce((max, a) => Math.max(max, (a.total_correct || 0) + (a.total_incorrect || 0)), 0)
      : 0;
    const isTileCompleted = isSun
      ? Boolean(dailyPerf?.is_century_hit || (sunTargetPre > 0 && sunBestPre >= sunTargetPre))
      : boosterAttemptedToday;

    let boosterStripHtml = "";
    if (isTileCompleted) {
      boosterStripHtml = `
        <div class="yt-booster-strip is-clean">
          <div class="yt-booster-strip-left">
            <span class="yt-booster-strip-icon">${isSun ? "👑" : "✅"}</span>
            <div class="yt-booster-strip-text">
              <div class="yt-booster-strip-title">${stripTitle} • Quota Met</div>
              <div class="yt-booster-strip-sub">${qCount} Qs completed • Practice & flashcards unlocked</div>
            </div>
          </div>
          <button type="button" class="btn-yt-booster-go" onclick="openMissionBriefingModal(-1)">Review →</button>
        </div>
      `;
    } else if (qCount > 0) {
      const mistakeCount = boosterQuestions.filter(q => q.isMistake).length;
      const recallCount = qCount - mistakeCount;
      const subText = (isSun && sunBestPre > 0)
        ? `Incomplete (${sunBestPre}/${sunTargetPre} Qs solved)`
        : `${qCount} Due (${mistakeCount} Mistakes • ${recallCount} Recall)`;
      boosterStripHtml = `
        <div class="yt-booster-strip">
          <div class="yt-booster-strip-left">
            <span class="yt-booster-strip-icon">${isSun ? "⚔️" : "⚡"}</span>
            <div class="yt-booster-strip-text">
              <div class="yt-booster-strip-title">${stripTitle}</div>
              <div class="yt-booster-strip-sub">${subText}</div>
            </div>
          </div>
          <button type="button" class="btn-yt-booster-go" onclick="openMissionBriefingModal(-1)">Start Booster →</button>
        </div>
      `;
    }

    // 🚀 2. CALCULATE TOMORROW LOAD & RESOLVE ACTIVE PLAYLIST
    let tomorrowLoad = 0;
    const tomorrowList = userPlaylists.find(p => p.playlist_name === "Tomorrow");
    if (tomorrowList) {
      userPlaylistItems.filter(pi => pi.playlist_id === tomorrowList.id).forEach(i => {
        const c = catalogMap.get(String(i.test_id));
        tomorrowLoad += c ? (c.total_questions || 10) : 10;
      });
    }

    const orderedPlaylists = [
      ...["Today", "Tomorrow", "This Week", "Starred Sets"].map(n => userPlaylists.find(p => p.playlist_name === n)).filter(Boolean),
      ...userPlaylists.filter(p => !["Today", "Tomorrow", "This Week", "Starred Sets"].includes(p.playlist_name))
    ];

    if (!orderedPlaylists.some(p => String(p.id) === String(activeDashboardPlaylistId))) {
      activeDashboardPlaylistId = orderedPlaylists[0] ? String(orderedPlaylists[0].id) : null;
    }

    const visibleRailPlaylists = orderedPlaylists.filter(p => {
      const isSys = ["Today", "Tomorrow", "This Week", "Starred Sets"].includes(p.playlist_name);
      if (ytPlaylistFilter === "queues") return isSys;
      if (ytPlaylistFilter === "custom") return !isSys;
      return true;
    });

    // 🚀 3. RENDER YOUTUBE STACKED FOLDER RAIL
    const folderRowsHtml = visibleRailPlaylists.map(pl => {
      const items = userPlaylistItems.filter(pi => String(pi.playlist_id) === String(pl.id));
      let totalQs = 0;
      items.forEach(i => {
        const c = catalogMap.get(String(i.test_id));
        totalQs += c ? (c.total_questions || 10) : 10;
      });
      const vis = getPlaylistVisualTheme(pl.playlist_name);
      const isActive = String(pl.id) === String(activeDashboardPlaylistId);
      const isSys = Boolean(pl.is_system_playlist || ["Today", "Tomorrow", "This Week", "Starred Sets"].includes(pl.playlist_name));
      const isToday = pl.playlist_name === "Today";
      const boosterBadge = (isToday && !isTileCompleted && qCount > 0) ? ` • <span class="yt-folder-alert">⚡ ${qCount} Due</span>` : "";

      return `
        <div class="yt-folder-row ${vis.theme} ${isActive ? "active-yt-playlist" : ""}" onclick="selectDashboardPlaylist('${pl.id}')">
          <div class="yt-thumb-stack">
            <div class="yt-stack-tab-1"></div>
            <div class="yt-stack-tab-2"></div>
            <div class="yt-thumb-cover">
              <span>${vis.icon}</span>
              <span class="yt-thumb-badge">${items.length} ${items.length === 1 ? "set" : "sets"}</span>
            </div>
          </div>
          <div class="yt-folder-info">
            <div class="yt-folder-name">${vis.label}</div>
            <div class="yt-folder-meta">${items.length} Sets • ${totalQs} Qs${boosterBadge}</div>
          </div>
          <button type="button" class="btn-playlist-dots" onclick="event.stopPropagation(); openPlaylistActionMenu(event, '${pl.id}', '${pl.playlist_name.replace(/'/g, "\\'")}', ${isSys})" title="Playlist Options">${threeDotsSvg}</button>
        </div>
      `;
    }).join("");

    // 🚀 4. RENDER SELECTED PLAYLIST STAGE (3-CATEGORY YOUTUBE ARCHITECTURE)
    const activePl = orderedPlaylists.find(p => String(p.id) === String(activeDashboardPlaylistId)) || orderedPlaylists[0];
    let stageHtml = "";
    if (activePl) {
      const vis = getPlaylistVisualTheme(activePl.playlist_name);
      const isSys = Boolean(activePl.is_system_playlist || ["Today", "Tomorrow", "This Week", "Starred Sets"].includes(activePl.playlist_name));
      const isToday = vis.category === "execution";
      const isCurated = vis.category === "curated";
      const isStaging = vis.category === "staging";
      const items = userPlaylistItems.filter(pi => String(pi.playlist_id) === String(activePl.id));
      let stageQs = 0;
      let unattCnt = 0, revCnt = 0, mastCnt = 0;
      items.forEach(i => {
        const m = getSetScoreMeta(i.test_id);
        stageQs += m.qCount;
        if (!m.isAtt) unattCnt++;
        else if (m.status === "mastered") mastCnt++;
        else revCnt++;
      });

      const filteredStageItems = sortStageSetEntries(
        items.filter(i => ytStageFilter === "all" || getSetScoreMeta(i.test_id).status === ytStageFilter),
        ytStageSort,
        i => i.test_id
      );

      const pNameEsc = activePl.playlist_name.replace(/'/g, "\\'");
      const searchSvg = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
      const stageTopBarHtml = `
        <div class="yt-stage-topbar">
          <div class="yt-stage-topbar-left">
            <button type="button" class="btn-yt-stage-back" onclick="closeMobilePlaylistStage()" title="Back to Playlists">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
          </div>
          <div class="yt-stage-search-wrap ${isYtStageSearchOpen ? "open" : ""}" id="ytStageSearchWrap">
            ${searchSvg}
            <input type="text" id="ytStageSearchInput" class="yt-stage-search-input" placeholder="Search in ${vis.label}..." value="${ytStageSearchQuery.replace(/"/g, "&quot;")}" oninput="filterYtStageSets(this.value)" />
            <button type="button" class="btn-yt-search-clear" onclick="toggleYtStageSearch(false)" title="Close Search">✕</button>
          </div>
          <div class="yt-stage-topbar-right">
            <button type="button" id="btnYtStageSearchOpen" class="btn-yt-stage-icon" style="display:${isYtStageSearchOpen ? "none" : "inline-flex"};" onclick="toggleYtStageSearch(true)" title="Search Sets">${searchSvg}</button>
            <button type="button" class="btn-playlist-dots" onclick="openPlaylistActionMenu(event, '${activePl.id}', '${pNameEsc}', ${isSys})" title="Playlist Options">${threeDotsSvg}</button>
          </div>
        </div>
      `;

      const stageFilterBarHtml = `
        <div class="yt-stage-filter-bar">
          <div class="yt-stage-filter-chips">
            <button type="button" class="yt-chip btn-yt-sort-pill ${ytStageSort !== "default" ? "has-active-sort" : ""}" onclick="openStageSortSheet('dashboard')" title="Sort Sets">${sortArrowsSvg}<span>${getSortPillLabel(ytStageSort)}</span></button>
            <button type="button" class="yt-chip ${ytStageFilter === "all" ? "active" : ""}" onclick="setYtStageFilter('all')">All (${items.length})</button>
            <button type="button" class="yt-chip ${ytStageFilter === "unattempted" ? "active" : ""}" onclick="setYtStageFilter('unattempted')">Unattempted (${unattCnt})</button>
            <button type="button" class="yt-chip ${ytStageFilter === "revise" ? "active" : ""}" onclick="setYtStageFilter('revise')">Revise (${revCnt})</button>
            <button type="button" class="yt-chip ${ytStageFilter === "mastered" ? "active" : ""}" onclick="setYtStageFilter('mastered')">Mastered (${mastCnt})</button>
          </div>
          <div class="yt-filter-search-pill">
            ${searchSvg}
            <input type="text" id="ytDeskStageSearchInput" class="yt-filter-search-input" placeholder="Search sets..." value="${ytStageSearchQuery.replace(/"/g, "&quot;")}" oninput="filterYtStageSets(this.value)" />
            <button type="button" class="btn-yt-filter-clear" id="btnYtDeskSearchClear" style="display:${ytStageSearchQuery ? "inline-flex" : "none"};" onclick="clearDeskYtStageSearch()" title="Clear Search">✕</button>
          </div>
        </div>
      `;

      let heroTelemetryHtml = "";
      if (isToday && items.length > 0) {
        const doneSets = items.filter(i => getSetScoreMeta(i.test_id).isAtt).length;
        const donePct = Math.round((doneSets / items.length) * 100);
        heroTelemetryHtml = `
          <div class="yt-hero-telemetry-row">
            <span class="yt-hero-status-pill ${doneSets === items.length ? "pill-ready" : ""}">${doneSets}/${items.length} Completed (${donePct}%)</span>
            <div class="yt-hero-progress-track"><div class="yt-hero-progress-fill" style="width:${donePct}%;"></div></div>
          </div>
        `;
      } else if (activePl.playlist_name === "Tomorrow") {
        const isReady = stageQs >= 100;
        const badgeText = isReady ? `🎯 100-Q Target Locked` : `⏳ ${Math.max(0, 100 - stageQs)} Qs needed for 100-Q target`;
        heroTelemetryHtml = `
          <div class="yt-hero-telemetry-row">
            <span class="yt-hero-status-pill ${isReady ? "pill-ready" : "pill-warn"}">${badgeText}</span>
          </div>
        `;
      } else if (activePl.playlist_name === "This Week") {
        const rolloverCnt = items.filter(i => i.is_rollover).length;
        if (rolloverCnt > 0) {
          heroTelemetryHtml = `
            <div class="yt-hero-telemetry-row">
              <span class="yt-hero-status-pill pill-warn">⚠️ ${rolloverCnt} Rollover ${rolloverCnt === 1 ? "Set" : "Sets"}</span>
            </div>
          `;
        }
      }

      const primaryCtaLabel = isToday ? "▶ Continue Next" : "▶ Start Next";
      const stageHeaderHtml = `
        <div class="yt-watchlater-hero ${vis.heroClass}">
          <div class="yt-stage-hero-left">
            <div class="yt-hero-artwork" style="background:${vis.artBg};">${vis.icon}</div>
            <div class="yt-stage-title-stack">
              <span class="yt-stage-eyebrow">${vis.tag}</span>
              <h3 class="yt-stage-title">${vis.label}</h3>
              <span class="yt-stage-sub">${items.length} Sets • ${stageQs} Questions</span>
              ${heroTelemetryHtml}
            </div>
          </div>
          <div class="yt-stage-actions">
            <button type="button" class="btn-yt-play-all" onclick="startNextInPlaylist('${activePl.id}')">${items.length > 0 ? primaryCtaLabel : "+ Stage Sets"}</button>
            <button type="button" class="btn-yt-circle-add" onclick="enableLibrarySelectionMode('${activePl.id}', '${pNameEsc}')" title="Add Sets">+</button>
            <button type="button" class="btn-playlist-dots yt-hero-dots-desk" onclick="openPlaylistActionMenu(event, '${activePl.id}', '${pNameEsc}', ${isSys})" title="Playlist Options">${threeDotsSvg}</button>
          </div>
        </div>
        ${stageFilterBarHtml}
      `;

      const setsHtml = filteredStageItems.length > 0
        ? filteredStageItems.map(i => renderStageSetCardHtml(i, activePl.playlist_name, isStaging)).join("")
        : `<div style="text-align:center; padding:28px 16px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;">${items.length > 0 ? "No sets match this filter." : `No sets in "${vis.label}" yet. Tap <strong>+</strong> to stage sets from Library.`}</div>`;

      stageHtml = `
        ${stageTopBarHtml}
        ${stageHeaderHtml}
        ${isToday ? boosterStripHtml : ""}
        <div class="yt-stage-grid sets-card-grid">
          ${setsHtml}
          ${getPlaylistAddBtnHtml(activePl.id, activePl.playlist_name)}
        </div>
      `;
    }

    const isMobileStageNow = isMobilePlaylistStageOpen && window.innerWidth <= 768;
    deckContainer.classList.toggle("mobile-stage-open", isMobileStageNow);
    document.body.classList.toggle("mobile-playlist-active", isMobileStageNow);
    deckContainer.innerHTML = `
      <aside class="yt-playlists-rail">
        <div class="yt-rail-header">
          <h4 class="yt-rail-title">Playlists</h4>
          <button type="button" class="btn-yt-new-playlist" onclick="openCreatePlaylistModal(false)">+ New</button>
        </div>
        <div class="yt-filter-chips">
          <button type="button" class="yt-chip ${ytPlaylistFilter === "all" ? "active" : ""}" onclick="setYtPlaylistFilter('all')">All (${orderedPlaylists.length})</button>
          <button type="button" class="yt-chip ${ytPlaylistFilter === "queues" ? "active" : ""}" onclick="setYtPlaylistFilter('queues')">Queues</button>
          <button type="button" class="yt-chip ${ytPlaylistFilter === "custom" ? "active" : ""}" onclick="setYtPlaylistFilter('custom')">Custom</button>
        </div>
        <div class="yt-folder-list">${folderRowsHtml}</div>
      </aside>
      <section class="yt-playlist-stage" data-playlist-name="${activePl ? activePl.playlist_name.replace(/"/g, "&quot;") : "Playlist"}">
        ${stageHtml}
      </section>
    `;
    if (ytStageSearchQuery) filterYtStageSets(ytStageSearchQuery);
    // 🎯 6. DECOUPLED CENTURY BAROMETER TELEMETRY (PURE UNIQUE ATTEMPTS & HONEST MASTERY)
    const actualAttemptedCount = dailyPerf?.total_questions_attempted || 0;
    const todayAttempts = userAttemptHistory.filter(a => getAttemptLocalDate(a.attempt_date) === todayStr && (Number(a.test_id) > 0 || Number(a.test_id) === -6 || (Number(a.test_id) === -1 && isSun)));

    // Unique test_id ke hisab se best mastered count calculate karein (No Double Counting)
    const uniqueMasteredSets = new Map();
    todayAttempts.forEach(a => { 
      const tid = Number(a.test_id);
      let qc = 10;
      if (tid > 0) {
        const c = catalogMap.get(String(tid));
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

    const sundayCrucibleAtts = todayAttempts.filter(a => Number(a.test_id) === -1);
    const crucibleAttemptedQ = sundayCrucibleAtts.reduce((max, a) => Math.max(max, (a.total_correct || 0) + (a.total_incorrect || 0)), 0);
    const crucibleCorrectQ = sundayCrucibleAtts.reduce((max, a) => Math.max(max, (a.total_correct || 0)), 0);

    const sundayTargetQ = isSun ? (qCount > 0 ? Math.min(50, Math.ceil(qCount * 0.70)) : 0) : 100;
    const isSunHit = isSun && (dailyPerf.is_century_hit || (sundayTargetQ > 0 && crucibleAttemptedQ >= sundayTargetQ));
    const isOverdrive = !isSun && actualAttemptedCount >= 100;

    let attPct = 0;
    let masPct = 0;

    if (isSun) {
      if (qCount > 0) {
        attPct = Math.min(100, Math.round((crucibleAttemptedQ / qCount) * 100));
        masPct = Math.min(attPct, Math.round((crucibleCorrectQ / qCount) * 100));
      }
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
        subText.innerText = qCount > 0
          ? `Pool: ${qCount} Qs • Streak Target: ${sundayTargetQ} Qs`
          : "Weekly Review & Mastery Crucible";
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
      if (isSun) {
        const sunErrors = Math.max(0, crucibleAttemptedQ - crucibleCorrectQ);
        const sunRemaining = Math.max(0, qCount - crucibleAttemptedQ);
        legendEl.innerHTML = `
          <span class="tier-legend-item"><span class="tier-dot tier-dot-mastered"></span> Correct (${crucibleCorrectQ})</span>
          <span class="tier-legend-item"><span class="tier-dot tier-dot-error"></span> Errors (${sunErrors})</span>
          <span class="tier-legend-item"><span class="tier-dot tier-dot-remaining"></span> Left (${sunRemaining})</span>
          ${isSunHit ? `<span class="tier-legend-item" style="color:var(--warning-dark); font-family:var(--font-mono); font-weight:800;">👑 Target Met</span>` : ''}
        `;
      } else if (actualAttemptedCount >= 100) {
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

    // (D) 🚀 Zebra Crossing Laser Beam + Sunday Target Milestone Marker
    if (trackElement) {
      trackElement.style.position = "relative";
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

      // 👑 Sunday Streak Target Vertical Marker Line on Full-Pool Track
      let targetMarker = trackElement.querySelector(".sunday-target-marker");
      const markerPct = (isSun && qCount > 0) ? Math.min(100, Math.round((sundayTargetQ / qCount) * 100)) : 0;
      if (isSun && markerPct > 0 && markerPct < 100) {
        if (!targetMarker) {
          targetMarker = document.createElement("div");
          targetMarker.className = "sunday-target-marker";
          trackElement.appendChild(targetMarker);
        }
        targetMarker.title = `Streak Target: ${sundayTargetQ} Qs`;
        targetMarker.style.cssText = `position:absolute; top:-2px; bottom:-2px; left:${markerPct}%; width:2px; background:${isSunHit ? '#15803d' : '#b45309'}; box-shadow:0 0 0 1px rgba(255,255,255,0.85); z-index:4; pointer-events:none; border-radius:2px; transform:translateX(-50%);`;
      } else if (targetMarker) {
        targetMarker.remove();
      }
    }

    // (E) 🛰️ Dedicated Slot mein Beacon update karein
    const beaconSlot = document.getElementById("milestoneBeaconSlot");
    if (beaconSlot) {
      const beaconScore = isSun ? (isSunHit ? Math.max(100, actualAttemptedCount) : 0) : actualAttemptedCount;
      beaconSlot.innerHTML = getMilestoneBeaconHtml(beaconScore);
    }

    // 🎯 cMeter mein 4-Tier Crisp Telemetry Pills rahengi
    if (meterText) {
      meterText.innerHTML = isSun
        ? getMilestoneTelemetryHtml(crucibleAttemptedQ, crucibleCorrectQ, true, isSunHit, qCount)
        : getMilestoneTelemetryHtml(actualAttemptedCount, todayMasteredQ, false, false, 0);
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
  if (!toast) return;

  let contentWrap = toast.querySelector(".selection-toast-content");
  if (!contentWrap) {
    contentWrap = document.createElement("div");
    contentWrap.className = "selection-toast-content";
    toast.appendChild(contentWrap);
  }

  let msgEl = document.getElementById("selectionToastText") || contentWrap.querySelector(".toast-message");
  if (!msgEl) {
    msgEl = document.createElement("span");
    msgEl.id = "selectionToastText";
    msgEl.className = "toast-message";
    contentWrap.appendChild(msgEl);
  }
  msgEl.innerText = msg;

  let undoBtn = document.getElementById("btnToastUndo") || contentWrap.querySelector(".btn-toast-undo");
  if (!undoBtn) {
    undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.id = "btnToastUndo";
    undoBtn.className = "btn-toast-undo";
    undoBtn.innerText = "UNDO";
    contentWrap.appendChild(undoBtn);
  }

  if (undoCallback && typeof undoCallback === "function") {
    undoBtn.style.setProperty("display", "inline-flex", "important");
    undoBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      undoCallback();
      toast.classList.remove("show");
      setTimeout(() => { toast.style.display = "none"; }, 250);
    };
  } else {
    undoBtn.style.setProperty("display", "none", "important");
    undoBtn.onclick = null;
  }

  toast.style.setProperty("display", "flex", "important");
  void toast.offsetWidth;
  toast.classList.add("show");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (!toast.classList.contains("show")) toast.style.setProperty("display", "none", "important");
    }, 250);
  }, 5000);
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
    const c = catalogMap.get(String(item.test_id));
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
  const matched = userPlaylists.find(p => (p.playlist_name || "").trim().toLowerCase() === nameClean);
  if (!matched) return;
  activeDashboardPlaylistId = String(matched.id);
  if (window.innerWidth <= 768) {
    openMobilePlaylistStage(matched.id, true);
  } else {
    renderHomePlaylists();
  }
}

const STAGE_SORT_OPTIONS = [
  {
    key: "default",
    shortLabel: "Sort",
    title: "Default Order",
    sub: "Original queue or set sequence",
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`
  },
  {
    key: "weakest",
    shortLabel: "Weakest",
    title: "Weakest Score First",
    sub: "Lowest accuracy sets on top for priority revision",
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>`
  },
  {
    key: "unattempted",
    shortLabel: "Unattempted",
    title: "Unattempted First",
    sub: "Fresh sets first, attempted sets below",
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
  },
  {
    key: "name",
    shortLabel: "Name A–Z",
    title: "Name (A → Z • Numeric)",
    sub: "Natural alphabetical & set number order",
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5h10"></path><path d="M11 9h7"></path><path d="M11 13h4"></path><path d="M3 17l3 3 3-3"></path><path d="M6 18V4"></path></svg>`
  },
  {
    key: "subject",
    shortLabel: "Subject",
    title: "Subject-Wise (A → Z)",
    sub: "Group sets cleanly by subject domain",
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
  },
  {
    key: "quickest",
    shortLabel: "Quickest",
    title: "Quickest First",
    sub: "Shortest duration & fewest questions first",
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
  }
];

const sortArrowsSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15l5 5 5-5"></path><path d="M7 9l5-5 5 5"></path></svg>`;

function getSortPillLabel(sortKey) {
  const found = STAGE_SORT_OPTIONS.find(o => o.key === sortKey);
  return found && found.key !== "default" ? found.shortLabel : "Sort";
}

function sortStageSetEntries(entries, sortKey, getTestIdFn) {
  const list = [...(entries || [])];
  if (!sortKey || sortKey === "default") return list;

  const numCmp = (a, b) => String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });

  return list.sort((itemA, itemB) => {
    const mA = getSetScoreMeta(getTestIdFn(itemA));
    const mB = getSetScoreMeta(getTestIdFn(itemB));

    if (sortKey === "weakest") {
      if (mA.isAtt !== mB.isAtt) return mA.isAtt ? -1 : 1;
      if (mA.isAtt && mB.isAtt && Math.abs(mA.bestPct - mB.bestPct) > 0.01) {
        return mA.bestPct - mB.bestPct;
      }
      return numCmp(mA.title, mB.title);
    }

    if (sortKey === "unattempted") {
      if (mA.isAtt !== mB.isAtt) return mA.isAtt ? 1 : -1;
      return numCmp(mA.title, mB.title);
    }

    if (sortKey === "name") {
      return numCmp(mA.title, mB.title);
    }

    if (sortKey === "subject") {
      const sA = (mA.setCat?.subject || "General Studies").trim();
      const sB = (mB.setCat?.subject || "General Studies").trim();
      const subDiff = numCmp(sA, sB);
      return subDiff !== 0 ? subDiff : numCmp(mA.title, mB.title);
    }

    if (sortKey === "quickest") {
      if (mA.duration !== mB.duration) return mA.duration - mB.duration;
      if (mA.qCount !== mB.qCount) return mA.qCount - mB.qCount;
      return numCmp(mA.title, mB.title);
    }

    return 0;
  });
}

window.openStageSortSheet = function(scope = "dashboard") {
  activeSortSheetScope = scope;
  const activeKey = scope === "library" ? libStageSort : ytStageSort;

  let overlay = document.getElementById("stageSortBottomSheetOverlay");
  let sheet = document.getElementById("stageSortBottomSheet");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "stageSortBottomSheetOverlay";
    overlay.className = "drawer-overlay";
    overlay.onclick = closeStageSortSheet;
    document.body.appendChild(overlay);
  }

  if (!sheet) {
    sheet = document.createElement("div");
    sheet.id = "stageSortBottomSheet";
    sheet.className = "playlist-bottom-sheet";
    document.body.appendChild(sheet);
  }

  const checkSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  sheet.innerHTML = `
    <div class="bottom-sheet-drag-handle" onclick="closeStageSortSheet()"></div>
    <div class="bottom-sheet-header">
      <div class="bottom-sheet-title-group">
        <span class="bottom-sheet-badge">SEQUENCE ENGINE</span>
        <h4 class="bottom-sheet-title">Sort Question Sets</h4>
      </div>
      <button type="button" class="btn-close-sheet" onclick="closeStageSortSheet()" title="Close">✕</button>
    </div>
    <div class="sort-options-stream">
      ${STAGE_SORT_OPTIONS.map(opt => {
        const isSelected = opt.key === activeKey;
        return `
          <button type="button" class="sort-option-row ${isSelected ? "active-sort" : ""}" onclick="applyStageSortOption('${opt.key}')">
            <div class="sort-option-left">
              <div class="sort-option-icon">${opt.icon}</div>
              <div class="sort-option-text">
                <span class="sort-option-title">${opt.title}</span>
                <span class="sort-option-sub">${opt.sub}</span>
              </div>
            </div>
            <span class="sort-option-check">${isSelected ? checkSvg : ""}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  overlay.style.display = "block";
  overlay.style.pointerEvents = "auto";
  overlay.classList.add("open");
  sheet.style.visibility = "visible";
  requestAnimationFrame(() => {
    sheet.style.bottom = "0";
  });
};

window.closeStageSortSheet = function() {
  const overlay = document.getElementById("stageSortBottomSheetOverlay");
  const sheet = document.getElementById("stageSortBottomSheet");
  if (sheet) {
    sheet.style.bottom = "-100%";
    setTimeout(() => {
      if (sheet.style.bottom === "-100%") sheet.style.visibility = "hidden";
    }, 300);
  }
  if (overlay) {
    overlay.classList.remove("open");
    overlay.style.pointerEvents = "none";
    setTimeout(() => {
      if (!overlay.classList.contains("open")) overlay.style.display = "none";
    }, 250);
  }
};

window.applyStageSortOption = function(sortKey) {
  closeStageSortSheet();
  if (activeSortSheetScope === "library") {
    libStageSort = sortKey || "default";
    renderTopicSets();
  } else {
    ytStageSort = sortKey || "default";
    renderHomePlaylists();
  }
};

window.setYtPlaylistFilter = function(filterKey) {
  ytPlaylistFilter = filterKey || "all";
  renderHomePlaylists();
};

window.setYtStageFilter = function(filterKey) {
  ytStageFilter = filterKey || "all";
  renderHomePlaylists();
};

window.toggleYtStageSearch = function(openState) {
  isYtStageSearchOpen = typeof openState === "boolean" ? openState : !isYtStageSearchOpen;
  if (!isYtStageSearchOpen) ytStageSearchQuery = "";
  const wrap = document.getElementById("ytStageSearchWrap");
  const triggerBtn = document.getElementById("btnYtStageSearchOpen");
  const inp = document.getElementById("ytStageSearchInput");
  if (wrap) wrap.classList.toggle("open", isYtStageSearchOpen);
  if (triggerBtn) triggerBtn.style.display = isYtStageSearchOpen ? "none" : "inline-flex";
  if (isYtStageSearchOpen && inp) {
    inp.value = ytStageSearchQuery;
    setTimeout(() => inp.focus(), 40);
  } else {
    filterYtStageSets("");
  }
};

window.clearDeskYtStageSearch = function() {
  const deskInp = document.getElementById("ytDeskStageSearchInput");
  if (deskInp) {
    deskInp.value = "";
    deskInp.focus();
  }
  filterYtStageSets("");
};

window.filterYtStageSets = function(rawQuery) {
  ytStageSearchQuery = String(rawQuery || "");
  const q = ytStageSearchQuery.trim().toLowerCase();
  const deskClear = document.getElementById("btnYtDeskSearchClear");
  if (deskClear) deskClear.style.display = q ? "inline-flex" : "none";
  const grid = document.querySelector(".yt-playlist-stage .yt-stage-grid");
  if (!grid) return;

  let visibleCards = 0;
  grid.querySelectorAll(".swipe-item-wrapper").forEach(wrapper => {
    const tid = wrapper.getAttribute("data-test-id");
    const cat = catalogMap.get(String(tid));
    const title = (wrapper.querySelector(".set-tile-title")?.innerText || cat?.test_title || "").toLowerCase();
    const subj = (cat?.subject || "").toLowerCase();
    const topic = (cat?.topic || "").toLowerCase();
    const matched = !q || title.includes(q) || subj.includes(q) || topic.includes(q);
    wrapper.style.display = matched ? "" : "none";
    if (matched) visibleCards++;
  });

  let emptyEl = document.getElementById("ytStageSearchEmpty");
  if (q && visibleCards === 0) {
    if (!emptyEl) {
      emptyEl = document.createElement("div");
      emptyEl.id = "ytStageSearchEmpty";
      emptyEl.style.cssText = "text-align:center; padding:26px 14px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;";
      grid.insertBefore(emptyEl, grid.querySelector(".btn-create-playlist-trigger") || null);
    }
    emptyEl.innerText = `No sets found matching "${ytStageSearchQuery.trim()}"`;
  } else if (emptyEl) {
    emptyEl.remove();
  }
};

window.selectDashboardPlaylist = function(pId) {
  if (String(activeDashboardPlaylistId) !== String(pId)) {
    ytStageFilter = "all";
    ytStageSort = "default";
    ytStageSearchQuery = "";
    isYtStageSearchOpen = false;
  }
  activeDashboardPlaylistId = String(pId);
  if (window.innerWidth <= 768) {
    openMobilePlaylistStage(pId, true);
  } else {
    renderHomePlaylists();
  }
};

window.openMobilePlaylistStage = function(pId, pushHistory = true) {
  if (String(activeDashboardPlaylistId) !== String(pId)) {
    ytStageFilter = "all";
    ytStageSort = "default";
    ytStageSearchQuery = "";
    isYtStageSearchOpen = false;
  }
  activeDashboardPlaylistId = String(pId);
  isMobilePlaylistStageOpen = true;
  document.body.classList.add("mobile-playlist-active");
  renderHomePlaylists();
  const deck = document.querySelector("#viewDashboard .mission-deck-container");
  if (deck) deck.classList.add("mobile-stage-open");
  window.scrollTo({ top: 0, behavior: "instant" });
  if (pushHistory) {
    history.pushState({ page: "playlist-detail", view: "viewDashboard", playlistId: String(pId) }, "", "#playlist_" + encodeURIComponent(String(pId)));
  }
};

window.closeMobilePlaylistStage = function(fromPopState = false) {
  if (!fromPopState && history.state?.page === "playlist-detail") {
    return history.back();
  }
  isMobilePlaylistStageOpen = false;
  ytStageSearchQuery = "";
  isYtStageSearchOpen = false;
  document.body.classList.remove("mobile-playlist-active");
  const deck = document.querySelector("#viewDashboard .mission-deck-container");
  if (deck) deck.classList.remove("mobile-stage-open");
  renderHomePlaylists();
};

window.startNextInPlaylist = function(pId) {
  const pl = userPlaylists.find(p => String(p.id) === String(pId));
  if (!pl) return;
  const items = userPlaylistItems.filter(pi => String(pi.playlist_id) === String(pId));
  if (!items.length) {
    return enableLibrarySelectionMode(pl.id, pl.playlist_name);
  }
  const filtered = items.filter(it => ytStageFilter === "all" || getSetScoreMeta(it.test_id).status === ytStageFilter);
  const pool = sortStageSetEntries(filtered.length ? filtered : items, ytStageSort, it => it.test_id);
  const nextItem = ytStageSort === "default"
    ? (pool.find(it => !getSetScoreMeta(it.test_id).isAtt) || pool[0])
    : pool[0];
  openMissionBriefingModal(nextItem.test_id);
};

window.moveSetToToday = async function(event, fromPlaylistId, testId) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  if (!currentCandidate) return;
  const roll = currentCandidate.roll_number;
  const todayList = userPlaylists.find(p => p.playlist_name === "Today");
  if (!todayList || String(todayList.id) === String(fromPlaylistId)) return;

  const numTestId = Number(testId) || testId;
  const alreadyInToday = userPlaylistItems.some(pi => String(pi.playlist_id) === String(todayList.id) && String(pi.test_id) === String(numTestId));
  const backupItems = userPlaylistItems.map(pi => ({ ...pi }));

  userPlaylistItems = userPlaylistItems.filter(pi => !(String(pi.playlist_id) === String(fromPlaylistId) && String(pi.test_id) === String(numTestId)));
  if (!alreadyInToday) {
    userPlaylistItems.push({ playlist_id: todayList.id, test_id: numTestId, student_roll: roll, is_rollover: false });
  }
  appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);

  syncPlaylistTelemetryInPlace(fromPlaylistId, true, numTestId);
  syncPlaylistTelemetryInPlace(todayList.id, false, numTestId);

  showSelectionToast(`Moved to "Today's Payload"`, async () => {
    userPlaylistItems = backupItems;
    appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);
    renderHomePlaylists();
    await supabaseClient.from("playlist_items").upsert({ playlist_id: fromPlaylistId, test_id: numTestId, student_roll: roll });
    if (!alreadyInToday) {
      await supabaseClient.from("playlist_items").delete().match({ playlist_id: todayList.id, test_id: numTestId, student_roll: roll });
    }
    showSelectionToast("Move undone");
  });

  try {
    await supabaseClient.from("playlist_items").delete().match({ playlist_id: fromPlaylistId, test_id: numTestId, student_roll: roll });
    if (!alreadyInToday) {
      await supabaseClient.from("playlist_items").insert({ playlist_id: todayList.id, test_id: numTestId, student_roll: roll });
    }
  } catch (err) {
    console.error("Move to Today sync failed:", err);
  }
};

function renderStageSetCardHtml(item, pName, isStagingQueue = false) {
  const testId = item.test_id;
  const meta = getSetScoreMeta(testId);
  if (!meta.setCat) return "";

  const subj = (meta.setCat.subject || "GEN").trim();
  const subCode = subj.substring(0, 4).toUpperCase();
  const isRoll = item.is_rollover ? `<span class="set-rollover-tag">⚠️ ROLLOVER</span>` : "";

  let scoreLine = `<span style="color:var(--text-muted);">${meta.duration}m • Untested</span>`;
  if (meta.isAtt && meta.attempts.length > 0) {
    const fmtBest = Number.isInteger(meta.bestScore) ? meta.bestScore : meta.bestScore.toFixed(1);
    scoreLine = `<span style="color:${meta.bestPct >= 100 ? 'var(--success-dark)' : 'var(--warning-dark)'}; font-weight:700;">★ ${fmtBest}/${meta.maxMarks} (${Math.round(meta.bestPct)}%)</span>`;
  }

  const starredPl = userPlaylists.find(p => p.playlist_name === "Starred Sets");
  const isStarred = starredPl && userPlaylistItems.some(pi => pi.playlist_id === starredPl.id && String(pi.test_id) === String(testId));
  const pNameSafe = pName.replace(/'/g, "\\'");

  const footerRight = isStagingQueue
    ? `<button type="button" class="btn-move-today" onclick="moveSetToToday(event, '${item.playlist_id}', ${testId})">Move to Today ➔</button>`
    : `<span class="yt-quiet-cta">${meta.isAtt ? "Retake →" : "Start →"}</span>`;

  return `
    <div class="swipe-item-wrapper" data-test-id="${testId}" data-playlist-id="${item.playlist_id}">
      <div class="swipe-action-backdrop" onclick="executeSwipeRemove('${item.playlist_id}', ${testId}, '${pNameSafe}', this)">
        <span class="swipe-action-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
          <span>Remove</span>
        </span>
      </div>
      <div class="set-tile yt-stage-card" data-test-id="${testId}" data-status="${meta.status}" onclick="if(!event.target.closest('button')) openMissionBriefingModal(${testId})">
        <div class="yt-media-thumb">
          <span class="yt-media-sub-code">${subCode}</span>
          <span class="yt-media-q-pill">${meta.qCount} Qs</span>
        </div>
        <div class="yt-stage-card-body">
          <div class="set-tile-header">
            <div class="set-tile-title-group">
              ${isRoll}
              <div class="set-tile-title">${meta.title}</div>
            </div>
            <div style="display:flex; gap:4px; align-items:center; flex-shrink:0;">
              <button type="button" class="btn-star-set ${isStarred ? "starred" : ""}" data-test-id="${testId}" onclick="toggleStarSet(event, ${testId})" title="${isStarred ? "Unstar set" : "Star set"}">${starIconSvg}</button>
              <button type="button" class="btn-three-dots" onclick="openThreeDotsMenu(event, ${testId}, '${item.playlist_id}', '${pNameSafe}')" title="Options">${threeDotsSvg}</button>
            </div>
          </div>
          <div class="set-tile-meta"><span>${clockSvg} ${meta.duration}m</span><span>${docSvg} ${meta.qCount} Qs</span></div>
          <div class="yt-quiet-footer">
            <div class="set-score-info" style="margin:0;">${scoreLine}</div>
            ${footerRight}
          </div>
        </div>
      </div>
    </div>
  `;
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
    appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);
    showSelectionToast(`Removed from "${pName}"`);
    try {
      const { error } = await supabaseClient.from("playlist_items").delete().eq("playlist_id", pId).eq("test_id", testId).eq("student_roll", roll);
      if (error) throw error;
    } catch (err) {
      console.error("Remove from playlist error:", err);
      userPlaylistItems.push({ playlist_id: pId, test_id: testId, student_roll: roll });
      appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);
      if (btn) {
        btn.classList.add("saved");
        btn.innerHTML = `${bookmarkFilledSvg} <span class="stage-label">Saved to playlist</span>`;
      }
      updateStagingDockUI();
      showSelectionToast("Network sync failed. Reverted.");
    }
  } else {
    userPlaylistItems.push({ playlist_id: pId, test_id: testId, student_roll: roll });
    appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);
    if (btn) {
      btn.classList.add("saved");
      btn.innerHTML = `${bookmarkFilledSvg} <span class="stage-label">Saved to playlist</span>`;
    }
    showSelectionToast(`Added to "${pName}"`);
    try {
      const { error } = await supabaseClient.from("playlist_items").insert({ playlist_id: pId, test_id: testId, student_roll: roll });
      if (error) throw error;
    } catch (err) {
      console.error("Add to playlist error:", err);
      userPlaylistItems = userPlaylistItems.filter(pi => !(String(pi.playlist_id) === String(pId) && String(pi.test_id) === String(testId)));
      appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);
      if (btn) {
        btn.classList.remove("saved");
        btn.innerHTML = `${bookmarkOutlineSvg} <span class="stage-label">Save to playlist</span>`;
      }
      updateStagingDockUI();
      showSelectionToast("Network sync failed. Reverted.");
    }
  }

  updateStagingDockUI();
};

let currentThreeDotsPlaylistContext = null, currentThreeDotsWrapper = null;

window.openThreeDotsMenu = function(event, testId, playlistId = null, playlistName = null) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  currentThreeDotsTestId = testId; 
  currentThreeDotsPlaylistContext = (playlistId && playlistName) ? { playlistId, playlistName } : null;
  currentThreeDotsWrapper = event?.target?.closest('.swipe-item-wrapper') || null;
  closePlaylistActionMenu();
  const menu = document.getElementById("threeDotsMenu"), overlay = document.getElementById("threeDotsMenuOverlay"); 
  if (!menu || !overlay) return;

  const btnRemove = document.getElementById("btnPopupRemoveFromPlaylist"), labelRemove = document.getElementById("labelPopupRemoveFromPlaylist");
  if (btnRemove && labelRemove) {
    if (currentThreeDotsPlaylistContext) {
      const friendlyNames = { 'Today': "Today's Payload", 'Tomorrow': "Tomorrow's Queue", 'This Week': "This Week Backlog", 'Starred Sets': "Starred Sets" };
      labelRemove.innerText = `Remove from ${friendlyNames[playlistName] || playlistName}`;
      btnRemove.style.display = "flex";
    } else { btnRemove.style.display = "none"; }
  }

  const btnRect = event.currentTarget.getBoundingClientRect();
  menu.style.display = "block"; menu.style.zIndex = "3200"; 
  if (overlay) { overlay.style.display = "block"; overlay.style.zIndex = "3100"; overlay.style.pointerEvents = "auto"; overlay.classList.add("open"); }
  const actualWidth = menu.offsetWidth || 190;
  let leftPos = btnRect.right - actualWidth;
  if (leftPos + actualWidth > window.innerWidth - 12) leftPos = window.innerWidth - actualWidth - 12;
  if (leftPos < 12) leftPos = 12;

  const actualHeight = menu.offsetHeight || (currentThreeDotsPlaylistContext ? 76 : 42);
  let topPos = btnRect.bottom + 5;
  if (topPos + actualHeight > window.innerHeight - 12) topPos = Math.max(12, btnRect.top - actualHeight - 5);
  menu.style.top = `${topPos}px`;
  menu.style.left = `${leftPos}px`;
};

window.closeThreeDotsMenu = function() {
  const menu = document.getElementById("threeDotsMenu"), overlay = document.getElementById("threeDotsMenuOverlay");
  if (menu) menu.style.display = "none";
  if (overlay) { overlay.style.display = "none"; overlay.style.pointerEvents = "none"; overlay.classList.remove("open"); }
  currentThreeDotsPlaylistContext = null; currentThreeDotsWrapper = null;
};

window.triggerBottomSheetFromMenu = function() { 
  const tId = currentThreeDotsTestId; closeThreeDotsMenu(); if (tId) openPlaylistBottomSheet(tId); 
};

window.triggerRemoveFromPlaylistFromMenu = function(event) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  if (!currentThreeDotsTestId || !currentThreeDotsPlaylistContext) return;
  const { playlistId, playlistName } = currentThreeDotsPlaylistContext, testId = currentThreeDotsTestId, wrapper = currentThreeDotsWrapper;
  closeThreeDotsMenu();
  executeSwipeRemove(playlistId, testId, playlistName, wrapper);
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
  bs.style.visibility = "visible";
  bs.style.bottom = "0";
};

window.closePlaylistBottomSheet = function() {
  const bs = document.getElementById("playlistBottomSheet"), overlay = document.getElementById("playlistBottomSheetOverlay");
  if (bs) {
    bs.style.bottom = "-100%";
    setTimeout(() => {
      if (bs.style.bottom === "-100%") bs.style.visibility = "hidden";
    }, 300);
  }
  if (overlay) { 
    overlay.classList.remove("open"); 
    overlay.style.pointerEvents = "none"; 
    setTimeout(() => { if (!overlay.classList.contains("open")) overlay.style.display = "none"; }, 250); 
  }
};

function syncStarButtonsVisual(testId, isStarred, animatePop = false) {
  document.querySelectorAll(`.btn-star-set[data-test-id="${testId}"]`).forEach(btn => {
    btn.classList.toggle("starred", isStarred);
    btn.title = isStarred ? "Unstar set" : "Star set";
    if (animatePop) {
      btn.classList.remove("star-just-toggled");
      void btn.offsetWidth;
      btn.classList.add("star-just-toggled");
      setTimeout(() => btn.classList.remove("star-just-toggled"), 460);
    }
  });
}

function syncPlaylistTelemetryInPlace(pId, wasRemoved, testId = null) {
  const pl = userPlaylists.find(p => String(p.id) === String(pId));
  if (!pl) return false;

  const items = userPlaylistItems.filter(pi => String(pi.playlist_id) === String(pId));
  let totalQs = 0;
  let unattCnt = 0, revCnt = 0, mastCnt = 0;
  items.forEach(i => {
    const m = getSetScoreMeta(i.test_id);
    totalQs += m.qCount;
    if (!m.isAtt) unattCnt++;
    else if (m.status === "mastered") mastCnt++;
    else revCnt++;
  });

  // 1. Update Left Rail Folder Row in-place (No DOM destruction)
  const railRow = document.querySelector(`.yt-playlists-rail .yt-folder-row[onclick*="'${pId}'"]`);
  if (railRow) {
    const badge = railRow.querySelector(".yt-thumb-badge");
    if (badge) badge.innerText = `${items.length} ${items.length === 1 ? "set" : "sets"}`;
    const metaEl = railRow.querySelector(".yt-folder-meta");
    if (metaEl) metaEl.innerText = `${items.length} Sets • ${totalQs} Qs`;
  }

  // 2. If this playlist is NOT currently open on stage, no stage rebuild needed
  const isStageOpenForThis = String(activeDashboardPlaylistId) === String(pId);
  if (!isStageOpenForThis) return true;

  // 3. If it IS currently open on stage and an item was removed, remove card (if still in DOM) & update counts in-place
  if (wasRemoved) {
    if (testId !== null) {
      const leftoverCard = document.querySelector(`.yt-playlist-stage .swipe-item-wrapper[data-playlist-id="${pId}"][data-test-id="${testId}"]`);
      if (leftoverCard) {
        animateAndRemoveWrapper(leftoverCard, () => leftoverCard.remove());
      }
    }

    const stageSub = document.querySelector(".yt-playlist-stage .yt-stage-sub");
    if (stageSub) stageSub.innerText = `${items.length} Sets • ${totalQs} Questions`;

    const chips = document.querySelectorAll(".yt-playlist-stage .yt-stage-filter-bar .yt-chip");
    if (chips.length >= 4) {
      chips[0].innerText = `All (${items.length})`;
      chips[1].innerText = `Unattempted (${unattCnt})`;
      chips[2].innerText = `Revise (${revCnt})`;
      chips[3].innerText = `Mastered (${mastCnt})`;
    }

    const stageGrid = document.querySelector(".yt-playlist-stage .yt-stage-grid");
    if (stageGrid && items.length === 0 && !stageGrid.querySelector(".yt-empty-stage-msg")) {
      const vis = getPlaylistVisualTheme(pl.playlist_name);
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "yt-empty-stage-msg";
      emptyDiv.style.cssText = "text-align:center; padding:28px 16px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;";
      emptyDiv.innerHTML = `No sets in "${vis.label}" yet. Tap <strong>+</strong> to stage sets from Library.`;
      stageGrid.insertBefore(emptyDiv, stageGrid.querySelector(".btn-create-playlist-trigger") || null);
    }
    return true;
  }

  return false;
}

window.togglePlaylistMembership = async function(pId, testId, inList, skipFullRerender = false) {
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

  appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);

  // 2. Star Icon State Sync
  const starredList = userPlaylists.find(p => p.playlist_name === 'Starred Sets');
  if (starredList && String(starredList.id) === String(pId)) {
    syncStarButtonsVisual(testId, !inList, true);
  }

  // 3. Bottom Sheet Sync
  const overlay = document.getElementById("playlistBottomSheetOverlay");
  if (overlay && overlay.classList.contains("open")) {
    openPlaylistBottomSheet(testId);
    const plObj = userPlaylists.find(p => String(p.id) === String(pId));
    const plName = plObj ? plObj.playlist_name : "Playlist";
    if (inList) {
      lastRemovedPayload = { pId, testId: Number(testId) || testId, pName: plName };
      showSelectionToast(`Removed from "${plName}"`, window.triggerUndoPlaylistRemove);
    } else {
      showSelectionToast(`Added to "${plName}"`);
    }
  }

  const handledInPlace = syncPlaylistTelemetryInPlace(pId, inList, testId);
  if (!handledInPlace && !skipFullRerender) {
    renderHomePlaylists();
  }

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
    
    if (inList) { 
      userPlaylistItems.push({ playlist_id: pId, test_id: testId, student_roll: roll }); 
    } else { 
      userPlaylistItems = userPlaylistItems.filter(
        pi => !(String(pi.playlist_id) === String(pId) && String(pi.test_id) === String(testId))
      ); 
    } 

    appStorage.setJSON("cache_playlist_items_" + roll, userPlaylistItems);

    if (starredList && String(starredList.id) === String(pId)) {
      syncStarButtonsVisual(testId, inList, false);
    }

    if (overlay && overlay.classList.contains("open")) {
      openPlaylistBottomSheet(testId);
    }
    if (!syncPlaylistTelemetryInPlace(pId, !inList, testId)) {
      renderHomePlaylists();
    }
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
        hasLoadedWeakQuestions = true;
        cachedBoosterPool = null;
        lastBoosterFetchTime = 0;
        return; 
      }
    }
    userWeakQuestions = weakQs;
    hasLoadedWeakQuestions = true;
    cachedBoosterPool = null;
    lastBoosterFetchTime = 0;
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
  await syncAttemptHistory(false);
  rebuildDataIndexes();
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
  const attemptedPct = totalSets > 0 ? Math.round((attemptedSets / totalSets) * 100) : 0;
  const progPct = totalSets > 0 ? Math.round((masteredCount / totalSets) * 100) : 0;
  const avgAcc = attemptedSets > 0 ? Math.round(sumPct / attemptedSets) : 0;

  return { subSets, totalSets, attemptedSets, attemptedPct, masteredCount, remaining, progPct, avgAcc, totalAtt };
}

// 🚀 SUBJECT 3-DOTS ACTION MENU CONTROLLER (PIN / UNPIN)
window.openSubjectActionMenu = function(event, subName) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  closeAllOverlaysAndPopups();
  activeSubjectMenuTarget = subName;

  const menu = document.getElementById("subjectActionMenu");
  const overlay = document.getElementById("subjectActionMenuOverlay");
  const labelPin = document.getElementById("labelSubjectPin");
  const iconPin = document.getElementById("iconSubjectPin");
  if (!menu) return;

  const roll = currentCandidate?.roll_number || "default";
  const pinnedList = appStorage.getJSON("pinned_subjects_" + roll, []);
  const isPinned = pinnedList.includes(subName);

  if (labelPin) {
    labelPin.innerText = isPinned ? "Unpin Subject" : "Pin to Top";
  }
  if (iconPin) {
    iconPin.innerHTML = isPinned
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12"></path><path d="M15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v1"></path></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>`;
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

  // मेन्यू को स्क्रीन और कार्ड की सीमा के भीतर लॉक करना
  const actualWidth = menu.offsetWidth || 140;
  let leftPos = btnRect.right - actualWidth;
  if (leftPos + actualWidth > window.innerWidth - 12) {
    leftPos = window.innerWidth - actualWidth - 12;
  }
  if (leftPos < 12) leftPos = 12;

  let topPos = btnRect.bottom + 4;
  const menuHeight = menu.offsetHeight || 32;
  if (topPos + menuHeight > window.innerHeight - 10) {
    topPos = Math.max(10, btnRect.top - menuHeight - 4);
  }
  menu.style.top = `${topPos}px`;
  menu.style.left = `${leftPos}px`;
};

window.closeSubjectActionMenu = function() {
  const menu = document.getElementById("subjectActionMenu");
  const overlay = document.getElementById("subjectActionMenuOverlay");
  if (menu) menu.style.display = "none";
  if (overlay) {
    overlay.style.display = "none";
    overlay.style.pointerEvents = "none";
    overlay.classList.remove("open");
  }
  activeSubjectMenuTarget = null;
};

window.togglePinSubjectFromMenu = function() {
  const subName = activeSubjectMenuTarget;
  closeSubjectActionMenu();
  if (!subName) return;

  const roll = currentCandidate?.roll_number || "default";
  const key = "pinned_subjects_" + roll;
  let pinned = appStorage.getJSON(key, []);
  const idx = pinned.indexOf(subName);

  if (idx > -1) {
    pinned.splice(idx, 1);
    showSelectionToast(`Unpinned "${subName}"`);
  } else {
    pinned.unshift(subName);
    showSelectionToast(`📌 Pinned "${subName}" to top`);
  }

  appStorage.setJSON(key, pinned);
  renderSubjectHubGrid();
};

function getSubjectHubViewMode() {
  const saved = appStorage.get("subject_hub_view_mode");
  if (saved === "compact" || saved === "grid") return saved;
  return window.innerWidth <= 768 ? "compact" : "grid";
}

window.setSubjectHubViewMode = function(mode) {
  const next = mode === "compact" ? "compact" : "grid";
  appStorage.set("subject_hub_view_mode", next);
  renderSubjectHubGrid(true);
};

window.setHubSubjectFilter = function(filterKey) {
  hubSubjectFilter = filterKey || "all";
  renderSubjectHubGrid(true);
};

window.filterHubSubjects = function(rawQuery) {
  hubSubjectSearchQuery = String(rawQuery || "");
  const clearBtn = document.getElementById("btnHubSearchClear");
  if (clearBtn) clearBtn.style.display = hubSubjectSearchQuery.trim() ? "inline-flex" : "none";
  renderSubjectHubGrid(true);
};

window.clearHubSubjectSearch = function() {
  const inp = document.getElementById("hubSubjectSearchInput");
  if (inp) {
    inp.value = "";
    inp.focus();
  }
  filterHubSubjects("");
};

function getCustomMockPoolStats(subName, poolFilter = "all") {
  const clean = (subName || "General Studies").trim().toLowerCase();
  const allSets = catalogData.filter(r => (r.subject || "General Studies").trim().toLowerCase() === clean);
  const matchingSets = allSets.filter(s => {
    const isAtt = getSetScoreMeta(s.test_id).isAtt;
    if (poolFilter === "unattempted") return !isAtt;
    if (poolFilter === "attempted") return isAtt;
    return true;
  });
  const totalQuestions = matchingSets.reduce((sum, s) => sum + (s.total_questions || 10), 0);
  return { matchingSets, setCount: matchingSets.length, totalQuestions };
}

window.openCustomMockModal = function() {
  if (!catalogData.length) {
    return showAppNoticeModal("Catalog Loading", "Please Wait", "Subject catalog is still loading. Try again in a moment.", "⏳", "Dismiss");
  }

  const subjects = Array.from(new Set(catalogData.map(r => (r.subject || "General Studies").trim())))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  const existingKeys = Object.keys(customMockConfig.selectedSubjects).filter(k => subjects.includes(k));
  if (existingKeys.length === 0) {
    subjects.slice(0, 4).forEach(sub => {
      customMockConfig.selectedSubjects[sub] = 25;
    });
  }

  let modal = document.getElementById("customMockModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "customMockModal";
    modal.className = "tcs-modal-overlay";
    modal.style.zIndex = "3250";
    modal.onclick = (e) => { if (e.target === modal) closeCustomMockModal(); };
    document.body.appendChild(modal);
  }

  modal.style.setProperty("display", "flex", "important");
  modal.style.pointerEvents = "auto";
  renderCustomMockModalBody();
};

window.closeCustomMockModal = function() {
  const modal = document.getElementById("customMockModal");
  if (modal) {
    modal.style.setProperty("display", "none", "important");
    modal.style.pointerEvents = "none";
  }
};

window.setCustomMockPoolFilter = function(poolKey) {
  customMockConfig.poolFilter = poolKey || "all";
  renderCustomMockModalBody();
};

window.setCustomMockOrderMode = function(orderKey) {
  customMockConfig.orderMode = orderKey || "mixed";
  renderCustomMockModalBody();
};

window.toggleCustomMockSubject = function(subName) {
  if (customMockConfig.selectedSubjects[subName]) {
    delete customMockConfig.selectedSubjects[subName];
  } else {
    const activeCount = Object.keys(customMockConfig.selectedSubjects).length;
    if (activeCount >= 6) {
      return showSelectionToast("⚠️ Maximum 6 subjects allowed per mock");
    }
    customMockConfig.selectedSubjects[subName] = 25;
  }
  renderCustomMockModalBody();
};

window.updateCustomMockSubjectCount = function(subName, countVal) {
  const num = parseInt(countVal, 10) || 25;
  customMockConfig.selectedSubjects[subName] = num;
  renderCustomMockModalBody();
};

function renderCustomMockModalBody() {
  const modal = document.getElementById("customMockModal");
  if (!modal || modal.style.display === "none") return;

  const subjects = Array.from(new Set(catalogData.map(r => (r.subject || "General Studies").trim())))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  let selectedSubCount = 0;
  let totalTargetQs = 0;

  const rowsHtml = subjects.map(subName => {
    const safeSub = subName.replace(/'/g, "\\'");
    const poolStats = getCustomMockPoolStats(subName, customMockConfig.poolFilter);
    const isSelected = Boolean(customMockConfig.selectedSubjects[subName]);
    const chosenCount = customMockConfig.selectedSubjects[subName] || 25;
    const effectiveQs = Math.min(chosenCount, poolStats.totalQuestions);

    if (isSelected && effectiveQs > 0) {
      selectedSubCount++;
      totalTargetQs += effectiveQs;
    }

    const countOptions = [10, 15, 20, 25, 30].map(val =>
      `<option value="${val}" ${chosenCount === val ? "selected" : ""}>${val} Qs</option>`
    ).join("");

    return `
      <div class="custom-mock-sub-row ${isSelected ? "is-selected" : ""}">
        <div class="custom-mock-sub-left" onclick="toggleCustomMockSubject('${safeSub}')">
          <span class="custom-mock-check">${isSelected ? "✓" : ""}</span>
          <div class="custom-mock-sub-info">
            <span class="custom-mock-sub-title">${subName}</span>
            <span class="custom-mock-sub-meta">${poolStats.setCount} Sets • ${poolStats.totalQuestions} Qs available</span>
          </div>
        </div>
        <select class="custom-mock-q-select" ${!isSelected || poolStats.totalQuestions === 0 ? "disabled" : ""} onchange="updateCustomMockSubjectCount('${safeSub}', this.value)">
          ${countOptions}
        </select>
      </div>
    `;
  }).join("");

  const durationMins = Math.max(5, Math.ceil(totalTargetQs * 0.6));
  const canLaunch = selectedSubCount >= 2 && totalTargetQs >= 10;

  let sheet = modal.querySelector(".custom-mock-sheet");
  if (!sheet) {
    modal.innerHTML = `<div class="custom-mock-sheet"></div>`;
    sheet = modal.querySelector(".custom-mock-sheet");
  }

  const prevScrollTop = sheet.querySelector(".custom-mock-subjects-list")?.scrollTop || 0;
  const mockLayersSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`;

  sheet.innerHTML = `
    <div class="bottom-sheet-drag-handle hide-on-desktop" onclick="closeCustomMockModal()"></div>
    <div class="custom-mock-header">
      <div class="bottom-sheet-title-group">
        <span class="bottom-sheet-badge">FULL-PAPER SIMULATOR</span>
        <h4 class="bottom-sheet-title" style="display:flex; align-items:center; gap:7px;">${mockLayersSvg}<span>Custom Multi-Subject Mock</span></h4>
      </div>
      <button type="button" class="btn-close-sheet" onclick="closeCustomMockModal()">✕</button>
    </div>
    <div class="custom-mock-controls">
      <div class="custom-mock-control-row">
        <span class="custom-mock-control-label">Question Pool:</span>
        <div class="audit-filter-chips">
          <button type="button" class="yt-chip ${customMockConfig.poolFilter === "all" ? "active" : ""}" onclick="setCustomMockPoolFilter('all')">All Sets</button>
          <button type="button" class="yt-chip ${customMockConfig.poolFilter === "unattempted" ? "active" : ""}" onclick="setCustomMockPoolFilter('unattempted')">⚡ Unattempted</button>
          <button type="button" class="yt-chip ${customMockConfig.poolFilter === "attempted" ? "active" : ""}" onclick="setCustomMockPoolFilter('attempted')">🔄 Attempted</button>
        </div>
      </div>
      <div class="custom-mock-control-row">
        <span class="custom-mock-control-label">Paper Order:</span>
        <div class="audit-filter-chips">
          <button type="button" class="yt-chip ${customMockConfig.orderMode === "mixed" ? "active" : ""}" onclick="setCustomMockOrderMode('mixed')">🔀 Mixed Shuffle</button>
          <button type="button" class="yt-chip ${customMockConfig.orderMode === "sections" ? "active" : ""}" onclick="setCustomMockOrderMode('sections')">📑 Subject Sections</button>
        </div>
      </div>
    </div>
    <div class="custom-mock-subjects-list">${rowsHtml}</div>
    <div class="custom-mock-footer">
      <div class="custom-mock-summary-stack">
        <span class="custom-mock-total-val">${selectedSubCount} Subjects • ${totalTargetQs} Qs</span>
        <span class="custom-mock-total-sub">⏱️ ${durationMins}m Duration • Select at least 2 subjects</span>
      </div>
      <button type="button" class="btn-primary" id="btnLaunchCustomMock" ${!canLaunch ? "disabled style='opacity:0.5; cursor:not-allowed;'" : ""} onclick="launchCustomMultiSubjectMock()">
        Launch Mock ➔
      </button>
    </div>
  `;

  const updatedListEl = sheet.querySelector(".custom-mock-subjects-list");
  if (updatedListEl && prevScrollTop > 0) {
    updatedListEl.scrollTop = prevScrollTop;
  }
}

window.launchCustomMultiSubjectMock = async function() {
  const launchBtn = document.getElementById("btnLaunchCustomMock");
  if (launchBtn) {
    launchBtn.innerText = "Compiling Paper...";
    launchBtn.disabled = true;
  }

  try {
    const subjects = Array.from(new Set(catalogData.map(r => (r.subject || "General Studies").trim())))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    const plan = [];
    const pickedTestMetaMap = new Map();

    subjects.forEach(subName => {
      if (!customMockConfig.selectedSubjects[subName]) return;
      const targetCount = customMockConfig.selectedSubjects[subName] || 25;
      const poolStats = getCustomMockPoolStats(subName, customMockConfig.poolFilter);
      if (!poolStats.matchingSets.length) return;

      const shuffledSets = shuffleArray(poolStats.matchingSets);
      const chosenSets = [];
      let accumulated = 0;
      for (const s of shuffledSets) {
        chosenSets.push(s);
        pickedTestMetaMap.set(String(s.test_id), s);
        accumulated += (s.total_questions || 10);
        if (accumulated >= targetCount + 10) break;
      }
      plan.push({ subName, targetCount, chosenSets });
    });

    if (plan.length < 2) {
      throw new Error("Please select at least 2 subjects with available questions.");
    }

    const allTestIds = Array.from(pickedTestMetaMap.keys());
    const { data: sectionsData, error: secErr } = await supabaseClient
      .from("test_sections")
      .select("id, test_id")
      .in("test_id", allTestIds);
    if (secErr || !sectionsData?.length) {
      throw new Error("Could not load test sections for selected subjects.");
    }

    const sectionToTestId = new Map();
    sectionsData.forEach(sec => {
      if (!Array.from(sectionToTestId.values()).includes(String(sec.test_id))) {
        sectionToTestId.set(String(sec.id), String(sec.test_id));
      }
    });

    const sectionIds = Array.from(sectionToTestId.keys());
    const { data: qRows, error: qErr } = await supabaseClient
      .from("test_section_questions")
      .select(`section_id, question_number, questions (id, content, options, correct_answer, explanation)`)
      .in("section_id", sectionIds);
    if (qErr || !qRows?.length) {
      throw new Error("Could not load questions from selected sets.");
    }

    const questionsByTestId = new Map();
    qRows.forEach(row => {
      const tid = sectionToTestId.get(String(row.section_id));
      if (!tid) return;
      const q = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      if (!q) return;
      if (!questionsByTestId.has(tid)) questionsByTestId.set(tid, []);
      questionsByTestId.get(tid).push({ qNumRaw: row.question_number, q });
    });

    let compiledQuestions = [];
    const sectionsMeta = [];
    const seenQIds = new Set();

    plan.forEach(({ subName, targetCount, chosenSets }) => {
      const subPool = [];
      chosenSets.forEach(catSet => {
        const tid = String(catSet.test_id);
        const rows = questionsByTestId.get(tid) || [];
        rows.forEach(({ qNumRaw, q }) => {
          const qIdStr = String(q.id);
          if (seenQIds.has(qIdStr)) return;
          seenQIds.add(qIdStr);
          const opts = parseQuestionOptions(q.options);
          subPool.push({
            qNum: qNumRaw,
            id: q.id,
            subject: subName,
            topic: (catSet.topic || "").trim(),
            testId: tid,
            testTitle: catSet.test_title || "",
            content: q.content,
            options: opts,
            correctAnswer: getNormalizedCorrectAnswerId(q.correct_answer, opts),
            explanation: q.explanation
          });
        });
      });

      const pickedForSubject = shuffleArray(subPool).slice(0, targetCount);
      if (pickedForSubject.length > 0) {
        sectionsMeta.push({
          name: subName,
          startIndex: compiledQuestions.length,
          count: pickedForSubject.length
        });
        compiledQuestions = compiledQuestions.concat(pickedForSubject);
      }
    });

    if (compiledQuestions.length < 5) {
      throw new Error("Not enough unique questions found for this combination.");
    }

    const isSectionsOrder = customMockConfig.orderMode === "sections";
    if (!isSectionsOrder) {
      compiledQuestions = shuffleArray(compiledQuestions);
    }
    compiledQuestions.forEach((q, idx) => { q.qNum = idx + 1; });

    const totalQs = compiledQuestions.length;
    const durationMins = Math.max(5, Math.ceil(totalQs * 0.6));
    const subSummary = sectionsMeta.map(s => s.name).join(" • ");

    closeCustomMockModal();
    mountExamSession({
      id: -6,
      title: `Custom Mock (${sectionsMeta.length} Subjects)`,
      subject: subSummary,
      sections: isSectionsOrder ? sectionsMeta : null,
      total_duration_minutes: durationMins
    }, compiledQuestions, isSectionsOrder ? sectionsMeta[0].name : "Mixed Multi-Subject");
  } catch (err) {
    showAppNoticeModal("Custom Mock Error", "Could Not Build Paper", err.message, "⚠️", "Dismiss");
  } finally {
    if (launchBtn) {
      launchBtn.innerText = "Launch Mock ➔";
      launchBtn.disabled = false;
    }
  }
};

function renderSubjectHubGrid(preserveSearchFocus = false) {
  const container = document.getElementById("subjectHubContainer"); 
  if (!container) return;
  if (!catalogData.length) return;

  const roll = currentCandidate?.roll_number || "default";
  const pinnedList = appStorage.getJSON("pinned_subjects_" + roll, []);
  const pinnedSet = new Set(pinnedList);
  const viewMode = getSubjectHubViewMode();

  const subjects = Array.from(new Set(catalogData.map(r => (r.subject || "General Studies").trim())));
  subjects.sort((a, b) => {
    const aPin = pinnedSet.has(a);
    const bPin = pinnedSet.has(b);
    if (aPin && !bPin) return -1;
    if (!aPin && bPin) return 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  // 1. Pre-compute status & metrics for accurate filter chip counts
  let inProgCnt = 0, untestedCnt = 0, masteredCnt = 0;
  const enriched = subjects.map(subName => {
    const stats = getSubjectMasteryStats(subName);
    const isPinned = pinnedSet.has(subName);
    let statusKey = "untested";
    let sClass = "pill-untested", sText = "Untested";
    if (stats.masteredCount === stats.totalSets && stats.totalSets > 0) {
      statusKey = "mastered";
      sClass = "pill-mastered";
      sText = "Mastered";
      masteredCnt++;
    } else if (stats.totalAtt > 0) {
      statusKey = "progress";
      sClass = "pill-progress";
      sText = `${stats.attemptedSets}/${stats.totalSets} Done`;
      inProgCnt++;
    } else {
      untestedCnt++;
    }
    return { subName, stats, isPinned, statusKey, sClass, sText };
  });

  // 2. Mount or update Subject Hub Control Bar (Search + Compact/Grid Toggle + Filter Chips)
  let controlBar = document.getElementById("subjectHubControlBar");
  if (!controlBar && container.parentNode) {
    controlBar = document.createElement("div");
    controlBar.id = "subjectHubControlBar";
    controlBar.className = "hub-control-bar";
    container.parentNode.insertBefore(controlBar, container);
  }

  if (controlBar) {
    const listIconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`;
    const gridIconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>`;
    const searchIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

    if (!preserveSearchFocus || !document.getElementById("hubSubjectSearchInput")) {
      controlBar.innerHTML = `
        <div class="hub-control-top">
          <div class="hub-search-pill">
            ${searchIconSvg}
            <input type="text" id="hubSubjectSearchInput" class="hub-search-input" placeholder="Search subjects..." value="${hubSubjectSearchQuery.replace(/"/g, "&quot;")}" oninput="filterHubSubjects(this.value)" />
            <button type="button" class="btn-hub-search-clear" id="btnHubSearchClear" style="display:${hubSubjectSearchQuery.trim() ? "inline-flex" : "none"};" onclick="clearHubSubjectSearch()" title="Clear">✕</button>
          </div>
          <button type="button" class="btn-custom-mock-trigger" onclick="openCustomMockModal()" title="Build Multi-Subject Mock Paper"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg><span>Custom Mock</span></button>
          <div class="hub-view-switcher" role="group" aria-label="Subject View Mode">
            <button type="button" id="btnHubViewCompact" class="btn-hub-view ${viewMode === "compact" ? "active" : ""}" onclick="setSubjectHubViewMode('compact')" title="Compact List View">${listIconSvg}</button>
            <button type="button" id="btnHubViewGrid" class="btn-hub-view ${viewMode === "grid" ? "active" : ""}" onclick="setSubjectHubViewMode('grid')" title="Detailed Grid View">${gridIconSvg}</button>
          </div>
        </div>
        <div class="hub-filter-chips" id="hubFilterChipsRow">
          <button type="button" class="yt-chip ${hubSubjectFilter === "all" ? "active" : ""}" onclick="setHubSubjectFilter('all')">All (${subjects.length})</button>
          <button type="button" class="yt-chip ${hubSubjectFilter === "progress" ? "active" : ""}" onclick="setHubSubjectFilter('progress')">In Progress (${inProgCnt})</button>
          <button type="button" class="yt-chip ${hubSubjectFilter === "untested" ? "active" : ""}" onclick="setHubSubjectFilter('untested')">Untested (${untestedCnt})</button>
          <button type="button" class="yt-chip ${hubSubjectFilter === "mastered" ? "active" : ""}" onclick="setHubSubjectFilter('mastered')">Mastered (${masteredCnt})</button>
        </div>
      `;
    } else {
      document.getElementById("btnHubViewCompact")?.classList.toggle("active", viewMode === "compact");
      document.getElementById("btnHubViewGrid")?.classList.toggle("active", viewMode === "grid");
      const chipsRow = document.getElementById("hubFilterChipsRow");
      if (chipsRow) {
        chipsRow.innerHTML = `
          <button type="button" class="yt-chip ${hubSubjectFilter === "all" ? "active" : ""}" onclick="setHubSubjectFilter('all')">All (${subjects.length})</button>
          <button type="button" class="yt-chip ${hubSubjectFilter === "progress" ? "active" : ""}" onclick="setHubSubjectFilter('progress')">In Progress (${inProgCnt})</button>
          <button type="button" class="yt-chip ${hubSubjectFilter === "untested" ? "active" : ""}" onclick="setHubSubjectFilter('untested')">Untested (${untestedCnt})</button>
          <button type="button" class="yt-chip ${hubSubjectFilter === "mastered" ? "active" : ""}" onclick="setHubSubjectFilter('mastered')">Mastered (${masteredCnt})</button>
        `;
      }
    }
  }

  // 3. Filter subjects by active status chip & search query
  const q = hubSubjectSearchQuery.trim().toLowerCase();
  const visibleSubjects = enriched.filter(item => {
    const matchesStatus = hubSubjectFilter === "all" || item.statusKey === hubSubjectFilter;
    const matchesQuery = !q || item.subName.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  container.innerHTML = "";
  container.classList.toggle("is-compact-view", viewMode === "compact");

  if (visibleSubjects.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:32px 16px; color:var(--text-muted); font-size:13px; font-weight:600; grid-column:1 / -1;">No subjects match this filter.</div>`;
    return;
  }

  visibleSubjects.forEach(({ subName, stats, isPinned, statusKey, sClass, sText }) => {
    const pinIndicatorHtml = isPinned
      ? `<span class="subject-pin-indicator" title="Pinned to top">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#ef4444" stroke="#b91c1c" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 17v5"/>
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/>
          </svg>
        </span>`
      : '';

    const el = document.createElement("div");

    if (viewMode === "compact") {
      const monoCode = subName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 2).toUpperCase() || "GS";
      const monoStatusCls = statusKey === "mastered" ? "st-mastered" : (statusKey === "progress" ? "st-progress" : "");
      el.className = `subject-compact-row ${isPinned ? 'is-pinned-subject' : ''}`;
      el.innerHTML = `
        <span class="compact-sub-monogram ${monoStatusCls}">${monoCode}</span>
        <div class="compact-sub-left">
          <div class="compact-sub-title-row">
            ${pinIndicatorHtml}
            <span class="compact-sub-name" title="${subName}">${subName}</span>
          </div>
          <div class="compact-sub-track">
            <div class="compact-sub-attempted" style="width: ${stats.attemptedPct}%;"></div>
            <div class="compact-sub-fill" style="width: ${stats.progPct}%;"></div>
          </div>
        </div>
        <div class="compact-sub-right">
          <span class="compact-sets-pill ${sClass}" title="Attempted Sets">${stats.attemptedSets}/${stats.totalSets}</span>
          <span class="compact-mast-tag ${stats.masteredCount === 0 ? 'is-zero' : ''}" title="Mastered Sets">🏆${stats.masteredCount}</span>
          <span class="compact-acc-tag" title="Avg Accuracy">${stats.avgAcc > 0 ? stats.avgAcc + '%' : '--'}</span>
          <button type="button" class="btn-three-dots btn-subject-dots" onclick="openSubjectActionMenu(event, '${subName.replace(/'/g, "\\'")}')" title="Subject Options">${threeDotsSvg}</button>
        </div>
      `;
    } else {
      el.className = `subject-mastery-tile ${isPinned ? 'is-pinned-subject' : ''}`;
      el.innerHTML = `
        <div class="tile-top-row">
          <div class="tile-title-group">
            ${pinIndicatorHtml}
            <span class="tile-subject-title" title="${subName}">${subName}</span>
          </div>
          <div class="tile-top-actions">
            <span class="tile-status-pill ${sClass}">${sText}</span>
            <button type="button" class="btn-three-dots btn-subject-dots" onclick="openSubjectActionMenu(event, '${subName.replace(/'/g, "\\'")}')" title="Subject Options">${threeDotsSvg}</button>
          </div>
        </div>
        <div class="tile-progress-container">
          <div class="tile-progress-labels">
            <span>Attempted ${stats.attemptedPct}%</span>
            <span style="color:var(--success-dark);">Mastered ${stats.progPct}%</span>
          </div>
          <div class="tile-progress-track">
            <div class="tile-progress-attempted" style="width: ${stats.attemptedPct}%;"></div>
            <div class="tile-progress-fill" style="width: ${stats.progPct}%;"></div>
          </div>
        </div>
        <div class="tile-metrics-grid">
          <div class="tile-metric-item"><span class="tile-metric-label">Attempted</span><span class="tile-metric-value" style="color:var(--tcs-blue-accent);">${stats.attemptedSets} <small style="font-size:10px; color:var(--text-muted);">/${stats.totalSets}</small></span></div>
          <div class="tile-metric-item"><span class="tile-metric-label">Mastered</span><span class="tile-metric-value" style="color:var(--success-dark);">${stats.masteredCount} Sets</span></div>
          <div class="tile-metric-item"><span class="tile-metric-label">Accuracy</span><span class="tile-metric-value">${stats.avgAcc > 0 ? stats.avgAcc + '%' : '--'}</span></div>
        </div>
        <div class="mobile-bento-stats-row">
          <div class="bento-stat-group">
            <span>✓ ${stats.attemptedSets}/${stats.totalSets}</span>
            <span class="bento-mast-chip ${stats.masteredCount === 0 ? 'is-zero' : ''}">🏆${stats.masteredCount}</span>
          </div>
          <span class="bento-acc-val">${stats.avgAcc > 0 ? stats.avgAcc + '%' : '--'}</span>
        </div>
        <div class="tile-action-footer"><span style="color:var(--text-muted); font-size:11px; font-weight:600;">${stats.totalAtt} Attempts Logged</span><span>Explore Sets ➔</span></div>
      `;
    }

    el.onclick = (e) => {
      if (e.target.closest('.btn-subject-dots')) return;
      el.classList.add("tile-touch-active");
      setTimeout(() => {
        el.classList.remove("tile-touch-active");
        drillDownToSubject(subName);
      }, 35);
    };

    container.appendChild(el);
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
    if (inp) { inp.value = ""; if (document.getElementById("setsExplorerStage")?.style.display === "block") renderTopicSets(); } 
  }
};

function scrollLibraryViewportTop() {
  const vp = document.querySelector("#viewLibrary .catalog-viewport");
  if (vp) vp.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "instant" });
}

window.handleLibFolderRowClick = function(el) {
  const encoded = el?.getAttribute("data-topic-enc");
  if (!encoded) return;
  const topicKey = decodeURIComponent(encoded);
  if (el.hasAttribute("data-from-search")) {
    toggleMastheadSearch(false);
  }
  selectLibTopic(topicKey);
};

window.selectLibTopic = function(topicKey) {
  if (activeLibTopicKey !== topicKey) {
    libStageFilter = "all";
    libStageSort = "default";
    libTopicSearchQuery = "";
    isLibTopicSearchOpen = false;
  }
  activeLibTopicKey = topicKey;
  if (window.innerWidth <= 768) {
    openMobileLibTopicStage(topicKey, true);
  } else {
    renderTopicSets();
  }
};

window.openMobileLibTopicStage = function(topicKey, pushHistory = true) {
  if (activeLibTopicKey !== topicKey) {
    libStageFilter = "all";
    libStageSort = "default";
    libTopicSearchQuery = "";
    isLibTopicSearchOpen = false;
  }
  activeLibTopicKey = topicKey;
  isMobileLibTopicOpen = true;
  document.body.classList.add("mobile-lib-topic-active");
  renderTopicSets();
  scrollLibraryViewportTop();
  if (pushHistory) {
    history.pushState({ page: "lib-topic", view: "viewLibrary", subView: "setsExplorer", subject: activeSubject, topic: topicKey }, "", "#topic_" + encodeURIComponent(topicKey));
  }
};

window.closeMobileLibTopicStage = function(fromPopState = false) {
  if (!fromPopState && history.state?.page === "lib-topic") {
    return history.back();
  }
  isMobileLibTopicOpen = false;
  libTopicSearchQuery = "";
  isLibTopicSearchOpen = false;
  document.body.classList.remove("mobile-lib-topic-active");
  renderTopicSets();
  scrollLibraryViewportTop();
};

window.setLibStageFilter = function(filterKey) {
  libStageFilter = filterKey || "all";
  renderTopicSets();
};

window.toggleLibTopicSearch = function(openState) {
  isLibTopicSearchOpen = typeof openState === "boolean" ? openState : !isLibTopicSearchOpen;
  if (!isLibTopicSearchOpen) libTopicSearchQuery = "";
  const wrap = document.getElementById("ytLibTopicSearchWrap");
  const triggerBtn = document.getElementById("btnYtLibTopicSearchOpen");
  const inp = document.getElementById("ytLibTopicSearchInput");
  if (wrap) wrap.classList.toggle("open", isLibTopicSearchOpen);
  if (triggerBtn) triggerBtn.style.display = isLibTopicSearchOpen ? "none" : "inline-flex";
  if (isLibTopicSearchOpen && inp) {
    inp.value = libTopicSearchQuery;
    setTimeout(() => inp.focus(), 40);
  } else {
    filterLibTopicStageSets("");
  }
};

window.clearDeskLibTopicSearch = function() {
  const deskInp = document.getElementById("ytLibDeskSearchInput");
  if (deskInp) {
    deskInp.value = "";
    deskInp.focus();
  }
  filterLibTopicStageSets("");
};

window.filterLibTopicStageSets = function(rawQuery) {
  libTopicSearchQuery = String(rawQuery || "");
  const q = libTopicSearchQuery.trim().toLowerCase();
  const deskClear = document.getElementById("btnLibDeskSearchClear");
  if (deskClear) deskClear.style.display = q ? "inline-flex" : "none";
  const grid = document.querySelector("#ytLibStage .yt-stage-grid");
  if (!grid) return;

  let visible = 0;
  grid.querySelectorAll(".set-tile").forEach(tile => {
    const title = (tile.querySelector(".set-tile-title")?.innerText || "").toLowerCase();
    const matched = !q || title.includes(q);
    tile.style.display = matched ? "" : "none";
    if (matched) visible++;
  });

  let emptyEl = document.getElementById("ytLibTopicSearchEmpty");
  if (q && visible === 0) {
    if (!emptyEl) {
      emptyEl = document.createElement("div");
      emptyEl.id = "ytLibTopicSearchEmpty";
      emptyEl.style.cssText = "text-align:center; padding:26px 14px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;";
      grid.appendChild(emptyEl);
    }
    emptyEl.innerText = `No sets found matching "${libTopicSearchQuery.trim()}"`;
  } else if (emptyEl) {
    emptyEl.remove();
  }
};

window.startNextInLibTopic = function(topicKey) {
  if (topicKey === "__vault__") {
    return openMissionBriefingModal(-3, false, 0);
  }
  const sets = catalogData.filter(r =>
    (r.subject || "General Studies").trim().toLowerCase() === (activeSubject || "").trim().toLowerCase() &&
    (r.topic || "Core Practice").trim() === topicKey
  ).sort((a, b) => String(a.test_title || "").localeCompare(String(b.test_title || ""), undefined, { numeric: true, sensitivity: "base" }));
  if (!sets.length) return;
  const filtered = sets.filter(s => libStageFilter === "all" || getSetScoreMeta(s.test_id).status === libStageFilter);
  const pool = sortStageSetEntries(filtered.length ? filtered : sets, libStageSort, s => s.test_id);
  const nextSet = libStageSort === "default"
    ? (pool.find(s => !getSetScoreMeta(s.test_id).isAtt) || pool[0])
    : pool[0];
  openMissionBriefingModal(nextSet.test_id);
};

function renderLibrarySetRowHtml(setItem) {
  const testId = setItem.test_id;
  const meta = getSetScoreMeta(testId);
  if (!meta.setCat) return "";

  const subj = (meta.setCat.subject || activeSubject || "GEN").trim();
  const subCode = subj.substring(0, 4).toUpperCase();

  let scoreLine = `<span style="color:var(--text-muted);">${meta.duration}m • Untested</span>`;
  if (meta.isAtt && meta.attempts.length > 0) {
    const fmtBest = Number.isInteger(meta.bestScore) ? meta.bestScore : meta.bestScore.toFixed(1);
    scoreLine = `<span style="color:${meta.bestPct >= 100 ? 'var(--success-dark)' : 'var(--warning-dark)'}; font-weight:700;">★ ${fmtBest}/${meta.maxMarks} (${Math.round(meta.bestPct)}%)</span>`;
  }

  if (librarySelectionMode) {
    const inTarget = targetPlaylistForSelection && userPlaylistItems.some(pi => String(pi.playlist_id) === String(targetPlaylistForSelection.id) && String(pi.test_id) === String(testId));
    return `
      <div class="set-tile yt-stage-card is-staging-card" data-test-id="${testId}" data-status="${meta.status}">
        <div class="yt-media-thumb">
          <span class="yt-media-sub-code">${subCode}</span>
          <span class="yt-media-q-pill">${meta.qCount} Qs</span>
        </div>
        <div class="yt-stage-card-body">
          <div class="set-tile-header">
            <div class="set-tile-title-group"><div class="set-tile-title">${meta.title}</div></div>
          </div>
          <div class="set-tile-meta"><span>${clockSvg} ${meta.duration}m</span><span>${docSvg} ${meta.qCount} Qs</span></div>
          <button type="button" class="btn-bookmark-stage ${inTarget ? "saved" : ""}" id="btnStage_${testId}" onclick="toggleDirectStaging(${testId})">
            ${inTarget ? bookmarkFilledSvg : bookmarkOutlineSvg}
            <span class="stage-label">${inTarget ? "Saved to playlist" : "Save to playlist"}</span>
          </button>
        </div>
      </div>
    `;
  }

  const starredPl = userPlaylists.find(p => p.playlist_name === "Starred Sets");
  const isStarred = starredPl && userPlaylistItems.some(pi => pi.playlist_id === starredPl.id && String(pi.test_id) === String(testId));

  return `
    <div class="set-tile yt-stage-card" data-test-id="${testId}" data-status="${meta.status}" onclick="if(!event.target.closest('button')) openMissionBriefingModal(${testId})">
      <div class="yt-media-thumb">
        <span class="yt-media-sub-code">${subCode}</span>
        <span class="yt-media-q-pill">${meta.qCount} Qs</span>
      </div>
      <div class="yt-stage-card-body">
        <div class="set-tile-header">
          <div class="set-tile-title-group"><div class="set-tile-title">${meta.title}</div></div>
          <div style="display:flex; gap:4px; align-items:center; flex-shrink:0;">
            <button type="button" class="btn-star-set ${isStarred ? "starred" : ""}" data-test-id="${testId}" onclick="toggleStarSet(event, ${testId})" title="${isStarred ? "Unstar set" : "Star set"}">${starIconSvg}</button>
            <button type="button" class="btn-three-dots" onclick="openThreeDotsMenu(event, ${testId}, null, null)" title="Options">${threeDotsSvg}</button>
          </div>
        </div>
        <div class="set-tile-meta"><span>${clockSvg} ${meta.duration}m</span><span>${docSvg} ${meta.qCount} Qs</span></div>
        <div class="yt-quiet-footer">
          <div class="set-score-info" style="margin:0;">${scoreLine}</div>
          <span class="yt-quiet-cta">${meta.isAtt ? "Retake →" : "Start →"}</span>
        </div>
      </div>
    </div>
  `;
}

window.drillDownToSubject = function(subName, pushHistory = true) {
  activeSubject = (subName || "General Studies").trim();
  activeLibTopicKey = null;
  activeStarredTopicFilter = "all";
  isMobileLibTopicOpen = false;
  libStageFilter = "all";
  libStageSort = "default";
  libTopicSearchQuery = "";
  isLibTopicSearchOpen = false;
  document.body.classList.remove("mobile-lib-topic-active");

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
    void exp.offsetWidth;
    exp.style.display = "block";
    exp.classList.add("stage-enter-active");
  }

  renderTopicSets();
  scrollLibraryViewportTop();

  if (pushHistory) {
    history.pushState({ page: "sets-explorer", view: "viewLibrary", subView: "setsExplorer", subject: activeSubject }, "", "#subject_" + encodeURIComponent(activeSubject));
  }
};

window.returnToSubjectHub = function(fromPopState = false) {
  if (!fromPopState && history.state?.subView === "setsExplorer") return history.back();

  isMobileLibTopicOpen = false;
  document.body.classList.remove("mobile-lib-topic-active");

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

  scrollLibraryViewportTop();
  if (!fromPopState) {
    history.replaceState({ page: "main-tab", view: "viewLibrary", subView: "hub" }, "", "#viewLibrary");
  }
};

function renderTopicSets() {
  const container = document.getElementById("topicsContainer");
  if (!container) return;

  updateStagingDockUI();

  const subjectSearch = (document.getElementById("topicSearchInput")?.value || "").trim().toLowerCase();
  const filtered = catalogData.filter(r => (r.subject || "General Studies").trim().toLowerCase() === (activeSubject || "").trim().toLowerCase());

  const grouped = {};
  filtered.forEach(item => {
    const k = (item.topic || "Core Practice").trim();
    if (!grouped[k]) grouped[k] = [];
    if (!grouped[k].some(x => String(x.test_id) === String(item.test_id))) {
      grouped[k].push(item);
    }
  });

  const topicEntries = Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" }))
    .map(([topicName, sets]) => {
      sets.sort((a, b) => String(a.test_title || "").trim().localeCompare(String(b.test_title || "").trim(), undefined, { numeric: true, sensitivity: "base" }));
      let masteredCnt = 0, unattCnt = 0, revCnt = 0, totalQs = 0;
      sets.forEach(s => {
        const m = getSetScoreMeta(s.test_id);
        totalQs += m.qCount;
        if (!m.isAtt) unattCnt++;
        else if (m.status === "mastered") masteredCnt++;
        else revCnt++;
      });
      const pct = sets.length > 0 ? Math.round((masteredCnt / sets.length) * 100) : 0;
      return { topicName, sets, masteredCnt, unattCnt, revCnt, totalQs, pct };
    });

  const chevronSvg = `<span class="yt-folder-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>`;

  if (subjectSearch) {
    isMobileLibTopicOpen = false;
    document.body.classList.remove("mobile-lib-topic-active");

    const matchingTopics = topicEntries.filter(t => t.topicName.toLowerCase().includes(subjectSearch));
    const matchingSets = [];
    topicEntries.forEach(t => {
      t.sets.forEach(s => {
        if ((s.test_title || "").toLowerCase().includes(subjectSearch)) {
          matchingSets.push(s);
        }
      });
    });

    const topicsHtml = matchingTopics.map(t => `
      <div class="yt-folder-row ${t.pct >= 100 && t.sets.length > 0 ? "theme-topic-done" : "theme-topic"}" data-topic-enc="${encodeURIComponent(t.topicName)}" data-from-search="1" onclick="handleLibFolderRowClick(this)">
        <div class="yt-thumb-stack">
          <div class="yt-stack-tab-1"></div>
          <div class="yt-stack-tab-2"></div>
          <div class="yt-thumb-cover">
            <span>${t.pct >= 100 && t.sets.length > 0 ? "🏆" : "📁"}</span>
            <span class="yt-thumb-badge">${t.sets.length} sets</span>
          </div>
        </div>
        <div class="yt-folder-info">
          <div class="yt-folder-name">${t.topicName}</div>
          <div class="yt-folder-meta">${t.masteredCnt}/${t.sets.length} Mastered • ${t.pct}%</div>
          <div class="yt-lib-topic-progress"><div class="yt-lib-topic-fill" style="width:${t.pct}%;"></div></div>
        </div>
        ${chevronSvg}
      </div>
    `).join("");

    const setsHtml = matchingSets.map(s => renderLibrarySetRowHtml(s)).join("");

    container.innerHTML = `
      ${matchingTopics.length ? `<div class="yt-lib-search-group"><div class="yt-lib-search-group-title">Matching Sub-Topics (${matchingTopics.length})</div><div class="yt-folder-list">${topicsHtml}</div></div>` : ""}
      ${matchingSets.length ? `<div class="yt-lib-search-group"><div class="yt-lib-search-group-title">Matching Question Sets (${matchingSets.length})</div><div class="sets-card-grid">${setsHtml}</div></div>` : ""}
      ${(!matchingTopics.length && !matchingSets.length) ? `<div style="text-align:center; padding:36px 16px; color:var(--text-muted); font-size:13px; font-weight:600;">No sub-topics or sets found matching "${subjectSearch}"</div>` : ""}
    `;
    return;
  }

  const tel = !librarySelectionMode ? getSubjectMistakeTelemetry(activeSubject) : { inReviewCount: 0, clearedCount: 0, dueCount: 0 };
  const hasVault = !librarySelectionMode && (tel.inReviewCount > 0 || tel.clearedCount > 0);
  const starTel = !librarySelectionMode ? getStarredTelemetry(activeSubject, activeStarredTopicFilter) : { totalCount: 0, filteredCount: 0, topicCounts: [] };
  const hasStarredVault = !librarySelectionMode && starTel.totalCount > 0;
  const validKeys = [
    ...(hasVault ? ["__vault__"] : []),
    ...(hasStarredVault ? ["__starred__"] : []),
    ...topicEntries.map(t => t.topicName)
  ];

  if (!validKeys.includes(activeLibTopicKey)) {
    activeLibTopicKey = hasVault ? "__vault__" : (hasStarredVault ? "__starred__" : (topicEntries[0]?.topicName || null));
  }

  let vaultRowHtml = "";
  if (hasVault) {
    const isClean = tel.dueCount === 0;
    const isActive = activeLibTopicKey === "__vault__";
    const totalChunks = Math.ceil(tel.dueCount / 25);
    const metaText = isClean
      ? `0 Due • ${tel.clearedCount} Mastered`
      : `⚠️ ${tel.dueCount} Due (${totalChunks} ${totalChunks > 1 ? "Sets" : "Set"})`;
    vaultRowHtml = `
      <div class="yt-folder-row theme-vault vault-folder-row ${isClean ? "is-clean" : ""} ${isActive ? "active-yt-playlist" : ""}" data-topic-enc="__vault__" onclick="handleLibFolderRowClick(this)">
        <div class="yt-thumb-stack">
          <div class="yt-stack-tab-1"></div>
          <div class="yt-stack-tab-2"></div>
          <div class="yt-thumb-cover">
            <span>🛡️</span>
            <span class="yt-thumb-badge">${isClean ? "CLEAR" : `${tel.dueCount} DUE`}</span>
          </div>
        </div>
        <div class="yt-folder-info">
          <div class="yt-folder-name">${activeSubject} Mistake Vault</div>
          <div class="yt-folder-meta">${metaText}</div>
        </div>
        ${chevronSvg}
      </div>
    `;
  }

  let starredVaultRowHtml = "";
  if (hasStarredVault) {
    const isActive = activeLibTopicKey === "__starred__";
    const totalStarChunks = Math.max(1, Math.ceil(starTel.totalCount / 25));
    starredVaultRowHtml = `
      <div class="yt-folder-row theme-starred starred-folder-row ${isActive ? "active-yt-playlist" : ""}" data-topic-enc="__starred__" onclick="handleLibFolderRowClick(this)">
        <div class="yt-thumb-stack">
          <div class="yt-stack-tab-1"></div>
          <div class="yt-stack-tab-2"></div>
          <div class="yt-thumb-cover">
            <span>⭐</span>
            <span class="yt-thumb-badge">${starTel.totalCount} Qs</span>
          </div>
        </div>
        <div class="yt-folder-info">
          <div class="yt-folder-name">${activeSubject} Starred Vault</div>
          <div class="yt-folder-meta">${starTel.totalCount} Starred (${totalStarChunks} ${totalStarChunks > 1 ? "Sets" : "Set"})</div>
        </div>
        ${chevronSvg}
      </div>
    `;
  }

  const topicRowsHtml = topicEntries.map(t => {
    const isDone = t.sets.length > 0 && t.pct >= 100;
    const isActive = activeLibTopicKey === t.topicName;
    const topicStarCnt = starTel.topicCounts.find(tc => tc.topic.toLowerCase() === t.topicName.toLowerCase())?.count || 0;
    const starMetaTag = topicStarCnt > 0 ? ` • ⭐ ${topicStarCnt}` : "";
    return `
      <div class="yt-folder-row ${isDone ? "theme-topic-done" : "theme-topic"} ${isActive ? "active-yt-playlist" : ""}" data-topic-enc="${encodeURIComponent(t.topicName)}" onclick="handleLibFolderRowClick(this)">
        <div class="yt-thumb-stack">
          <div class="yt-stack-tab-1"></div>
          <div class="yt-stack-tab-2"></div>
          <div class="yt-thumb-cover">
            <span>${isDone ? "🏆" : "📁"}</span>
            <span class="yt-thumb-badge">${t.sets.length} ${t.sets.length === 1 ? "set" : "sets"}</span>
          </div>
        </div>
        <div class="yt-folder-info">
          <div class="yt-folder-name">${t.topicName}</div>
          <div class="yt-folder-meta">${t.masteredCnt}/${t.sets.length} Mastered • ${t.pct}%${starMetaTag}</div>
          <div class="yt-lib-topic-progress"><div class="yt-lib-topic-fill" style="width:${t.pct}%;"></div></div>
        </div>
        ${chevronSvg}
      </div>
    `;
  }).join("");

  const searchSvg = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
  const stageTopBarHtml = `
    <div class="yt-stage-topbar">
      <div class="yt-stage-topbar-left">
        <button type="button" class="btn-yt-stage-back" onclick="closeMobileLibTopicStage()" title="Back to Sub-Topics">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
      </div>
      <div class="yt-stage-search-wrap ${isLibTopicSearchOpen ? "open" : ""}" id="ytLibTopicSearchWrap">
        ${searchSvg}
        <input type="text" id="ytLibTopicSearchInput" class="yt-stage-search-input" placeholder="Search sets in this sub-topic..." value="${libTopicSearchQuery.replace(/"/g, "&quot;")}" oninput="filterLibTopicStageSets(this.value)" />
        <button type="button" class="btn-yt-search-clear" onclick="toggleLibTopicSearch(false)" title="Close Search">✕</button>
      </div>
      <div class="yt-stage-topbar-right">
        <button type="button" id="btnYtLibTopicSearchOpen" class="btn-yt-stage-icon" style="display:${isLibTopicSearchOpen ? "none" : "inline-flex"};" onclick="toggleLibTopicSearch(true)" title="Search Sets">${searchSvg}</button>
      </div>
    </div>
  `;

  let stageContentHtml = "";
  if (activeLibTopicKey === "__vault__" && hasVault) {
    const isCaughtUp = tel.dueCount === 0;
    const CHUNK_SIZE = 25;
    const totalChunks = Math.ceil(tel.dueCount / CHUNK_SIZE);
    let chunkTilesHtml = "";
    if (tel.dueCount > 0) {
      const pool = tel.dueMistakes;
      for (let i = 0; i < totalChunks; i++) {
        const startIdx = i * CHUNK_SIZE;
        const chunkQs = pool.slice(startIdx, startIdx + CHUNK_SIZE);
        const chunkQCount = chunkQs.length;
        const chunkDuration = Math.max(3, Math.ceil(chunkQCount * 0.6));
        const setNum = i + 1;
        const setLabel = totalChunks > 1 ? `Mistake Drill - Set ${setNum}` : `Comprehensive Mistake Drill`;
        const rangeStr = totalChunks > 1 ? `(Q.${startIdx + 1}–${startIdx + chunkQCount})` : `(4-Stage Loop)`;
        const chunkFresh = chunkQs.filter(q => (q.mastery_streak || 0) === 0).length;
        const chunkLoop = chunkQCount - chunkFresh;

        chunkTilesHtml += `
          <div class="set-tile vault-set-tile yt-stage-card" data-status="unattempted" onclick="openMissionBriefingModal(-3, false, ${i})">
            <div class="yt-media-thumb" style="border-color:var(--danger-border);">
              <span class="yt-media-sub-code" style="color:var(--danger-dark);">VAULT</span>
              <span class="yt-media-q-pill">${chunkQCount} Qs</span>
            </div>
            <div class="yt-stage-card-body">
              <div class="set-tile-header">
                <div class="set-tile-title-group"><div class="set-tile-title">${setLabel}</div></div>
                <div class="set-status-badge status-progress" style="background:var(--danger-bg-subtle); color:var(--danger-dark); border:1px solid var(--danger-border);">${chunkQCount} Due</div>
              </div>
              <div class="set-tile-meta"><span>${clockSvg} ${chunkDuration}m</span><span>${docSvg} ${chunkQCount} Qs</span><span>${rangeStr}</span></div>
              <div class="yt-quiet-footer">
                <div class="set-score-info" style="margin:0;"><span style="color:var(--danger-dark); font-weight:700;">⚠️ ${chunkFresh} Fresh • ${chunkLoop} In Review</span></div>
                <span class="yt-quiet-cta" style="color:var(--danger-dark);">Drill →</span>
              </div>
            </div>
          </div>
        `;
      }
    }

    stageContentHtml = `
      ${stageTopBarHtml}
      <div class="yt-watchlater-hero hero-vault ${isCaughtUp ? "is-clean" : ""}">
        <div class="yt-stage-hero-left">
          <div class="yt-hero-artwork" style="background:${isCaughtUp ? "linear-gradient(135deg, #14532d, #16a34a)" : "linear-gradient(135deg, #881337, #e11d48)"};">🛡️</div>
          <div class="yt-stage-title-stack">
            <span class="yt-stage-eyebrow">${isCaughtUp ? "ALL CAUGHT UP" : "ERROR QUARANTINE"}</span>
            <h3 class="yt-stage-title">${activeSubject} Mistake Vault</h3>
            <span class="yt-stage-sub">${isCaughtUp ? `0 Due Today • ${tel.clearedCount} Mastered` : `${tel.dueCount} Due Today (${totalChunks} ${totalChunks > 1 ? "Sets" : "Set"})`}</span>
          </div>
        </div>
        ${!isCaughtUp ? `<div class="yt-stage-actions"><button type="button" class="btn-yt-play-all" onclick="startNextInLibTopic('__vault__')">▶ Drill Mistakes</button></div>` : ""}
      </div>
      <div class="vault-status-hud">
        <div class="hud-header">
          <span class="hud-title">Retention Loops</span>
          <span style="font-size:9.5px; font-weight:700; color:var(--text-muted); font-family:var(--font-mono);">LEITNER 4-STAGE</span>
        </div>
        <div class="hud-grid">
          <div class="hud-cell cell-fresh"><div class="hud-label">Streak 0</div><div class="hud-val" style="color:var(--danger-dark);">${tel.freshCount}</div></div>
          <div class="hud-cell cell-loop"><div class="hud-label">Streak 1–3</div><div class="hud-val" style="color:var(--warning-dark);">${tel.loopCount}</div></div>
          <div class="hud-cell cell-cleared"><div class="hud-label">Mastered</div><div class="hud-val" style="color:var(--success-dark);">${tel.clearedCount}</div></div>
        </div>
        <div class="hud-note">🛡️ Clear 4 consecutive spaced intervals to permanently master weak questions into long-term recall.</div>
      </div>
      <div class="yt-stage-grid sets-card-grid">
        ${chunkTilesHtml || `<div style="text-align:center; padding:24px 14px; color:var(--success-dark); font-size:12.5px; font-weight:700; grid-column:1 / -1;">✓ Zero reviews due today! Upcoming spaced intervals will appear automatically.</div>`}
      </div>
    `;
  } else if (activeLibTopicKey === "__starred__" && hasStarredVault) {
    const CHUNK_SIZE = 25;
    const pool = starTel.filteredStarred;
    const totalChunks = Math.max(1, Math.ceil(pool.length / CHUNK_SIZE));
    const safeFilterEsc = activeStarredTopicFilter.replace(/'/g, "\\'");
    let starTilesHtml = "";

    for (let i = 0; i < totalChunks; i++) {
      const startIdx = i * CHUNK_SIZE;
      const chunkQs = pool.slice(startIdx, startIdx + CHUNK_SIZE);
      const qCnt = chunkQs.length;
      const dur = Math.max(3, Math.ceil(qCnt * 0.6));
      const setLabel = totalChunks > 1 ? `Starred Drill - Set ${i + 1}` : `Starred High-Yield Drill`;
      const rangeStr = totalChunks > 1 ? `(Q.${startIdx + 1}–${startIdx + qCnt})` : `(All Starred)`;

      starTilesHtml += `
        <div class="set-tile starred-set-tile yt-stage-card" onclick="openMissionBriefingModal(-4, false, ${i}, '${safeFilterEsc}')">
          <div class="yt-media-thumb" style="border-color:var(--warning-border);">
            <span class="yt-media-sub-code" style="color:var(--warning-dark);">STAR</span>
            <span class="yt-media-q-pill">${qCnt} Qs</span>
          </div>
          <div class="yt-stage-card-body">
            <div class="set-tile-header">
              <div class="set-tile-title-group"><div class="set-tile-title">${setLabel}</div></div>
              <div class="set-status-badge status-progress">⭐ ${qCnt} Qs</div>
            </div>
            <div class="set-tile-meta"><span>${clockSvg} ${dur}m</span><span>${docSvg} ${qCnt} Qs</span><span>${rangeStr}</span></div>
            <div class="yt-quiet-footer">
              <div class="set-score-info" style="margin:0;"><span style="color:var(--warning-dark); font-weight:700;">⭐ ${activeStarredTopicFilter === "all" ? "All Topics" : activeStarredTopicFilter}</span></div>
              <span class="yt-quiet-cta" style="color:var(--warning-dark);">Practice →</span>
            </div>
          </div>
        </div>
      `;
    }

    const topicChipsHtml = starTel.topicCounts.map(tc => {
      const isChipActive = activeStarredTopicFilter.toLowerCase() === tc.topic.toLowerCase();
      return `<button type="button" class="yt-chip ${isChipActive ? "active" : ""}" onclick="setStarredVaultTopicFilter('${tc.topic.replace(/'/g, "\\'")}')">${tc.topic} (${tc.count})</button>`;
    }).join("");

    stageContentHtml = `
      ${stageTopBarHtml}
      <div class="yt-watchlater-hero hero-starred">
        <div class="yt-stage-hero-left">
          <div class="yt-hero-artwork" style="background:linear-gradient(135deg, #92400e, #f59e0b);">⭐</div>
          <div class="yt-stage-title-stack">
            <span class="yt-stage-eyebrow">CURATED BOOKMARKS</span>
            <h3 class="yt-stage-title">${activeSubject} Starred Vault</h3>
            <span class="yt-stage-sub">${starTel.filteredCount} Starred Questions • ${totalChunks} ${totalChunks > 1 ? "Sets" : "Set"}</span>
          </div>
        </div>
        <div class="yt-stage-actions">
          <button type="button" class="btn-yt-play-all" onclick="openMissionBriefingModal(-4, false, 0, '${safeFilterEsc}')">▶ Drill Starred</button>
        </div>
      </div>
      <div class="yt-stage-filter-bar">
        <div class="yt-stage-filter-chips">
          <button type="button" class="yt-chip ${activeStarredTopicFilter === "all" ? "active" : ""}" onclick="setStarredVaultTopicFilter('all')">All (${starTel.totalCount})</button>
          ${topicChipsHtml}
        </div>
      </div>
      <div class="yt-stage-grid sets-card-grid">
        ${starTilesHtml}
      </div>
    `;
  } else {
    const activeTopic = topicEntries.find(t => t.topicName === activeLibTopicKey) || topicEntries[0];
    if (activeTopic) {
      const isDone = activeTopic.sets.length > 0 && activeTopic.pct >= 100;
      const safeName = activeTopic.topicName.replace(/'/g, "\\'");
      const topicStarPool = !librarySelectionMode ? getStarredTelemetry(activeSubject, activeTopic.topicName).filteredStarred : [];
      let topicStarCardHtml = "";
      if (topicStarPool.length > 0) {
        const CHUNK_SIZE = 25;
        const tChunks = Math.max(1, Math.ceil(topicStarPool.length / CHUNK_SIZE));
        for (let i = 0; i < tChunks; i++) {
          const sliceQs = topicStarPool.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          const qCnt = sliceQs.length;
          const dur = Math.max(3, Math.ceil(qCnt * 0.6));
          const cardTitle = tChunks > 1 ? `${activeTopic.topicName} Starred - Set ${i + 1}` : `${activeTopic.topicName} Starred Questions`;
          topicStarCardHtml += `
            <div class="set-tile starred-set-tile yt-stage-card" onclick="openMissionBriefingModal(-5, false, ${i}, '${safeName}')">
              <div class="yt-media-thumb" style="border-color:var(--warning-border);">
                <span class="yt-media-sub-code" style="color:var(--warning-dark);">STAR</span>
                <span class="yt-media-q-pill">${qCnt} Qs</span>
              </div>
              <div class="yt-stage-card-body">
                <div class="set-tile-header">
                  <div class="set-tile-title-group"><div class="set-tile-title">${cardTitle}</div></div>
                  <div class="set-status-badge status-progress">⭐ ${qCnt} Qs</div>
                </div>
                <div class="set-tile-meta"><span>${clockSvg} ${dur}m</span><span>${docSvg} ${qCnt} Qs</span></div>
                <div class="yt-quiet-footer">
                  <div class="set-score-info" style="margin:0;"><span style="color:var(--warning-dark); font-weight:700;">⭐ Topic Bookmarks</span></div>
                  <span class="yt-quiet-cta" style="color:var(--warning-dark);">Drill →</span>
                </div>
              </div>
            </div>
          `;
        }
      }

      const visibleSets = sortStageSetEntries(
        activeTopic.sets.filter(s => libStageFilter === "all" || getSetScoreMeta(s.test_id).status === libStageFilter),
        libStageSort,
        s => s.test_id
      );
      const setsHtml = (topicStarCardHtml || visibleSets.length > 0)
        ? `${topicStarCardHtml}${visibleSets.map(s => renderLibrarySetRowHtml(s)).join("")}`
        : `<div style="text-align:center; padding:28px 16px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;">No sets match this filter.</div>`;

      stageContentHtml = `
        ${stageTopBarHtml}
        <div class="yt-watchlater-hero ${isDone ? "hero-topic-done" : "hero-topic"}">
          <div class="yt-stage-hero-left">
            <div class="yt-hero-artwork" style="background:${isDone ? "linear-gradient(135deg, #14532d, #16a34a)" : "linear-gradient(135deg, #1e3a8a, #2563eb)"};">${isDone ? "🏆" : "📁"}</div>
            <div class="yt-stage-title-stack">
              <span class="yt-stage-eyebrow">${activeSubject.toUpperCase()}</span>
              <h3 class="yt-stage-title">${activeTopic.topicName}</h3>
              <span class="yt-stage-sub">${activeTopic.sets.length} Sets • ${activeTopic.totalQs} Questions</span>
              <div class="yt-hero-telemetry-row">
                <span class="yt-hero-status-pill ${isDone ? "pill-ready" : ""}">${activeTopic.masteredCnt}/${activeTopic.sets.length} Mastered (${activeTopic.pct}%)</span>
                <div class="yt-hero-progress-track"><div class="yt-hero-progress-fill" style="width:${activeTopic.pct}%;"></div></div>
              </div>
            </div>
          </div>
          ${!librarySelectionMode ? `<div class="yt-stage-actions"><button type="button" class="btn-yt-play-all" onclick="startNextInLibTopic('${safeName}')">▶ Start Next</button></div>` : ""}
        </div>
        <div class="yt-stage-filter-bar">
          <div class="yt-stage-filter-chips">
            <button type="button" class="yt-chip btn-yt-sort-pill ${libStageSort !== "default" ? "has-active-sort" : ""}" onclick="openStageSortSheet('library')" title="Sort Sets">${sortArrowsSvg}<span>${getSortPillLabel(libStageSort)}</span></button>
            <button type="button" class="yt-chip ${libStageFilter === "all" ? "active" : ""}" onclick="setLibStageFilter('all')">All (${activeTopic.sets.length})</button>
            <button type="button" class="yt-chip ${libStageFilter === "unattempted" ? "active" : ""}" onclick="setLibStageFilter('unattempted')">Unattempted (${activeTopic.unattCnt})</button>
            <button type="button" class="yt-chip ${libStageFilter === "revise" ? "active" : ""}" onclick="setLibStageFilter('revise')">Revise (${activeTopic.revCnt})</button>
            <button type="button" class="yt-chip ${libStageFilter === "mastered" ? "active" : ""}" onclick="setLibStageFilter('mastered')">Mastered (${activeTopic.masteredCnt})</button>
          </div>
          <div class="yt-filter-search-pill">
            ${searchSvg}
            <input type="text" id="ytLibDeskSearchInput" class="yt-filter-search-input" placeholder="Search sets..." value="${libTopicSearchQuery.replace(/"/g, "&quot;")}" oninput="filterLibTopicStageSets(this.value)" />
            <button type="button" class="btn-yt-filter-clear" id="btnLibDeskSearchClear" style="display:${libTopicSearchQuery ? "inline-flex" : "none"};" onclick="clearDeskLibTopicSearch()" title="Clear Search">✕</button>
          </div>
        </div>
        <div class="yt-stage-grid sets-card-grid">
          ${setsHtml}
        </div>
      `;
    }
  }

  const isMobileTopicNow = isMobileLibTopicOpen && window.innerWidth <= 768;
  document.body.classList.toggle("mobile-lib-topic-active", isMobileTopicNow);

  container.innerHTML = `
    <div class="yt-lib-deck ${isMobileTopicNow ? "mobile-topic-open" : ""}">
      <aside class="yt-lib-rail">
        <div class="yt-lib-rail-meta">
          <span>Sub-Topics (${topicEntries.length})</span>
          <span>${filtered.length} Sets</span>
        </div>
        <div class="yt-folder-list">
          ${vaultRowHtml}
          ${starredVaultRowHtml}
          ${topicRowsHtml}
        </div>
      </aside>
      <section class="yt-playlist-stage" id="ytLibStage">
        ${stageContentHtml}
      </section>
    </div>
  `;

  if (libTopicSearchQuery) filterLibTopicStageSets(libTopicSearchQuery);
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
  const isCaughtUp = (telemetry.dueCount === 0);
  const fullList = (mode === 'exam' || !isCaughtUp) ? telemetry.dueMistakes : telemetry.allMistakes;

  // 🚀 25-Question Chunk Partitioning
  const CHUNK_SIZE = 25;
  const totalChunks = Math.max(1, Math.ceil(fullList.length / CHUNK_SIZE));
  const safeChunkIdx = Math.min(activeMistakeChunkIndex, totalChunks - 1);
  const targetList = fullList.slice(safeChunkIdx * CHUNK_SIZE, (safeChunkIdx + 1) * CHUNK_SIZE);
  const setNum = safeChunkIdx + 1;
  const setSuffix = totalChunks > 1 ? ` - Set ${setNum}` : "";

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
      title: `${activeSubject} Mistake Exam${setSuffix}`,
      subject: activeSubject,
      total_duration_minutes: Math.max(3, Math.ceil(qCount * 0.6))
    }, qList, 'Weak Area Clearance');
  } else {
    currentPracticeContext = { type: 'mistake_bank', forceAll: true };
    practiceQuestions = qList;

    const tEl = document.getElementById("practiceSetTitle");
    const subEl = document.getElementById("practiceMetaSub");
    const mbTitle = `${activeSubject} Mistake Bank${setSuffix}`;

    if (tEl) {
      tEl.innerText = mbTitle;
      tEl.title = mbTitle;
    }
    if (subEl) {
      subEl.innerText = `${activeSubject} • ${qCount} Questions (Set ${setNum} of ${totalChunks})`;
    }

    switchView("viewPractice", true);
    window.setPracticeMode(mode);
  }
};

window.launchStarredBankMode = async function(mode = "read", isTopicScoped = false) {
  const starTel = getStarredTelemetry(activeSubject, activeStarredTopicFilter);
  const pool = starTel.filteredStarred;
  if (!pool.length) {
    return showAppNoticeModal("No Starred Questions", "Empty Starred Deck", "Tap ☆ on any question while studying to add it here.", "⭐", "Dismiss");
  }

  const CHUNK_SIZE = 25;
  const totalChunks = Math.max(1, Math.ceil(pool.length / CHUNK_SIZE));
  const safeChunkIdx = Math.min(activeStarredChunkIndex, totalChunks - 1);
  const targetMetaList = pool.slice(safeChunkIdx * CHUNK_SIZE, (safeChunkIdx + 1) * CHUNK_SIZE);
  const setNum = safeChunkIdx + 1;
  const scopeLabel = isTopicScoped ? activeStarredTopicFilter : (activeStarredTopicFilter !== "all" ? activeStarredTopicFilter : activeSubject);
  const deckTitle = totalChunks > 1 ? `${scopeLabel} Starred - Set ${setNum}` : `${scopeLabel} Starred Questions`;
  const virtualTestId = isTopicScoped ? -5 : -4;

  const missingIds = targetMetaList.map(m => String(m.question_id)).filter(id => !_questionHydrationCache.has(id));
  if (missingIds.length > 0) {
    const { data: freshRows, error } = await supabaseClient
      .from("questions")
      .select("id, content, options, correct_answer, explanation")
      .in("id", missingIds);
    if (error) {
      return showAppNoticeModal("Sync Error", "Could Not Load Starred Questions", error.message, "⚠️", "Dismiss");
    }
    (freshRows || []).forEach(row => _questionHydrationCache.set(String(row.id), row));
  }

  let qList = targetMetaList.map((meta, i) => {
    const qData = _questionHydrationCache.get(String(meta.question_id));
    if (!qData) return null;
    const opts = parseQuestionOptions(qData.options);
    return {
      qNum: i + 1,
      id: String(qData.id),
      subject: meta.subject || activeSubject,
      topic: meta.topic || activeStarredTopicFilter,
      testId: meta.test_id || "",
      testTitle: meta.test_title || "",
      content: qData.content,
      options: opts,
      correctAnswer: getNormalizedCorrectAnswerId(qData.correct_answer, opts),
      explanation: qData.explanation
    };
  }).filter(Boolean);

  if (!qList.length) {
    return showAppNoticeModal("Notice", "Questions Unavailable", "These starred questions were removed or updated in the master bank.", "⚠️", "Dismiss");
  }

  if (isShuffleEnabled) {
    qList = shuffleArray(qList);
    qList.forEach((q, idx) => { q.qNum = idx + 1; });
  }

  const qCount = qList.length;
  if (mode === "exam") {
    mountExamSession({
      id: virtualTestId,
      title: deckTitle,
      subject: activeSubject,
      topic: isTopicScoped ? activeStarredTopicFilter : "",
      total_duration_minutes: Math.max(3, Math.ceil(qCount * 0.6))
    }, qList, "Starred Revision");
  } else {
    currentPracticeContext = { type: "starred_bank", isTopicScoped };
    practiceQuestions = qList;
    const tEl = document.getElementById("practiceSetTitle");
    const subEl = document.getElementById("practiceMetaSub");
    if (tEl) { tEl.innerText = deckTitle; tEl.title = deckTitle; }
    if (subEl) { subEl.innerText = `${activeSubject} • ${qCount} Starred (Set ${setNum} of ${totalChunks})`; }
    switchView("viewPractice", true);
    window.setPracticeMode(mode);
  }
};

// 🚀 UNIFIED QUESTION SET LOADER (SHARED BY EXAM & PRACTICE ENGINES)
async function fetchTestQuestionsPayload(testId) {
  const setCat = catalogMap.get(String(testId)) || catalogData.find(c => String(c.test_id) === String(testId));
  let tInfo = setCat ? { id: testId, title: setCat.test_title, total_duration_minutes: setCat.total_duration_minutes } : null;
  if (!tInfo) {
    const { data: fetchedTest, error: tErr } = await supabaseClient.from("tests").select("id, title, total_duration_minutes").eq("id", testId).maybeSingle();
    if (tErr || !fetchedTest) throw new Error("Test details missing.");
    tInfo = fetchedTest;
  }

  const testSubject = (setCat?.subject || activeSubject || "General Studies").trim();
  const testTopic = (setCat?.topic || "").trim();
  const { data: sections, error: sErr } = await supabaseClient.from("test_sections").select("id, section_name").eq("test_id", testId).limit(1);
  if (sErr || !sections?.length) throw new Error("Sections not configured.");

  const { data: qData, error: qErr } = await supabaseClient
    .from("test_section_questions")
    .select(`question_number, questions (id, content, options, correct_answer, explanation)`)
    .eq("section_id", sections[0].id)
    .order("question_number", { ascending: true });
  if (qErr || !qData?.length) throw new Error("Questions payload empty.");

  let questions = qData.map(item => {
    const q = Array.isArray(item.questions) ? item.questions[0] : item.questions;
    if (!q) return null;
    const opts = parseQuestionOptions(q.options);
    return {
      qNum: item.question_number,
      id: q.id,
      subject: testSubject,
      topic: testTopic,
      testId: testId,
      testTitle: tInfo.title || "",
      content: q.content,
      options: opts,
      correctAnswer: getNormalizedCorrectAnswerId(q.correct_answer, opts),
      explanation: q.explanation
    };
  }).filter(Boolean);

  if (isShuffleEnabled) {
    questions = shuffleArray(questions);
    questions.forEach((q, idx) => { q.qNum = idx + 1; });
  }

  return { testInfo: tInfo, subject: testSubject, topic: testTopic, sectionName: sections[0].section_name || "General", questions };
}

window.launchAssessment = async function(testId) {
  recordSetHistory(testId, "exam");
  isExamFinished = false;
  switchView("viewExam", true);
  const pLine = document.getElementById("examProgressLine"), cBox = document.getElementById("questionContent"), rEl = document.getElementById("examCandidateRoll");
  if (pLine) pLine.style.width = "0%";
  if (cBox) cBox.innerText = "Configuring assessment runtime...";
  if (rEl) rEl.innerText = currentCandidate?.roll_number || "---";

  try {
    const payload = await fetchTestQuestionsPayload(testId);
    mountExamSession({
      id: payload.testInfo.id,
      title: payload.testInfo.title || "Assessment",
      subject: payload.subject,
      topic: payload.topic,
      total_duration_minutes: payload.testInfo.total_duration_minutes || 15
    }, payload.questions, payload.sectionName);
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
  if (activeTest?.id === -6 && q.subject) {
    const bc = document.getElementById("subjectLabelBreadcrumb");
    if (bc) bc.innerText = q.subject;
    if (activeTest.sections && activeTest.sections.length > 1) {
      const tabs = document.querySelectorAll("#sectionTabs .section-tab");
      tabs.forEach((tab, sIdx) => {
        const sec = activeTest.sections[sIdx];
        const isCurrent = sec && index >= sec.startIndex && index < (sec.startIndex + sec.count);
        tab.classList.toggle("active-section-tab", Boolean(isCurrent));
      });
    }
  }
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
  isExamFinished = true;
  let correct = 0, incorrect = 0, unattempted = 0, statsPayload = [];
  testQuestions.forEach((q, idx) => {
    const uAns = userResponses[idx]?.selected, st = userResponses[idx]?.status;
    const qSubj = q.subject || activeTest?.subject || activeSubject || "General Studies";

    if (!uAns) { 
      unattempted++; 
      // ⏭️ Skipped सवालों को Mistake Bank में नहीं भेजेंगे (Zero Flood & Streak Safe)
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
  rebuildDataIndexes();

  const isSun = isSunday();
  const isCrucible = (activeTest.id === -1);
  const isRegular = (activeTest.id > 0 || activeTest.id === -6);

  let hit = false;
  let shouldIncrementStreak = false;
  let requiredSundayAttempts = 0;

  // 🚀 0ms SYNCHRONOUS UNIQUE TELEMETRY UPDATE
  if (activeTest.id > 0 || activeTest.id === -6 || (activeTest.id === -1 && isSun)) {
    const todayStr = getLocalDateString();
    const prevAttemptsOfThisSetToday = userAttemptHistory.filter(a => 
      String(a.test_id) === String(activeTest.id) && 
      getAttemptLocalDate(a.attempt_date) === todayStr
    );
    const isRetakeToday = activeTest.id > 0 && prevAttemptsOfThisSetToday.length > 1;

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

  _activeScoreSyncPromise = (async () => {
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

      if (activeTest.id > 0 || activeTest.id === -6 || (activeTest.id === -1 && isSun)) {
        if (shouldIncrementStreak) {
          if (isSun) {
            showAppNoticeModal(
              "Sunday Crucible",
              "Crucible Milestone Met! 👑",
              `Sunday Crucible completed (${actuallyAttemptedThisExam}/${testQuestions.length} Qs attempted • Min target was ${requiredSundayAttempts}). Streak +1 secured!`,
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

      if (activeTest.id !== -4 && activeTest.id !== -5 && statsPayload.length) await syncMistakeBank(statsPayload);
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

  // 1. 0ms पर तुरंत डैशबोर्ड / खोली हुई प्लेलिस्ट पर लौटें
  updateHeaderBadges();
  renderRecentHistoryShelf();
  renderHomePlaylists(); 
  renderSubjectHubGrid();
  if (activeSubject) renderTopicSets(); 
  if (isMobilePlaylistStageOpen && window.innerWidth <= 768 && activeDashboardPlaylistId) {
    renderViewDOM('viewDashboard');
    document.body.classList.add("mobile-playlist-active");
    history.replaceState({ page: "playlist-detail", view: "viewDashboard", playlistId: String(activeDashboardPlaylistId) }, "", "#playlist_" + encodeURIComponent(String(activeDashboardPlaylistId)));
  } else {
    switchView('viewDashboard');
  }

  // 2. बैकग्राउंड में फ्रेश डेटा सिंक करें (पहले पेंडिंग स्कोर राइट पूरा होने का इंतज़ार करें)
  (async () => {
    try {
      if (_activeScoreSyncPromise) {
        await _activeScoreSyncPromise;
        _activeScoreSyncPromise = null;
      }
      await syncAttemptHistory(true);
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
  let markedCount = 0;
  let priorityCount = 0;

  // 1. Calculate Mistakes, Skipped, Marked & Unified Priority Counts (No Double Counting)
  testQuestions.forEach((q, idx) => {
    const resp = userResponses[idx];
    const uAns = resp ? resp.selected : null;
    const isMarked = Boolean(resp && (resp.status === 3 || resp.status === 4));
    const isWrong = Boolean(uAns && !isOptionMatching(uAns, q.correctAnswer));
    const isSkipped = Boolean(!uAns);

    if (isWrong) wrongCount++;
    if (isMarked) markedCount++;
    if (isWrong || isSkipped || isMarked) priorityCount++;
  });

  // 2. Fixed Sub-Header Dock (4 Compact Pills fit smoothly in 1 row)
  let filterToolbar = document.getElementById("solutionsFixedFilterBar");
  if (!filterToolbar) {
    filterToolbar = document.createElement("div");
    filterToolbar.id = "solutionsFixedFilterBar";
    filterToolbar.className = "solutions-filter-strip";
    container.parentNode.insertBefore(filterToolbar, container);
  }

  filterToolbar.innerHTML = `
    <button type="button" class="sol-filter-btn btn-all ${currentSolutionsFilter === 'all' ? 'active' : ''}" onclick="filterSolutionsView('all')">
      <span>All</span>
      <span class="filter-badge">${totalCount}</span>
    </button>
    <button type="button" class="sol-filter-btn btn-priority ${currentSolutionsFilter === 'priority' ? 'active' : ''}" onclick="filterSolutionsView('priority')" title="Mistakes, Skipped & Marked for Review">
      <span>⚡ Priority</span>
      <span class="filter-badge">${priorityCount}</span>
    </button>
    <button type="button" class="sol-filter-btn btn-wrong ${currentSolutionsFilter === 'wrong' ? 'active' : ''}" onclick="filterSolutionsView('wrong')" title="Incorrect Answers Only">
      <span>❌ Mistakes</span>
      <span class="filter-badge">${wrongCount}</span>
    </button>
    <button type="button" class="sol-filter-btn btn-marked ${currentSolutionsFilter === 'marked' ? 'active' : ''}" onclick="filterSolutionsView('marked')" title="Questions Marked for Review">
      <span>🟣 Marked</span>
      <span class="filter-badge">${markedCount}</span>
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
    const isMarked = Boolean(resp && (resp.status === 3 || resp.status === 4));

    if (currentSolutionsFilter === 'wrong' && !isWrong) return;
    if (currentSolutionsFilter === 'marked' && !isMarked) return;
    if (currentSolutionsFilter === 'priority' && !(isWrong || isSkipped || isMarked)) return;

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
    } else if (currentSolutionsFilter === 'marked') {
      emptyNotice.innerHTML = `
        <div style="font-size:32px; margin-bottom:10px;">🟣</div>
        <strong style="color:var(--c-review); font-size:15px; display:block;">No Marked Questions!</strong>
        <p style="margin-top:4px; font-weight:500; font-size:12.5px;">You did not mark any questions for review during this exam.</p>
      `;
    } else if (currentSolutionsFilter === 'priority') {
      emptyNotice.innerHTML = `
        <div style="font-size:32px; margin-bottom:10px;">🏆</div>
        <strong style="color:var(--success-dark); font-size:15px; display:block;">Flawless Execution!</strong>
        <p style="margin-top:4px; font-weight:500; font-size:12.5px;">Zero mistakes, zero skips, and zero doubtful marked questions.</p>
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
        const cat = catalogMap.get(String(a.test_id));
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
  if (bBadge) {
    bBadge.innerText = penaltyBleed > 0 ? `-${formatScore(penaltyBleed)} MARKS LOST` : `0 MARKS LOST`;
    bBadge.classList.toggle("is-zero", penaltyBleed === 0);
  }

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

    // 1. Parallel Database Retrieval (Reuses Deduplicated Attempt Stream)
    const [histDesc, attendanceRes] = await Promise.all([
      syncAttemptHistory(false),
      supabaseClient
        .from("daily_attendance")
        .select("study_date, total_minutes_spent")
        .eq("student_roll", currentCandidate.roll_number)
    ]);

    const atts = [...(histDesc || [])].reverse();
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

      const dStr = getAttemptLocalDate(a.attempt_date);
      if (dStr && (Number(a.test_id) > 0 || Number(a.test_id) === -1 || Number(a.test_id) === -6)) {
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

      const cat = catalogMap.get(String(a.test_id));
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

    const totalQ = nCorr + nIncorr;
    const accVal = totalQ > 0 ? ((nCorr / totalQ) * 100).toFixed(1) : "0.0";
    const avgSpd = totalQ > 0 ? Math.round(totalSecs / totalQ) : 0;
    if (currentCandidate?.roll_number) appStorage.set("cache_accuracy_" + currentCandidate.roll_number, accVal);

    // 5. Attendance & Past 7 Days Mapping
    const attMap = {};
    const past7 = [];
    for (let i = 0; i < 7; i++) { 
      let dt = new Date(); 
      dt.setDate(dt.getDate() - i); 
      past7.push(getLocalDateString(dt)); 
    }
    attnd.forEach(r => { 
      attMap[r.study_date] = r.total_minutes_spent || 0; 
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

window.launchPracticeMode = async function(testId, mode, focusQuestionId = null) {
  pendingVerifyQuestionId = focusQuestionId ? String(focusQuestionId) : null;
  recordSetHistory(testId, mode);
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
    const payload = await fetchTestQuestionsPayload(testId);
    practiceQuestions = payload.questions;

    const setTitle = payload.testInfo.title || "Practice Set";
    if (tEl) {
      tEl.innerText = setTitle;
      tEl.title = setTitle;
    }
    if (subEl) {
      subEl.innerText = `${payload.subject} • ${practiceQuestions.length} Questions`;
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
  const stCount = practiceQuestions.filter(q => isQuestionStarred(q.id)).length;

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
  const frag = document.createDocumentFragment();
  practiceQuestions.forEach((q, idx) => {
    if (localReadState.filter === 'starred' && !isQuestionStarred(q.id)) return;
    renderedCount++;
    frag.appendChild(buildQuestionCardDOM(q, idx, 'read', localReadState, false));
  });
  container.appendChild(frag);

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

  if (pendingVerifyQuestionId) {
    const targetQid = pendingVerifyQuestionId;
    pendingVerifyQuestionId = null;
    requestAnimationFrame(() => {
      const targetCard = container.querySelector(`.btn-flag-q[data-flag-qid="${targetQid}"]`)?.closest(".solution-card");
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
        targetCard.classList.add("verify-target-highlight");
        setTimeout(() => targetCard.classList.remove("verify-target-highlight"), 2200);
      }
    });
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
    const stCount = practiceQuestions.filter(q => isQuestionStarred(q.id)).length;

    let priorityCount = 0;
    practiceQuestions.forEach((q, idx) => {
      const isAns = localQuizState.answers[idx] !== undefined;
      const isWr = isAns && !localQuizState.answers[idx].isCorrect;
      const isSt = isQuestionStarred(q.id);
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

  const quizFrag = document.createDocumentFragment();
  practiceQuestions.forEach((q, idx) => {
    const isAns = localQuizState.answers[idx] !== undefined;
    const isWr = isAns && !localQuizState.answers[idx].isCorrect;
    const isSt = isQuestionStarred(q.id);
    const isUnatt = !isAns;

    if (localQuizState.isFinished) {
      if (localQuizState.filter === 'wrong' && !isWr) return;
      if (localQuizState.filter === 'starred' && !isSt) return;
      if (localQuizState.filter === 'priority' && !(isWr || isSt || isUnatt)) return;
    }

    // 🚀 USE UNIVERSAL CARD BUILDER
    quizFrag.appendChild(buildQuestionCardDOM(q, idx, 'quiz', localQuizState, isMB));
  });
  container.appendChild(quizFrag);

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

// 🚀 UNIFIED PERSISTENT QUESTION STAR CONTROLLER (ALL 4 MODES + DOUBLE-TAP BURST)
window.toggleQuestionStar = async function(mode, idx, showBurst = false) {
  let q = null;
  if (mode === "flashcards") q = flashcardDeck[idx];
  else if (mode === "review") q = testQuestions[idx];
  else q = practiceQuestions[idx];

  if (!q || !q.id) return;
  const qIdStr = String(q.id);
  const wasStarred = userStarredQuestionIdSet.has(qIdStr);
  const nowStarred = !wasStarred;

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(12); } catch (e) {}
  }

  // 1. Instant 0ms Local State & Storage Update
  if (nowStarred) {
    userStarredQuestionIdSet.add(qIdStr);
    const meta = resolveQuestionOriginMeta(q, idx);
    const record = {
      student_roll: currentCandidate?.roll_number || "",
      question_id: qIdStr,
      subject: meta.subject,
      topic: meta.topic,
      test_id: meta.test_id,
      test_title: meta.test_title,
      created_at: new Date().toISOString()
    };
    userStarredQuestions = [
      record,
      ...(userStarredQuestions || []).filter(s => String(s.question_id) !== qIdStr)
    ];
  } else {
    userStarredQuestionIdSet.delete(qIdStr);
    userStarredQuestions = (userStarredQuestions || []).filter(s => String(s.question_id) !== qIdStr);
  }

  if (currentCandidate?.roll_number) {
    appStorage.setJSON("cache_starred_questions_" + currentCandidate.roll_number, userStarredQuestions);
  }

  // 2. Sync All Star Buttons & Burst Animation
  document.querySelectorAll(`.btn-star-q[data-star-qid="${qIdStr}"]`).forEach(btn => {
    btn.classList.toggle("starred", nowStarred);
    btn.title = nowStarred ? "Unstar Question" : "Star for Revision";
    btn.classList.remove("star-just-toggled");
    void btn.offsetWidth;
    btn.classList.add("star-just-toggled");
    setTimeout(() => btn.classList.remove("star-just-toggled"), 460);
    btn.blur();
  });

  const card = document.getElementById(`${mode}Card_${idx}`);
  if (card) {
    card.classList.toggle("card-starred", nowStarred);
    if (showBurst) {
      card.querySelector(".star-doubletap-burst")?.remove();
      const burst = document.createElement("div");
      burst.className = `star-doubletap-burst ${nowStarred ? "is-starred" : "is-unstarred"}`;
      burst.innerHTML = starIconSvg;
      card.appendChild(burst);
      setTimeout(() => burst.remove(), 580);
    }
  }

  // 3. Mode-Specific Counter & Live Filter Updates
  const currentSetStarCount = (practiceQuestions || []).filter(item => isQuestionStarred(item.id)).length;
  if (mode === "read") {
    const starBadge = document.getElementById("readStarredBadge");
    if (starBadge) starBadge.innerText = `${currentSetStarCount}`;
    if (localReadState.filter === "starred" && card) {
      card.style.display = nowStarred ? "block" : "none";
    }
  } else if (mode === "quiz" && localQuizState.isFinished) {
    let priorityCount = 0;
    practiceQuestions.forEach((item, i) => {
      const isAns = localQuizState.answers[i] !== undefined;
      const isWr = isAns && !localQuizState.answers[i].isCorrect;
      const isSt = isQuestionStarred(item.id);
      if (isWr || isSt || !isAns) priorityCount++;
    });
    const prioBtn = document.querySelector(".quiz-chip-btn.chip-priority");
    if (prioBtn) prioBtn.innerHTML = `<span>⚡</span> Priority (${priorityCount})`;
    const starBtn = document.querySelector(".quiz-chip-btn.chip-starred");
    if (starBtn) starBtn.innerHTML = `<span>⭐</span> Starred (${currentSetStarCount})`;
    if (localQuizState.filter === "starred" && card) {
      card.style.display = nowStarred ? "block" : "none";
    }
  }

  // Keep Library Starred Vault / Topic Starred cards fresh in background
  if (activeSubject && document.getElementById("setsExplorerStage")?.style.display === "block") {
    renderTopicSets();
  }

  // 4. Background Supabase Persistence
  if (!currentCandidate?.roll_number) {
    showSelectionToast("⚠️ Candidate session not ready");
    return;
  }
  const roll = currentCandidate.roll_number;
  try {
    if (nowStarred) {
      const latest = userStarredQuestions.find(s => String(s.question_id) === qIdStr);
      if (latest) {
        const { error } = await supabaseClient
          .from("starred_questions")
          .upsert({ ...latest, student_roll: roll }, { onConflict: "student_roll,question_id" });
        if (error) throw error;
      }
    } else {
      const { error } = await supabaseClient
        .from("starred_questions")
        .delete()
        .eq("student_roll", roll)
        .eq("question_id", qIdStr);
      if (error) throw error;
    }
  } catch (err) {
    console.error("Starred question cloud sync failed:", err);
    showSelectionToast("⚠️ Sync failed: " + (err.message || "Check Supabase RLS"));
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
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <span class="briefing-badge">QUESTION • Q${q.qNum}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <button type="button" class="btn-flag-q ${isQuestionFlagged(q.id) ? 'flagged' : ''}" data-flag-qid="${q.id}" onclick="event.stopPropagation(); openQuestionFlagSheet('flashcards', 0)" title="Flag Question for Backend Fix">${flagIconSvg}</button>
              <button type="button" class="btn-star-q ${isQuestionStarred(q.id) ? 'starred' : ''}" data-star-qid="${q.id}" onclick="event.stopPropagation(); toggleQuestionStar('flashcards', 0)" title="${isQuestionStarred(q.id) ? 'Unstar Question' : 'Star for Revision'}">${starIconSvg}</button>
              <span style="font-size:11px; font-weight:700; color:var(--text-muted);">Tap to Reveal ↺</span>
            </div>
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


// 🚀 CANONICAL 4-MODE VECTOR GLYPHS (SINGLE SOURCE OF TRUTH ACROSS ENTIRE APP)
const MODE_SVG_PATHS = {
  read: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>`,
  quiz: `<polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>`,
  flashcards: `<rect x="3" y="3" width="14" height="14" rx="2" ry="2"></rect><path d="M21 7v12a2 2 0 0 1-2 2H7"></path>`,
  exam: `<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>`
};

function getModeSvg(modeKey, size = 16) {
  const norm = (modeKey === "flashcard" || modeKey === "flashcards") ? "flashcards" : (MODE_SVG_PATHS[modeKey] ? modeKey : "read");
  const clsMap = { read: "glyph-read", quiz: "glyph-quiz", flashcards: "glyph-fc", exam: "glyph-exam" };
  return `<svg class="mode-glyph ${clsMap[norm]}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${MODE_SVG_PATHS[norm]}</svg>`;
}

const MODE_ICONS = {
  read: getModeSvg("read", 16),
  quiz: getModeSvg("quiz", 16),
  flashcards: getModeSvg("flashcards", 16),
  exam: getModeSvg("exam", 16)
};

function syncCanonicalModeIcons() {
  const mappings = [
    ["#missionBriefingModal .mode-icon-exam", "exam", 19],
    ["#missionBriefingModal .mode-icon-quiz", "quiz", 19],
    ["#missionBriefingModal .mode-icon-flashcard", "flashcards", 19],
    ["#missionBriefingModal .mode-icon-read", "read", 19],
    ["#practiceModeSwitcherSheet .box-read", "read", 18],
    ["#practiceModeSwitcherSheet .box-quiz", "quiz", 18],
    ["#practiceModeSwitcherSheet .box-fc", "flashcards", 18],
    ["#practiceModeSwitcherSheet .box-exam", "exam", 18]
  ];
  mappings.forEach(([sel, key, sz]) => {
    const el = document.querySelector(sel);
    if (el) el.innerHTML = getModeSvg(key, sz);
  });
}

// 🎛️ MICRO-MODE SWITCHER CONTROLLER (AUTO SCROLL-ORB TOGGLE & ACTIVE MODE TINT)
function updatePracticeModeHeader(titleText, modeKey) {
  activePracticeMode = modeKey;
  const iconWrap = document.getElementById("practiceModeIconWrap");
  if (iconWrap) {
    iconWrap.innerHTML = MODE_ICONS[modeKey] || "";
  }
  const btn = document.getElementById("btnPracticeModeSwitcher");
  if (btn) {
    btn.setAttribute("data-mode", modeKey);
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

  // 3. Dispatch & Update History Mode
  if (currentPracticeContext?.type === "test" && currentPracticeContext.id > 0) {
    recordSetHistory(currentPracticeContext.id, targetMode);
  }
  window.setPracticeMode(targetMode);
};


// 🚀 UNIVERSAL QUESTION CARD BUILDER (ZERO-REDUNDANCY & REVIEW-SAFE)
function buildQuestionCardDOM(q, idx, mode, stateObj, isMB = false) {
  const isSt = isQuestionStarred(q.id);
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
    const isMarkedReview = sAns && (sAns.status === 3 || sAns.status === 4);
    const markedPill = isMarkedReview
      ? `<span class="sol-status-badge" style="background:rgba(124, 58, 237, 0.12); color:#6d28d9; border:1px solid rgba(124, 58, 237, 0.3);">🟣 Marked</span>`
      : "";
    badgeHtml = `<span class="sol-status-badge ${sClass}">${sText}</span>${markedPill}`;
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

  const isFlagged = isQuestionFlagged(q.id);
  const flagBtnHtml = `
    <button type="button" class="btn-flag-q ${isFlagged ? 'flagged' : ''}" data-flag-qid="${q.id}" onclick="openQuestionFlagSheet('${mode}', ${idx})" title="${isFlagged ? 'Flagged (Tap to Edit or Remove)' : 'Flag Question for Backend Fix'}">
      ${flagIconSvg}
    </button>
  `;
  const starBtnHtml = `
    <button type="button" class="btn-star-q ${isSt ? 'starred' : ''}" data-star-qid="${q.id}" onclick="toggleQuestionStar('${mode}', ${idx})" title="${isSt ? 'Remove Star' : 'Star for Revision'}">
      ${starIconSvg}
    </button>
  `;
  card.innerHTML = `
    <div class="sol-q-header">
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="sol-q-title">Question ${q.qNum}</span>
        ${badgeHtml}
      </div>
      <div class="sol-q-actions">
        ${flagBtnHtml}
        ${starBtnHtml}
      </div>
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

  // 📱 MOBILE DOUBLE-TAP TO STAR (Read Mode: Full Card | Quiz Mode: Question & Revealed Explanation Only)
  if ((isRead || isQuiz) && window.innerWidth <= 768) {
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    card.addEventListener("touchend", (e) => {
      if (e.touches.length > 0 || e.changedTouches.length !== 1) return;
      if (e.target.closest("button")) return;

      // Quiz Mode में ऑप्शंस वाले एरिया पर डबल-टैप इग्नोर करें
      if (isQuiz && e.target.closest(`#${mode}Opts_${idx}`)) return;

      const touch = e.changedTouches[0];
      const now = Date.now();
      const dt = now - lastTapTime;
      const dx = Math.abs(touch.clientX - lastTapX);
      const dy = Math.abs(touch.clientY - lastTapY);

      if (dt > 0 && dt < 320 && dx < 28 && dy < 28) {
        lastTapTime = 0;
        if (e.cancelable) e.preventDefault();
        window.toggleQuestionStar(mode, idx, true);
      } else {
        lastTapTime = now;
        lastTapX = touch.clientX;
        lastTapY = touch.clientY;
      }
    }, { passive: false });
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
  } else if (currentPracticeContext.type === 'starred_bank') {
    launchStarredBankMode('exam', Boolean(currentPracticeContext.isTopicScoped));
  }
}

// ==========================================================================
// 🚩 BACKEND QUESTION FLAGGING & PROFILE AUDIT QUEUE ENGINE
// ==========================================================================
const FLAG_REASONS = [
  "Wrong Answer Key",
  "Statement / Typo Error",
  "Missing / Broken Options",
  "Delete / Duplicate"
];

function isQuestionStarred(qId) {
  if (!qId) return false;
  return userStarredQuestionIdSet.has(String(qId));
}

function resolveQuestionOriginMeta(q, idx = 0) {
  const resolvedTestId = q.testId || activeTest?.id || (currentPracticeContext?.type === "test" ? currentPracticeContext.id : "");
  const catEntry = resolvedTestId && Number(resolvedTestId) > 0 ? catalogMap.get(String(resolvedTestId)) : null;
  const resolvedSubject = (q.subject || activeTest?.subject || catEntry?.subject || activeSubject || "General Studies").trim();
  const resolvedTopic = (
    q.topic ||
    activeTest?.topic ||
    catEntry?.topic ||
    ((currentPracticeContext?.type === "booster" || Number(resolvedTestId) === -1)
      ? "Mastery Booster"
      : ((currentPracticeContext?.type === "mistake_bank" || Number(resolvedTestId) === -3)
          ? "Mistake Vault"
          : "General Topic"))
  ).trim();
  const resolvedTestTitle = (q.testTitle || activeTest?.title || catEntry?.test_title || document.getElementById("practiceSetTitle")?.innerText || "Practice Set").trim();

  return {
    subject: resolvedSubject,
    topic: resolvedTopic,
    test_id: String(resolvedTestId || ""),
    test_title: resolvedTestTitle,
    question_number: Number(q.qNum) || (idx + 1)
  };
}

async function fetchUserStarredQuestions() {
  if (!currentCandidate?.roll_number) return [];
  const roll = currentCandidate.roll_number;
  userStarredQuestions = appStorage.getJSON("cache_starred_questions_" + roll, userStarredQuestions);
  userStarredQuestionIdSet = new Set((userStarredQuestions || []).map(s => String(s.question_id)));

  try {
    const { data, error } = await supabaseClient
      .from("starred_questions")
      .select("*")
      .eq("student_roll", roll)
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data)) {
      userStarredQuestions = data;
      userStarredQuestionIdSet = new Set(data.map(s => String(s.question_id)));
      appStorage.setJSON("cache_starred_questions_" + roll, userStarredQuestions);
      if (activeSubject && document.getElementById("setsExplorerStage")?.style.display === "block") {
        renderTopicSets();
      }
    }
  } catch (err) {
    console.warn("Starred questions sync skipped:", err.message);
  }
  return userStarredQuestions;
}

function getStarredTelemetry(subName, topicFilter = "all") {
  const subClean = (subName || activeSubject || "").trim().toLowerCase();
  const allSubjectStarred = (userStarredQuestions || []).filter(
    s => (s.subject || "").trim().toLowerCase() === subClean
  );

  const topicMap = new Map();
  allSubjectStarred.forEach(s => {
    const tName = (s.topic || "General Topic").trim();
    topicMap.set(tName, (topicMap.get(tName) || 0) + 1);
  });

  const topicCounts = Array.from(topicMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" }))
    .map(([topic, count]) => ({ topic, count }));

  const filterClean = (topicFilter || "all").trim().toLowerCase();
  const filteredStarred = filterClean === "all"
    ? allSubjectStarred
    : allSubjectStarred.filter(s => (s.topic || "").trim().toLowerCase() === filterClean);

  return {
    allSubjectStarred,
    filteredStarred,
    totalCount: allSubjectStarred.length,
    filteredCount: filteredStarred.length,
    topicCounts
  };
}

window.setStarredVaultTopicFilter = function(topicName) {
  activeStarredTopicFilter = topicName || "all";
  renderTopicSets();
};

function isQuestionFlagged(qId) {
  if (!qId) return false;
  return (userFlaggedQuestions || []).some(f => String(f.question_id) === String(qId));
}

function syncFlagButtonsVisual(qId, flagged) {
  document.querySelectorAll(`.btn-flag-q[data-flag-qid="${qId}"]`).forEach(btn => {
    btn.classList.toggle("flagged", flagged);
    btn.title = flagged ? "Flagged (Tap to Edit or Remove)" : "Flag Question for Backend Fix";
  });
}

async function fetchUserQuestionFlags() {
  if (!currentCandidate?.roll_number) return [];
  const roll = currentCandidate.roll_number;
  userFlaggedQuestions = appStorage.getJSON("cache_question_flags_" + roll, userFlaggedQuestions);
  renderProfileFlaggedQueue();

  try {
    const { data, error } = await supabaseClient
      .from("question_flags")
      .select("*")
      .eq("student_roll", roll)
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data)) {
      userFlaggedQuestions = data;
      appStorage.setJSON("cache_question_flags_" + roll, userFlaggedQuestions);
      renderProfileFlaggedQueue();
    }
  } catch (err) {
    console.warn("Question flags sync skipped:", err.message);
  }
  return userFlaggedQuestions;
}

window.openQuestionFlagSheet = function(mode, idx) {
  let q = null;
  if (mode === "flashcards") q = flashcardDeck[idx];
  else if (mode === "review") q = testQuestions[idx];
  else q = practiceQuestions[idx];

  if (!q || !q.id) return;

  const existing = (userFlaggedQuestions || []).find(f => String(f.question_id) === String(q.id));
  const rawText = getLocalizedText(q.content).replace(/\s+/g, " ").trim();
  const snippet = rawText.length > 115 ? rawText.substring(0, 112) + "..." : rawText;

  const meta = resolveQuestionOriginMeta(q, idx);
  const resolvedSubject = meta.subject;
  const resolvedTopic = meta.topic;
  const resolvedTestId = meta.test_id;
  const resolvedTestTitle = meta.test_title;

  activeFlagTarget = {
    question_id: String(q.id),
    subject: resolvedSubject,
    topic: resolvedTopic,
    test_id: resolvedTestId,
    test_title: resolvedTestTitle,
    question_number: meta.question_number,
    question_preview: snippet,
    reason: existing?.reason || FLAG_REASONS[0],
    note: existing?.note || "",
    isExisting: Boolean(existing)
  };

  let overlay = document.getElementById("questionFlagBottomSheetOverlay");
  let sheet = document.getElementById("questionFlagBottomSheet");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "questionFlagBottomSheetOverlay";
    overlay.className = "drawer-overlay";
    overlay.onclick = closeQuestionFlagSheet;
    document.body.appendChild(overlay);
  }

  if (!sheet) {
    sheet = document.createElement("div");
    sheet.id = "questionFlagBottomSheet";
    sheet.className = "playlist-bottom-sheet";
    document.body.appendChild(sheet);
  }

  sheet.innerHTML = `
    <div class="bottom-sheet-drag-handle" onclick="closeQuestionFlagSheet()"></div>
    <div class="bottom-sheet-header">
      <div class="bottom-sheet-title-group">
        <span class="bottom-sheet-badge" style="color:var(--danger-dark);">BACKEND AUDIT GPS</span>
        <h4 class="bottom-sheet-title">${existing ? "Edit or Remove Flag" : "Flag Question for Fix"}</h4>
      </div>
      <button type="button" class="btn-close-sheet" onclick="closeQuestionFlagSheet()">✕</button>
    </div>
    <div class="flag-sheet-body">
      <div class="flag-gps-preview" title="${resolvedSubject} › ${resolvedTopic} › ${resolvedTestTitle} (Q.${activeFlagTarget.question_number})">
        📍 ${resolvedSubject} › ${resolvedTopic} › ${resolvedTestTitle} • Q.${activeFlagTarget.question_number}
      </div>
      <div class="flag-reasons-grid">
        ${FLAG_REASONS.map(r => `
          <button type="button" class="flag-reason-chip ${activeFlagTarget.reason === r ? "selected" : ""}" onclick="selectFlagReasonChip(this, '${r.replace(/'/g, "\\'")}')">
            <span>🚩</span><span>${r}</span>
          </button>
        `).join("")}
      </div>
      <input type="text" id="inputFlagCustomNote" class="flag-note-input" placeholder="Optional note (e.g. Correct ans is B, or DROP)..." value="${(activeFlagTarget.note || "").replace(/"/g, "&quot;")}" onkeydown="if(event.key==='Enter'){event.preventDefault();submitQuestionFlag();}" />
      <div class="flag-sheet-actions">
        ${existing ? `<button type="button" class="btn-flag-remove" onclick="removeQuestionFlag('${String(q.id)}')">Remove Flag</button>` : ""}
        <button type="button" class="btn-flag-save" onclick="submitQuestionFlag()">${existing ? "Update Flag" : "Save Flag to Profile"}</button>
      </div>
    </div>
  `;

  overlay.style.display = "block";
  overlay.style.pointerEvents = "auto";
  overlay.classList.add("open");
  sheet.style.visibility = "visible";
  requestAnimationFrame(() => {
    sheet.style.bottom = "0";
  });
};

window.selectFlagReasonChip = function(btnEl, reasonText) {
  if (!activeFlagTarget) return;
  activeFlagTarget.reason = reasonText;
  document.querySelectorAll("#questionFlagBottomSheet .flag-reason-chip").forEach(c => c.classList.remove("selected"));
  if (btnEl) btnEl.classList.add("selected");
};

window.closeQuestionFlagSheet = function() {
  const overlay = document.getElementById("questionFlagBottomSheetOverlay");
  const sheet = document.getElementById("questionFlagBottomSheet");
  if (sheet) {
    sheet.style.bottom = "-100%";
    setTimeout(() => {
      if (sheet.style.bottom === "-100%") sheet.style.visibility = "hidden";
    }, 300);
  }
  if (overlay) {
    overlay.classList.remove("open");
    overlay.style.pointerEvents = "none";
    setTimeout(() => {
      if (!overlay.classList.contains("open")) overlay.style.display = "none";
    }, 250);
  }
  activeFlagTarget = null;
};

window.submitQuestionFlag = async function() {
  if (!activeFlagTarget || !currentCandidate?.roll_number) return;
  const roll = currentCandidate.roll_number;
  const noteVal = (document.getElementById("inputFlagCustomNote")?.value || "").trim();

  const record = {
    student_roll: roll,
    question_id: activeFlagTarget.question_id,
    subject: activeFlagTarget.subject,
    topic: activeFlagTarget.topic,
    test_id: activeFlagTarget.test_id,
    test_title: activeFlagTarget.test_title,
    question_number: activeFlagTarget.question_number,
    question_preview: activeFlagTarget.question_preview,
    reason: activeFlagTarget.reason,
    note: noteVal,
    created_at: new Date().toISOString()
  };

  userFlaggedQuestions = [
    record,
    ...(userFlaggedQuestions || []).filter(f => String(f.question_id) !== String(record.question_id))
  ];
  appStorage.setJSON("cache_question_flags_" + roll, userFlaggedQuestions);
  syncFlagButtonsVisual(record.question_id, true);
  renderProfileFlaggedQueue();
  closeQuestionFlagSheet();
  showSelectionToast("🚩 Flagged & saved to Profile Audit Queue");

  try {
    const { error } = await supabaseClient
      .from("question_flags")
      .upsert(record, { onConflict: "student_roll,question_id" });
    if (error) throw error;
  } catch (err) {
    console.error("Flag cloud sync failed:", err);
    showSelectionToast("Saved locally (Cloud sync pending)");
  }
};

window.removeQuestionFlag = async function(questionId) {
  if (!currentCandidate?.roll_number || !questionId) return;
  const roll = currentCandidate.roll_number;
  const qIdStr = String(questionId);

  closeQuestionFlagSheet();
  userFlaggedQuestions = (userFlaggedQuestions || []).filter(f => String(f.question_id) !== qIdStr);
  appStorage.setJSON("cache_question_flags_" + roll, userFlaggedQuestions);
  syncFlagButtonsVisual(qIdStr, false);
  renderProfileFlaggedQueue();
  showSelectionToast("✓ Flag removed");

  try {
    await supabaseClient
      .from("question_flags")
      .delete()
      .eq("student_roll", roll)
      .eq("question_id", qIdStr);
  } catch (err) {
    console.error("Flag delete failed:", err);
  }
};

window.copyFlaggedGpsText = function(questionId) {
  const item = (userFlaggedQuestions || []).find(f => String(f.question_id) === String(questionId));
  if (!item) return;
  const cleanSearchText = String(item.question_preview || "").replace(/\.\.\.$/, "").trim();
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(cleanSearchText).then(() => showSelectionToast("📋 Copied question text for Ctrl+F"));
  }
};

window.copyAllFlaggedQueue = function() {
  if (!userFlaggedQuestions?.length) return;
  const lines = userFlaggedQuestions.map((item, i) =>
    `${i + 1}. ${item.subject} > ${item.topic} > ${item.test_title} (Q.${item.question_number}) | ${item.reason}${item.note ? " (" + item.note + ")" : ""} | ${item.question_preview}`
  ).join("\n");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(lines).then(() => showSelectionToast(`📋 Copied all ${userFlaggedQuestions.length} flagged items`));
  }
};

window.verifyFlaggedQuestion = async function(questionId) {
  const item = (userFlaggedQuestions || []).find(f => String(f.question_id) === String(questionId));
  if (!item) return;

  closeAuditQueueModal();
  const numericTestId = Number(item.test_id);

  if (numericTestId > 0) {
    return launchPracticeMode(numericTestId, "read", item.question_id);
  }

  switchView("viewPractice", true);
  const tEl = document.getElementById("practiceSetTitle");
  const subEl = document.getElementById("practiceMetaSub");
  const container = document.getElementById("practiceContainer");
  if (tEl) tEl.innerText = item.test_title || "Flag Verification";
  if (subEl) subEl.innerText = `${item.subject || "General"} • Live Database Check`;
  if (container) container.innerHTML = `<div style="text-align:center; padding:48px 16px; color:var(--text-muted); font-size:13px; font-weight:700;">Fetching live question from Supabase...</div>`;

  try {
    const { data: row, error } = await supabaseClient
      .from("questions")
      .select("id, content, options, correct_answer, explanation")
      .eq("id", item.question_id)
      .maybeSingle();
    if (error || !row) throw new Error("Question not found in master bank.");

    const opts = parseQuestionOptions(row.options);
    currentPracticeContext = { type: "verify_flag", question_id: String(row.id) };
    practiceQuestions = [{
      qNum: Number(item.question_number) || 1,
      id: String(row.id),
      subject: item.subject || "General Studies",
      topic: item.topic || "",
      testId: item.test_id || "",
      testTitle: item.test_title || "",
      content: row.content,
      options: opts,
      correctAnswer: getNormalizedCorrectAnswerId(row.correct_answer, opts),
      explanation: row.explanation
    }];
    pendingVerifyQuestionId = String(row.id);
    window.setPracticeMode("read");
  } catch (err) {
    if (container) container.innerHTML = `<div style="text-align:center; padding:48px 16px; color:var(--danger-dark); font-size:13px; font-weight:700;">⚠️ ${err.message}</div>`;
  }
};

window.setAuditQueueFilter = function(reasonKey) {
  auditQueueFilter = reasonKey || "all";
  renderAuditQueueModalBody();
};

window.filterAuditQueueSearch = function(queryVal) {
  auditQueueSearchQuery = String(queryVal || "");
  renderAuditQueueModalBody();
};

window.openAuditQueueModal = function() {
  auditQueueFilter = "all";
  auditQueueSearchQuery = "";

  let modal = document.getElementById("auditQueueModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "auditQueueModal";
    modal.className = "tcs-modal-overlay";
    modal.style.zIndex = "3250";
    modal.onclick = (e) => { if (e.target === modal) closeAuditQueueModal(); };
    document.body.appendChild(modal);
  }

  modal.style.setProperty("display", "flex", "important");
  modal.style.pointerEvents = "auto";
  renderAuditQueueModalBody();
};

window.closeAuditQueueModal = function() {
  const modal = document.getElementById("auditQueueModal");
  if (modal) {
    modal.style.setProperty("display", "none", "important");
    modal.style.pointerEvents = "none";
  }
};

function renderAuditQueueModalBody() {
  const modal = document.getElementById("auditQueueModal");
  if (!modal || modal.style.display === "none") return;

  const allList = userFlaggedQuestions || [];
  const q = auditQueueSearchQuery.trim().toLowerCase();
  const filtered = allList.filter(item => {
    const matchesReason = auditQueueFilter === "all" || item.reason === auditQueueFilter;
    const hay = `${item.subject} ${item.topic} ${item.test_title} ${item.question_preview} ${item.note || ""}`.toLowerCase();
    return matchesReason && (!q || hay.includes(q));
  });

  const reasonChipsHtml = FLAG_REASONS.map(r => {
    const cnt = allList.filter(item => item.reason === r).length;
    if (cnt === 0) return "";
    const shortName = r.split("/")[0].trim();
    return `<button type="button" class="yt-chip ${auditQueueFilter === r ? "active" : ""}" onclick="setAuditQueueFilter('${r.replace(/'/g, "\\'")}')">${shortName} (${cnt})</button>`;
  }).join("");

  const listHtml = filtered.length === 0
    ? `<div style="text-align:center; padding:32px 16px; color:var(--text-muted); font-size:12.5px; font-weight:600;">${allList.length === 0 ? "✓ Zero pending flags. All questions clean!" : "No flagged questions match this filter."}</div>`
    : filtered.map(item => `
        <div class="audit-flag-item">
          <div class="audit-flag-top">
            <span class="audit-reason-tag">🚩 ${item.reason}</span>
            <span style="font-family:var(--font-mono); font-size:10px; color:var(--text-muted); font-weight:700;">ID: ${item.question_id}</span>
          </div>
          <div class="audit-gps-path">${item.subject} › ${item.topic} › ${item.test_title} • Q.${item.question_number}</div>
          <div class="audit-q-snippet">${item.question_preview}</div>
          ${item.note ? `<div class="audit-user-note">Note: ${item.note}</div>` : ""}
          <div class="audit-item-actions">
            <button type="button" class="btn-audit-verify" onclick="verifyFlaggedQuestion('${item.question_id}')">↗ Verify</button>
            <button type="button" class="btn-audit-copy" onclick="copyFlaggedGpsText('${item.question_id}')">📋 Copy</button>
            <button type="button" class="btn-audit-resolve" onclick="removeQuestionFlag('${item.question_id}')">✓ Resolved</button>
          </div>
        </div>
      `).join("");

  let sheet = modal.querySelector(".audit-queue-sheet");
  if (!sheet) {
    modal.innerHTML = `<div class="audit-queue-sheet"></div>`;
    sheet = modal.querySelector(".audit-queue-sheet");
  }

  const existingInput = document.getElementById("inputAuditQueueSearch");
  const hadFocus = document.activeElement === existingInput;
  const cursorPos = existingInput ? existingInput.selectionStart : 0;

  sheet.innerHTML = `
    <div class="bottom-sheet-drag-handle hide-on-desktop" onclick="closeAuditQueueModal()"></div>
    <div class="audit-queue-header">
      <div class="audit-title-group">
        <h4 class="audit-card-title">🚩 Backend Audit Queue</h4>
        <span class="audit-count-pill ${allList.length === 0 ? "is-zero" : ""}">${allList.length} OPEN</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${allList.length > 0 ? `<button type="button" class="btn-copy-all-flags" onclick="copyAllFlaggedQueue()">Copy All</button>` : ""}
        <button type="button" class="btn-close-sheet" onclick="closeAuditQueueModal()">✕</button>
      </div>
    </div>
    ${allList.length > 0 ? `
      <div class="audit-queue-controls">
        <input type="text" id="inputAuditQueueSearch" class="audit-search-input" placeholder="Search subject, topic, set or question..." value="${auditQueueSearchQuery.replace(/"/g, "&quot;")}" oninput="filterAuditQueueSearch(this.value)" />
        <div class="audit-filter-chips">
          <button type="button" class="yt-chip ${auditQueueFilter === "all" ? "active" : ""}" onclick="setAuditQueueFilter('all')">All (${allList.length})</button>
          ${reasonChipsHtml}
        </div>
      </div>
    ` : ""}
    <div class="audit-flags-list">${listHtml}</div>
  `;

  if (hadFocus) {
    const newInp = document.getElementById("inputAuditQueueSearch");
    if (newInp) {
      newInp.focus();
      newInp.setSelectionRange(cursorPos, cursorPos);
    }
  }
}

function renderProfileFlaggedQueue() {
  const viewport = document.querySelector("#viewProfile .profile-page-viewport");
  if (!viewport) return;

  let auditCard = document.getElementById("profileFlaggedAuditCard");
  if (!auditCard) {
    auditCard = document.createElement("div");
    auditCard.id = "profileFlaggedAuditCard";
    auditCard.className = "profile-audit-card";
    auditCard.onclick = () => openAuditQueueModal();
    viewport.appendChild(auditCard);
  }

  const list = userFlaggedQuestions || [];
  const count = list.length;

  const topReasons = FLAG_REASONS
    .map(r => ({ label: r.split("/")[0].trim(), cnt: list.filter(item => item.reason === r).length }))
    .filter(x => x.cnt > 0)
    .map(x => `${x.label} (${x.cnt})`)
    .join(" • ");

  const subText = count === 0
    ? "Zero pending flags • Tap 🚩 on any question to report"
    : (topReasons || `${count} flagged items awaiting verification`);

  auditCard.innerHTML = `
    <div class="audit-launcher-row">
      <div class="audit-launcher-left">
        <div class="audit-title-group">
          <h4 class="audit-card-title">🚩 Backend Audit Queue</h4>
          <span class="audit-count-pill ${count === 0 ? "is-zero" : ""}">${count} OPEN</span>
        </div>
        <span class="audit-launcher-sub">${subText}</span>
      </div>
      <button type="button" class="btn-open-audit-queue" onclick="event.stopPropagation(); openAuditQueueModal()">
        ${count > 0 ? "Review ➔" : "Open ➔"}
      </button>
    </div>
  `;

  renderAuditQueueModalBody();
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
