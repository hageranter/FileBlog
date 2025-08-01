const form = document.getElementById('signup-form');
const message = document.getElementById('signup-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirm-password').value.trim();
  const role = 'user';

  // Password strength criteria
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

  if (password !== confirmPassword) {
    message.style.color = 'red';
    message.textContent = 'Passwords do not match.';
    return;
  }

  if (!passwordRegex.test(password)) {
    message.style.color = 'red';
    message.textContent =
      'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.';
    return;
  }

  try {
    const res = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role })
    });

    if (!res.ok) {
      const err = await res.text();
      message.style.color = 'red';
      message.textContent = err || 'Sign up failed.';
      return;
    }

    message.style.color = 'green';
    message.textContent = 'Account created successfully! Redirecting...';
    setTimeout(() => window.location.href = '/login.html', 2000);

  } catch (err) {
    message.style.color = 'red';
    message.textContent = 'An error occurred. Please try again.';
  }
});
