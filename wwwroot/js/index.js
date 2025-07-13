(function () {
  const token = localStorage.getItem('token');
  if (!token) return;

  document.getElementById('auth-buttons').style.display = 'none';
  document.getElementById('user-profile').style.display = 'inline-block';

  try {
    const { username } = JSON.parse(atob(token.split('.')[1]));

    fetch(`/users/${username}`)
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        const avatarUrl = user?.avatarUrl || '/images/avatar.png';
        document.getElementById('profile-icon').src = avatarUrl;
      })
      .catch(() => {
        document.getElementById('profile-icon').src = '/images/avatar.png';
      });
  } catch {
    console.error('Invalid token format');
    document.getElementById('profile-icon').src = '/images/avatar.png';
  }

   const ctaBtn = document.querySelector('.cta');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        if (!token) {
          // Not logged in – redirect to login
          window.location.href = '/login.html';
        } else {
          // Logged in – redirect to create post page (or wherever you prefer)
          window.location.href = '/createPosts.html';
        }
      });
    }
})();
