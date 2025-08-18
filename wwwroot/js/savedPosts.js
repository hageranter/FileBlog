// Auth-based UI adjustments and session validation
(function () {
  const token = localStorage.getItem('token');

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
        window.location.href = token ? '/create-posts' : '/login';
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
