const postsContainer = document.getElementById('posts');
const postDetailsContainer = document.getElementById('post-details');
const postContent = document.getElementById('post-content');
const postAssets = document.getElementById('post-assets');
const backButton = document.getElementById('back-button');
const avatarUploadInput = document.getElementById('avatar-upload');

let currentSlug = null;

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getUsernameFromToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || null;
  } catch {
    return null;
  }
}

async function loadPosts() {
  try {
    const token = getToken();
    if (!token) {
      if (postsContainer) postsContainer.innerHTML = "<p>User not authenticated.</p>";
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const username = payload.username;

    const res = await fetch(`/api/posts/user/${encodeURIComponent(username)}`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch user posts");

    const posts = await res.json();

    if (postsContainer) postsContainer.innerHTML = '';
    if (postDetailsContainer) postDetailsContainer.style.display = 'none';
    if (postsContainer) postsContainer.style.display = 'block';

    posts.forEach(post => {
      const postDiv = document.createElement('div');
      postDiv.classList.add('post');

      const tagsHtml = (post.tags || []).map(tag =>
        `<a href="#" class="filter-tag" data-tag="${tag}">${tag}</a>`
      ).join(', ') || 'None';

      const categoriesHtml = (post.categories || []).map(cat =>
        `<a href="#" class="filter-category" data-category="${cat}">${cat}</a>`
      ).join(', ') || 'None';

      postDiv.innerHTML = `
        <h2><a href="#" class="post-link" data-slug="${post.slug}">${post.title}</a></h2>
        <small>Published on ${new Date(post.publishedDate).toLocaleDateString()}</small>
        <p>${post.description ?? ''}</p>
        <p><strong>Tags:</strong> ${tagsHtml}</p>
        <p><strong>Categories:</strong> ${categoriesHtml}</p>
        <hr />
      `;

      postDiv.querySelector('a.post-link').addEventListener('click', e => {
        e.preventDefault();
        const slug = e.currentTarget.dataset.slug;
        loadPostDetails(slug);
      });

      postsContainer.appendChild(postDiv);
    });

    addFilterListeners();
  } catch (error) {
    console.error("Error loading posts:", error);
    if (postsContainer) postsContainer.innerHTML = "<p>Failed to load posts.</p>";
  }
}

async function loadPostDetails(slug) {
  try {
    currentSlug = slug;

    const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error("Post not found");

    const post = await res.json();

    if (postsContainer) postsContainer.style.display = 'none';
    if (postDetailsContainer) postDetailsContainer.style.display = 'block';

    if (postContent) {
      postContent.innerHTML = `
        <h2>${post.title}</h2>
        <small>${new Date(post.publishedDate).toLocaleDateString()}</small>
        <div>${post.body ?? ''}</div>
      `;
    }

    if (postAssets) {
      const imgs = (post.assetFiles || []).map(f => {
        const encodedFile = encodeURIComponent(f);
        const encodedFolder = encodeURIComponent(post.folderName);
        return `<img src="/content/posts/${encodedFolder}/assets/${encodedFile}" alt="">`;
      }).join('');
      postAssets.innerHTML = imgs;
    }
  } catch (err) {
    console.error(err);
    alert("Cannot load post details");
  }
}

async function loadPostsByTag(tag) {
  try {
    const res = await fetch(`/api/posts/tags/${encodeURIComponent(tag)}`, {
      headers: authHeaders()
    });
    if (!res.ok) {
      if (postsContainer) postsContainer.innerHTML = `<h2>No posts found for tag: ${tag}</h2>`;
      if (postDetailsContainer) postDetailsContainer.style.display = 'none';
      if (postsContainer) postsContainer.style.display = 'block';
      return;
    }

    const posts = await res.json();
    if (postsContainer) postsContainer.innerHTML = `<h2>Posts tagged with "${tag}"</h2>`;
    if (postsContainer) postsContainer.style.display = 'block';
    if (postDetailsContainer) postDetailsContainer.style.display = 'none';

    displayPosts(posts);
  } catch (error) {
    console.error("Error loading posts by tag:", error);
  }
}

async function loadPostsByCategory(category) {
  try {
    const res = await fetch(`/api/posts/categories/${encodeURIComponent(category)}`, {
      headers: authHeaders()
    });
    if (!res.ok) {
      if (postsContainer) postsContainer.innerHTML = `<h2>No posts found for category: ${category}</h2>`;
      if (postDetailsContainer) postDetailsContainer.style.display = 'none';
      if (postsContainer) postsContainer.style.display = 'block';
      return;
    }

    const posts = await res.json();
    if (postsContainer) postsContainer.innerHTML = `<h2>Posts in category "${category}"</h2>`;
    if (postsContainer) postsContainer.style.display = 'block';
    if (postDetailsContainer) postDetailsContainer.style.display = 'none';

    displayPosts(posts);
  } catch (error) {
    console.error("Error loading posts by category:", error);
  }
}

function displayPosts(posts) {
  if (!postsContainer) return;
  postsContainer.innerHTML = '';

  posts.forEach(post => {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');

    const tagsHtml = (post.tags || []).map(t =>
      `<a href="#" class="filter-tag" data-tag="${t}">${t}</a>`
    ).join(', ') || 'None';

    const categoriesHtml = (post.categories || []).map(c =>
      `<a href="#" class="filter-category" data-category="${c}">${c}</a>`
    ).join(', ') || 'None';

    postDiv.innerHTML = `
      <h2><a href="#" class="post-link" data-slug="${post.slug}">${post.title}</a></h2>
      <small>Published on ${new Date(post.publishedDate).toLocaleDateString()}</small>
      <p>${post.description ?? ''}</p>
      <p><strong>Tags:</strong> ${tagsHtml}</p>
      <p><strong>Categories:</strong> ${categoriesHtml}</p>
      <hr />
    `;

    postDiv.querySelector('a.post-link').addEventListener('click', e => {
      e.preventDefault();
      const slug = e.currentTarget.dataset.slug;
      loadPostDetails(slug);
    });

    postsContainer.appendChild(postDiv);
  });

  addFilterListeners();
}

function addFilterListeners() {
  document.querySelectorAll('a.filter-tag').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      const tag = e.currentTarget.getAttribute('data-tag');
      await loadPostsByTag(tag);
    });
  });

  document.querySelectorAll('a.filter-category').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      const category = e.currentTarget.getAttribute('data-category');
      await loadPostsByCategory(category);
    });
  });
}

if (backButton) {
  backButton.addEventListener('click', () => {
    if (postDetailsContainer) postDetailsContainer.style.display = 'none';
    if (postsContainer) postsContainer.style.display = 'block';
    currentSlug = null;
  });
}

/* --------- Bootstrapping: detect clean URL /post/{slug} --------- */
(function bootstrap() {
  // If path matches /post/{slug}, load that post. Else load list.
  const m = window.location.pathname.match(/^\/post\/([^\/?#]+)$/);
  if (m && m[1]) {
    loadPostDetails(decodeURIComponent(m[1]));
  } else {
    loadPosts();
  }
})();

/* --------- Header profile icon (optional auth) --------- */
(function loadHeaderProfile() {
  const token = getToken();
  const profileEl = document.getElementById("profile-icon");
  if (!profileEl || !token) return;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const username = payload.username;

    fetch(`/users/${encodeURIComponent(username)}`, {
      headers: authHeaders()
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(user => {
        const avatarUrl = user?.avatarUrl || '/images/default-profile.png';
        profileEl.innerHTML = `<img src="${avatarUrl}" alt="Profile">`;
      })
      .catch(() => {
        profileEl.innerHTML = `<img src="/images/default-profile.png" alt="Profile">`;
      });
  } catch {
    // ignore header avatar on malformed token
  }
})();

/* --------- Navigation helpers --------- */
function createPosts() {
  window.location.href = '/createPosts.html';
}
