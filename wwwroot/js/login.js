const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      errorMsg.textContent = 'Invalid username or password.';
      return;
    }

    const data = await res.json();
    localStorage.setItem('token', data.token);
    window.location.href = '/index.html'; 

  } catch (err) {
    console.error('Login error:', err);
    errorMsg.textContent = 'Something went wrong. Try again.';
  }
 
  const authLinks = document.getElementById("auth-links");
  const token = localStorage.getItem("token");

  if (token) {
    authLinks.innerHTML = '<a href="#" onclick="logout()">Logout</a>';
  } else {
    authLinks.innerHTML = '<a href="/login.html">Login</a> | <a href="/signup.html">Sign Up</a>';
  }

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  }


});
