// ================= 1. CONFIGURATION & SUPABASE INIT =================
const SUPABASE_URL = "https://hqrbqqdjbswbvfhhqefw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcmJxcWRqYnN3YnZmaGhxZWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjI5ODgsImV4cCI6MjEwNzAzODk4OH0.iTay17X_Ysep1r-NLPSWpAzlQF-fmBb0sw1v7ptsdpE"; // यहाँ अपनी वास्तविक Anon Key डालें

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================= 2. GLOBAL STATE =================
let currentCandidate = null;
let catalogData = [];
let activeSubject = null;
let userAttemptHistory = []; // Student की हिस्ट्री स्टोर करने के लिए
let currentLang = "en"; // डिफ़ॉल्ट भाषा इंग्लिश

// --- स्मार्ट लैंग्वेज फॉलबैक हेल्पर ---
function getLocalizedText(obj) {
  if (typeof obj === "object" && obj !== null) {
    if (currentLang === "hi") {
      // अगर हिंदी चुनी है और हिंदी मौजूद है तो वो दिखाएं, वरना इंग्लिश + नोट दिखाएं
      return obj.hi ? obj.hi : (obj.en + "\n\n*(यह कंटेंट अभी हिंदी में उपलब्ध नहीं है)*");
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

// ================= 3. APP INITIALIZATION & ROUTER =================
window.addEventListener("DOMContentLoaded", () => {
  setupAppEvents();
  checkExistingSession();
});

window.switchView = function(viewId) {
  document.getElementById("viewLogin").style.display = "none";
  document.getElementById("viewDashboard").style.display = "none";
  document.getElementById("viewExam").style.display = "none";
  document.getElementById("viewSolutions").style.display = "none";
  document.getElementById("viewProfile").style.display = "none";
  document.getElementById(viewId).style.display = "flex";
};

// ================= 4. AUTH LAYER =================
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
  // Login Submit
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const roll = document.getElementById("inputRollNumber").value.trim();
    const btn = document.getElementById("btnLogin");
    const errBox = document.getElementById("loginError");
    
    errBox.style.display = "none";
    btn.innerText = "Authenticating...";
    btn.disabled = true;

    try {
      const { data: student, error } = await supabaseClient
        .from("students")
        .select("*")
        .eq("roll_number", roll)
        .maybeSingle();

      if (error || !student) {
        currentCandidate = { roll_number: roll, full_name: "Candidate " + roll };
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

  // Logout
  document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("candidate_session");
    currentCandidate = null;
    switchView("viewLogin");
  });

  // Open Profile
  document.getElementById("btnMyProfile").addEventListener("click", () => {
    fetchStudentAnalytics(); 
    switchView("viewProfile");
  });

  // Exam Action Buttons
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

  // Dashboard Search
  document.getElementById("topicSearchInput").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll(".topic-accordion-card").forEach(card => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(query) ? "block" : "none";
    });
  });
  // Language Switcher Event
  document.getElementById("langSwitch").addEventListener("change", (e) => {
    currentLang = e.target.value;
    // अगर एग्जाम चल रहा है, तो करंट सवाल को नई भाषा में रीलोड करें
    if (document.getElementById("viewExam").style.display === "flex") {
      renderQuestion(currentIndex);
    }
  });
}



// ================= 5. DASHBOARD & TAXONOMY LAYER =================
async function mountDashboard() {
  document.getElementById("dashCandidateName").innerText = currentCandidate.full_name;
  document.getElementById("dashCandidateRoll").innerText = "ROLL: " + currentCandidate.roll_number;

  switchView("viewDashboard");
  await fetchStudentAnalytics(); // Background update
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

  // Student History Fetch karein
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

// ================= 6. EXAM ENGINE LAYER =================
window.launchAssessment = async function(testId) {
  switchView("viewExam");
  document.getElementById("examCandidateRoll").innerText = currentCandidate.roll_number;
  document.getElementById("questionContent").innerText = "Configuring assessment runtime...";

  const { data: testInfo } = await supabaseClient.from("tests").select("id, title, total_duration_minutes").eq("id", testId).single();
  activeTest = testInfo;
  document.getElementById("examTitle").innerText = activeTest.title;
  timeRemaining = (activeTest.total_duration_minutes || 15) * 60;

  const { data: sections } = await supabaseClient.from("test_sections").select("id, section_name").eq("test_id", testId).limit(1);
  const section = sections[0];
  document.getElementById("subjectLabel").innerText = section ? section.section_name : "Core Section";
  document.getElementById("sectionTabs").innerHTML = `<button class="section-tab">Section 1: ${section ? section.section_name : "General"}</button>`;

  const { data: qData, error } = await supabaseClient
    .from("test_section_questions")
    .select(`question_number, questions (id, content, options, correct_answer, explanation)`)
    .eq("section_id", section.id).order("question_number", { ascending: true });

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

  // नए स्मार्ट हेल्पर से सवाल का टेक्स्ट निकालें
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

    radio.addEventListener("change", () => { userResponses[currentIndex].selected = String(opt.id); });

    const span = document.createElement("span");
    // ऑप्शंस के लिए भी स्मार्ट हेल्पर का इस्तेमाल
    span.innerText = getLocalizedText({ en: opt.en || opt.text, hi: opt.hi });

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
  if (currentIndex + 1 < testQuestions.length) renderQuestion(currentIndex + 1);
  else { renderPaletteGrid(); updateStatusMatrix(); }
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

// ================= 7. SUBMISSION, SCORECARD & TELEMETRY =================
function showExamSummaryModal() {
  let ans = 0, notAns = 0, notVis = 0, rev = 0, ansRev = 0;
  Object.values(userResponses).forEach(r => {
    if (r.status === 0) notVis++; else if (r.status === 1) notAns++; else if (r.status === 2) ans++; else if (r.status === 3) rev++; else if (r.status === 4) ansRev++;
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
    // 1. Save Test Attempt
    await supabaseClient.from("test_attempts").insert({
      student_roll: currentCandidate.roll_number, test_id: activeTest.id, score: score, total_correct: correct, total_incorrect: incorrect, time_spent_seconds: timeSpentSecs
    });

    // 2. Update Daily Attendance
    const today = new Date().toISOString().split('T')[0];
    const { data: attRecord } = await supabaseClient.from("daily_attendance").select("id, total_minutes_spent").eq("student_roll", currentCandidate.roll_number).eq("study_date", today).maybeSingle();

    if (attRecord) {
      await supabaseClient.from("daily_attendance").update({ total_minutes_spent: attRecord.total_minutes_spent + timeSpentMins }).eq("id", attRecord.id);
    } else {
      await supabaseClient.from("daily_attendance").insert({ student_roll: currentCandidate.roll_number, study_date: today, total_minutes_spent: timeSpentMins });
    }
  } catch (err) { console.error("Telemetry save error:", err); }

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

window.closeExamAndReload = async function() {
  document.getElementById("submitModalContainer").style.display = "none";
  mountDashboard();
};

// ================= 8. SOLUTIONS & EXPLANATIONS VIEW =================

// ================= 8. SOLUTIONS & EXPLANATIONS VIEW =================
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
      if (String(userAns) === correctAns) { statusText = "Correct"; statusClass = "sol-status-correct"; } 
      else { statusText = "Incorrect"; statusClass = "sol-status-incorrect"; }
    }

    // स्मार्ट हेल्पर से सवाल और एक्सप्लेनेशन फेच करें
    let qText = getLocalizedText(q.content);
    
    let expText = "No explanation provided.";
    if (q.explanation) {
      expText = getLocalizedText(q.explanation);
    }

    let optionsHtml = "";
    const optionsList = Array.isArray(q.options) ? q.options : [];
    
    optionsList.forEach(opt => {
      const optId = String(opt.id);
      let optClass = "sol-option";
      let icon = "⚪";

      if (optId === correctAns) { optClass += " sol-opt-correct"; icon = "✔️"; } 
      else if (optId === String(userAns) && optId !== correctAns) { optClass += " sol-opt-wrong"; icon = "❌"; }

      // स्मार्ट हेल्पर से ऑप्शन फेच करें
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

// ================= 9. STUDENT ANALYTICS & CALENDAR =================
async function fetchStudentAnalytics() {
  try {
    const { data: attempts } = await supabaseClient.from("test_attempts").select("total_correct, total_incorrect").eq("student_roll", currentCandidate.roll_number);
    let totalTests = attempts ? attempts.length : 0;
    let totalCorrect = 0, totalIncorrect = 0;

    if (attempts) {
      attempts.forEach(a => { totalCorrect += (a.total_correct || 0); totalIncorrect += (a.total_incorrect || 0); });
    }
    let accuracy = (totalCorrect + totalIncorrect > 0) ? ((totalCorrect / (totalCorrect + totalIncorrect)) * 100).toFixed(1) : 0;

    const { data: attendance } = await supabaseClient.from("daily_attendance").select("study_date, total_minutes_spent").eq("student_roll", currentCandidate.roll_number);
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
  } catch (err) { console.error("Analytics fetch error:", err); }
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