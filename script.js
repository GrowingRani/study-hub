    const API_URL = "https://script.google.com/macros/s/AKfycbxX2eP7bzttr1q1cVxYWHFf9PskuykvefmJKY4mQRMOUCZ8VhSoTTG6lJzKNkLHgJ5v/exec";

    let globalAudioCtx = null;
    const TIME_FRACTION = 5;
    const LIFELINE_TOTAL = 3;

    // Multi-subject tracking
    let currentSelectedSubject = null;
    let topic = "";
    let initialQuestions = [];

    let studyModeType = "quiz";
    let isShuffleEnabled = true;
    let isInsightEnabled = true;
    let selectedBatchSize = 'ALL';

    let sessionActive = false;
    let soundEnabled = true;
    let currentPaletteFilter = 'all';
    let isFinishScreen = false;
    let awaitingAcknowledgment = false;

    // REFINED THEMES
    const THEMES = ['default', 'hacker', 'sunset', 'paper', 'academic'];
    let currentThemeIdx = 0;
    let previousThemeIdx = 0;

    let globalQuestions = [];
    let questions = [];
    let currentBatchIndex = 0;
    let batchSize = 10;
    let currentIndex = 0;
    let mistakesQueue = [];
    let isReviewMode = false;

    let userAnswers = {};
    let localLocks = {};

    // CBT EXAM ENGINE STATES
    let examAnswers = {};
    let examQuestionStates = {};
    let isExamSubmitted = false;
    let isExamReview = false;
    let cheatWarnings = 0;

    let starredSet = new Set();
    let currentStreak = 0;
    let lifelinesRemaining = LIFELINE_TOTAL;
    let isCardFlipped = false;

    let sessionTimerInterval = null;
    let totalSessionElapsed = 0;
    let countdownSeconds = 0;

    // View Routing architecture 
    function switchScreen(screenId) {
      ['mobile-subject-screen', 'mobile-home-screen', 'study-interface-wrapper', 'exam-instructions-screen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === screenId) ? 'flex' : 'none';
      });
    }

    // Elegant Toast Notification System
    function showToast(msg, icon = 'info-circle', color = 'var(--current-primary)') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'app-toast';
      toast.innerHTML = `<i class="fas fa-${icon}" style="color: ${color}; margin-right: 6px;"></i> ${msg}`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }

    // Keyboard Accessibility Support
    document.addEventListener('keydown', (e) => {
      if (!sessionActive || isFinishScreen || document.getElementById('exitConfirmOverlay').style.display === 'flex') return;

      if (studyModeType !== 'exam') {
        if (e.key === 'ArrowRight') goToNextCard();
        if (e.key === 'ArrowLeft') goToPrevCard();
      }

      if (studyModeType === 'flashcard' && e.code === 'Space') {
        e.preventDefault();
        flipFlashcard(!isCardFlipped);
      }

      if (studyModeType === 'quiz' || (studyModeType === 'exam' && !isExamSubmitted)) {
        if (['1', '2', '3', '4', 'a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
          let idx;
          if (e.key >= '1' && e.key <= '4') {
            idx = parseInt(e.key) - 1;
          } else {
            idx = e.key.toLowerCase().charCodeAt(0) - 97;
          }
          const optionCards = document.querySelectorAll('.touch-option-card:not(.eliminated)');
          if (optionCards[idx]) {
            optionCards[idx].click();
          }
        }
      }
    });

    // Anti-Cheat (Proctoring) Mechanisms for Exam Mode
    document.addEventListener('copy', (e) => {
      if (sessionActive && studyModeType === 'exam' && !isExamSubmitted) {
        e.preventDefault();
        showToast("Copying is disabled during active exams.", "shield-alt", "var(--warning)");
      }
    });
    document.addEventListener('contextmenu', (e) => {
      if (sessionActive && studyModeType === 'exam' && !isExamSubmitted) e.preventDefault();
    });
    document.addEventListener('visibilitychange', () => {
      if (sessionActive && studyModeType === 'exam' && !isExamSubmitted && document.hidden) {
        cheatWarnings++;
        showToast(`Warning: Tab switching is recorded! (Violation #${cheatWarnings})`, "exclamation-triangle", "var(--danger)");
      }
    });

    // =========================================================
    // 📚 1. SUBJECT SCREEN CONTROLLER
    // =========================================================
    window.onload = () => {
      switchScreen('mobile-subject-screen');
      fetchSubjectsList();
    };

    function fetchSubjectsList() {
      const icon = document.getElementById('refresh-subjects-icon');
      if (icon) icon.classList.add('fa-spin');
      document.getElementById('offline-subjects-tag').style.display = 'none';

      const cached = localStorage.getItem('studyHub_cached_subjects');
      if (cached) {
        renderSubjectList(JSON.parse(cached));
      }

      fetch(API_URL + "?action=getSubjects")
        .then(response => response.json())
        .then(subjects => {
          if (icon) icon.classList.remove('fa-spin');
          const newSubjectsString = JSON.stringify(subjects);
          if (cached !== newSubjectsString) {
            try { localStorage.setItem('studyHub_cached_subjects', newSubjectsString); } catch(e){}
            renderSubjectList(subjects);
          }
        })
        .catch(err => {
          if (icon) icon.classList.remove('fa-spin');
          if (!cached) {
            document.getElementById('subject-list-container').innerHTML =
              `<div style="text-align:center; color:var(--danger); padding:40px 20px;">Connection Error: ${err.message}</div>`;
          }
        });
    }

    function renderSubjectList(subjects) {
      const container = document.getElementById('subject-list-container');
      const countTag = document.getElementById('subject-count-tag');

      if (!subjects || subjects.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 40px 20px;">No subjects registered in Master_Registry.</div>`;
        if (countTag) countTag.innerText = "0 Subjects";
        return;
      }

      if (countTag) countTag.innerText = `${subjects.length} Subjects`;
      let html = '';
      subjects.forEach((sub, i) => {
        const safeName = sub.name.replace(/'/g, "\\'");
        html += `
          <div class="subject-card" onclick="selectSubject('${safeName}', '${sub.id}')" style="animation: fadeSlideIn 0.3s ease forwards; animation-delay: ${i * 0.05}s; opacity: 0;">
            <div class="topic-meta-left">
              <div class="topic-name">${sub.name}</div>
              <div class="topic-badges-row">
                <span class="topic-count-pill"><i class="fas fa-database"></i> Connected</span>
                <span>• Tap to explore</span>
              </div>
            </div>
            <div class="topic-action-chevron"><i class="fas fa-chevron-right"></i></div>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    function filterMobileSubjects() {
      const term = document.getElementById('mobile-subject-search').value.toLowerCase().trim();
      const cards = document.querySelectorAll('.subject-card');
      let visible = 0;
      cards.forEach(c => {
        const text = c.innerText.toLowerCase();
        const show = text.includes(term);
        c.style.display = show ? 'flex' : 'none';
        if (show) visible++;
      });
      const countTag = document.getElementById('subject-count-tag');
      if (countTag) countTag.innerText = `${visible} Subjects`;
    }

    function selectSubject(subjectName, spreadsheetId) {
      currentSelectedSubject = { name: subjectName, id: spreadsheetId };
      switchScreen('mobile-home-screen');

      document.getElementById('active-subject-header-title').innerText = subjectName;
      document.getElementById('active-subject-header-sub').innerText = "Select Topic to Practice";

      fetchTopicsListForCurrentSubject();
    }

    function returnToSubjects() {
      switchScreen('mobile-subject-screen');
      currentSelectedSubject = null;
      fetchSubjectsList();
    }

    // =========================================================
    // 🏠 2. TOPIC SCREEN CONTROLLER (Folder > Subfolder Hierarchy)
    // =========================================================
    function fetchTopicsListForCurrentSubject() {
      if (!currentSelectedSubject) return;
      const icon = document.getElementById('refresh-topics-icon');
      if (icon) icon.classList.add('fa-spin');
      document.getElementById('offline-topics-tag').style.display = 'none';

      const cacheKey = `studyHub_cached_topics_${currentSelectedSubject.id}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        renderMobileHome(JSON.parse(cached));
      } else {
        document.getElementById('topic-list-container').innerHTML =
          `<div style="text-align: center; padding: 60px 20px; color: var(--text-sub);"><i class="fas fa-circle-notch fa-spin fa-2x" style="color: var(--current-primary); margin-bottom: 14px;"></i><br>Loading Topics...</div>`;
      }

      fetch(API_URL + "?action=getTopics&sheetId=" + encodeURIComponent(currentSelectedSubject.id))
        .then(response => response.json())
        .then(topics => {
          if (icon) icon.classList.remove('fa-spin');
          const newTopicsString = JSON.stringify(topics);
          if (cached !== newTopicsString) {
            try { localStorage.setItem(cacheKey, newTopicsString); } catch(e){}
            renderMobileHome(topics);
          }
        })
        .catch(err => {
          if (icon) icon.classList.remove('fa-spin');
          if (!cached) {
            document.getElementById('topic-list-container').innerHTML =
              `<div style="text-align:center; color:var(--danger); padding:40px 20px;">Connection Error: ${err.message}</div>`;
          }
        });
    }

    function renderMobileHome(topics) {
      const container = document.getElementById('topic-list-container');
      const countTag = document.getElementById('topic-count-tag');

      if (!topics || topics.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 40px 20px;">No topics found in Index_DB for this subject.</div>`;
        if (countTag) countTag.innerText = "0 Topics";
        return;
      }

      if (countTag) countTag.innerText = `${topics.length} Topics`;

      const tree = {};

      topics.forEach(t => {
        let rawPath = t.sheetName || 'General Practice';
        let segments = rawPath.split(/[\/>]/).map(s => s.trim()).filter(Boolean);

        let rootFolder = segments[0] || 'General Practice';
        let subFolder = segments.length > 1 ? segments.slice(1).join(' / ') : null;

        if (!tree[rootFolder]) {
          tree[rootFolder] = { directItems: [], subFolders: {} };
        }

        if (subFolder) {
          if (!tree[rootFolder].subFolders[subFolder]) {
            tree[rootFolder].subFolders[subFolder] = [];
          }
          tree[rootFolder].subFolders[subFolder].push(t);
        } else {
          tree[rootFolder].directItems.push(t);
        }
      });

      let html = '';
      let folderCounter = 0;

      for (const [folderName, folderData] of Object.entries(tree)) {
        folderCounter++;
        const totalSetsInFolder = folderData.directItems.length +
          Object.values(folderData.subFolders).reduce((acc, curr) => acc + curr.length, 0);

        const subFolderCount = Object.keys(folderData.subFolders).length;
        const metaSubtitle = subFolderCount > 0
          ? `${subFolderCount} Sub-folders • ${totalSetsInFolder} Question Sets`
          : `${totalSetsInFolder} Question Sets`;

        html += `
          <div class="folder-node-wrapper" id="folder-node-${folderCounter}">
            <div class="folder-header-card" onclick="toggleFolderNode('folder-node-${folderCounter}')">
              <div class="folder-title-row">
                <div class="folder-icon-bubble"><i class="fas fa-folder"></i></div>
                <div class="folder-text-meta">
                  <span class="folder-name-text">${folderName}</span>
                  <span class="folder-count-pill">${metaSubtitle}</span>
                </div>
              </div>
              <div class="folder-chevron-pill"><i class="fas fa-chevron-down"></i></div>
            </div>

            <div class="folder-children-drawer">
        `;

        folderData.directItems.forEach(t => {
          html += renderTopicCardHtml(t);
        });

        for (const [subName, subItems] of Object.entries(folderData.subFolders)) {
          folderCounter++;
          html += `
            <div class="folder-node-wrapper" id="folder-node-${folderCounter}">
              <div class="folder-header-card subfolder-header-card" onclick="toggleFolderNode('folder-node-${folderCounter}')">
                <div class="folder-title-row">
                  <div class="folder-icon-bubble subfolder-icon-bubble"><i class="fas fa-folder-open"></i></div>
                  <div class="folder-text-meta">
                    <span class="folder-name-text" style="font-size:13.5px;">${subName}</span>
                    <span class="folder-count-pill">${subItems.length} Question Sets</span>
                  </div>
                </div>
                <div class="folder-chevron-pill"><i class="fas fa-chevron-down"></i></div>
              </div>

              <div class="folder-children-drawer" style="border-left-color: rgba(251, 191, 36, 0.3);">
          `;

          subItems.forEach(t => {
            html += renderTopicCardHtml(t);
          });

          html += `</div></div>`;
        }

        html += `</div></div>`;
      }

      container.innerHTML = html;
    }

    function renderTopicCardHtml(t) {
      const safeTitle = t.title.replace(/'/g, "\\'");
      const sheetId = t.spreadsheetId || (currentSelectedSubject ? currentSelectedSubject.id : '');
      const count = t.count || 0;
      return `
        <div class="pro-topic-card mobile-topic-card" onclick="launchStudySession('${safeTitle}', '${sheetId}', ${count})">
          <div class="topic-meta-left">
            <div class="topic-name">${t.title}</div>
            <div class="topic-badges-row">
              <span class="topic-count-pill"><i class="far fa-file-alt"></i> ${count} Qs</span>
              <span>• Tap to Open</span>
            </div>
          </div>
          <div class="launch-pill-btn">
            <span>Play</span>
            <i class="fas fa-play" style="font-size: 9px;"></i>
          </div>
        </div>
      `;
    }

    function toggleFolderNode(nodeId) {
      const targetNode = document.getElementById(nodeId);
      if (!targetNode) return;

      const isCurrentlyOpen = targetNode.classList.contains('open');

      if (targetNode.querySelector('.subfolder-header-card')) {
        const parentDrawer = targetNode.closest('.folder-children-drawer');
        if (parentDrawer) {
          const siblingSubFolders = parentDrawer.querySelectorAll('.folder-node-wrapper.open');
          siblingSubFolders.forEach(folder => {
            if (folder.id !== nodeId) folder.classList.remove('open');
          });
        }
      } 
      else {
        const allRootFolders = document.querySelectorAll('#topic-list-container > .folder-node-wrapper.open');
        allRootFolders.forEach(folder => {
          if (folder.id !== nodeId) folder.classList.remove('open');
        });
      }

      if (isCurrentlyOpen) {
        targetNode.classList.remove('open');
      } else {
        targetNode.classList.add('open');
      }
    }

    function filterMobileTopics() {
      const term = document.getElementById('mobile-topic-search').value.toLowerCase().trim();
      const cards = document.querySelectorAll('.mobile-topic-card');
      let visible = 0;

      cards.forEach(c => {
        const text = c.innerText.toLowerCase();
        const show = text.includes(term);
        c.style.display = show ? 'flex' : 'none';

        if (show) {
          visible++;
          if (term.length > 0) {
            let parentNode = c.closest('.folder-node-wrapper');
            while (parentNode) {
              parentNode.classList.add('open');
              parentNode = parentNode.parentElement.closest('.folder-node-wrapper');
            }
          }
        }
      });

      const countTag = document.getElementById('topic-count-tag');
      if (countTag) countTag.innerText = `${visible} Topics`;
    }

    function launchStudySession(selectedTopic, sheetId, qCount = 0) {
      topic = selectedTopic;
      const targetSheetId = (sheetId && sheetId !== 'undefined') ? sheetId : (currentSelectedSubject ? currentSelectedSubject.id : '');

      switchScreen('study-interface-wrapper');
      document.getElementById('header-topic').innerText = selectedTopic;

      const cacheKey = `studyHub_cached_deck_${targetSheetId}_${selectedTopic}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        initialQuestions = JSON.parse(cached);
      } else {
        initialQuestions = new Array(Number(qCount) || 0).fill(null);
      }

      renderSetupScreen();

      fetch(API_URL + "?action=getQuestions&topic=" + encodeURIComponent(selectedTopic) + "&sheetId=" + encodeURIComponent(targetSheetId))
        .then(response => response.json())
        .then(questionsData => {
          try { localStorage.setItem(cacheKey, JSON.stringify(questionsData)); } catch(e){}
          initialQuestions = questionsData;

          if (!sessionActive && !isFinishScreen) {
            const metaBadge = document.getElementById('setup-meta-badge');
            if (metaBadge) {
              const count = questionsData.length;
              const mins = Math.ceil(count / TIME_FRACTION);
              metaBadge.innerHTML = `<i class="fas fa-clock"></i> ~${mins} mins (${count} Qs)`;
            }

            const heroBtn = document.getElementById('hero-launch-btn');
            if (heroBtn) {
              heroBtn.style.opacity = '1';
              heroBtn.style.cursor = 'pointer';
              heroBtn.innerHTML = `<span>Begin Session</span> <i class="fas fa-play"></i>`;
            }
          }
        })
        .catch(err => {
          if (!cached) {
            showToast("Connecting error: " + err.message, "exclamation-circle", "var(--danger)");
          }
        });
    }

    function returnToHome() {
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);
      sessionActive = false;
      switchScreen('mobile-home-screen');
      document.getElementById('mobile-dock-row').style.display = 'none';
      document.getElementById('exam-dock-row').style.display = 'none';
      fetchTopicsListForCurrentSubject();
    }

    // =========================================================
    // ⚙️ SETUP & STUDY ENGINE CONTROLLER
    // =========================================================
    function renderSetupScreen() {
      const container = document.getElementById('study-container');
      document.getElementById('session-stats-group').style.display = 'none';
      document.getElementById('mobile-dock-row').style.display = 'none';
      document.getElementById('exam-dock-row').style.display = 'none';
      document.getElementById('study-progress-fill').style.width = '0%';
      document.getElementById('star-card-btn').style.display = 'flex';
      document.getElementById('exam-submit-header-btn').style.display = 'none';

      const qCount = initialQuestions ? initialQuestions.length : 0;
      const mins = Math.ceil(qCount / TIME_FRACTION);
      const isReady = initialQuestions && initialQuestions.length > 0 && initialQuestions[0] !== null;

      container.innerHTML = `
        <div class="setup-sheet-shell">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; font-weight:800; color:var(--current-primary); text-transform:uppercase;"><i class="fas fa-sliders-h"></i> Session Setup</span>
            <span id="setup-meta-badge" style="font-size:12px; color:var(--text-sub); font-weight:600;"><i class="fas fa-clock"></i> ~${mins} mins (${qCount} Qs)</span>
          </div>

          <div class="mode-select-grid">
            <div class="mode-app-card ${studyModeType === 'quiz' ? 'active' : ''}" id="mode-quiz" onclick="selectMode('quiz')">
              <div class="mode-icon-circle"><i class="fas fa-list-ul"></i></div>
              <div style="font-size:13.5px; font-weight:800;">Quiz Mode</div>
              <div style="font-size:10.5px; color:var(--text-sub);">Instant feedback & lifelines</div>
            </div>

            <div class="mode-app-card ${studyModeType === 'exam' ? 'active' : ''}" id="mode-exam" onclick="selectMode('exam')">
              <div class="mode-icon-circle"><i class="fas fa-file-signature"></i></div>
              <div style="font-size:13.5px; font-weight:800;">Mock Exam</div>
              <div style="font-size:10.5px; color:var(--text-sub);">-0.25 negative marking</div>
            </div>

            <div class="mode-app-card ${studyModeType === 'flashcard' ? 'active' : ''}" id="mode-flashcard" onclick="selectMode('flashcard')">
              <div class="mode-icon-circle"><i class="fas fa-clone"></i></div>
              <div style="font-size:13.5px; font-weight:800;">Flashcard</div>
              <div style="font-size:10.5px; color:var(--text-sub);">Spaced recall ratings</div>
            </div>

            <div class="mode-app-card ${studyModeType === 'read' ? 'active' : ''}" id="mode-read" onclick="selectMode('read')">
              <div class="mode-icon-circle"><i class="fas fa-book-reader"></i></div>
              <div style="font-size:13.5px; font-weight:800;">Read Mode</div>
              <div style="font-size:10.5px; color:var(--text-sub);">Pre-solved quick revision</div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <div class="toggle-row-setting">
              <span style="font-size:12.5px; font-weight:700;"><i class="fas fa-random" style="color:var(--current-primary);"></i> Shuffle Order</span>
              <div class="segmented-pills">
                <span class="seg-pill-btn ${isShuffleEnabled ? 'active' : ''}" onclick="toggleSetting('shuffle', true)">ON</span>
                <span class="seg-pill-btn ${!isShuffleEnabled ? 'active' : ''}" onclick="toggleSetting('shuffle', false)">OFF</span>
              </div>
            </div>

            <div class="toggle-row-setting">
              <span style="font-size:12.5px; font-weight:700;"><i class="far fa-lightbulb" style="color:var(--warning);"></i> Solution Insights</span>
              <div class="segmented-pills">
                <span class="seg-pill-btn ${isInsightEnabled ? 'active' : ''}" onclick="toggleSetting('insight', true)">ON</span>
                <span class="seg-pill-btn ${!isInsightEnabled ? 'active' : ''}" onclick="toggleSetting('insight', false)">OFF</span>
              </div>
            </div>

            <div class="toggle-row-setting">
              <span style="font-size:12.5px; font-weight:700;"><i class="fas fa-layer-group" style="color:#a855f7;"></i> Batch Chunk</span>
              <div class="segmented-pills">
                <span class="seg-pill-btn ${selectedBatchSize === '10' ? 'active' : ''}" onclick="selectBatchSize('10')">10</span>
                <span class="seg-pill-btn ${selectedBatchSize === '20' ? 'active' : ''}" onclick="selectBatchSize('20')">20</span>
                <span class="seg-pill-btn ${selectedBatchSize === 'ALL' ? 'active' : ''}" onclick="selectBatchSize('ALL')">ALL</span>
              </div>
            </div>

            <div class="toggle-row-setting">
              <span style="font-size:12.5px; font-weight:700;"><i class="fas fa-palette" style="color:var(--success);"></i> Theme</span>
              <div class="theme-bubbles-row">
                <div class="theme-bubble ${currentThemeIdx === 0 ? 'active' : ''}" style="background:#38bdf8;" onclick="changeTheme(0)" title="Default"></div>
                <div class="theme-bubble ${currentThemeIdx === 1 ? 'active' : ''}" style="background:#39ff14;" onclick="changeTheme(1)" title="Hacker"></div>
                <div class="theme-bubble ${currentThemeIdx === 2 ? 'active' : ''}" style="background:#ff5722;" onclick="changeTheme(2)" title="Sunset"></div>
                <div class="theme-bubble ${currentThemeIdx === 3 ? 'active' : ''}" style="background:#f1f5f9;" onclick="changeTheme(3)" title="Paper"></div>
                <div class="theme-bubble ${currentThemeIdx === 4 ? 'active' : ''}" style="background:#fdf6e3;" onclick="changeTheme(4)" title="Academic"></div>
              </div>
            </div>
          </div>

          <button class="btn-launch-hero" id="hero-launch-btn" onclick="startSession()" style="${!isReady ? 'opacity: 0.75; cursor: wait;' : ''}">
            <span>${isReady ? 'Begin Session' : 'Loading Questions...'}</span>
            <i class="fas ${isReady ? 'fa-play' : 'fa-circle-notch fa-spin'}"></i>
          </button>
        </div>
      `;
    }

    function selectMode(m) { studyModeType = m; renderSetupScreen(); }
    function toggleSetting(s, v) { if (s === 'shuffle') isShuffleEnabled = v; if (s === 'insight') isInsightEnabled = v; renderSetupScreen(); }
    function selectBatchSize(v) { selectedBatchSize = v; renderSetupScreen(); }
    function changeTheme(idx) {
      currentThemeIdx = idx;
      document.body.className = idx > 0 ? 'theme-' + THEMES[idx] : '';

      const themeColors = ['#090d16', '#020802', '#120505', '#f1f5f9', '#fdf6e3'];
      document.getElementById('meta-theme-color').content = themeColors[idx];

      if (!sessionActive && !isFinishScreen) renderSetupScreen();
    }

    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function startSession() {
      if (!initialQuestions || initialQuestions.length === 0 || initialQuestions[0] === null) {
        showToast("Questions load ho rahe hain, bas 1 second...", "circle-notch fa-spin", "var(--warning)");
        return;
      }

      if (studyModeType === 'exam') {
        previousThemeIdx = currentThemeIdx;
        changeTheme(3);
        document.getElementById('exam-agree-checkbox').checked = false;
        switchScreen('exam-instructions-screen');
        return;
      }
      
      beginExamActual();
    }

    function cancelExamInstructions() {
      changeTheme(previousThemeIdx);
      switchScreen('study-interface-wrapper');
      renderSetupScreen();
    }

    function checkExamAgreementAndStart() {
      if (!document.getElementById('exam-agree-checkbox').checked) {
        showToast("You must agree to the instructions to proceed.", "exclamation-circle", "var(--danger)");
        return;
      }
      switchScreen('study-interface-wrapper');
      beginExamActual();
    }

    function beginExamActual() {
      unlockAudioContext();

      globalQuestions = JSON.parse(JSON.stringify(initialQuestions));

      globalQuestions.forEach((q, idx) => {
        q._id = Math.random().toString(36).substr(2, 9);
        q.globalIndex = idx;
        q.correctIndex = Number(q.correctIndex);
      });

      if (isShuffleEnabled) {
        globalQuestions = shuffleArray(globalQuestions);
        globalQuestions.forEach(q => {
          let opts = q.options.map((text, idx) => ({ text, isCorrect: idx == q.correctIndex }));
          opts = shuffleArray(opts);
          q.options = opts.map(o => o.text);
          q.correctIndex = opts.findIndex(o => o.isCorrect);
        });
      }

      batchSize = (selectedBatchSize === 'ALL' || studyModeType === 'exam') ? globalQuestions.length : parseInt(selectedBatchSize, 10);
      currentBatchIndex = 0;
      userAnswers = {};
      localLocks = {};

      examAnswers = {};
      examQuestionStates = {};
      isExamSubmitted = false;
      isExamReview = false;
      cheatWarnings = 0;

      awaitingAcknowledgment = false;
      totalSessionElapsed = 0;
      countdownSeconds = Math.ceil((globalQuestions.length / TIME_FRACTION) * 60);
      sessionActive = true;
      isFinishScreen = false;
      currentStreak = 0;

      document.getElementById('session-stats-group').style.display = 'flex';

      const accPill = document.getElementById('accuracy-timer-pill');
      const examPill = document.getElementById('exam-stats-pill');
      const masterTimerPill = document.getElementById('master-timer-pill');
      const lifeBtn = document.getElementById('dock-lifeline-btn');
      const streakPill = document.getElementById('streak-pill');

      const genDock = document.getElementById('mobile-dock-row');
      const examDock = document.getElementById('exam-dock-row');

      if (studyModeType === 'read') {
        accPill.style.display = 'none'; examPill.style.display = 'none'; masterTimerPill.style.display = 'none';
        lifeBtn.style.display = 'none'; streakPill.style.display = 'none';
        genDock.style.display = 'flex'; examDock.style.display = 'none';
      } else if (studyModeType === 'exam') {
        accPill.style.display = 'none'; examPill.style.display = 'inline-flex'; masterTimerPill.style.display = 'inline-flex';
        lifeBtn.style.display = 'none'; streakPill.style.display = 'none';
        genDock.style.display = 'none'; examDock.style.display = 'flex';
        document.getElementById('star-card-btn').style.display = 'none';
        document.getElementById('exam-submit-header-btn').style.display = 'inline-block';
      } else {
        accPill.style.display = 'inline-flex'; examPill.style.display = 'none'; masterTimerPill.style.display = 'inline-flex';
        lifeBtn.style.display = (studyModeType === 'quiz') ? 'flex' : 'none';
        genDock.style.display = 'flex'; examDock.style.display = 'none';
      }

      startMasterTimer();
      loadBatch();
    }

    function startMasterTimer() {
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);
      if (studyModeType === 'read') return;

      sessionTimerInterval = setInterval(() => {
        totalSessionElapsed++;
        if (countdownSeconds > 0) {
          countdownSeconds--;
          let m = Math.floor(countdownSeconds / 60); let s = countdownSeconds % 60;
          document.getElementById('master-timer').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        } else {
          document.getElementById('master-timer').innerText = "00:00";
          if (studyModeType === 'exam' && !isExamSubmitted) executeSubmitExam();
        }
      }, 1000);
    }

    function loadBatch() {
      isReviewMode = false;
      isFinishScreen = false;
      mistakesQueue = [];
      lifelinesRemaining = LIFELINE_TOTAL;
      awaitingAcknowledgment = false;

      let start = currentBatchIndex * batchSize;
      let end = Math.min(start + batchSize, globalQuestions.length);
      questions = JSON.parse(JSON.stringify(globalQuestions.slice(start, end)));
      questions.forEach(q => { q._id = Math.random().toString(36).substr(2, 9); });

      currentIndex = 0;
      currentPaletteFilter = 'all';
      showCard();
    }

    function getFilteredIndices() {
      let indices = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const globalId = globalQuestions[q.globalIndex]._id;
        const isStarred = starredSet.has(q.globalIndex);

        if (studyModeType === 'exam' && !isExamSubmitted) {
          const isAttempted = examAnswers[globalId] !== undefined;
          if (currentPaletteFilter === 'attempted' && !isAttempted) continue;
          if (currentPaletteFilter === 'unattempted' && isAttempted) continue;
          if (currentPaletteFilter === 'star' && !isStarred) continue;
        } else {
          const isCorrect = userAnswers[globalId] === 'correct';
          const isWrong = userAnswers[globalId] === 'wrong';
          if (currentPaletteFilter === 'wrong' && !isWrong) continue;
          if (currentPaletteFilter === 'star' && !isStarred) continue;
        }
        indices.push(i);
      }
      return indices;
    }

    function showCard() {
      isCardFlipped = false;

      if (studyModeType === 'exam' && !isExamSubmitted) {
        const q = questions[currentIndex];
        const globalId = globalQuestions[q.globalIndex]._id;
        if (!examQuestionStates[globalId]) {
          examQuestionStates[globalId] = 'visited_unanswered';
        }
      }

      updateLiveTelemetry();
      populatePaletteGrid();

      if (studyModeType === 'quiz') renderQuizCard(currentIndex);
      else if (studyModeType === 'flashcard') renderFlashCard(currentIndex);
      else if (studyModeType === 'read') renderReadCard(currentIndex);
      else if (studyModeType === 'exam') renderExamCard(currentIndex);
    }

    function renderReadCard(idx) {
      const q = questions[idx];
      const container = document.getElementById('study-container');
      let optionsHtml = '';

      q.options.forEach((opt, i) => {
        const label = String.fromCharCode(65 + i);
        let stateClass = i === q.correctIndex ? 'correct' : '';
        optionsHtml += `
          <div class="touch-option-card ${stateClass}" style="pointer-events: none; animation: fadeSlideIn 0.3s ease forwards; animation-delay: ${i * 0.05}s; opacity: 0;">
            <div style="display:flex; align-items:center;">
              <span class="choice-badge-circle">${label}</span>
              <span style="font-size:14px;">${opt}</span>
            </div>
            ${stateClass === 'correct' ? '<i class="fas fa-check-circle" style="color:var(--success);"></i>' : ''}
          </div>`;
      });

      const insightHtml = (isInsightEnabled && q.extraInfo) ? `<div class="solution-insight-card"><b style="color:var(--current-primary);"><i class="far fa-lightbulb"></i> Insight:</b><br>${q.extraInfo}</div>` : '';

      container.innerHTML = `
        <div style="font-size:11px; font-weight:800; color:var(--success); margin-bottom:6px;"><i class="fas fa-book-open"></i> READ MODE (Q. ${q.globalIndex + 1} OF ${globalQuestions.length})</div>
        <div class="question-headline">${q.question}</div>
        <div class="options-stack">${optionsHtml}</div>
        ${insightHtml}
      `;
      updateDockButtons();
    }

    function renderFlashCard(idx) {
      const q = questions[idx];
      const container = document.getElementById('study-container');
      const insightHtml = (isInsightEnabled && q.extraInfo) ? `<div style="font-size:12.5px; opacity: 0.85; margin-bottom:14px; line-height:1.5;">${q.extraInfo}</div>` : '';

      container.innerHTML = `
        <div style="font-size:11px; font-weight:800; color:#a855f7; margin-bottom:6px;"><i class="fas fa-clone"></i> FLASHCARD (Q. ${q.globalIndex + 1} OF ${globalQuestions.length})</div>
        <div id="fc-front" class="flashcard-mobile-panel" onclick="flipFlashcard(true)">
          <div class="question-headline" style="text-align:center; margin:0;">${q.question}</div>
          <div style="margin-top:24px; font-size:11px; font-weight:800; color:var(--text-sub); letter-spacing:0.8px;"><i class="fas fa-hand-pointer"></i> TAP TO FLIP</div>
        </div>
        
        <div id="fc-back" class="flashcard-mobile-panel" style="display:none; text-align:left; align-items:flex-start;">
          ${insightHtml}
          <div style="font-size:11px; font-weight:800; color:var(--success); text-transform:uppercase;">Correct Answer:</div>
          <div style="font-size:16px; font-weight:800; color:var(--success); margin-bottom:20px;">${q.options[q.correctIndex]}</div>
          <div style="display:flex; gap:8px; width:100%; margin-top:auto;">
            <button class="btn-dock-secondary" style="background:rgba(244,63,94,0.15); color:var(--danger); border-color:rgba(244,63,94,0.3);" onclick="scoreFlashcard('hard')">Hard</button>
            <button class="btn-dock-secondary" style="background:rgba(251,191,36,0.15); color:var(--warning); border-color:rgba(251,191,36,0.3);" onclick="scoreFlashcard('good')">Good</button>
            <button class="btn-dock-secondary" style="background:rgba(16,185,129,0.15); color:var(--success); border-color:rgba(16,185,129,0.3);" onclick="scoreFlashcard('easy')">Easy</button>
          </div>
        </div>
      `;
      updateDockButtons();
    }

    function renderQuizCard(idx) {
      const q = questions[idx];
      const container = document.getElementById('study-container');
      const localAns = localLocks[q._id];
      const isAnswered = localAns !== undefined;
      let optionsHtml = '';

      q.options.forEach((opt, i) => {
        const label = String.fromCharCode(65 + i);
        let stateClass = '';
        if (isAnswered) {
          if (i == q.correctIndex) stateClass = 'correct';
          else if (i == localAns) stateClass = 'wrong';
        }
        optionsHtml += `
          <div class="touch-option-card ${stateClass}" style="animation: fadeSlideIn 0.3s ease forwards; animation-delay: ${i * 0.05}s; opacity: 0;" onclick="handleQuizAnswer(${i}, ${q.correctIndex}, this)">
            <div style="display:flex; align-items:center;">
              <span class="choice-badge-circle">${label}</span>
              <span style="font-size:14px;">${opt}</span>
            </div>
            ${stateClass === 'correct' ? '<i class="fas fa-check-circle" style="color:var(--success);"></i>' : (stateClass === 'wrong' ? '<i class="fas fa-times-circle" style="color:var(--danger);"></i>' : '')}
          </div>`;
      });

      const insightHtml = (isInsightEnabled && q.extraInfo) ? `<div id="extra-box" class="solution-insight-card ${isAnswered && localAns != q.correctIndex ? 'wrong-accent' : ''}" style="${isAnswered ? 'display:block;' : 'display:none;'}"><b style="color:var(--current-primary);"><i class="far fa-lightbulb"></i> Insight:</b><br>${q.extraInfo}</div>` : '';

      container.innerHTML = `
        <div style="font-size:11px; font-weight:800; color:var(--current-primary); margin-bottom:6px;"><i class="fas fa-list-ul"></i> QUIZ (Q. ${q.globalIndex + 1} OF ${globalQuestions.length})</div>
        <div class="question-headline">${q.question}</div>
        <div class="options-stack">${optionsHtml}</div>
        ${insightHtml}
      `;
      if (isAnswered) document.querySelectorAll('.touch-option-card').forEach(o => o.style.pointerEvents = 'none');
      updateDockButtons();
    }

    function renderExamCard(idx) {
      const q = questions[idx];
      const container = document.getElementById('study-container');
      const globalId = globalQuestions[q.globalIndex]._id;
      const selectedChoice = examAnswers[globalId];
      let optionsHtml = '';

      if (!isExamReview) {
        q.options.forEach((opt, i) => {
          const label = String.fromCharCode(65 + i);
          const isSelected = selectedChoice === i;
          optionsHtml += `
            <div class="touch-option-card ${isSelected ? 'exam-selected' : ''}" style="opacity: 1;" onclick="handleExamAnswerSelect(${i})">
              <div style="display:flex; align-items:center;">
                <span class="choice-badge-circle">${label}</span>
                <span style="font-size:14px;">${opt}</span>
              </div>
              <i class="${isSelected ? 'fas fa-dot-circle' : 'far fa-circle'}" style="color: ${isSelected ? 'var(--current-primary)' : 'var(--text-muted)'};"></i>
            </div>`;
        });

        container.innerHTML = `
          <div style="font-size:11px; font-weight:800; color:var(--danger); margin-bottom:6px;"><i class="fas fa-file-signature"></i> MOCK EXAM (Q. ${q.globalIndex + 1} OF ${globalQuestions.length}) • <span style="color:#94a3b8;">[+1.00 / -0.25]</span></div>
          <div class="question-headline" style="animation: none;">${q.question}</div>
          <div class="options-stack">${optionsHtml}</div>
        `;
      } else {
        const isCorrect = selectedChoice == q.correctIndex;
        const isUnattempted = selectedChoice === undefined;

        q.options.forEach((opt, i) => {
          const label = String.fromCharCode(65 + i);
          let stateClass = '';
          if (i == q.correctIndex) stateClass = 'correct';
          else if (i === selectedChoice) stateClass = 'wrong';
          optionsHtml += `
            <div class="touch-option-card ${stateClass}" style="pointer-events: none; opacity: 1;">
              <div style="display:flex; align-items:center;">
                <span class="choice-badge-circle">${label}</span>
                <span style="font-size:14px;">${opt}</span>
              </div>
            </div>`;
        });

        let verdictTag = isCorrect ? `<i class="fas fa-check-circle" style="color:var(--success);"></i> Correct (+1.00)` : (isUnattempted ? `<i class="fas fa-minus-circle" style="color:var(--text-muted);"></i> Skipped (0.00)` : `<i class="fas fa-times-circle" style="color:var(--danger);"></i> Incorrect (-0.25)`);

        let borderColor = isCorrect ? 'var(--success)' : (isUnattempted ? 'var(--text-muted)' : 'var(--danger)');
        let bgColor = isCorrect ? 'rgba(16, 185, 129, 0.05)' : (isUnattempted ? 'rgba(148, 163, 184, 0.05)' : 'rgba(244, 63, 94, 0.05)');

        container.innerHTML = `
          <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 14px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border-left: 5px solid ${borderColor}; box-shadow: var(--shadow-soft);">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span style="font-size:10.5px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Question ${q.globalIndex + 1} of ${globalQuestions.length}</span>
              <span style="font-size:15px; font-weight:800; color:var(--text-main);">${verdictTag}</span>
            </div>
            <button class="btn-dock-secondary" style="padding:8px 14px; font-size:12px; margin: 0; flex: 0 1 auto; width: auto;" onclick="finishSessionScreen()"><i class="fas fa-poll"></i> Results</button>
          </div>
          <div class="question-headline" style="animation: none;">${q.question}</div>
          <div class="options-stack">${optionsHtml}</div>
          ${q.extraInfo ? `<div class="solution-insight-card ${!isCorrect && !isUnattempted ? 'wrong-accent' : ''}" style="animation: none;"><b style="color:var(--current-primary);"><i class="far fa-lightbulb"></i> Insight:</b><br>${q.extraInfo}</div>` : ''}
        `;
      }
    }

    function handleQuizAnswer(selectedIdx, correctIdx, element) {
      if (localLocks[questions[currentIndex]._id] !== undefined) return;
      localLocks[questions[currentIndex]._id] = selectedIdx;
      awaitingAcknowledgment = false;

      document.querySelectorAll('.touch-option-card').forEach(o => o.style.pointerEvents = 'none');
      const extraBox = document.getElementById('extra-box');
      const q = questions[currentIndex];
      const globalId = globalQuestions[q.globalIndex]._id;

      if (selectedIdx == correctIdx) {
        if (userAnswers[globalId] === undefined) userAnswers[globalId] = 'correct';
        element.classList.add('correct');
        currentStreak++;
        playSfx('correct');

        if (currentStreak === 3) showToast("3 in a row! You're on fire! 🔥", "fire", "var(--streak-fire)");
        if (currentStreak === 5) showToast("5 in a row! Unstoppable! 🚀", "rocket", "var(--purple)");
      } else {
        if (userAnswers[globalId] === undefined) userAnswers[globalId] = 'wrong';
        element.classList.add('wrong');
        const allOpts = document.querySelectorAll('.touch-option-card');
        if (allOpts[correctIdx]) allOpts[correctIdx].classList.add('correct');
        if (extraBox) extraBox.classList.add('wrong-accent');
        currentStreak = 0;
        playSfx('wrong');

        handleMistake(q);

        if (isInsightEnabled && q.extraInfo) {
          awaitingAcknowledgment = true;
        }
      }

      if (isInsightEnabled && extraBox) extraBox.style.display = 'block';
      updateLiveTelemetry();
      populatePaletteGrid();
      updateDockButtons();
    }

    // EXAM MODE DOCK CONTROLS
    function handleExamAnswerSelect(selectedIdx) {
      if (isExamSubmitted) return;
      const q = questions[currentIndex];
      const globalId = globalQuestions[q.globalIndex]._id;

      if (examAnswers[globalId] === selectedIdx) delete examAnswers[globalId];
      else examAnswers[globalId] = selectedIdx;

      renderExamCard(currentIndex);
    }

    function examSaveNext() {
      const q = questions[currentIndex];
      const globalId = globalQuestions[q.globalIndex]._id;
      const hasAnswer = examAnswers[globalId] !== undefined;

      if (hasAnswer) examQuestionStates[globalId] = 'answered';
      else examQuestionStates[globalId] = 'visited_unanswered';

      goToNextCardExamFlow();
    }

    function examMarkReviewNext() {
      const q = questions[currentIndex];
      const globalId = globalQuestions[q.globalIndex]._id;
      const hasAnswer = examAnswers[globalId] !== undefined;

      if (hasAnswer) examQuestionStates[globalId] = 'answered_marked_review';
      else examQuestionStates[globalId] = 'marked_review';

      goToNextCardExamFlow();
    }

    function examClearResponse() {
      const q = questions[currentIndex];
      const globalId = globalQuestions[q.globalIndex]._id;
      delete examAnswers[globalId];
      examQuestionStates[globalId] = 'visited_unanswered';

      renderExamCard(currentIndex);
      populatePaletteGrid();
    }

    function goToNextCardExamFlow() {
      let indices = getFilteredIndices();
      let nextIndex = indices.find(i => i > currentIndex);
      if (nextIndex !== undefined) {
        currentIndex = nextIndex;
        showCard();
      } else {
        togglePaletteDrawer();
        showToast("End of questions. Please review the palette.", "info-circle", "var(--current-primary)");
        updateLiveTelemetry();
        populatePaletteGrid();
      }
    }

    function handleMistake(q) {
      // गलत सवाल को mistakesQueue में डाल दें (अगर पहले से नहीं है)
      if (!mistakesQueue.some(m => m.globalIndex === q.globalIndex)) {
        mistakesQueue.push(q);
      }
      
      // बीच में सवाल घुसाने (Looping) का लॉजिक सिर्फ Flashcard मोड में रहेगा
      if (studyModeType === 'flashcard') {
        const cloned = JSON.parse(JSON.stringify(q));
        cloned._id = Math.random().toString(36).substr(2, 9);
        questions.splice(currentIndex + 4, 0, cloned);
      }
    }

    function startMistakesReview() {
      awaitingAcknowledgment = false;
      
      // मौजूदा सवालों की लिस्ट को सिर्फ गलत सवालों (Mistakes) से बदल दें
      questions = JSON.parse(JSON.stringify(mistakesQueue));
      
      // नई ID दें ताकि पुराने लॉक हटाए जा सकें
      questions.forEach(q => { q._id = Math.random().toString(36).substr(2, 9); });
      
      mistakesQueue = []; // अगले राउंड के लिए लिस्ट खाली करें
      currentIndex = 0;
      
      showToast("Reviewing Mistakes Round", "redo-alt", "var(--warning)");
      showCard();
    }

    // Spaced Repetition Logic for Flashcards
    function scoreFlashcard(level) {
      const q = questions[currentIndex];
      const globalId = globalQuestions[q.globalIndex]._id;

      if (level === 'hard') {
        if (userAnswers[globalId] === undefined) userAnswers[globalId] = 'wrong';
        const cloned = JSON.parse(JSON.stringify(q));
        cloned._id = Math.random().toString(36).substr(2, 9);
        questions.splice(currentIndex + 2, 0, cloned);
        showToast("Added back to queue for quick review", "sync", "var(--danger)");
      } else if (level === 'good') {
        if (userAnswers[globalId] === undefined) userAnswers[globalId] = 'correct';
        playSfx('correct');
        const cloned = JSON.parse(JSON.stringify(q));
        cloned._id = Math.random().toString(36).substr(2, 9);
        questions.splice(currentIndex + 5, 0, cloned);
        showToast("We'll ask this again later", "layer-group", "var(--warning)");
      } else {
        if (userAnswers[globalId] === undefined) userAnswers[globalId] = 'correct';
        playSfx('correct');
        showToast("Mastered! Removed from current cycle", "check-circle", "var(--success)");
      }
      goToNextCard();
    }

    function flipFlashcard(showBack) {
      isCardFlipped = showBack;
      document.getElementById('fc-front').style.display = showBack ? 'none' : 'flex';
      document.getElementById('fc-back').style.display = showBack ? 'flex' : 'none';
    }

    function useLifeline() {
      const localId = questions[currentIndex]._id;
      // Check karein ki lifeline bachi hai ya nahi, ya isi sawal par pehle use toh nahi hui
      if (studyModeType !== 'quiz' || lifelinesRemaining <= 0 || localLocks[localId] !== undefined || questions[currentIndex].lifelineUsed) return;
      
      questions[currentIndex].lifelineUsed = true; // Is sawal ke liye lifeline lock kar dein
      const q = questions[currentIndex];
      
      let wrongIndices = [];
      q.options.forEach((_, i) => { if (i != q.correctIndex) wrongIndices.push(i); });
      wrongIndices = shuffleArray(wrongIndices).slice(0, 2);
      
      const optionCards = document.querySelectorAll('.touch-option-card');
      wrongIndices.forEach(idx => { 
        if (optionCards[idx]) {
          optionCards[idx].style.animation = 'none'; // 🚀 Nayi line: CSS animation ko rok देगी
          optionCards[idx].style.opacity = '0.15'; // 2 galat options dhundhle (fade) ho jayenge
          optionCards[idx].style.pointerEvents = 'none'; // Unpar click hona band ho jayega
          optionCards[idx].style.transform = 'scale(0.95)';
          optionCards[idx].classList.add('eliminated');
        } 
      });
      
      lifelinesRemaining--;
      playSfx('magic');
      updateLiveTelemetry();
      updateDockButtons(); // Button ko dhundhla (disable) karne ke liye
    }

    function updateDockButtons() {
      if (studyModeType === 'exam' && !isExamReview) return;

      const lifeBtn = document.getElementById('dock-lifeline-btn');
      if (lifeBtn && studyModeType === 'quiz') {
        const localId = questions[currentIndex]._id;
        const isAnswered = localLocks[localId] !== undefined;
        const isUsedHere = questions[currentIndex].lifelineUsed === true;
        
        if (lifelinesRemaining <= 0 || isAnswered || isUsedHere) {
          lifeBtn.style.opacity = '0.35'; 
          lifeBtn.style.pointerEvents = 'none'; 
        } else {
          lifeBtn.style.opacity = '1';
          lifeBtn.style.pointerEvents = 'auto'; 
        }
      }

      const indices = getFilteredIndices();
      const hasPrev = indices.some(i => i < currentIndex);
      const hasNext = indices.some(i => i > currentIndex);

      const prevBtn = document.getElementById('dock-prev-btn');
      const nextBtn = document.getElementById('dock-next-btn');

      if (prevBtn) prevBtn.disabled = !hasPrev;

      if (awaitingAcknowledgment) {
        nextBtn.innerHTML = `I Understand <i class="fas fa-check"></i>`;
        nextBtn.style.background = 'var(--warning)';
        nextBtn.style.color = '#000';
        nextBtn.onclick = () => { awaitingAcknowledgment = false; goToNextCard(); };
        return;
      }

      nextBtn.style.color = '#fff';
      
      if (!hasNext) {
        if (studyModeType === 'read' || mistakesQueue.length === 0) {
          // जब सब सही हों या रीड मोड हो
          nextBtn.innerHTML = `Finish <i class="fas fa-flag-checkered"></i>`;
          nextBtn.style.background = 'var(--success)';
          nextBtn.onclick = finishSessionScreen;
        } else {
          // ✨ नया लॉजिक: अगर गलतियाँ बची हैं
          nextBtn.innerHTML = `Review Mistakes <i class="fas fa-redo"></i>`;
          nextBtn.style.background = 'var(--warning)';
          nextBtn.style.color = '#000';
          nextBtn.onclick = startMistakesReview;
        }
      } else {
        nextBtn.innerHTML = `Next <i class="fas fa-arrow-right"></i>`;
        nextBtn.style.background = 'var(--current-primary)';
        nextBtn.onclick = goToNextCard;
      }
    }

    function goToPrevCard() {
      awaitingAcknowledgment = false;
      const indices = getFilteredIndices();
      let prevIndices = indices.filter(i => i < currentIndex);
      if (prevIndices.length > 0) { currentIndex = prevIndices[prevIndices.length - 1]; showCard(); }
    }

    function goToNextCard() {
      awaitingAcknowledgment = false;
      let indices = getFilteredIndices();
      let nextIndex = indices.find(i => i > currentIndex);
      if (nextIndex !== undefined) {
        currentIndex = nextIndex;
        showCard();
      } else {
        finishSessionScreen();
      }
    }

    function updateLiveTelemetry() {
      const gIndex = questions[currentIndex].globalIndex;
      const starBtn = document.getElementById('star-card-btn');
      const isStarred = starredSet.has(gIndex);
      if (starBtn) {
        starBtn.classList.toggle('star-active', isStarred);
        starBtn.innerHTML = isStarred ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
      }

      const fillBar = document.getElementById('study-progress-fill');
      if (fillBar && questions.length > 0) {
        // globalQuestions की जगह questions.length इस्तेमाल करें
        const percent = Math.round(((currentIndex + 1) / questions.length) * 100);
        fillBar.style.width = percent + '%';
      }

      if (studyModeType === 'read') return;

      if (studyModeType === 'exam' && !isExamSubmitted) {
        let savedCount = 0;
        for (let key in examQuestionStates) {
          if (examQuestionStates[key] === 'answered' || examQuestionStates[key] === 'answered_marked_review') savedCount++;
        }
        document.getElementById('stat-exam-attempted').innerText = savedCount;
        document.getElementById('stat-exam-total').innerText = globalQuestions.length;
        return;
      }

      let correct = 0; let wrong = 0;
      globalQuestions.forEach(q => {
        if (userAnswers[q._id] === 'correct') correct++;
        if (userAnswers[q._id] === 'wrong') wrong++;
      });
      document.getElementById('stat-correct').innerText = correct;
      document.getElementById('stat-wrong').innerText = wrong;

      const lifeCount = document.getElementById('lifeline-count');
      if (lifeCount) lifeCount.innerText = lifelinesRemaining;

      const streakPill = document.getElementById('streak-pill');
      if (currentStreak >= 3) {
        streakPill.style.display = 'inline-flex';
        document.getElementById('streak-count').innerText = currentStreak;
        streakPill.style.animation = 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      } else {
        streakPill.style.display = 'none';
      }
    }

    function toggleCurrentStar() {
      const gIndex = questions[currentIndex].globalIndex;
      if (starredSet.has(gIndex)) starredSet.delete(gIndex);
      else starredSet.add(gIndex);
      updateLiveTelemetry();
      populatePaletteGrid();
    }

    function togglePaletteDrawer() {
      document.getElementById('paletteDrawer').classList.toggle('open');
    }

    function populatePaletteGrid() {
      const grid = document.getElementById('paletteGrid');
      if (!grid) return;
      grid.innerHTML = '';
      const indices = getFilteredIndices();
      const seenGlobals = new Set();

      indices.forEach(i => {
        const q = questions[i];
        if (seenGlobals.has(q.globalIndex)) return;
        seenGlobals.add(q.globalIndex);

        const globalId = globalQuestions[q.globalIndex]._id;
        const node = document.createElement('div');
        node.className = 'grid-node';
        if (q.globalIndex === questions[currentIndex].globalIndex) node.classList.add('active-node');

        if (studyModeType === 'exam' && !isExamSubmitted) {
          const state = examQuestionStates[globalId];
          if (state === 'answered') node.classList.add('exam-node-answered');
          else if (state === 'visited_unanswered') node.classList.add('exam-node-unanswered');
          else if (state === 'marked_review') node.classList.add('exam-node-review');
          else if (state === 'answered_marked_review') node.classList.add('exam-node-answered-review');
          else node.classList.add('exam-node-unvisited');
        } else {
          if (userAnswers[globalId] === 'correct') node.classList.add('node-correct');
          else if (userAnswers[globalId] === 'wrong') node.classList.add('node-wrong');
        }

        node.innerText = q.globalIndex + 1;
        if (starredSet.has(q.globalIndex) && studyModeType !== 'exam') {
          const s = document.createElement('i');
          s.className = 'fas fa-star star-indicator';
          node.appendChild(s);
        }

        node.onclick = () => {
          let target = indices.find(idx => questions[idx].globalIndex === q.globalIndex);
          if (target !== undefined) { currentIndex = target; togglePaletteDrawer(); showCard(); }
        };
        grid.appendChild(node);
      });
    }

    function promptSubmitExam() {
      let savedCount = 0;
      for (let key in examQuestionStates) {
        if (examQuestionStates[key] === 'answered' || examQuestionStates[key] === 'answered_marked_review') savedCount++;
      }

      document.getElementById('exam-submit-stats-text').innerHTML = `Attempted & Saved: <b>${savedCount}</b> / ${globalQuestions.length}<br>Unattempted: <b>${globalQuestions.length - savedCount}</b> Qs<br><span style="font-size:11px; color:var(--text-muted);">Marking: +1.00 Correct | -0.25 Wrong</span>`;
      document.getElementById('examSubmitOverlay').style.display = 'flex';
    }

    function cancelSubmitExam() { document.getElementById('examSubmitOverlay').style.display = 'none'; }

    function executeSubmitExam() {
      document.getElementById('examSubmitOverlay').style.display = 'none';
      isExamSubmitted = true;
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);

      mistakesQueue = [];

      globalQuestions.forEach(q => {
        const globalId = q._id;
        const state = examQuestionStates[globalId];
        const choice = examAnswers[globalId];

        const isEvaluable = (state === 'answered' || state === 'answered_marked_review');

        if (isEvaluable && choice !== undefined) {
          if (choice == q.correctIndex) userAnswers[globalId] = 'correct';
          else { userAnswers[globalId] = 'wrong'; mistakesQueue.push(q); }
        } else {
          userAnswers[globalId] = 'unattempted';
        }
      });

      finishSessionScreen();
    }

    // ==========================================
    // 📊 REDESIGNED PRO-LEVEL FINISH SCREEN 📊
    // ==========================================
    function finishSessionScreen() {
      isFinishScreen = true;
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);
      document.getElementById('mobile-dock-row').style.display = 'none';
      document.getElementById('exam-dock-row').style.display = 'none';
      document.getElementById('exam-submit-header-btn').style.display = 'none';

      const container = document.getElementById('study-container');
      let correct = 0; let wrong = 0;

      globalQuestions.forEach(q => {
        if (userAnswers[q._id] === 'correct') correct++;
        if (userAnswers[q._id] === 'wrong') wrong++;
      });

      const totalQs = globalQuestions.length;
      const totalAttempted = correct + wrong;
      const unattempted = totalQs - totalAttempted;
      const accuracy = totalAttempted > 0 ? Math.round((correct / totalAttempted) * 100) : 0;
      const mins = Math.floor(totalSessionElapsed / 60);
      const secs = totalSessionElapsed % 60;
      const timeStr = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

      const penaltyMarks = (wrong * 0.25).toFixed(2);
      const netMarks = (correct * 1.0 - penaltyMarks).toFixed(2);
      const avgTimeSecs = totalAttempted > 0 ? Math.round(totalSessionElapsed / totalQs) : 0;

      const correctPct = (correct / totalQs) * 100;
      const wrongPct = (wrong / totalQs) * 100;
      const skipPct = (unattempted / totalQs) * 100;

      let title = studyModeType === 'exam' ? 'Exam Analysis 📊' : 'Deck Completed! 🏆';
      let sub = studyModeType === 'exam' ? `Performance breakdown based on your final submission.` : `You've completed this study cycle.`;

      let actionButtonsHtml = '';
      if (studyModeType === 'exam') {
        actionButtonsHtml = `
          <button class="btn-dock-primary" style="background: linear-gradient(135deg, var(--current-primary), #2563eb); font-size: 15px; padding: 15px; box-shadow: 0 8px 20px rgba(56, 189, 248, 0.25);" onclick="inspectExamSolutions()">
            <i class="fas fa-search-plus"></i> Inspect Detailed Solutions
          </button>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button class="btn-dock-secondary" style="background: rgba(251, 191, 36, 0.1); color: var(--warning); border-color: rgba(251, 191, 36, 0.3); font-size: 13.5px;" onclick="startSession()">
              <i class="fas fa-redo-alt"></i> Re-take Exam
            </button>
            <button class="btn-dock-secondary" style="font-size: 13.5px;" onclick="returnToHome()">
              <i class="fas fa-home"></i> Home Dashboard
            </button>
          </div>
        `;
      } else {
        actionButtonsHtml = `
          <button class="btn-dock-primary" style="background: linear-gradient(135deg, var(--warning), #f59e0b); color: #000; font-size: 15px; padding: 15px; box-shadow: 0 8px 20px rgba(251, 191, 36, 0.25);" onclick="startSession()">
            <i class="fas fa-redo-alt"></i> Re-take Module
          </button>
          <button class="btn-dock-secondary" style="font-size: 14px; padding: 14px;" onclick="returnToHome()">
            <i class="fas fa-th-large"></i> Back to Dashboard
          </button>
        `;
      }

      let statsGridHtml = '';
      if (studyModeType === 'exam') {
        statsGridHtml = `
          <!-- HERO SCORE CARD -->
          <div style="background: linear-gradient(135deg, var(--bg-card), rgba(56, 189, 248, 0.05)); border: 1px solid var(--current-primary); border-radius: 18px; padding: 20px; margin-bottom: 16px; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -10px; right: -10px; opacity: 0.1; font-size: 80px;"><i class="fas fa-trophy"></i></div>
            <div style="font-size: 11px; color: var(--text-sub); text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Final Score</div>
            <div style="font-size: 42px; font-weight: 900; color: var(--current-primary); margin: 4px 0;">
                ${netMarks} <span style="font-size: 16px; color: var(--text-muted); font-weight: 700;">/ ${totalQs}</span>
            </div>
            <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--danger); font-weight: 700; background: rgba(244, 63, 94, 0.1); padding: 4px 10px; border-radius: 8px;">
                <i class="fas fa-arrow-down"></i> -${penaltyMarks} marks lost in penalty
            </div>
          </div>

          <!-- DISTRIBUTION VISUALIZER -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 16px; margin-bottom: 16px; text-align: left;">
             <div style="font-size: 11px; color: var(--text-sub); text-transform: uppercase; font-weight: 800; margin-bottom: 12px;"><i class="fas fa-chart-pie"></i> Attempt Distribution</div>
             <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; margin-bottom: 8px;">
                <span style="color: var(--success);"><i class="fas fa-check-circle"></i> Correct (${correct})</span>
                <span style="color: var(--danger);"><i class="fas fa-times-circle"></i> Wrong (${wrong})</span>
                <span style="color: var(--text-muted);"><i class="fas fa-minus-circle"></i> Skipped (${unattempted})</span>
             </div>
             <div style="display: flex; height: 10px; width: 100%; border-radius: 6px; overflow: hidden; background: rgba(128,128,128,0.1);">
                <div style="width: ${correctPct}%; background: var(--success); transition: width 1s ease-out;"></div>
                <div style="width: ${wrongPct}%; background: var(--danger); transition: width 1s ease-out;"></div>
                <div style="width: ${skipPct}%; background: var(--text-muted); transition: width 1s ease-out;"></div>
             </div>
          </div>

          <!-- DETAILED METRICS GRID -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
            <div class="mode-app-card" style="padding: 14px 10px;">
              <span style="font-size:10.5px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Accuracy Rate</span>
              <span style="font-size:22px; font-weight:800; color:var(--text-main); margin-top:4px;">${accuracy}%</span>
            </div>
            <div class="mode-app-card" style="padding: 14px 10px;">
              <span style="font-size:10.5px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Avg Time / Q</span>
              <span style="font-size:22px; font-weight:800; color:var(--text-main); margin-top:4px;">${avgTimeSecs}s</span>
            </div>
            <div class="mode-app-card" style="padding: 14px 10px; grid-column: span 2; display: flex; flex-direction: row; justify-content: space-between; align-items: center; background: rgba(128,128,128,0.05);">
              <span style="font-size:12px; font-weight:800; color:var(--text-muted);"><i class="fas fa-stopwatch"></i> TOTAL DURATION</span>
              <span style="font-size:16px; font-weight:800; color:var(--text-main);">${timeStr}</span>
            </div>
          </div>
        `;
      } else {
        statsGridHtml = `
          <div class="mode-select-grid" style="grid-template-columns: repeat(2, 1fr); gap:10px; margin-bottom: 16px;">
            <div class="mode-app-card" style="padding:16px;">
              <span style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Accuracy</span>
              <span style="font-size:26px; font-weight:900; color:var(--success); margin-top:4px;">${accuracy}%</span>
              <span style="font-size:11px; color:var(--text-sub); margin-top:2px;">${correct} of ${totalQs} Correct</span>
            </div>
            <div class="mode-app-card" style="padding:16px;">
              <span style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Time Spent</span>
              <span style="font-size:26px; font-weight:900; color:var(--text-main); margin-top:4px;">${timeStr}</span>
              <span style="font-size:11px; color:var(--text-sub); margin-top:2px;">Avg ${avgTimeSecs}s / Q</span>
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="setup-sheet-shell" style="text-align:center; padding:24px 16px;">
          <h2 style="font-size:22px; font-weight:800; margin-bottom:4px; color:var(--text-main);">${title}</h2>
          <p style="font-size:13px; font-weight:500; color:var(--text-sub); margin-bottom:20px;">${sub}</p>

          ${statsGridHtml}

          <div style="display:flex; flex-direction:column; gap:12px; margin-top: 10px;">
            ${actionButtonsHtml}
          </div>
        </div>
      `;

      requestAnimationFrame(() => {
        setTimeout(() => {
          if (accuracy >= 80 && studyModeType !== 'exam') {
            triggerConfetti();
          }
        }, 150);
      });
    }

    function inspectExamSolutions() {
      isExamReview = true;
      currentIndex = 0;
      isFinishScreen = false;
      document.getElementById('mobile-dock-row').style.display = 'flex';
      showCard();
    }

    function returnToSetup() {
      if (isFinishScreen || !sessionActive) returnToHome();
      else document.getElementById('exitConfirmOverlay').style.display = 'flex';
    }

    function cancelReturnToSetup() { document.getElementById('exitConfirmOverlay').style.display = 'none'; }

    function executeReturnToSetup() {
      document.getElementById('exitConfirmOverlay').style.display = 'none';
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);
      sessionActive = false;
      if (studyModeType === 'exam') changeTheme(previousThemeIdx);
      renderSetupScreen();
    }

    function triggerConfetti() {
      try {
        let box = document.getElementById('confetti-canvas-box');
        box.innerHTML = ''; box.style.display = 'block';
        const em = ['🏆', '✨', '🎉', '🔥', '💯'];
        for (let i = 0; i < 35; i++) {
          const el = document.createElement('div');
          el.className = 'confetti-flake';
          el.innerText = em[Math.floor(Math.random() * em.length)];
          el.style.left = (Math.random() * 100) + 'vw';
          el.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
          box.appendChild(el);
        }
        setTimeout(() => { box.style.display = 'none'; box.innerHTML = ''; }, 4500);
      } catch (e) { }
    }

    function unlockAudioContext() {
      if (!globalAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        globalAudioCtx = new AudioContext();
      }
      if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
    }

    function playSfx(t) {
      if (!soundEnabled || !globalAudioCtx) return;
      if (studyModeType === 'exam' && !isExamReview) return;
      try {
        const now = globalAudioCtx.currentTime;
        const osc = globalAudioCtx.createOscillator();
        const gain = globalAudioCtx.createGain();
        osc.connect(gain); gain.connect(globalAudioCtx.destination);
        
        if (t === 'tick') {
          osc.frequency.setValueAtTime(600, now);
          gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now); osc.stop(now + 0.05);
        } else if (t === 'correct') {
          osc.frequency.setValueAtTime(1046, now);
          gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.start(now); osc.stop(now + 0.4);
        } else if (t === 'wrong') {
          // Modern Soft Descending Error Tone
          osc.type = 'triangle'; 
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.35);
          gain.gain.setValueAtTime(0.15, now); 
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now); osc.stop(now + 0.35);
        } else if (t === 'magic') {
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
          gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now); osc.stop(now + 0.3);
        }
      } catch (e) { }
    }
