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

// 🚀 SYNCHRONOUS LOCAL CALENDAR DATE HELPER (AVOIDS MIDNIGHT TIMEZONE DRIFT)
function getLocalDateString(d = new Date()) {
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
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

// 👑 SUNDAY REVISION PROTOCOL HELPER (FIX: Missing definition restored)
function isSunday() {
  return new Date().getDay() === 0;
}

const clockSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
const docSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
const bookmarkOutlineSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
const bookmarkFilledSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;

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

// 🔥 STATE FOR QUIZ & READ MODES
let localQuizState = { answers: {}, starred: new Set(), isFinished: false, filter: "all" };
let localReadState = { starred: new Set(), filter: "all" };

window.toggleShuffleSetting = function(val) {
  isShuffleEnabled = !!val;
};

if ("serviceWorker" in navigator) { 
  window.addEventListener("load", () => { 
    navigator.serviceWorker.register("./service-worker.js").catch(err => console.error("SW Error:", err)); 
  }); 
}

function getLocalizedText(obj) {
  if (obj === null || obj === undefined) return "";
  let text = "";
  if (typeof obj === "object") { 
    text = (currentLang === "hi") ? (obj.hi ? obj.hi : (obj.en ? (obj.en + "\n\n*(यह सामग्री अभी हिंदी में उपलब्ध नहीं है)*") : "")) : (obj.en || obj.hi || ""); 
  } else {
    let str = String(obj).trim();
    if (str.startsWith("{") && str.endsWith("}")) { 
      try { 
        let parsed = JSON.parse(str); 
        text = (currentLang === "hi") ? (parsed.hi ? parsed.hi : (parsed.en ? (parsed.en + "\n\n*(यह सामग्री अभी हिंदी में उपलब्ध नहीं है)*") : "")) : (parsed.en || parsed.hi || ""); 
      } catch (e) { 
        text = str; 
      } 
    } else { 
      text = str; 
    }
  }
  return typeof text === "string" ? text.replace(/\\n/g, "\n") : String(text || "");
}

function formatExplanation(exp) {
  if (!exp) return "Yet to add explanation";
  let text = "";
  if (typeof exp === "object" && exp !== null) {
    text = currentLang === "hi" ? (exp.hi || exp.en || "") : (exp.en || exp.hi || "");
  } else {
    let str = String(exp).trim();
    if (str.startsWith("{") && str.endsWith("}")) { 
      try { 
        let parsed = JSON.parse(str); 
        text = currentLang === "hi" ? (parsed.hi || parsed.en || "") : (parsed.en || parsed.hi || ""); 
      } catch (e) { 
        text = str; 
      }
    } else { 
      text = str; 
    }
  }
  text = String(text || "").trim();
  if (!text || text === '{"en":""}' || text === '{"hi":""}' || text === '{"en":"","hi":""}' || text === 'null' || text === 'undefined') {
    return "Yet to add explanation";
  }
  return text.replace(/\\n/g, "\n");
}

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.style.overscrollBehaviorY = 'none'; 
  document.body.style.overscrollBehaviorY = 'none';
  setupAppEvents(); 
  initAuthSessionWatcher(); 
  setupMobileExamGestures();
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

function closeAllOverlaysAndPopups() {
  let closedSomething = false;

  const isVisible = (id) => {
    const el = document.getElementById(id);
    if (!el) return false;
    return el.style.display === 'flex' || el.style.display === 'block' || el.classList.contains('open');
  };

  if (isVisible('threeDotsMenuOverlay')) { closeThreeDotsMenu(); closedSomething = true; }
  if (isVisible('playlistActionMenuOverlay')) { closePlaylistActionMenu(); closedSomething = true; }
  if (isVisible('playlistBottomSheetOverlay')) { closePlaylistBottomSheet(); closedSomething = true; }
  if (isVisible('missionBriefingModal')) { closeMissionBriefingModal(); closedSomething = true; }
  if (isVisible('appNoticeModal')) { closeAppNoticeModal(); closedSomething = true; }
  if (isVisible('createPlaylistModal')) { closeCreatePlaylistModal(); closedSomething = true; }
  if (isVisible('editPlaylistModal')) { closeEditPlaylistModal(); closedSomething = true; }
  if (isVisible('deletePlaylistConfirmModal')) { closeDeletePlaylistModal(); closedSomething = true; }
  if (isVisible('abortExamModal')) { closeAbortExamModal(); closedSomething = true; }
  
  const submitModal = document.getElementById('submitModalContainer');
  if (submitModal && submitModal.style.display === 'flex' && submitModal.innerHTML !== "") { 
    closeExamModal(); 
    closedSomething = true; 
  }

  const exitModal = document.getElementById('exitConfirmModal');
  if (exitModal && exitModal.style.display === 'flex') {
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

  if (librarySelectionMode && viewId !== 'viewLibrary') {
    librarySelectionMode = false;
    targetPlaylistForSelection = null;
    document.body.classList.remove("staging-active");
    const dock = document.getElementById("libraryFloatingDock");
    if (dock) dock.style.display = "none";
    const scroller = document.getElementById("stagingDomainScroller");
    if (scroller) scroller.style.display = "none";
  }

  renderViewDOM(viewId);

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
  // 1. Exit guard: If exit is in progress, bypass popstate interception
  if (typeof isExitingApp !== 'undefined' && isExitingApp) return;

  const exitModal = document.getElementById('exitConfirmModal');
  if (exitModal && exitModal.style.display === 'flex') {
    exitModal.style.display = 'none';
    history.pushState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');
    return;
  }

  const currentActiveView = Array.from(document.querySelectorAll('.view-screen')).find(v => v.style.display === 'flex')?.id;

  // 2. Active Exam Protection
  if (currentActiveView === 'viewExam' && !isExamFinished) { 
    history.pushState({ page: 'sub-view', view: 'viewExam' }, '', '#viewExam'); 
    abortExamSession(); 
    return; 
  }

  // 3. Modals, Drawers & Popups Dismissal
  if (closeAllOverlaysAndPopups()) {
    history.pushState({ 
      page: MAIN_TABS.includes(currentActiveView) ? (currentActiveView === 'viewDashboard' ? 'dashboard' : 'main-tab') : 'sub-view', 
      view: currentActiveView 
    }, '', '#' + currentActiveView);
    return; 
  }

  // 4. Close Masthead Search Bar if open
  const searchBar = document.getElementById("mastheadSearchBar");
  if (searchBar && searchBar.style.display === "flex") { 
    toggleMastheadSearch(false); 
    history.pushState(e.state || { page: 'main-tab', view: 'viewLibrary' }, '', window.location.hash);
    return; 
  }

  // 🚀 5. PRACTICE / SOLUTIONS SE WAPAS AANE PAR SETS EXPLORER RESTORE KARNA
  if (['viewPractice', 'viewSolutions'].includes(currentActiveView)) {
    isExamFinished = true;
    if (e.state && e.state.view) {
      renderViewDOM(e.state.view);
      // Agar pichla view Library tha aur subject active hai, toh wahi sets khol kar rakho
      if (e.state.view === 'viewLibrary' && activeSubject) {
        const hub = document.getElementById("subjectHubStage");
        const exp = document.getElementById("setsExplorerStage");
        if (hub) hub.style.display = "none";
        if (exp) exp.style.display = "block";
      }
      return;
    }
  }

  // 6. Library ke andar agar Sets Explorer khula hai, toh pehle All-Subjects Hub par jao
  if (currentActiveView === 'viewLibrary') {
    const setsExp = document.getElementById("setsExplorerStage");
    if (setsExp && setsExp.style.display === "block") {
      returnToSubjectHub(true);
      return; 
    }
  }

  // 7. Selection Mode cancel sirf All-Subjects Hub par hi hoga
  if (librarySelectionMode) {
    cancelLibrarySelectionMode();
    return; 
  }

  // 8. General History State View Restoration
  if (e.state && e.state.view) {
    renderViewDOM(e.state.view);
    return;
  }

  // 9. Main navigation tabs fallback to Dashboard
  if (['viewLibrary', 'viewAnalytics', 'viewProfile'].includes(currentActiveView)) {
    renderViewDOM('viewDashboard');
    history.replaceState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');
    return; 
  }

  // 10. Root dashboard par exit dialog trigger karna
  if (!e.state || e.state.page === 'exit-gate' || currentActiveView === 'viewDashboard') {
    history.pushState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');
    showExitConfirmModal();
    return;
  }
});

function setupMobileExamGestures() {
  const panel = document.querySelector(".tcs-side-panel"), overlay = document.getElementById("paletteOverlay");
  if (!panel) return;
  if (!document.getElementById("paletteGrabHandle")) {
    const h = document.createElement("div"); 
    h.id = "paletteGrabHandle";
    h.style.cssText = "width: 44px; height: 5px; background: var(--border-color); border-radius: 4px; margin: 8px auto 4px auto; flex-shrink: 0; cursor: grab;";
    panel.insertBefore(h, panel.firstChild);
  }
  let touchStartY = 0, touchStartX = 0;
  panel.addEventListener("touchstart", (e) => { 
    if (window.innerWidth > 768) return; 
    touchStartY = e.touches[0].clientY; 
    touchStartX = e.touches[0].clientX; 
  }, { passive: true });
  panel.addEventListener("touchend", (e) => {
    if (window.innerWidth > 768 || !panel.classList.contains("open")) return;
    if ((e.changedTouches[0].clientY - touchStartY) > 50 && Math.abs(e.changedTouches[0].clientX - touchStartX) < 80) {
      panel.classList.remove("open"); 
      if (overlay) { 
        overlay.classList.remove("open"); 
        overlay.style.pointerEvents = "none"; 
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

window.switchMasteryView = function(viewType) {
  const rWrap = document.getElementById("radarViewport"), gWrap = document.getElementById("gridViewport"), bRadar = document.getElementById("btnToggleRadar"), bGrid = document.getElementById("btnToggleGrid");
  if (viewType === 'radar') { 
    if (rWrap) rWrap.style.display = "flex"; 
    if (gWrap) gWrap.style.display = "none"; 
    bRadar?.classList.add("active"); 
    bGrid?.classList.remove("active"); 
  } else { 
    if (rWrap) rWrap.style.display = "none"; 
    if (gWrap) gWrap.style.display = "grid"; 
    bGrid?.classList.add("active"); 
    bGrid?.classList.remove("active"); 
  }
};

// ==========================================================================
// 4. AUTHENTICATION & CANDIDATE SESSION
// ==========================================================================
let initHash = window.location.hash || window.location.href;
if (initHash.includes("type=recovery")) sessionStorage.setItem("recovery_mode", "true");
supabaseClient.auth.onAuthStateChange((event) => { 
  if (event === "PASSWORD_RECOVERY") { 
    sessionStorage.setItem("recovery_mode", "true"); 
    if (document.getElementById("resetPasswordForm")) showPasswordResetUI(); 
  } 
});

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
    const tiles = card.querySelectorAll(".set-tile");
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

  document.querySelectorAll('.mission-column-secondary .playlist-accordion-card').forEach(c => {
    c.classList.remove('expanded');
    c.classList.add('collapsed');
  });

  if (!wasExpanded) {
    card.classList.remove('collapsed');
    card.classList.add('expanded');
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
  if (localStorage.getItem("theme") === "dark") { 
    document.body.classList.add("dark-theme"); 
    themeBtns.forEach(b => b.innerText = "☀️"); 
  }
  themeBtns.forEach(btn => {
    btn.onclick = () => {
      document.body.classList.toggle("dark-theme"); 
      const isDark = document.body.classList.contains("dark-theme");
      localStorage.setItem("theme", isDark ? "dark" : "light"); 
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
    if (d.getHours() === 17 && !localStorage.getItem("5pm_alert_" + dateStr)) {
      const tomLoad = parseInt(localStorage.getItem("tomorrow_load_" + currentCandidate.roll_number) || "0");
      if (tomLoad === 0) showAppNoticeModal("Tomorrow's Queue", "Target Queue Empty", "Tomorrow's Playlist has no sets staged. Add sets before you sleep to maintain your Century Streak!", "⏳", "Explore Library");
      else if (tomLoad < 100) showAppNoticeModal("Tomorrow's Queue", "Target Load Incomplete", `Tomorrow has only ${tomLoad} questions staged (Target is 100). Add more sets!`, "⚠️", "Add Sets");
      else showAppNoticeModal("Tomorrow's Queue", "Target Locked", `Tomorrow's payload is locked & ready (${tomLoad} Questions).`, "🎯", "Dismiss");
      localStorage.setItem("5pm_alert_" + dateStr, "true");
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

  // Primary Action Button (e.g. Back to Crucible)
  const actionBtn = document.getElementById("btnNoticeAction") || modal.querySelector(".notice-modal-actions .btn-primary");
  if (actionBtn) { 
    actionBtn.innerText = actionText; 
    actionBtn.onclick = () => { 
      closeAppNoticeModal(); 
      if (actionCallback) actionCallback(); 
      else { switchView("viewLibrary"); returnToSubjectHub(true); } 
    }; 
  }

  // 🚀 Secondary Bypass Button (e.g. Continue Anyway) - Fallback selector included
  const secBtn = document.getElementById("btnNoticeSecondary") || modal.querySelector(".notice-modal-actions .btn-secondary");
  if (secBtn) {
    secBtn.innerText = secText;
    secBtn.onclick = () => {
      closeAppNoticeModal();
      if (secCallback) secCallback();
    };
  }

  modal.style.display = "flex"; 
  modal.style.pointerEvents = "auto";
};
window.closeAppNoticeModal = function() { 
  const m = document.getElementById("appNoticeModal"); 
  if (m) { m.style.display = "none"; m.style.pointerEvents = "none"; } 
};

window.handleNoticeAction = function() { 
  closeAppNoticeModal(); 
  switchView("viewLibrary"); 
  returnToSubjectHub(true); 
};

window.openCreatePlaylistModal = function(fromSpecificTest = false) { 
  if (!fromSpecificTest) selectedTestForPlaylist = null;
  const m = document.getElementById("createPlaylistModal"), inp = document.getElementById("inputNewPlaylistName"); 
  if (inp) inp.value = ""; 
  if (m) { m.style.display = "flex"; m.style.pointerEvents = "auto"; } 
  setTimeout(() => inp?.focus(), 60); 
};

window.closeCreatePlaylistModal = function() { 
  const m = document.getElementById("createPlaylistModal"); 
  if (m) { m.style.display = "none"; m.style.pointerEvents = "none"; } 
};

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
    const { error } = await supabaseClient.from("playlists").insert({ student_roll: currentCandidate.roll_number, playlist_name: name, is_system_playlist: false, display_order: 10 });
    if (error) throw error;
    closeCreatePlaylistModal(); 
    await fetchPlaylistsAndCheckRollover(); 
    await renderHomePlaylists(); 
    
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
  const m = document.getElementById("editPlaylistModal"), idIn = document.getElementById("editPlaylistId"), nameIn = document.getElementById("inputEditPlaylistName");
  if (idIn) idIn.value = pId; 
  if (nameIn) nameIn.value = pName;
  if (m) { m.style.display = "flex"; m.style.pointerEvents = "auto"; }
  setTimeout(() => nameIn?.focus(), 60); 
};

window.closeEditPlaylistModal = function() { 
  const m = document.getElementById("editPlaylistModal"); 
  if (m) { m.style.display = "none"; m.style.pointerEvents = "none"; } 
};

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
  const m = document.getElementById("deletePlaylistConfirmModal"), 
        tEl = document.getElementById("deleteModalTitle"), 
        hEl = document.getElementById("deleteModalHeading"), 
        msgEl = document.getElementById("deleteModalMessage"), 
        btn = document.getElementById("btnConfirmDeletePlaylist");
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
  if (m) { m.style.display = "flex"; m.style.pointerEvents = "auto"; }
};

window.closeDeletePlaylistModal = function() { 
  const m = document.getElementById("deletePlaylistConfirmModal"); 
  if (m) { m.style.display = "none"; m.style.pointerEvents = "none"; } 
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

  // 👑 Sunday Soft Friction: अनअटेम्प्टेड सेट्स पर जेंटल स्पीडबम्प (रिवीजन प्राथमिकता के लिए)
  if (isSun && testId !== -1 && !bypassSundayCheck) {
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

  if (testId === -1) {
    // संडे को 100 प्रश्नों का वीकली क्रूसीबल पूल, बाकी दिनों में 25 प्रश्न
    const poolLimit = isSun ? 100 : 25;
    const boosterQuestions = await compileMasteryBoosterPool(poolLimit);
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
    
    document.getElementById("briefingSubjectBadge").innerText = isSun ? "SUNDAY CRUCIBLE EXAM" : "BONUS MASTERY BOOSTER";
    const statusBadge = document.getElementById("briefingStatusBadge");
    statusBadge.className = "briefing-status-tag status-progress";
    statusBadge.innerText = `${qCount} DUE`;
    
    document.getElementById("briefingSetTitle").innerText = isSun ? "Weekly Backlog & Mastery Crucible" : "Mistakes & Active Retention Booster";
    document.getElementById("briefingDurationMeta").innerText = `⏱️ ${durationMins}m`;
    document.getElementById("briefingQuestionsMeta").innerText = `📄 ${qCount} Questions`;
    document.getElementById("briefingScoreMeta").innerText = `${mistakeCount} Mistakes • ${recallCount} Recall`;
  } else {
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
  }
  activeBriefingTestId = null;
};

window.executeBriefingMode = function(mode) {
  const tId = activeBriefingTestId;
  closeMissionBriefingModal();
  if (tId === null || tId === undefined) return;
  
  if (tId === -1) {
    launchBoosterMode(mode);
  } else {
    if (mode === 'exam') {
      launchAssessment(tId);
    } else {
      launchPracticeMode(tId, mode);
    }
  }
};

// ==========================================================================
// 8. HOME DECK & PLAYLIST ENGINE (QUANTUM CORE BOOSTER & ANTI-DRIFT ROLLOVER)
// ==========================================================================
async function mountDashboard(isInitialLoad = false) {
  const cName = document.getElementById("dashCandidateName"); 
  if (cName) cName.innerText = currentCandidate?.full_name || "Candidate";
  const rollEl = document.getElementById("dashCandidateRoll"); 
  if (rollEl) rollEl.innerText = "ROLL: " + (currentCandidate?.roll_number || "---");
  fetchStudentAnalytics(true); 

  // 👑 Sunday Golden UI & Header Sync
  const isSun = isSunday();
  document.body.classList.toggle("sunday-mode", isSun);
  const pTag = document.getElementById("dashPortalTag"), pSub = document.getElementById("dashPortalSub");
  if (pTag) pTag.innerText = isSun ? "REVISION PROTOCOL" : "HOME";
  if (pSub) pSub.innerText = isSun ? "Sunday Crucible Deck" : "Execution Deck";
  const cIcon = document.getElementById("centuryIcon"), cTitle = document.getElementById("centuryTitleText"), cSub = document.getElementById("centurySubtitleText");
  if (cIcon) cIcon.innerText = isSun ? "👑" : "🎯";
  if (cTitle) cTitle.innerText = isSun ? "Sunday Revision Target" : "Daily Milestone";
  if (cSub) cSub.innerText = isSun ? "Weekly Backlog & Mastery Crucible" : "100-Question Target & Mastery Barometer";
  
  renderViewDOM('viewDashboard');

  if (isInitialLoad || !history.state || history.state.page !== 'dashboard') {
    history.replaceState({ page: 'exit-gate' }, '', window.location.pathname);
    history.pushState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');
  }

  await fetchPlaylistsAndCheckRollover(); 
  await fetchWeakQuestions(); 
  await fetchTestCatalog(); 
  await renderHomePlaylists(); 
  start5PMEngine();
}

async function fetchPlaylistsAndCheckRollover() {
  if (!currentCandidate) return; 
  const roll = currentCandidate.roll_number;
  try {
    let { data: pData, error: pErr } = await supabaseClient.from("playlists").select("*").eq("student_roll", roll).order("display_order", { ascending: true });
    if (pErr) console.error("Playlists fetch error:", pErr);
    const required = [{ name: 'Today', order: 1 }, { name: 'Tomorrow', order: 2 }, { name: 'This Week', order: 3 }];
    let missing = [];
    if (!pData || pData.length === 0) {
      missing = required.map(r => ({ student_roll: roll, playlist_name: r.name, is_system_playlist: true, display_order: r.order }));
    } else {
      required.forEach(r => { 
        if (!pData.some(p => p.playlist_name === r.name)) missing.push({ student_roll: roll, playlist_name: r.name, is_system_playlist: true, display_order: r.order }); 
      });
    }
    if (missing.length > 0) {
      await supabaseClient.from("playlists").insert(missing);
      const { data: refData } = await supabaseClient.from("playlists").select("*").eq("student_roll", roll).order("display_order", { ascending: true });
      pData = refData || pData || [];
    }

    // 🚀 IN-MEMORY & DB LEVEL DEDUPLICATION
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

    const { data: piData } = await supabaseClient.from("playlist_items").select("*").eq("student_roll", roll);
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
    
    const { data: todayAttRows } = await supabaseClient
      .from("test_attempts")
      .select("test_id, total_correct, total_incorrect, attempt_date")
      .eq("student_roll", roll);

    const actualExamAttemptedToday = (todayAttRows || [])
      .filter(a => (a.attempt_date || "").split("T")[0] === todayStr && a.test_id > 0)
      .reduce((sum, a) => sum + (a.total_correct || 0) + (a.total_incorrect || 0), 0);

    let { data: dpData } = await supabaseClient
      .from("daily_performance")
      .select("*")
      .eq("student_roll", roll)
      .eq("target_date", todayStr)
      .maybeSingle();

    if (dpData) {
      if (dpData.total_questions_attempted !== actualExamAttemptedToday) {
        dpData.total_questions_attempted = actualExamAttemptedToday;
        dpData.is_century_hit = actualExamAttemptedToday >= 100;
        await supabaseClient.from("daily_performance").update({
          total_questions_attempted: actualExamAttemptedToday,
          is_century_hit: actualExamAttemptedToday >= 100
        }).eq("id", dpData.id);
      }
      dailyPerf = dpData;
    } else {
      const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
      const { data: yData } = await supabaseClient.from("daily_performance").select("streak_count, is_century_hit").eq("student_roll", roll).eq("target_date", yesterday).maybeSingle();
      const newStreak = (yData && yData.is_century_hit) ? yData.streak_count : 0;
      const { data: insData } = await supabaseClient.from("daily_performance").insert({ 
        student_roll: roll, 
        target_date: todayStr, 
        total_questions_attempted: actualExamAttemptedToday, 
        streak_count: newStreak 
      }).select().single();
      if (insData) dailyPerf = insData;
    }

    // 🚀 MULTI-DEVICE SYNCHRONIZED ROLLOVER
    const serverLastRollover = currentCandidate?.last_rollover_date;

    if (serverLastRollover !== todayStr) {
      const todayList = userPlaylists.find(p => p.playlist_name === 'Today');
      const tomorrowList = userPlaylists.find(p => p.playlist_name === 'Tomorrow');

      if (todayList && tomorrowList) {
        await supabaseClient.from("playlist_items")
          .update({ is_rollover: true })
          .eq("playlist_id", todayList.id)
          .eq("student_roll", roll);

        await supabaseClient.from("playlist_items")
          .update({ playlist_id: todayList.id })
          .eq("playlist_id", tomorrowList.id)
          .eq("student_roll", roll);
      }

      await supabaseClient.from("students")
        .update({ last_rollover_date: todayStr })
        .eq("roll_number", roll);

      if (currentCandidate) {
        currentCandidate.last_rollover_date = todayStr;
      }
      localStorage.removeItem("last_rollover_" + roll);

      const { data: piData2 } = await supabaseClient.from("playlist_items")
        .select("*")
        .eq("student_roll", roll);
      userPlaylistItems = piData2 || [];
    }
  } catch (error) { 
    console.error("Playlist Init Error:", error); 
  }
}

// 🚀 REVISION & MISTAKE POOL COMPILER
async function compileMasteryBoosterPool(maxLimit = 25, forceRefresh = false) {
  if (!forceRefresh && cachedBoosterPool && (Date.now() - lastBoosterFetchTime < 15000)) {
    return cachedBoosterPool;
  }

  let assembled = [];
  const seenIds = new Set();

  const now = new Date();
  const mistakePool = userWeakQuestions.filter(q => 
    q.times_wrong > 0 && 
    (q.mastery_streak || 0) < 4 && 
    (!q.next_review_at || new Date(q.next_review_at) <= now)
  );

  mistakePool.sort((a, b) => (b.times_wrong || 0) - (a.times_wrong || 0)).slice(0, maxLimit).forEach(item => {
    const qd = item.question_data || {};
    const qid = String(item.question_id || qd.id);
    if (!seenIds.has(qid)) {
      seenIds.add(qid);
      let opts = [];
      try { opts = typeof qd.options === 'string' ? JSON.parse(qd.options) : (qd.options || []); } catch(e) { opts = []; }
      assembled.push({
        id: qid,
        content: qd.content,
        options: opts,
        correctAnswer: getNormalizedCorrectAnswerId(qd.correct_answer || qd.correctAnswer, opts),
        explanation: qd.explanation,
        isMistake: true
      });
    }
  });

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
            let opts = [];
            try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []); } catch(e) { opts = []; }
            assembled.push({
              id: qid,
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
  let boosterQuestions = await compileMasteryBoosterPool(isSun ? 100 : 25, true);
  if (!boosterQuestions.length) {
    return showAppNoticeModal("Notice", "No Pending Reviews", "You have no pending mistakes or review questions right now.", "⚪", "Dismiss");
  }

  if (isShuffleEnabled) {
    boosterQuestions = shuffleArray(boosterQuestions);
    boosterQuestions.forEach((q, idx) => { q.qNum = idx + 1; });
  }

  const qCount = boosterQuestions.length;

  if (mode === 'exam') {
    isExamFinished = false;
    switchView("viewExam", true);
    
    activeTest = {
      id: -1,
      title: isSun ? "Sunday Crucible Exam" : "Bonus Mastery Booster",
      total_duration_minutes: isSun ? Math.min(60, Math.max(15, Math.ceil(qCount * 0.6))) : Math.max(3, Math.ceil(qCount * 0.6))
    };
    document.getElementById("examTitle").innerText = activeTest.title;
    document.getElementById("subjectLabelBreadcrumb").innerText = isSun ? "Sunday Crucible" : "Bonus Booster";
    document.getElementById("sectionTabs").innerHTML = `<button type="button" class="section-tab">Section 1: ${isSun ? 'Weekly Backlog Clearance' : 'Active Review'} (${qCount} Qs)</button>`;
    timeRemaining = activeTest.total_duration_minutes * 60;

    testQuestions = boosterQuestions;
    userResponses = {};
    testQuestions.forEach((q, idx) => {
      userResponses[idx] = { selected: null, status: idx === 0 ? 1 : 0, timeSpent: 0 };
    });

    renderQuestion(0);
    startExamTimer();
  } else {
    practiceQuestions = boosterQuestions;
    const tEl = document.getElementById("practiceSetTitle");
    if (tEl) tEl.innerText = `${isSun ? 'Sunday Crucible Exam' : 'Bonus Mastery Booster'} (${qCount} Qs)`;
    const mEl = document.getElementById("practiceModeTitle");
    if (mEl) mEl.innerText = mode === "read" ? "📖 READ MODE" : (mode === "quiz" ? "⚡ INSTANT QUIZ" : "🗂️ FLASHCARDS");

    switchView("viewPractice");
    if (mode === "read") renderReadMode();
    else if (mode === "quiz") renderInteractiveQuizMode();
    else { flashcardIndex = 0; renderFlashcardMode(); }
  }
};

// 🚀 MUTEX-LOCKED & ATOMIC ASSIGNMENT RENDERER
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
          customContainer = document.getElementById("customPlaylistsContainer"),
          revContainer = document.getElementById("dynamicRevisionTileContainer");

    if (!todayContainer || !tomorrowContainer || !weekContainer) return;
    todayContainer.innerHTML = ""; 
    tomorrowContainer.innerHTML = ""; 
    weekContainer.innerHTML = ""; 

    // RENDER QUANTUM CORE BOOSTER / SUNDAY CRUCIBLE EXAM
    if (revContainer) {
      const isSun = isSunday();
      const boosterLimit = isSun ? 100 : 25;
      const boosterQuestions = await compileMasteryBoosterPool(boosterLimit);
      const qCount = boosterQuestions.length;
      const tileTitle = isSun ? "Sunday Crucible Exam" : "Bonus Mastery Booster";
      const tileThemeClass = isSun ? "sunday-crucible-tile" : "";

      if (qCount === 0) {
        revContainer.innerHTML = `
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
            <div class="set-score-info"><span style="color:var(--success-dark); font-weight:600;">✓ Mistake Bank Cleared • Zero Reviews Due</span></div>
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

        revContainer.innerHTML = `
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
            <div class="set-score-info"><span style="color:var(--warning-dark); font-weight:700;">⚡ ${poolDetail}</span></div>
            <div class="set-action-footer">
              <button type="button" class="btn-launch-set" onclick="openMissionBriefingModal(-1)">
                <span>${isSun ? '⚔️' : '▶'}</span> <span>${isSun ? 'Launch Sunday Crucible' : 'Start Booster Session'}</span>
              </button>
            </div>
          </div>
        `;
      }
    }

    let todayLoad = 0, tomorrowLoad = 0;
    const getSetHtml = (item, pName) => {
      const setCat = catalogData.find(c => String(c.test_id) === String(item.test_id)); 
      if (!setCat) return "";
      const qCount = setCat.total_questions || 10;
      if (pName === 'Today') todayLoad += qCount; 
      if (pName === 'Tomorrow') tomorrowLoad += qCount;
      
      const isRoll = item.is_rollover ? `<span class="set-rollover-tag">⚠️ ROLLOVER</span>` : '';
      
      const attempts = userAttemptHistory.filter(a => String(a.test_id) === String(setCat.test_id)), isAtt = attempts.length > 0;
      const bestScore = isAtt ? Math.max(...attempts.map(a => parseFloat(a.score))) : 0, maxMarks = qCount * 2, pct = (maxMarks > 0 && isAtt) ? (bestScore / maxMarks) * 100 : 0;
      let badgeClass = '', badgeText = '', historyHtml = '<span style="color:var(--text-muted);">Not attempted yet</span>';
      if (isAtt) {
        if (pct >= 100) { 
          badgeClass = 'status-mastered'; 
          badgeText = `MASTERED ${bestScore}/${maxMarks}`; 
          historyHtml = `<span style="color:var(--success-dark);">★ Best: ${bestScore} (${Math.round(pct)}%) | Att: ${attempts.length}</span>`; 
        } else { 
          badgeClass = 'status-progress'; 
          badgeText = `IN PROGRESS`; 
          historyHtml = `<span style="color:var(--warning-dark);">Review: ${bestScore}/${maxMarks} | Att: ${attempts.length}</span>`; 
        }
      }
      return `
        <div class="set-tile" data-status="${isAtt ? (pct >= 100 ? 'mastered' : 'revise') : 'unattempted'}">
          <div class="set-tile-header">
            <div class="set-tile-title-group">
              ${isRoll}
              <div class="set-tile-title">${setCat.test_title}</div>
            </div>
            <div style="display:flex; gap: 6px; align-items: center; flex-shrink: 0;">
               ${badgeText ? `<div class="set-status-badge ${badgeClass}">${badgeText}</div>` : ''}
               <button type="button" class="btn-three-dots" onclick="openThreeDotsMenu(event, ${setCat.test_id})" title="Options">⋮</button>
            </div>
          </div>
          <div class="set-tile-meta"><span>${clockSvg} ${setCat.total_duration_minutes}m</span><span>${docSvg} ${qCount} Qs</span></div>
          <div class="set-score-info">${historyHtml}</div>
          <div class="set-action-footer">
            <button type="button" class="btn-launch-set" onclick="openMissionBriefingModal(${setCat.test_id})">
              <span>▶</span> <span>${isAtt ? 'Retake / Review' : 'Start Session'}</span>
            </button>
          </div>
        </div>
      `;
    };

    const getAddBtn = (pId, pName) => `<button type="button" class="btn-create-playlist-trigger" style="margin-top: 10px; grid-column: 1 / -1;" onclick="enableLibrarySelectionMode('${pId}', '${pName.replace(/'/g, "\\'")}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add Sets to ${pName}</span></button>`;
    const todayList = userPlaylists.find(p => p.playlist_name === 'Today'), tomorrowList = userPlaylists.find(p => p.playlist_name === 'Tomorrow'), weekList = userPlaylists.find(p => p.playlist_name === 'This Week');

    if (todayList) {
      const items = userPlaylistItems.filter(pi => pi.playlist_id === todayList.id);
      todayContainer.innerHTML = (items.length > 0 ? items.map(i => getSetHtml(i, 'Today')).join("") : `<div style="text-align:center; padding:18px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;">No sets queued for today yet.</div>`) + getAddBtn(todayList.id, 'Today');
      const pill = document.getElementById("todayCountPill"); if (pill) pill.innerText = `${items.length} Sets ▼`;
    }
    if (tomorrowList) {
      const items = userPlaylistItems.filter(pi => pi.playlist_id === tomorrowList.id);
      tomorrowContainer.innerHTML = (items.length > 0 ? items.map(i => getSetHtml(i, 'Tomorrow')).join("") : `<div style="text-align:center; padding:18px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;">Queue is empty.</div>`) + getAddBtn(tomorrowList.id, 'Tomorrow');
      const badge = document.getElementById("tomorrowCountPill"); if (badge) badge.innerText = `${items.length} Sets ▼`;
      
      const tomHeader = document.querySelector("#tomorrowPlaylistCard .playlist-header");
      if (tomHeader) tomHeader.onclick = () => window.toggleSecondaryPlaylist(tomHeader);
    }
    if (weekList) {
      const items = userPlaylistItems.filter(pi => pi.playlist_id === weekList.id);
      weekContainer.innerHTML = (items.length > 0 ? items.map(i => getSetHtml(i, 'This Week')).join("") : `<div style="text-align:center; padding:18px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;">Backlog is empty.</div>`) + getAddBtn(weekList.id, 'This Week');
      const badge = document.getElementById("weekCountPill"); if (badge) badge.innerText = `${items.length} Sets ▼`;

      const weekHeader = document.querySelector("#weekPlaylistCard .playlist-header");
      if (weekHeader) weekHeader.onclick = () => window.toggleSecondaryPlaylist(weekHeader);
    }
    
    // 🚀 ATOMIC BATCHED RENDER FOR CUSTOM PLAYLISTS
    if (customContainer) {
      const customLists = userPlaylists.filter(p => !['Today', 'Tomorrow', 'This Week'].includes(p.playlist_name));
      let customHtml = "";
      customLists.forEach(playlist => {
        const items = userPlaylistItems.filter(pi => pi.playlist_id === playlist.id);
        customHtml += `
          <div class="mission-playlist-card collapsed playlist-accordion-card">
            <div class="playlist-header" onclick="window.toggleSecondaryPlaylist(this)">
              <div class="playlist-header-left"><h3 class="playlist-title">${playlist.playlist_name}</h3></div>
              <div class="playlist-header-right">
                <span class="playlist-count-pill">${items.length} Sets ▼</span>
                <button type="button" class="btn-playlist-dots" onclick="event.stopPropagation(); openPlaylistActionMenu(event, '${playlist.id}', '${playlist.playlist_name.replace(/'/g, "\\'")}', false)" title="Playlist Options">⋮</button>
              </div>
            </div>
            <div class="playlist-body">
              <div class="playlist-sets-stream sets-card-grid">${items.length > 0 ? items.map(i => getSetHtml(i, playlist.playlist_name)).join("") : `<div style="text-align:center; padding:18px; color:var(--text-muted); font-size:12.5px; font-weight:600; grid-column:1 / -1;">No sets in ${playlist.playlist_name}.</div>`}</div>
              ${getAddBtn(playlist.id, playlist.playlist_name)}
            </div>
          </div>
        `;
      });
      customContainer.innerHTML = customHtml;
    }

    const targetQ = 100, todayStr = getLocalDateString();
    const todayAttempts = userAttemptHistory.filter(a => (a.attempt_date || "").split("T")[0] === todayStr && a.test_id > 0);
    let todayMasteredQ = 0;
    todayAttempts.forEach(a => { 
      const c = catalogData.find(x => String(x.test_id) === String(a.test_id)), qc = c ? (c.total_questions || 10) : 10; 
      if (parseFloat(a.score) >= (qc * 2)) todayMasteredQ += qc; 
      else if (a.total_correct) todayMasteredQ += a.total_correct; 
    });

    const capPct = Math.min(100, Math.round((todayLoad / targetQ) * 100)), 
          attPct = Math.min(100, Math.round(((dailyPerf.total_questions_attempted || 0) / targetQ) * 100)), 
          masPct = Math.min(attPct, Math.min(100, Math.round((todayMasteredQ / targetQ) * 100)));

    const capFill = document.getElementById("centuryCapacityFill"), 
          attFill = document.getElementById("centuryAttemptedFill"), 
          masFill = document.getElementById("centuryMasteredFill"), 
          meterText = document.getElementById("centuryLoadText");

    if (capFill) capFill.style.width = capPct + "%"; 
    if (attFill) attFill.style.width = attPct + "%"; 
    if (masFill) masFill.style.width = masPct + "%";

    if (meterText) {
      if ((dailyPerf.total_questions_attempted || 0) >= 100) meterText.innerText = `${dailyPerf.total_questions_attempted} / 100 Qs 🔥 (Century Secured)`;
      else if (todayLoad < 100) meterText.innerText = `${dailyPerf.total_questions_attempted || 0} / 100 Qs ⚠️ (Queue: ${todayLoad} Qs)`;
      else meterText.innerText = `${dailyPerf.total_questions_attempted || 0} / 100 Qs 🎯 (${todayLoad} Staged)`;
    }
    localStorage.setItem("tomorrow_load_" + currentCandidate.roll_number, tomorrowLoad);
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
window.showSelectionToast = function(msg) {
  const toast = document.getElementById("selectionToast");
  const msgEl = document.getElementById("selectionToastText");
  if (!toast || !msgEl) return;
  msgEl.innerText = msg;
  toast.style.display = "block";
  void toast.offsetWidth;
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (!toast.classList.contains("show")) toast.style.display = "none";
    }, 250);
  }, 2200);
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
  const subSets = catalogData.filter(r => (r.subject || "General Studies").trim().toLowerCase() === activeSubject.toLowerCase());
  let mastered = 0; 
  subSets.forEach(s => { 
    const atts = userAttemptHistory.filter(a => String(a.test_id) === String(s.test_id)); 
    if (atts.length > 0 && Math.max(...atts.map(a => parseFloat(a.score))) >= ((s.total_questions || 10) * 2)) mastered++; 
  });
  if (sEl) sEl.innerText = `${subSets.length} Sets • ${mastered} Mastered`;

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

  const inTarget = userPlaylistItems.some(pi => pi.playlist_id === pId && String(pi.test_id) === String(testId));
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

window.openThreeDotsMenu = function(event, testId) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  currentThreeDotsTestId = testId; 
  closePlaylistActionMenu();
  const menu = document.getElementById("threeDotsMenu"), overlay = document.getElementById("threeDotsMenuOverlay"); 
  if (!menu || !overlay) return;
  const btnRect = event.currentTarget.getBoundingClientRect();
  menu.style.display = "block"; 
  menu.style.zIndex = "3200"; 
  overlay.style.display = "block"; 
  overlay.style.zIndex = "3100"; 
  overlay.style.pointerEvents = "auto"; 
  overlay.classList.add("open");
  const menuWidth = 165; 
  let leftPos = btnRect.right - menuWidth; 
  if (leftPos < 10) leftPos = 10;
  let topPos = btnRect.bottom + 6; 
  if (topPos + 60 > window.innerHeight) topPos = Math.max(10, btnRect.top - 50);
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
};

window.triggerBottomSheetFromMenu = function() { 
  closeThreeDotsMenu(); 
  if (currentThreeDotsTestId) openPlaylistBottomSheet(currentThreeDotsTestId); 
};

window.openPlaylistBottomSheet = function(testId) {
  selectedTestForPlaylist = testId;
  const bs = document.getElementById("playlistBottomSheet"), overlay = document.getElementById("playlistBottomSheetOverlay"), opts = document.getElementById("bottomSheetOptionsContainer");
  if (!bs || !opts) return;
  let html = "";
  userPlaylists.forEach(p => {
    const inList = userPlaylistItems.some(pi => pi.playlist_id === p.id && String(pi.test_id) === String(testId));
    const icon = p.playlist_name === 'Today' ? '🔥' : (p.playlist_name === 'Tomorrow' ? '⏳' : (p.playlist_name === 'This Week' ? '📅' : '📁'));
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
  if (!document.querySelector(".bottom-sheet-footer")) {
    html += `<button type="button" class="btn-create-playlist-trigger" style="margin-top:8px;" onclick="promptNewPlaylistFromSheet()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Create New Playlist</span></button>`;
  }
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

  // 🚀 Step 1: Instant 0ms Local Memory Toggle
  if (inList) {
    userPlaylistItems = userPlaylistItems.filter(pi => !(pi.playlist_id === pId && String(pi.test_id) === String(testId)));
  } else {
    userPlaylistItems.push({ playlist_id: pId, test_id: testId, student_roll: roll });
  }

  // 🚀 Step 2: Instant DOM Re-render
  openPlaylistBottomSheet(testId);
  renderHomePlaylists();

  // 🚀 Step 3: Background Cloud Sync
  try {
    if (inList) {
      await supabaseClient.from("playlist_items").delete().eq("playlist_id", pId).eq("test_id", testId).eq("student_roll", roll);
    } else {
      await supabaseClient.from("playlist_items").insert({ playlist_id: pId, test_id: testId, student_roll: roll });
    }
  } catch (err) {
    console.error("Cloud playlist sync failed, reverting:", err);
    if (inList) {
      userPlaylistItems.push({ playlist_id: pId, test_id: testId, student_roll: roll });
    } else {
      userPlaylistItems = userPlaylistItems.filter(pi => !(pi.playlist_id === pId && String(pi.test_id) === String(testId)));
    }
    openPlaylistBottomSheet(testId);
    renderHomePlaylists();
    if (typeof showSelectionToast === "function") {
      showSelectionToast("Network sync failed. Changes reverted.");
    }
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

  const { data: hist } = await supabaseClient.from("test_attempts").select("test_id, score, total_correct, total_incorrect, attempt_date, time_spent_seconds").eq("student_roll", currentCandidate.roll_number).order("attempt_date", { ascending: false });
  userAttemptHistory = hist || []; 
  renderSubjectHubGrid();
}

function renderSubjectHubGrid() {
  const container = document.getElementById("subjectHubContainer"); 
  if (!container) return; 
  container.innerHTML = "";
  const map = {}; 
  catalogData.forEach(r => { 
    const s = (r.subject || "General Studies").trim(); 
    if (!map[s]) map[s] = { sets: [] }; 
    map[s].sets.push(r); 
  });

  Object.entries(map).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' })).forEach(([subName, data]) => {
    const totalSets = data.sets.length; 
    let completedSets = 0, totalAtt = 0, sumPct = 0, attemptedSets = 0;
    data.sets.forEach(setItem => {
      const atts = userAttemptHistory.filter(a => String(a.test_id) === String(setItem.test_id));
      if (atts.length > 0) { 
        totalAtt += atts.length; 
        attemptedSets++; 
        const best = Math.max(...atts.map(a => parseFloat(a.score))), maxM = (setItem.total_questions || 10) * 2, pct = maxM > 0 ? (best / maxM) * 100 : 0; 
        sumPct += pct; 
        if (pct >= 100) completedSets++; 
      }
    });
    const remaining = totalSets - completedSets, progPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0, avgAcc = attemptedSets > 0 ? Math.round(sumPct / attemptedSets) : 0;
    let sClass = "pill-untested", sText = "Untested";
    if (completedSets === totalSets && totalSets > 0) { sClass = "pill-mastered"; sText = "Mastered"; }
    else if (attemptedSets > 0) { sClass = "pill-progress"; sText = `${progPct}% Complete`; }

    const tile = document.createElement("div"); 
    tile.className = "subject-mastery-tile";
    tile.innerHTML = `
      <div class="tile-top-row"><span class="tile-subject-title">${subName}</span><span class="tile-status-pill ${sClass}">${sText}</span></div>
      <div class="tile-progress-container"><div class="tile-progress-labels"><span>Mastery Progress</span><span>${progPct}%</span></div><div class="tile-progress-track"><div class="tile-progress-fill" style="width: ${progPct}%;"></div></div></div>
      <div class="tile-metrics-grid">
        <div class="tile-metric-item"><span class="tile-metric-label">Mastered</span><span class="tile-metric-value" style="color:var(--success-dark);">${completedSets} <small style="font-size:10px; color:var(--text-muted);">/${totalSets}</small></span></div>
        <div class="tile-metric-item"><span class="tile-metric-label">Remaining</span><span class="tile-metric-value" style="color:var(--warning-dark);">${remaining} Sets</span></div>
        <div class="tile-metric-item"><span class="tile-metric-label">Avg Accuracy</span><span class="tile-metric-value">${avgAcc > 0 ? avgAcc + '%' : '--'}</span></div>
      </div>
      <div class="tile-action-footer"><span style="color:var(--text-muted); font-size:11px; font-weight:600;">${totalAtt} Attempts Logged</span><span>Explore Sets ➔</span></div>
    `;
    tile.onclick = () => drillDownToSubject(subName); 
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
  const hub = document.getElementById("subjectHubStage"), exp = document.getElementById("setsExplorerStage"), tEl = document.getElementById("explorerSubjectTitle"), sEl = document.getElementById("explorerSubjectStats");
  const subSets = catalogData.filter(r => (r.subject || "General Studies").trim().toLowerCase() === activeSubject.toLowerCase());
  let mastered = 0; 
  subSets.forEach(s => { 
    const atts = userAttemptHistory.filter(a => String(a.test_id) === String(s.test_id)); 
    if (atts.length > 0 && Math.max(...atts.map(a => parseFloat(a.score))) >= ((s.total_questions || 10) * 2)) mastered++; 
  });
  if (tEl) tEl.innerText = activeSubject; 
  if (sEl) sEl.innerText = `${subSets.length} Sets • ${mastered} Mastered`;
  toggleMastheadSearch(false); 
  if (hub) hub.style.display = "none"; 
  if (exp) exp.style.display = "block";
  currentFilter = "all"; 
  document.querySelectorAll('.filter-chip-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-filter') === 'all'));
  renderTopicSets(); 
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (pushHistory) history.pushState({ page: 'sets-explorer', view: 'viewLibrary', subView: 'setsExplorer', subject: activeSubject }, "", "#subject_" + encodeURIComponent(activeSubject));
};

window.returnToSubjectHub = function(fromPopState = false) {
  if (!fromPopState && history.state?.subView === 'setsExplorer') return history.back();
  const hub = document.getElementById("subjectHubStage"), exp = document.getElementById("setsExplorerStage");
  toggleMastheadSearch(false); 
  if (exp) exp.style.display = "none"; 
  if (hub) hub.style.display = "block"; 
  
  const scroller = document.getElementById("stagingDomainScroller");
  if (scroller) scroller.style.display = librarySelectionMode ? "flex" : "none";
  
  renderSubjectHubGrid(); 
  if (librarySelectionMode) updateStagingDockUI();
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (!fromPopState) history.replaceState({ page: 'main-tab', view: 'viewLibrary', subView: 'hub' }, "", "#viewLibrary");
};

// 🚀 HIGH-EFFICIENCY ONE-TIME DOM BUILDER
function renderTopicSets() {
  const container = document.getElementById("topicsContainer"); 
  if (!container) return; 
  container.innerHTML = "";
  
  updateStagingDockUI();

  const filtered = catalogData.filter(r => (r.subject || "General Studies").trim().toLowerCase() === (activeSubject || "").trim().toLowerCase());
  let totalSets = filtered.length, unattempted = 0, revise = 0, mastered = 0;
  filtered.forEach(s => {
    const atts = userAttemptHistory.filter(a => String(a.test_id) === String(s.test_id));
    if (atts.length === 0) unattempted++;
    else { 
      const best = Math.max(...atts.map(a => parseFloat(a.score))), maxM = (s.total_questions || 10) * 2; 
      if ((best / maxM) >= 1) mastered++; else revise++; 
    }
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
    const processed = [];
    const uniqueSets = [], seenIds = new Set();
    
    sets.forEach(item => {
      const idK = String(item.test_id);
      if (!seenIds.has(idK)) { 
        seenIds.add(idK); 
        uniqueSets.push(item); 
      }
    });

    uniqueSets.forEach(setItem => {
      const attempts = userAttemptHistory.filter(a => String(a.test_id) === String(setItem.test_id)), isAtt = attempts.length > 0;
      const best = isAtt ? Math.max(...attempts.map(a => parseFloat(a.score))) : 0, maxMarks = (setItem.total_questions || 10) * 2, pct = (maxMarks > 0 && isAtt) ? (best / maxMarks) * 100 : 0;
      let status = 'unattempted';
      if (isAtt) { 
        if (pct >= 100) { status = 'mastered'; topicMastered++; } 
        else status = 'revise'; 
      }
      processed.push({ setItem, status, isAtt, best, maxMarks, pct, count: attempts.length });
    });

    if (processed.length === 0) return;
    
    processed.sort((a, b) => {
      const titleA = String(a.setItem.test_title || "").trim();
      const titleB = String(b.setItem.test_title || "").trim();
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
    body.style.display = "none";
    const setsGrid = document.createElement("div"); 
    setsGrid.className = "sets-card-grid";

    processed.forEach(({ setItem, status, isAtt, best, maxMarks, pct, count }) => {
      const tile = document.createElement("div"); 
      tile.className = "set-tile";
      tile.setAttribute("data-test-id", setItem.test_id);
      tile.setAttribute("data-status", status);

      let badgeClass = '', badgeText = '', historyHtml = '<span style="color:var(--text-muted);">Not attempted yet</span>';
      if (isAtt) {
        if (pct >= 100) { 
          badgeClass = 'status-mastered'; 
          badgeText = `MASTERED ${best}/${maxMarks}`; 
          historyHtml = `<span style="color:var(--success-dark);">★ Best: ${best} (${Math.round(pct)}%) | Att: ${count}</span>`; 
        } else { 
          badgeClass = 'status-progress'; 
          badgeText = `IN PROGRESS`; 
          historyHtml = `<span style="color:var(--warning-dark);">Review: ${best}/${maxMarks} | Att: ${count}</span>`; 
        }
      }

      if (librarySelectionMode) {
        const inTarget = targetPlaylistForSelection && userPlaylistItems.some(pi => pi.playlist_id === targetPlaylistForSelection.id && String(pi.test_id) === String(setItem.test_id));
        
        tile.innerHTML = `
          <div class="set-tile-header">
            <div class="set-tile-title-group">
              <div class="set-tile-title">${setItem.test_title}</div>
            </div>
            <div style="display:flex; gap: 6px; align-items: center; flex-shrink: 0;">
               ${badgeText ? `<div class="set-status-badge ${badgeClass}">${badgeText}</div>` : ''}
            </div>
          </div>
          <div class="set-tile-meta"><span>${clockSvg} ${setItem.total_duration_minutes}m</span><span>${docSvg} ${setItem.total_questions} Qs</span></div>
          <div class="set-score-info">${historyHtml}</div>
          <button type="button" class="btn-bookmark-stage ${inTarget ? 'saved' : ''}" id="btnStage_${setItem.test_id}" onclick="toggleDirectStaging(${setItem.test_id})">
            ${inTarget ? bookmarkFilledSvg : bookmarkOutlineSvg}
            <span class="stage-label">${inTarget ? 'Saved to playlist' : 'Save to playlist'}</span>
          </button>
        `;
      } else {
        tile.innerHTML = `
          <div class="set-tile-header">
            <div class="set-tile-title-group">
              <div class="set-tile-title">${setItem.test_title}</div>
            </div>
            <div style="display:flex; gap: 6px; align-items: center; flex-shrink: 0;">
               ${badgeText ? `<div class="set-status-badge ${badgeClass}">${badgeText}</div>` : ''}
               <button type="button" class="btn-three-dots" onclick="openThreeDotsMenu(event, ${setItem.test_id})" title="Options">⋮</button>
            </div>
          </div>
          <div class="set-tile-meta"><span>${clockSvg} ${setItem.total_duration_minutes}m</span><span>${docSvg} ${setItem.total_questions} Qs</span></div>
          <div class="set-score-info">${historyHtml}</div>
          <div class="set-action-footer">
            <button type="button" class="btn-launch-set" onclick="openMissionBriefingModal(${setItem.test_id})">
              <span>▶</span> <span>${isAtt ? 'Retake / Review' : 'Start Session'}</span>
            </button>
          </div>
        `;
      }
      setsGrid.appendChild(tile);
    });

    body.appendChild(setsGrid); 
    groupCard.appendChild(header); 
    groupCard.appendChild(body); 
    container.appendChild(groupCard);
    
    header.onclick = () => {
      const isOpen = groupCard.classList.contains("open");
      container.querySelectorAll(".topic-accordion-card").forEach(c => { 
        if (c !== groupCard) { 
          c.classList.remove("open"); 
          const b = c.querySelector(".topic-accordion-body"); 
          if (b) b.style.display = "none"; 
        } 
      });
      groupCard.classList.toggle("open", !isOpen); 
      body.style.display = !isOpen ? "block" : "none";
    };
  });

  applyTopicFilter(currentFilter);
}

// 🚀 HIGH-SPEED BATCHED MISTAKE BANK SYNC
const REVIEW_INTERVALS_DAYS = [1, 3, 6, 15];
async function syncMistakeBank(payloads) {
  if (!payloads?.length || !currentCandidate) return;
  try {
    const qIds = payloads.map(p => p.question_id ? String(p.question_id) : String(Math.abs((p.question_data.content || "").length * 999)));
    const { data: existingRows } = await supabaseClient
      .from("student_question_stats")
      .select("id, question_id, times_wrong, times_correct, mastery_streak, next_review_at")
      .eq("student_roll", currentCandidate.roll_number)
      .in("question_id", qIds);

    const exMap = new Map((existingRows || []).map(r => [String(r.question_id), r]));
    const updates = [];
    const inserts = [];

    for (const p of payloads) {
      const qId = p.question_id ? String(p.question_id) : String(Math.abs((p.question_data.content || "").length * 999));
      const ex = exMap.get(qId);
      if (ex) {
        let nStreak = p.isCorrect ? Math.min(4, (ex.mastery_streak || 0) + 1) : 0;
        let nRev = new Date();
        if (p.isCorrect && nStreak < 4) nRev.setDate(nRev.getDate() + REVIEW_INTERVALS_DAYS[nStreak - 1]); 
        else if (p.isCorrect) nRev.setFullYear(nRev.getFullYear() + 100);
        
        updates.push(supabaseClient.from("student_question_stats").update({ 
          times_wrong: p.isCorrect ? ex.times_wrong : ex.times_wrong + 1, 
          times_correct: p.isCorrect ? ex.times_correct + 1 : ex.times_correct, 
          mastery_streak: nStreak, 
          next_review_at: nRev.toISOString(), 
          last_attempt_date: new Date().toISOString(), 
          question_data: p.question_data 
        }).eq("id", ex.id));
      } else {
        let nRev = new Date(); 
        if (p.isCorrect) nRev.setDate(nRev.getDate() + REVIEW_INTERVALS_DAYS[0]);
        inserts.push({ 
          student_roll: p.student_roll, 
          subject: p.subject, 
          question_id: qId, 
          question_data: p.question_data, 
          times_wrong: p.isCorrect ? 0 : 1, 
          times_correct: p.isCorrect ? 1 : 0, 
          mastery_streak: p.isCorrect ? 1 : 0, 
          next_review_at: nRev.toISOString() 
        });
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

window.launchMistakeBank = function(mode, forceAll = false) {
  const now = new Date(), 
        due = userWeakQuestions.filter(q => q.subject === activeSubject && q.times_wrong > 0 && (q.mastery_streak || 0) < 4 && (!q.next_review_at || new Date(q.next_review_at) <= now)),
        allW = userWeakQuestions.filter(q => q.subject === activeSubject && q.times_wrong > 0 && (q.mastery_streak || 0) < 4);
  
  if (!allW.length) {
    return showAppNoticeModal("Mistake Bank Mastered", "All Weak Areas Cleared! 🎉", "You have mastered all flagged questions for this domain.", "🏆", "Explore Library", () => { 
      switchView("viewLibrary"); 
      returnToSubjectHub(true); 
    });
  }

  const targetList = (forceAll || !due.length) ? allW : due;
  practiceQuestions = targetList.map((item, i) => {
    const qData = item.question_data || {}; 
    let opts = [];
    try { opts = typeof qData.options === 'string' ? JSON.parse(qData.options) : (qData.options || []); } catch(e) { opts = []; }
    return { 
      qNum: i + 1, 
      id: item.question_id || qData.id, 
      content: qData.content, 
      options: opts, 
      correctAnswer: getNormalizedCorrectAnswerId(qData.correct_answer || qData.correctAnswer, opts), 
      explanation: qData.explanation, 
      masteryStreak: item.mastery_streak || 0 
    };
  }).sort(() => 0.5 - Math.random()).slice(0, 100);

  const tEl = document.getElementById("practiceSetTitle"); 
  if (tEl) tEl.innerText = forceAll ? `Mega Mistake Bank (${practiceQuestions.length} Qs)` : `Mistake Bank (${practiceQuestions.length} Qs)`;
  switchView("viewPractice"); 
  if (mode === "quiz") renderInteractiveQuizMode(); 
  else { flashcardIndex = 0; renderFlashcardMode(); }
};

window.launchDailyMix = async function() {
  await launchBoosterMode('exam');
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
    activeTest = tInfo; 
    document.getElementById("examTitle").innerText = activeTest.title || "Assessment"; 
    document.getElementById("subjectLabelBreadcrumb").innerText = activeSubject || "General";
    timeRemaining = (activeTest.total_duration_minutes || 15) * 60;
    
    const { data: sections, error: sErr } = await supabaseClient.from("test_sections").select("id, section_name").eq("test_id", testId).limit(1); 
    if (sErr || !sections?.length) throw new Error("No sections configured.");
    document.getElementById("sectionTabs").innerHTML = `<button type="button" class="section-tab">Section 1: ${sections[0].section_name || "General"}</button>`;
    
    const { data: qData, error: qErr } = await supabaseClient.from("test_section_questions").select(`question_number, questions (id, content, options, correct_answer, explanation)`).eq("section_id", sections[0].id).order("question_number", { ascending: true });
    if (qErr || !qData?.length) throw new Error("Questions failed to load.");

    testQuestions = qData.map(item => {
      const q = Array.isArray(item.questions) ? item.questions[0] : item.questions; 
      if (!q) return null;
      let opts = []; 
      try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []); } catch(e) { opts = []; }
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
      testQuestions = shuffleArray(testQuestions);
      testQuestions.forEach((q, idx) => { q.qNum = idx + 1; });
    }

    userResponses = {}; 
    testQuestions.forEach((q, idx) => { 
      userResponses[idx] = { selected: null, status: idx === 0 ? 1 : 0, timeSpent: 0 }; 
    });
    renderQuestion(0); 
    startExamTimer();
  } catch (err) { 
    showAppNoticeModal("Assessment Error", "Cannot Launch Exam", err.message, "⚠️", "Back to Home", () => switchView("viewDashboard")); 
  }
};

window.abortExamSession = function() {
  const modal = document.getElementById("abortExamModal");
  if (modal) {
    modal.style.setProperty("display", "flex", "important");
    modal.style.pointerEvents = "auto";
  }
};

window.closeAbortExamModal = function() {
  const modal = document.getElementById("abortExamModal");
  if (modal) {
    modal.style.setProperty("display", "none", "important");
    modal.style.pointerEvents = "none";
  }
};

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

function renderScorecard() {
  let correct = 0, incorrect = 0, unattempted = 0, statsPayload = [];
  testQuestions.forEach((q, idx) => {
    const uAns = userResponses[idx].selected, st = userResponses[idx].status;
    if (!uAns) { 
      unattempted++; 
      statsPayload.push({ student_roll: currentCandidate.roll_number, subject: activeSubject || "General", question_id: q.id, question_data: q, isCorrect: false }); 
    } else if (isOptionMatching(uAns, q.correctAnswer)) { 
      correct++; 
      statsPayload.push({ student_roll: currentCandidate.roll_number, subject: activeSubject || "General", question_id: q.id, question_data: q, isCorrect: st !== 4 }); 
    } else { 
      incorrect++; 
      statsPayload.push({ student_roll: currentCandidate.roll_number, subject: activeSubject || "General", question_id: q.id, question_data: q, isCorrect: false }); 
    }
  });

  const actuallyAttemptedThisExam = correct + incorrect;
  const score = (correct * 2.00) - (incorrect * 0.50);
  const tSecs = Math.max(0, ((activeTest.total_duration_minutes || 15) * 60) - timeRemaining);
  const tMins = Math.ceil(tSecs / 60);

  const localAttemptRecord = {
    test_id: activeTest.id,
    score: score,
    total_correct: correct,
    total_incorrect: incorrect,
    time_spent_seconds: tSecs,
    attempt_date: new Date().toISOString()
  };
  userAttemptHistory.unshift(localAttemptRecord);

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
            <tr><td>Incorrect Answers</td><td style="color:var(--danger-dark); font-weight:bold;">${incorrect} (-${(incorrect * 0.5).toFixed(2)})</td></tr>
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
      const { error: insErr } = await supabaseClient.from("test_attempts").insert({ 
        student_roll: currentCandidate.roll_number, 
        test_id: activeTest.id, 
        score, 
        total_correct: correct, 
        total_incorrect: incorrect, 
        time_spent_seconds: tSecs 
      });
      if (insErr) throw insErr;

      const sMsg = document.getElementById("syncStatusMsg"); 
      if (sMsg) { 
        sMsg.style.color = "var(--success-dark)"; 
        sMsg.innerText = "✔ Progress & Metrics Synced Successfully"; 
      }

      if (activeTest.id > 0) {
        dailyPerf.total_questions_attempted = (dailyPerf.total_questions_attempted || 0) + actuallyAttemptedThisExam;
        const hit = dailyPerf.total_questions_attempted >= 100; 
        let nStreak = dailyPerf.streak_count || 0;
        if (hit && !dailyPerf.is_century_hit) { 
          nStreak += 1; 
          showAppNoticeModal("Daily Milestone", "Baseline Target Hit! 🔥", "You completed your 100-Question Target for today! Streak +1 secured.", "🎉", "Keep Going"); 
        }
        await supabaseClient.from("daily_performance").update({ 
          total_questions_attempted: dailyPerf.total_questions_attempted, 
          is_century_hit: hit, 
          streak_count: nStreak 
        }).eq("id", dailyPerf.id);
        dailyPerf.is_century_hit = hit; 
        dailyPerf.streak_count = nStreak;

        const tList = userPlaylists.find(p => p.playlist_name === 'Today');
        if (tList) {
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

window.closeExamAndReload = async function() { 
  closeExamModal(); 
  isExamFinished = true; 
  
  try {
    const { data: hist } = await supabaseClient
      .from("test_attempts")
      .select("test_id, score, total_correct, total_incorrect, attempt_date, time_spent_seconds")
      .eq("student_roll", currentCandidate.roll_number)
      .order("attempt_date", { ascending: false });
    if (hist && hist.length > 0) userAttemptHistory = hist;
  } catch (e) {
    console.error("Error refreshing attempt history:", e);
  }

  await fetchPlaylistsAndCheckRollover(); 
  await renderHomePlaylists(); 
  renderSubjectHubGrid(); 
  if (activeSubject) renderTopicSets(); 
  fetchStudentAnalytics(true); 
  switchView('viewDashboard'); 
};

window.openSolutionsView = function() {
  closeExamModal(); 
  document.getElementById("solExamTitle").innerText = activeTest?.title || "Assessment";
  switchView("viewSolutions", false); 
  history.replaceState({ view: 'viewSolutions' }, "", "#viewSolutions");
  const container = document.getElementById("solutionsContainer"); 
  if (!container) return; 
  container.innerHTML = "";
  testQuestions.forEach((q, idx) => {
    const uAns = userResponses[idx].selected;
    const isUserCorrect = uAns && isOptionMatching(uAns, q.correctAnswer);
    let sText = "Unattempted", sClass = "sol-status-unattempted";
    if (uAns) { 
      if (isUserCorrect) { sText = "Correct"; sClass = "sol-status-correct"; } 
      else { sText = "Incorrect"; sClass = "sol-status-incorrect"; } 
    }
    let expText = formatExplanation(q.explanation);
    let oHtml = (q.options || []).map(opt => {
      const oid = String(opt.id); 
      let oCls = "sol-option", ic = "⚪";
      if (isOptionMatching(oid, q.correctAnswer)) { oCls += " sol-opt-correct"; ic = "✔️"; } 
      else if (uAns && isOptionMatching(oid, uAns) && !isUserCorrect) { oCls += " sol-opt-wrong"; ic = "❌"; }
      return `<div class="${oCls}"><span>${ic}</span><span>${getLocalizedText({ en: opt.en || opt.text, hi: opt.hi })}</span></div>`;
    }).join("");
    const card = document.createElement("div"); 
    card.className = "solution-card"; 
    card.innerHTML = `<div class="sol-q-header"><span>Question ${q.qNum}</span><span class="sol-status-badge ${sClass}">${sText}</span></div><div class="sol-content">${getLocalizedText(q.content)}</div><div style="margin-bottom:16px;">${oHtml}</div><div class="sol-explanation"><strong>Explanation:</strong><br/>${expText}</div>`;
    container.appendChild(card);
  });
};

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
// 10. PERFORMANCE ANALYTICS & SMART HEATMAP BOUNDARY CLAMPING
// ==========================================================================
function drawSparkline(id, data, color) {
  const el = document.getElementById(id); 
  if (!el) return; 
  if (!data?.length) return el.innerHTML = '';
  const max = Math.max(...data, 1), len = Math.max(data.length - 1, 1), pts = data.map((v, i) => `${(i / len) * 60},${30 - ((v / max) * 25)}`).join(" ");
  el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 60 30" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

let _isFetchingStats = false;
window.fetchStudentAnalytics = async function(isSilent = false) {
  if (_isFetchingStats) return; 
  _isFetchingStats = true;
  try {
    const todayStr = getLocalDateString();
    const { data: atts } = await supabaseClient.from("test_attempts").select("test_id, score, total_correct, total_incorrect, attempt_date, time_spent_seconds").eq("student_roll", currentCandidate.roll_number).order("attempt_date", { ascending: true });
    const { data: attnd } = await supabaseClient.from("daily_attendance").select("study_date, total_minutes_spent").eq("student_roll", currentCandidate.roll_number);

    const bestMap = {}; 
    let totalSecs = 0, nCorr = 0, nIncorr = 0;
    (atts || []).forEach(a => {
      totalSecs += (a.time_spent_seconds || 0); 
      nCorr += (a.total_correct || 0); 
      nIncorr += (a.total_incorrect || 0);
      const tid = String(a.test_id); 
      if (!bestMap[tid] || parseFloat(a.score) > parseFloat(bestMap[tid].score)) bestMap[tid] = a;
    });

    const subStats = {}, masteredTests = new Set(), accTrends = [];
    Object.values(bestMap).forEach(a => {
      const cat = catalogData.find(item => String(item.test_id) === String(a.test_id)), tQs = cat ? (cat.total_questions || (a.total_correct + a.total_incorrect)) : (a.total_correct + a.total_incorrect);
      const maxM = tQs * 2, pct = maxM > 0 ? Math.max(0, (a.score / maxM) * 100) : 0;
      if (pct >= 100) masteredTests.add(String(a.test_id));
      accTrends.push(Math.round(pct));
      const subj = cat ? (cat.subject || "General") : "General";
      if (!subStats[subj]) subStats[subj] = { earned: 0, max: 0, correct: 0, incorrect: 0, sets: 0 };
      subStats[subj].earned += parseFloat(a.score); 
      subStats[subj].max += maxM; 
      subStats[subj].correct += (a.total_correct || 0); 
      subStats[subj].incorrect += (a.total_incorrect || 0); 
      subStats[subj].sets += 1;
    });

    const totalQ = nCorr + nIncorr, accVal = totalQ > 0 ? ((nCorr / totalQ) * 100).toFixed(1) : "0.0", avgSpd = totalQ > 0 ? Math.round(totalSecs / totalQ) : 0;
    let todayMins = 0, last7Mins = 0, attMap = {}, past7 = [];
    for (let i = 0; i < 7; i++) { 
      let dt = new Date(); 
      dt.setDate(dt.getDate() - i); 
      past7.push(getLocalDateString(dt)); 
    }
    (attnd || []).forEach(r => { 
      const m = r.total_minutes_spent || 0; 
      attMap[r.study_date] = m; 
      if (r.study_date === todayStr) todayMins = m; 
      if (past7.includes(r.study_date)) last7Mins += m; 
    });

    const streak = dailyPerf.streak_count || 0;
    ['headerStreakCount', 'headerStreakCount_lib', 'headerStreakCount_stats', 'headerStreakCount_prof'].forEach(id => { 
      const el = document.getElementById(id); 
      if (el) el.innerText = streak + (window.innerWidth <= 768 ? "" : " Days"); 
    });
    ['headerAccuracyCount', 'headerAccuracyCount_lib', 'headerAccuracyCount_stats', 'headerAccuracyCount_prof'].forEach(id => { 
      const el = document.getElementById(id); 
      if (el) el.innerText = accVal + "%"; 
    });

    if (isSilent) { 
      _isFetchingStats = false; 
      return; 
    }

    const eAcc = document.getElementById("statAccuracy"); 
    if (eAcc) eAcc.innerHTML = `<div style="display:flex; align-items:baseline; gap:6px;"><span>${accVal}%</span><span style="font-size:10px; font-weight:700; color:var(--success-dark); font-family:var(--font-family);">+${nCorr}</span><span style="font-size:10px; font-weight:700; color:var(--danger-dark); font-family:var(--font-family);">-${nIncorr}</span></div>`;
    const eStr = document.getElementById("statStreak"); 
    if (eStr) eStr.innerHTML = `<div style="display:flex; align-items:baseline; gap:6px;"><span>${streak} 🔥</span><span style="font-size:10px; font-weight:700; color:var(--tcs-blue-accent); font-family:var(--font-family); text-transform:uppercase;">${streak > 2 ? 'Consistent' : 'Starting'}</span></div>`;
    const eSpd = document.getElementById("statSpeed"); 
    if (eSpd) eSpd.innerHTML = `<div style="display:flex; align-items:baseline; gap:6px;"><span>${avgSpd}s</span><span style="font-size:10px; font-weight:700; color:var(--tcs-blue-accent); font-family:var(--font-family); text-transform:uppercase;">${avgSpd <= 15 ? 'Rapid' : (avgSpd > 35 ? 'Thorough' : 'Balanced')}</span></div>`;

    drawSparkline("sparkAccuracy", accTrends.slice(-10), "var(--tcs-blue-accent)");
    drawSparkline("sparkStreak", Object.keys(attMap).sort((a,b) => new Date(a) - new Date(b)).slice(-10).map(d => attMap[d] || 0), "var(--warning)");
    drawSparkline("sparkSpeed", accTrends.slice(-10).map(() => avgSpd), "var(--success)");

    const extra = document.getElementById("extraAnalyticsSummary");
    if (extra) {
      const dots = past7.slice().reverse().map(d => {
        const act = (attMap[d] || 0) > 0, lbl = new Date(d).toLocaleDateString('en-US', { weekday: 'narrow' });
        return `<div style="display:flex; flex-direction:column; align-items:center; gap:3px;"><span style="font-size:9px; color:var(--text-muted); font-weight:700;">${lbl}</span><span style="width:18px; height:18px; border-radius:50%; background:${act ? 'var(--tcs-blue-accent)' : 'var(--border-color)'}; color:${act ? '#fff' : 'var(--text-muted)'}; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800;">${act ? '✓' : '•'}</span></div>`;
      }).join("");
      extra.innerHTML = `
        <div class="profile-section-card" style="padding:16px; border-left:4px solid var(--success);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h4 style="font-size:13.5px; font-weight:700; color:var(--tcs-blue-header); margin:0;">🎯 Today's Focus & Output</h4>
            <span style="font-size:10px; font-weight:800; background:var(--success-bg-subtle); color:var(--success-dark); padding:2px 8px; border-radius:12px;">ACTIVE SESSION</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
            <div style="background:var(--bg-primary); padding:10px; border-radius:6px; border:1px solid var(--border-color);">
              <span style="font-size:11px; color:var(--text-muted); font-weight:600; display:block;">Time Invested</span>
              <strong style="font-size:16px; color:var(--success-dark); font-family:var(--font-mono);">${Math.floor(todayMins / 60)}h ${todayMins % 60}m</strong>
            </div>
            <div style="background:var(--bg-primary); padding:10px; border-radius:6px; border:1px solid var(--border-color);">
              <span style="font-size:11px; color:var(--text-muted); font-weight:600; display:block;">Sets Mastered (100%)</span>
              <strong style="font-size:16px; color:var(--success-dark); font-family:var(--font-mono);">${masteredTests.size} Sets</strong>
            </div>
          </div>
        </div>
        <div class="profile-section-card" style="padding:16px; border-left:4px solid var(--tcs-blue-accent);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h4 style="font-size:13.5px; font-weight:700; color:var(--tcs-blue-header); margin:0;">📊 Weekly Consistency Track</h4>
            <span style="font-size:11px; font-weight:700; color:var(--tcs-blue-accent); font-family:var(--font-mono);">${Object.keys(attMap).filter(d => past7.includes(d)).length} / 7 Days Active</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 6px; margin:8px 0; background:var(--bg-primary); border-radius:6px; border:1px solid var(--border-color);">${dots}</div>
          <div style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--text-muted); margin-top:4px;">
            <span>Total: <strong style="color:var(--tcs-blue-accent); font-family:var(--font-mono);">${Math.floor(last7Mins / 60)}h ${last7Mins % 60}m</strong></span>
            <span>Daily Pace: <strong style="color:var(--tcs-blue-accent); font-family:var(--font-mono);">${Math.round(last7Mins / 7)}m / day</strong></span>
          </div>
        </div>
      `;
    }

    const sylPct = Math.min(100, Math.round((masteredTests.size / (catalogData.length || 1)) * 100));
    const eSyl = document.getElementById("syllabusPercentTxt"); if (eSyl) eSyl.innerText = sylPct + "%";
    const lFill = document.getElementById("syllabusLinearFill"); if (lFill) lFill.style.width = sylPct + "%";

    let bestSub = null, worstSub = null;
    Object.entries(subStats).forEach(([name, data]) => {
      const acc = data.max > 0 ? (data.earned / data.max) * 100 : 0, info = { name, acc, ...data };
      if (!bestSub || info.acc > bestSub.acc) bestSub = info; 
      if (!worstSub || info.acc < worstSub.acc) worstSub = info;
    });

    const iS = document.getElementById("insightStrong"); 
    if (iS) iS.innerHTML = bestSub?.sets > 0 ? `<div style="display:flex; justify-content:space-between; align-items:center;"><strong>🔥 Strongest Domain: ${bestSub.name}</strong><span style="font-weight:800; font-family:var(--font-mono); color:var(--success-dark);">${Math.round(bestSub.acc)}%</span></div><div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">High strike-rate across ${bestSub.sets} completed sets (${bestSub.correct} correct answers).</div>` : `<strong>🔥 Strongest:</strong> Complete sets to identify your core strength.`;
    const iW = document.getElementById("insightWeak"); 
    if (iW) iW.innerHTML = worstSub?.sets > 0 ? `<div style="display:flex; justify-content:space-between; align-items:center;"><strong>⚠️ Priority Focus: ${worstSub.name}</strong><span style="font-weight:800; font-family:var(--font-mono); color:var(--danger-dark);">${Math.round(worstSub.acc)}%</span></div><div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">Negative marking penalty: <strong style="color:var(--danger-dark);">-${(worstSub.incorrect * 0.5).toFixed(1)} Marks</strong> (${worstSub.incorrect} wrong). Curtail random guesses.</div>` : `<strong>⚠️ Priority Focus:</strong> Attempt diagnostic assessments to flag weaker domains.`;

    const subList = Array.from(new Set(catalogData.map(c => c.subject || "General Studies"))).map(s => {
      const st = subStats[s] || { earned: 0, max: 0, sets: 0 }; 
      return { subject: s, pct: st.max > 0 ? Math.max(0, Math.round((st.earned / st.max) * 100)) : 0 };
    });
    const gView = document.getElementById("gridViewport");
    if (gView) { 
      gView.innerHTML = ""; 
      subList.forEach(item => { 
        gView.innerHTML += `<div class="micro-domain-chip"><div class="micro-chip-top"><span class="micro-chip-title" title="${item.subject}">${item.subject}</span><span class="micro-chip-val">${item.pct}%</span></div><div class="micro-chip-bar"><div class="micro-chip-fill" style="width: ${item.pct}%;"></div></div></div>`; 
      }); 
    }

    const rCanvas = document.getElementById("subjectRadarChart");
    if (rCanvas && window.Chart) {
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
    renderHeatmap(attMap);
  } catch (err) { 
    console.error("Analytics Error:", err); 
  } finally { 
    _isFetchingStats = false; 
  }
};

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
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    let d = new Date(today); 
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d), 
          displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const mins = attMap[dateStr] || 0, cell = document.createElement("div"); 
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
        <div style="font-size:12.5px; font-family:var(--font-mono); font-weight:800; color:${mins > 45 ? 'var(--success)' : (mins > 0 ? 'var(--tcs-blue-accent)' : 'var(--text-muted)')};">⏱️ ${mins === 0 ? 'No activity' : (h > 0 ? `${h}h${rm}m` : `${rm} mins`)}</div>
      `;
      tooltip.classList.add("show"); 
      
      const r = cell.getBoundingClientRect(); 
      const tipWidth = tooltip.offsetWidth || 135;
      const tipHeight = tooltip.offsetHeight || 42;
      const halfTip = tipWidth / 2;
      
      let idealLeft = r.left + (r.width / 2);
      if (idealLeft - halfTip < 14) {
        idealLeft = halfTip + 14;
      } else if (idealLeft + halfTip > window.innerWidth - 14) {
        idealLeft = window.innerWidth - halfTip - 14;
      }
      
      let idealTop = r.top - tipHeight - 8;
      if (idealTop < 8) {
        idealTop = r.bottom + 8;
      }
      
      tooltip.style.left = `${idealLeft}px`; 
      tooltip.style.top = `${idealTop}px`; 
      tooltip.style.transform = `translate(-50%, 0)`;
    };
    cell.onmouseleave = () => tooltip.classList.remove("show");
    container.appendChild(cell);
  }
}

// ==========================================================================
// 11. MULTI-MODE PRACTICE (READ/FLASHCARD/QUIZ - REFINED TOP BARS)
// ==========================================================================
window.scrollToTopOfPractice = function() {
  const container = document.getElementById("practiceContainer");
  if (container) {
    container.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const viewPractice = document.getElementById("viewPractice");
  if (viewPractice) {
    viewPractice.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.launchPracticeMode = async function(testId, mode) {
  const { data: tInfo } = await supabaseClient.from("tests").select("id, title").eq("id", testId).single();
  const { data: sections } = await supabaseClient.from("test_sections").select("id").eq("test_id", testId).limit(1); 
  if (!sections?.length) return;
  const { data: qData } = await supabaseClient.from("test_section_questions").select(`question_number, questions (id, content, options, correct_answer, explanation)`).eq("section_id", sections[0].id).order("question_number", { ascending: true });

  practiceQuestions = qData.map(item => {
    const q = Array.isArray(item.questions) ? item.questions[0] : item.questions; 
    if (!q) return null;
    let opts = []; 
    try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []); } catch(e) { opts = []; }
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

  const tEl = document.getElementById("practiceSetTitle"); 
  if (tEl) tEl.innerText = tInfo ? tInfo.title : "Practice Set";
  const mEl = document.getElementById("practiceModeTitle"); 
  if (mEl) mEl.innerText = mode === "read" ? "📖 READ MODE" : (mode === "quiz" ? "⚡ INSTANT QUIZ" : "🗂️ FLASHCARDS");

  switchView("viewPractice",true);
  if (mode === "read") renderReadMode(); 
  else if (mode === "quiz") renderInteractiveQuizMode(); 
  else { flashcardIndex = 0; renderFlashcardMode(); }
};

function renderReadMode() {
  const mEl = document.getElementById("practiceModeTitle"); 
  if (mEl) mEl.innerText = "📖 READ MODE";
  localReadState = { starred: new Set(), filter: "all" }; 
  renderReadUI();
}

function renderReadUI() {
  const container = document.getElementById("practiceContainer"); 
  if (!container) return; 
  container.innerHTML = "";

  const totalQ = practiceQuestions.length;
  const stCount = localReadState.starred.size;

  const banner = document.createElement("div"); 
  banner.className = "quiz-score-banner";
  banner.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h4 style="margin:0; font-size:15px; font-weight:800; color:var(--tcs-blue-header);">📖 Read Mode Filter</h4>
      <span style="font-size:11px; font-weight:800; background:var(--tcs-blue-bg-subtle); color:var(--tcs-blue-accent); padding:3px 10px; border-radius:12px;">UNOFFICIAL / IN-MEMORY</span>
    </div>
    <div class="quiz-score-grid">
      <div class="quiz-score-item stat-item-score"><span class="label">Total</span><span class="value" style="color:var(--tcs-blue-accent);">${totalQ}</span></div>
      <div class="quiz-score-item stat-item-starred"><span class="label">Starred ⭐</span><span class="value" style="color:var(--warning-dark);">${stCount}</span></div>
    </div>
    <div class="quiz-filter-strip">
      <button type="button" class="quiz-chip-btn ${localReadState.filter === 'all' ? 'active' : ''}" onclick="filterReadMode('all')">All (${totalQ})</button>
      <button type="button" class="quiz-chip-btn chip-starred ${localReadState.filter === 'starred' ? 'active' : ''}" onclick="filterReadMode('starred')"><span>⭐</span> Starred (${stCount})</button>
    </div>
  `;
  container.appendChild(banner);

  let renderedCount = 0;
  practiceQuestions.forEach((q, idx) => {
    const isSt = localReadState.starred.has(idx); 
    if (localReadState.filter === 'starred' && !isSt) return; 
    renderedCount++;

    let oHtml = (q.options || []).map(opt => `<div class="sol-option ${isOptionMatching(opt.id, q.correctAnswer) ? 'sol-opt-correct' : ''}" style="margin-bottom:6px;"><span>${isOptionMatching(opt.id, q.correctAnswer) ? '✔' : '•'}</span><span>${getLocalizedText({ en: opt.en || opt.text, hi: opt.hi })}</span></div>`).join("");
    const card = document.createElement("div"); 
    card.className = "solution-card"; 
    card.id = `readCard_${idx}`; 
    card.style.marginBottom = "16px";
    card.innerHTML = `
      <div class="sol-q-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <span>Q${q.qNum}. Question</span>
        </div>
        <button type="button" class="btn-star-q ${isSt ? 'starred' : ''}" onclick="toggleReadStar(${idx})">${isSt ? '★' : '☆'}</button>
      </div>
      <div class="sol-content">${getLocalizedText(q.content)}</div>
      <div>${oHtml}</div>
      <div class="sol-explanation"><strong>Explanation:</strong><br/>${formatExplanation(q.explanation)}</div>
    `;
    container.appendChild(card);
  });

  if (renderedCount === 0 && localReadState.filter === 'starred') {
    const emptyNotice = document.createElement("div");
    emptyNotice.style.cssText = "text-align:center; padding:30px 16px; color:var(--text-muted); font-size:13px; font-weight:600;";
    emptyNotice.innerText = "No starred questions yet. Click ☆ on any question above to star it for quick revision.";
    container.appendChild(emptyNotice);
  }

  const foot = document.createElement("div");
  foot.className = "read-footer-actions";
  foot.innerHTML = `
    <button type="button" class="btn-scroll-top" onclick="scrollToTopOfPractice()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
      <span>Back to Top</span>
    </button>
  `;
  container.appendChild(foot);
}

window.toggleReadStar = function(idx) { 
  const isStarred = localReadState.starred.has(idx);
  if (isStarred) {
    localReadState.starred.delete(idx);
  } else {
    localReadState.starred.add(idx);
  }
  const nowStarred = localReadState.starred.has(idx);

  const card = document.getElementById(`readCard_${idx}`);
  if (card) {
    const btn = card.querySelector(".btn-star-q");
    if (btn) {
      btn.classList.toggle("starred", nowStarred);
      btn.innerHTML = nowStarred ? "★" : "☆";
    }
  }

  const starStat = document.querySelector(".quiz-score-item.stat-item-starred .value");
  if (starStat) starStat.innerText = `${localReadState.starred.size}`;

  const starBtn = document.querySelector(".quiz-chip-btn.chip-starred");
  if (starBtn) starBtn.innerHTML = `<span>⭐</span> Starred (${localReadState.starred.size})`;

  if (localReadState.filter === 'starred' && !nowStarred && card) {
    card.style.display = "none";
  } else if (localReadState.filter === 'starred' && nowStarred && card) {
    card.style.display = "block";
  }
};

window.filterReadMode = function(t) { 
  localReadState.filter = t; 
  renderReadUI(); 
};

function renderInteractiveQuizMode() {
  const mEl = document.getElementById("practiceModeTitle"); 
  if (mEl) mEl.innerText = "⚡ INSTANT QUIZ";
  localQuizState = { answers: {}, starred: new Set(), isFinished: false, filter: "all" }; 
  renderQuizUI();
}

function renderQuizUI() {
  const container = document.getElementById("practiceContainer"); 
  if (!container) return; 
  container.innerHTML = "";
  const isMB = (document.getElementById("practiceSetTitle")?.innerText || "").includes("Mistake Bank");

  if (localQuizState.isFinished) {
    const totalQ = practiceQuestions.length, attCount = Object.keys(localQuizState.answers).length, unattCount = totalQ - attCount;
    let corrCount = 0, wrCount = 0; 
    Object.values(localQuizState.answers).forEach(a => { if (a.isCorrect) corrCount++; else wrCount++; });
    const score = (corrCount * 2.00) - (wrCount * 0.50), acc = attCount > 0 ? Math.round((corrCount / attCount) * 100) : 0, stCount = localQuizState.starred.size;
    
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
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="margin:0; font-size:15px; font-weight:800; color:var(--tcs-blue-header);">📊 Session Review</h4>
        <span style="font-size:11px; font-weight:800; background:var(--tcs-blue-bg-subtle); color:var(--tcs-blue-accent); padding:3px 10px; border-radius:12px;">UNOFFICIAL / IN-MEMORY</span>
      </div>
      <div class="quiz-score-grid">
        ${isMB ? `
          <div class="quiz-score-item stat-item-score"><span class="label">Attempted</span><span class="value" style="color:var(--tcs-blue-accent);">${attCount}</span></div>
          <div class="quiz-score-item stat-item-unattempted"><span class="label">Unattempted</span><span class="value" style="color:var(--text-muted);">${unattCount}</span></div>
          <div class="quiz-score-item stat-item-promoted"><span class="label">Promoted</span><span class="value" style="color:var(--success-dark);">${corrCount} ✅</span></div>
          <div class="quiz-score-item stat-item-demoted"><span class="label">Demoted</span><span class="value" style="color:var(--danger-dark);">${wrCount} ⚠️</span></div>
        ` : `
          <div class="quiz-score-item stat-item-score"><span class="label">Score</span><span class="value" style="color:var(--tcs-blue-accent);">${score.toFixed(2)}</span></div>
          <div class="quiz-score-item stat-item-unattempted"><span class="label">Unattempted</span><span class="value" style="color:var(--text-muted);">${unattCount}</span></div>
          <div class="quiz-score-item stat-item-correct"><span class="label">Correct</span><span class="value" style="color:var(--success-dark);">+${corrCount}</span></div>
          <div class="quiz-score-item stat-item-incorrect"><span class="label">Incorrect</span><span class="value" style="color:var(--danger-dark);">-${wrCount}</span></div>
        `}
        <div class="quiz-score-item stat-item-starred"><span class="label">Starred ⭐</span><span class="value" style="color:var(--warning-dark);">${stCount}</span></div>
        <div class="quiz-score-item stat-item-accuracy"><span class="label">Accuracy</span><span class="value" style="color:var(--c-review);">${acc}%</span></div>
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
    const isAns = localQuizState.answers[idx] !== undefined, isWr = isAns && !localQuizState.answers[idx].isCorrect, isSt = localQuizState.starred.has(idx), sAns = localQuizState.answers[idx];
    
    if (localQuizState.isFinished) { 
      const isUnatt = !isAns;
      if (localQuizState.filter === 'wrong' && !isWr) return; 
      if (localQuizState.filter === 'starred' && !isSt) return; 
      if (localQuizState.filter === 'priority' && !(isWr || isSt || isUnatt)) return;
    }

    const card = document.createElement("div"); 
    card.className = "solution-card"; 
    card.id = `quizCard_${idx}`; 
    card.style.marginBottom = "20px";
    
    let oHtml = (q.options || []).map(opt => {
      const oid = String(opt.id); 
      let oCls = "option-row";
      let feedbackSymbol = "";
      if (sAns) { 
        if (isOptionMatching(oid, q.correctAnswer)) {
          oCls += " sol-opt-correct"; 
          feedbackSymbol = `<span class="opt-feedback-indicator" style="margin-left:auto; font-weight:800; font-size:16px; color:var(--success-dark);">✔</span>`;
        } else if (isOptionMatching(oid, sAns.selected) && !sAns.isCorrect) {
          oCls += " sol-opt-wrong"; 
          feedbackSymbol = `<span class="opt-feedback-indicator" style="margin-left:auto; font-weight:800; font-size:16px; color:var(--danger-dark);">✖</span>`;
        }
      }
      return `<div class="${oCls} quiz-opt-${idx}" data-opt-id="${opt.id}" style="${sAns ? 'pointer-events:none;' : 'cursor:pointer;'} margin-bottom: 8px;">
        <span style="font-weight:700; min-width:20px;">${opt.id}.</span>
        <span style="flex:1;">${getLocalizedText({ en: opt.en || opt.text, hi: opt.hi })}</span>
        ${feedbackSymbol}
      </div>`;
    }).join("");

    card.innerHTML = `
      <div class="sol-q-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <span>Q${q.qNum}</span>
          ${sAns ? `<span id="quizBadge_${idx}" class="sol-status-badge ${sAns.isCorrect ? 'sol-status-correct' : 'sol-status-incorrect'}">${sAns.isCorrect ? 'Correct' : 'Incorrect'}</span>` : `<span id="quizBadge_${idx}" class="sol-status-badge" style="display:none;"></span>`}
        </div>
        <button type="button" class="btn-star-q ${isSt ? 'starred' : ''}" onclick="toggleQuizStar(${idx})">${isSt ? '★' : '☆'}</button>
      </div>
      <div class="sol-content">${getLocalizedText(q.content)}</div>
      <div id="quizOpts_${idx}">${oHtml}</div>
      <div id="quizExp_${idx}" class="sol-explanation" style="display:${sAns ? 'block' : 'none'};"><strong>Explanation:</strong><br/>${formatExplanation(q.explanation)}</div>
    `;
    container.appendChild(card);

    if (!sAns) {
      card.querySelectorAll(`.quiz-opt-${idx}`).forEach(row => {
        row.onclick = async () => {
          const selId = row.getAttribute("data-opt-id");
          const isC = isOptionMatching(selId, q.correctAnswer);
          localQuizState.answers[idx] = { selected: selId, isCorrect: isC };

          const badge = document.getElementById(`quizBadge_${idx}`);
          if (badge) {
            badge.style.display = "inline-block";
            badge.className = `sol-status-badge ${isC ? 'sol-status-correct' : 'sol-status-incorrect'}`;
            badge.innerText = isC ? 'Correct' : 'Incorrect';
          }

          card.querySelectorAll(`.quiz-opt-${idx}`).forEach(el => { 
            el.style.pointerEvents = "none"; 
            const optVal = el.getAttribute("data-opt-id");
            if (isOptionMatching(optVal, q.correctAnswer)) {
              el.classList.remove("sol-opt-wrong");
              el.classList.add("sol-opt-correct");
              if (!el.querySelector(".opt-feedback-indicator")) {
                const ind = document.createElement("span");
                ind.className = "opt-feedback-indicator";
                ind.style.cssText = "margin-left:auto; font-weight:800; font-size:16px; color:var(--success-dark);";
                ind.innerText = "✔";
                el.appendChild(ind);
              }
            } else if (isOptionMatching(optVal, selId) && !isC) {
              el.classList.add("sol-opt-wrong");
              if (!el.querySelector(".opt-feedback-indicator")) {
                const ind = document.createElement("span");
                ind.className = "opt-feedback-indicator";
                ind.style.cssText = "margin-left:auto; font-weight:800; font-size:16px; color:var(--danger-dark);";
                ind.innerText = "✖";
                el.appendChild(ind);
              }
            }
          });

          const exp = document.getElementById(`quizExp_${idx}`); 
          if (exp) exp.style.display = "block";

          if (isMB) await syncMistakeBank([{ student_roll: currentCandidate.roll_number, subject: activeSubject || "General", question_id: q.id, question_data: q, isCorrect: isC }]);
        };
      });
    }
  });

  if (!localQuizState.isFinished) {
    const f = document.createElement("div"); 
    f.className = "quiz-footer-actions";
    f.innerHTML = `<button type="button" class="btn-finish-quiz" onclick="finishQuizSession()"><span>🏁</span> Finish & Review Score</button>`;
    container.appendChild(f);
  }
}

window.toggleQuizStar = function(idx) { 
  const isStarred = localQuizState.starred.has(idx);
  if (isStarred) {
    localQuizState.starred.delete(idx);
  } else {
    localQuizState.starred.add(idx);
  }
  const nowStarred = localQuizState.starred.has(idx);

  const card = document.getElementById(`quizCard_${idx}`);
  if (card) {
    const btn = card.querySelector(".btn-star-q");
    if (btn) {
      btn.classList.toggle("starred", nowStarred);
      btn.innerHTML = nowStarred ? "★" : "☆";
    }
  }

  if (localQuizState.isFinished) {
    const starStat = document.querySelector(".quiz-score-item.stat-item-starred .value");
    if (starStat) starStat.innerText = `${localQuizState.starred.size}`;

    let priorityCount = 0;
    practiceQuestions.forEach((q, i) => {
      const isAns = localQuizState.answers[i] !== undefined;
      const isWr = isAns && !localQuizState.answers[i].isCorrect;
      const isSt = localQuizState.starred.has(i);
      const isUnatt = !isAns;
      if (isWr || isSt || isUnatt) priorityCount++;
    });

    const prioBtn = document.querySelector(".quiz-chip-btn.chip-priority");
    if (prioBtn) prioBtn.innerHTML = `<span>⚡</span> Priority (${priorityCount})`;
    const starBtn = document.querySelector(".quiz-chip-btn.chip-starred");
    if (starBtn) starBtn.innerHTML = `<span>⭐</span> Starred (${localQuizState.starred.size})`;

    if (localQuizState.filter === 'starred' && !nowStarred && card) {
      card.style.display = "none";
    } else if (localQuizState.filter === 'starred' && nowStarred && card) {
      card.style.display = "block";
    }
  }
};

window.finishQuizSession = function() {
  localQuizState.isFinished = true; 
  localQuizState.filter = "all";
  renderQuizUI(); 
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.filterQuizReview = function(t) { 
  localQuizState.filter = t; 
  renderQuizUI(); 
};

function renderFlashcardMode() {
  const mEl = document.getElementById("practiceModeTitle"); 
  if (mEl) mEl.innerText = "🗂️ FLASHCARDS";
  const container = document.getElementById("practiceContainer"); 
  if (!container) return;
  const q = practiceQuestions[flashcardIndex];
  const cOpt = (q.options || []).find(o => isOptionMatching(o.id, q.correctAnswer));
  const cText = cOpt ? getLocalizedText({ en: cOpt.en || cOpt.text, hi: cOpt.hi }) : "";
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;"><span style="font-weight:700; color:var(--text-muted);">Card ${flashcardIndex + 1} of ${practiceQuestions.length}</span><span style="font-size:12px; color:var(--tcs-blue-accent);">Tap card to reveal Answer</span></div>
    <div id="flashcardBox" style="min-height:280px; background:var(--bg-panel); border:2px solid var(--border-color); border-radius:8px; padding:30px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; cursor:pointer; box-shadow:var(--shadow-sm); transition:all 0.2s ease; color:var(--text-main);">
      <div id="cardFront"><span class="login-badge" style="margin-bottom:14px;">QUESTION</span><h3 style="font-size:18px; line-height:1.5; color:inherit;">${getLocalizedText(q.content)}</h3></div>
      <div id="cardBack" style="display:none; width:100%;"><span class="login-badge" style="background:var(--success-bg-subtle); color:var(--success-dark); border-color:var(--success-border); margin-bottom:14px;">CORRECT ANSWER</span><h4 style="font-size:17px; color:var(--success-dark); margin-bottom:12px;">${cText}</h4><div class="sol-explanation" style="text-align:left; margin-top:10px;"><strong>Explanation:</strong><br/>${formatExplanation(q.explanation)}</div></div>
    </div>
    <div style="display:flex; justify-content:space-between; margin-top:20px;"><button type="button" class="tcs-btn btn-secondary" ${flashcardIndex === 0 ? 'disabled' : ''} id="btnPrevCard">← Previous</button><button type="button" class="tcs-btn btn-primary" ${flashcardIndex === practiceQuestions.length - 1 ? 'disabled' : ''} id="btnNextCard">Next →</button></div>
  `;
  document.getElementById("flashcardBox")?.addEventListener("click", () => { 
    const f = document.getElementById("cardFront"), b = document.getElementById("cardBack"); 
    if (f && b) { 
      const isF = f.style.display !== "none"; 
      f.style.display = isF ? "none" : "block"; 
      b.style.display = isF ? "block" : "none"; 
    } 
  });
  document.getElementById("btnPrevCard")?.addEventListener("click", () => { if (flashcardIndex > 0) { flashcardIndex--; renderFlashcardMode(); } });
  document.getElementById("btnNextCard")?.addEventListener("click", () => { if (flashcardIndex < practiceQuestions.length - 1) { flashcardIndex++; renderFlashcardMode(); } });
}

// ==========================================================================
// 12. ELEGANT MOBILE APP EXIT DIALOG CONTROLLER (ZERO ABOUT:BLANK WINDOW)
// ==========================================================================
window.showExitConfirmModal = function() {
  isExitingApp = false;
  const modal = document.getElementById('exitConfirmModal');
  if (modal) {
    modal.style.setProperty("display", "flex", "important");
    modal.style.pointerEvents = "auto";
  }
};

window.closeExitConfirmModal = function() {
  isExitingApp = false;
  const modal = document.getElementById('exitConfirmModal');
  if (modal) {
    modal.style.setProperty("display", "none", "important");
    modal.style.pointerEvents = "none";
  }
  if (!history.state || history.state.page === 'exit-gate') {
    history.pushState({ page: 'dashboard', view: 'viewDashboard' }, '', '#viewDashboard');
  }
};

window.confirmExitApp = function() {
  const modal = document.getElementById('exitConfirmModal');
  if (modal) {
    modal.style.setProperty("display", "none", "important");
    modal.style.pointerEvents = "none";
  }
  
  if (window.navigator && window.navigator.app && typeof window.navigator.app.exitApp === "function") {
    window.navigator.app.exitApp();
    return;
  }
  
  isExitingApp = true;
  window.close();
  
  setTimeout(() => {
    if (window.history.length > 1) {
      window.history.go(-(window.history.length - 1));
    } else {
      window.location.replace("about:blank");
    }
  }, 100);
};