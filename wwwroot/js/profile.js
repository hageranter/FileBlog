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
    const res = await fetch(`/users/${payload.username}`);
    if (!res.ok) throw new Error('Profile not found');
    const user = await res.json();

    document.getElementById('username').textContent = payload.username;
    document.getElementById('email').textContent = payload.email ?? '—';
    document.getElementById('role').textContent = payload.role ?? '—';
    document.getElementById('avatar').alt = payload.AvatarUrl + "'s avatar";

    if (user.avatarUrl) {
      document.getElementById('avatar').src = user.avatarUrl; // ✅ force refresh
    } else {
      document.getElementById('avatar').src = 'images\profile-icon.jpg';
    }

  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
}

function createPosts() {
  window.location.href = '/createPosts.html';
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
    const token = localStorage.getItem("token");
    if (!token) {
      postsContainer.innerHTML = "<p>User not authenticated.</p>";
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const username = payload.username;

    const res = await fetch(`/posts/user/${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error("Failed to fetch user posts");

    const posts = await res.json();
    postsContainer.innerHTML = '';
    postsContainer.style.display = '';
    postDetailsContainer.style.display = 'none';

    if (posts.length === 0) {
      postsContainer.innerHTML = "<p>No posts found.</p>";
      return;
    }

    displayPosts(posts);
  } catch (error) {
    console.error("Error loading posts:", error);
    postsContainer.innerHTML = "<p>There are no posts available.</p>";
  }
}

function displayPosts(posts) {
  posts.forEach(post => {
    const postCard = document.createElement('a');
    postCard.className = 'post-card';
    postCard.href = '#';
    postCard.onclick = e => {
      e.preventDefault();
      loadPostDetails(post.slug);
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
    postCard.onclick = () => window.location.href = `/postDetail.html?slug=${encodeURIComponent(post.slug)}`;

  });
}



function toggleMenu(button) {
  const menu = button.nextElementSibling;
  menu.classList.toggle('hidden');
}

function enableDetailEdit(menuItem) {
  const titleEl = document.getElementById('detail-title');
  const bodyEl = document.getElementById('detail-body');
  const saveBtn = document.getElementById('save-detail-btn');


  titleEl.setAttribute('contenteditable', 'true');
  bodyEl.setAttribute('contenteditable', 'true');
  titleEl.focus();

  saveBtn.classList.remove('hidden');
  menuItem.closest('.menu').classList.add('hidden');

  saveBtn.onclick = async () => {
    titleEl.setAttribute('contenteditable', 'false');
    bodyEl.setAttribute('contenteditable', 'false');
    saveBtn.classList.add('hidden');

    const newTitle = titleEl.innerText.trim();
    const newBody = bodyEl.innerHTML.trim();

    if (!currentSlug) {
      alert("Missing post slug");
      return;
    }

    try {
      const res = await fetch(`/posts/${currentSlug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newTitle,
          body: newBody
        })
      });

      if (!res.ok) throw new Error("Failed to save");

      alert("Post updated successfully!");
    } catch (err) {
      console.error("Error saving post:", err);
      alert("Failed to save post");
    }
  };
}

function confirmDeletePost() {
  if (!currentSlug) return alert("Missing slug");

  const confirmed = confirm("Are you sure you want to delete this post?");
  if (!confirmed) return;

  fetch(`/posts/${currentSlug}`, {
    method: "DELETE"
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to delete");
      alert("Post deleted successfully.");
      backToPosts();
      loadPosts(); // refresh list
    })
    .catch(err => {
      console.error("Error deleting post:", err);
      alert("Could not delete post.");
    });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!token) {
    console.warn('No JWT found. Not logged in.');
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    loadProfile(payload);
    loadPosts();

    if (payload.role?.toLowerCase() === 'admin') {
      const btn = document.createElement('button');
      btn.textContent = 'Control Users';
      btn.className = 'btn btn-primary';
      btn.onclick = () => window.location.href = '/admin.html';

      const btnGroup = document.querySelector('.btn-group');
      const logoutBtn = btnGroup.querySelector('.btn-danger');
      btnGroup.insertBefore(btn, logoutBtn);
    }

    const avatarInput = document.getElementById('avatar-upload');
    avatarInput?.addEventListener('change', async function () {
      const file = this.files[0];
      if (!file) return;

      const username = getUsernameFromToken();
      if (!username) return alert("Session expired");

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`/users/${username}/avatar`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        if (!data.avatarUrl) throw new Error("Missing avatarUrl");
        document.getElementById('avatar').src = data.avatarUrl + `?t=${Date.now()}`; // bust cache

      } catch (err) {
        alert("Upload failed: " + err.message);
      }
    });

  } catch (err) {
    console.error("Invalid token", err);
  }
});