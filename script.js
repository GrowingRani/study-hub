// ==========================================================================
// 1. CONFIGURATION & SUPABASE INITIALIZATION
// ==========================================================================
const SUPABASE_URL = "https://hqrbqqdjbswbvfhhqefw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcmJxcWRqYnN3YnZmaGhxZWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjI5ODgsImV4cCI6MjEwNzAzODk4OH0.iTay17X_Ysep1r-NLPSWpAzlQF-fmBb0sw1v7ptsdpE";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================================================
// 2. UNIVERSAL ANSWER NORMALIZATION
// ==========================================================================
function getNormalizedCorrectAnswerId(rawAnswer, optionsArray) {
  if (!optionsArray || !Array.isArray(optionsArray)) return String(rawAnswer || "");
  
  let ca = "";
  if (typeof rawAnswer === "object" && rawAnswer !== null) {
      ca = String(rawAnswer.en || rawAnswer.text || rawAnswer.id || "").trim().toUpperCase();
  } else {
      ca = String(rawAnswer || "").trim();
      if (ca.startsWith("{") && ca.endsWith("}")) {
          try {
              let parsed = JSON.parse(ca);
              ca = String(parsed.en || parsed.text || parsed.id || "").trim().toUpperCase();
          } catch(e) {
              ca = ca.toUpperCase();
          }
      } else {
          ca = ca.toUpperCase();
      }
  }

  let matchedOpt = optionsArray.find(o => {
    let oid = String(o.id).trim().toUpperCase();
    let otext = String(o.en || o.text || "").trim().toUpperCase();
    return oid === ca ||
           otext === ca ||
           (ca === 'A' && oid === '1') || (ca === 'B' && oid === '2') ||
           (ca === 'C' && oid === '3') || (ca === 'D' && oid === '4') ||
           (ca === '1' && oid === 'A') || (ca === '2' && oid === 'B') ||
           (ca === '3' && oid === 'C') || (ca === '4' && oid === 'D') ||
           o.isCorrect === true || o.is_correct === true;
  });
  
  return matchedOpt ? String(matchedOpt.id) : (ca || String(rawAnswer));
}

// ==========================================================================
// 3. GLOBAL STATE & APPLICATION ROUTING
// ==========================================================================
let currentCandidate = null;
let catalogData = [];
let activeSubject = null;
let userAttemptHistory = [];
let userWeakQuestions = []; 
let currentLang = "en";
let currentFilter = "all";

// Playlist States
let userPlaylists = [];
let userPlaylistItems = [];
let dailyPerf = { total_questions_attempted: 0, is_century_hit: false, streak_count: 0, id: null };
let selectedTestForPlaylist = null;
let currentThreeDotsTestId = null;

// Library Selection Mode States
let librarySelectionMode = false;
let targetPlaylistForSelection = null; 
let selectedSetsForBatch = new Set(); 

let activeTest = null;
let testQuestions = [];
let practiceQuestions = [];
let currentIndex = 0;
let flashcardIndex = 0;
let userResponses = {};
let timeRemaining = 15 * 60;
let timerInterval = null;
let isExamFinished = false; 

let subjectRadarChartInstance = null;
let alertEngineStarted = false;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(err => console.error("SW Error:", err));
  });
}

function getLocalizedText(obj) {
  let text = "";
  if (typeof obj === "object" && obj !== null) {
    if (currentLang === "hi") {
      text = obj.hi ? obj.hi : (obj.en + "\n\n*(यह सामग्री अभी हिंदी में उपलब्ध नहीं है)*");
    } else {
      text = obj.en || JSON.stringify(obj);
    }
  } else {
    text = String(obj || "");
  }

  if (typeof text === "string") {
    text = text.replace(/\\n/g, "\n");
  }
  return text;
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
      bottomNav.style.display = (window.innerWidth <= 768 && (activeView === 'viewDashboard' || activeView === 'viewLibrary' || activeView === 'viewAnalytics')) ? 'flex' : 'none';
    }
  });
});

function updateDesktopNav(viewId) {
  document.querySelectorAll('.desk-nav-btn').forEach(btn => {
    btn.classList.remove('active');
    const id = btn.id || "";
    if (viewId === 'viewDashboard' && id.includes('Home')) btn.classList.add('active');
    if (viewId === 'viewLibrary' && id.includes('Lib')) btn.classList.add('active');
    if (viewId === 'viewAnalytics' && id.includes('Stats')) btn.classList.add('active');
  });
}

window.switchView = function(viewId, pushHistory = true) {
  const currentActiveView = Array.from(document.querySelectorAll('.view-screen')).find(v => v.style.display === 'flex')?.id;
  if (currentActiveView === viewId) return;

  if (pushHistory && (viewId === 'viewDashboard' || viewId === 'viewLibrary') && ['viewPractice', 'viewSolutions', 'viewExam'].includes(currentActiveView)) {
      isExamFinished = true; 
      history.back();
      return; 
  }

  ["viewLogin", "viewDashboard", "viewLibrary", "viewExam", "viewSolutions", "viewAnalytics", "viewPractice"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  
  const target = document.getElementById(viewId);
  if (target) target.style.display = "flex";

  const bottomNav = document.getElementById('mobileBottomNav');
  if (bottomNav) {
    bottomNav.style.display = (window.innerWidth <= 768 && (viewId === 'viewDashboard' || viewId === 'viewLibrary' || viewId === 'viewAnalytics')) ? 'flex' : 'none';
  }

  const navMap = {
    viewDashboard: 'navHomeBtn',
    viewLibrary: 'navLibraryBtn',
    viewAnalytics: 'navAnalyticsBtn'
  };
  if (navMap[viewId]) {
    updateBottomNav(document.getElementById(navMap[viewId]));
  }

  updateDesktopNav(viewId);

  if (pushHistory) {
    history.pushState({ view: viewId }, "", "#" + viewId);
  }
};

window.addEventListener("popstate", function(e) {
  const submitModal = document.getElementById("submitModalContainer");
  if (submitModal && submitModal.style.display === "flex") {
    closeExamModal();
    history.pushState(e.state, "", window.location.hash);
    return;
  }

  const profileDrawer = document.getElementById("profileDrawer");
  if (profileDrawer && profileDrawer.classList.contains("open")) {
    toggleProfileDrawer();
    history.pushState(e.state, "", window.location.hash);
    return;
  }
  
  if (document.getElementById("playlistBottomSheetOverlay")?.classList.contains("open")) {
      closePlaylistBottomSheet();
      history.pushState(e.state, "", window.location.hash);
      return;
  }

  const currentActiveView = Array.from(document.querySelectorAll('.view-screen')).find(v => v.style.display === 'flex')?.id;

  if (currentActiveView === 'viewExam' && !isExamFinished) {
    history.pushState({ view: 'viewExam' }, "", "#viewExam");
    abortExamSession();
    return;
  }

  const searchBar = document.getElementById("mastheadSearchBar");
  if (searchBar && searchBar.style.display === "flex") {
    toggleMastheadSearch(false);
    history.pushState(e.state, "", window.location.hash);
    return;
  }

  if (e.state) {
    if (e.state.view === 'viewLibrary') {
      switchView('viewLibrary', false);
      if (e.state.subView === 'setsExplorer' && e.state.subject) {
        drillDownToSubject(e.state.subject, false); 
      } else {
        returnToSubjectHub(true); 
      }
    } else if (e.state.view) {
      switchView(e.state.view, false);
    }
  } else {
    if (currentCandidate) {
      switchView('viewDashboard', false);
    } else {
      switchView('viewLogin', false);
    }
  }
});

function setupMobileExamGestures() {
  const panel = document.querySelector(".tcs-side-panel");
  const overlay = document.getElementById("paletteOverlay");
  if (!panel) return;

  if (!document.getElementById("paletteGrabHandle")) {
    const handle = document.createElement("div");
    handle.id = "paletteGrabHandle";
    handle.style.cssText = "width: 44px; height: 5px; background: #cbd5e1; border-radius: 4px; margin: 8px auto 4px auto; flex-shrink: 0; cursor: grab;";
    panel.insertBefore(handle, panel.firstChild);
  }

  let touchStartY = 0;
  let touchStartX = 0;

  panel.addEventListener("touchstart", (e) => {
    if (window.innerWidth > 768) return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  panel.addEventListener("touchend", (e) => {
    if (window.innerWidth > 768 || !panel.classList.contains("open")) return;
    const diffY = e.changedTouches[0].clientY - touchStartY;
    const diffX = Math.abs(e.changedTouches[0].clientX - touchStartX);

    if (diffY > 50 && diffX < 80) {
      panel.classList.remove("open");
      overlay?.classList.remove("open");
    }
  }, { passive: true });
}

window.updateBottomNav = function(clickedBtn) {
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  if (clickedBtn) clickedBtn.classList.add('active');
};

window.toggleProfileDrawer = function() {
  const drawer = document.getElementById('profileDrawer');
  const overlay = document.getElementById('profileDrawerOverlay');
  if (!drawer || !overlay) return;
  if (drawer.classList.contains('open')) {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    setTimeout(() => overlay.style.display = 'none', 300);
  } else {
    overlay.style.display = 'block';
    setTimeout(() => {
      drawer.classList.add('open');
      overlay.classList.add('open');
    }, 10);
  }
};

window.switchMasteryView = function(viewType) {
  const radarWrap = document.getElementById("radarViewport");
  const gridWrap = document.getElementById("gridViewport");
  const btnRadar = document.getElementById("btnToggleRadar");
  const btnGrid = document.getElementById("btnToggleGrid");

  if (viewType === 'radar') {
    if (radarWrap) radarWrap.style.display = "flex";
    if (gridWrap) gridWrap.style.display = "none";
    btnRadar?.classList.add("active");
    btnGrid?.classList.remove("active");
  } else {
    if (radarWrap) radarWrap.style.display = "none";
    if (gridWrap) gridWrap.style.display = "grid";
    btnGrid?.classList.add("active");
    btnRadar?.classList.remove("active");
  }
};

// ==========================================================================
// 4. AUTHENTICATION & CANDIDATE SESSION
// ==========================================================================
let initHash = window.location.hash || window.location.href;
if (initHash.includes("type=recovery")) sessionStorage.setItem("recovery_mode", "true");

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    sessionStorage.setItem("recovery_mode", "true");
    if (document.getElementById("resetPasswordForm")) showPasswordResetUI();
  }
});

function initAuthSessionWatcher() {
  if (sessionStorage.getItem("recovery_mode") === "true") return showPasswordResetUI();
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (sessionStorage.getItem("recovery_mode") === "true") return showPasswordResetUI();
    if (session && session.user && session.user.email_confirmed_at) initCandidateSession(session.user);
    else {
      currentCandidate = null;
      switchView("viewLogin", false);
    }
  });

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY" || sessionStorage.getItem("recovery_mode") === "true") {
      sessionStorage.setItem("recovery_mode", "true");
      return showPasswordResetUI();
    }
    if (event === "SIGNED_OUT" || !session || !session.user) {
      currentCandidate = null;
      return switchView("viewLogin");
    }
    if (!session.user.email_confirmed_at) {
      currentCandidate = null;
      return switchView("viewLogin");
    }
    if (!currentCandidate || currentCandidate.email !== session.user.email.toLowerCase()) {
      initCandidateSession(session.user);
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
      const cancelBtn = document.createElement("button");
      cancelBtn.id = "btnCancelReset";
      cancelBtn.type = "button";
      cancelBtn.innerText = "Cancel & Sign Out";
      cancelBtn.style.cssText = "background:none; border:none; color:#dc2626; font-size:12px; font-weight:bold; width:100%; margin-top:16px; cursor:pointer; text-decoration:underline;";
      cancelBtn.addEventListener("click", () => {
        sessionStorage.removeItem("recovery_mode");
        supabaseClient.auth.signOut().then(() => { 
          window.location.href = window.location.pathname; 
        });
      });
      resetForm.appendChild(cancelBtn);
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
      const { data: newStudent, error: insErr } = await supabaseClient.from("students").upsert({ roll_number: roll, full_name: name, email: userEmail }, { onConflict: "email" }).select().single();
      if (insErr) throw insErr;
      currentCandidate = newStudent;
    }

    const nameEl = document.getElementById("editProfileName");
    if (nameEl) nameEl.value = currentCandidate.full_name || "";
    const rollEl = document.getElementById("editProfileRoll");
    if (rollEl) rollEl.value = currentCandidate.roll_number || "";
    const targetEl = document.getElementById("editProfileTarget");
    if (targetEl) targetEl.value = currentCandidate.target_exam || "";
    
    mountDashboard(true);
  } catch (err) {
    showAuthNotice("Candidate profile load failed: " + err.message);
    switchView("viewLogin");
  }
}

function showAuthNotice(msg, isError = true) {
  const authErrBox = document.getElementById("authErrorMsg");
  if (!authErrBox) return;
  authErrBox.innerText = msg;
  authErrBox.style.display = "block";
  authErrBox.style.background = isError ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)";
  authErrBox.style.borderColor = isError ? "#ef4444" : "#22c55e";
  authErrBox.style.color = isError ? "#fca5a5" : "#4ade80";
}

// ==========================================================================
// 5. APPLICATION EVENTS
// ==========================================================================
function filterAccordionCards(query) {
  document.querySelectorAll(".topic-accordion-card").forEach(card => {
    const headerTitle = card.querySelector(".topic-title")?.innerText.toLowerCase() || "";
    const body = card.querySelector(".topic-accordion-body");
    const tiles = card.querySelectorAll(".set-tile");

    if (!query) {
      card.style.display = "block";
      card.classList.remove("open");
      if (body) body.style.display = "none";
      tiles.forEach(t => t.style.display = "");
      return;
    }

    if (headerTitle.includes(query)) {
      card.style.display = "block";
      card.classList.add("open");
      if (body) body.style.display = "block";
      tiles.forEach(t => t.style.display = "");
      return;
    }

    let matchingSets = 0;
    tiles.forEach(tile => {
      const setTitle = tile.querySelector(".set-tile-title")?.innerText.toLowerCase() || "";
      if (setTitle.includes(query)) {
        tile.style.display = "";
        matchingSets++;
      } else {
        tile.style.display = "none";
      }
    });

    if (matchingSets > 0) {
      card.style.display = "block";
      card.classList.add("open");
      if (body) body.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

function setupAppEvents() {
  const tabSignIn = document.getElementById("tabSignIn");
  const tabRegister = document.getElementById("tabRegister");
  const authNavTabs = document.getElementById("authNavTabs");
  const signInForm = document.getElementById("signInForm");
  const registerForm = document.getElementById("registerForm");
  const forgotForm = document.getElementById("forgotForm");
  const resetPasswordForm = document.getElementById("resetPasswordForm");
  const authErrBox = document.getElementById("authErrorMsg");

  tabSignIn?.addEventListener("click", () => {
    tabSignIn.classList.add("active");
    tabRegister?.classList.remove("active");
    if (signInForm) signInForm.style.display = "block";
    if (registerForm) registerForm.style.display = "none";
    if (forgotForm) forgotForm.style.display = "none";
    if (resetPasswordForm) resetPasswordForm.style.display = "none";
    if (authErrBox) authErrBox.style.display = "none";
  });

  tabRegister?.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabSignIn?.classList.remove("active");
    if (registerForm) registerForm.style.display = "block";
    const regFields = document.getElementById("regFieldsStep");
    const regSuccess = document.getElementById("regSuccessCard");
    if (regFields) regFields.style.display = "none";
    if (regSuccess) regSuccess.style.display = "block";
    if (signInForm) signInForm.style.display = "none";
    if (forgotForm) forgotForm.style.display = "none";
    if (resetPasswordForm) resetPasswordForm.style.display = "none";
    if (authErrBox) authErrBox.style.display = "none";
  });

  document.getElementById("btnOpenForgot")?.addEventListener("click", () => {
    if (signInForm) signInForm.style.display = "none";
    if (registerForm) registerForm.style.display = "none";
    if (resetPasswordForm) resetPasswordForm.style.display = "none";
    if (forgotForm) forgotForm.style.display = "block";
    const forgotEmail = document.getElementById("forgotEmailStep");
    const forgotSuccess = document.getElementById("forgotSuccessStep");
    if (forgotEmail) forgotEmail.style.display = "block";
    if (forgotSuccess) forgotSuccess.style.display = "none";
    if (authErrBox) authErrBox.style.display = "none";
  });

  document.getElementById("btnBackToSignIn")?.addEventListener("click", () => {
    if (authNavTabs) authNavTabs.style.display = "flex";
    tabSignIn?.click();
  });

  document.getElementById("btnBackToSignInFromReg")?.addEventListener("click", () => {
    if (authNavTabs) authNavTabs.style.display = "flex";
    tabSignIn?.click();
  });

  document.getElementById("btnGoogleAuth")?.addEventListener("click", async () => {
    if (authErrBox) authErrBox.style.display = "none";
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) showAuthNotice(error.message);
  });

  signInForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("inputSignInEmail")?.value.trim().toLowerCase();
    const password = document.getElementById("inputSignInPass")?.value;
    const btn = document.getElementById("btnSignInSubmit");
    if (authErrBox) authErrBox.style.display = "none";
    if (btn) { btn.innerText = "Authenticating..."; btn.disabled = true; }
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user || !data.user.email_confirmed_at) {
        await supabaseClient.auth.signOut();
        throw new Error("Email not verified. Please verify using the link dispatched to your inbox.");
      }
      await initCandidateSession(data.user);
    } catch (err) {
      showAuthNotice(err.message || "Invalid credentials.");
    } finally {
      if (btn) { btn.innerText = "Authenticate & Enter"; btn.disabled = false; }
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("inputRegName")?.value.trim();
    const roll = document.getElementById("inputRegRoll")?.value.trim().toUpperCase();
    const email = document.getElementById("inputRegEmail")?.value.trim().toLowerCase();
    const password = document.getElementById("inputRegPass")?.value;
    const btn = document.getElementById("btnRegisterSubmit");
    if (authErrBox) authErrBox.style.display = "none";
    if (btn) { btn.innerText = "Sending Link..."; btn.disabled = true; }
    try {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, roll_number: roll }, emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      const regFields = document.getElementById("regFieldsStep");
      const regSuccess = document.getElementById("regSuccessCard");
      if (regFields) regFields.style.display = "none";
      if (regSuccess) regSuccess.style.display = "block";
    } catch (err) {
      showAuthNotice(err.message || "Registration failed.");
    } finally {
      if (btn) { btn.innerText = "Create Profile & Send Link"; btn.disabled = false; }
    }
  });

  resetPasswordForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPass = document.getElementById("inputNewPassword")?.value;
    const btn = document.getElementById("btnSaveNewPassword");
    if (!newPass || newPass.length < 6) return showAuthNotice("Password must contain at least 6 characters.");
    if (btn) { btn.innerText = "Updating Password..."; btn.disabled = true; }
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPass });
      if (error) throw error;
      sessionStorage.removeItem("recovery_mode");
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, window.location.pathname);
      }
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
    const newName = document.getElementById("editProfileName")?.value.trim();
    const newTarget = document.getElementById("editProfileTarget")?.value.trim();
    try {
      const { error } = await supabaseClient
        .from("students")
        .update({ full_name: newName, target_exam: newTarget })
        .eq("roll_number", currentCandidate.roll_number);
      if (error) throw error;
      currentCandidate.full_name = newName;
      currentCandidate.target_exam = newTarget;
      const dashName = document.getElementById("dashCandidateName");
      if (dashName) dashName.innerText = newName;
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
  });

  document.getElementById("btnLogoutDrawer")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    currentCandidate = null;
    sessionStorage.removeItem("recovery_mode");
    if (document.getElementById('profileDrawer')?.classList.contains('open')) toggleProfileDrawer();
    switchView("viewLogin");
    document.getElementById("tabSignIn")?.click();
  });

  const themeBtns = document.querySelectorAll(".theme-toggle-btn");
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-theme");
    themeBtns.forEach(btn => btn.innerText = "☀️");
  }
  themeBtns.forEach(btn => {
    btn.onclick = () => {
      document.body.classList.toggle("dark-theme");
      const isDark = document.body.classList.contains("dark-theme");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      themeBtns.forEach(b => b.innerText = isDark ? "☀️" : "🌙");
      if (document.getElementById('viewAnalytics')?.style.display === 'flex') {
        fetchStudentAnalytics();
      }
    };
  });

  document.querySelectorAll('.filter-chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip-btn').forEach(b => b.classList.remove('active'));
      const targetBtn = e.target.closest('.filter-chip-btn');
      if (targetBtn) {
        targetBtn.classList.add('active');
        currentFilter = targetBtn.getAttribute('data-filter') || "all";
        renderTopicSets();
      }
    });
  });

  document.getElementById("topicSearchInput")?.addEventListener("input", (e) => {
    filterAccordionCards(e.target.value.trim().toLowerCase());
  });

  const btnSaveNext = document.getElementById("btnSaveNext");
  if (btnSaveNext) {
    btnSaveNext.onclick = () => {
      if (!userResponses[currentIndex]) return;
      userResponses[currentIndex].status = (userResponses[currentIndex].selected !== null) ? 2 : 1;
      advanceNextQuestion();
    };
  }

  const btnMarkReview = document.getElementById("btnMarkReview");
  if (btnMarkReview) {
    btnMarkReview.onclick = () => {
      if (!userResponses[currentIndex]) return;
      userResponses[currentIndex].status = (userResponses[currentIndex].selected !== null) ? 4 : 3;
      advanceNextQuestion();
    };
  }

  const btnClear = document.getElementById("btnClear");
  if (btnClear) {
    btnClear.onclick = () => {
      if (!userResponses[currentIndex]) return;
      userResponses[currentIndex].selected = null;
      userResponses[currentIndex].status = 1;
      renderQuestion(currentIndex);
    };
  }

  const btnSubmit = document.getElementById("btnSubmit");
  if (btnSubmit) {
    btnSubmit.onclick = () => {
      showExamSummaryModal();
    };
  }

  const langSwitch = document.getElementById("langSwitch");
  if (langSwitch) {
    langSwitch.onchange = (e) => {
      currentLang = e.target.value;
      if (document.getElementById("viewExam")?.style.display === "flex") {
        renderQuestion(currentIndex);
      }
    };
  }

  const btnMobilePalette = document.getElementById("btnMobilePalette");
  if (btnMobilePalette) {
    btnMobilePalette.onclick = (e) => {
      e.stopPropagation();
      const panel = document.querySelector(".tcs-side-panel");
      const overlay = document.getElementById("paletteOverlay");
      const isOpen = panel?.classList.contains("open");
      if (isOpen) {
        panel?.classList.remove("open");
        overlay?.classList.remove("open");
      } else {
        panel?.classList.add("open");
        overlay?.classList.add("open");
      }
    };
  }

  const palOverlay = document.getElementById("paletteOverlay");
  if (palOverlay) {
    palOverlay.onclick = () => {
      document.querySelector(".tcs-side-panel")?.classList.remove("open");
      document.getElementById("paletteOverlay")?.classList.remove("open");
    };
  }
}

function start5PMEngine() {
    if(alertEngineStarted) return;
    alertEngineStarted = true;
    setInterval(() => {
        if(!currentCandidate) return;
        const d = new Date();
        const dateStr = d.toDateString();
        if (d.getHours() === 17 && !localStorage.getItem("5pm_alert_" + dateStr)) {
            const tomLoad = parseInt(localStorage.getItem("tomorrow_load_" + currentCandidate.roll_number) || "0");
            if (tomLoad === 0) {
                alert("⚠️ Tomorrow's Playlist is empty! Curate your target before you sleep.");
            } else if (tomLoad < 100) {
                alert(`⚠️ Tomorrow has only ${tomLoad} questions staged (Target is 100). Add more sets!`);
            } else {
                alert(`🎯 Tomorrow's payload locked & ready (${tomLoad} Qs).`);
            }
            localStorage.setItem("5pm_alert_" + dateStr, "true");
        }
    }, 60000); 
}

// ==========================================================================
// 6. MISSION DECK & PLAYLIST ENGINE
// ==========================================================================
async function mountDashboard(isInitialLoad = false) {
  const cName = document.getElementById("dashCandidateName");
  if (cName) cName.innerText = currentCandidate?.full_name || "Candidate";
  const rollEl = document.getElementById("dashCandidateRoll");
  if (rollEl) rollEl.innerText = "ROLL: " + (currentCandidate?.roll_number || "---");
  
  fetchStudentAnalytics(true); 
  
  switchView("viewDashboard", false);
  updateBottomNav(document.getElementById('navHomeBtn'));

  if (isInitialLoad || !history.state) {
      history.replaceState({ view: 'viewDashboard' }, "", "#viewDashboard");
  }
  
  await fetchPlaylistsAndCheckRollover();
  await fetchWeakQuestions();
  await fetchTestCatalog(); 
  renderHomePlaylists();
  start5PMEngine();
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

        const requiredLists = [
            { name: 'Today', order: 1 },
            { name: 'Tomorrow', order: 2 },
            { name: 'This Week', order: 3 }
        ];

        let missing = [];
        if (!pData || pData.length === 0) {
            missing = requiredLists.map(r => ({
                student_roll: roll,
                playlist_name: r.name,
                is_system_playlist: true,
                display_order: r.order
            }));
        } else {
            requiredLists.forEach(r => {
                if (!pData.some(p => p.playlist_name === r.name)) {
                    missing.push({
                        student_roll: roll,
                        playlist_name: r.name,
                        is_system_playlist: true,
                        display_order: r.order
                    });
                }
            });
        }

        if (missing.length > 0) {
            const { error: insErr } = await supabaseClient.from("playlists").insert(missing);
            if (insErr) console.warn("Playlists insert warning:", insErr);

            const { data: refData } = await supabaseClient
                .from("playlists")
                .select("*")
                .eq("student_roll", roll)
                .order("display_order", { ascending: true });
            
            pData = refData || pData || [];
        }

        userPlaylists = pData || [];

        const { data: piData, error: piErr } = await supabaseClient
            .from("playlist_items")
            .select("*")
            .eq("student_roll", roll);
        
        if (piErr) console.error("Playlist items error:", piErr);
        userPlaylistItems = piData || [];

        const todayStr = new Date().toISOString().split("T")[0];
        const { data: dpData } = await supabaseClient
            .from("daily_performance")
            .select("*")
            .eq("student_roll", roll)
            .eq("target_date", todayStr)
            .maybeSingle();
        
        if (dpData) {
            dailyPerf = dpData;
        } else {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
            const { data: yData } = await supabaseClient
                .from("daily_performance")
                .select("streak_count, is_century_hit")
                .eq("student_roll", roll)
                .eq("target_date", yesterday)
                .maybeSingle();
            let newStreak = (yData && yData.is_century_hit) ? yData.streak_count : 0;
            
            const { data: insData } = await supabaseClient.from("daily_performance").insert({
                student_roll: roll, target_date: todayStr, total_questions_attempted: 0, streak_count: newStreak
            }).select().single();
            if (insData) dailyPerf = insData;
        }

        const lastRollover = localStorage.getItem("last_rollover_" + roll);
        if (lastRollover !== todayStr) {
            const todayList = userPlaylists.find(p => p.playlist_name === 'Today');
            const tomorrowList = userPlaylists.find(p => p.playlist_name === 'Tomorrow');
            
            if (todayList && tomorrowList) {
                await supabaseClient.from("playlist_items").update({ is_rollover: true }).eq("playlist_id", todayList.id);
                await supabaseClient.from("playlist_items").update({ playlist_id: todayList.id }).eq("playlist_id", tomorrowList.id);
            }
            localStorage.setItem("last_rollover_" + roll, todayStr);
            
            const { data: piData2 } = await supabaseClient.from("playlist_items").select("*").eq("student_roll", roll);
            userPlaylistItems = piData2 || [];
        }
    } catch (error) {
        console.error("Playlist Init Error:", error);
    }
}

function renderHomePlaylists() {
    const todayContainer = document.getElementById("todayPlaylistContainer");
    const tomorrowContainer = document.getElementById("tomorrowPlaylistContainer");
    const weekContainer = document.getElementById("weekPlaylistContainer");
    const customContainer = document.getElementById("customPlaylistsContainer");

    if (!todayContainer || !tomorrowContainer || !weekContainer) return;

    todayContainer.innerHTML = "";
    tomorrowContainer.innerHTML = "";
    weekContainer.innerHTML = "";
    if (customContainer) customContainer.innerHTML = "";

    const todayDay = new Date().getDay();
    if (todayDay === 0) { 
        todayContainer.innerHTML = `
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 8px; text-align: center; color: white;">
                <h2 style="margin:0 0 10px 0; font-size:20px;">👑 Sunday Mega Mistake Bank</h2>
                <p style="margin:0 0 16px 0; font-size:13px; opacity:0.9;">100 Questions from your weekly errors. Clear this to secure your Century Streak.</p>
                <button type="button" class="tcs-btn" style="background:#ffffff; color:#7c3aed; font-weight:800; padding:10px 24px;" onclick="launchMistakeBank('quiz', true)">▶ START MEGA REVISION</button>
            </div>
        `;
        if (tomorrowContainer.closest('.mission-playlist-card')) tomorrowContainer.closest('.mission-playlist-card').style.display = "none";
        if (weekContainer.closest('.mission-playlist-card')) weekContainer.closest('.mission-playlist-card').style.display = "none";
        if (customContainer) customContainer.style.display = "none";
        
        const meterFill = document.getElementById("centuryLoadFill");
        const meterText = document.getElementById("centuryLoadText");
        if(meterFill) { meterFill.style.width = "100%"; meterFill.style.background = "#16a34a"; }
        if(meterText) meterText.innerText = `100 / 100 Qs ✅ (Sunday Secured)`;
        return; 
    } else {
        if (tomorrowContainer.closest('.mission-playlist-card')) tomorrowContainer.closest('.mission-playlist-card').style.display = "block";
        if (weekContainer.closest('.mission-playlist-card')) weekContainer.closest('.mission-playlist-card').style.display = "block";
        if (customContainer) customContainer.style.display = "block";
    }

    let todayLoad = 25; 
    let tomorrowLoad = 0;

    // 🚀 RICH SET TILE MATCHING LIBRARY EXACTLY
    const getSetHtml = (item, pName) => {
        const setCat = catalogData.find(c => String(c.test_id) === String(item.test_id));
        if (!setCat) return "";
        
        const qCount = setCat.total_questions || 10;
        if (pName === 'Today') todayLoad += qCount;
        if (pName === 'Tomorrow') tomorrowLoad += qCount;

        const isRoll = item.is_rollover ? `<span style="background:#fee2e2; color:#dc2626; padding:2px 6px; font-size:9.5px; border-radius:4px; font-weight:800; margin-right:6px; letter-spacing:0.3px;">⚠️ ROLLOVER</span>` : '';

        const attempts = userAttemptHistory.filter(a => String(a.test_id) === String(setCat.test_id));
        let isAttempted = attempts.length > 0;
        let bestScore = isAttempted ? Math.max(...attempts.map(a => parseFloat(a.score))) : 0;
        let maxMarks = (setCat.total_questions || 10) * 2;
        let pct = maxMarks > 0 && isAttempted ? (bestScore / maxMarks) * 100 : 0;

        let badgeClass = 'status-new';
        let badgeText = 'NEW';
        let historyHtml = '<span style="color:#64748b;">Not attempted yet</span>';

        if (isAttempted) {
          if (pct >= 100) {
            badgeClass = 'status-mastered';
            badgeText = `MASTERED ${bestScore}/${maxMarks}`;
            historyHtml = `<span style="color:#16a34a;">★ Best Score: ${bestScore} (${Math.round(pct)}%) | Att: ${attempts.length}</span>`;
          } else {
            badgeClass = 'status-progress';
            badgeText = `IN PROGRESS`;
            historyHtml = `<span style="color:#d97706;">Needs Review: ${bestScore}/${maxMarks} | Att: ${attempts.length}</span>`;
          }
        }

        return `
          <div class="set-tile" style="margin-bottom:8px;">
            <div class="set-tile-header">
              <div class="set-tile-title">${isRoll}${setCat.test_title}</div>
              <div style="display:flex; gap: 8px; align-items: center;">
                 <div class="set-status-badge ${badgeClass}">${badgeText}</div>
                 <button type="button" class="btn-three-dots" onclick="openThreeDotsMenu(event, ${setCat.test_id})" title="Options">⋮</button>
              </div>
            </div>
            <div class="set-tile-meta">
              <span>⏱️ ${setCat.total_duration_minutes}m</span>
              <span>📄 ${qCount} Qs</span>
            </div>
            <div class="set-score-info">
              ${historyHtml}
            </div>
            <div class="set-action-footer">
              <button type="button" class="btn-launch-set" onclick="launchAssessment(${setCat.test_id})">
                <span>▶</span> <span>${isAttempted ? 'Retake' : 'Exam'}</span>
              </button>
              <div class="secondary-modes-strip">
                <button type="button" class="btn-mode-icon" title="Read Mode" onclick="launchPracticeMode(${setCat.test_id}, 'read')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                </button>
                <button type="button" class="btn-mode-icon" title="Flashcards" onclick="launchPracticeMode(${setCat.test_id}, 'flashcard')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2" ry="2"></rect><path d="M21 7v12a2 2 0 0 1-2 2H7"></path></svg>
                </button>
                <button type="button" class="btn-mode-icon" title="Instant Quiz" onclick="launchPracticeMode(${setCat.test_id}, 'quiz')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                </button>
              </div>
            </div>
          </div>
        `;
    };

    const getAddBtn = (playlistId, pName) => `
        <button type="button" class="btn-create-playlist-trigger" style="margin-top: 10px;" 
          onclick="enableLibrarySelectionMode('${playlistId}', '${pName.replace(/'/g, "\\'")}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Add Sets to ${pName}</span>
        </button>
    `;

    const todayList = userPlaylists.find(p => p.playlist_name === 'Today');
    const tomorrowList = userPlaylists.find(p => p.playlist_name === 'Tomorrow');
    const weekList = userPlaylists.find(p => p.playlist_name === 'This Week');

    // 1. Render Today
    if (todayList) {
        const todayItems = userPlaylistItems.filter(pi => pi.playlist_id === todayList.id);
        const itemsHtml = todayItems.length > 0 ? todayItems.map(i => getSetHtml(i, 'Today')).join("") : `<div style="text-align: center; padding: 18px; color: #94a3b8; font-size: 12.5px; font-weight: 600;">No sets queued for today yet.</div>`;
        todayContainer.innerHTML = itemsHtml + getAddBtn(todayList.id, 'Today');
    }

    // 2. Render Tomorrow
    if (tomorrowList) {
        const tomItems = userPlaylistItems.filter(pi => pi.playlist_id === tomorrowList.id);
        const itemsHtml = tomItems.length > 0 ? tomItems.map(i => getSetHtml(i, 'Tomorrow')).join("") : `<div style="text-align: center; padding: 18px; color: #94a3b8; font-size: 12.5px; font-weight: 600;">Queue is empty.</div>`;
        tomorrowContainer.innerHTML = itemsHtml + getAddBtn(tomorrowList.id, 'Tomorrow');
        const badge = tomorrowContainer.closest('.mission-playlist-card')?.querySelector('.playlist-count-pill, .playlist-header span');
        if (badge) badge.innerText = `${tomItems.length} Sets ▼`;
    }

    // 3. Render This Week
    if (weekList) {
        const weekItems = userPlaylistItems.filter(pi => pi.playlist_id === weekList.id);
        const itemsHtml = weekItems.length > 0 ? weekItems.map(i => getSetHtml(i, 'This Week')).join("") : `<div style="text-align: center; padding: 18px; color: #94a3b8; font-size: 12.5px; font-weight: 600;">Backlog is empty.</div>`;
        weekContainer.innerHTML = itemsHtml + getAddBtn(weekList.id, 'This Week');
        const badge = weekContainer.closest('.mission-playlist-card')?.querySelector('.playlist-count-pill, .playlist-header span');
        if (badge) badge.innerText = `${weekItems.length} Sets ▼`;
    }

    // 4. Render Custom Playlists
    const customLists = userPlaylists.filter(p => !['Today', 'Tomorrow', 'This Week'].includes(p.playlist_name));
    if (customContainer && customLists.length > 0) {
        customLists.forEach(playlist => {
            const items = userPlaylistItems.filter(pi => pi.playlist_id === playlist.id);
            const itemsHtml = items.length > 0 ? items.map(i => getSetHtml(i, playlist.playlist_name)).join("") : `<div style="text-align: center; padding: 18px; color: #94a3b8; font-size: 12.5px; font-weight: 600;">No sets in ${playlist.playlist_name}.</div>`;
            
            customContainer.innerHTML += `
                <div class="mission-playlist-card collapsed playlist-accordion-card">
                    <div class="playlist-header" onclick="this.parentElement.classList.toggle('expanded'); this.parentElement.classList.toggle('collapsed');">
                        <div class="playlist-header-left">
                            <h3 class="playlist-title">⭐ ${playlist.playlist_name}</h3>
                        </div>
                        <span class="playlist-count-pill">${items.length} Sets ▼</span>
                    </div>
                    <div class="playlist-body">
                        <div class="playlist-sets-stream">${itemsHtml}</div>
                        ${getAddBtn(playlist.id, playlist.playlist_name)}
                    </div>
                </div>
            `;
        });
    }

    // Century Tracker Update
    const targetQ = 100;
    const meterFill = document.getElementById("centuryLoadFill");
    const meterText = document.getElementById("centuryLoadText");
    
    let pct = Math.min(100, Math.round((todayLoad / targetQ) * 100));
    let loadMsg = todayLoad < 100 ? `⚠️ (${100 - todayLoad} Qs Short)` : (todayLoad === 100 ? `✅ (Target Locked)` : `🔥 (Overachieving)`);

    if (meterFill) {
      meterFill.style.width = pct + "%";
      meterFill.style.background = pct >= 100 ? "#16a34a" : "var(--tcs-blue-accent)";
    }
    if (meterText) meterText.innerText = `${todayLoad} / 100 Qs ${loadMsg}`;
    
    localStorage.setItem("tomorrow_load_" + currentCandidate.roll_number, tomorrowLoad);
}

// 🚀 BATCH SELECTION MODE FOR LIBRARY
window.enableLibrarySelectionMode = function(playlistId, playlistName) {
    librarySelectionMode = true;
    targetPlaylistForSelection = { id: playlistId, name: playlistName };
    selectedSetsForBatch.clear();

    switchView('viewLibrary');
    updateBottomNav(document.getElementById('navLibraryBtn'));
    returnToSubjectHub(true);
};

window.cancelLibrarySelectionMode = function() {
    librarySelectionMode = false;
    targetPlaylistForSelection = null;
    selectedSetsForBatch.clear();
    
    const bar = document.getElementById("librarySelectionFloatingBar");
    if(bar) bar.style.display = "none";
    
    const banner = document.getElementById("librarySelectionBanner");
    if(banner) banner.style.display = "none";

    renderTopicSets(); 
};

window.commitBatchSelectionToPlaylist = async function() {
    if(!librarySelectionMode || !targetPlaylistForSelection || selectedSetsForBatch.size === 0) return;
    
    const payloads = Array.from(selectedSetsForBatch).map(testId => ({
        playlist_id: targetPlaylistForSelection.id,
        test_id: testId,
        student_roll: currentCandidate.roll_number
    }));

    try {
        const { error } = await supabaseClient.from("playlist_items").insert(payloads);
        if(error) throw error;
        alert(`Successfully added ${payloads.length} sets to ${targetPlaylistForSelection.name}!`);
    } catch(err) {
        alert("Batch insert failed: " + err.message);
    }
    
    cancelLibrarySelectionMode();
    await fetchPlaylistsAndCheckRollover();
    renderHomePlaylists();
    
    switchView('viewDashboard');
    updateBottomNav(document.getElementById('navHomeBtn'));
};

window.toggleBatchSelection = function(testId, isAlreadyInPlaylist) {
    if(isAlreadyInPlaylist) return;
    
    if(selectedSetsForBatch.has(testId)) {
        selectedSetsForBatch.delete(testId);
    } else {
        selectedSetsForBatch.add(testId);
    }
    
    const btn = document.getElementById(`batchSelectBtn_${testId}`);
    if(btn) {
        btn.innerHTML = selectedSetsForBatch.has(testId) ? `☑️` : `⬜`;
    }
    
    const barCount = document.getElementById("librarySelectionCount");
    if(barCount) barCount.innerText = `${selectedSetsForBatch.size} Selected`;
};

// 🚀 2-STEP 3-DOTS MENU & YOUTUBE-STYLE BOTTOM SHEET
window.openThreeDotsMenu = function(event, testId) {
    event.stopPropagation();
    currentThreeDotsTestId = testId;
    const menu = document.getElementById("threeDotsMenu");
    const overlay = document.getElementById("threeDotsMenuOverlay");
    if(!menu || !overlay) return;

    const btnRect = event.currentTarget.getBoundingClientRect();
    menu.style.display = "block";
    overlay.style.display = "block";

    const menuWidth = 165;
    let leftPos = btnRect.right - menuWidth;
    if (leftPos < 10) leftPos = 10;
    let topPos = btnRect.bottom + 6;
    if (topPos + 60 > window.innerHeight) {
        topPos = btnRect.top - 50;
    }
    menu.style.top = `${topPos}px`;
    menu.style.left = `${leftPos}px`;
};

window.closeThreeDotsMenu = function() {
    const menu = document.getElementById("threeDotsMenu");
    const overlay = document.getElementById("threeDotsMenuOverlay");
    if(menu) menu.style.display = "none";
    if(overlay) overlay.style.display = "none";
};

window.triggerBottomSheetFromMenu = function() {
    closeThreeDotsMenu();
    if(currentThreeDotsTestId) {
        openPlaylistBottomSheet(currentThreeDotsTestId);
    }
};

window.openPlaylistBottomSheet = function(testId) {
    selectedTestForPlaylist = testId;
    const bs = document.getElementById("playlistBottomSheet");
    const overlay = document.getElementById("playlistBottomSheetOverlay");
    const opts = document.getElementById("bottomSheetOptionsContainer");
    if(!bs || !opts) return;

    let html = "";
    userPlaylists.forEach(p => {
        const inList = userPlaylistItems.some(pi => pi.playlist_id === p.id && String(pi.test_id) === String(testId));
        const icon = p.playlist_name === 'Today' ? '🔥' : (p.playlist_name === 'Tomorrow' ? '⏳' : (p.playlist_name === 'This Week' ? '📅' : '⭐'));
        
        // 🚀 YouTube-style bookmark SVG indicator
        const bookmarkSvg = inList
          ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--tcs-blue-accent)" stroke="var(--tcs-blue-accent)" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path><polyline points="9 10 12 13 16 8" stroke="#ffffff" stroke-width="2" fill="none"></polyline></svg>`
          : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;

        html += `
            <div class="playlist-select-row" onclick="togglePlaylistMembership('${p.id}', ${testId}, ${inList})">
                <div class="playlist-select-left">
                    <span class="playlist-select-icon">${icon}</span>
                    <span class="playlist-select-title">${p.playlist_name}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    ${inList ? '<span style="color:#16a34a; font-weight:800; font-size:11.5px; letter-spacing:0.3px;">SAVED</span>' : ''}
                    <span class="playlist-select-checkbox">${bookmarkSvg}</span>
                </div>
            </div>
        `;
    });

    html += `
        <button type="button" class="btn-create-playlist-trigger" style="margin-top:8px;" onclick="promptNewPlaylistFromSheet()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Create New Playlist</span>
        </button>
    `;
    opts.innerHTML = html;
    overlay.classList.add("open");
    bs.style.bottom = "0";
};

window.closePlaylistBottomSheet = function() {
    const bs = document.getElementById("playlistBottomSheet");
    const overlay = document.getElementById("playlistBottomSheetOverlay");
    if(bs) bs.style.bottom = "-500px";
    if(overlay) overlay.classList.remove("open");
};

window.togglePlaylistMembership = async function(playlistId, testId, inList) {
    if (inList) {
        await supabaseClient.from("playlist_items").delete()
          .eq("playlist_id", playlistId)
          .eq("test_id", testId)
          .eq("student_roll", currentCandidate.roll_number);
    } else {
        await supabaseClient.from("playlist_items").insert({
          playlist_id: playlistId,
          test_id: testId,
          student_roll: currentCandidate.roll_number
        });
    }
    await fetchPlaylistsAndCheckRollover();
    openPlaylistBottomSheet(testId); 
    renderHomePlaylists(); 
};

window.promptNewPlaylist = async function() {
    const name = prompt("Enter new playlist name (e.g. Important, High Court Special):");
    if (!name || name.trim() === "") return;
    
    const { error } = await supabaseClient.from("playlists").insert({
        student_roll: currentCandidate.roll_number,
        playlist_name: name.trim(),
        is_system_playlist: false,
        display_order: 10
    });
    
    if(error) alert("Error creating playlist: " + error.message);
    else {
        await fetchPlaylistsAndCheckRollover();
        renderHomePlaylists();
    }
};

window.promptNewPlaylistFromSheet = async function() {
    const name = prompt("Enter new playlist name:");
    if (!name || name.trim() === "") return;
    
    const { error } = await supabaseClient.from("playlists").insert({
        student_roll: currentCandidate.roll_number,
        playlist_name: name.trim(),
        is_system_playlist: false,
        display_order: 10
    });
    
    if(error) alert("Error creating playlist: " + error.message);
    else {
        await fetchPlaylistsAndCheckRollover();
        openPlaylistBottomSheet(selectedTestForPlaylist);
        renderHomePlaylists();
    }
};

async function fetchWeakQuestions() {
  if (!currentCandidate) return;
  try {
    const { data: statsData, error: statsErr } = await supabaseClient
        .from("student_question_stats")
        .select("*")
        .eq("student_roll", currentCandidate.roll_number);
    
    if (statsErr) throw statsErr;
    let weakQs = statsData || [];

    const questionIds = weakQs.map(q => q.question_id).filter(Boolean);
    
    if (questionIds.length > 0) {
       const { data: freshQs } = await supabaseClient
          .from('questions')
          .select('id, content, options, correct_answer, explanation')
          .in('id', questionIds);

       if (freshQs) {
          userWeakQuestions = weakQs.map(wq => {
             const freshQ = freshQs.find(fq => String(fq.id) === String(wq.question_id));
             return {
                ...wq,
                question_data: freshQ || wq.question_data 
             };
          });
          return;
       }
    }
    userWeakQuestions = weakQs;
  } catch (err) {
    console.error("Mistake Bank Pre-load Error:", err);
  }
}

async function fetchTestCatalog() {
  const hubContainer = document.getElementById("subjectHubContainer");
  if (!hubContainer) return;
  hubContainer.innerHTML = "<p style='padding:20px; color:#64748b;'>Compiling Subject Mastery Matrix...</p>";

  const { data: catalog, error: catErr } = await supabaseClient.from("view_test_catalog").select("*");
  if (catErr || !catalog || catalog.length === 0) {
    return hubContainer.innerHTML = "<p style='padding:20px; color:#dc2626;'>Database Catalog View could not load.</p>";
  }
  catalogData = catalog;

  const { data: history } = await supabaseClient.from("test_attempts").select("test_id, score, attempt_date").eq("student_roll", currentCandidate.roll_number).order("attempt_date", { ascending: false });
  userAttemptHistory = history || [];

  renderSubjectHubGrid();
}

function renderSubjectHubGrid() {
  const container = document.getElementById("subjectHubContainer");
  if (!container) return;
  container.innerHTML = "";

  const subjectsMap = {};
  catalogData.forEach(row => {
    const s = row.subject || "General Studies";
    if (!subjectsMap[s]) {
      subjectsMap[s] = { sets: [] };
    }
    subjectsMap[s].sets.push(row);
  });

  Object.entries(subjectsMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([subName, data]) => {
      const totalSets = data.sets.length;
      let completedSets = 0;
      let totalAttemptsForSubject = 0;
      let sumPercentages = 0;
      let attemptedSetsCount = 0;

      data.sets.forEach(setItem => {
        const attempts = userAttemptHistory.filter(a => String(a.test_id) === String(setItem.test_id));
        if (attempts.length > 0) {
          totalAttemptsForSubject += attempts.length;
          attemptedSetsCount++;
          let bestScore = Math.max(...attempts.map(a => parseFloat(a.score)));
          let maxMarks = (setItem.total_questions || 10) * 2;
          let pct = maxMarks > 0 ? (bestScore / maxMarks) * 100 : 0;
          sumPercentages += pct;
          if (pct >= 100) completedSets++;
        }
      });

      const remainingSets = totalSets - completedSets;
      const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
      const avgScorePct = attemptedSetsCount > 0 ? Math.round(sumPercentages / attemptedSetsCount) : 0;

      let statusClass = "pill-untested";
      let statusText = "Untested";
      if (completedSets === totalSets && totalSets > 0) {
        statusClass = "pill-mastered";
        statusText = "Mastered";
      } else if (attemptedSetsCount > 0) {
        statusClass = "pill-progress";
        statusText = `${progressPct}% Complete`;
      }

      const tile = document.createElement("div");
      tile.className = "subject-mastery-tile";
      tile.innerHTML = `
        <div class="tile-top-row">
          <span class="tile-subject-title">${subName}</span>
          <span class="tile-status-pill ${statusClass}">${statusText}</span>
        </div>

        <div class="tile-progress-container">
          <div class="tile-progress-labels">
            <span>Mastery Progress</span>
            <span>${progressPct}%</span>
          </div>
          <div class="tile-progress-track">
            <div class="tile-progress-fill" style="width: ${progressPct}%;"></div>
          </div>
        </div>

        <div class="tile-metrics-grid">
          <div class="tile-metric-item">
            <span class="tile-metric-label">Mastered</span>
            <span class="tile-metric-value" style="color:#16a34a;">${completedSets} <small style="font-size:10px; color:#64748b;">/${totalSets}</small></span>
          </div>
          <div class="tile-metric-item">
            <span class="tile-metric-label">Remaining</span>
            <span class="tile-metric-value" style="color:#d97706;">${remainingSets} Sets</span>
          </div>
          <div class="tile-metric-item">
            <span class="tile-metric-label">Avg Accuracy</span>
            <span class="tile-metric-value">${avgScorePct > 0 ? avgScorePct + '%' : '--'}</span>
          </div>
        </div>

        <div class="tile-action-footer">
          <span style="color:#64748b; font-size:11px; font-weight:600;">${totalAttemptsForSubject} Attempts Logged</span>
          <span>Explore Sets ➔</span>
        </div>
      `;

      tile.addEventListener("click", () => drillDownToSubject(subName));
      container.appendChild(tile);
  });
}

window.toggleMastheadSearch = function(isOpen) {
  const defaultBar = document.getElementById("mastheadDefaultBar");
  const searchBar = document.getElementById("mastheadSearchBar");
  const searchInput = document.getElementById("topicSearchInput");

  if (isOpen) {
    if (defaultBar) defaultBar.style.display = "none";
    if (searchBar) {
      searchBar.style.display = "flex";
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
    }
  } else {
    if (searchBar) searchBar.style.display = "none";
    if (defaultBar) defaultBar.style.display = "flex";
    if (searchInput) {
      searchInput.value = "";
      filterAccordionCards("");
    }
  }
};

window.drillDownToSubject = function(subjectName, pushHistory = true) {
  activeSubject = subjectName;
  
  const hubStage = document.getElementById("subjectHubStage");
  const explorerStage = document.getElementById("setsExplorerStage");
  const titleEl = document.getElementById("explorerSubjectTitle");
  const statsEl = document.getElementById("explorerSubjectStats");
  const hiddenTitleEl = document.getElementById("activeSubjectTitle");

  const subjectSets = catalogData.filter(r => (r.subject || "General Studies") === subjectName);
  let masteredCount = 0;
  subjectSets.forEach(s => {
    const attempts = userAttemptHistory.filter(a => String(a.test_id) === String(s.test_id));
    if (attempts.length > 0) {
      let bestScore = Math.max(...attempts.map(a => parseFloat(a.score)));
      let maxMarks = (s.total_questions || 10) * 2;
      if (maxMarks > 0 && (bestScore / maxMarks) * 100 >= 100) masteredCount++;
    }
  });

  if (titleEl) titleEl.innerText = subjectName;
  if (statsEl) statsEl.innerText = `${subjectSets.length} Sets • ${masteredCount} Mastered`;
  if (hiddenTitleEl) hiddenTitleEl.innerText = subjectName;

  toggleMastheadSearch(false);

  if (hubStage) hubStage.style.display = "none";
  if (explorerStage) explorerStage.style.display = "block";

  currentFilter = "all";
  document.querySelectorAll('.filter-chip-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-filter') === 'all');
  });

  renderTopicSets();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pushHistory) {
    history.pushState({ view: 'viewLibrary', subView: 'setsExplorer', subject: subjectName }, "", "#subject_" + encodeURIComponent(subjectName));
  }
};

window.returnToSubjectHub = function(fromPopState = false) {
  if (!fromPopState && history.state && history.state.subView === 'setsExplorer') {
    history.back();
    return;
  }

  const hubStage = document.getElementById("subjectHubStage");
  const explorerStage = document.getElementById("setsExplorerStage");

  toggleMastheadSearch(false);

  if (explorerStage) explorerStage.style.display = "none";
  if (hubStage) hubStage.style.display = "block";

  renderSubjectHubGrid();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (!fromPopState) {
    history.replaceState({ view: 'viewLibrary', subView: 'hub' }, "", "#viewLibrary");
  }
};

function renderTopicSets() {
  const container = document.getElementById("topicsContainer");
  if (!container) return;
  container.innerHTML = "";

  if (librarySelectionMode && targetPlaylistForSelection) {
      let banner = document.getElementById("librarySelectionBanner");
      if (!banner) {
          banner = document.createElement("div");
          banner.id = "librarySelectionBanner";
          banner.style.cssText = "padding: 12px 18px; margin-bottom: 14px; border-radius: 8px; font-weight: 700; font-size: 13.5px; position: sticky; top: 60px; z-index: 10; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);";
          document.getElementById("setsExplorerStage").insertBefore(banner, document.getElementById("explorerMasthead").nextSibling);
      }
      banner.style.display = "flex";
      banner.innerHTML = `
          <span>📌 Adding to: <strong style="color:#93c5fd; text-decoration:underline;">${targetPlaylistForSelection.name}</strong></span>
          <button type="button" style="background:transparent; border:none; color:white; font-size:18px; cursor:pointer;" onclick="cancelLibrarySelectionMode()">✕</button>
      `;

      let fBar = document.getElementById("librarySelectionFloatingBar");
      if (!fBar) {
          fBar = document.createElement("div");
          fBar.id = "librarySelectionFloatingBar";
          fBar.style.cssText = `position: fixed; bottom: ${window.innerWidth <= 768 ? '72px' : '24px'}; left: 50%; transform: translateX(-50%); border-radius: 50px; padding: 10px 20px; display: flex; align-items: center; gap: 16px; z-index: 2000; box-shadow: 0 10px 30px rgba(0,0,0,0.18); transition: all 0.2s ease;`;
          document.body.appendChild(fBar);
      }
      fBar.style.display = "flex";
      fBar.innerHTML = `
          <span id="librarySelectionCount" style="font-weight:800; color:var(--tcs-blue-header); font-size:13.5px;">${selectedSetsForBatch.size} Selected</span>
          <button type="button" style="background:var(--success); color:white; border:none; padding:8px 18px; border-radius:20px; font-weight:700; cursor:pointer; font-size:13px;" onclick="commitBatchSelectionToPlaylist()">Add Selected</button>
      `;
  }

  const filtered = catalogData.filter(r => (r.subject || "General Studies") === activeSubject);

  let totalSubjectSets = filtered.length;
  let unattemptedCount = 0;
  let reviseCount = 0;
  let masteredCount = 0;

  filtered.forEach(setItem => {
    const attempts = userAttemptHistory.filter(a => String(a.test_id) === String(setItem.test_id));
    if (attempts.length === 0) {
      unattemptedCount++;
    } else {
      let bestScore = Math.max(...attempts.map(a => parseFloat(a.score)));
      let maxMarks = (setItem.total_questions || 10) * 2;
      let pct = maxMarks > 0 ? (bestScore / maxMarks) * 100 : 0;
      if (pct >= 100) masteredCount++;
      else reviseCount++;
    }
  });

  document.querySelectorAll('.filter-chip-btn').forEach(btn => {
    const f = btn.getAttribute('data-filter');
    if (f === 'all') btn.innerText = `All (${totalSubjectSets})`;
    else if (f === 'unattempted') btn.innerText = `⚡ Unattempted (${unattemptedCount})`;
    else if (f === 'revise') btn.innerText = `🔄 Revise (${reviseCount})`;
    else if (f === 'mastered') btn.innerText = `🏆 Mastered (${masteredCount})`;
  });

  if (!librarySelectionMode) {
      const now = new Date();
      const dueWeakQs = userWeakQuestions.filter(q => {
        return q.subject === activeSubject && 
               q.times_wrong > 0 && 
               (q.mastery_streak || 0) < 4 && 
               (!q.next_review_at || new Date(q.next_review_at) <= now);
      });
      
      if (dueWeakQs.length > 0) {
          const mbCard = document.createElement("div");
          mbCard.className = "topic-accordion-card";
          mbCard.style.cssText = "border: 1px solid rgba(239, 68, 68, 0.2); border-left: 4px solid #ef4444; margin-bottom: 16px; background: rgba(239, 68, 68, 0.03);";
          mbCard.innerHTML = `
              <div style="padding: 16px;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 14px; gap: 12px;">
                      <div style="flex: 1; min-width: 0;">
                          <h4 style="font-size:14.5px; font-weight:800; color:#ef4444; margin:0 0 4px 0; display:flex; align-items:center; gap:6px;">
                              <span>🧠</span> TARGETED REVISION
                          </h4>
                          <p style="font-size:11.5px; color:#64748b; margin:0; font-weight:600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                              ${dueWeakQs.length} questions need attention today
                          </p>
                      </div>
                      <span style="background:rgba(239, 68, 68, 0.12); color:#ef4444; padding:4px 8px; border-radius:4px; font-size:9.5px; font-weight:800; white-space:nowrap; flex-shrink:0; border: 1px solid rgba(239, 68, 68, 0.25); letter-spacing: 0.5px;">MISTAKE BANK</span>
                  </div>
                  <div class="secondary-modes-strip" style="display:flex; gap:8px; width: 100%;">
                      <button type="button" class="btn-launch-set" style="flex:1; background:rgba(239, 68, 68, 0.15); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.3); box-shadow:none;" onclick="launchMistakeBank('quiz')">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg> 
                          <span style="margin-left:4px;">Practice Qs (${dueWeakQs.length})</span>
                      </button>
                      <button type="button" class="btn-launch-set" style="flex:1; background:transparent; color:#ef4444; border:1px solid rgba(239, 68, 68, 0.3); box-shadow:none;" onclick="launchMistakeBank('flashcard')">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2" ry="2"></rect><path d="M21 7v12a2 2 0 0 1-2 2H7"></path></svg>
                          <span style="margin-left:4px;">Flashcards</span>
                      </button>
                  </div>
              </div>
          `;
          container.appendChild(mbCard);
      }
  }

  const grouped = {};
  filtered.forEach(item => {
    const key = item.topic || "Core Practice";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([topicName, sets]) => {
      let topicMastered = 0;
      const processedSets = [];

      sets.forEach(setItem => {
        const attempts = userAttemptHistory.filter(a => String(a.test_id) === String(setItem.test_id));
        let isAttempted = attempts.length > 0;
        let bestScore = isAttempted ? Math.max(...attempts.map(a => parseFloat(a.score))) : 0;
        let maxMarks = (setItem.total_questions || 10) * 2;
        let pct = maxMarks > 0 && isAttempted ? (bestScore / maxMarks) * 100 : 0;

        let status = 'unattempted';
        if (isAttempted) {
          if (pct >= 100) { status = 'mastered'; topicMastered++; }
          else { status = 'revise'; }
        }

        if (currentFilter === 'all' || currentFilter === status) {
          processedSets.push({ setItem, status, isAttempted, bestScore, maxMarks, pct, attemptsCount: attempts.length });
        }
      });

      if (processedSets.length === 0 && currentFilter !== 'all') return;

      processedSets.sort((a, b) => String(a.setItem.test_title || "").localeCompare(String(b.setItem.test_title || "")));

      let progressPct = sets.length > 0 ? (topicMastered / sets.length) * 100 : 0;

      const groupCard = document.createElement("div");
      groupCard.className = "topic-accordion-card";
      if (librarySelectionMode) groupCard.classList.add("open");

      const header = document.createElement("div");
      header.className = "topic-accordion-header";
      header.innerHTML = `
        <div class="header-left">
          <span class="icon-folder">📁</span>
          <span class="topic-title">${topicName}</span>
        </div>
        <div class="header-right">
          <span class="subtopic-tag">${topicMastered}/${sets.length} Mastered</span>
          <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="acc-progress-track">
          <div class="acc-progress-fill" style="width: ${progressPct}%;"></div>
        </div>
      `;

      const body = document.createElement("div");
      body.className = "topic-accordion-body";
      if (librarySelectionMode) body.style.display = "block";

      const setsGrid = document.createElement("div");
      setsGrid.className = "sets-card-grid";

      const iconTarget = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="2"></circle></svg>`;
      const iconRetake = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`;
      const clockSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
      const docSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;

      processedSets.forEach(({ setItem, status, bestScore, maxMarks, pct, attemptsCount }) => {
        const tile = document.createElement("div");
        tile.className = "set-tile";
        
        if (librarySelectionMode) {
            const isAlreadyInTargetList = targetPlaylistForSelection && userPlaylistItems.some(pi => pi.playlist_id === targetPlaylistForSelection.id && String(pi.test_id) === String(setItem.test_id));
            const isSelectedNow = selectedSetsForBatch.has(setItem.test_id);
            
            tile.style.cursor = isAlreadyInTargetList ? "not-allowed" : "pointer";
            if(isAlreadyInTargetList) tile.style.opacity = "0.6";

            let tickHtml = "";
            if (isAlreadyInTargetList) {
                tickHtml = `<span style="color:#16a34a; font-size:13px; font-weight:800; display:flex; align-items:center; gap:3px;" title="Already in playlist">✔️ Added</span>`;
            } else {
                tickHtml = `<button type="button" id="batchSelectBtn_${setItem.test_id}" style="pointer-events:none;">${isSelectedNow ? '☑️' : '⬜'}</button>`;
            }

            tile.innerHTML = `
              <div class="set-tile-header">
                <div style="display:flex; align-items:flex-start; gap:10px;">
                    ${tickHtml}
                    <div class="set-tile-title" style="margin-top:2px;">${setItem.test_title}</div>
                </div>
              </div>
              <div class="set-tile-meta" style="padding-left: 28px;">
                <span>${clockSvg} ${setItem.total_duration_minutes}m</span>
                <span>${docSvg} ${setItem.total_questions} Qs</span>
              </div>
            `;
            
            if(!isAlreadyInTargetList) {
                tile.addEventListener("click", () => {
                    toggleBatchSelection(setItem.test_id, isAlreadyInTargetList);
                    if(selectedSetsForBatch.has(setItem.test_id)) {
                        tile.style.borderColor = "var(--tcs-blue-accent)";
                        tile.style.backgroundColor = "rgba(37,99,235,0.02)";
                    } else {
                        tile.style.borderColor = "";
                        tile.style.backgroundColor = "";
                    }
                });
            }
        } else {
            let badgeClass = 'status-new';
            let badgeText = 'NEW';
            let examIcon = iconTarget;
            let examText = 'Exam';
            let historyHtml = `<span style="color:#64748b;">Not attempted yet</span>`;

            if (status === 'mastered') {
              badgeClass = 'status-mastered';
              badgeText = `MASTERED ${bestScore}/${maxMarks}`;
              examIcon = iconRetake;
              examText = 'Retake';
              historyHtml = `<span style="color:#16a34a;">★ Best Score: ${bestScore} (${Math.round(pct)}%) | Att: ${attemptsCount}</span>`;
            } else if (status === 'revise') {
              badgeClass = 'status-progress';
              badgeText = `IN PROGRESS`;
              examIcon = iconRetake;
              examText = 'Retake';
              historyHtml = `<span style="color:#d97706;">Needs Review: ${bestScore}/${maxMarks} | Att: ${attemptsCount}</span>`;
            }

            tile.innerHTML = `
              <div class="set-tile-header">
                <div class="set-tile-title">${setItem.test_title}</div>
                <div style="display:flex; gap: 8px; align-items: center;">
                   <div class="set-status-badge ${badgeClass}">${badgeText}</div>
                   <button type="button" class="btn-three-dots" onclick="openThreeDotsMenu(event, ${setItem.test_id})" title="Options">⋮</button>
                </div>
              </div>
              <div class="set-tile-meta">
                <span>${clockSvg} ${setItem.total_duration_minutes}m</span>
                <span>${docSvg} ${setItem.total_questions} Qs</span>
              </div>
              <div class="set-score-info">
                ${historyHtml}
              </div>
              <div class="set-action-footer">
                <button type="button" class="btn-launch-set" onclick="launchAssessment(${setItem.test_id})">
                  ${examIcon} <span>${examText}</span>
                </button>
                <div class="secondary-modes-strip">
                  <button type="button" class="btn-mode-icon" title="Read Mode" onclick="launchPracticeMode(${setItem.test_id}, 'read')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                  </button>
                  <button type="button" class="btn-mode-icon" title="Flashcards" onclick="launchPracticeMode(${setItem.test_id}, 'flashcard')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2" ry="2"></rect><path d="M21 7v12a2 2 0 0 1-2 2H7"></path></svg>
                  </button>
                  <button type="button" class="btn-mode-icon" title="Instant Quiz" onclick="launchPracticeMode(${setItem.test_id}, 'quiz')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                  </button>
                </div>
              </div>
            `;
        }
        setsGrid.appendChild(tile);
      });

      body.appendChild(setsGrid);
      groupCard.appendChild(header);
      groupCard.appendChild(body);
      container.appendChild(groupCard);

      if (!librarySelectionMode) {
          header.addEventListener("click", () => {
            const isOpen = groupCard.classList.contains("open");
            container.querySelectorAll(".topic-accordion-card").forEach(c => {
              if (c !== groupCard) {
                c.classList.remove("open");
                const b = c.querySelector(".topic-accordion-body");
                if (b) b.style.display = "none";
              }
            });
            if (!isOpen) {
              groupCard.classList.add("open");
              body.style.display = "block";
            } else {
              groupCard.classList.remove("open");
              body.style.display = "none";
            }
          });
      }
  });
}

// ==========================================================================
// 7. MISTAKE BANK TELEMETRY
// ==========================================================================
const REVIEW_INTERVALS_DAYS = [1, 3, 6, 15];

async function syncMistakeBank(payloads) {
  if (!payloads || payloads.length === 0) return;
  try {
    for (const p of payloads) {
        const safeQuestionId = p.question_id ? String(p.question_id) : String(Math.abs((p.question_data.content || "").length * 999));
        
        const { data: existing, error: fetchErr } = await supabaseClient
            .from("student_question_stats")
            .select("id, times_wrong, times_correct, mastery_streak, next_review_at")
            .eq("student_roll", p.student_roll)
            .eq("question_id", safeQuestionId)
            .maybeSingle();

        if (fetchErr) continue;

        if (existing) {
            let newStreak = existing.mastery_streak || 0;
            let nextReview = new Date();

            if (p.isCorrect) {
              newStreak = Math.min(4, newStreak + 1);
              if (newStreak < 4) {
                const addDays = REVIEW_INTERVALS_DAYS[newStreak - 1];
                nextReview.setDate(nextReview.getDate() + addDays);
              } else {
                nextReview.setFullYear(nextReview.getFullYear() + 100);
              }
            } else {
              newStreak = 0;
              nextReview = new Date();
            }

            const updPayload = {
                times_wrong: p.isCorrect ? existing.times_wrong : existing.times_wrong + 1,
                times_correct: p.isCorrect ? existing.times_correct + 1 : existing.times_correct,
                mastery_streak: newStreak,
                next_review_at: nextReview.toISOString(),
                last_attempt_date: new Date().toISOString(),
                question_data: p.question_data 
            };
            await supabaseClient.from("student_question_stats").update(updPayload).eq("id", existing.id);
        } else {
            let newStreak = p.isCorrect ? 1 : 0;
            let nextReview = new Date();
            if (p.isCorrect) {
              nextReview.setDate(nextReview.getDate() + REVIEW_INTERVALS_DAYS[0]);
            }

            const insPayload = {
                student_roll: p.student_roll,
                subject: p.subject,
                question_id: safeQuestionId, 
                question_data: p.question_data,
                times_wrong: p.isCorrect ? 0 : 1,
                times_correct: p.isCorrect ? 1 : 0,
                mastery_streak: newStreak,
                next_review_at: nextReview.toISOString()
            };
            await supabaseClient.from("student_question_stats").insert(insPayload);
        }
    }
    await fetchWeakQuestions(); 
  } catch(e) {
    console.error("Mistake Bank Sync Exception: ", e);
  }
}

window.launchMistakeBank = function(mode, forceAll = false) {
  const now = new Date();
  
  const dueQs = userWeakQuestions.filter(q => {
    return q.subject === activeSubject && 
           q.times_wrong > 0 && 
           (q.mastery_streak || 0) < 4 && 
           (!q.next_review_at || new Date(q.next_review_at) <= now);
  });

  const allWeakQs = userWeakQuestions.filter(q => {
    return q.subject === activeSubject && 
           q.times_wrong > 0 && 
           (q.mastery_streak || 0) < 4;
  });

  if (allWeakQs.length === 0) {
    alert("🎉 बधाई! इस विषय के सभी कमजोर सवाल पूरी तरह मास्टर हो चुके हैं!");
    return;
  }

  let targetList = (forceAll || dueQs.length === 0) ? allWeakQs : dueQs;

  practiceQuestions = targetList.map((item, i) => {
      const qData = item.question_data || {};
      let parsedOptions = [];
      if (typeof qData.options === 'string') {
          try { parsedOptions = JSON.parse(qData.options); } catch(e) { parsedOptions = []; }
      } else if (Array.isArray(qData.options)) {
          parsedOptions = qData.options;
      }

      return {
          qNum: i + 1,
          id: item.question_id || qData.id,
          content: qData.content,
          options: parsedOptions,
          correctAnswer: getNormalizedCorrectAnswerId(qData.correct_answer || qData.correctAnswer, parsedOptions),
          explanation: qData.explanation,
          masteryStreak: item.mastery_streak || 0
      };
  }).sort(() => 0.5 - Math.random()).slice(0, 100);

  const tEl = document.getElementById("practiceSetTitle");
  if (tEl) {
    tEl.innerText = forceAll ? `Mega Mistake Bank (${practiceQuestions.length} Qs)` : ((targetList === dueQs) ? `Mistake Bank (Due: ${dueQs.length})` : `Mistake Bank (All: ${allWeakQs.length})`);
  }

  switchView("viewPractice");

  if (mode === "quiz") renderInteractiveQuizMode(); 
  else if (mode === "flashcard") {
      flashcardIndex = 0;
      renderFlashcardMode();
  }
};

// ==========================================================================
// 8. DAILY MIX & EXAM ENGINE
// ==========================================================================
window.launchDailyMix = async function() {
  const btn = document.getElementById("btnDailyMix");
  if (btn) btn.innerHTML = `<span>⏳</span> <span class="hide-on-mobile">Generating Mix...</span>`;
  
  try {
    const { data: attempts } = await supabaseClient.from("test_attempts").select("test_id, score").eq("student_roll", currentCandidate.roll_number);
    
    let finalQs = [];
    const weakList = userWeakQuestions.filter(q => q.times_wrong > 0 && (q.mastery_streak || 0) < 4).sort(() => 0.5 - Math.random()).slice(0, 15);
    
    finalQs = weakList.map(item => {
      const qData = item.question_data || {};
      let parsedOptions = typeof qData.options === 'string' ? JSON.parse(qData.options || "[]") : (qData.options || []);
      return { id: item.question_id || qData.id, content: qData.content, options: parsedOptions, correctAnswer: getNormalizedCorrectAnswerId(qData.correct_answer || qData.correctAnswer, parsedOptions), explanation: qData.explanation };
    });

    let retentionCount = 25 - finalQs.length;
    if (retentionCount > 0 && attempts && attempts.length > 0) {
      const masteredTestIds = [...new Set(attempts.map(a => a.test_id))];
      const { data: sectionRows } = await supabaseClient.from("test_sections").select("id").in("test_id", masteredTestIds);
      if (sectionRows && sectionRows.length > 0) {
        const validSectionIds = sectionRows.map(s => s.id);
        const { data: mixedData } = await supabaseClient.from("test_section_questions").select(`questions (id, content, options, correct_answer, explanation)`).in("section_id", validSectionIds).limit(50);
        if (mixedData) {
            let retentionQs = mixedData.map(item => Array.isArray(item.questions) ? item.questions[0] : item.questions).filter(Boolean).sort(() => 0.5 - Math.random()).slice(0, retentionCount);
            retentionQs.forEach(q => {
               let parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options || "[]") : (q.options || []);
               finalQs.push({ id: q.id, content: q.content, options: parsedOptions, correctAnswer: getNormalizedCorrectAnswerId(q.correct_answer, parsedOptions), explanation: q.explanation });
            });
        }
      }
    }

    if (finalQs.length === 0) throw new Error("Not enough data to generate mix. Try a regular set first.");

    practiceQuestions = finalQs.map((q, i) => ({ ...q, qNum: i + 1 }));

    const tEl = document.getElementById("practiceSetTitle");
    if (tEl) tEl.innerText = "Daily Mix (15 Weak + 10 Retention)";
    switchView("viewPractice");
    renderInteractiveQuizMode();

  } catch (err) {
    alert(err.message);
  } finally {
    if (btn) btn.innerHTML = `<span class="fab-icon">🚀</span> <span class="fab-label hide-on-mobile">Daily Mix</span>`;
  }
};

window.launchAssessment = async function(testId) {
  isExamFinished = false; 
  switchView("viewExam", true);
  
  const progressLine = document.getElementById("examProgressLine");
  if (progressLine) progressLine.style.width = "0%";
  const contentBox = document.getElementById("questionContent");
  if (contentBox) contentBox.innerText = "Configuring assessment runtime...";
  const rollEl = document.getElementById("examCandidateRoll");
  if (rollEl) rollEl.innerText = currentCandidate?.roll_number || "---";

  try {
    const { data: testInfo, error: testErr } = await supabaseClient.from("tests").select("id, title, total_duration_minutes").eq("id", testId).maybeSingle();
    if (testErr || !testInfo) throw new Error("Test details not found or deleted.");

    activeTest = testInfo;
    const examTitleEl = document.getElementById("examTitle");
    if (examTitleEl) examTitleEl.innerText = activeTest.title || "Assessment";
    const breadcrumb = document.getElementById("subjectLabelBreadcrumb");
    if (breadcrumb) breadcrumb.innerText = activeSubject || "General";
    timeRemaining = (activeTest.total_duration_minutes || 15) * 60;

    const { data: sections, error: secErr } = await supabaseClient.from("test_sections").select("id, section_name").eq("test_id", testId).limit(1);
    if (secErr || !sections || sections.length === 0) throw new Error("No sections configured for this test.");

    const section = sections[0];
    const tabsEl = document.getElementById("sectionTabs");
    if (tabsEl) tabsEl.innerHTML = `<button type="button" class="section-tab">Section 1: ${section.section_name || "General"}</button>`;

    const { data: qData, error: qErr } = await supabaseClient.from("test_section_questions").select(`question_number, questions (id, content, options, correct_answer, explanation)`).eq("section_id", section.id).order("question_number", { ascending: true });
    if (qErr || !qData || qData.length === 0) throw new Error("Questions failed to load.");

    testQuestions = qData.map(item => {
      const q = Array.isArray(item.questions) ? item.questions[0] : item.questions;
      if (!q) return null;

      let parsedOptions = [];
      if (typeof q.options === 'string') {
        try { parsedOptions = JSON.parse(q.options); } catch(e) { parsedOptions = []; }
      } else if (Array.isArray(q.options)) {
        parsedOptions = q.options;
      }

      return {
        qNum: item.question_number,
        id: q.id,
        content: q.content,
        options: parsedOptions,
        correctAnswer: getNormalizedCorrectAnswerId(q.correct_answer, parsedOptions),
        explanation: q.explanation
      };
    }).filter(Boolean);

    if (testQuestions.length === 0) throw new Error("Valid question formats missing.");

    userResponses = {};
    testQuestions.forEach((q, idx) => {
      userResponses[idx] = { selected: null, status: idx === 0 ? 1 : 0, timeSpent: 0 };
    });

    renderQuestion(0);
    startExamTimer();
  } catch (err) {
    alert(err.message);
    console.error("Exam Launch Failed:", err);
    switchView("viewDashboard");
  }
};

window.abortExamSession = function() {
  let modal = document.getElementById("submitModalContainer"); 
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "submitModalContainer";
    document.body.appendChild(modal);
  }
  
  modal.className = "tcs-modal-overlay";
  modal.style.setProperty("display", "flex", "important");
  
  modal.innerHTML = `
    <div class="tcs-modal-box" style="max-width: 420px; border-color: #ef4444;">
      <div class="tcs-modal-header" style="background: #ef4444; color: #ffffff;">
        ⚠️ Abort Assessment
      </div>
      <div class="tcs-modal-body" style="text-align: center; padding: 24px 20px;">
        <h3 style="margin-bottom: 12px; font-size: 18px;">Exit Assessment?</h3>
        <p style="color: #64748b; font-size: 13.5px; line-height: 1.5; margin-bottom: 24px;">
          Are you sure you want to exit? Your current exam progress will <strong>not</strong> be saved.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button type="button" class="tcs-btn btn-secondary" onclick="closeExamModal()" style="margin: 0; flex: 1;">Cancel</button>
          <button type="button" class="tcs-btn" onclick="executeAbortExam()" style="margin: 0; flex: 1; background: #ef4444; color: #ffffff; border: none;">Yes, Abort</button>
        </div>
      </div>
    </div>`;
};

window.executeAbortExam = function() {
  closeExamModal();
  if (timerInterval) clearInterval(timerInterval);
  isExamFinished = true; 
  history.back(); 
};

function renderQuestion(index) {
  if (!testQuestions[index]) return;
  currentIndex = index;
  const q = testQuestions[index];
  const state = userResponses[index];

  if (state.status === 0) state.status = 1;
  const progressLine = document.getElementById("examProgressLine");
  if (progressLine) progressLine.style.width = `${((index + 1) / testQuestions.length) * 100}%`;

  const qNumEl = document.getElementById("qDisplayNumber");
  if (qNumEl) qNumEl.innerText = q.qNum;
  const qContentEl = document.getElementById("questionContent");
  if (qContentEl) qContentEl.innerText = getLocalizedText(q.content);

  const optContainer = document.getElementById("optionsContainer");
  if (optContainer) optContainer.innerHTML = "";

  (Array.isArray(q.options) ? q.options : []).forEach(opt => {
    const row = document.createElement("label");
    row.className = "option-row";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "currentOpt";
    radio.value = String(opt.id);
    if (state.selected === String(opt.id)) radio.checked = true;
    radio.addEventListener("change", () => {
      userResponses[currentIndex].selected = String(opt.id);
    });
    const span = document.createElement("span");
    span.innerText = getLocalizedText({ en: opt.en || opt.text, hi: opt.hi });
    row.appendChild(radio);
    row.appendChild(span);
    if (optContainer) optContainer.appendChild(row);
  });

  renderPaletteGrid();
  updateStatusMatrix();
  if (window.innerWidth <= 768) {
    document.querySelector(".tcs-side-panel")?.classList.remove("open");
    document.getElementById("paletteOverlay")?.classList.remove("open");
  }
}

function advanceNextQuestion() {
  if (currentIndex + 1 < testQuestions.length) {
    renderQuestion(currentIndex + 1);
  } else {
    renderPaletteGrid();
    updateStatusMatrix();
    
    const panel = document.querySelector(".tcs-side-panel");
    const overlay = document.getElementById("paletteOverlay");
    if (panel) panel.classList.add("open");
    if (overlay && window.innerWidth <= 768) overlay.classList.add("open");
  }
}

function updateStatusMatrix() {
  let ans = 0, notAns = 0, notVis = 0, rev = 0, ansRev = 0;
  Object.values(userResponses).forEach(r => {
    if (r.status === 0) notVis++;
    else if (r.status === 1) notAns++;
    else if (r.status === 2) ans++;
    else if (r.status === 3) rev++;
    else if (r.status === 4) ansRev++;
  });
  const els = ["cntAnswered", "cntNotAnswered", "cntNotVisited", "cntReview", "cntAnsReview"];
  const vals = [ans, notAns, notVis, rev, ansRev];
  els.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.innerText = vals[i];
  });
}

function startExamTimer() {
  if (timerInterval) clearInterval(timerInterval);
  const updateTimerDisplays = () => {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    const formattedTime = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const desk = document.getElementById("timerDisplay");
    if (desk) desk.innerText = formattedTime;
    const mob = document.getElementById("mobileTimerDisplay");
    if (mob) mob.innerText = formattedTime;
  };
  updateTimerDisplays();
  timerInterval = setInterval(() => {
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      showExamSummaryModal();
      return;
    }
    timeRemaining--;
    updateTimerDisplays();
  }, 1000);
}

window.closeExamModal = function() {
  const m = document.getElementById("submitModalContainer");
  if (m) {
    m.className = "";
    m.innerHTML = "";
    m.style.cssText = "display: none !important;";
  }
};

window.showExamSummaryModal = function() {
  let ans = 0, notAns = 0, notVis = 0, rev = 0, ansRev = 0;
  Object.values(userResponses).forEach(r => { 
    if (r.status === 0) notVis++; 
    else if (r.status === 1) notAns++; 
    else if (r.status === 2) ans++; 
    else if (r.status === 3) rev++; 
    else if (r.status === 4) ansRev++; 
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
          <thead>
            <tr>
              <th>Status Category</th>
              <th>Total Count</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Total Questions</td><td>${testQuestions.length}</td></tr>
            <tr><td>Answered</td><td style="color:#16a34a; font-weight:bold;">${ans}</td></tr>
            <tr><td>Not Answered</td><td style="color:#dc2626; font-weight:bold;">${notAns}</td></tr>
            <tr><td>Marked for Review</td><td style="color:#7c3aed; font-weight:bold;">${rev}</td></tr>
            <tr><td>Answered & Marked for Review</td><td style="color:#7c3aed; font-weight:bold;">${ansRev}</td></tr>
            <tr><td>Not Visited</td><td>${notVis}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="tcs-modal-footer">
        <button type="button" class="tcs-btn btn-secondary" onclick="closeExamModal()">Back to Exam</button>
        <button type="button" class="tcs-btn btn-submit" id="btnConfirmSubmit" onclick="confirmAndFinishExam()">Confirm & Submit Exam</button>
      </div>
    </div>`;
};

window.confirmAndFinishExam = function() {
  const btn = document.getElementById("btnConfirmSubmit");
  if (btn) {
    btn.innerText = "Submitting...";
    btn.disabled = true;
  }
  if (timerInterval) clearInterval(timerInterval);
  renderScorecard();
};

function renderScorecard() {
  let correct = 0, incorrect = 0, unattempted = 0;
  let statsPayload = [];

  testQuestions.forEach((q, idx) => {
    const userAns = userResponses[idx].selected;
    const qStatus = userResponses[idx].status;

    if (!userAns) {
        unattempted++;
        statsPayload.push({ 
            student_roll: currentCandidate.roll_number, 
            subject: activeSubject || "General", 
            question_id: q.id, 
            question_data: q, 
            isCorrect: false 
        });
    }
    else if (String(userAns) === String(q.correctAnswer)) {
        correct++;
        if (qStatus === 4) {
            statsPayload.push({ student_roll: currentCandidate.roll_number, subject: activeSubject || "General", question_id: q.id, question_data: q, isCorrect: false });
        } else {
            statsPayload.push({ student_roll: currentCandidate.roll_number, subject: activeSubject || "General", question_id: q.id, question_data: q, isCorrect: true });
        }
    }
    else {
        incorrect++;
        statsPayload.push({ student_roll: currentCandidate.roll_number, subject: activeSubject || "General", question_id: q.id, question_data: q, isCorrect: false });
    }
  });

  const score = (correct * 2.00) - (incorrect * 0.50);
  const totalDurationSecs = (activeTest.total_duration_minutes || 15) * 60;
  const timeSpentSecs = Math.max(0, totalDurationSecs - timeRemaining);
  const timeSpentMins = Math.ceil(timeSpentSecs / 60);

  let modal = document.getElementById("submitModalContainer");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "submitModalContainer";
    document.body.appendChild(modal);
  }

  modal.className = "tcs-modal-overlay";
  modal.style.setProperty("display", "flex", "important");
  modal.innerHTML = `
    <div class="tcs-modal-box" style="width: 620px;">
      <div class="tcs-modal-header" style="background:#16a34a;">Assessment Scorecard & Analysis</div>
      <div class="tcs-modal-body">
        <div class="score-highlight-card">
          <h2 class="score-highlight-title">Score: ${score.toFixed(2)} / ${(testQuestions.length * 2)}</h2>
          <p style="font-size:12px; color:#64748b; margin-top: 4px;">Time Taken: ${Math.floor(timeSpentSecs / 60)}m ${timeSpentSecs % 60}s | Marking: +2.00 | -0.50</p>
        </div>
        <table class="modal-summary-table">
          <tbody>
            <tr><td>Correct Answers</td><td style="color:#16a34a; font-weight:bold;">${correct} (+${(correct * 2).toFixed(2)})</td></tr>
            <tr><td>Incorrect Answers</td><td style="color:#dc2626; font-weight:bold;">${incorrect} (-${(incorrect * 0.5).toFixed(2)})</td></tr>
            <tr><td>Unattempted</td><td>${unattempted}</td></tr>
            <tr><td>Accuracy</td><td>${(correct + incorrect) > 0 ? (((correct / (correct + incorrect)) * 100).toFixed(1)) : 0}%</td></tr>
          </tbody>
        </table>
        <div id="syncStatusMsg" style="font-size:12px; color:#2563eb; text-align:center; font-weight:600; margin-top: 8px;">Syncing results to database...</div>
      </div>
      <div class="tcs-modal-footer">
        <button type="button" class="tcs-btn btn-secondary" onclick="openSolutionsView()">View Detailed Solutions</button>
        <button type="button" class="tcs-btn btn-primary" onclick="closeExamAndReload()">Return to Mission</button>
      </div>
    </div>`;

  (async () => {
    if (statsPayload.length > 0) {
        await syncMistakeBank(statsPayload);
    }

    try {
      await supabaseClient.from("test_attempts").insert({
        student_roll: currentCandidate.roll_number,
        test_id: activeTest.id,
        score: score,
        total_correct: correct,
        total_incorrect: incorrect,
        time_spent_seconds: timeSpentSecs
      });
      
      dailyPerf.total_questions_attempted += testQuestions.length;
      let centuryHit = dailyPerf.total_questions_attempted >= 100;
      let newStreak = dailyPerf.streak_count;
      
      if (centuryHit && !dailyPerf.is_century_hit) {
          newStreak += 1;
          alert("🎉 BOOM! Daily Baseline Hit! Century Streak +1 🔥");
      }

      await supabaseClient.from("daily_performance").update({
          total_questions_attempted: dailyPerf.total_questions_attempted,
          is_century_hit: centuryHit,
          streak_count: newStreak
      }).eq("id", dailyPerf.id);

      dailyPerf.is_century_hit = centuryHit;
      dailyPerf.streak_count = newStreak;

      const todayList = userPlaylists.find(p => p.playlist_name === 'Today');
      if (todayList) {
          await supabaseClient.from("playlist_items").delete().match({ playlist_id: todayList.id, test_id: activeTest.id, student_roll: currentCandidate.roll_number });
      }

    } catch (err) {
      console.error("Execution Error:", err);
    }

    try {
      const d = new Date();
      const today = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
      
      const { data: attRecord } = await supabaseClient.from("daily_attendance").select("id, total_minutes_spent").eq("student_roll", currentCandidate.roll_number).eq("study_date", today).maybeSingle();
      if (attRecord) {
        await supabaseClient.from("daily_attendance").update({ total_minutes_spent: attRecord.total_minutes_spent + timeSpentMins }).eq("id", attRecord.id);
      } else {
        await supabaseClient.from("daily_attendance").insert({ student_roll: currentCandidate.roll_number, study_date: today, total_minutes_spent: timeSpentMins });
      }

      const syncMsg = document.getElementById("syncStatusMsg");
      if (syncMsg) {
        syncMsg.style.color = "#16a34a";
        syncMsg.innerText = "✔ Progress & Metrics Synced Successfully";
      }
    } catch (err) {
      console.error("Attendance Sync Error:", err);
      const syncMsg = document.getElementById("syncStatusMsg");
      if (syncMsg) {
        syncMsg.style.color = "#dc2626";
        syncMsg.innerText = "⚠ Saved locally (Cloud sync failed)";
      }
    }
  })();
}

window.closeExamAndReload = async function() {
  closeExamModal();
  isExamFinished = true;
  await fetchPlaylistsAndCheckRollover();
  renderHomePlaylists();
  switchView('viewDashboard');
};

window.openSolutionsView = function() {
  closeExamModal();
  const tEl = document.getElementById("solExamTitle");
  if (tEl) tEl.innerText = activeTest?.title || "Assessment";
  
  switchView("viewSolutions", false);
  history.replaceState({ view: 'viewSolutions' }, "", "#viewSolutions");

  const container = document.getElementById("solutionsContainer");
  if (!container) return;
  container.innerHTML = "";

  testQuestions.forEach((q, idx) => {
    const userAns = userResponses[idx].selected;
    const correctAns = String(q.correctAnswer);
    let statusText = "Unattempted";
    let statusClass = "sol-status-unattempted";

    if (userAns) {
      if (String(userAns) === correctAns) {
        statusText = "Correct";
        statusClass = "sol-status-correct";
      } else {
        statusText = "Incorrect";
        statusClass = "sol-status-incorrect";
      }
    }

    let qText = getLocalizedText(q.content);
    let expText = "No explanation provided.";
    if (q.explanation) {
      let parsedExp = getLocalizedText(q.explanation);
      if (parsedExp && parsedExp !== '{"en":""}' && parsedExp !== '{"en":"","hi":""}' && parsedExp.trim() !== "") {
        expText = parsedExp;
      }
    }

    let optionsHtml = "";
    (Array.isArray(q.options) ? q.options : []).forEach(opt => {
      const optId = String(opt.id);
      let optClass = "sol-option";
      let icon = "⚪";
      if (optId === correctAns) {
        optClass += " sol-opt-correct";
        icon = "✔️";
      } else if (optId === String(userAns) && optId !== correctAns) {
        optClass += " sol-opt-wrong";
        icon = "❌";
      }
      optionsHtml += `<div class="${optClass}"><span>${icon}</span><span>${getLocalizedText({ en: opt.en || opt.text, hi: opt.hi })}</span></div>`;
    });

    const card = document.createElement("div");
    card.className = "solution-card";
    card.innerHTML = `
      <div class="sol-q-header">
        <span>Question ${q.qNum}</span>
        <span class="sol-status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="sol-content">${qText}</div>
      <div style="margin-bottom: 16px;">${optionsHtml}</div>
      <div class="sol-explanation"><strong>Explanation:</strong><br/>${expText}</div>`;
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
// 9. ANALYTICS
// ==========================================================================
function drawSparkline(elementId, dataArray, color) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (!dataArray || dataArray.length === 0) {
    el.innerHTML = '';
    return;
  }
  const max = Math.max(...dataArray, 1);
  const len = Math.max(dataArray.length - 1, 1);
  const points = dataArray.map((val, i) => `${(i / len) * 60},${30 - ((val / max) * 25)}`).join(" ");
  el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 60 30" preserveAspectRatio="none"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

let _isFetchingStats = false;

window.fetchStudentAnalytics = async function(isSilent = false) {
  if (_isFetchingStats) return;
  _isFetchingStats = true;
  
  try {
    const d = new Date();
    const todayStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
    
    const { data: attempts } = await supabaseClient
      .from("test_attempts")
      .select("test_id, score, total_correct, total_incorrect, attempt_date, time_spent_seconds")
      .eq("student_roll", currentCandidate.roll_number)
      .order("attempt_date", { ascending: true });

    const { data: attendance } = await supabaseClient
      .from("daily_attendance")
      .select("study_date, total_minutes_spent")
      .eq("student_roll", currentCandidate.roll_number);

    const bestAttemptByTest = {};
    let totalAttemptsCount = attempts ? attempts.length : 0;
    let totalRawTimeSecs = 0;
    let totalQuestionsAttempted = 0;
    let netCorrect = 0;
    let netIncorrect = 0;

    if (attempts && attempts.length > 0) {
      attempts.forEach(a => {
        totalRawTimeSecs += (a.time_spent_seconds || 0);
        totalQuestionsAttempted += ((a.total_correct || 0) + (a.total_incorrect || 0));
        netCorrect += (a.total_correct || 0);
        netIncorrect += (a.total_incorrect || 0);

        const tid = String(a.test_id);
        if (!bestAttemptByTest[tid] || parseFloat(a.score) > parseFloat(bestAttemptByTest[tid].score)) {
          bestAttemptByTest[tid] = a;
        }
      });
    }

    const subjectStats = {};
    const masteredTestIds = new Set();
    const recentAccuracyTrends = [];
    const uniqueAttemptedList = Object.values(bestAttemptByTest);

    uniqueAttemptedList.forEach(a => {
      const c = a.total_correct || 0;
      const w = a.total_incorrect || 0;
      
      const cat = catalogData.find(item => String(item.test_id) === String(a.test_id));
      const totalQs = cat ? (cat.total_questions || (c + w)) : (c + w);
      const maxMarks = totalQs * 2;
      const pct = maxMarks > 0 ? Math.max(0, (a.score / maxMarks) * 100) : 0;

      if (pct >= 100) {
        masteredTestIds.add(String(a.test_id));
      }
      recentAccuracyTrends.push(Math.round(pct));

      const subj = cat ? (cat.subject || "General") : "General";

      if (!subjectStats[subj]) {
        subjectStats[subj] = { 
          earnedScore: 0, 
          maxScore: 0, 
          correct: 0, 
          incorrect: 0, 
          attemptedSets: 0 
        };
      }
      subjectStats[subj].earnedScore += parseFloat(a.score);
      subjectStats[subj].maxScore += maxMarks;
      subjectStats[subj].correct += c;
      subjectStats[subj].incorrect += w;
      subjectStats[subj].attemptedSets += 1;
    });

    const totalAttemptedQ = netCorrect + netIncorrect;
    const accuracyVal = totalAttemptedQ > 0 ? ((netCorrect / totalAttemptedQ) * 100).toFixed(1) : "0.0";
    const avgSpeedVal = totalAttemptedQ > 0 ? Math.round(totalRawTimeSecs / totalAttemptedQ) : 0;

    let todayMins = 0;
    let attendanceMap = {};
    let last7DaysMins = 0;
    const past7DaysDates = [];

    for (let i = 0; i < 7; i++) {
      let d7 = new Date();
      d7.setDate(d7.getDate() - i);
      const tzDate = new Date(d7.getTime() - (d7.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
      past7DaysDates.push(tzDate);
    }

    if (attendance) {
      attendance.forEach(rec => {
        const m = rec.total_minutes_spent || 0;
        attendanceMap[rec.study_date] = m;
        if (rec.study_date === todayStr) todayMins = m;
        if (past7DaysDates.includes(rec.study_date)) last7DaysMins += m;
      });
    }

    let streakCount = dailyPerf.streak_count || 0; 

    // 🚀 Sync badges across all headers (Home, Library, Analytics)
    ['headerStreakCount', 'headerStreakCount_lib', 'headerStreakCount_stats'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = streakCount + (window.innerWidth <= 768 ? "" : " Days");
    });
    ['headerAccuracyCount', 'headerAccuracyCount_lib', 'headerAccuracyCount_stats'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = accuracyVal + "%";
    });

    if (isSilent) {
      _isFetchingStats = false;
      return;
    }

    const eAcc = document.getElementById("statAccuracy");
    if (eAcc) {
      eAcc.innerHTML = `
        <div style="display:flex; align-items:baseline; gap:6px;">
          <span>${accuracyVal}%</span>
          <span style="font-size:10px; font-weight:700; color:#16a34a; font-family:var(--font-family);">+${netCorrect}</span>
          <span style="font-size:10px; font-weight:700; color:#dc2626; font-family:var(--font-family);">-${netIncorrect}</span>
        </div>
      `;
    }

    const eStreak = document.getElementById("statStreak");
    if (eStreak) {
      const streakStatus = streakCount > 2 ? "Consistent" : "Starting";
      eStreak.innerHTML = `
        <div style="display:flex; align-items:baseline; gap:6px;">
          <span>${streakCount} 🔥</span>
          <span style="font-size:10px; font-weight:700; color:#2563eb; font-family:var(--font-family); text-transform:uppercase;">${streakStatus}</span>
        </div>
      `;
    }

    const eSpeed = document.getElementById("statSpeed");
    if (eSpeed) {
      let speedBadge = "Balanced";
      let speedColor = "#2563eb";
      if (avgSpeedVal > 0 && avgSpeedVal <= 15) { speedBadge = "Rapid"; speedColor = "#16a34a"; }
      else if (avgSpeedVal > 35) { speedBadge = "Thorough"; speedColor = "#d97706"; }

      eSpeed.innerHTML = `
        <div style="display:flex; align-items:baseline; gap:6px;">
          <span>${avgSpeedVal}s</span>
          <span style="font-size:10px; font-weight:700; color:${speedColor}; font-family:var(--font-family); text-transform:uppercase;">${speedBadge}</span>
        </div>
      `;
    }

    const sortedAttendanceDates = Object.keys(attendanceMap).sort((a, b) => new Date(a) - new Date(b));
    drawSparkline("sparkAccuracy", recentAccuracyTrends.slice(-10), "#38bdf8");
    drawSparkline("sparkStreak", sortedAttendanceDates.slice(-10).map(d => attendanceMap[d] || 0), "#f59e0b");
    drawSparkline("sparkSpeed", recentAccuracyTrends.slice(-10).map(() => avgSpeedVal), "#10b981");

    const extraSummaryEl = document.getElementById("extraAnalyticsSummary");
    if (extraSummaryEl) {
      const dayDotsHtml = past7DaysDates.slice().reverse().map(d => {
        const isActive = (attendanceMap[d] || 0) > 0;
        const dayLabel = new Date(d).toLocaleDateString('en-US', { weekday: 'narrow' });
        const dotBg = isActive ? "var(--tcs-blue-accent)" : "var(--border-color)";
        const dotColor = isActive ? "#ffffff" : "#64748b";
        return `
          <div style="display:flex; flex-direction:column; align-items:center; gap:3px;">
            <span style="font-size:9px; color:#64748b; font-weight:700;">${dayLabel}</span>
            <span style="width:18px; height:18px; border-radius:50%; background:${dotBg}; color:${dotColor}; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800;">
              ${isActive ? '✓' : '•'}
            </span>
          </div>
        `;
      }).join("");

      const activeDaysCount = Object.keys(attendanceMap).filter(d => past7DaysDates.includes(d)).length;
      const dailyAvgMins = Math.round(last7DaysMins / 7);

      extraSummaryEl.innerHTML = `
        <div class="profile-section-card" style="padding: 16px; border-left: 4px solid #22c55e;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
            <h4 style="font-size: 13.5px; font-weight:700; color:var(--tcs-blue-header); margin:0;">🎯 Today's Focus & Output</h4>
            <span style="font-size:10px; font-weight:800; background:rgba(34,197,94,0.12); color:#16a34a; padding:2px 8px; border-radius:12px;">ACTIVE SESSION</span>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
            <div style="background:var(--bg-primary); padding:10px; border-radius:6px; border:1px solid var(--border-color);">
              <span style="font-size:11px; color:#64748b; font-weight:600; display:block;">Time Invested</span>
              <strong style="font-size:16px; color:#16a34a; font-family:var(--font-mono);">${Math.floor(todayMins / 60)}h ${todayMins % 60}m</strong>
            </div>
            <div style="background:var(--bg-primary); padding:10px; border-radius:6px; border:1px solid var(--border-color);">
              <span style="font-size:11px; color:#64748b; font-weight:600; display:block;">Sets Mastered (100%)</span>
              <strong style="font-size:16px; color:#16a34a; font-family:var(--font-mono);">${masteredTestIds.size} Sets</strong>
            </div>
          </div>
        </div>

        <div class="profile-section-card" style="padding: 16px; border-left: 4px solid var(--tcs-blue-accent);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
            <h4 style="font-size: 13.5px; font-weight:700; color:var(--tcs-blue-header); margin:0;">📊 Weekly Consistency Track</h4>
            <span style="font-size:11px; font-weight:700; color:var(--tcs-blue-accent); font-family:var(--font-mono);">${activeDaysCount} / 7 Days Active</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 6px; margin: 8px 0; background:var(--bg-primary); border-radius:6px; border:1px solid var(--border-color);">
            ${dayDotsHtml}
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11.5px; color:#64748b; margin-top:4px;">
            <span>Total: <strong style="color:var(--tcs-blue-accent); font-family:var(--font-mono);">${Math.floor(last7DaysMins / 60)}h ${last7DaysMins % 60}m</strong></span>
            <span>Daily Pace: <strong style="color:var(--tcs-blue-accent); font-family:var(--font-mono);">${dailyAvgMins}m / day</strong></span>
          </div>
        </div>
      `;
    }

    const totalAvailableSets = catalogData.length > 0 ? catalogData.length : 1;
    const syllabusPct = Math.min(100, Math.round((masteredTestIds.size / totalAvailableSets) * 100));
    const eSyl = document.getElementById("syllabusPercentTxt");
    if (eSyl) {
      eSyl.innerText = syllabusPct + "%";
      eSyl.style.color = "var(--tcs-blue-accent)";
    }
    const linearFill = document.getElementById("syllabusLinearFill");
    if (linearFill) {
      linearFill.style.width = syllabusPct + "%";
    }

    let bestSubj = null;
    let worstSubj = null;
    const validSubjectEntries = Object.entries(subjectStats);

    if (validSubjectEntries.length > 0) {
      validSubjectEntries.forEach(([name, data]) => {
        const accuracy = data.maxScore > 0 ? Math.max(0, (data.earnedScore / data.maxScore) * 100) : 0;
        const totalQ = data.correct + data.incorrect;
        const penaltyRatio = totalQ > 0 ? ((data.incorrect * 0.5) / (totalQ * 2)) * 100 : 0;

        const info = { name, accuracy, penaltyRatio, ...data };
        if (!bestSubj || info.accuracy > bestSubj.accuracy) bestSubj = info;
        if (!worstSubj || info.accuracy < worstSubj.accuracy) worstSubj = info;
      });
    }

    const insS = document.getElementById("insightStrong");
    if (insS) {
      if (bestSubj && bestSubj.attemptedSets > 0) {
        insS.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>🔥 Strongest Domain: ${bestSubj.name}</strong>
            <span style="font-weight:800; font-family:var(--font-mono); color:#16a34a;">${Math.round(bestSubj.accuracy)}%</span>
          </div>
          <div style="font-size:11.5px; color:#64748b; margin-top:4px;">
            High strike-rate across ${bestSubj.attemptedSets} completed sets (${bestSubj.correct} correct answers).
          </div>
        `;
      } else {
        insS.innerHTML = `<strong>🔥 Strongest:</strong> Complete sets to identify your core strength.`;
      }
    }

    const insW = document.getElementById("insightWeak");
    if (insW) {
      if (worstSubj && worstSubj.attemptedSets > 0) {
        const penaltyDeduction = (worstSubj.incorrect * 0.5).toFixed(1);
        insW.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>⚠️ Priority Focus: ${worstSubj.name}</strong>
            <span style="font-weight:800; font-family:var(--font-mono); color:#dc2626;">${Math.round(worstSubj.accuracy)}%</span>
          </div>
          <div style="font-size:11.5px; color:#64748b; margin-top:4px;">
            Negative marking penalty: <strong style="color:#dc2626;">-${penaltyDeduction} Marks</strong> (${worstSubj.incorrect} wrong). Curtail random guesses.
          </div>
        `;
      } else {
        insW.innerHTML = `<strong>⚠️ Priority Focus:</strong> Attempt diagnostic assessments to flag weaker domains.`;
      }
    }

    const allCatalogSubjects = Array.from(new Set(catalogData.map(c => c.subject || "General Studies")));
    
    const subjectMetricsList = allCatalogSubjects.map(subj => {
      const stats = subjectStats[subj] || { earnedScore: 0, maxScore: 0, attemptedSets: 0 };
      const scorePct = stats.maxScore > 0 ? Math.max(0, Math.round((stats.earnedScore / stats.maxScore) * 100)) : 0;
      return {
        subject: subj,
        scorePct: scorePct,
        attempted: stats.attemptedSets
      };
    });

    const gridContainer = document.getElementById("gridViewport");
    if (gridContainer) {
      gridContainer.innerHTML = "";
      subjectMetricsList.forEach(item => {
        const chip = document.createElement("div");
        chip.className = "micro-domain-chip";
        chip.innerHTML = `
          <div class="micro-chip-top">
            <span class="micro-chip-title" title="${item.subject}">${item.subject}</span>
            <span class="micro-chip-val">${item.scorePct}%</span>
          </div>
          <div class="micro-chip-bar">
            <div class="micro-chip-fill" style="width: ${item.scorePct}%;"></div>
          </div>
        `;
        gridContainer.appendChild(chip);
      });
    }

    const radarCanvas = document.getElementById("subjectRadarChart");
    if (radarCanvas && window.Chart) {
      const isDark = document.body.classList.contains("dark-theme");
      const gridColor = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(15, 23, 42, 0.08)";
      const labelColor = isDark ? "#94a3b8" : "#475569";
      const accentColor = isDark ? "#38bdf8" : "#2563eb";
      const accentFill = isDark ? "rgba(56, 189, 248, 0.25)" : "rgba(37, 99, 235, 0.18)";

      const radarLabels = subjectMetricsList.map(s => s.subject.length > 12 ? s.subject.substring(0, 10) + ".." : s.subject);
      const radarValues = subjectMetricsList.map(s => s.scorePct);

      if (subjectRadarChartInstance) {
        subjectRadarChartInstance.destroy();
      }

      subjectRadarChartInstance = new Chart(radarCanvas, {
        type: 'radar',
        data: {
          labels: radarLabels,
          datasets: [{
            label: 'Competency %',
            data: radarValues,
            backgroundColor: accentFill,
            borderColor: accentColor,
            borderWidth: 2,
            pointBackgroundColor: accentColor,
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: accentColor,
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Mastery: ${ctx.raw}%`
              }
            }
          },
          scales: {
            r: {
              angleLines: { color: gridColor },
              grid: { color: gridColor },
              pointLabels: {
                color: labelColor,
                font: { size: 10, weight: '700' }
              },
              suggestedMin: 0,
              suggestedMax: 100,
              ticks: {
                display: false,
                stepSize: 25
              }
            }
          }
        }
      });
    }

    renderHeatmap(attendanceMap);

  } catch (err) {
    console.error("Analytics fetch error:", err);
  } finally {
    _isFetchingStats = false;
  }
};

function renderHeatmap(attendanceMap) {
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
    const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
    const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const mins = attendanceMap[dateStr] || 0;
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    
    if (mins > 90) cell.classList.add("hm-lvl-4");      
    else if (mins > 45) cell.classList.add("hm-lvl-3"); 
    else if (mins > 15) cell.classList.add("hm-lvl-2"); 
    else if (mins > 0) cell.classList.add("hm-lvl-1");  
    else cell.classList.add("absent");                  

    cell.addEventListener("mouseenter", (e) => {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      let timeText = mins === 0 ? "No activity" : (hrs > 0 ? `${hrs}h ${remainingMins}m` : `${remainingMins} mins`);
      let glowColor = mins > 45 ? "#4ade80" : (mins > 0 ? "#a3e635" : "#94a3b8");

      tooltip.innerHTML = `
        <div style="font-weight:700; color:#cbd5e1; margin-bottom:4px;">${displayDate}</div>
        <div style="font-size:13px; font-family:var(--font-mono); font-weight:800; color:${glowColor};">
          ⏱️ ${timeText}
        </div>
      `;
      
      tooltip.classList.add("show");
      
      const rect = cell.getBoundingClientRect();
      const tWidth = tooltip.offsetWidth;
      const tHeight = tooltip.offsetHeight;
      
      let centerX = rect.left + (rect.width / 2);
      const screenPadding = 12; 
      
      if (centerX - (tWidth / 2) < screenPadding) {
        centerX = (tWidth / 2) + screenPadding;
      } else if (centerX + (tWidth / 2) > window.innerWidth - screenPadding) {
        centerX = window.innerWidth - (tWidth / 2) - screenPadding;
      }
      
      tooltip.style.left = `${centerX}px`;
      tooltip.style.top = `${rect.top - tHeight}px`; 
    });

    cell.addEventListener("mouseleave", () => {
      tooltip.classList.remove("show");
    });

    container.appendChild(cell);
  }
}

// ==========================================================================
// 10. MULTI-MODE PRACTICE (READ/FLASHCARD/QUIZ)
// ==========================================================================
window.launchPracticeMode = async function(testId, mode) {
  const { data: testInfo } = await supabaseClient.from("tests").select("id, title").eq("id", testId).single();
  const { data: sections } = await supabaseClient.from("test_sections").select("id").eq("test_id", testId).limit(1);
  if (!sections || sections.length === 0) return;

  const { data: qData } = await supabaseClient.from("test_section_questions").select(`question_number, questions (id, content, options, correct_answer, explanation)`).eq("section_id", sections[0].id).order("question_number", { ascending: true });

  practiceQuestions = qData.map(item => {
    const q = Array.isArray(item.questions) ? item.questions[0] : item.questions;
    if (!q) return null;

    let parsedOptions = [];
    if (typeof q.options === 'string') {
      try { parsedOptions = JSON.parse(q.options); } catch(e) { parsedOptions = []; }
    } else if (Array.isArray(q.options)) {
      parsedOptions = q.options;
    }

    return {
      qNum: item.question_number,
      id: q.id,
      content: q.content,
      options: parsedOptions,
      correctAnswer: getNormalizedCorrectAnswerId(q.correct_answer, parsedOptions),
      explanation: q.explanation
    };
  }).filter(Boolean);

  const tEl = document.getElementById("practiceSetTitle");
  if (tEl) tEl.innerText = testInfo.title;
  switchView("viewPractice");

  if (mode === "read") renderReadMode();
  else if (mode === "quiz") renderInteractiveQuizMode();
  else if (mode === "flashcard") {
    flashcardIndex = 0;
    renderFlashcardMode();
  }
};

function renderReadMode() {
  const tEl = document.getElementById("practiceModeTitle");
  if (tEl) tEl.innerText = "📖 Read Mode";
  const container = document.getElementById("practiceContainer");
  if (!container) return;
  container.innerHTML = "";
  practiceQuestions.forEach(q => {
    let optionsHtml = (Array.isArray(q.options) ? q.options : []).map(opt => {
      const isCorrect = String(opt.id) === String(q.correctAnswer);
      return `<div class="sol-option ${isCorrect ? 'sol-opt-correct' : ''}" style="margin-bottom: 6px;"><span>${isCorrect ? '✔' : '•'}</span><span>${getLocalizedText({ en: opt.en || opt.text, hi: opt.hi })}</span></div>`;
    }).join("");
    
    let expText = "Self-explanatory.";
    if (q.explanation) {
      let parsedExp = getLocalizedText(q.explanation);
      if (parsedExp && parsedExp !== '{"en":""}' && parsedExp !== '{"en":"","hi":""}' && parsedExp.trim() !== "") {
        expText = parsedExp;
      }
    }

    const card = document.createElement("div");
    card.className = "solution-card";
    card.style.marginBottom = "16px";
    card.innerHTML = `<div class="sol-q-header"><span>Q${q.qNum}. Question</span></div><div class="sol-content">${getLocalizedText(q.content)}</div><div>${optionsHtml}</div><div class="sol-explanation"><strong>Explanation:</strong><br/>${expText}</div>`;
    container.appendChild(card);
  });
}

let localQuizState = { answers: {}, starred: new Set(), isFinished: false, filter: "all" };

function renderInteractiveQuizMode() {
  const tEl = document.getElementById("practiceModeTitle");
  if (tEl) tEl.innerText = "⚡ Instant Quiz";
  const container = document.getElementById("practiceContainer");
  if (!container) return;

  localQuizState = { answers: {}, starred: new Set(), isFinished: false, filter: "all" };
  renderQuizUI();
}

function renderQuizUI() {
  const container = document.getElementById("practiceContainer");
  if (!container) return;
  container.innerHTML = "";

  const practiceTitle = document.getElementById("practiceSetTitle")?.innerText || "";
  const isMistakeBank = practiceTitle.includes("Mistake Bank");

  if (localQuizState.isFinished) {
    const totalQ = practiceQuestions.length;
    const attemptedCount = Object.keys(localQuizState.answers).length;
    const unattemptedCount = totalQ - attemptedCount;
    let correctCount = 0;
    let wrongCount = 0;

    Object.values(localQuizState.answers).forEach(ans => {
      if (ans.isCorrect) correctCount++;
      else wrongCount++;
    });

    const netScore = (correctCount * 2.00) - (wrongCount * 0.50);
    const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const starredCount = localQuizState.starred.size;

    let scorecardHTML = "";
    if (isMistakeBank) {
        scorecardHTML = `
          <div class="quiz-score-grid">
            <div class="quiz-score-item">
              <span class="label">Attempted</span>
              <span class="value" style="color:var(--tcs-blue-accent);">${attemptedCount}</span>
            </div>
            <div class="quiz-score-item">
              <span class="label">Unattempted</span>
              <span class="value" style="color:#64748b;">${unattemptedCount}</span>
            </div>
            <div class="quiz-score-item">
              <span class="label">Promoted (Correct)</span>
              <span class="value" style="color:#16a34a;">${correctCount} ✅</span>
            </div>
            <div class="quiz-score-item">
              <span class="label">Demoted (Wrong)</span>
              <span class="value" style="color:#dc2626;">${wrongCount} ⚠️</span>
            </div>
            <div class="quiz-score-item">
              <span class="label">Starred ⭐</span>
              <span class="value" style="color:#d97706;">${starredCount}</span>
            </div>
            <div class="quiz-score-item">
              <span class="label">Accuracy</span>
              <span class="value">${accuracy}%</span>
            </div>
          </div>
        `;
    } else {
        scorecardHTML = `
          <div class="quiz-score-grid">
            <div class="quiz-score-item">
              <span class="label">Score</span>
              <span class="value" style="color:var(--tcs-blue-accent);">${netScore.toFixed(2)}</span>
            </div>
            <div class="quiz-score-item">
              <span class="label">Unattempted</span>
              <span class="value" style="color:#64748b;">${unattemptedCount}</span>
            </div>
            <div class="quiz-score-item">
              <span class="label">Correct</span>
              <span class="value" style="color:#16a34a;">+${correctCount}</span>
            </div>
            <div class="quiz-score-item">
              <span class="label">Incorrect</span>
              <span class="value" style="color:#dc2626;">-${wrongCount}</span>
            </div>
            <div class="quiz-score-item">
              <span class="label">Starred ⭐</span>
              <span class="value" style="color:#d97706;">${starredCount}</span>
            </div>
            <div class="quiz-score-item">
              <span class="label">Accuracy</span>
              <span class="value">${accuracy}%</span>
            </div>
          </div>
        `;
    }

    const banner = document.createElement("div");
    banner.className = "quiz-score-banner";
    banner.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="margin:0; font-size:15px; font-weight:800; color:var(--tcs-blue-header);">📊 Session Review</h4>
        <span style="font-size:11px; font-weight:800; background:rgba(37,99,235,0.1); color:var(--tcs-blue-accent); padding:3px 10px; border-radius:12px;">UNOFFICIAL / IN-MEMORY</span>
      </div>

      ${scorecardHTML}

      <div class="quiz-filter-strip">
        <button type="button" class="quiz-chip-btn ${localQuizState.filter === 'all' ? 'active' : ''}" onclick="filterQuizReview('all')">All Questions (${totalQ})</button>
        <button type="button" class="quiz-chip-btn ${localQuizState.filter === 'wrong' ? 'active' : ''}" onclick="filterQuizReview('wrong')">❌ Mistakes Only (${wrongCount})</button>
        <button type="button" class="quiz-chip-btn ${localQuizState.filter === 'starred' ? 'active' : ''}" onclick="filterQuizReview('starred')">⭐ Starred Only (${starredCount})</button>
        <button type="button" class="quiz-chip-btn ${localQuizState.filter === 'review' ? 'active' : ''}" onclick="filterQuizReview('review')">⚠️ Priority Review</button>
      </div>
    `;
    container.appendChild(banner);
  }

  practiceQuestions.forEach((q, idx) => {
    const isAnswered = localQuizState.answers[idx] !== undefined;
    const isWrong = isAnswered && !localQuizState.answers[idx].isCorrect;
    const isUnattempted = !isAnswered;
    const isStarred = localQuizState.starred.has(idx);

    if (localQuizState.isFinished) {
      if (localQuizState.filter === 'wrong' && !isWrong) return;
      if (localQuizState.filter === 'starred' && !isStarred) return;
      if (localQuizState.filter === 'review' && !isWrong && !isStarred && !isUnattempted) return;
    }

    const card = document.createElement("div");
    card.className = "solution-card";
    card.id = `quizCard_${idx}`;
    card.style.marginBottom = "20px";

    const savedAnswer = localQuizState.answers[idx];

    let optionsHtml = (Array.isArray(q.options) ? q.options : []).map(opt => {
      const optId = String(opt.id);
      let optClass = "option-row";
      if (savedAnswer) {
        if (optId === String(q.correctAnswer)) optClass += " sol-opt-correct";
        else if (optId === savedAnswer.selected && !savedAnswer.isCorrect) optClass += " sol-opt-wrong";
      }
      return `
        <div class="${optClass} quiz-opt-${idx}" data-opt-id="${opt.id}" style="${savedAnswer ? 'pointer-events:none;' : 'cursor:pointer;'} margin-bottom: 8px;">
          <span style="font-weight: 600;">${opt.id}.</span>
          <span>${getLocalizedText({ en: opt.en || opt.text, hi: opt.hi })}</span>
        </div>
      `;
    }).join("");

    let expText = "Verified.";
    if (q.explanation) {
      let parsedExp = getLocalizedText(q.explanation);
      if (parsedExp && parsedExp !== '{"en":""}' && parsedExp !== '{"en":"","hi":""}' && parsedExp.trim() !== "") {
        expText = parsedExp;
      }
    }

    let badgeClass = "sol-status-unattempted";
    let badgeText = "Practice";
    if (savedAnswer) {
      badgeClass = savedAnswer.isCorrect ? "sol-status-correct" : "sol-status-incorrect";
      badgeText = savedAnswer.isCorrect ? "Correct" : "Incorrect";
    }

    card.innerHTML = `
      <div class="sol-q-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <span>Q${q.qNum}</span>
          <span id="quizBadge_${idx}" class="sol-status-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="quiz-header-actions">
          <button type="button" class="btn-star-q ${isStarred ? 'starred' : ''}" onclick="toggleQuizStar(${idx})" title="Star Question">
            ${isStarred ? '★' : '☆'}
          </button>
        </div>
      </div>
      <div class="sol-content">${getLocalizedText(q.content)}</div>
      <div id="quizOpts_${idx}">${optionsHtml}</div>
      <div id="quizExp_${idx}" class="sol-explanation" style="display: ${savedAnswer ? 'block' : 'none'};">
        <strong>Explanation:</strong><br/>${expText}
      </div>
    `;

    container.appendChild(card);

    if (!savedAnswer) {
      card.querySelectorAll(`.quiz-opt-${idx}`).forEach(row => {
        row.addEventListener("click", async () => {
          const selectedId = row.getAttribute("data-opt-id");
          const isCorrect = selectedId === String(q.correctAnswer);

          localQuizState.answers[idx] = { selected: selectedId, isCorrect: isCorrect };

          const badge = document.getElementById(`quizBadge_${idx}`);
          if (badge) {
            badge.className = `sol-status-badge ${isCorrect ? 'sol-status-correct' : 'sol-status-incorrect'}`;
            badge.innerText = isCorrect ? "Correct" : "Incorrect";
          }

          card.querySelectorAll(`.quiz-opt-${idx}`).forEach(optEl => {
            optEl.style.pointerEvents = "none";
            if (optEl.getAttribute("data-opt-id") === String(q.correctAnswer)) optEl.classList.add("sol-opt-correct");
            else if (optEl.getAttribute("data-opt-id") === selectedId && !isCorrect) optEl.classList.add("sol-opt-wrong");
          });

          const expEl = document.getElementById(`quizExp_${idx}`);
          if (expEl) expEl.style.display = "block";

          if (isMistakeBank) {
              await syncMistakeBank([{
                  student_roll: currentCandidate.roll_number,
                  subject: activeSubject || "General",
                  question_id: q.id,
                  question_data: q,
                  isCorrect: isCorrect
              }]);
          }
        });
      });
    }
  });

  if (!localQuizState.isFinished) {
    const footerAction = document.createElement("div");
    footerAction.className = "quiz-footer-actions";
    footerAction.innerHTML = `
      <button type="button" class="btn-finish-quiz" onclick="finishQuizSession()">
        <span>🏁</span> Finish & Review Score
      </button>
    `;
    container.appendChild(footerAction);
  }
}

window.toggleQuizStar = function(idx) {
  if (localQuizState.starred.has(idx)) {
    localQuizState.starred.delete(idx);
  } else {
    localQuizState.starred.add(idx);
  }
  renderQuizUI();
};

window.finishQuizSession = async function() {
  localQuizState.isFinished = true;
  localQuizState.filter = "all";
  
  const attemptedCount = Object.keys(localQuizState.answers).length;
  if (attemptedCount > 0 && currentCandidate) {
      dailyPerf.total_questions_attempted += attemptedCount;
      let centuryHit = dailyPerf.total_questions_attempted >= 100;
      let newStreak = dailyPerf.streak_count;
      
      if (centuryHit && !dailyPerf.is_century_hit) {
          newStreak += 1;
          alert("🎉 BOOM! Daily Baseline Hit! Century Streak +1 🔥");
      }

      await supabaseClient.from("daily_performance").update({
          total_questions_attempted: dailyPerf.total_questions_attempted,
          is_century_hit: centuryHit,
          streak_count: newStreak
      }).eq("id", dailyPerf.id);

      dailyPerf.is_century_hit = centuryHit;
      dailyPerf.streak_count = newStreak;
  }
  
  renderQuizUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.filterQuizReview = function(filterType) {
  localQuizState.filter = filterType;
  renderQuizUI();
};

function renderFlashcardMode() {
  const tEl = document.getElementById("practiceModeTitle");
  if (tEl) tEl.innerText = "🗂️ Flashcards";
  const container = document.getElementById("practiceContainer");
  if (!container) return;
  const q = practiceQuestions[flashcardIndex];
  const correctOpt = (Array.isArray(q.options) ? q.options : []).find(o => String(o.id) === String(q.correctAnswer));
  const correctText = correctOpt ? getLocalizedText({ en: correctOpt.en || correctOpt.text, hi: correctOpt.hi }) : "";

  let expText = "Verified.";
  if (q.explanation) {
    let parsedExp = getLocalizedText(q.explanation);
    if (parsedExp && parsedExp !== '{"en":""}' && parsedExp !== '{"en":"","hi":""}' && parsedExp.trim() !== "") {
      expText = parsedExp;
    }
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <span style="font-weight: 700; color: #64748b;">Card ${flashcardIndex + 1} of ${practiceQuestions.length}</span>
      <span style="font-size: 12px; color: var(--tcs-blue-accent);">Tap card to reveal Answer</span>
    </div>
    <div id="flashcardBox" style="min-height: 280px; background: var(--bg-panel); border: 2px solid var(--border-color); border-radius: 8px; padding: 30px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.06); transition: all 0.2s ease;">
      <div id="cardFront">
        <span class="login-badge" style="margin-bottom: 14px;">QUESTION</span>
        <h3 style="font-size: 18px; line-height: 1.5; color: inherit;">${getLocalizedText(q.content)}</h3>
      </div>
      <div id="cardBack" style="display: none; width: 100%;">
        <span class="login-badge" style="background: #dcfce7; color: #15803d; margin-bottom: 14px;">CORRECT ANSWER</span>
        <h4 style="font-size: 17px; color: #16a34a; margin-bottom: 12px;">${correctText}</h4>
        <div class="sol-explanation" style="text-align: left; margin-top: 10px;">
          <strong>Explanation:</strong><br/>${expText}
        </div>
      </div>
    </div>
    <div style="display: flex; justify-content: space-between; margin-top: 20px;">
      <button type="button" class="tcs-btn btn-secondary" ${flashcardIndex === 0 ? 'disabled' : ''} id="btnPrevCard">← Previous</button>
      <button type="button" class="tcs-btn btn-primary" ${flashcardIndex === practiceQuestions.length - 1 ? 'disabled' : ''} id="btnNextCard">Next →</button>
    </div>
  `;

  const box = document.getElementById("flashcardBox");
  if (box) {
    box.addEventListener("click", () => {
      const front = document.getElementById("cardFront");
      const back = document.getElementById("cardBack");
      if (!front || !back) return;
      const isShowingFront = front.style.display !== "none";
      front.style.display = isShowingFront ? "none" : "block";
      back.style.display = isShowingFront ? "block" : "none";
    });
  }
  const btnP = document.getElementById("btnPrevCard");
  if (btnP) {
    btnP.addEventListener("click", () => {
      if (flashcardIndex > 0) {
        flashcardIndex--;
        renderFlashcardMode();
      }
    });
  }
  const btnN = document.getElementById("btnNextCard");
  if (btnN) {
    btnN.addEventListener("click", () => {
      if (flashcardIndex < practiceQuestions.length - 1) {
        flashcardIndex++;
        renderFlashcardMode();
      }
    });
  }
}