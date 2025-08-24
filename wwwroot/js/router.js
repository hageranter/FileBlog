(() => {
  // Map kebab slugs to your real files (keep adding as you go)
  const PAGE_MAP = {
    '': '/',
    'home': '/',
    'contact-us': '/contactUs.html',
    'login': '/login.html',
    'sign-up': '/signup.html',
    'signup': '/signup.html',
    'profile': '/profile.html',
    'posts': '/posts',              // if your posts list is a route
    // add more here… e.g. 'about-me': '/aboutMe.html'
  };

  function toKebab(s) {
    return s.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function resolve(slug) {
    return PAGE_MAP[slug.toLowerCase()];
  }

  // 1) Handle pretty paths like /pages/<slug> or /p/<slug>
  function handlePrettyUrl() {
    const m = location.pathname.match(/^\/(pages?|p)\/([^\/?#]+)/i);
    if (!m) return;
    const slug = decodeURIComponent(m[2]);
    const target = resolve(slug);
    if (target) {
      location.replace(target + location.search + location.hash);
    } else {
      document.body.innerHTML = '<h1 style="padding:2rem">404 Not Mapped</h1>';
    }
  }

  // 2) Let links declare a page name and we convert to /pages/<slug>
  function hijackDataLinks() {
    document.querySelectorAll('a[data-page]').forEach(a => {
      a.addEventListener('click', (e) => {
        const label = a.dataset.page;
        if (!label) return;
        e.preventDefault();
        const slug = toKebab(label);
        // send the user to the pretty URL; router will redirect to the real file
        location.href = `/pages/${encodeURIComponent(slug)}${a.search || ''}${a.hash || ''}`;
      });
    });
  }

  // export if you want to use it elsewhere
  window.toKebab = toKebab;

  window.addEventListener('DOMContentLoaded', () => {
    handlePrettyUrl();
    hijackDataLinks();
  });
})();
