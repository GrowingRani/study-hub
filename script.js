// ==========================================================================
// 1. CONFIGURATION & SUPABASE INIT
// ==========================================================================
const SUPABASE_URL = "https://hqrbqqdjbswbvfhhqefw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcmJxcWRqYnN3YnZmaGhxZWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjI5ODgsImV4cCI6MjEwNzAzODk4OH0.iTay17X_Ysep1r-NLPSWpAzlQF-fmBb0sw1v7ptsdpE";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================================================
// 2. GLOBAL STATE
// ==========================================================================
let currentCandidate = null;
let catalogData = [];
let activeSubject = null;
let userAttemptHistory = [];
let currentLang = "en";

// Register Service Worker for Native PWA Installation
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((reg) => console.log("Service Worker Active, Scope:", reg.scope))
      .catch((err) => console.error("SW Registration Failed:", err));
  });
}

// द्विभाषी टेक्स्ट फॉलबैक हेल्पर
function getLocalizedText(obj) {
  if (typeof obj === "object" && obj !== null) {
    if (currentLang === "hi") {
      return obj.hi ? obj.hi : (obj.en + "\n\n*(यह सामग्री अभी हिंदी में उपलब्ध नहीं है)*");
    } else {
      return obj.en || JSON.stringify(obj);
    }
  }
  return String(obj || "");
}

// Exam Session State
let activeTest = null;
let testQuestions = [];
let currentIndex = 0;
let userResponses = {}; 
let timeRemaining = 15 * 60;
let timerInterval = null;

// ==========================================================================
// 3. APP INITIALIZATION & VIEW ROUTER
// ==========================================================================
window.addEventListener("DOMContentLoaded", () => {
  setupAppEvents();
  initAuthSessionWatcher();
});

window.switchView = function(viewId) {
  const views = ["viewLogin", "viewDashboard", "viewExam", "viewSolutions", "viewProfile"];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const target = document.getElementById(viewId);
  if (target) target.style.display = "flex";
};

// ==========================================================================
// 4. SUPABASE AUTH LAYER & SESSION MANAGEMENT
// ==========================================================================
function initAuthSessionWatcher() {
  // 1. Initial Page Load Check
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session && session.user && session.user.email_confirmed_at) {
      initCandidateSession(session.user);
    } else {
      currentCandidate = null;
      switchView("viewLogin");
    }
  });

  // 2. Real-time Auth Event Listener (Handles One-Click Link & Recovery)
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    // A. Password Recovery Event (Triggered by Reset Link in Email)
    if (event === "PASSWORD_RECOVERY") {
      showPasswordResetUI();
      return;
    }

    // B. Logout Event
    if (event === "SIGNED_OUT" || !session || !session.user) {
      currentCandidate = null;
      switchView("viewLogin");
      return;
    }

    // C. Strict Guard: Don't allow unconfirmed user into Dashboard
    if (!session.user.email_confirmed_at) {
      currentCandidate = null;
      switchView("viewLogin");
      return;
    }

    // D. Confirmed Login Event (From Email Confirmation Link or Standard Sign-In)
    if (!currentCandidate || currentCandidate.email !== session.user.email.toLowerCase()) {
      initCandidateSession(session.user);
    }
  });
}

function showPasswordResetUI() {
  switchView("viewLogin");
  document.getElementById("signInForm").style.display = "none";
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("forgotForm").style.display = "none";
  document.getElementById("authNavTabs").style.display = "none";
  document.getElementById("resetPasswordForm").style.display = "block";
  showAuthNotice("Enter your new security password below.", false);
}

// Loads or Creates candidate profile in public.students upon confirmed auth
async function initCandidateSession(user) {
  try {
    const userEmail = (user.email || "").toLowerCase();
    
    // Check if candidate profile already exists in public.students
    const { data: student, error } = await supabaseClient
      .from("students")
      .select("*")
      .eq("email", userEmail)
      .maybeSingle();

    if (student) {
      currentCandidate = student;
      mountDashboard();
    } else {
      // First-time confirmation link redirect: Extract metadata and create verified student record
      const roll = user.user_metadata?.roll_number || "ROLL-" + Math.floor(1000 + Math.random() * 9000);
      const name = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split("@")[0];

      const { data: newStudent, error: insErr } = await supabaseClient
        .from("students")
        .upsert({
          roll_number: roll,
          full_name: name,
          email: userEmail
        }, { onConflict: "email" })
        .select()
        .single();

      if (insErr) throw insErr;
      currentCandidate = newStudent;
      mountDashboard();
    }
  } catch (err) {
    console.error("Candidate session init error:", err);
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

function setupAppEvents() {
  const tabSignIn = document.getElementById("tabSignIn");
  const tabRegister = document.getElementById("tabRegister");
  const authNavTabs = document.getElementById("authNavTabs");
  const signInForm = document.getElementById("signInForm");
  const registerForm = document.getElementById("registerForm");
  const forgotForm = document.getElementById("forgotForm");
  const resetPasswordForm = document.getElementById("resetPasswordForm");
  const authErrBox = document.getElementById("authErrorMsg");

  // 1. Auth Tabs Switching
  if (tabSignIn && tabRegister) {
    tabSignIn.addEventListener("click", () => {
      tabSignIn.style.borderBottom = "2px solid var(--tcs-blue-accent)";
      tabSignIn.style.color = "var(--tcs-blue-accent)";
      tabRegister.style.borderBottom = "none";
      tabRegister.style.color = "#64748b";
      signInForm.style.display = "block";
      registerForm.style.display = "none";
      forgotForm.style.display = "none";
      resetPasswordForm.style.display = "none";
      authErrBox.style.display = "none";
    });

    tabRegister.addEventListener("click", () => {
      tabRegister.style.borderBottom = "2px solid var(--tcs-blue-accent)";
      tabRegister.style.color = "var(--tcs-blue-accent)";
      tabSignIn.style.borderBottom = "none";
      tabSignIn.style.color = "#64748b";
      registerForm.style.display = "block";
      document.getElementById("regFieldsStep").style.display = "block";
      document.getElementById("regSuccessCard").style.display = "none";
      signInForm.style.display = "none";
      forgotForm.style.display = "none";
      resetPasswordForm.style.display = "none";
      authErrBox.style.display = "none";
    });
  }

  // 2. Forgot Password Sub-View Toggles
  const btnOpenForgot = document.getElementById("btnOpenForgot");
  if (btnOpenForgot) {
    btnOpenForgot.addEventListener("click", () => {
      signInForm.style.display = "none";
      registerForm.style.display = "none";
      resetPasswordForm.style.display = "none";
      forgotForm.style.display = "block";
      document.getElementById("forgotEmailStep").style.display = "block";
      document.getElementById("forgotSuccessStep").style.display = "none";
      authErrBox.style.display = "none";
    });
  }

  const btnBackToSignIn = document.getElementById("btnBackToSignIn");
  if (btnBackToSignIn && tabSignIn) {
    btnBackToSignIn.addEventListener("click", () => {
      authNavTabs.style.display = "flex";
      tabSignIn.click();
    });
  }

  const btnBackToSignInFromReg = document.getElementById("btnBackToSignInFromReg");
  if (btnBackToSignInFromReg && tabSignIn) {
    btnBackToSignInFromReg.addEventListener("click", () => {
      authNavTabs.style.display = "flex";
      tabSignIn.click();
    });
  }

  // 3. Google OAuth 1-Click Sign-In
  const btnGoogleAuth = document.getElementById("btnGoogleAuth");
  if (btnGoogleAuth) {
    btnGoogleAuth.addEventListener("click", async () => {
      authErrBox.style.display = "none";
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) showAuthNotice(error.message);
    });
  }

  // 4. Candidate Sign-In (Returning User - Validates Confirmation)
  if (signInForm) {
    signInForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("inputSignInEmail").value.trim().toLowerCase();
      const password = document.getElementById("inputSignInPass").value;
      const btn = document.getElementById("btnSignInSubmit");

      authErrBox.style.display = "none";
      btn.innerText = "Authenticating...";
      btn.disabled = true;

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) throw error;

        // Check if user confirmed their email
        if (!data.user || !data.user.email_confirmed_at) {
          await supabaseClient.auth.signOut();
          throw new Error("Aapka email verify nahi hua hai. Kripya pehle apne inbox me aaye 'Confirm email address' link par click karein.");
        }

        await initCandidateSession(data.user);
      } catch (err) {
        showAuthNotice(err.message || "Invalid candidate email or PIN.");
      } finally {
        btn.innerText = "Authenticate & Enter";
        btn.disabled = false;
      }
    });
  }

  // 5. New Candidate Registration (Dispatches One-Click Confirmation Link)
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("inputRegName").value.trim();
      const roll = document.getElementById("inputRegRoll").value.trim().toUpperCase();
      const email = document.getElementById("inputRegEmail").value.trim().toLowerCase();
      const password = document.getElementById("inputRegPass").value;
      const btn = document.getElementById("btnRegisterSubmit");

      authErrBox.style.display = "none";
      btn.innerText = "Sending Confirmation Link...";
      btn.disabled = true;

      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { full_name: name, roll_number: roll },
            emailRedirectTo: window.location.origin
          }
        });

        if (error) throw error;

        // Hide input fields and show instructions
        document.getElementById("regFieldsStep").style.display = "none";
        document.getElementById("regSuccessCard").style.display = "block";
        showAuthNotice("Confirmation email dispatched successfully! Please check your inbox.", false);
      } catch (err) {
        showAuthNotice(err.message || "Registration failed.");
      } finally {
        btn.innerText = "Create Profile & Send Verification Link";
        btn.disabled = false;
      }
    });
  }

  // 6. Forgot Password (Request Recovery Link)
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("inputForgotEmail").value.trim().toLowerCase();
      const btn = document.getElementById("btnSendForgotOtp");

      authErrBox.style.display = "none";
      btn.innerText = "Dispatching Link...";
      btn.disabled = true;

      try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;

        document.getElementById("forgotEmailStep").style.display = "none";
        document.getElementById("forgotSuccessStep").style.display = "block";
        showAuthNotice("Recovery link dispatched to your registered email.", false);
      } catch (err) {
        showAuthNotice(err.message || "Failed to dispatch recovery email.");
      } finally {
        btn.innerText = "Send Password Recovery Link";
        btn.disabled = false;
      }
    });
  }

  // 7. Reset Password (Saves New Password After Recovery Link Click)
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPass = document.getElementById("inputNewPassword").value;
      const btn = document.getElementById("btnSaveNewPassword");

      if (newPass.length < 6) {
        showAuthNotice("Password must contain at least 6 characters.");
        return;
      }

      btn.innerText = "Updating Password...";
      btn.disabled = true;

      try {
        const { data, error } = await supabaseClient.auth.updateUser({
          password: newPass
        });
        if (error) throw error;

        showAuthNotice("Password updated successfully! Redirecting to Dashboard...", false);
        
        setTimeout(async () => {
          authNavTabs.style.display = "flex";
          if (data.user) await initCandidateSession(data.user);
        }, 1200);
      } catch (err) {
        showAuthNotice(err.message || "Password update failed.");
      } finally {
        btn.innerText = "Update Password & Enter Portal";
        btn.disabled = false;
      }
    });
  }

  // 8. Candidate Sign Out
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      currentCandidate = null;
      switchView("viewLogin");
      if (tabSignIn) tabSignIn.click();
    });
  }

  // 9. Student Profile & Analytics View Trigger
  const btnMyProfile = document.getElementById("btnMyProfile");
  if (btnMyProfile) {
    btnMyProfile.addEventListener("click", () => {
      fetchStudentAnalytics();
      switchView("viewProfile");
    });
  }

  // 10. Eye-Care High-Tech Dark Mode Toggle & Sync
  const btnDarkMode = document.getElementById("btnDarkMode");
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-theme");
    if (btnDarkMode) btnDarkMode.innerText = "☀️";
  }

  if (btnDarkMode) {
    btnDarkMode.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      if (document.body.classList.contains("dark-theme")) {
        localStorage.setItem("theme", "dark");
        btnDarkMode.innerText = "☀️";
      } else {
        localStorage.setItem("theme", "light");
        btnDarkMode.innerText = "🌙";
      }
    });
  }

  // 11. Exam Console Action Handlers
  document.getElementById("btnSaveNext").addEventListener("click", () => {
    if (!userResponses[currentIndex]) return;
    const state = userResponses[currentIndex];
    state.status = (state.selected !== null) ? 2 : 1;
    advanceNextQuestion();
  });

  document.getElementById("btnMarkReview").addEventListener("click", () => {
    if (!userResponses[currentIndex]) return;
    const state = userResponses[currentIndex];
    state.status = (state.selected !== null) ? 4 : 3;
    advanceNextQuestion();
  });

  document.getElementById("btnClear").addEventListener("click", () => {
    if (!userResponses[currentIndex]) return;
    userResponses[currentIndex].selected = null;
    userResponses[currentIndex].status = 1;
    renderQuestion(currentIndex);
  });

  document.getElementById("btnSubmit").addEventListener("click", () => {
    showExamSummaryModal();
  });

  // 12. Dashboard Topic Filter Search
  document.getElementById("topicSearchInput").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll(".topic-accordion-card").forEach(card => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(query) ? "block" : "none";
    });
  });

  // 13. Bilingual Language Switcher
  document.getElementById("langSwitch").addEventListener("change", (e) => {
    currentLang = e.target.value;
    if (document.getElementById("viewExam").style.display === "flex") {
      renderQuestion(currentIndex);
    }
  });

  // 14. Mobile Bottom-Sheet Palette Drawer Trigger
  document.getElementById("btnMobilePalette").addEventListener("click", () => {
    document.querySelector(".tcs-side-panel").classList.add("open");
    document.getElementById("paletteOverlay").classList.add("open");
  });

  // 15. Close Mobile Drawer via Backdrop Click
  document.getElementById("paletteOverlay").addEventListener("click", () => {
    document.querySelector(".tcs-side-panel").classList.remove("open");
    document.getElementById("paletteOverlay").classList.remove("open");
  });
}

// ==========================================================================
// 5. DASHBOARD & TAXONOMY LAYER
// ==========================================================================
async function mountDashboard() {
  document.getElementById("dashCandidateName").innerText = currentCandidate.full_name || "Candidate";
  document.getElementById("dashCandidateRoll").innerText = "ROLL: " + (currentCandidate.roll_number || "---");

  switchView("viewDashboard");
  await fetchStudentAnalytics();
  await fetchTestCatalog();
}

async function fetchTestCatalog() {
  const container = document.getElementById("topicsContainer");
  container.innerHTML = "<p style='padding:20px; color:#64748b;'>Loading assessment taxonomy & history...</p>";

  const { data: catalog, error: catErr } = await supabaseClient
    .from("view_test_catalog")
    .select("*");

  if (catErr || !catalog || catalog.length === 0) {
    container.innerHTML = "<p style='padding:20px; color:#dc2626;'>Database Catalog View load nahi ho saka.</p>";
    return;
  }
  catalogData = catalog;

  // Student Attempt History Fetch
  const { data: history } = await supabaseClient
    .from("test_attempts")
    .select("test_id, score, attempt_date")
    .eq("student_roll", currentCandidate.roll_number)
    .order("attempt_date", { ascending: false });
    
  userAttemptHistory = history || [];

  const subjectsMap = {};
  catalogData.forEach(row => {
    const s = row.subject || "General Studies";
    subjectsMap[s] = (subjectsMap[s] || 0) + 1;
  });

  renderSubjectSidebar(subjectsMap);
  const firstSubject = Object.keys(subjectsMap)[0];
  selectSubject(firstSubject);
}

function renderSubjectSidebar(subjectsMap) {
  const list = document.getElementById("subjectChipsContainer");
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
  document.querySelectorAll(".subject-chip").forEach(el => {
    el.classList.toggle("active", el.innerText.includes(subjectName));
  });
  document.getElementById("activeSubjectTitle").innerText = subjectName;
  document.getElementById("activeSubjectMeta").innerText = `Available practice sets under ${subjectName}`;
  renderTopicSets();
}

function renderTopicSets() {
  const container = document.getElementById("topicsContainer");
  container.innerHTML = "";

  const filtered = catalogData.filter(r => (r.subject || "General Studies") === activeSubject);
  const grouped = {};
  filtered.forEach(item => {
    const groupKey = item.topic || "Core Practice";
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(item);
  });

  Object.entries(grouped).forEach(([topicName, sets]) => {
    const groupCard = document.createElement("div");
    groupCard.className = "topic-accordion-card";

    const header = document.createElement("div");
    header.className = "topic-accordion-header";
    header.innerHTML = `
      <div class="header-left"><span class="icon-folder">📁</span><span class="topic-title">${topicName}</span></div>
      <div class="header-right"><span class="subtopic-tag">${sets.length} Test Sets</span><span class="toggle-icon">▼</span></div>
    `;

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
      tile.innerHTML = `
        <div>
          <div class="set-tile-title">${setItem.test_title}</div>
          <div class="set-tile-meta"><span>⏱ ${setItem.total_duration_minutes} Mins</span><span>📝 ${setItem.total_questions} Qs</span></div>
          ${historyHtml}
        </div>
        <button class="btn-launch-set" onclick="launchAssessment(${setItem.test_id})">
          ${attemptsForThisSet.length > 0 ? 'Retake Assessment' : 'Start Assessment'}
        </button>
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
// 6. TCS iON EXAM ENGINE LAYER
// ==========================================================================
window.launchAssessment = async function(testId) {
  switchView("viewExam");
  document.getElementById("examCandidateRoll").innerText = currentCandidate.roll_number;
  document.getElementById("questionContent").innerText = "Configuring assessment runtime...";

  const { data: testInfo } = await supabaseClient
    .from("tests")
    .select("id, title, total_duration_minutes")
    .eq("id", testId)
    .single();
    
  activeTest = testInfo;
  document.getElementById("examTitle").innerText = activeTest.title;
  timeRemaining = (activeTest.total_duration_minutes || 15) * 60;

  const { data: sections } = await supabaseClient
    .from("test_sections")
    .select("id, section_name")
    .eq("test_id", testId)
    .limit(1);
    
  const section = sections[0];
  document.getElementById("subjectLabel").innerText = section ? section.section_name : "Core Section";
  document.getElementById("sectionTabs").innerHTML = `<button class="section-tab">Section 1: ${section ? section.section_name : "General"}</button>`;

  const { data: qData, error } = await supabaseClient
    .from("test_section_questions")
    .select(`question_number, questions (id, content, options, correct_answer, explanation)`)
    .eq("section_id", section.id)
    .order("question_number", { ascending: true });

  if (error || !qData || qData.length === 0) {
    alert("Is test ke questions load nahi ho sake!");
    mountDashboard();
    return;
  }

  testQuestions = qData.map(item => ({
    qNum: item.question_number,
    id: item.questions.id,
    content: item.questions.content,
    options: item.questions.options,
    correctAnswer: item.questions.correct_answer,
    explanation: item.questions.explanation
  }));

  userResponses = {};
  testQuestions.forEach((q, idx) => {
    userResponses[idx] = { selected: null, status: idx === 0 ? 1 : 0, timeSpent: 0 };
  });

  renderQuestion(0);
  startExamTimer();
};

function renderQuestion(index) {
  if (!testQuestions[index]) return;
  currentIndex = index;
  const q = testQuestions[index];
  const state = userResponses[index];

  if (state.status === 0) state.status = 1;

  document.getElementById("qDisplayNumber").innerText = q.qNum;
  document.getElementById("questionContent").innerText = getLocalizedText(q.content);

  const optContainer = document.getElementById("optionsContainer");
  optContainer.innerHTML = "";

  const optionsList = Array.isArray(q.options) ? q.options : [];
  optionsList.forEach(opt => {
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
    optContainer.appendChild(row);
  });

  renderPaletteGrid();
  updateStatusMatrix();

  if (window.innerWidth <= 768) {
    document.querySelector(".tcs-side-panel").classList.remove("open");
    document.getElementById("paletteOverlay").classList.remove("open");
  }
}

function renderPaletteGrid() {
  const grid = document.getElementById("paletteGrid");
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

    btn.addEventListener("click", () => renderQuestion(idx));
    grid.appendChild(btn);
  });
}

function advanceNextQuestion() {
  if (currentIndex + 1 < testQuestions.length) renderQuestion(currentIndex + 1);
  else { 
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
  document.getElementById("cntAnswered").innerText = ans;
  document.getElementById("cntNotAnswered").innerText = notAns;
  document.getElementById("cntNotVisited").innerText = notVis;
  document.getElementById("cntReview").innerText = rev;
  document.getElementById("cntAnsReview").innerText = ansRev;
}

function startExamTimer() {
  if (timerInterval) clearInterval(timerInterval);

  const updateTimerDisplays = () => {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    const formattedTime = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    const desktopDisplay = document.getElementById("timerDisplay");
    const mobileDisplay = document.getElementById("mobileTimerDisplay");

    if (desktopDisplay) desktopDisplay.innerText = formattedTime;
    if (mobileDisplay) mobileDisplay.innerText = formattedTime;
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

// ==========================================================================
// 7. SUBMISSION, SCORECARD & TELEMETRY
// ==========================================================================
function showExamSummaryModal() {
  let ans = 0, notAns = 0, notVis = 0, rev = 0, ansRev = 0;
  Object.values(userResponses).forEach(r => {
    if (r.status === 0) notVis++; 
    else if (r.status === 1) notAns++; 
    else if (r.status === 2) ans++; 
    else if (r.status === 3) rev++; 
    else if (r.status === 4) ansRev++;
  });

  const modal = document.getElementById("submitModalContainer");
  modal.style.display = "flex";
  modal.className = "tcs-modal-overlay";

  modal.innerHTML = `
    <div class="tcs-modal-box">
      <div class="tcs-modal-header">Exam Final Summary</div>
      <div class="tcs-modal-body">
        <table class="modal-summary-table">
          <thead><tr><th>Status Category</th><th>Total Count</th></tr></thead>
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
        <button class="tcs-btn btn-secondary" onclick="document.getElementById('submitModalContainer').style.display='none'">Back to Exam</button>
        <button class="tcs-btn btn-submit" id="btnConfirmSubmit">Confirm & Submit Exam</button>
      </div>
    </div>
  `;

  document.getElementById("btnConfirmSubmit").addEventListener("click", () => {
    if (timerInterval) clearInterval(timerInterval);
    renderScorecard();
  });
}

async function renderScorecard() {
  let correct = 0, incorrect = 0, unattempted = 0;

  testQuestions.forEach((q, idx) => {
    const userAns = userResponses[idx].selected;
    if (!userAns) unattempted++;
    else if (String(userAns) === String(q.correctAnswer)) correct++;
    else incorrect++;
  });

  const score = (correct * 2.00) - (incorrect * 0.50);
  const totalDurationSecs = (activeTest.total_duration_minutes || 15) * 60;
  const timeSpentSecs = totalDurationSecs - timeRemaining;
  const timeSpentMins = Math.ceil(timeSpentSecs / 60);

  try {
    // 1. Save Test Attempt Record
    await supabaseClient.from("test_attempts").insert({
      student_roll: currentCandidate.roll_number,
      test_id: activeTest.id,
      score: score,
      total_correct: correct,
      total_incorrect: incorrect,
      time_spent_seconds: timeSpentSecs
    });

    // 2. Update Daily Attendance Telemetry
    const today = new Date().toISOString().split("T")[0];
    const { data: attRecord } = await supabaseClient
      .from("daily_attendance")
      .select("id, total_minutes_spent")
      .eq("student_roll", currentCandidate.roll_number)
      .eq("study_date", today)
      .maybeSingle();

    if (attRecord) {
      await supabaseClient
        .from("daily_attendance")
        .update({ total_minutes_spent: attRecord.total_minutes_spent + timeSpentMins })
        .eq("id", attRecord.id);
    } else {
      await supabaseClient
        .from("daily_attendance")
        .insert({
          student_roll: currentCandidate.roll_number,
          study_date: today,
          total_minutes_spent: timeSpentMins
        });
    }
  } catch (err) {
    console.error("Telemetry save error:", err);
  }

  const modal = document.getElementById("submitModalContainer");
  modal.innerHTML = `
    <div class="tcs-modal-box" style="width: 620px;">
      <div class="tcs-modal-header" style="background:#16a34a;">Assessment Scorecard & Analysis</div>
      <div class="tcs-modal-body">
        <div class="score-highlight-card" style="text-align:center; padding: 15px; margin-bottom:15px; border-radius: 4px;">
          <h2 class="score-highlight-title" style="font-size:26px;">Score: ${score.toFixed(2)} / ${testQuestions.length * 2}</h2>
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
        <div style="font-size:12px; color:#16a34a; text-align:center; font-weight:600; margin-top: 8px;">✔ Progress & Attendance Synced Successfully</div>
      </div>
      <div class="tcs-modal-footer">
        <button class="tcs-btn btn-secondary" onclick="openSolutionsView()">View Detailed Solutions</button>
        <button class="tcs-btn btn-primary" onclick="closeExamAndReload()">Return to Repository</button>
      </div>
    </div>
  `;
}

window.closeExamAndReload = async function() {
  document.getElementById("submitModalContainer").style.display = "none";
  mountDashboard();
};

// ==========================================================================
// 8. SOLUTIONS & EXPLANATIONS VIEW
// ==========================================================================
window.openSolutionsView = function() {
  document.getElementById("submitModalContainer").style.display = "none";
  document.getElementById("solExamTitle").innerText = activeTest.title;
  switchView("viewSolutions");

  const container = document.getElementById("solutionsContainer");
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
    let expText = q.explanation ? getLocalizedText(q.explanation) : "No explanation provided.";

    let optionsHtml = "";
    const optionsList = Array.isArray(q.options) ? q.options : [];
    
    optionsList.forEach(opt => {
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

      let optText = getLocalizedText({ en: opt.en || opt.text, hi: opt.hi });
      optionsHtml += `<div class="${optClass}"><span>${icon}</span><span>${optText}</span></div>`;
    });

    const card = document.createElement("div");
    card.className = "solution-card";
    card.innerHTML = `
      <div class="sol-q-header"><span>Question ${q.qNum}</span><span class="sol-status-badge ${statusClass}">${statusText}</span></div>
      <div class="sol-content">${qText}</div>
      <div style="margin-bottom: 16px;">${optionsHtml}</div>
      <div class="sol-explanation"><strong>Explanation:</strong><br/>${expText}</div>
    `;
    container.appendChild(card);
  });
};

// ==========================================================================
// 9. STUDENT ANALYTICS & ATTENDANCE CALENDAR
// ==========================================================================
async function fetchStudentAnalytics() {
  try {
    const { data: attempts } = await supabaseClient
      .from("test_attempts")
      .select("total_correct, total_incorrect")
      .eq("student_roll", currentCandidate.roll_number);

    let totalTests = attempts ? attempts.length : 0;
    let totalCorrect = 0, totalIncorrect = 0;

    if (attempts) {
      attempts.forEach(a => { 
        totalCorrect += (a.total_correct || 0); 
        totalIncorrect += (a.total_incorrect || 0); 
      });
    }
    let accuracy = (totalCorrect + totalIncorrect > 0) ? ((totalCorrect / (totalCorrect + totalIncorrect)) * 100).toFixed(1) : 0;

    const { data: attendance } = await supabaseClient
      .from("daily_attendance")
      .select("study_date, total_minutes_spent")
      .eq("student_roll", currentCandidate.roll_number);

    let totalMins = 0;
    let presentDates = [];

    if (attendance) {
      attendance.forEach(record => {
        totalMins += (record.total_minutes_spent || 0);
        presentDates.push(record.study_date);
      });
    }

    document.getElementById("statTotalTests").innerText = totalTests;
    document.getElementById("statAccuracy").innerText = accuracy + "%";
    document.getElementById("statStudyTime").innerText = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;

    renderAttendanceCalendar(presentDates);
  } catch (err) { 
    console.error("Analytics fetch error:", err); 
  }
}

function renderAttendanceCalendar(presentDates) {
  const calGrid = document.getElementById("attendanceCalendarGrid");
  if (!calGrid) return;
  calGrid.innerHTML = "";
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  document.getElementById("calMonthYear").innerText = `${monthNames[month]} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); 
  const todayDate = now.getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    calGrid.innerHTML += `<div class="cal-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isPresent = presentDates.includes(dateStr);
    
    let statusClass = "absent";
    if (isPresent) statusClass = "present";
    else if (d > todayDate) statusClass = "future"; 

    calGrid.innerHTML += `<div class="cal-day ${statusClass}">${d}</div>`;
  }
}