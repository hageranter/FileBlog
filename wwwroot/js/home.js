const postsContainer = document.getElementById('posts');
const postDetailsContainer = document.getElementById('post-details');
const postContent = document.getElementById('post-content');
const backButton = document.getElementById('back-button');

async function loadPosts() {
  const res = await fetch('/posts');
  const posts = await res.json();

  postsContainer.innerHTML = '';
  postDetailsContainer.style.display = 'none';
  postsContainer.style.display = 'block';

  posts.forEach(post => {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');

    // Create clickable links for tags and categories
    const tagsHtml = (post.tags || []).map(tag => `<a href="#" class="filter-tag" data-tag="${tag}">${tag}</a>`).join(', ') || 'None';
    const categoriesHtml = (post.categories || []).map(cat => `<a href="#" class="filter-category" data-category="${cat}">${cat}</a>`).join(', ') || 'None';

    postDiv.innerHTML = `
      <h2><a href="#" data-slug="${post.slug}">${post.title}</a></h2>
      <small>Published on ${new Date(post.publishedDate).toLocaleDateString()}</small>
      <p>${post.description}</p>
      <p><strong>Tags:</strong> ${tagsHtml}</p>
      <p><strong>Categories:</strong> ${categoriesHtml}</p>
      <hr />
    `;

    postsContainer.appendChild(postDiv);
  });

  // Post title click -> load details
  document.querySelectorAll('#posts a[data-slug]').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      const slug = e.target.getAttribute('data-slug');
      await loadPostDetails(slug);
    });
  });

  // Tag click -> filter by tag
  document.querySelectorAll('a.filter-tag').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      const tag = e.target.getAttribute('data-tag');
      await loadPostsByTag(tag);
    });
  });

  // Category click -> filter by category
  document.querySelectorAll('a.filter-category').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      const category = e.target.getAttribute('data-category');
      await loadPostsByCategory(category);
    });
  });
}

async function loadPostDetails(slug) {
  const res = await fetch(`/posts/${slug}`);
  if (!res.ok) {
    alert('Post not found');
    return;
  }
  const post = await res.json();

  postsContainer.style.display = 'none';
  postDetailsContainer.style.display = 'block';

  // Create clickable links for tags and categories in details view
  const tagsHtml = (post.tags || []).map(tag => `<a href="#" class="filter-tag" data-tag="${tag}">${tag}</a>`).join(', ') || 'None';
  const categoriesHtml = (post.categories || []).map(cat => `<a href="#" class="filter-category" data-category="${cat}">${cat}</a>`).join(', ') || 'None';

  postContent.innerHTML = `
    <h2>${post.title}</h2>
    <small>Published on ${new Date(post.publishedDate).toLocaleDateString()}</small>
    <p>${post.description}</p>
    <p><strong>Tags:</strong> ${tagsHtml}</p>
    <p><strong>Categories:</strong> ${categoriesHtml}</p>
    <div>${post.body}</div>
  `;

  // Re-attach tag/category listeners inside details view
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

backButton.addEventListener('click', () => {
  postDetailsContainer.style.display = 'none';
  postsContainer.style.display = 'block';
});

async function loadPostsByTag(tag) {
  const res = await fetch(`/posts/tag/${encodeURIComponent(tag)}`);
  if (!res.ok) {
    alert(`No posts found for tag: ${tag}`);
    return;
  }
  const posts = await res.json();
  postsContainer.innerHTML = `<h2>Posts tagged with "${tag}"</h2>`;
  postDetailsContainer.style.display = 'none';
  postsContainer.style.display = 'block';
  posts.forEach(post => {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');

    const tagsHtml = (post.tags || []).map(t => `<a href="#" class="filter-tag" data-tag="${t}">${t}</a>`).join(', ') || 'None';
    const categoriesHtml = (post.categories || []).map(c => `<a href="#" class="filter-category" data-category="${c}">${c}</a>`).join(', ') || 'None';

    postDiv.innerHTML = `
      <h2><a href="#" data-slug="${post.slug}">${post.title}</a></h2>
      <small>Published on ${new Date(post.publishedDate).toLocaleDateString()}</small>
      <p>${post.description}</p>
      <p><strong>Tags:</strong> ${tagsHtml}</p>
      <p><strong>Categories:</strong> ${categoriesHtml}</p>
      <hr />
    `;

    postsContainer.appendChild(postDiv);
  });

  // Re-attach listeners after filtering
  attachListeners();
}

async function loadPostsByCategory(category) {
  const res = await fetch(`/posts/category/${encodeURIComponent(category)}`);
  if (!res.ok) {
    alert(`No posts found for category: ${category}`);
    return;
  }
  const posts = await res.json();
  postsContainer.innerHTML = `<h2>Posts in category "${category}"</h2>`;
  postDetailsContainer.style.display = 'none';
  postsContainer.style.display = 'block';
  posts.forEach(post => {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');

    const tagsHtml = (post.tags || []).map(t => `<a href="#" class="filter-tag" data-tag="${t}">${t}</a>`).join(', ') || 'None';
    const categoriesHtml = (post.categories || []).map(c => `<a href="#" class="filter-category" data-category="${c}">${c}</a>`).join(', ') || 'None';

    postDiv.innerHTML = `
      <h2><a href="#" data-slug="${post.slug}">${post.title}</a></h2>
      <small>Published on ${new Date(post.publishedDate).toLocaleDateString()}</small>
      <p>${post.description}</p>
      <p><strong>Tags:</strong> ${tagsHtml}</p>
      <p><strong>Categories:</strong> ${categoriesHtml}</p>
      <hr />
    `;

    postsContainer.appendChild(postDiv);
  });

  // Re-attach listeners after filtering
  attachListeners();
}

// Utility to attach event listeners on titles, tags, categories
function attachListeners() {
  document.querySelectorAll('#posts a[data-slug]').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      const slug = e.target.getAttribute('data-slug');
      await loadPostDetails(slug);
    });
  });
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

// Initial load
loadPosts();
