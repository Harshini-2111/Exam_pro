let questions = [];
let currentIndex = 0;
let answers = {};

async function initExam() {
    const sub = localStorage.getItem('selectedSubject');
    const lvl = localStorage.getItem('selectedLevel');
    const token = localStorage.getItem('token');

    const infoHeader = document.getElementById('exam-info');
    if (infoHeader) {
        infoHeader.innerText = `${sub} - ${lvl}`;
    }

    try {
        // 1. Fetch user data to check current attempts for rotation logic
        const userRes = await fetch('http://localhost:5000/user-data', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();

        // 2. Calculate setNumber: (attempts % 3) + 1
        // This ensures the sequence 1 -> 2 -> 3 -> 1...
        const attempts = userData.subjects[sub][lvl].attempts || 0;
        const setNumber = (attempts % 3) + 1;

        // 3. Fetch questions using the calculated setNumber
        const res = await fetch(`http://localhost:5000/questions?subject=${sub}&level=${lvl}&setNumber=${setNumber}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to fetch questions");

        questions = await res.json();

        if (questions.length > 0) {
            renderQuestion();
        } else {
            document.getElementById('quiz-area').innerHTML = `<p style="color:white; text-align:center;">No questions found for Set ${setNumber}.</p>`;
        }
    } catch (err) {
        console.error(err);
        document.getElementById('quiz-area').innerHTML = `<p style="color:red; text-align:center;">Server error. Please check your connection.</p>`;
    }
}
function renderQuestion() {
    const q = questions[currentIndex];
    const area = document.getElementById('quiz-area');
    if (!area || !q) return;

    // Reset animation so it plays on every question change
    area.style.animation = 'none';
    area.offsetHeight; /* trigger reflow */
    area.style.animation = null;

    const letters = ['A', 'B', 'C', 'D'];

    area.innerHTML = `
        <div class="glass-card" style="padding: 30px; max-width: 800px; margin: 0 auto; background: rgba(255,255,255,0.05); border-radius: 15px;">
            <p style="font-size: 1.3rem; margin-bottom: 20px; color: white;">
                <strong>Q${currentIndex + 1}:</strong> ${q.questionText}
            </p>
            <div class="options-column" style="display: flex; flex-direction: column; gap: 12px;">
                ${q.options.map((opt, i) => `
                    <label class="option-label" style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; cursor: pointer; color: white; display: flex; align-items: center;">
                        <input type="radio" name="currentQ" value="${opt}" ${answers[currentIndex] === opt ? 'checked' : ''} style="margin-right: 15px;">
                        <span><strong style="color: #00d2ff;">${letters[i]}.</strong> ${opt}</span>
                    </label>
                `).join('')}
            </div>

            <div class="nav-container" style="display: flex; justify-content: space-between; align-items: center; margin-top: 30px;">
                <button class="btn-secondary" onclick="prev()" style="${currentIndex === 0 ? 'visibility:hidden' : ''}; background: #444; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Previous</button>
                <span style="font-weight: 600; color: white;">${currentIndex + 1} / ${questions.length}</span>
                ${currentIndex === questions.length - 1
            ? `<button class="btn-finish" onclick="submitExam()" style="background: #00d2ff; color: black; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">Finish Exam</button>`
            : `<button class="btn-primary" onclick="next()" style="background: #00d2ff; color: black; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">Next</button>`}
            </div>
        </div>
    `;
}

function next() { saveAnswer(); currentIndex++; renderQuestion(); }
function prev() { saveAnswer(); currentIndex--; renderQuestion(); }

function saveAnswer() {
    const selected = document.querySelector('input[name="currentQ"]:checked');
    if (selected) answers[currentIndex] = selected.value;
}
async function submitExam() {
    saveAnswer();
    let score = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correctAnswer) score++; });
    const finalScore = Math.round((score / questions.length) * 100);

    const token = localStorage.getItem('token');
    const subject = localStorage.getItem('selectedSubject');
    const level = localStorage.getItem('selectedLevel');

    try {
        const response = await fetch('http://localhost:5000/submit-exam', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ subject, level, score: finalScore })
        });

        const result = await response.json();
        const isPassed = finalScore >= 60; // Assuming 60% is pass mark

        if (isPassed) {
            triggerCelebration(level, subject, finalScore);
        } else {
            showResultPage(false, finalScore);
        }
    } catch (err) {
        console.error("Submission error:", err);
        alert("Error submitting exam.");
    }
}

function triggerCelebration(level, subject, score) {
    // 1. Confetti Animation
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#00d2ff', '#3a7bd5']
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#00d2ff', '#3a7bd5']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());

    // 2. Prepare Popup Content
    let title = "Level Completed!";
    let message = `Great job! You passed ${level.replace('level', 'Level ')} with ${score}%`;
    let icon = "🌟";

    if (level === "levelC") {
        title = "Subject Mastered! 🏆";
        message = `Congratulations! You have successfully completed the entire ${subject} subject!`;
        icon = "🎓";
    }

    // 3. Render Result UI
    showResultPage(true, score, title, message, icon);
}

function showResultPage(isPassed, score, title = "", message = "", icon = "") {
    const statusColor = isPassed ? "#00ff88" : "#ff4b2b";
    const area = document.getElementById('quiz-area');
    
    area.innerHTML = `
        <div class="glass-card" style="text-align:center; padding: 50px; color: white; background: rgba(255,255,255,0.05); border-radius: 15px; animation: slideUp 0.5s ease;">
            <div style="font-size: 4rem; margin-bottom: 10px;">${isPassed ? icon : '❌'}</div>
            <h1 style="color: ${statusColor}; margin-bottom: 10px;">${isPassed ? title : 'Exam Failed'}</h1>
            <p style="font-size: 1.2rem; margin-bottom: 20px; opacity: 0.8;">${isPassed ? message : 'Try again to unlock the next level!'}</p>
            <p style="font-size: 3.5rem; font-weight: bold; margin: 20px 0;">${score}%</p>
            <button class="btn-primary" onclick="window.location.href='dashboard.html'" 
                style="background: #00d2ff; color: black; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1rem;">
                Back to Dashboard
            </button>
        </div>`;
}
window.onload = initExam;