// ==========================================================================
// 1. CONFIGURATION & SUPABASE INITIALIZATION
// ==========================================================================
const SUPABASE_URL = "https://hqrbqqdjbswbvfhhqefw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcmJxcWRqYnN3YnZmaGhxZWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjI5ODgsImV4cCI6MjEwNzAzODk4OH0.iTay17X_Ysep1r-NLPSWpAzlQF-fmBb0sw1v7ptsdpE";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let radarChartInstance = null; // Global instance tracker for Chart.js

// ==========================================================================
// 2. UNIVERSAL ANSWER NORMALIZATION
// ==========================================================================
function getNormalizedCorrectAnswerId(rawAnswer, optionsArray) {
  if (!optionsArray || !Array.isArray(optionsArray)) return rawAnswer;
  let ca = String(rawAnswer || "").trim().toUpperCase();
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
  return matchedOpt ? String(matchedOpt.id) : String(rawAnswer);
}

// ==========================================================================
// 3. GLOBAL STATE & APPLICATION ROUTING
// ==========================================================================
let currentCandidate = null;
let catalogData = [];
let activeSubject = null;
let userAttemptHistory = [];
let currentLang = "en";

let activeTest = null;
let testQuestions = [];
let practiceQuestions = [];
let currentIndex = 0;
let flashcardIndex = 0;
let userResponses = {};
let timeRemaining = 15 * 60;
let timerInterval = null;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(err => console.error("SW Error:", err));
  });
}

function getLocalizedText(obj) {
  if (typeof obj === "object" && obj !== null) {
    if (currentLang === "hi") return obj.hi ? obj.hi : (obj.en + "\n\n*(यह सामग्री अभी हिंदी में उपलब्ध नहीं है)*");
    return obj.en || JSON.stringify(obj);
  }
  return String(obj || "");
}

window.addEventListener("DOMContentLoaded", () => {
  setupAppEvents();
  initAuthSessionWatcher();

  window.addEventListener('resize', () => {
    const bottomNav = document.getElementById('mobileBottomNav');
    if (bottomNav) {
      const activeView = Array.from(document.querySelectorAll('.view-screen')).find(v => v.style.display === 'flex')?.id;
      bottomNav.style.display = (window.innerWidth <= 768 && (activeView === 'viewDashboard' || activeView === 'viewAnalytics')) ? 'flex' : 'none';
    }
  });
});

window.switchView = function(viewId) {
  ["viewLogin", "viewDashboard", "viewExam", "viewSolutions", "viewAnalytics", "viewPractice"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const target = document.getElementById(viewId);
  if (target) target.style.display = "flex";

  const bottomNav = document.getElementById('mobileBottomNav');
  if (bottomNav) {
    bottomNav.style.display = (window.innerWidth <= 768 && (viewId === 'viewDashboard' || viewId === 'viewAnalytics')) ? 'flex' : 'none';
  }
};

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

// ==========================================================================
// 4. SUPABASE AUTHENTICATION LAYER
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
      switchView("viewLogin");
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
        supabaseClient.auth.signOut().then(() => { window.location.href = "/"; });
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
    mountDashboard();
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
// 5. APPLICATION EVENT BINDINGS
// ==========================================================================
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
    tabSignIn.style.borderBottom = "2px solid var(--tcs-blue-accent)";
    tabSignIn.style.color = "var(--tcs-blue-accent)";
    if (tabRegister) {
      tabRegister.style.borderBottom = "none";
      tabRegister.style.color = "#64748b";
    }
    if (signInForm) signInForm.style.display = "block";
    if (registerForm) registerForm.style.display = "none";
    if (forgotForm) forgotForm.style.display = "none";
    if (resetPasswordForm) resetPasswordForm.style.display = "none";
    if (authErrBox) authErrBox.style.display = "none";
  });

  tabRegister?.addEventListener("click", () => {
    tabRegister.style.borderBottom = "2px solid var(--tcs-blue-accent)";
    tabRegister.style.color = "var(--tcs-blue-accent)";
    if (tabSignIn) {
      tabSignIn.style.borderBottom = "none";
      tabSignIn.style.color = "#64748b";
    }
    if (registerForm) registerForm.style.display = "block";
    const regFields = document.getElementById("regFieldsStep");
    const regSuccess = document.getElementById("regSuccessCard");
    if (regFields) regFields.style.display = "block";
    if (regSuccess) regSuccess.style.display = "none";
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
        throw new Error("Email not verified.");
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

  document.getElementById("topicSearchInput")?.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
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
  });

  // Dedicated Exam Controls
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
    btnMobilePalette.onclick = () => {
      document.querySelector(".tcs-side-panel")?.classList.add("open");
      document.getElementById("paletteOverlay")?.classList.add("open");
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

// ==========================================================================
// 6. DASHBOARD & TAXONOMY LAYER
// ==========================================================================
async function mountDashboard() {
  const cName = document.getElementById("dashCandidateName");
  if (cName) cName.innerText = currentCandidate.full_name || "Candidate";
  const rollEl = document.getElementById("dashCandidateRoll");
  if (rollEl) rollEl.innerText = "ROLL: " + (currentCandidate.roll_number || "---");
  switchView("viewDashboard");
  updateBottomNav(document.querySelector('.nav-item.active'));
  await fetchTestCatalog();
}

async function fetchTestCatalog() {
  const container = document.getElementById("topicsContainer");
  if (!container) return;
  container.innerHTML = "<p style='padding:20px; color:#64748b;'>Loading assessment taxonomy & history...</p>";

  const { data: catalog, error: catErr } = await supabaseClient.from("view_test_catalog").select("*");
  if (catErr || !catalog || catalog.length === 0) {
    return container.innerHTML = "<p style='padding:20px; color:#dc2626;'>Database Catalog View load nahi ho saka.</p>";
  }
  catalogData = catalog;

  const { data: history } = await supabaseClient.from("test_attempts").select("test_id, score, attempt_date").eq("student_roll", currentCandidate.roll_number).order("attempt_date", { ascending: false });
  userAttemptHistory = history || [];

  const subjectsMap = {};
  catalogData.forEach(row => {
    const s = row.subject || "General Studies";
    subjectsMap[s] = (subjectsMap[s] || 0) + 1;
  });

  renderSubjectSidebar(subjectsMap);
  selectSubject(Object.keys(subjectsMap)[0]);
}

function renderSubjectSidebar(subjectsMap) {
  const list = document.getElementById("subjectChipsContainer");
  if (!list) return;
  list.innerHTML = "";
  Object.entries(subjectsMap).forEach(([subName, count]) => {
    const chip = document.createElement("button");
    chip.className = "subject-chip";
    chip.innerHTML = `<span>${subName}</span> <span class="badge-count">${count} Sets</span>`;
    chip.addEventListener("click", () => selectSubject(subName));
    list.appendChild(chip);
  });
}

function selectSubject(subjectName) {
  activeSubject = subjectName;
  document.querySelectorAll(".subject-chip").forEach(el => el.classList.toggle("active", el.innerText.includes(subjectName)));
  const titleEl = document.getElementById("activeSubjectTitle");
  if (titleEl) titleEl.innerText = subjectName;
  renderTopicSets();
}

function renderTopicSets() {
  const container = document.getElementById("topicsContainer");
  if (!container) return;
  container.innerHTML = "";
  const filtered = catalogData.filter(r => (r.subject || "General Studies") === activeSubject);
  const grouped = {};
  filtered.forEach(item => {
    const key = item.topic || "Core Practice";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  Object.entries(grouped).forEach(([topicName, sets]) => {
    const groupCard = document.createElement("div");
    groupCard.className = "topic-accordion-card";
    const header = document.createElement("div");
    header.className = "topic-accordion-header";
    header.innerHTML = `
      <div class="header-left">
        <span class="icon-folder">📁</span>
        <span class="topic-title">${topicName}</span>
      </div>
      <div class="header-right">
        <span class="subtopic-tag">${sets.length} Test Sets</span>
        <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>`;
    const body = document.createElement("div");
    body.className = "topic-accordion-body";
    const setsGrid = document.createElement("div");
    setsGrid.className = "sets-card-grid";

    sets.forEach(setItem => {
      const attemptsForThisSet = userAttemptHistory.filter(a => String(a.test_id) === String(setItem.test_id));
      let historyHtml = `<div style="font-size:11.5px; color:#64748b; margin-bottom:10px; font-weight:500;">Status: Unattempted</div>`;
      if (attemptsForThisSet.length > 0) {
        const bestScore = Math.max(...attemptsForThisSet.map(a => parseFloat(a.score)));
        historyHtml = `<div style="font-size:11.5px; color:#16a34a; margin-bottom:10px; font-weight:600;">★ Best Score: ${bestScore} | Total Attempts: ${attemptsForThisSet.length}</div>`;
      }

      const tile = document.createElement("div");
      tile.className = "set-tile";
      const iconTarget = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;
      const iconRetake = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`;
      let examIcon = attemptsForThisSet.length > 0 ? iconRetake : iconTarget;
      let examText = attemptsForThisSet.length > 0 ? 'Retake Exam' : 'Official Exam';
      const clockSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
      const docSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;

      tile.innerHTML = `
        <div>
          <div class="set-tile-title">${setItem.test_title}</div>
          <div class="set-tile-meta">
            <span style="display:flex; align-items:center; gap:4px;">${clockSvg} ${setItem.total_duration_minutes} Mins</span>
            <span style="display:flex; align-items:center; gap:4px;">${docSvg} ${setItem.total_questions} Qs</span>
          </div>
          ${historyHtml}
        </div>
        <div style="display: flex; gap: 6px; margin-top: 10px; align-items: stretch;">
          <button class="btn-mode-icon" title="Read Mode" onclick="launchPracticeMode(${setItem.test_id}, 'read')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></button>
          <button class="btn-mode-icon" title="Flashcards" onclick="launchPracticeMode(${setItem.test_id}, 'flashcard')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2" ry="2"></rect><path d="M21 7v12a2 2 0 0 1-2 2H7"></path></svg></button>
          <button class="btn-mode-icon" title="Instant Quiz" onclick="launchPracticeMode(${setItem.test_id}, 'quiz')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></button>
          <button class="btn-launch-set" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;" onclick="launchAssessment(${setItem.test_id})">${examIcon} ${examText}</button>
        </div>
      `;
      setsGrid.appendChild(tile);
    });

    body.appendChild(setsGrid);
    groupCard.appendChild(header);
    groupCard.appendChild(body);
    container.appendChild(groupCard);

    header.addEventListener("click", () => {
      const isOpen = groupCard.classList.contains("open");
      document.querySelectorAll(".topic-accordion-card").forEach(c => {
        c.classList.remove("open");
        c.querySelector(".topic-accordion-body").style.display = "none";
      });
      if (!isOpen) {
        groupCard.classList.add("open");
        body.style.display = "block";
      }
    });
  });
}

// ==========================================================================
// 7. TCS iON EXAM ENGINE LAYER
// ==========================================================================
window.launchAssessment = async function(testId) {
  switchView("viewExam");
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
    if (tabsEl) tabsEl.innerHTML = `<button class="section-tab">Section 1: ${section.section_name || "General"}</button>`;

    const { data: qData, error: qErr } = await supabaseClient.from("test_section_questions").select(`question_number, questions (id, content, options, correct_answer, explanation)`).eq("section_id", section.id).order("question_number", { ascending: true });
    if (qErr || !qData || qData.length === 0) throw new Error("Questions failed to load. The test might be empty.");

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
    mountDashboard();
  }
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

// Dedicated Safe Modal Close Function
window.closeExamModal = function() {
  const m = document.getElementById("submitModalContainer");
  if (m) {
    m.className = "";
    m.innerHTML = "";
    m.style.cssText = "display: none !important;";
  }
};

// Exam Final Summary Modal
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
        <button class="tcs-btn btn-secondary" onclick="closeExamModal()">Back to Exam</button>
        <button class="tcs-btn btn-submit" id="btnConfirmSubmit" onclick="confirmAndFinishExam()">Confirm & Submit Exam</button>
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

// Instant Scorecard Rendering + Non-blocking Telemetry Sync
function renderScorecard() {
  let correct = 0, incorrect = 0, unattempted = 0;
  testQuestions.forEach((q, idx) => {
    const userAns = userResponses[idx].selected;
    if (!userAns) unattempted++;
    else if (String(userAns) === String(q.correctAnswer)) correct++;
    else incorrect++;
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
        <div class="score-highlight-card" style="text-align:center; padding: 15px; margin-bottom:15px; border-radius: 4px;">
          <h2 class="score-highlight-title" style="font-size:26px;">Score: ${score.toFixed(2)} / ${(testQuestions.length * 2)}</h2>
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
        <button class="tcs-btn btn-secondary" onclick="openSolutionsView()">View Detailed Solutions</button>
        <button class="tcs-btn btn-primary" onclick="closeExamAndReload()">Return to Repository</button>
      </div>
    </div>`;

  // Background Database Telemetry
  (async () => {
    try {
      await supabaseClient.from("test_attempts").insert({
        student_roll: currentCandidate.roll_number,
        test_id: activeTest.id,
        score: score,
        total_correct: correct,
        total_incorrect: incorrect,
        time_spent_seconds: timeSpentSecs
      });

      const today = new Date().toISOString().split("T")[0];
      const { data: attRecord } = await supabaseClient.from("daily_attendance").select("id, total_minutes_spent").eq("student_roll", currentCandidate.roll_number).eq("study_date", today).maybeSingle();
      if (attRecord) {
        await supabaseClient.from("daily_attendance").update({ total_minutes_spent: attRecord.total_minutes_spent + timeSpentMins }).eq("id", attRecord.id);
      } else {
        await supabaseClient.from("daily_attendance").insert({ student_roll: currentCandidate.roll_number, study_date: today, total_minutes_spent: timeSpentMins });
      }

      const syncMsg = document.getElementById("syncStatusMsg");
      if (syncMsg) {
        syncMsg.style.color = "#16a34a";
        syncMsg.innerText = "✔ Progress & Attendance Synced Successfully";
      }
    } catch (err) {
      console.error("Telemetry sync error:", err);
      const syncMsg = document.getElementById("syncStatusMsg");
      if (syncMsg) {
        syncMsg.style.color = "#dc2626";
        syncMsg.innerText = "⚠ Saved locally (Cloud sync failed)";
      }
    }
  })();
}

window.closeExamAndReload = function() {
  closeExamModal();
  mountDashboard();
};

window.openSolutionsView = function() {
  closeExamModal();
  const tEl = document.getElementById("solExamTitle");
  if (tEl) tEl.innerText = activeTest?.title || "Assessment";
  switchView("viewSolutions");

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
// 8. ADVANCED ANALYTICS & ATTENDANCE TELEMETRY
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

window.fetchStudentAnalytics = async function() {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: attempts } = await supabaseClient.from("test_attempts").select("test_id, score, total_correct, total_incorrect, attempt_date, time_spent_seconds").eq("student_roll", currentCandidate.roll_number);

    let totalTests = attempts ? attempts.length : 0;
    let totalCorrect = 0, totalIncorrect = 0, totalTimeSecs = 0;
    let masteredTestIds = new Set();
    let subjectStats = {};
    let recentAccuracy = [];

    if (attempts) {
      attempts.forEach(a => {
        totalCorrect += (a.total_correct || 0);
        totalIncorrect += (a.total_incorrect || 0);
        totalTimeSecs += (a.time_spent_seconds || 0);

        let maxMarks = ((a.total_correct || 0) + (a.total_incorrect || 0)) * 2;
        if (maxMarks === 0) maxMarks = 20;
        let percentage = (a.score / maxMarks) * 100;
        if (percentage >= 70 || a.score >= 14) masteredTestIds.add(a.test_id);

        recentAccuracy.push(percentage > 0 ? percentage : 0);

        let cat = catalogData.find(c => String(c.test_id) === String(a.test_id));
        let subj = cat ? cat.subject : "General";
        if (!subjectStats[subj]) subjectStats[subj] = { score: 0, max: 0 };
        subjectStats[subj].score += a.score;
        subjectStats[subj].max += maxMarks;
      });
    }

    let accuracy = (totalCorrect + totalIncorrect > 0) ? ((totalCorrect / (totalCorrect + totalIncorrect)) * 100).toFixed(1) : 0;
    let avgSpeed = (totalCorrect + totalIncorrect > 0) ? Math.round(totalTimeSecs / (totalCorrect + totalIncorrect)) : 0;

    const { data: attendance } = await supabaseClient.from("daily_attendance").select("study_date, total_minutes_spent").eq("student_roll", currentCandidate.roll_number);
    let totalMins = 0;
    let todayMins = 0;
    let attendanceMap = {};
    let last7DaysMins = 0;

    let past7DaysDates = [];
    for (let i = 0; i < 7; i++) {
      let d = new Date();
      d.setDate(d.getDate() - i);
      past7DaysDates.push(d.toISOString().split("T")[0]);
    }

    if (attendance) {
      attendance.forEach(record => {
        const mins = record.total_minutes_spent || 0;
        totalMins += mins;
        attendanceMap[record.study_date] = mins;
        if (record.study_date === todayStr) todayMins = mins;
        if (past7DaysDates.includes(record.study_date)) last7DaysMins += mins;
      });
    }

    const sortedDates = Object.keys(attendanceMap).sort((a, b) => new Date(b) - new Date(a));
    let streak = 0, dDate = new Date(todayStr);
    for (let i = 0; i < 30; i++) {
      let s = dDate.toISOString().split("T")[0];
      if (attendanceMap[s]) {
        streak++;
        dDate.setDate(dDate.getDate() - 1);
      } else if (s === todayStr) {
        dDate.setDate(dDate.getDate() - 1);
      } else {
        break;
      }
    }

    const eTotal = document.getElementById("statTotalTests");
    if (eTotal) eTotal.innerText = totalTests;
    const eAcc = document.getElementById("statAccuracy");
    if (eAcc) eAcc.innerText = accuracy + "%";
    const eStreak = document.getElementById("statStreak");
    if (eStreak) eStreak.innerText = streak + " 🔥";
    const eSpeed = document.getElementById("statSpeed");
    if (eSpeed) eSpeed.innerText = avgSpeed + "s";

    // Sparkline Trends
    drawSparkline("sparkAccuracy", recentAccuracy.slice(-10), "#38bdf8");
    drawSparkline("sparkStreak", sortedDates.slice(0, 10).map(d => attendanceMap[d] || 0), "#f59e0b");
    drawSparkline("sparkSpeed", recentAccuracy.slice(-10).map(() => avgSpeed), "#10b981");

    // Achievement Cards
    const extraSummaryEl = document.getElementById("extraAnalyticsSummary");
    if (extraSummaryEl) {
      extraSummaryEl.innerHTML = `
        <div class="profile-section-card" style="padding: 20px; border-left: 4px solid #22c55e;">
          <h4 style="font-size: 14px; margin-bottom: 8px;">🎯 Today's Achievement</h4>
          <p style="font-size: 13px; margin-bottom: 4px;">Study Time Today: <strong style="color: #22c55e;">${Math.floor(todayMins / 60)}h ${todayMins % 60}m</strong></p>
          <p style="font-size: 13px;">Tests Mastered (&gt;70%): <strong style="color: #22c55e;">${masteredTestIds.size} Sets</strong></p>
        </div>
        <div class="profile-section-card" style="padding: 20px; border-left: 4px solid var(--tcs-blue-accent);">
          <h4 style="font-size: 14px; margin-bottom: 8px;">📊 Past 7 Days Work Summary</h4>
          <p style="font-size: 13px; margin-bottom: 4px;">Total Focus Time: <strong style="color: var(--tcs-blue-accent);">${Math.floor(last7DaysMins / 60)}h ${last7DaysMins % 60}m</strong></p>
          <p style="font-size: 13px;">Consistency Rate: <strong style="color: var(--tcs-blue-accent);">${Object.keys(attendanceMap).filter(d => past7DaysDates.includes(d)).length} / 7 Active Days</strong></p>
        </div>
      `;
    }

    const totalAvailableSets = catalogData.length || 1;
    const syllabusPct = Math.min(100, Math.round((masteredTestIds.size / totalAvailableSets) * 100));
    const eSyl = document.getElementById("syllabusPercentTxt");
    if (eSyl) eSyl.innerText = syllabusPct + "%";
    const circle = document.getElementById("syllabusProgressCircle");
    if (circle) circle.style.strokeDashoffset = 439.82 - (syllabusPct / 100) * 439.82;

    // Actionable Insights
    let bestSubj = { name: "Keep Learning", pct: 0 };
    let worstSubj = { name: "No Weakness", pct: 101 };
    let validSubjs = Object.entries(subjectStats).filter(([_, d]) => d.max > 0);
    if (validSubjs.length > 0) {
      validSubjs.forEach(([name, data]) => {
        let pct = (data.score / data.max) * 100;
        if (pct >= bestSubj.pct) { bestSubj.pct = pct; bestSubj.name = name; }
        if (pct <= worstSubj.pct) { worstSubj.pct = pct; worstSubj.name = name; }
      });
      if (worstSubj.pct > 100) worstSubj = { name: "None (Consistent)", pct: bestSubj.pct };
    } else {
      bestSubj = { name: "Attempt a test", pct: 0 };
      worstSubj = { name: "None yet", pct: 0 };
    }

    const insS = document.getElementById("insightStrong");
    if (insS) {
      insS.style.color = "";
      insS.innerHTML = `<strong style="color:inherit">🔥 Strongest:</strong> ${bestSubj.name} (${Math.round(bestSubj.pct)}%)`;
    }
    const insW = document.getElementById("insightWeak");
    if (insW) {
      insW.style.color = "";
      insW.innerHTML = `<strong style="color:inherit">⚠️ Needs Focus:</strong> ${worstSubj.name} (${Math.round(worstSubj.pct)}%)`;
    }

    renderHeatmap(attendanceMap);

    // Chart.js Radar Chart
    const ctx = document.getElementById('subjectRadarChart');
    if (ctx && window.Chart) {
      if (radarChartInstance) radarChartInstance.destroy();
      const isDark = document.body.classList.contains('dark-theme');
      const tColor = isDark ? '#cbd5e1' : '#64748b';
      const gColor = isDark ? '#1e293b' : '#e2e8f0';

      const subjectKeys = Object.keys(subjectStats);
      const labels = subjectKeys.length > 0 ? subjectKeys : ['Polity', 'History', 'Maths', 'GK'];
      const dataPts = subjectKeys.length > 0
        ? subjectKeys.map(s => s.max > 0 ? Math.round((s.score / s.max) * 100) : 0)
        : [0, 0, 0, 0];

      radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Mastery %',
            data: dataPts,
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            borderColor: '#38bdf8',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: { color: gColor },
              grid: { color: gColor },
              pointLabels: { color: tColor },
              ticks: { display: false, min: 0, max: 100 }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  } catch (err) {
    console.error("Analytics fetch error:", err);
  }
};

function renderHeatmap(attendanceMap) {
  const container = document.getElementById("heatmapContainer");
  if (!container) return;
  container.innerHTML = "";
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    let d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const mins = attendanceMap[dateStr] || 0;
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    cell.title = `${dateStr}: ${mins} mins`;
    if (mins > 90) cell.classList.add("hm-lvl-4");
    else if (mins > 45) cell.classList.add("hm-lvl-3");
    else if (mins > 15) cell.classList.add("hm-lvl-2");
    else if (mins > 0) cell.classList.add("hm-lvl-1");
    container.appendChild(cell);
  }
}

// ==========================================================================
// 9. MULTI-MODE PRACTICE ENGINE (READ, QUIZ, FLASHCARDS)
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
  if (tEl) tEl.innerText = "📖 READ MODE";
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

function renderInteractiveQuizMode() {
  const tEl = document.getElementById("practiceModeTitle");
  if (tEl) tEl.innerText = "⚡ INSTANT QUIZ MODE";
  const container = document.getElementById("practiceContainer");
  if (!container) return;
  container.innerHTML = "";
  practiceQuestions.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "solution-card";
    card.style.marginBottom = "20px";
    let optionsHtml = (Array.isArray(q.options) ? q.options : []).map(opt => `<div class="option-row quiz-opt-${idx}" data-opt-id="${opt.id}" style="cursor: pointer; margin-bottom: 8px;"><span style="font-weight: 600;">${opt.id}.</span><span>${getLocalizedText({ en: opt.en || opt.text, hi: opt.hi })}</span></div>`).join("");
    
    let expText = "Correct.";
    if (q.explanation) {
      let parsedExp = getLocalizedText(q.explanation);
      if (parsedExp && parsedExp !== '{"en":""}' && parsedExp !== '{"en":"","hi":""}' && parsedExp.trim() !== "") {
        expText = parsedExp;
      }
    }

    card.innerHTML = `<div class="sol-q-header"><span>Q${q.qNum}</span><span id="quizBadge_${idx}" class="sol-status-badge sol-status-unattempted">Practice</span></div><div class="sol-content">${getLocalizedText(q.content)}</div><div id="quizOpts_${idx}">${optionsHtml}</div><div id="quizExp_${idx}" class="sol-explanation" style="display: none;"><strong>Explanation:</strong><br/>${expText}</div>`;
    container.appendChild(card);
    card.querySelectorAll(`.quiz-opt-${idx}`).forEach(row => {
      row.addEventListener("click", () => {
        const selectedId = row.getAttribute("data-opt-id");
        const isCorrect = selectedId === String(q.correctAnswer);
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
      });
    });
  });
}

function renderFlashcardMode() {
  const tEl = document.getElementById("practiceModeTitle");
  if (tEl) tEl.innerText = "🗂️ FLASHCARDS";
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
      <button class="tcs-btn btn-secondary" ${flashcardIndex === 0 ? 'disabled' : ''} id="btnPrevCard">← Previous</button>
      <button class="tcs-btn btn-primary" ${flashcardIndex === practiceQuestions.length - 1 ? 'disabled' : ''} id="btnNextCard">Next →</button>
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