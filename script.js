// ================= CONFIGURATION =================
const SUPABASE_URL = "https://hqrbqqdjbswbvfhhqefw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcmJxcWRqYnN3YnZmaGhxZWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjI5ODgsImV4cCI6MjEwNzAzODk4OH0.iTay17X_Ysep1r-NLPSWpAzlQF-fmBb0sw1v7ptsdpE"; // Apni anon public key dalein

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================= GLOBAL STATE =================
let currentCandidate = null;
let catalogData = [];
let activeSubject = null;

// Exam Session State
let activeTest = null;
let testQuestions = [];
let currentIndex = 0;
let userResponses = {}; 
let timeRemaining = 15 * 60;
let timerInterval = null;

// ================= APP INITIALIZATION =================
window.addEventListener("DOMContentLoaded", async () => {
  setupAppEvents();
  checkExistingSession();
});

function switchView(viewId) {
  document.getElementById("viewLogin").style.display = "none";
  document.getElementById("viewDashboard").style.display = "none";
  document.getElementById("viewExam").style.display = "none";
  document.getElementById(viewId).style.display = "flex";
}

// ================= 1. AUTH & SESSION LAYER =================
function checkExistingSession() {
  const savedCandidate = localStorage.getItem("candidate_session");
  if (savedCandidate) {
    currentCandidate = JSON.parse(savedCandidate);
    mountDashboard();
  } else {
    switchView("viewLogin");
  }
}

function setupAppEvents() {
  // Login Form Submit
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const roll = document.getElementById("inputRollNumber").value.trim();
    const btn = document.getElementById("btnLogin");
    const errBox = document.getElementById("loginError");
    
    errBox.style.display = "none";
    btn.innerText = "Authenticating...";
    btn.disabled = true;

    try {
      // Students table me roll_number verify karein
      const { data: student, error } = await supabaseClient
        .from("students")
        .select("*")
        .eq("roll_number", roll)
        .maybeSingle();

      if (error || !student) {
        // Fallback: Agar entry database me na ho to auto-session create karein
        currentCandidate = {
          roll_number: roll,
          full_name: "Candidate " + roll
        };
      } else {
        currentCandidate = student;
      }

      localStorage.setItem("candidate_session", JSON.stringify(currentCandidate));
      mountDashboard();
    } catch (err) {
      errBox.innerText = "Network Error: " + err.message;
      errBox.style.display = "block";
    } finally {
      btn.innerText = "Authenticate & Enter";
      btn.disabled = false;
    }
  });

  // Logout Button
  document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("candidate_session");
    currentCandidate = null;
    switchView("viewLogin");
  });

  // Exam Engine Controls
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

  // Search Filter in Dashboard
  document.getElementById("topicSearchInput").addEventListener("input", (e) => {
    filterTopics(e.target.value.toLowerCase());
  });
}

// ================= 2. DASHBOARD & TAXONOMY LAYER =================
async function mountDashboard() {
  document.getElementById("dashCandidateName").innerText = currentCandidate.full_name;
  document.getElementById("dashCandidateRoll").innerText = "ROLL: " + currentCandidate.roll_number;

  switchView("viewDashboard");
  
  // दोनों डेटा लोडिंग फ़ंक्शन्स एक साथ चलाएं
  await fetchStudentAnalytics();
  await fetchTestCatalog();
}

// Global variable history store karne ke liye (top par add karein agar nahi hai)
let userAttemptHistory = [];

async function fetchTestCatalog() {
  const container = document.getElementById("topicsContainer");
  container.innerHTML = "<p style='padding:20px; color:#64748b;'>Loading assessment taxonomy & your history...</p>";

  // 1. Catalog Data Fetch karein
  const { data: catalog, error: catErr } = await supabaseClient
    .from("view_test_catalog")
    .select("*");

  if (catErr || !catalog || catalog.length === 0) {
    container.innerHTML = "<p style='padding:20px; color:#dc2626;'>Database Catalog View load nahi ho saka.</p>";
    return;
  }
  catalogData = catalog;

  // 2. Student ki History Fetch karein (Naya Addition)
  const { data: history } = await supabaseClient
    .from("test_attempts")
    .select("test_id, score, attempt_date")
    .eq("student_roll", currentCandidate.roll_number)
    .order("attempt_date", { ascending: false });
    
  userAttemptHistory = history || [];

  // 3. Unique Subjects extract karein
  const subjectsMap = {};
  catalogData.forEach(row => {
    const s = row.subject || "General Studies";
    subjectsMap[s] = (subjectsMap[s] || 0) + 1;
  });

  renderSubjectSidebar(subjectsMap);

  // Default: Pehle subject ko select karein
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

  // Active chip highlight
  document.querySelectorAll(".subject-chip").forEach(el => {
    el.classList.toggle("active", el.innerText.includes(subjectName));
  });

  document.getElementById("activeSubjectTitle").innerText = subjectName;
  document.getElementById("activeSubjectMeta").innerText = `Available practice sets under ${subjectName}`;

  renderTopicSets();
}

// ================= SMART ACCORDION RENDERER =================

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
      <div class="header-left">
        <span class="icon-folder">📁</span>
        <span class="topic-title">${topicName}</span>
      </div>
      <div class="header-right">
        <span class="subtopic-tag">${sets.length} Test Sets</span>
        <span class="toggle-icon">▼</span>
      </div>
    `;

    const body = document.createElement("div");
    body.className = "topic-accordion-body";
    const setsGrid = document.createElement("div");
    setsGrid.className = "sets-card-grid";

    sets.forEach(setItem => {
      // Is set ke liye student ke pichle attempts filter karein
      const attemptsForThisSet = userAttemptHistory.filter(a => String(a.test_id) === String(setItem.test_id));
      let historyHtml = `<div style="font-size:11.5px; color:#64748b; margin-bottom:10px; font-weight:500;">Status: Unattempted</div>`;
      
      if (attemptsForThisSet.length > 0) {
        const bestScore = Math.max(...attemptsForThisSet.map(a => parseFloat(a.score)));
        historyHtml = `<div style="font-size:11.5px; color:#16a34a; margin-bottom:10px; font-weight:600;">
          ★ Best Score: ${bestScore} | Total Attempts: ${attemptsForThisSet.length}
        </div>`;
      }

      const tile = document.createElement("div");
      tile.className = "set-tile";
      tile.innerHTML = `
        <div>
          <div class="set-tile-title">${setItem.test_title}</div>
          <div class="set-tile-meta">
            <span>⏱ ${setItem.total_duration_minutes} Mins</span>
            <span>📝 ${setItem.total_questions} Qs</span>
          </div>
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

function filterTopics(query) {
  document.querySelectorAll(".topic-group-card").forEach(card => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(query) ? "block" : "none";
  });
}

// ================= 3. EXAM LAUNCH & STATE MACHINE =================
window.launchAssessment = async function(testId) {
  switchView("viewExam");
  document.getElementById("examCandidateRoll").innerText = currentCandidate.roll_number;
  document.getElementById("questionContent").innerText = "Configuring assessment runtime...";

  // 1. Test Details
  const { data: testInfo } = await supabaseClient
    .from("tests")
    .select("id, title, total_duration_minutes")
    .eq("id", testId)
    .single();

  activeTest = testInfo;
  document.getElementById("examTitle").innerText = activeTest.title;
  timeRemaining = (activeTest.total_duration_minutes || 15) * 60;

  // 2. Sections
  const { data: sections } = await supabaseClient
    .from("test_sections")
    .select("id, section_name")
    .eq("test_id", testId)
    .limit(1);

  const section = sections[0];
  document.getElementById("subjectLabel").innerText = section ? section.section_name : "Core Section";
  document.getElementById("sectionTabs").innerHTML = `<button class="section-tab">Section 1: ${section ? section.section_name : "General"}</button>`;

  // 3. Questions
  const { data: qData, error } = await supabaseClient
    .from("test_section_questions")
    .select(`
      question_number,
      questions (
        id, content, options, correct_answer, explanation
      )
    `)
    .eq("section_id", section.id)
    .order("question_number", { ascending: true });

  if (error || !qData || qData.length === 0) {
    alert("Is test ke questions link nahi hain!");
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

  // Responses reset
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

  // Text Parse
  let qText = "";
  if (typeof q.content === "object" && q.content !== null) {
    qText = q.content.en || q.content.hi || JSON.stringify(q.content);
  } else {
    qText = String(q.content);
  }
  document.getElementById("questionContent").innerText = qText;

  // Options
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
    span.innerText = opt.text || opt.en || JSON.stringify(opt);

    row.appendChild(radio);
    row.appendChild(span);
    optContainer.appendChild(row);
  });

  renderPaletteGrid();
  updateStatusMatrix();
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

  document.getElementById("cntAnswered").innerText = ans;
  document.getElementById("cntNotAnswered").innerText = notAns;
  document.getElementById("cntNotVisited").innerText = notVis;
  document.getElementById("cntReview").innerText = rev;
  document.getElementById("cntAnsReview").innerText = ansRev;
}

function startExamTimer() {
  if (timerInterval) clearInterval(timerInterval);
  const display = document.getElementById("timerDisplay");

  timerInterval = setInterval(() => {
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      showExamSummaryModal();
      return;
    }
    timeRemaining--;
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    display.innerText = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, 1000);
}

// ================= 4. SUBMISSION & SCORECARD =================
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
      <div class="tcs-modal-header">Exam Final Summary - ${activeTest.title}</div>
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
        <p style="font-size:12px; color:#64748b;">Submit karne ke baad responses edit nahi ho sakenge.</p>
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
  
  // Time tracking logic
  const totalDurationSecs = (activeTest.total_duration_minutes || 15) * 60;
  const timeSpentSecs = totalDurationSecs - timeRemaining;
  const timeSpentMins = Math.ceil(timeSpentSecs / 60);

  // 1. Data Save: Test Attempt
  try {
    await supabaseClient.from("test_attempts").insert({
      student_roll: currentCandidate.roll_number,
      test_id: activeTest.id,
      score: score,
      total_correct: correct,
      total_incorrect: incorrect,
      time_spent_seconds: timeSpentSecs
    });

    // 2. Data Save: Daily Attendance (Time Update)
    const today = new Date().toISOString().split('T')[0];
    const { data: attRecord } = await supabaseClient
      .from("daily_attendance")
      .select("id, total_minutes_spent")
      .eq("student_roll", currentCandidate.roll_number)
      .eq("study_date", today)
      .maybeSingle();

    if (attRecord) {
      await supabaseClient.from("daily_attendance")
        .update({ total_minutes_spent: attRecord.total_minutes_spent + timeSpentMins })
        .eq("id", attRecord.id);
    } else {
      await supabaseClient.from("daily_attendance").insert({
        student_roll: currentCandidate.roll_number,
        study_date: today,
        total_minutes_spent: timeSpentMins
      });
    }
  } catch (err) {
    console.error("Telemetry save error:", err);
  }

  // 3. Render Scorecard UI
  const modal = document.getElementById("submitModalContainer");
  modal.innerHTML = `
    <div class="tcs-modal-box" style="width: 620px;">
      <div class="tcs-modal-header" style="background:#16a34a;">Assessment Scorecard & Analysis</div>
      <div class="tcs-modal-body">
        <div style="text-align:center; padding: 15px; background:#f1f5f9; margin-bottom:15px;">
          <h2 style="font-size:26px; color:#1e3a8a;">Score: ${score.toFixed(2)} / ${testQuestions.length * 2}</h2>
          <p style="font-size:12px; color:#64748b;">Time Taken: ${Math.floor(timeSpentSecs / 60)}m ${timeSpentSecs % 60}s | Marking: +2.00 | -0.50</p>
        </div>
        <table class="modal-summary-table">
          <tbody>
            <tr><td>Correct Answers</td><td style="color:#16a34a; font-weight:bold;">${correct} (+${(correct*2).toFixed(2)})</td></tr>
            <tr><td>Incorrect Answers</td><td style="color:#dc2626; font-weight:bold;">${incorrect} (-${(incorrect*0.5).toFixed(2)})</td></tr>
            <tr><td>Unattempted</td><td>${unattempted}</td></tr>
            <tr><td>Accuracy</td><td>${(correct + incorrect) > 0 ? ((correct / (correct + incorrect)) * 100).toFixed(1) : 0}%</td></tr>
          </tbody>
        </table>
        <div style="font-size:12px; color:#16a34a; text-align:center; font-weight:600;">✔ Progress & Attendance Synced Successfully</div>
      </div>
      <div class="tcs-modal-footer">
        <button class="tcs-btn btn-secondary" onclick="openSolutionsView()">View Detailed Solutions</button>
        <button class="tcs-btn btn-primary" onclick="closeExamAndReload()">Return to Repository</button>
      </div>
    </div>
  `;
}

// Naya helper function jisse history refresh ho jaye
window.closeExamAndReload = async function() {
  document.getElementById("submitModalContainer").style.display = "none";
  // Wapas dashboard par jayenge aur naya history data laane ke liye fetch call karenge
  switchView("viewDashboard");
  await fetchTestCatalog();
};

window.closeExamAndReturnToDashboard = function() {
  document.getElementById("submitModalContainer").style.display = "none";
  mountDashboard();
};

function switchView(viewId) {
  document.getElementById("viewLogin").style.display = "none";
  document.getElementById("viewDashboard").style.display = "none";
  document.getElementById("viewExam").style.display = "none";
  document.getElementById("viewSolutions").style.display = "none"; // Naya view hide kiya
  document.getElementById(viewId).style.display = "flex";
}


// ================= 5. SOLUTIONS & EXPLANATIONS VIEW =================
window.openSolutionsView = function() {
  document.getElementById("submitModalContainer").style.display = "none";
  document.getElementById("solExamTitle").innerText = activeTest.title;
  switchView("viewSolutions");

  const container = document.getElementById("solutionsContainer");
  container.innerHTML = "";

  testQuestions.forEach((q, idx) => {
    const userAns = userResponses[idx].selected;
    const correctAns = String(q.correctAnswer);
    
    // Status Badge Logic
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

    // Question Text Parsing
    let qText = typeof q.content === "object" && q.content !== null ? (q.content.en || q.content.hi || JSON.stringify(q.content)) : String(q.content);
    
    // Explanation Text Parsing
    let expText = "No explanation provided.";
    if (q.explanation) {
       expText = typeof q.explanation === "object" ? (q.explanation.en || q.explanation.hi || JSON.stringify(q.explanation)) : String(q.explanation);
    }

    // Generate Options HTML
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

      optionsHtml += `
        <div class="${optClass}">
          <span>${icon}</span>
          <span>${opt.text || opt.en || JSON.stringify(opt)}</span>
        </div>
      `;
    });

    // Build the Card
    const card = document.createElement("div");
    card.className = "solution-card";
    card.innerHTML = `
      <div class="sol-q-header">
        <span>Question ${q.qNum}</span>
        <span class="sol-status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="sol-content">${qText}</div>
      <div style="margin-bottom: 16px;">
        ${optionsHtml}
      </div>
      <div class="sol-explanation">
        <strong>Explanation:</strong>
        ${expText}
      </div>
    `;
    
    container.appendChild(card);
  });
};


// ================= DASHBOARD ANALYTICS ENGINE =================
async function fetchStudentAnalytics() {
  try {
    // 1. कुल अटेम्प्ट्स और एक्यूरेसी निकालें
    const { data: attempts } = await supabaseClient
      .from("test_attempts")
      .select("total_correct, total_incorrect")
      .eq("student_roll", currentCandidate.roll_number);

    let totalTests = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;

    if (attempts && attempts.length > 0) {
      totalTests = attempts.length;
      attempts.forEach(a => {
        totalCorrect += (a.total_correct || 0);
        totalIncorrect += (a.total_incorrect || 0);
      });
    }

    let accuracy = 0;
    if (totalCorrect + totalIncorrect > 0) {
      accuracy = ((totalCorrect / (totalCorrect + totalIncorrect)) * 100).toFixed(1);
    }

    // 2. कुल पढ़ाई का समय (Daily Attendance) निकालें
    const { data: attendance } = await supabaseClient
      .from("daily_attendance")
      .select("total_minutes_spent")
      .eq("student_roll", currentCandidate.roll_number);
    
    let totalMins = 0;
    if (attendance && attendance.length > 0) {
      attendance.forEach(record => {
        totalMins += (record.total_minutes_spent || 0);
      });
    }

    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;

    // 3. UI को अपडेट करें
    document.getElementById("statTotalTests").innerText = totalTests;
    document.getElementById("statAccuracy").innerText = accuracy + "%";
    document.getElementById("statStudyTime").innerText = `${hours}h ${mins}m`;

  } catch (err) {
    console.error("Analytics fetch error:", err);
  }
}