const postsContainer = document.getElementById('posts');
const postDetailsContainer = document.getElementById('post-details');
const postContent = document.getElementById('post-content');
const postAssets = document.getElementById('post-assets');
const backButton = document.getElementById('back-button');

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

    attachListeners();
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}

async function loadPostDetails(slug) {
  try {
    console.log("Loading post details for:", slug);
    const res = await fetch(`/posts/${slug}`);
    if (!res.ok) {
      alert('Post not found');
      return;
    }
    const post = await res.json();

    postsContainer.style.display = 'none';
    postDetailsContainer.style.display = 'block';

    postContent.innerHTML = '';
    postAssets.innerHTML = '';

    postContent.innerHTML = `
      <h2>${post.title}</h2>
      <small>Published on ${new Date(post.publishedDate).toLocaleDateString()}</small>
      <p>${post.description}</p>
      <p><strong>Tags:</strong> ${(post.tags || []).join(', ') || 'None'}</p>
      <p><strong>Categories:</strong> ${(post.categories || []).join(', ') || 'None'}</p>
      <div>${post.body}</div>
    `;

    if (post.assetFiles && post.assetFiles.length > 0) {
      console.log('Assets container:', postAssets);
      console.log('Files to add:', post.assetFiles);


      post.assetFiles.forEach(filename => {
        const img = document.createElement('img');

        img.src = `/content/posts/${post.folderName}/assets/thumbs/${filename}`;
        img.srcset = `
    /content/posts/${post.folderName}/assets/thumbs/${filename} 300w,
    /content/posts/${post.folderName}/assets/large/${filename} 1200w
  `;
        img.sizes = "(max-width: 600px) 300px, 1200px";
        img.alt = filename;

        img.style.maxWidth = '100%';
        img.style.marginTop = '10px';
        img.style.border = '2px solid red';

        const link = document.createElement('a');
        link.href = `/content/posts/${post.folderName}/assets/${filename}`;
        link.target = '_blank';
        link.appendChild(img);

        postAssets.appendChild(link);
      });


    } else {
      console.log('No asset files to display');
    }

    addFilterListeners();

  } catch (error) {
    console.error("Error loading post details:", error);
  }
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

backButton.addEventListener('click', () => {
  postDetailsContainer.style.display = 'none';
  postsContainer.style.display = 'block';
});

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
    postDetailsContainer.style.display = 'none';
    postsContainer.style.display = 'block';
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
    postDetailsContainer.style.display = 'none';
    postsContainer.style.display = 'block';
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
  attachListeners();
}

function attachListeners() {
  document.querySelectorAll('#posts a[data-slug]').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      const slug = e.target.getAttribute('data-slug');
      await loadPostDetails(slug);
    });
  });

  addFilterListeners();
}

loadPosts();
