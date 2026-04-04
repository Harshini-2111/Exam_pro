document.addEventListener('DOMContentLoaded', async () => {
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    const container = document.getElementById('dashboard-content');
    const userDisplay = document.getElementById('user-display');
    // Add this inside the try block of dashboard.js after setting userDisplay.innerText
    const profilePic = document.getElementById('profile-pic');
    if (profilePic) {
        profilePic.src = `https://ui-avatars.com/api/?name=${username}&background=00d2ff&color=fff&bold=true`;
    }
    // 1. Auth Guard
    if (!username || !token) {
        window.location.href = 'index.html';
        return;
    }

    if (userDisplay) userDisplay.innerText = username;

    try {
        // 2. Fetch data from Backend
        const response = await fetch('http://localhost:5000/user-data', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch data');
        }

        const data = await response.json();
        const subjects = data.subjects;

        // 3. Clear loading text and build UI
        container.innerHTML = '';

        if (!subjects || Object.keys(subjects).length === 0) {
            container.innerHTML = '<p style="color:white; text-align:center;">No subjects found.</p>';
            return;
        }

        // Iterate through each subject (DevOps, MongoDB, etc.)
        for (const [subName, levels] of Object.entries(subjects)) {
            const card = document.createElement('div');
            card.className = 'glass-card dash-card';
            card.style.marginBottom = '20px';

            let buttonsHTML = '';
            const levelKeys = ['levelA', 'levelB', 'levelC'];

            levelKeys.forEach(lKey => {
                const levelData = levels[lKey];
                buttonsHTML += getLevelButtonMarkup(subName, lKey, levelData);
            });

            card.innerHTML = `
                <h2 style="margin-bottom:20px; color:#00d2ff; text-align:center;">${subName}</h2>
                <div class="level-list" style="display:flex; flex-direction:column; gap:12px;">
                    ${buttonsHTML}
                </div>
            `;
            container.appendChild(card);
        }

    } catch (error) {
        console.error("Dashboard Error:", error);
        container.innerHTML = `
            <div style="color: #ff416c; text-align: center; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                <h3>Dashboard Error</h3>
                <p>${error.message}</p>
                <small>Ensure backend is running on port 5000</small>
            </div>`;
    }
});

// Helper function to generate button HTML with color logic
function getLevelButtonMarkup(subject, levelKey, levelData) {
    const isPassed = levelData.status === "passed";
    const isLocked = levelData.status === "locked";
    const hasAttempted = levelData.attempts > 0;

    // Determine Background Color
    let bgColor = "rgba(255,255,255,0.1)"; // Default Unlocked
    let statusText = "";

    if (isLocked) {
        statusText = " (Locked)";
    } else if (isPassed) {
        bgColor = "#28a745"; // Green
        statusText = " - Completed";
    } else if (hasAttempted) {
        bgColor = "#dc3545"; // Red
        statusText = " - Failed";
    }

    const scoreText = levelData.score > 0 ? ` [${levelData.score}%]` : "";
    const label = levelKey.replace('level', 'Level ') + statusText + scoreText;

    return `
        <div style="position: relative; width: 100%;">
            <button class="level-btn" 
                ${isLocked ? 'disabled' : ''} 
                onclick="goToExam('${subject}', '${levelKey}')"
                style="background: ${bgColor}; width: 100%; text-align: left; padding: 18px; border-radius: 10px; color: white; border: 1px solid rgba(255,255,255,0.1); cursor: ${isLocked ? 'not-allowed' : 'pointer'}; opacity: ${isLocked ? '0.5' : '1'}; transition: 0.3s; font-size: 1rem; font-weight: 500;">
                ${label}
                
                ${(hasAttempted && !isPassed) ?
            `<span style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); background: #ffc107; color: black; padding: 4px 10px; border-radius: 5px; font-size: 0.75rem; font-weight: bold; letter-spacing: 0.5px;">RETAKE</span>`
            : ''}
            </button>
        </div>
    `;
}

// Navigation Function
function goToExam(sub, lvlKey) {
    localStorage.setItem('selectedSubject', sub);
    localStorage.setItem('selectedLevel', lvlKey);
    window.location.href = 'exam.html';
}
