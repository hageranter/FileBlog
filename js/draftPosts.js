  const draftsContainer = document.getElementById('savedBlogs'); // You can keep the same ID

  function getImageSrc(post) {
    return (post.assetFiles?.length > 0)
      ? `/content/posts/${post.folderName}/assets/${post.assetFiles[0]}`
      : '/images/default-thumbnail.jpg';
  }

  async function loadDraftPosts() {
    const token = localStorage.getItem('token');
    if (!token) {
      draftsContainer.innerHTML = '<p>Please log in to view your drafts.</p>';
      return;
    }

    try {
      const res = await fetch('/posts/drafts', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to load drafts.');

      const posts = await res.json();

      if (posts.length === 0) {
        draftsContainer.innerHTML = '<p class="empty-message">No draft posts found.</p>';
        return;
      }

      draftsContainer.innerHTML = '';

      posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';

        const imgSrc = getImageSrc(post);

        card.innerHTML = `
          <div class="post-image">
            <img src="${imgSrc}" alt="${post.title}" />
          </div>
          <div class="post-body">
            <h3>${post.title}</h3>
            <p>${post.description || 'No description available.'}</p>
            <small>Last edited: ${new Date(post.updatedDate || post.publishedDate).toLocaleDateString()}</small>
          </div>
        `;

        card.onclick = () => window.location.href = `/postDetail.html?slug=${encodeURIComponent(post.slug)}`;

        draftsContainer.appendChild(card);
      });

    } catch (err) {
      console.error(err);
      draftsContainer.innerHTML = '<p class="empty-message">Error loading draft posts.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', loadDraftPosts);