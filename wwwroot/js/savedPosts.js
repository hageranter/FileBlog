    const savedPostsContainer = document.getElementById('savedBlogs');

    function getImageSrc(post) {
      return (post.assetFiles?.length > 0)
        ? `/content/posts/${post.folderName}/assets/${post.assetFiles[0]}`
        : '/images/default-thumbnail.jpg';
    }

    function logout() {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    }

    async function loadSavedPosts() {
      const token = localStorage.getItem('token');
      if (!token) {
        savedPostsContainer.innerHTML = '<p>Please log in to view your saved posts.</p>';
        return;
      }

      try {
        const res = await fetch('/posts/saved', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error('Failed to load saved posts.');

        const posts = await res.json();

        if (!posts.length) {
          savedPostsContainer.innerHTML = '<p class="empty-message">No saved posts yet.</p>';
          return;
        }

        savedPostsContainer.innerHTML = '';

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
              <small>${new Date(post.publishedDate).toLocaleDateString()}</small>
            </div>
          `;

          card.onclick = () => window.location.href = `/postDetail.html?slug=${encodeURIComponent(post.slug)}`;

          savedPostsContainer.appendChild(card);
        });

      } catch (err) {
        console.error(err);
        savedPostsContainer.innerHTML = '<p class="empty-message">Error loading saved posts.</p>';
      }
    }

    document.addEventListener('DOMContentLoaded', loadSavedPosts);
