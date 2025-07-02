(function () {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Hide login/signup and show profile icon
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
                // Fallback to default avatar if user not found
                document.getElementById('profile-icon').src = '/images/avatar.png';
            });
    } catch {
        // invalid token, fallback silently
    }

})();
