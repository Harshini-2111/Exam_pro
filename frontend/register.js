async function handleRegister() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!username || !email || !password) {
        return alert("Please fill in all fields");
    }

    try {
        const res = await fetch('http://localhost:5000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();
        if (res.ok) {
            alert("Success! Redirecting to login...");
            window.location.href = "index.html";
        } else {
            alert(data.message || "Registration failed");
        }
    } catch (err) {
        alert("Error: Backend server is not running!");
    }
}