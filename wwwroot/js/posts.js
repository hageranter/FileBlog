const postsContainer = document.getElementById('posts');
const backCategoryButton = document.getElementById('back-category-button');
const profileEl = document.getElementById("profile-icon");
const createPostBtn = document.getElementById("create-post-btn");

// ---- API base helper (set window.API_BASE in HTML if API is on another origin) ----
const API_BASE = (window.API_BASE || "").replace(/\/$/, "");
const api = (path) => (API_BASE ? `${API_BASE}${path}` : path);

let currentRole = "";
let currentUsername = "";
let allPosts = [];

const token = localStorage.getItem("token");

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    currentRole = payload?.role || "";
    currentUsername = payload?.username || "";
  } catch {
    console.error("Invalid token format");
  }
}

if (token && profileEl && currentUsername) {
  fetch(api(`/users/${encodeURIComponent(currentUsername)}`), { headers: authHeaders() })
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`user ${res.status}`)))
    .then(user => {
      const avatarUrl = user.avatarUrl || "/images/profile-icon.jpg";
      profileEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="this.src='/images/profile-icon.jpg'" />`;
    })
    .catch(err => {
      console.warn("Profile fetch failed:", err);
      profileEl.innerHTML = `<img src="/images/profile-icon.jpg" alt="Profile">`;
    });
}

function getImageSrc(post) {
  if (post.coverImage) return post.coverImage; // harmless if missing
  if (post.folderName && post.assetFiles?.[0]) {
    const folder = encodeURIComponent(post.folderName);
    const file = encodeURIComponent(post.assetFiles[0]);
    return `/content/posts/${folder}/assets/${file}`;
  }
  return 'https://via.placeholder.com/300x180?text=No+Image';
}

function createPostCard(post) {
  const postDiv = document.createElement('div');
  postDiv.classList.add('post');

  const imageSrc = getImageSrc(post);
  const category = (post.categories && post.categories[0]) || 'Uncategorized';
  const safeSlug = encodeURIComponent(post.slug);

  postDiv.innerHTML = `
    <div style="position:relative;">
      <img src="${imageSrc}" alt="${post.title || 'Post Image'}" class="post-image"/>
    </div>
    <div class="post-content">
      <small>Published on ${post.publishedDate ? new Date(post.publishedDate).toLocaleDateString() : ''}</small>
      <h2><a href="/post/${safeSlug}" class="post-link" data-slug="${safeSlug}">${post.title ?? ''}</a></h2>
      <p>${post.description || ''}</p>
      <button class="category-btn" data-category="${category}">Discover Category</button>
    </div>
  `;

  postDiv.querySelector('.post-link')?.addEventListener('click', e => {
    e.preventDefault();
    window.location.href = `/post/${safeSlug}`;
  });

  postDiv.querySelector('.category-btn')?.addEventListener('click', async e => {
    const categoryClicked = e.currentTarget.getAttribute('data-category');
    if (categoryClicked) await loadPostsByCategory(categoryClicked);
  });

  return postDiv;
}

function displayPosts(posts) {
  if (!postsContainer) return;
  postsContainer.innerHTML = '';
  if (!posts || posts.length === 0) {
    postsContainer.innerHTML = `<p>No posts match your search.</p>`;
    return;
  }
  posts.forEach(post => postsContainer.appendChild(createPostCard(post)));
}

function showPostsView(title = '') {
  if (!postsContainer) return;
  postsContainer.innerHTML = title ? `<h2>${title}</h2>` : '';
  postsContainer.style.display = 'grid';
  if (backCategoryButton) backCategoryButton.style.display = title ? 'inline-block' : 'none';
}

async function loadPosts() {
  try {
    const res = await fetch(api('/api/posts'));
    if (!res.ok) throw new Error(`posts ${res.status}`);
    const posts = await res.json();

    const now = new Date();
    allPosts = (posts || []).filter(p =>
      p.status === "published" ||
      (p.status === "scheduled" && p.scheduledDate && new Date(p.scheduledDate) <= now)
    );

    showPostsView();
    displayPosts(allPosts);
  } catch (error) {
    console.error("Error loading posts:", error);
    Swal.fire({ icon: "error", title: "Failed to load posts", text: "Please try again later." });
    if (postsContainer) postsContainer.innerHTML = `<h2>Error loading posts</h2>`;
  }
}

async function loadPostsByCategory(category) {
  try {
    const res = await fetch(api(`/api/posts/categories/${encodeURIComponent(category)}`));
    if (!res.ok) throw new Error(`cat ${res.status}`);

    const posts = await res.json();
    showPostsView(`Posts in category: "${category}"`);

    const now = new Date();
    (posts || [])
      .filter(p => p.status === "published" || (p.status === "scheduled" && p.scheduledDate && new Date(p.scheduledDate) <= now))
      .forEach(post => postsContainer.appendChild(createPostCard(post)));
  } catch (err) {
    console.error("Error loading posts by category:", err);
    Swal.fire({ icon: "error", title: "Category not found", text: `No posts found for category: ${category}` });
    if (postsContainer) postsContainer.innerHTML = `<h2>No posts found for category: ${category}</h2>`;
    if (backCategoryButton) backCategoryButton.style.display = 'inline-block';
  }
}

async function loadPostsByTag(tag) {
  try {
    const res = await fetch(api(`/api/posts/tags/${encodeURIComponent(tag)}`));
    if (!res.ok) throw new Error(`tag ${res.status}`);

    const posts = await res.json();
    if (postsContainer) {
      postsContainer.innerHTML = `<h2>Posts tagged with: "${tag}"</h2>`;
      postsContainer.style.display = 'grid';
    }

    const now = new Date();
    (posts || [])
      .filter(p => p.status === "published" || (p.status === "scheduled" && p.scheduledDate && new Date(p.scheduledDate) <= now))
      .forEach(post => postsContainer.appendChild(createPostCard(post)));

    if (backCategoryButton) backCategoryButton.style.display = 'inline-block';
  } catch (err) {
    console.error("Error loading posts by tag:", err);
    Swal.fire({ icon: "error", title: "Tag not found", text: `No posts found for tag: ${tag}` });
    if (postsContainer) postsContainer.innerHTML = `<h2>No posts found for tag: ${tag}</h2>`;
  }
}

// Create button visibility (only if logged in)
if (createPostBtn) createPostBtn.style.display = "none";
if (token && currentUsername && createPostBtn) {
  createPostBtn.style.display = "inline-block";
}

function createPosts() {
  window.location.href = '/createPosts';
}

const searchInput = document.getElementById('search-input');
const sugBox = document.getElementById('search-suggestions');

let activeIndex = -1;
let visibleSuggestions = [];

const DEBOUNCE_MS = 120;

// --- helpers ---
const debounce = (fn, ms) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const highlight = (text, q) => {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return escHtml(text);
  const pre = escHtml(text.slice(0, i));
  const mid = escHtml(text.slice(i, i + q.length));
  const post = escHtml(text.slice(i + q.length));
  return `${pre}<mark>${mid}</mark>${post}`;
};

function renderSuggestions(items, q) {
  if (!sugBox) return; // guard
  visibleSuggestions = items;
  activeIndex = items.length ? 0 : -1;

  if (!items.length) {
    sugBox.classList.add('hidden');
    searchInput?.setAttribute('aria-expanded', 'false');
    sugBox.innerHTML = '';
    return;
  }

  sugBox.innerHTML = items.map((it, i) => `
    <div class="suggestion-item" role="option" id="sug-${i}" 
         aria-selected="${i === activeIndex ? 'true' : 'false'}"
         data-value="${escHtml(it.text)}">
      <span class="suggest-type">${escHtml(it.type)}</span>
      <span class="suggest-text">${highlight(it.text, q)}</span>
    </div>
  `).join('');
  sugBox.classList.remove('hidden');
  searchInput?.setAttribute('aria-expanded', 'true');
  ensureActiveVisible();
}

function setActive(i) {
  if (!sugBox) return;
  const items = [...sugBox.querySelectorAll('.suggestion-item')];
  if (!items.length) return;
  activeIndex = (i + items.length) % items.length;
  items.forEach((el, idx) => el.setAttribute('aria-selected', idx === activeIndex ? 'true' : 'false'));
  ensureActiveVisible();
}

function ensureActiveVisible() {
  if (!sugBox) return;
  const el = document.getElementById(`sug-${activeIndex}`);
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function hideSuggestions() {
  if (!sugBox) return;
  sugBox.classList.add('hidden');
  searchInput?.setAttribute('aria-expanded', 'false');
}

function applySearch(query) {
  const q = (query || '').trim();
  if (!q) {
    displayPosts(allPosts);
    history.replaceState(null, '', window.location.pathname);
    return;
  }

  fetch(api(`/api/search?q=${encodeURIComponent(q)}`))
    .then(r => {
      console.log("[/api/search] status", r.status, r.url);
      if (!r.ok) throw new Error(`search ${r.status}`);
      return r.json();
    })
    .then(results => {
      displayPosts(results || []);
      const url = new URL(window.location.href);
      url.searchParams.set('q', q);
      history.replaceState(null, '', url);
    })
    .catch(err => {
      console.error("Search failed:", err);
      Swal.fire({ icon: "error", title: "Search failed", text: "Please try again." });
    });
}

const update = debounce(() => {
  const q = (searchInput?.value || '').trim();
  if (!q || q.length < 2) { hideSuggestions(); return; }
  fetch(api(`/api/search/suggest?q=${encodeURIComponent(q)}&limit=8`))
    .then(r => {
      console.log("[/api/search/suggest] status", r.status, r.url);
      if (!r.ok) throw new Error(`suggest ${r.status}`);
      return r.json();
    })
    .then(items => renderSuggestions(items || [], q))
    .catch(() => hideSuggestions());
}, DEBOUNCE_MS);

// --- events ---
searchInput?.addEventListener('input', update);

searchInput?.addEventListener('keydown', (e) => {
  const isOpen = sugBox && !sugBox.classList.contains('hidden');
  if (e.key === 'ArrowDown' && isOpen) { e.preventDefault(); setActive(activeIndex + 1); }
  else if (e.key === 'ArrowUp' && isOpen) { e.preventDefault(); setActive(activeIndex - 1); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    if (isOpen && activeIndex >= 0) {
      const val = visibleSuggestions[activeIndex]?.text || searchInput.value;
      searchInput.value = val;
      hideSuggestions();
      applySearch(val);
    } else {
      applySearch(searchInput.value);
    }
  } else if (e.key === 'Escape') {
    hideSuggestions();
  }
});

// blur: close (after click runs)
searchInput?.addEventListener('blur', () => setTimeout(hideSuggestions, 100));

// click a suggestion
sugBox?.addEventListener('mousedown', (e) => {
  const item = e.target.closest('.suggestion-item');
  if (!item) return;
  const val = item.dataset.value || '';
  searchInput.value = val;
  hideSuggestions();
  applySearch(val);
});

// --- boot: apply ?q= if present
(() => {
  const url = new URL(window.location.href);
  const q = url.searchParams.get('q');
  if (q && searchInput) { searchInput.value = q; applySearch(q); }
})();

// Clear search on BFCache/Back
(function () {
  const clearSearch = () => {
    const box = document.getElementById('search-input');
    if (!box) return;
    box.value = '';
    document.getElementById('search-suggestions')?.classList.add('hidden');
    document.querySelector('.clear-btn')?.setAttribute('hidden', 'hidden');
    if (typeof displayPosts === 'function') displayPosts(allPosts);
  };

  const stripQueryParam = () => {
    const url = new URL(location.href);
    if (url.searchParams.has('q')) {
      url.searchParams.delete('q');
      history.replaceState(null, '', url.pathname + (url.search ? '?' + url.searchParams.toString() : ''));
    }
  };

  window.addEventListener('pageshow', (e) => {
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    const cameBack = e.persisted || nav?.type === 'back_forward' ||
                     (performance.navigation && performance.navigation.type === 2);
    if (cameBack) {
      stripQueryParam();
      clearSearch();
    }
  });

  window.addEventListener('popstate', () => {
    stripQueryParam();
    clearSearch();
  });
})();

// Handle deep links: ?tag=xyz
const urlParams = new URLSearchParams(window.location.search);
const tagParam = urlParams.get("tag");

if (tagParam) {
  loadPostsByTag(tagParam);
  backCategoryButton?.addEventListener('click', loadPosts);
} else {
  backCategoryButton?.addEventListener('click', loadPosts);
  loadPosts();
}
