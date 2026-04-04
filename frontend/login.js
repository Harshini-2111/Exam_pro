async function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (!user || !pass) {
        return alert("Please enter both username and password");
    }

    try {
        const response = await fetch('http://localhost:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        // Inside your login function
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('subjects', JSON.stringify(data.subjects));
            window.location.href = 'dashboard.html';
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Server Error: Make sure your backend is running on port 5000");
    }
}