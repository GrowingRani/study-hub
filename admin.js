const SUPABASE_URL = "https://hqrbqqdjbswbvfhhqefw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcmJxcWRqYnN3YnZmaGhxZWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjI5ODgsImV4cCI6MjEwNzAzODk4OH0.iTay17X_Ysep1r-NLPSWpAzlQF-fmBb0sw1v7ptsdpE"; // <-- यहाँ अपनी असली Key डालें!

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.addEventListener("DOMContentLoaded", () => {
  setupAdminTabs();
  loadAdminDashboard();
});

// ================= TAB NAVIGATION =================
function setupAdminTabs() {
  const tabs = ["Dashboard", "Students", "Tests"];
  
  tabs.forEach(tab => {
    document.getElementById(`tab${tab}`).addEventListener("click", () => {
      // 1. सारे बटन्स से 'active' क्लास हटाएं
      document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
      // 2. क्लिक किए गए बटन को 'active' करें
      document.getElementById(`tab${tab}`).classList.add("active");
      
      // 3. सारे व्यूज़ को छिपाएं
      document.getElementById("viewDashboard").style.display = "none";
      document.getElementById("viewStudents").style.display = "none";
      document.getElementById("viewTests").style.display = "none";
      
      // 4. सिर्फ चुने गए व्यू को दिखाएं
      document.getElementById(`view${tab}`).style.display = "block";

      // 5. अगर स्टूडेंट्स या टेस्ट्स टैब खोला है, तो उनका डेटा लोड करें
      if(tab === "Students") loadStudentsList();
      if(tab === "Tests") loadTestsList();
    });
  });
}

// ================= VIEW 1: DASHBOARD DATA =================
async function loadAdminDashboard() {
  try {
    const { count: studentCount } = await supabaseClient.from('students').select('*', { count: 'exact', head: true });
    if (studentCount !== null) document.getElementById("adTotalStudents").innerText = studentCount;

    const { data: attempts } = await supabaseClient.from('test_attempts')
      .select('score, student_roll, test_id, time_spent_seconds, attempt_date')
      .order('attempt_date', { ascending: false });

    if (attempts && attempts.length > 0) {
      document.getElementById("adTotalTests").innerText = attempts.length;
      let totalScore = 0;
      attempts.forEach(a => totalScore += parseFloat(a.score || 0));
      document.getElementById("adAvgScore").innerText = (totalScore / attempts.length).toFixed(2);

      const tableBody = document.getElementById("activityTableBody");
      tableBody.innerHTML = "";
      const recentAttempts = attempts.slice(0, 20);

      recentAttempts.forEach(row => {
        const dateObj = new Date(row.attempt_date);
        const dateStr = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString();
        const mins = Math.floor(row.time_spent_seconds / 60);
        const secs = row.time_spent_seconds % 60;
        let scoreClass = row.score > 0 ? "score-high" : "score-low";

        tableBody.innerHTML += `
          <tr>
            <td>${dateStr}</td>
            <td style="font-weight: 600;">${row.student_roll}</td>
            <td>Set ID: ${row.test_id}</td>
            <td class="${scoreClass}">${row.score}</td>
            <td>${mins}m ${secs}s</td>
          </tr>
        `;
      });
    } else {
      document.getElementById("activityTableBody").innerHTML = "<tr><td colspan='5'>No test attempts recorded yet. Take a test from the student portal to see data here.</td></tr>";
    }
  } catch (error) {
    console.error("Dashboard Error:", error);
  }
}

// ================= VIEW 2: STUDENTS LIST =================
async function loadStudentsList() {
  const tableBody = document.getElementById("studentsTableBody");
  tableBody.innerHTML = "<tr><td colspan='4'>Loading students...</td></tr>";

  const { data: students, error } = await supabaseClient.from('students').select('*').order('created_at', { ascending: false });
  
  if (students && students.length > 0) {
    tableBody.innerHTML = "";
    students.forEach(s => {
      const dateStr = new Date(s.created_at).toLocaleDateString();
      tableBody.innerHTML += `
        <tr>
          <td style="font-family: monospace; font-weight:bold; color:#1e3a8a;">${s.roll_number}</td>
          <td>${s.full_name}</td>
          <td><span style="background:#e2e8f0; padding:2px 8px; border-radius:10px; font-size:11px;">${s.target_exam || 'General'}</span></td>
          <td>${dateStr}</td>
        </tr>
      `;
    });
  } else {
    tableBody.innerHTML = "<tr><td colspan='4'>No students found in database.</td></tr>";
  }
}

// ================= VIEW 3: TESTS CATALOG =================
async function loadTestsList() {
  const tableBody = document.getElementById("testsTableBody");
  tableBody.innerHTML = "<tr><td colspan='6'>Loading repository...</td></tr>";

  // हमने जो view_test_catalog बनाया था, उसका इस्तेमाल करेंगे
  const { data: catalog, error } = await supabaseClient.from('view_test_catalog').select('*').order('test_id', { ascending: true });
  
  if (catalog && catalog.length > 0) {
    tableBody.innerHTML = "";
    catalog.forEach(t => {
      tableBody.innerHTML += `
        <tr>
          <td style="font-weight:bold; color:#64748b;">#${t.test_id}</td>
          <td style="font-weight:600;">${t.test_title}</td>
          <td>${t.subject || 'General'}</td>
          <td>${t.topic || '-'}</td>
          <td><span style="background:#dcfce7; color:#16a34a; padding:2px 8px; border-radius:10px; font-weight:bold;">${t.total_questions}</span></td>
          <td>${t.total_duration_minutes} Mins</td>
        </tr>
      `;
    });
  } else {
    tableBody.innerHTML = "<tr><td colspan='6'>No tests found in database view.</td></tr>";
  }
}