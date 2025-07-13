const postsContainer = document.getElementById('posts');
const postDetailsContainer = document.getElementById('post-details');
const postContent = document.getElementById('post-content');
const postAssets = document.getElementById('post-assets');
const backDetailButton = document.getElementById('back-detail-button');
const backCategoryButton = document.getElementById('back-category-button');
const profileEl = document.getElementById("profile-icon");

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
      ${currentRole === "Admin" && post.id ? `
        <button class="delete-btn" data-id="${post.id}" data-username="${post.username}">🗑 Delete</button>
      ` : ''}
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


  const deleteBtn = postDiv.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm("Are you sure you want to delete this post?")) return;

      try {
        const res = await fetch(`/admin/users/${deleteBtn.dataset.username}/posts/${deleteBtn.dataset.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          alert("Post deleted successfully.");
          postDiv.remove();
        } else {
          const err = await res.text();
          alert("Failed to delete post: " + err);
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("An error occurred while deleting the post.");
      }
    });
  }

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

    const avatarUrl = post.avatarUrl || "/images/avatar.png";
    const username = post.username || "Unknown";

    postContent.innerHTML = `
      <div class="post-user-info">
        <img class="post-user-avatar" src="${avatarUrl}" alt="${username}'s avatar" />
        <span class="post-username">@${username}</span>
      </div>
      <h2>${post.title}</h2>
      <small>${new Date(post.publishedDate).toLocaleDateString()}</small>
      <div>${post.body}</div>
    `;

    postAssets.innerHTML = post.assetFiles.map(f =>
      `<img src="/content/posts/${post.folderName}/assets/${f}" />`
    ).join('');
  } catch (err) {
    console.error("Error loading post details:", err);
    alert("Cannot load post details");
  }
}


backDetailButton?.addEventListener('click', loadPosts);
backCategoryButton?.addEventListener('click', loadPosts);

loadPosts();
