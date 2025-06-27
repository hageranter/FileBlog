const postsContainer = document.getElementById('posts');
const postDetailsContainer = document.getElementById('post-details');
const postContent = document.getElementById('post-content');
const postAssets = document.getElementById('post-assets');
const backButton = document.getElementById('back-button');
const avatarUploadInput = document.getElementById('avatar-upload'); // To select avatar image

async function loadPosts() {
  try {
    const res = await fetch('/posts');
    const posts = await res.json();

    postsContainer.innerHTML = '';
    postDetailsContainer.style.display = 'none';
    postsContainer.style.display = 'block';

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
        <p>${post.description}</p>
        <p><strong>Tags:</strong> ${tagsHtml}</p>
        <p><strong>Categories:</strong> ${categoriesHtml}</p>
        <hr />
      `;

      // Attach click handler to show post details inline
      postDiv.querySelector('a.post-link').addEventListener('click', e => {
        e.preventDefault();
        const slug = e.target.dataset.slug;
        loadPostDetails(slug);
      });

      postsContainer.appendChild(postDiv);
    });

    addFilterListeners();
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}

async function loadPostDetails(slug) {
  try {
    const res = await fetch(`/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("Post not found");

    const post = await res.json();

    postsContainer.style.display = 'none';
    postDetailsContainer.style.display = 'block';

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

async function loadPostsByTag(tag) {
  try {
    const res = await fetch(`/posts/tags/${encodeURIComponent(tag)}`);
    if (!res.ok) {
      postsContainer.innerHTML = `<h2>No posts found for tag: ${tag}</h2>`;
      postDetailsContainer.style.display = 'none';
      postsContainer.style.display = 'block';
      return;
    }

    const posts = await res.json();
    postsContainer.innerHTML = `<h2>Posts tagged with "${tag}"</h2>`;
    postsContainer.style.display = 'block';
    postDetailsContainer.style.display = 'none';

    displayPosts(posts);
  } catch (error) {
    console.error("Error loading posts by tag:", error);
  }
}

async function loadPostsByCategory(category) {
  try {
    const res = await fetch(`/posts/categories/${encodeURIComponent(category)}`);
    if (!res.ok) {
      postsContainer.innerHTML = `<h2>No posts found for category: ${category}</h2>`;
      postDetailsContainer.style.display = 'none';
      postsContainer.style.display = 'block';
      return;
    }

    const posts = await res.json();
    postsContainer.innerHTML = `<h2>Posts in category "${category}"</h2>`;
    postsContainer.style.display = 'block';
    postDetailsContainer.style.display = 'none';

    displayPosts(posts);
  } catch (error) {
    console.error("Error loading posts by category:", error);
  }
}

function displayPosts(posts) {
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
      <p>${post.description}</p>
      <p><strong>Tags:</strong> ${tagsHtml}</p>
      <p><strong>Categories:</strong> ${categoriesHtml}</p>
      <hr />
    `;

    postDiv.querySelector('a.post-link').addEventListener('click', e => {
      e.preventDefault();
      const slug = e.target.dataset.slug;
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
      const tag = e.target.getAttribute('data-tag');
      await loadPostsByTag(tag);
    });
  });

  document.querySelectorAll('a.filter-category').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      const category = e.target.getAttribute('data-category');
      await loadPostsByCategory(category);
    });
  });
}

if (backButton) {
  backButton.addEventListener('click', () => {
    postDetailsContainer.style.display = 'none';
    postsContainer.style.display = 'block';
  });
}

// Check if specific post requested in URL (e.g., ?slug=xyz)
const params = new URLSearchParams(window.location.search);
const slugParam = params.get('slug');

if (slugParam) {
  loadPostDetails(slugParam);
} else {
  loadPosts();
}

token = localStorage.getItem("token");
profileEl = document.getElementById("profile-icon");

if (token && profileEl) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const username = payload.username;

    fetch(`/users/${username}`)
      .then(res => res.json())
      .then(user => {
        const avatarUrl = user.avatarUrl || '/images/default-profile.png';

        profileEl.innerHTML = `
            <img src="${avatarUrl}" alt="Profile">
          `;
      })
      .catch(() => {
        profileEl.innerHTML = `
            <img src="/images/default-profile.png" alt="Profile">
          `;
      });

  } catch (err) {
    console.error("Invalid token format");
  }
}

