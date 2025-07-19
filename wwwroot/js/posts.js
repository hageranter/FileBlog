const postsContainer = document.getElementById('posts');
const postDetailsContainer = document.getElementById('post-details');
const postContent = document.getElementById('post-content');
const postAssets = document.getElementById('post-assets');
const backDetailButton = document.getElementById('back-detail-button');
const backCategoryButton = document.getElementById('back-category-button');
const profileEl = document.getElementById("profile-icon");
const createPostBtn = document.getElementById("create-post-btn");

let currentRole = "";
let currentUsername = "";

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

function getImageSrc(post) {
  if (post.coverImage) return post.coverImage;
  if (post.folderName && post.assetFiles?.[0])
    return `/content/posts/${post.folderName}/assets/${post.assetFiles[0]}`;
  return 'https://via.placeholder.com/300x180?text=No+Image';
}

function createPostCard(post) {
  const postDiv = document.createElement('div');
  postDiv.classList.add('post');

  const imageSrc = getImageSrc(post);
  const category = post.categories?.[0] || 'Uncategorized';

  postDiv.innerHTML = `
    <div style="position:relative;">
      <img src="${imageSrc}" alt="Post image">
      <span class="category">${category}</span>
    </div>
    <div class="post-content">
      <small>Published on ${new Date(post.publishedDate).toLocaleDateString()} • ${post.saves || 0} saves</small>
      <h2><a href="#" class="post-link" data-slug="${post.slug}">${post.title}</a></h2>
      <p>${post.description || ''}</p>
      <button class="category-btn" data-category="${category}">Discover Category</button>
    </div>
  `;

  postDiv.querySelector('.post-link')?.addEventListener('click', e => {
    e.preventDefault();
    loadPostDetails(post.slug);
  });

  postDiv.querySelector('.category-btn')?.addEventListener('click', async e => {
    const categoryClicked = e.target.getAttribute('data-category');
    if (categoryClicked) await loadPostsByCategory(categoryClicked);
  });

  return postDiv;
}

function showPostsView(title = '') {
  postsContainer.innerHTML = title ? `<h2>${title}</h2>` : '';
  postsContainer.style.display = 'grid';
  postDetailsContainer.style.display = 'none';
  backDetailButton.style.display = 'none';
  backCategoryButton.style.display = title ? 'inline-block' : 'none';
}

async function loadPosts() {
  try {
    const res = await fetch('/posts');
    const posts = await res.json();

    showPostsView();
    const now = new Date();

    posts
      .filter(p => p.status === "published" || (p.status === "scheduled" && new Date(p.scheduledDate) <= now))
      .forEach(post => postsContainer.appendChild(createPostCard(post)));

  } catch (error) {
    console.error("Error loading posts:", error);
    postsContainer.innerHTML = `<h2>Error loading posts</h2>`;
  }
}

async function loadPostsByCategory(category) {
  try {
    const res = await fetch(`/posts/categories/${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error(`No posts found for category: ${category}`);

    const posts = await res.json();
    showPostsView(`Posts in category: "${category}"`);

    const now = new Date();
    posts
      .filter(p => p.status === "published" || (p.status === "scheduled" && new Date(p.publishedDate) <= now))
      .forEach(post => postsContainer.appendChild(createPostCard(post)));

  } catch (err) {
    console.error("Error loading posts by category:", err);
    postsContainer.innerHTML = `<h2>No posts found for category: ${category}</h2>`;
    backCategoryButton.style.display = 'inline-block';
  }
}

async function loadPostDetails(slug) {
  try {
    const res = await fetch(`/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("Post not found");

    const post = await res.json();
    postsContainer.style.display = 'none';
    postDetailsContainer.style.display = 'block';
    backDetailButton.style.display = 'inline-block';
    backCategoryButton.style.display = 'none';

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
        <button id="save-detail-btn" class="hidden">Save</button>
      </div>
    `;

  } catch (err) {
    console.error("Error loading post details:", err);
    alert("Cannot load post details");
  }
}

if (createPostBtn) createPostBtn.style.display = "none";

if (token && currentUsername) {
  createPostBtn.style.display = "inline-block"; 
}

function createPosts() {
  window.location.href = '/createPosts.html';
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

    console.log('Saving edits:', newTitle, newBody);

    // TODO: Replace with actual PUT or PATCH API request
  };
}

backDetailButton?.addEventListener('click', loadPosts);
backCategoryButton?.addEventListener('click', loadPosts);

loadPosts();
