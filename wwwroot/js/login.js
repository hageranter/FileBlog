console.log("✅ login.js loaded");
const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      errorMsg.textContent = 'Invalid username or password.';
      return;
    }

    const data = await res.json();
    localStorage.setItem('token', data.token);

    document.getElementById('redirect-modal').style.display = 'block';
    window.pendingRedirectUrl = window.location.origin;
    setTimeout(() => window.history.back(), 1000);

  } catch (err) {
    console.error('Login error:', err);
    errorMsg.textContent = 'Something went wrong. Try again.';
  }
});

//  links based on token 
function updateAuthLinks() {
  const authLinks = document.getElementById("auth-links");
  const token = localStorage.getItem("token");

  if (authLinks) {
    authLinks.innerHTML = token
      ? '<a href="#" onclick="logout()">Logout</a>'
      : '<a href="/login">Login</a> | <a href="/signup">Sign Up</a>'; // ✅ clean URLs
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login"; // ✅ clean URL
}

updateAuthLinks();
