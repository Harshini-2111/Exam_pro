// Function to handle Profile Editing
async function saveProfile() {
    const newUsername = document.getElementById('editUsername').value;
    const newEmail = document.getElementById('editEmail').value;
    const token = localStorage.getItem('token');

    if (!newUsername || !newEmail) return alert("Please fill in all fields");

    try {
        const response = await fetch('http://localhost:5000/update-profile', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newUsername, newEmail })
        });

        if (response.ok) {
            localStorage.setItem('username', newUsername); // Update local storage
            alert("Profile updated successfully!");
            location.reload();
        }
    } catch (err) {
        alert("Error updating profile");
    }
}
async function fetchProfile() {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const res = await fetch('http://localhost:5000/user-data', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        // Update UI Header using data directly from MongoDB
        document.getElementById('profile-name').innerText = data.username || "User";
        document.getElementById('profile-email').innerText = data.email || 'No email provided';
        document.getElementById('profile-avatar').src = `https://ui-avatars.com/api/?name=${data.username}&background=00d2ff&color=fff&size=128&bold=true`;
        
        // Pre-fill Edit Modal
        document.getElementById('editUsername').value = data.username || "";
        document.getElementById('editEmail').value = data.email || "";

        renderProfileData(data.subjects);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

function renderProfileData(subjects) {
    const statsList = document.getElementById('subject-stats-list');
    let totalPassed = 0;
    document.getElementById('stat-subjects').innerText = Object.keys(subjects).length;

    let html = '';

    for (const [subName, levels] of Object.entries(subjects)) {
        let subPassed = 0;
        let levelsHtml = '';

        ["levelA", "levelB", "levelC"].forEach(levelKey => {
            const lvl = levels[levelKey];
            if (lvl) {
                const status = lvl.status === 'passed' || lvl.status === 'completed' ? '    / Completed' : '   / Locked';
                if (lvl.status === 'passed' || lvl.status === 'completed') {
                    subPassed++;
                    totalPassed++;
                }

                levelsHtml += `
                    <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 5px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span>${levelKey.replace('level', 'Level ')} ${status}</span>
                        <span>Score: ${lvl.score}% | Attempts: ${lvl.attempts}</span>
                    </div>
                `;
            }
        });

        html += `
            <div class="glass-card" style="padding: 15px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <h4 style="color: #00d2ff; margin: 0;">${subName}</h4>
                        <p style="font-size: 0.75rem; color: #28a745;">${subPassed}/3 Levels Completed</p>
                    </div>
                    <button onclick="resetSubject('${subName}')" style="background:#ff9800; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.7rem;">
                        Reset Progress
                    </button>
                </div>
                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                    ${levelsHtml}
                </div>
            </div>
        `;
    }

    document.getElementById('stat-passed').innerText = totalPassed;
    statsList.innerHTML = html || '<p>No subjects joined yet.</p>';
}
async function saveProfile() {
    const newUsername = document.getElementById('editUsername').value;
    const newEmail = document.getElementById('editEmail').value;
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('http://localhost:5000/update-profile', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newUsername, newEmail })
        });

        if (response.ok) {
            localStorage.setItem('username', newUsername); 
            alert("Profile updated successfully!");
            location.reload();
        }
    } catch (err) { alert("Error updating profile"); }
}

async function resetSubject(subjectName) {
    if(!confirm(`Reset all progress for ${subjectName}?`)) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('http://localhost:5000/reset-subject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ subject: subjectName })
        });
        if(res.ok) location.reload();
    } catch (err) { alert("Reset failed"); }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

async function deleteAccount() {
    if(!confirm("Permanently delete your account?")) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('http://localhost:5000/delete-account', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) logout();
    } catch (err) { alert("Delete failed"); }
}

function toggleEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
}

window.onload = fetchProfile;