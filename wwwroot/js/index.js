(function () {
  const token = localStorage.getItem('token');
  if (!token) return;

  const authBtns = document.getElementById('auth-buttons');
  const userProfile = document.getElementById('user-profile');
  if (authBtns) authBtns.style.display = 'none';
  if (userProfile) userProfile.style.display = 'inline-block';

  try {
    const { username } = JSON.parse(atob(token.split('.')[1]));

    fetch(`/users/${username}`)
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        const avatarUrl = user?.avatarUrl || '/images/profile-icon.jpg';
        const icon = document.getElementById('profile-icon');
        if (icon) icon.src = avatarUrl;
      })
      .catch(() => {
        const icon = document.getElementById('profile-icon');
        if (icon) icon.src = '/images/profile-icon.jpg';
      });
  } catch {
    console.error('Invalid token format');
    const icon = document.getElementById('profile-icon');
    if (icon) icon.src = '/images/profile-icon.jpg';
  }

  const ctaBtn = document.querySelector('.cta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      window.location.href = token ? '/createPosts.html' : '/login.html';
    });
  }
})();

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("recent-posts-grid");
  if (!container) return;

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

      // Full blog card inside anchor to make the whole card clickable
      const postLink = document.createElement("a");
      postLink.href = `/postDetail.html?slug=${post.slug}`;
      postLink.className = "blog-card-link";

      postLink.innerHTML = `
        <div class="blog-card">
          <div class="image-wrapper" style="position: relative;">
            <img src="${image}" alt="${post.title}">
            <span class="blog-category-tag">${post.categories?.[0] || 'Blog'}</span>
          </div>
          <div class="blog-card-content">
            <h3>${post.title}</h3>
            <span class="read-more">Read more</span>
          </div>
        </div>
      `;

      container.appendChild(postLink);
    }

  } catch (err) {
    console.error("Failed to load posts:", err);
    container.innerHTML = `<p>Failed to load blog cards.</p>`;
  }
});
