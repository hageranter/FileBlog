const postContent = document.getElementById('post-content');
const backDetailButton = document.getElementById('back-detail-button');
const profileEl = document.getElementById("profile-icon");

let currentSlug = null;
let currentUsername = "";
let currentRole = "";

// Token & user info
const token = localStorage.getItem("token");
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    currentRole = payload?.role || "";
    currentUsername = payload?.username || "";
  } catch (err) {
    console.error("Invalid token format");
  }
}

if (token && profileEl && currentUsername) {
  fetch(`/users/${currentUsername}`)
    .then(res => res.json())
    .then(user => {
      const avatarUrl = user.avatarUrl || '/images/avatar.png';
      profileEl.innerHTML = `<img src="${avatarUrl}" alt="Profile">`;
    })
    .catch(() => {
      profileEl.innerHTML = `<img src="/images/avatar.png" alt="Profile">`;
    });
}

function getSlugFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug");
}

function getImageSrc(post) {
  if (post.coverImage) return post.coverImage;
  if (post.folderName && post.assetFiles?.[0])
    return `/content/posts/${post.folderName}/assets/${post.assetFiles[0]}`;
  return 'https://via.placeholder.com/600x300?text=No+Image';
}

async function loadPostDetails(slug) {
  try {
    currentSlug = slug;
    const res = await fetch(`/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("Post not found");

    const post = await res.json();
    const imageSrc = getImageSrc(post);
    const avatarUrl = post.avatarUrl || "/images/avatar.png";
    const username = post.username || "Unknown";

    postContent.innerHTML = `
      <div class="post-main-content">
        <div class="post-meta">
          <div class="author-info">
            <img class="post-user-avatar" src="${avatarUrl}" alt="${username}'s avatar" />
            <span class="post-username">@${username}</span>
            <span class="post-date">${new Date(post.publishedDate).toLocaleDateString()}</span>
          </div>

          ${currentUsername === post.username ? `
            <div class="post-menu-wrapper">
              <button class="menu-icon" onclick="toggleMenu(this)">⋮</button>
              <ul class="menu hidden">
                <li onclick="enableDetailEdit(this)">Edit</li>
              </ul>
            </div>
          ` : ''}
        </div>

        <h1 id="detail-title" contenteditable="false">${post.title}</h1>
        <div class="post-hero">
          <img src="${imageSrc}" alt="Post cover" class="post-hero-image" />
        </div>
        <div id="detail-body" class="post-body" contenteditable="false">${post.body}</div>

        <div class="post-tags">
          ${(post.tags || []).map(tag => `<span class="tag" data-tag="${tag}">#${tag}</span>`).join(' ')}
        </div>

        <button id="save-detail-btn" class="hidden">Save</button>
      </div>
    `;

    document.querySelectorAll('.tag').forEach(tagEl => {
      tagEl.addEventListener('click', e => {
        const tag = e.target.dataset.tag;
        if (tag) window.location.href = `/posts.html?tag=${encodeURIComponent(tag)}`;
      });
    });

    const saveBtn = document.getElementById("save-detail-btn");
    saveBtn.onclick = async () => {
      const titleEl = document.getElementById('detail-title');
      const bodyEl = document.getElementById('detail-body');

      titleEl.setAttribute('contenteditable', 'false');
      bodyEl.setAttribute('contenteditable', 'false');
      saveBtn.classList.add('hidden');

      const newTitle = titleEl.innerText.trim();
      const newBody = bodyEl.innerHTML.trim();

      try {
        const res = await fetch(`/posts/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle, body: newBody })
        });

        if (!res.ok) throw new Error("Failed to save");
        alert("Post updated successfully!");
      } catch (err) {
        console.error("Save failed:", err);
        alert("Error saving post");
      }
    };

  } catch (err) {
    console.error("Error loading post details:", err);
    postContent.innerHTML = `<p>Failed to load post</p>`;
  }
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
}

document.getElementById("back-detail-button").addEventListener("click", () => {
  window.location.href = "/posts.html";
});

const slug = getSlugFromURL();
if (slug) loadPostDetails(slug);
else postContent.innerHTML = `<p>No post slug provided.</p>`;

