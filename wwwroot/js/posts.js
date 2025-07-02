const postsContainer = document.getElementById('posts');
const postDetailsContainer = document.getElementById('post-details');
const postContent = document.getElementById('post-content');
const postAssets = document.getElementById('post-assets');
const backDetailButton = document.getElementById('back-detail-button');
const backCategoryButton = document.getElementById('back-category-button');
const profileEl = document.getElementById("profile-icon");

function createPostCard(post) {
  const postDiv = document.createElement('div');
  postDiv.classList.add('post');

  const imageSrc = post.coverImage
    || (post.folderName && post.assetFiles && post.assetFiles[0]
      ? `/content/posts/${post.folderName}/assets/${post.assetFiles[0]}`
      : 'https://via.placeholder.com/300x180?text=No+Image');

  const category = (post.categories && post.categories[0]) || 'Uncategorized';

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

  postDiv.querySelector('a.post-link').addEventListener('click', e => {
    e.preventDefault();
    loadPostDetails(post.slug);
  });

  postDiv.querySelector('.category-btn').addEventListener('click', async e => {
    e.preventDefault();
    const categoryClicked = e.target.getAttribute('data-category');
    if (categoryClicked) {
      await loadPostsByCategory(categoryClicked);
    } else {
      alert("No category found!");
    }
  });

  return postDiv;
}

async function loadPosts() {
  try {

    const res = await fetch('/posts');
    const posts = await res.json();
    console.log("Posts from API:", posts);

    postsContainer.innerHTML = '';
    postDetailsContainer.style.display = 'none';
    postsContainer.style.display = 'grid';
    backDetailButton.style.display = 'none';
    backCategoryButton.style.display = 'none';

    const now = new Date();

posts
  .filter(post => {
    if (post.status === "published") {
      return true;
    }
   if (post.status === "scheduled" && post.scheduledDate) {
  return new Date(post.scheduledDate) <= now;
}

    return false;
  })
  .forEach(post => {
    postsContainer.appendChild(createPostCard(post));
  });

  } catch (error) {
    console.error("Error loading posts:", error);
    postsContainer.innerHTML = `<h2>Error loading posts</h2>`;
    backDetailButton.style.display = 'none';
    backCategoryButton.style.display = 'none';
  }
}

async function loadPostsByCategory(category) {
  try {
    const res = await fetch(`/posts/categories/${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error(`No posts found for category: ${category}`);

    const posts = await res.json();

    postsContainer.innerHTML = `<h2>Posts in category: "${category}"</h2>`;
    postsContainer.style.display = 'grid';
    postDetailsContainer.style.display = 'none';
    backDetailButton.style.display = 'none';
    backCategoryButton.style.display = 'inline-block';

   const now = new Date();

posts
  .filter(post => {
    if (post.status === "published") {
      return true;
    }
    if (post.status === "scheduled") {
      const publishTime = new Date(post.publishedDate);
      return publishTime <= now;
    }
    return false;
  })
  .forEach(post => {
    postsContainer.appendChild(createPostCard(post));
  });

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

    postContent.innerHTML = `
      <h2>${post.title}</h2>
      <small>${new Date(post.publishedDate).toLocaleDateString()}</small>
      <div>${post.body}</div>
    `;

    postAssets.innerHTML = post.assetFiles.map(f =>
      `<img src="/content/posts/${post.folderName}/assets/${f}" />`
    ).join('');
  } catch (err) {
    console.error(err);
    alert("Cannot load post details");
  }
}

// Back button handlers
if (backDetailButton) {
  backDetailButton.addEventListener('click', () => {
    loadPosts();
  });
}

if (backCategoryButton) {
  backCategoryButton.addEventListener('click', () => {
    loadPosts();
  });
}

// Profile image logic
const token = localStorage.getItem("token");
if (token && profileEl) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const username = payload.username;

    fetch(`/users/${username}`)
      .then(res => res.json())
      .then(user => {
        const avatarUrl = user.avatarUrl || '/images/default-profile.png';
        profileEl.innerHTML = `<img src="${avatarUrl}" alt="Profile">`;
      })
      .catch(() => {
        profileEl.innerHTML = `<img src="/images/default-profile.png" alt="Profile">`;
      });
  } catch (err) {
    console.error("Invalid token format");
  }
}

// Initial load
loadPosts();
