console.log("✅ login.js loaded");  

const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const res = await fetch('/login', {
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

    const redirectUrl = `${window.location.origin}/posts.html`;
console.log("Login successful →", redirectUrl);
alert("✅ About to redirect to posts.html");
window.location.href = redirectUrl;


  } catch (err) {
    console.error('Login error:', err);
    errorMsg.textContent = 'Something went wrong. Try again.';
  }
});

// ------- nav links based on token -------
function updateAuthLinks() {
  const authLinks = document.getElementById("auth-links");
  const token = localStorage.getItem("token");

  if (authLinks) {
    authLinks.innerHTML = token
      ? '<a href="#" onclick="logout()">Logout</a>'
      : '<a href="/login.html">Login</a> | <a href="/signup.html">Sign Up</a>';
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
}
window.addEventListener('beforeunload', function (e) {
  console.log("❌ reload triggered - prevented");
  e.preventDefault();
  e.returnValue = '';
});


updateAuthLinks();
