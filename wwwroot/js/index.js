(function () {
  const token = localStorage.getItem('token');
  if (!token) return;

  document.getElementById('auth-buttons').style.display = 'none';
  document.getElementById('user-profile').style.display = 'inline-block';

  try {
    const { username } = JSON.parse(atob(token.split('.')[1]));

    fetch(`/users/${username}`)
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        const avatarUrl = user?.avatarUrl || '/images/avatar.png';
        document.getElementById('profile-icon').src = avatarUrl;
      })
      .catch(() => {
        document.getElementById('profile-icon').src = '/images/avatar.png';
      });
  } catch {
    console.error('Invalid token format');
    document.getElementById('profile-icon').src = '/images/avatar.png';
  }

  const ctaBtn = document.querySelector('.cta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      if (!token) {
        window.location.href = '/login.html';
      } else {
        window.location.href = '/createPosts.html';
      }
    });
  }
})();

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("recent-posts-grid");

  try {
    const res = await fetch("/posts");
    const posts = await res.json();

    const sorted = posts
      .filter(p => p.status === "published")
      .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))
      .slice(0, 6);

    for (const post of sorted) {
      const image = post.coverImage ||
        (post.assetFiles?.[0]
          ? `/content/posts/${post.folderName}/assets/${post.assetFiles[0]}`
          : "https://via.placeholder.com/300x200?text=Blog");

      const card = document.createElement("div");
      card.className = "blog-card";

      card.innerHTML = `
        <div class="image-wrapper">
          <img src="${image}" alt="${post.title}">
          <span class="blog-category-tag">${post.categories?.[0] || 'Blog'}</span>
        </div>
        <div class="blog-card-content">
          <h3>${post.title}</h3>
          <a href="/posts.html#${post.slug}">Read more</a>
        </div>
      `;

      container.appendChild(card);
    }

  } catch (err) {
    console.error("Failed to load posts:", err);
    container.innerHTML = `<p>Failed to load blog cards.</p>`;
  }
});
