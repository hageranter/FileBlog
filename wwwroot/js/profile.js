const token = localStorage.getItem('token');
let currentSlug = null;

function getUsernameFromToken() {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || null;
  } catch (err) {
    console.error('Failed to parse JWT', err);
    return null;
  }
}

async function loadProfile(payload) {
  try {
    // If your /users/{username} requires auth, include the token; harmless if it’s public.
    const res = await fetch(`/users/${encodeURIComponent(payload.username)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Profile not found');
    const user = await res.json();

    const usernameEl = document.getElementById('username');
    const emailEl = document.getElementById('email');
    const roleEl = document.getElementById('role');
    const avatarEl = document.getElementById('avatar');

    if (usernameEl) usernameEl.textContent = payload.username;
    if (emailEl) emailEl.textContent = payload.email ?? '—';
    if (roleEl) roleEl.textContent = payload.role ?? '—';
    if (avatarEl) {
      avatarEl.alt = `${payload.username}'s avatar`;
      avatarEl.src = user.avatarUrl || 'images/profile-icon.jpg';
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

function createPosts() {
  window.location.href = '/createPosts';
}

function getImageSrc(post) {
  return (post.assetFiles?.length > 0)
    ? `/content/posts/${post.folderName}/assets/${post.assetFiles[0]}`
    : '/images/default-thumbnail.jpg';
}

const postsContainer = document.getElementById('posts');
const postDetailsContainer = document.getElementById('post-details');
const postContent = document.getElementById('post-content');
const postAssets = document.getElementById('post-assets');

async function loadPosts() {
  try {
    if (!token) {
      if (postsContainer) postsContainer.innerHTML = "<p>User not authenticated.</p>";
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const username = payload.username;

    const res = await fetch(`/api/posts/user/${encodeURIComponent(username)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch user posts");

    const posts = await res.json();

    if (postsContainer) {
      postsContainer.innerHTML = '';
      postsContainer.style.display = '';
    }
    if (postDetailsContainer) postDetailsContainer.style.display = 'none';

    if (!posts || posts.length === 0) {
      if (postsContainer) postsContainer.innerHTML = "<p>No posts found.</p>";
      return;
    }

    displayPosts(posts);
  } catch (error) {
    console.error("Error loading posts:", error);
    if (postsContainer) postsContainer.innerHTML = "<p>There are no posts available.</p>";
  }
}

function displayPosts(posts) {
  if (!postsContainer) return;
  posts.forEach(post => {
    const postCard = document.createElement('a');
    postCard.className = 'post-card';
    postCard.href = `/post/${encodeURIComponent(post.slug)}`;
    postCard.onclick = e => {
      e.preventDefault();
      window.location.href = `/post/${encodeURIComponent(post.slug)}`;
    };

    const imageUrl = getImageSrc(post);

    postCard.innerHTML = `
      <div class="post-image">
        <img src="${imageUrl}" alt="${post.title}">
      </div>
      <div class="post-body">
        <h3>${post.title}</h3>
      </div>
    `;

    postsContainer.appendChild(postCard);
  });
}

function toggleMenu(button) {
  const menu = button?.nextElementSibling;
  if (menu) menu.classList.toggle('hidden');
}

function enableDetailEdit(menuItem) {
  const titleEl = document.getElementById('detail-title');
  const bodyEl = document.getElementById('detail-body');
  const saveBtn = document.getElementById('save-detail-btn');

  if (!titleEl || !bodyEl || !saveBtn) return;

  titleEl.setAttribute('contenteditable', 'true');
  bodyEl.setAttribute('contenteditable', 'true');
  titleEl.focus();

  saveBtn.classList.remove('hidden');
  menuItem?.closest('.menu')?.classList.add('hidden');

  saveBtn.onclick = async () => {
    titleEl.setAttribute('contenteditable', 'false');
    bodyEl.setAttribute('contenteditable', 'false');
    saveBtn.classList.add('hidden');

    const newTitle = titleEl.innerText.trim();
    const newBody = bodyEl.innerHTML.trim();

    if (!currentSlug) {
      return Swal.fire('Missing Slug', 'No post selected to edit.', 'error');
    }

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(currentSlug)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: newTitle,
          body: newBody
        })
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to save");
      }

      Swal.fire('Saved!', 'Post updated successfully.', 'success');
    } catch (err) {
      console.error("Error saving post:", err);
      Swal.fire('Error', err.message || 'Failed to save post.', 'error');
    }
  };
}

function confirmDeletePost() {
  if (!currentSlug) {
    return Swal.fire('Error', 'Missing slug.', 'error');
  }

  Swal.fire({
    title: 'Are you sure?',
    text: "This post will be permanently deleted.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!'
  }).then(async result => {
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(currentSlug)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to delete");
      }

      await Swal.fire('Deleted!', 'Post deleted successfully.', 'success');
      backToPosts();
      loadPosts();
    } catch (err) {
      console.error("Error deleting post:", err);
      Swal.fire('Error', err.message || 'Could not delete post.', 'error');
    }
  });
}

// Simple fallback if you didn’t define it elsewhere
function backToPosts() {
  if (postsContainer && postDetailsContainer) {
    postDetailsContainer.style.display = 'none';
    postsContainer.style.display = '';
  } else {
    // fallback: just navigate to the list page
    window.location.href = '/profile' in window.location.pathname ? '/profile' : '/';
  }
}

document.addEventListener('DOMContentLoaded', () => {
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

    loadProfile(payload);
    loadPosts();

    if (payload.role?.toLowerCase() === 'admin') {
      const btnGroup = document.querySelector('.btn-group');
      if (btnGroup) {
        const btn = document.createElement('button');
        btn.textContent = 'Control Users';
        btn.className = 'btn btn-primary';
        btn.onclick = () => window.location.href = '/admin';
        const logoutBtn = btnGroup.querySelector('.btn-danger');
        btnGroup.insertBefore(btn, logoutBtn || null);
      }
    }

    const avatarInput = document.getElementById('avatar-upload');
    avatarInput?.addEventListener('change', async function () {
      const file = this.files?.[0];
      if (!file) return;

      const username = getUsernameFromToken();
      if (!username) {
        return Swal.fire('Session Expired', 'Please log in again.', 'error');
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`/users/${encodeURIComponent(username)}/avatar`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        if (!data.avatarUrl) throw new Error("Missing avatarUrl");

        const avatarEl = document.getElementById('avatar');
        if (avatarEl) avatarEl.src = data.avatarUrl + `?t=${Date.now()}`;

        await Swal.fire({
          icon: 'success',
          title: 'Upload Successful',
          text: 'Your profile image was updated.',
          confirmButtonColor: '#3085d6'
        });

      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text: err.message || 'Something went wrong.',
          confirmButtonColor: '#d33'
        });
      }
    });

  } catch (err) {
    console.error("Invalid token", err);
    localStorage.removeItem('token');
    Swal.fire({
      icon: 'error',
      title: 'Invalid Session',
      text: 'Please log in again.',
      confirmButtonText: 'Go to Login',
      confirmButtonColor: '#d33'
    }).then(() => {
      window.location.href = '/login';
    });
  }
});
