const postContent = document.getElementById('post-content');
const commentList = document.getElementById("comment-list");
const commentInput = document.getElementById("comment-input");
const commentButton = document.getElementById("post-comment-btn");
const profileEl = document.getElementById("profile-icon");

let currentSlug = null;
let currentUsername = "";
let currentRole = "";
let postAuthor = "";

const token = localStorage.getItem("token");
let isAdmin = false;
let isEditor = false;

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ---------- SAFE RENDER HELPERS (NEW) ---------- */
function decodeHtmlEntities(str = "") {
  const ta = document.createElement("textarea");
  ta.innerHTML = str;
  return ta.value;
}

function renderPostBody(raw = "") {
  let src = String(raw);

  const looksEncodedHtml = /&lt;|&#60;/.test(src); // e.g., &lt;p&gt;
  const looksRawHtml     = /<[^>]+>/.test(src);   // e.g., <p>

  // 1) If HTML is entity-encoded, decode first
  if (looksEncodedHtml) src = decodeHtmlEntities(src);

  // 2) If not HTML after decoding, treat as Markdown -> HTML
  if (!looksRawHtml && window.marked) {
    src = marked.parse(src);
  }

  // 3) Sanitize before injecting
  if (window.DOMPurify) {
    src = DOMPurify.sanitize(src, {
      ALLOWED_ATTR: ['href','target','rel','title','alt','src','class','id'],
      ALLOWED_TAGS: [
        'p','br','strong','em','u','s','a','img','code','pre','blockquote',
        'ul','ol','li','h1','h2','h3','h4','h5','h6','hr','span','div','table',
        'thead','tbody','tr','th','td'
      ]
    });
  }
  return src;
}
/* ---------- END SAFE RENDER HELPERS ---------- */

// ---- Auth bootstrap ----
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    currentRole = payload?.role || "";
    currentUsername = payload?.username || "";
    isAdmin = currentRole?.toLowerCase() === "admin";
    isEditor = currentRole?.toLowerCase() === "editor";
  } catch {
    console.error("Invalid token format");
  }
}

if (token && profileEl && currentUsername) {
  fetch(`/users/${encodeURIComponent(currentUsername)}`, { headers: authHeaders() })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(user => {
      const avatarUrl = user.avatarUrl || "/images/profile-icon.jpg";
      profileEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="this.src='/images/profile-icon.jpg'" />`;
    })
    .catch(() => {
      profileEl.innerHTML = `<img src="/images/profile-icon.jpg" alt="Profile">`;
    });
}

// ---- Utilities ----
function getSlugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
}

function getImageSrc(post) {
  if (post.coverImage) return post.coverImage;
  if (post.folderName && post.assetFiles?.[0]) {
    const folder = encodeURIComponent(post.folderName);
    const file = encodeURIComponent(post.assetFiles[0]);
    return `/content/posts/${folder}/assets/${file}`;
  }
  return 'https://via.placeholder.com/1200x400?text=No+Image';
}

function animateElement(el) {
  el.classList.add('animate');
  setTimeout(() => el.classList.remove('animate'), 400);
}

// ---- Comments ----
async function loadComments(slug) {
  if (!commentList) return;
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(slug)}/comments`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to load comments");
    const rawComments = await res.json();

    const comments = (rawComments || []).map(c => {
      const type = c.Type || c.type || "public";
      return {
        username: c.Username || c.username,
        commentText: c.CommentText || c.commentText || "",
        date: c.Date || c.date,
        avatarUrl: c.AvatarUrl || c.avatarUrl,
        type,
        visibleToAuthorOnly: (typeof c.VisibleToAuthorOnly === "boolean")
          ? c.VisibleToAuthorOnly
          : type === "review",
      };
    });

    if (!comments.length) {
      commentList.innerHTML = `<li>No comments yet. Be the first to comment!</li>`;
      return;
    }

    commentList.innerHTML = comments
      .filter(c => !(c.type === "review" && c.visibleToAuthorOnly && currentUsername !== postAuthor))
      .map(c => `
        <li class="comment-item">
          <img src="${c.avatarUrl || '/images/profile-icon.jpg'}" class="comment-avatar" onerror="this.src='/images/profile-icon.jpg'"/>
          <div class="comment-content">
            <span class="comment-username">
              ${c.username ?? 'Unknown'}
              ${c.type === "review" ? `<span class="editor-label">Editor <img src="/images/verified-icon.jpg" alt="Verified" /></span>` : ""}
            </span>
            <div class="comment-text">
               ${c.type === "review" ? `<strong>[Editor Feedback]</strong><br>` : ""}
               ${window.marked ? marked.parse(c.commentText) : c.commentText}
            </div>
            <div class="comment-meta">${c.date ? new Date(c.date).toLocaleString() : ""}</div>
          </div>
        </li>
      `)
      .join("");
  } catch (err) {
    console.error("Error loading comments:", err);
  }
}

// ---- Publish (tries multiple endpoints) ----
async function publishPost(slug) {
  const headersBase = { 'Content-Type': 'application/json', ...authHeaders() };
  const attempts = [
    { url: `/api/posts/${encodeURIComponent(slug)}/status`, method: 'PATCH', body: { status: 'published' } },
    { url: `/api/posts/${encodeURIComponent(slug)}/publish`, method: 'POST', body: {} },
    { url: `/api/posts/${encodeURIComponent(slug)}`, method: 'PATCH', body: { status: 'published' } },
    { url: `/api/posts/${encodeURIComponent(slug)}/status`, method: 'PUT', body: { status: 'published' } },
    { url: `/api/posts/${encodeURIComponent(slug)}`, method: 'PUT', body: { status: 'published' } },
  ];
  let lastErr = 'Unknown error';
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, { method: a.method, headers: headersBase, body: JSON.stringify(a.body) });
      if (res.ok) return res;
      lastErr = await res.text().catch(() => res.statusText);
      if (res.status === 404 || res.status === 405) continue;
    } catch (e) { lastErr = e.message; }
  }
  throw new Error(lastErr);
}

// ---- Post Details ----
async function loadPostDetails(slug) {
  try {
    currentSlug = slug;
    const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("Post not found");

    const post = await res.json();
    postAuthor = post.username;

    const imageSrc = getImageSrc(post);
    const username = post.username || "Unknown";
    const safeBodyHtml = renderPostBody(post.body || ""); // <-- NEW: render safely

    let avatarUrl = "/images/profile-icon.jpg";
    try {
      const avatarRes = await fetch(`/users/${encodeURIComponent(post.username)}`, { headers: authHeaders() });
      if (avatarRes.ok) {
        const userData = await avatarRes.json();
        if (userData.avatarUrl) avatarUrl = userData.avatarUrl;
      }
    } catch {}

    const menuHtml = (currentUsername === post.username || isAdmin)
      ? `
        <div class="post-menu-wrapper">
          <button class="menu-icon" onclick="toggleMenu(this)">⋮</button>
          <ul class="menu hidden">
            <li onclick="enableDetailEdit()">Edit</li>
            <li onclick="confirmDeletePost()">Delete</li>
          </ul>
        </div>
      `
      : "";

    if (postContent) {
      postContent.innerHTML = `
        <article class="post-full">
          <div class="post-meta">
            <div class="author-info">
              <img class="post-user-avatar" src="${avatarUrl}" alt="${username}'s avatar" onerror="this.src='/images/profile-icon.jpg'"/>
              <span class="post-username">${username}</span>
              <span class="post-date">${post.publishedDate ? new Date(post.publishedDate).toLocaleDateString() : "—"}</span>
            </div>
            ${menuHtml}
          </div>

          <h1 id="detail-title" contenteditable="false">${post.title}</h1>
          <div class="post-hero">
            <img src="${imageSrc}" alt="Post cover" class="post-hero-image" />
          </div>

          <!-- RENDERED + SANITIZED BODY (NEW) -->
          <div id="detail-body" class="post-body" contenteditable="false">
            ${safeBodyHtml}
          </div>

          <div class="post-actions">
            ${
              post.status === "draft"
                ? `<button id="publish-btn" class="publish-btn">Publish</button>`
                : `
                  <button id="like-btn" class="action-btn"><span class="heart">❤️</span> 
                    <span id="like-count">${post.likes || 0}</span>
                  </button>
                  <button id="save-btn" class="action-btn">
                    ${(post.savedBy || []).includes(currentUsername) ? '💾 Saved' : '💾 Save'}
                  </button>
                `
            }
          </div>

          <button id="save-detail-btn" class="hidden">Save</button>
        </article>
      `;
    }

    // hide comments if draft
    const commentsEl = document.querySelector(".comments-section");
    if (commentsEl) commentsEl.style.display = (post.status === "draft") ? "none" : "";

    // Tag navigation — use query string instead of path
    document.querySelectorAll('.tag').forEach(tagEl => {
      tagEl.addEventListener('click', e => {
        const tag = (e.currentTarget.dataset.tag || '').trim();
        if (tag) window.location.href = `/posts?tag=${encodeURIComponent(tag)}`;
      });
    });

    // like/save binding (only present when published)
    bindLikeSaveHandlers(slug);

    // publish button handler (only present when draft)
    const publishBtn = document.getElementById("publish-btn");
    if (publishBtn) {
      publishBtn.addEventListener("click", async () => {
        try {
          const res = await publishPost(slug);
          if (!res.ok) throw new Error("Failed to publish");
          await Swal.fire({ icon: "success", title: "Published!", text: "Your post is now live." });

          // swap UI: remove publish, add like/save, show comments
          publishBtn.parentElement.innerHTML = `
            <button id="like-btn" class="action-btn"><span class="heart">❤️</span> 
              <span id="like-count">0</span>
            </button>
            <button id="save-btn" class="action-btn">💾 Save</button>
          `;
          if (commentsEl) commentsEl.style.display = "";

          // rebind like/save + (optionally) reload comments
          bindLikeSaveHandlers(slug);
          loadComments(slug).catch(() => {});
        } catch (err) {
          Swal.fire({ icon: "error", title: "Error", text: err.message || "Could not publish post." });
        }
      });
    }

    // load comments if published
    if (post.status !== "draft") {
      await loadComments(slug);
    }

  } catch (err) {
    console.error("Error loading post details:", err);
    if (postContent) postContent.innerHTML = `<p>Failed to load post</p>`;
    Swal.fire({ icon: "error", title: "Error loading post", text: "The post could not be found or loaded." });
  }
}

// ---- Like/Save handlers ----
function bindLikeSaveHandlers(slug) {
  const likeBtn = document.getElementById("like-btn");
  likeBtn?.addEventListener("click", async () => {
    if (!token) {
      return Swal.fire({ icon: "warning", title: "Login required", text: "Log in to like posts." });
    }
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}/like`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to toggle like");
      const updated = await res.json();
      document.getElementById("like-count").innerText = updated.likes;
      const heart = likeBtn.querySelector(".heart");
      if (heart) heart.style.color = (updated.likedBy || []).includes(currentUsername) ? "deeppink" : "inherit";
      animateElement(likeBtn);
    } catch {}
  });

  const saveBtn = document.getElementById("save-btn");
  saveBtn?.addEventListener("click", async () => {
    if (!token) {
      return Swal.fire({ icon: "warning", title: "Login required", text: "Log in to save posts." });
    }
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}/save`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to toggle save");
      const updated = await res.json();
      saveBtn.innerText = (updated.savedBy || []).includes(currentUsername) ? '💾 Saved' : '💾 Save';
      animateElement(saveBtn);
    } catch {}
  });
}

// ---- Menu + Editing + Delete ----
function toggleMenu(buttonEl) {
  const menu = buttonEl?.nextElementSibling;
  if (menu) menu.classList.toggle('hidden');
}

function enableDetailEdit() {
  const titleEl = document.getElementById('detail-title');
  const bodyEl = document.getElementById('detail-body');
  const saveDetailBtn = document.getElementById('save-detail-btn');
  if (!titleEl || !bodyEl || !saveDetailBtn) return;

  titleEl.setAttribute('contenteditable', 'true');
  bodyEl.setAttribute('contenteditable', 'true');
  saveDetailBtn.classList.remove('hidden');

  // Save handler (PATCH current slug)
  saveDetailBtn.onclick = async () => {
    const newTitle = titleEl.innerText.trim();
    const newBody = bodyEl.innerHTML.trim();
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(currentSlug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title: newTitle, body: newBody })
      });
      if (!res.ok) throw new Error("Failed to save changes");
      await Swal.fire({ icon: "success", title: "Post updated", text: "Your changes have been saved." });
      titleEl.setAttribute('contenteditable', 'false');
      bodyEl.setAttribute('contenteditable', 'false');
      saveDetailBtn.classList.add('hidden');
    } catch (e) {
      Swal.fire({ icon: "error", title: "Error", text: e.message || "Could not save changes." });
    }
  };
}

async function confirmDeletePost() {
  if (!currentSlug) {
    await Swal.fire({ icon: "error", title: "Missing post identifier." });
    return;
  }

  const { isConfirmed } = await Swal.fire({
    title: "Delete this post?",
    text: "This action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    confirmButtonColor: "#d33"
  });

  if (!isConfirmed) return;

  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(currentSlug)}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (!res.ok) throw new Error("Failed to delete post");

    await Swal.fire({
      icon: "success",
      title: "Post deleted",
      text: "The post was successfully deleted."
    });

    window.location.href = "/posts";
  } catch (e) {
    await Swal.fire({
      icon: "error",
      title: "Error",
      text: e?.message || "Failed to delete the post."
    });
  }
}

// ---- New comment submit ----
commentButton?.addEventListener("click", async () => {
  const text = (commentInput?.value || "").trim();
  if (!text) return;
  if (!token) {
    Swal.fire({ icon: "warning", title: "Login required", text: "You must be logged in to comment." });
    return;
  }
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(currentSlug)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ comment: text }),
    });
    if (!res.ok) throw new Error("Failed to post comment");
    if (commentInput) commentInput.value = "";
    await loadComments(currentSlug);
  } catch {
    Swal.fire({ icon: "error", title: "Error", text: "Couldn't post comment." });
  }
});

// ---- Expose handlers used by inline HTML ----
window.toggleMenu = toggleMenu;
window.enableDetailEdit = enableDetailEdit;
window.confirmDeletePost = confirmDeletePost;

// ---- Boot ----
const slug = getSlugFromPath();
if (slug) loadPostDetails(slug);
else if (postContent) postContent.innerHTML = `<p>No post slug provided.</p>`;
