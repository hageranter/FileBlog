// Auth-based UI adjustments and session validation
(function () {
  const token = localStorage.getItem('token');

  // 🚫 If no token at all
  if (!token) {
    return Swal.fire({
      icon: 'warning',
      title: 'Session Expired',
      text: 'Please log in to continue.',
      confirmButtonText: 'Go to Login',
      confirmButtonColor: '#3085d6'
    }).then(() => {
      window.location.href = '/login';
    });
  }

  // ✅ Parse token and check expiration
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      localStorage.removeItem('token');
      return Swal.fire({
        icon: 'warning',
        title: 'Session Expired',
        text: 'Please log in again.',
        confirmButtonText: 'Go to Login',
        confirmButtonColor: '#3085d6'
      }).then(() => {
        window.location.href = '/login';
      });
    }

    // Show user UI if logged in
    const authBtns = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    if (authBtns) authBtns.style.display = 'none';
    if (userProfile) userProfile.style.display = 'inline-block';

    fetch(`/users/${payload.username}`)
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        const avatarUrl = user?.avatarUrl || '/images/profile-icon.jpg';
        const profileImg = document.getElementById('profile-icon');
        if (profileImg) profileImg.src = avatarUrl;
      })
      .catch(() => {
        const profileImg = document.getElementById('profile-icon');
        if (profileImg) profileImg.src = '/images/profile-icon.jpg';
      });

    const ctaBtn = document.querySelector('.cta');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        window.location.href = token ? '/createPosts' : '/login';
      });
    }

  } catch (err) {
    console.error('Token parse error:', err);
    localStorage.removeItem('token');
    return Swal.fire({
      icon: 'error',
      title: 'Invalid Session',
      text: 'Please log in again.',
      confirmButtonText: 'Go to Login',
      confirmButtonColor: '#d33'
    }).then(() => {
      window.location.href = '/login';
    });
  }
})();

async function submitForm() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  // Basic validation
  if (!name || !email || !message) {
    return Swal.fire({
      icon: 'warning',
      title: 'Missing Fields',
      text: 'Please fill in all the fields before submitting.',
      confirmButtonColor: '#f0ad4e'
    });
  }

  // Show loading spinner
  Swal.fire({
    title: 'Sending...',
    html: 'Please wait while we submit your message.',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const response = await fetch("/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message })
    });

    if (!response.ok) throw new Error("Request failed");

    // Close spinner and show success
    Swal.fire({
      icon: 'success',
      title: 'Message Sent',
      text: 'We’ve received your message. Please check your email!',
      confirmButtonColor: '#3085d6'
    });
    document.getElementById("contact-form").reset();

  } catch (error) {
    console.error("Contact form error:", error);
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'Something went wrong while sending your message.',
      confirmButtonColor: '#d33'
    });
  }
}
