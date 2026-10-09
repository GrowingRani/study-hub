// 1. Supabase Credentials
//const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcmJxcWRqYnN3YnZmaGhxZWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjI5ODgsImV4cCI6MjEwNzAzODk4OH0.iTay17X_Ysep1r-NLPSWpAzlQF-fmBb0sw1v7ptsdpE"; // Apni anon key dalein

const SUPABASE_URL = "https://hqrbqqdjbswbvfhhqefw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcmJxcWRqYnN3YnZmaGhxZWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjI5ODgsImV4cCI6MjEwNzAzODk4OH0.iTay17X_Ysep1r-NLPSWpAzlQF-fmBb0sw1v7ptsdpE"; // Apni anon key dalein

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// STATE CONTROLLER
let availableTests = [];
let currentTestId = null;
let testQuestions = [];
let currentIndex = 0;
let userResponses = {}; 
let timeRemaining = 15 * 60;
let timerInterval = null;

// INIT ASSESSMENT
window.addEventListener("DOMContentLoaded", async () => {
  await loadTestList();
  setupEventListeners();
});

// 1. सभी टेस्ट्स की लिस्ट लाएं और ड्रॉपडाउन में भरें
async function loadTestList() {
  const { data: tests, error } = await supabaseClient
    .from("tests")
    .select("id, title, total_duration_minutes")
    .order("id", { ascending: true });

  if (error || !tests || tests.length === 0) {
    document.getElementById("questionContent").innerText = "Database से टेस्ट लिस्ट लोड नहीं हो सकी।";
    return;
  }

  availableTests = tests;
  const dropdown = document.getElementById("testSelectDropdown");
  dropdown.innerHTML = "";

  tests.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.innerText = t.title;
    dropdown.appendChild(opt);
  });

  // पहला टेस्ट लोड करें
  currentTestId = tests[0].id;
  await loadSelectedTest(currentTestId);

  // ड्रॉपडाउन बदलने पर नया टेस्ट लोड हो
  dropdown.addEventListener("change", async (e) => {
    currentTestId = e.target.value;
    await loadSelectedTest(currentTestId);
  });
}

// 2. सिलेक्टेड टेस्ट के सवाल और सेक्शन लोड करें
async function loadSelectedTest(testId) {
  const testInfo = availableTests.find(t => String(t.id) === String(testId));
  timeRemaining = (testInfo?.total_duration_minutes || 15) * 60;

  // सेक्शन प्राप्त करें
  const { data: sections } = await supabaseClient
    .from("test_sections")
    .select("id, section_name")
    .eq("test_id", testId)
    .limit(1);

  const activeSection = sections && sections.length > 0 ? sections[0] : null;
  const secName = activeSection ? activeSection.section_name : "General Awareness";

  // UI अपडेट: सेक्शन टैब और कैंडिडेट सब्जेक्ट
  document.getElementById("subjectLabel").innerText = secName;
  const tabContainer = document.getElementById("sectionTabs");
  tabContainer.innerHTML = `<button class="section-tab active">Section 1: ${secName}</button>`;

  // सवाल फेच करें
  const { data: mappingData, error: mapErr } = await supabaseClient
    .from("test_section_questions")
    .select(`
      question_number,
      questions (
        id,
        subject,
        sub_topic,
        content,
        options,
        correct_answer,
        explanation
      )
    `)
    .eq("section_id", activeSection.id)
    .order("question_number", { ascending: true });

  if (mapErr || !mappingData || mappingData.length === 0) {
    document.getElementById("questionContent").innerText = "इस टेस्ट में कोई सवाल नहीं मिले।";
    return;
  }

  testQuestions = mappingData.map(item => ({
    qNum: item.question_number,
    id: item.questions.id,
    subject: item.questions.subject,
    subTopic: item.questions.sub_topic,
    content: item.questions.content,
    options: item.questions.options,
    correctAnswer: item.questions.correct_answer,
    explanation: item.questions.explanation
  }));

  // स्टेट रीसेट: पहला सवाल Not Answered (1), बाकी Not Visited (0)
  userResponses = {};
  testQuestions.forEach((q, idx) => {
    userResponses[idx] = {
      selected: null,
      status: idx === 0 ? 1 : 0, 
      timeSpent: 0
    };
  });

  renderQuestion(0);
  startTimer();
}

// 3. सवाल रेंडर लॉजिक
function renderQuestion(index) {
  if (!testQuestions[index]) return;
  currentIndex = index;
  const q = testQuestions[index];
  const state = userResponses[index];

  // अगर Not Visited था, तो Not Answered बनाएं
  if (state.status === 0) {
    state.status = 1;
  }

  document.getElementById("qDisplayNumber").innerText = q.qNum;

  // सवाल का टेक्स्ट
  let qText = "";
  if (typeof q.content === "object" && q.content !== null) {
    qText = q.content.en || q.content.hi || JSON.stringify(q.content);
  } else {
    qText = String(q.content);
  }
  document.getElementById("questionContent").innerText = qText;

  // ऑप्शंस रेंडर
  const optContainer = document.getElementById("optionsContainer");
  optContainer.innerHTML = "";

  const optionsList = Array.isArray(q.options) ? q.options : [];
  optionsList.forEach(opt => {
    const row = document.createElement("label");
    row.className = "option-row";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "currentOption";
    radio.value = String(opt.id);
    if (state.selected === String(opt.id)) {
      radio.checked = true;
    }

    radio.addEventListener("change", () => {
      userResponses[currentIndex].selected = String(opt.id);
    });

    const span = document.createElement("span");
    span.innerText = opt.text || opt.en || JSON.stringify(opt);

    row.appendChild(radio);
    row.appendChild(span);
    optContainer.appendChild(row);
  });

  renderPalette();
  updateStatusMatrix();
}

// 4. पैलेट ग्रिड रेंडर (कलर क्लासेस और एक्टिव बॉर्डर के साथ)
function renderPalette() {
  const grid = document.getElementById("paletteGrid");
  grid.innerHTML = "";

  testQuestions.forEach((q, idx) => {
    const btn = document.createElement("button");
    btn.className = "palette-btn";
    btn.innerText = q.qNum;

    // एक्टिव सवाल पर आउटलाइन
    if (idx === currentIndex) {
      btn.classList.add("active-q");
    }

    // कलर और शेप क्लास
    const status = userResponses[idx].status;
    if (status === 0) btn.classList.add("not-visited");
    else if (status === 1) btn.classList.add("not-answered");
    else if (status === 2) btn.classList.add("answered");
    else if (status === 3) btn.classList.add("review");
    else if (status === 4) btn.classList.add("ans-review");

    btn.addEventListener("click", () => renderQuestion(idx));
    grid.appendChild(btn);
  });
}

// 5. बटन्स के इवेंट लिसनर्स
function setupEventListeners() {
  document.getElementById("btnSaveNext").addEventListener("click", () => {
    const state = userResponses[currentIndex];
    state.status = (state.selected !== null) ? 2 : 1;
    goToNextQuestion();
  });

  document.getElementById("btnMarkReview").addEventListener("click", () => {
    const state = userResponses[currentIndex];
    state.status = (state.selected !== null) ? 4 : 3;
    goToNextQuestion();
  });

  document.getElementById("btnClear").addEventListener("click", () => {
    userResponses[currentIndex].selected = null;
    userResponses[currentIndex].status = 1;
    renderQuestion(currentIndex);
  });

  // सबमिट बटन हैंडलर
  document.getElementById("btnSubmit").addEventListener("click", () => {
    showSubmitSummaryModal();
  });
}

function goToNextQuestion() {
  if (currentIndex + 1 < testQuestions.length) {
    renderQuestion(currentIndex + 1);
  } else {
    renderPalette();
    updateStatusMatrix();
  }
}

// 6. स्टेटस मैट्रिक्स काउंटर
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

// 7. सबमिट मोडल और स्कोरकार्ड
function showSubmitSummaryModal() {
  let ans = 0, notAns = 0, notVis = 0, rev = 0, ansRev = 0;
  Object.values(userResponses).forEach(r => {
    if (r.status === 0) notVis++;
    else if (r.status === 1) notAns++;
    else if (r.status === 2) ans++;
    else if (r.status === 3) rev++;
    else if (r.status === 4) ansRev++;
  });

  const modalContainer = document.getElementById("submitModalContainer");
  modalContainer.style.display = "flex";
  modalContainer.className = "tcs-modal-overlay";

  modalContainer.innerHTML = `
    <div class="tcs-modal-box">
      <div class="tcs-modal-header">Exam Summary</div>
      <div class="tcs-modal-body">
        <table class="modal-summary-table">
          <thead>
            <tr>
              <th>Status Category</th>
              <th>Total Questions</th>
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
        <p style="font-size:13px; color:#475569;">Are you sure you want to submit the assessment?</p>
      </div>
      <div class="tcs-modal-footer">
        <button class="tcs-btn btn-secondary" onclick="document.getElementById('submitModalContainer').style.display='none'">Back to Exam</button>
        <button class="tcs-btn btn-submit" id="btnFinalSubmitConfirm">Confirm & Submit</button>
      </div>
    </div>
  `;

  document.getElementById("btnFinalSubmitConfirm").addEventListener("click", () => {
    if (timerInterval) clearInterval(timerInterval);
    generateScorecard();
  });
}

// 8. स्कोरकार्ड और रिजल्ट कैलकुलेशन
function generateScorecard() {
  let correct = 0, incorrect = 0, unattempted = 0;

  testQuestions.forEach((q, idx) => {
    const userAns = userResponses[idx].selected;
    if (!userAns) {
      unattempted++;
    } else if (String(userAns) === String(q.correctAnswer)) {
      correct++;
    } else {
      incorrect++;
    }
  });

  const totalScore = (correct * 2.00) - (incorrect * 0.50);

  const modalContainer = document.getElementById("submitModalContainer");
  modalContainer.innerHTML = `
    <div class="tcs-modal-box" style="width: 620px;">
      <div class="tcs-modal-header" style="background:#16a34a;">Assessment Result & Scorecard</div>
      <div class="tcs-modal-body">
        <div style="text-align:center; padding: 15px; background:#f1f5f9; margin-bottom:15px; border-radius:4px;">
          <h2 style="font-size:28px; color:#1e3a8a;">Total Score: ${totalScore.toFixed(2)} / ${testQuestions.length * 2}</h2>
          <p style="font-size:12px; color:#64748b;">Marking Scheme: +2.00 Correct | -0.50 Incorrect</p>
        </div>
        <table class="modal-summary-table">
          <tbody>
            <tr><td>Correct Answers</td><td style="color:#16a34a; font-weight:bold;">${correct} (+${(correct*2).toFixed(2)})</td></tr>
            <tr><td>Incorrect Answers</td><td style="color:#dc2626; font-weight:bold;">${incorrect} (-${(incorrect*0.5).toFixed(2)})</td></tr>
            <tr><td>Unattempted</td><td>${unattempted}</td></tr>
            <tr><td>Accuracy</td><td>${(correct + incorrect) > 0 ? ((correct / (correct + incorrect)) * 100).toFixed(1) : 0}%</td></tr>
          </tbody>
        </table>
      </div>
      <div class="tcs-modal-footer">
        <button class="tcs-btn btn-primary" onclick="window.location.reload()">Take Another Test</button>
      </div>
    </div>
  `;
}

// 9. टाइमर इंजन
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  const display = document.getElementById("timerDisplay");

  timerInterval = setInterval(() => {
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      showSubmitSummaryModal();
      return;
    }
    timeRemaining--;
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    display.innerText = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, 1000);
}