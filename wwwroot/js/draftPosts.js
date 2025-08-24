const draftsContainer = document.getElementById('savedBlogs'); // You can keep the same ID

function getImageSrc(post) {
  return (post.assetFiles?.length > 0)
    ? `/content/posts/${post.folderName}/assets/${post.assetFiles[0]}`
    : '/images/default-thumbnail.jpg';
}

async function loadDraftPosts() {
  const token = localStorage.getItem('token');

  // 🚫 No token
  if (!token) {
    return Swal.fire({
      icon: 'warning',
      title: 'Session Expired',
      text: 'Please log in to view your drafts.',
      confirmButtonText: 'Go to Login',
      confirmButtonColor: '#3085d6'
    }).then(() => {
      window.location.href = '/login';
    });
  }

  // ✅ Token exists — check expiration
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      localStorage.removeItem('token');
      return Swal.fire({
        icon: 'warning',
        title: 'Session Expired',
        text: 'Please log in again to view drafts.',
        confirmButtonText: 'Go to Login',
        confirmButtonColor: '#3085d6'
      }).then(() => {
        window.location.href = '/login';
      });
    }
  } catch (e) {
    localStorage.removeItem('token');
    return Swal.fire({
      icon: 'error',
      title: 'Invalid Session',
      text: 'Please log in again.',
      confirmButtonText: 'Go to Login',
      confirmButtonColor: '#d33'
    }).then(() => {
      window.location.href = '/login';
    });
  }

  // ✅ Token valid – proceed to fetch
  try {
    const res = await fetch('/api/posts/drafts', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error('Failed to load drafts.');

    const posts = await res.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      draftsContainer.innerHTML = '<p class="empty-message">No draft posts found.</p>';
      return;
    }

    draftsContainer.innerHTML = '';

    posts.forEach(post => {
      const imgSrc = getImageSrc(post);

      // Use an anchor so middle-click / open-in-new-tab works
      const a = document.createElement('a');
      a.className = 'post-card';
      a.href = `/post/${encodeURIComponent(post.slug)}`; // 🔧 FIX: use path route
      a.setAttribute('aria-label', `Open draft: ${post.title}`);

      a.innerHTML = `
        <div class="post-image">
          <img src="${imgSrc}" alt="${post.title}" loading="lazy" />
        </div>
        <div class="post-body">
          <h3>${post.title}</h3>
          <p>${post.description || 'No description available.'}</p>
          <small>Last edited: ${new Date(post.updatedDate || post.publishedDate).toLocaleDateString()}</small>
        </div>
      `;

      draftsContainer.appendChild(a);
    });

  } catch (err) {
    console.error(err);
    draftsContainer.innerHTML = '<p class="empty-message">Error loading draft posts.</p>';
  }
}


document.addEventListener('DOMContentLoaded', loadDraftPosts);
function createPosts() {
  window.location.href = '/createPosts';
}
