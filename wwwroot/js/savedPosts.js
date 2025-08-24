// MyBlog - Saved Posts
console.log("[savedPosts] loaded");

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

// ---- helpers
function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function ensureLoggedIn(container) {
  const token = localStorage.getItem("token");
  if (!token) {
    container.innerHTML = `<p class="empty-message">Please <a href="/login">log in</a> to see your saved posts.</p>`;
    return null;
  }
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return null;
    }
  } catch {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return null;
  }
  return token;
}

function getImageSrc(post) {
  if (post.coverImage) return post.coverImage;
  if (post.folderName && post.assetFiles?.[0]) {
    const folder = encodeURIComponent(post.folderName);
    const file = encodeURIComponent(post.assetFiles[0]);
    return `/content/posts/${folder}/assets/${file}`;
  }
  return "/images/default-thumbnail.jpg";
}

function postCardHTML(post) {
  const img = getImageSrc(post);
  const slug = encodeURIComponent(post.slug);
  const title = post.title || "Untitled";
  const desc = post.description || "";
  const dateStr = post.publishedDate ? new Date(post.publishedDate).toLocaleDateString() : "";
  return `
    <a class="post-card" href="/post/${slug}">
      <div class="post-image">
        <img src="${img}" alt="${title}">
      </div>
      <div class="post-body">
        <small>${dateStr}</small>
        <h3>${title}</h3>
        <p>${desc}</p>
      </div>
    </a>
  `;
}

// ---- render
function renderSavedPosts(posts) {
  const grid = document.getElementById("savedBlogs");
  if (!grid) return;

  // remove the placeholder
  grid.innerHTML = "";

  if (!Array.isArray(posts) || posts.length === 0) {
    grid.innerHTML = `<p class="empty-message">You have not saved any posts yet.</p>`;
    return;
  }

  const now = new Date();
  const visible = posts.filter(
    p => p.status === "published" ||
         (p.status === "scheduled" && p.scheduledDate && new Date(p.scheduledDate) <= now)
  );

  if (visible.length === 0) {
    grid.innerHTML = `<p class="empty-message">You haven't saved any published posts yet.</p>`;
    return;
  }

  grid.innerHTML = visible.map(postCardHTML).join("");
}

// ---- load
async function loadSavedPosts() {
  const grid = document.getElementById("savedBlogs");
  if (!grid) return;

  const token = ensureLoggedIn(grid);
  if (!token) return;

  try {
    const res = await fetch("/api/posts/saved", { headers: { ...authHeaders() } });
    console.log("[savedPosts] GET /api/posts/saved ->", res.status);
    if (res.status === 401 || res.status === 403) {
      grid.innerHTML = `<p class="empty-message">Session expired. Please <a href="/login">log in</a> again.</p>`;
      return;
    }
    if (!res.ok) throw new Error("Failed to load saved posts");
    const posts = await res.json();
    renderSavedPosts(posts);
  } catch (e) {
    console.error("[savedPosts] error:", e);
    grid.innerHTML = `<p class="empty-message">Couldn’t load saved posts. Please try again later.</p>`;
  }
}



// ---- boot when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadSavedPosts);
} else {
  loadSavedPosts();
}

function createPosts() {
  window.location.href = '/createPosts';
}
