
function getUsernameFromToken () {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || null;  // adjust if your claim key differs
  } catch (err) {
    console.error('Failed to parse JWT', err);
    return null;
  }
}

async function loadProfile (payload) {
  try {
    const res = await fetch(`/users/${payload.username}`);
    if (!res.ok) throw new Error('Profile not found');
    const user = await res.json();

    // Text fields
    document.getElementById('username').textContent  = payload.username;
    document.getElementById('email').textContent     = payload.email     ?? '—';
    document.getElementById('role').textContent      = payload.role      ?? '—';
    document.getElementById('nickname').textContent  = payload.nickname  ?? '—';
    document.getElementById('birthdate').textContent = payload.birthDate ?? '—';

    // Avatar – HEAD request to see if it exists
   if (user.avatarUrl) {
  document.getElementById('avatar').src = user.avatarUrl;
}
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

function logout () {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
}

function goToMyPosts () {
  window.location.href = '/userPosts.html?mine=true';
}
function createPosts () {
  window.location.href = '/createPosts.html';
}

function editField (fieldId) {
  const valueSpan = document.getElementById(fieldId);
  const oldValue  = valueSpan.textContent;

  const input = document.createElement('input');
  input.type  = 'text';
  input.value = oldValue;

  const icon = document.querySelector('.edit-icon');
  input.style.position   = 'absolute';
  input.style.top        = `${icon.offsetTop + 40}px`;
  input.style.left       = `${icon.offsetLeft}px`;
  input.style.zIndex     = '1000';
  input.style.padding    = '8px 12px';
  input.style.border     = '2px solid rgb(76, 145, 175)';
  input.style.borderRadius = '16px';
  input.style.fontSize   = '16px';
  input.style.background = '#f9f9f9';
  input.style.color      = '#333';
  input.style.boxShadow  = '0 4px 6px rgba(0, 0, 0, 0.1)';
  input.style.transition = 'all 0.3s ease';

  input.addEventListener('focus', () => {
    input.style.borderColor = '#4CAF50';
    input.style.boxShadow   = '0 4px 8px rgba(0, 0, 0, 0.2)';
  });

  document.body.appendChild(input);
  input.focus();

  const save = () => {
    valueSpan.textContent = input.value;
    document.body.removeChild(input);
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
  });
}

// Profile page script
// This script handles loading the user profile, avatar upload, and editing fields
document.addEventListener('DOMContentLoaded', () => {
  // decode token & load profile
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No JWT in localStorage → user is not logged in');
    return;
  }
  const payload = JSON.parse(atob(token.split('.')[1]));
  loadProfile(payload);

  // Avatar upload input listener
  const avatarInput = document.getElementById('avatar-upload');
  if (avatarInput) {
    avatarInput.addEventListener('change', async function () {
      const file = this.files[0];
      if (!file) return;

      const username = getUsernameFromToken();
      if (!username) {
        alert('Session expired — please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      console.log('Uploading file:', file.name, '→', `/users/${username}/avatar`);

      try {
        const res = await fetch(`/users/${username}/avatar`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!data.avatarUrl) throw new Error('avatarUrl missing in response');

        // Because backend now returns a unique filename, no cache‑buster needed
        document.getElementById('avatar').src = data.avatarUrl;
        console.log('Avatar updated →', data.avatarUrl);
      } catch (err) {
        alert('Upload error: ' + err.message);
      }
    });
  }
});
