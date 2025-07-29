const postsContainer = document.getElementById('posts');
const backCategoryButton = document.getElementById('back-category-button');
const profileEl = document.getElementById("profile-icon");
const createPostBtn = document.getElementById("create-post-btn");

let currentRole = "";
let currentUsername = "";
let allPosts = [];

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
      const avatarUrl = user.avatarUrl || "/images/avatar.png";
      profileEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="this.src='/images/avatar.png'" />`;
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
      <h2><a href="/posts/${post.slug}" class="post-link" data-slug="${post.slug}">${post.title}</a></h2>
      <p>${post.description || ''}</p>
      <button class="category-btn" data-category="${category}">Discover Category</button>
    </div>
  `;

  postDiv.querySelector('.post-link')?.addEventListener('click', e => {
    e.preventDefault();
    window.location.href = `/postDetail.html?slug=${encodeURIComponent(post.slug)}`;
  });

  postDiv.querySelector('.category-btn')?.addEventListener('click', async e => {
    const categoryClicked = e.target.getAttribute('data-category');
    if (categoryClicked) await loadPostsByCategory(categoryClicked);
  });

  return postDiv;
}

function displayPosts(posts) {
  postsContainer.innerHTML = '';
  if (posts.length === 0) {
    postsContainer.innerHTML = `<p>No posts match your search.</p>`;
    return;
  }
  posts.forEach(post => postsContainer.appendChild(createPostCard(post)));
}

function showPostsView(title = '') {
  postsContainer.innerHTML = title ? `<h2>${title}</h2>` : '';
  postsContainer.style.display = 'grid';
  backCategoryButton.style.display = title ? 'inline-block' : 'none';
}

async function loadPosts() {
  try {
    const res = await fetch('/posts');
    const posts = await res.json();

    allPosts = posts.filter(p =>
      p.status === "published" ||
      (p.status === "scheduled" && new Date(p.scheduledDate) <= new Date())
    );

    showPostsView();
    displayPosts(allPosts);
  } catch (error) {
    console.error("Error loading posts:", error);
    Swal.fire({
      icon: "error",
      title: "Failed to load posts",
      text: "Please try again later.",
    });
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
    Swal.fire({
      icon: "error",
      title: "Category not found",
      text: `No posts found for category: ${category}`,
    });
    postsContainer.innerHTML = `<h2>No posts found for category: ${category}</h2>`;
    backCategoryButton.style.display = 'inline-block';
  }
}

async function loadPostsByTag(tag) {
  try {
    const res = await fetch(`/posts/tags/${encodeURIComponent(tag)}`);
    if (!res.ok) throw new Error(`No posts found for tag: ${tag}`);

    const posts = await res.json();
    postsContainer.innerHTML = `<h2>Posts tagged with: "${tag}"</h2>`;
    postsContainer.style.display = 'grid';

    const now = new Date();
    posts
      .filter(p => p.status === "published" || (p.status === "scheduled" && new Date(p.publishedDate) <= now))
      .forEach(post => postsContainer.appendChild(createPostCard(post)));

    backCategoryButton.style.display = 'inline-block';
  } catch (err) {
    console.error("Error loading posts by tag:", err);
    Swal.fire({
      icon: "error",
      title: "Tag not found",
      text: `No posts found for tag: ${tag}`,
    });
    postsContainer.innerHTML = `<h2>No posts found for tag: ${tag}</h2>`;
  }
}

if (createPostBtn) createPostBtn.style.display = "none";
if (token && currentUsername) {
  createPostBtn.style.display = "inline-block";
}

function createPosts() {
  window.location.href = '/createPosts.html';
}

const searchInput = document.getElementById('search-input');
searchInput?.addEventListener('input', e => {
  const keyword = e.target.value.toLowerCase();
  const filteredPosts = allPosts.filter(post =>
    post.title.toLowerCase().includes(keyword) ||
    post.description?.toLowerCase().includes(keyword) ||
    (post.tags || []).some(tag => tag.toLowerCase().includes(keyword))
  );
  displayPosts(filteredPosts);
});

// Router on load
const urlParams = new URLSearchParams(window.location.search);
const tagParam = urlParams.get("tag");

if (tagParam) {
  loadPostsByTag(tagParam);
  backCategoryButton?.addEventListener('click', loadPosts);
} else {
  backCategoryButton?.addEventListener('click', loadPosts);
  loadPosts();
}
