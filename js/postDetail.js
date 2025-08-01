const postContent = document.getElementById('post-content');
const commentList = document.getElementById("comment-list");
const commentInput = document.getElementById("comment-input");
const commentButton = document.getElementById("post-comment-btn");
// const backDetailButton = document.getElementById('back-detail-button');
const profileEl = document.getElementById("profile-icon");

let currentSlug = null;
let currentUsername = "";
let currentRole = "";
let postAuthor = "";



const token = localStorage.getItem("token");
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    currentRole = payload?.role || "";
    currentUsername = payload?.username || "";
    var isAdmin = currentRole.toLowerCase() === "admin";
    var isEditor = currentRole.toLowerCase() === "editor"; // <-- Add this


  } catch (err) {
    console.error("Invalid token format");
  }
}

if (token && profileEl && currentUsername) {
  fetch(`/users/${currentUsername}`)
    .then(res => res.json())
    .then(user => {
      const avatarUrl = user.avatarUrl || "/images/avatar.png";
      profileEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="this.src='/images/avatar.png'" />`;

    })
    .catch(() => {
      profileEl.innerHTML = `<img src="/images/avatar.png" alt="Profile">`;
    });
}


function getSlugFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug");
}

function getImageSrc(post) {
  if (post.coverImage) return post.coverImage;
  if (post.folderName && post.assetFiles?.[0])
    return `/content/posts/${post.folderName}/assets/${post.assetFiles[0]}`;
  return 'https://via.placeholder.com/600x300?text=No+Image';
}

function animateElement(el) {
  el.classList.add('animate');
  setTimeout(() => el.classList.remove('animate'), 400);
}

async function loadComments(slug) {
  try {
    const res = await fetch(`/posts/${slug}/comments`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const rawComments = await res.json();
    console.log("Raw comments:", rawComments);

    const comments = rawComments.map(c => {
      const type = c.Type || c.type || "public";
      return {
        username: c.Username || c.username,
        commentText: c.CommentText || c.commentText,
        date: c.Date || c.date,
        avatarUrl: c.AvatarUrl || c.avatarUrl,
        type,
        visibleToAuthorOnly: c.VisibleToAuthorOnly ?? type === "review",
      };
    });


    if (!comments.length) {
      commentList.innerHTML = `<li>No comments yet. Be the first to comment!</li>`;
      return;
    }

    commentList.innerHTML = comments
      .filter(c => {
        console.log("Filtered comments:", comments)

        if (c.type === "review" && c.visibleToAuthorOnly && currentUsername !== postAuthor) {
          return false;
        }
        return true;
      })
      .map(c => `
        <li class="comment-item">
          <img src="${c.avatarUrl || '/images/avatar.png'}" class="comment-avatar" />
          <div class="comment-content">
            <span class="comment-username">
              ${c.username}
              ${c.type === "review" ? `<span class="editor-label">Editor <img src="/images/verified-icon.jpg" alt="Verified" /></span>` : ""}
            </span>
            <p class="comment-text">
              ${c.type === "review" ? `<strong>[Editor Feedback]</strong><br>` : ""}
              ${c.commentText}
            </p>
            <div class="comment-meta">${c.date ? new Date(c.date).toLocaleString() : ""}</div>
          </div>
        </li>
      `)
      .join("");




  } catch (err) {
    console.error("Error loading comments:", err);
  }
}


async function loadPostDetails(slug) {
  try {
    currentSlug = slug;
    const res = await fetch(`/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("Post not found");

    const post = await res.json();
    postAuthor = post.username;

    const imageSrc = getImageSrc(post);
    const username = post.username || "Unknown";



    let avatarUrl = "/images/avatar.png"; // default in case fetch fails

    try {
      const avatarRes = await fetch(`/users/${post.username}`);
      if (avatarRes.ok) {
        const userData = await avatarRes.json();
        if (userData.avatarUrl) {
          avatarUrl = userData.avatarUrl;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch author avatar", err);
    }

    postContent.innerHTML = `
  <article class="post-full">
    <div class="post-meta">
      <div class="author-info">
        <img class="post-user-avatar" src="${avatarUrl}" onerror="this.src='/images/avatar.png'" alt="${username}'s avatar" />
        <span class="post-username">@${username}</span>
        <span class="post-date">${new Date(post.publishedDate).toLocaleDateString()}</span>
      </div>
      
      ${currentUsername === post.username ? `
  <div class="post-menu-wrapper">
    <button class="menu-icon" onclick="toggleMenu(this)">⋮</button>
    <ul class="menu hidden">
      <li onclick="enableDetailEdit(this)">Edit</li>
      <li onclick="confirmDeletePost()">Delete</li>
    </ul>
  </div>
` : (isAdmin && currentUsername !== post.username ? `
  <div class="post-menu-wrapper">
    <button class="menu-icon" onclick="toggleMenu(this)">⋮</button>
    <ul class="menu hidden">
      <li onclick="confirmDeletePost()">Delete</li>
    </ul>
  </div>
` : '')}


    
    </div>
    <h1 id="detail-title" contenteditable="false">${post.title}</h1>
    <div class="post-hero">
      <img src="${imageSrc}" alt="Post cover" class="post-hero-image" />
    </div>
    <div id="detail-body" class="post-body" contenteditable="false">${post.body}</div>

    <div class="post-actions">
      <button id="like-btn" class="action-btn"><span class="heart">❤️</span> <span id="like-count">${post.likes || 0}</span></button>
      <button id="save-btn" class="action-btn">${post.savedBy?.includes(currentUsername) ? '💾 Saved' : '💾 Save'}</button>
    </div>

    <div class="post-tags">
      ${(post.tags || []).map(tag => `<span class="tag" data-tag="${tag}">#${tag}</span>`).join(' ')}
    </div>

    <button id="save-detail-btn" class="hidden">Save</button>
  </article>
`;

    // Tag filter
    document.querySelectorAll('.tag').forEach(tagEl => {
      tagEl.addEventListener('click', e => {
        const tag = e.target.dataset.tag;
        if (tag) window.location.href = `/posts.html?tag=${encodeURIComponent(tag)}`;
      });
    });

    // Like button
    const likeBtn = document.getElementById("like-btn");
    likeBtn.addEventListener("click", async () => {
      if (!token) {
        Swal.fire({ icon: "warning", title: "Login required", text: "You must be logged in to like posts." });
        return;
      }

      try {
        const res = await fetch(`/posts/${slug}/like`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to toggle like");

        const updated = await res.json();
        document.getElementById("like-count").innerText = updated.likes;

        // Toggle heart color based on whether the user liked the post
        likeBtn.querySelector(".heart").style.color = updated.likedBy.includes(currentUsername) ? "deeppink" : "inherit";

        animateElement(likeBtn);
      } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "Couldn't like post." });
      }
    });


    // Save button
    const saveBtn = document.getElementById("save-btn");
    saveBtn.addEventListener("click", async () => {
      if (!token) {
        Swal.fire({ icon: "warning", title: "Login required", text: "You must be logged in to save posts." });
        return;
      }

      try {
        const res = await fetch(`/posts/${slug}/save`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        const updated = await res.json();
        saveBtn.innerText = updated.savedBy.includes(currentUsername) ? '💾 Saved' : '💾 Save';
        animateElement(saveBtn);
      } catch {
        Swal.fire({ icon: "error", title: "Error", text: "Couldn't save post." });
      }
    });

    // Save edits
    document.getElementById('save-detail-btn').onclick = async () => {
      const titleEl = document.getElementById('detail-title');
      const bodyEl = document.getElementById('detail-body');
      const newTitle = titleEl.innerText.trim();
      const newBody = bodyEl.innerHTML.trim();

      try {
        const res = await fetch(`/posts/${currentSlug}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title: newTitle, body: newBody })
        });

        if (!res.ok) throw new Error("Failed to save");

        Swal.fire({ icon: "success", title: "Post updated", text: "Your changes have been saved." });
        titleEl.setAttribute('contenteditable', 'false');
        bodyEl.setAttribute('contenteditable', 'false');
        document.getElementById('save-detail-btn').classList.add('hidden');
      } catch (err) {
        Swal.fire({ icon: "error", title: "Error", text: "Could not save changes." });
      }
    };

    await loadComments(slug);
  } catch (err) {
    console.error("Error loading post details:", err);
    postContent.innerHTML = `<p>Failed to load post</p>`;
    Swal.fire({
      icon: "error",
      title: "Error loading post",
      text: "The post could not be found or loaded.",
    });
  }
}

function toggleMenu(button) {
  const menu = button.nextElementSibling;
  menu.classList.toggle('hidden');
}

function enableDetailEdit(menuItem) {
  const titleEl = document.getElementById('detail-title');
  const bodyEl = document.getElementById('detail-body');
  const saveBtn = document.getElementById('save-detail-btn');

  titleEl.setAttribute('contenteditable', 'true');
  bodyEl.setAttribute('contenteditable', 'true');
  titleEl.focus();

  saveBtn.classList.remove('hidden');
  menuItem.closest('.menu').classList.add('hidden');
}


commentButton?.addEventListener("click", async () => {
  const text = commentInput.value.trim();
  if (!text) return;

  if (!token) {
    Swal.fire({ icon: "warning", title: "Login required", text: "You must be logged in to comment." });
    return;
  }

  try {
    const res = await fetch(`/posts/${currentSlug}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ comment: text }),
    });

    if (!res.ok) throw new Error();
    commentInput.value = "";
    await loadComments(currentSlug);
  } catch {
    Swal.fire({ icon: "error", title: "Error", text: "Couldn't post comment." });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const commentAvatarEl = document.querySelector(".comment-input-group .comment-avatar");

  if (token && currentUsername && commentAvatarEl) {
    fetch(`/users/${currentUsername}`)
      .then(res => res.json())
      .then(user => {
        const avatarUrl = user.avatarUrl || "/images/avatar.png";
        commentAvatarEl.src = avatarUrl;
      })
      .catch(() => {
        commentAvatarEl.src = "/images/avatar.png";
      });
  }

  setupEditorSendButton(); // ✅ Only one call
});

function setupEditorSendButton() {
  if (!isEditor) return;
  const actionsDiv = document.getElementById("comment-actions");
  if (!actionsDiv || document.getElementById("send-to-author-btn")) return;

  const sendToAuthorBtn = document.createElement("button");
  sendToAuthorBtn.textContent = "Send to Author";
  sendToAuthorBtn.id = "send-to-author-btn";
  sendToAuthorBtn.style.marginLeft = "10px";
  actionsDiv.appendChild(sendToAuthorBtn);

  sendToAuthorBtn.addEventListener("click", async () => {
    const text = commentInput.value.trim();
    if (!text) return;
    if (!token) return alert("Login required.");

    try {
      await fetch(`/posts/${currentSlug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comment: text, type: "review" })
      });

      commentInput.value = "";
      await loadComments(currentSlug);
      Swal.fire({ icon: "success", title: "Sent to Author", text: "Review submitted." });
    } catch (err) {
      console.error("Error sending to author:", err);
      Swal.fire({ icon: "error", title: "Failed", text: "Couldn't send review." });
    }
  });
}


function enableDetailEdit(menuItem) {
  const titleEl = document.getElementById('detail-title');
  const bodyEl = document.getElementById('detail-body');
  const saveBtn = document.getElementById('save-detail-btn');


  titleEl.setAttribute('contenteditable', 'true');
  bodyEl.setAttribute('contenteditable', 'true');
  titleEl.focus();

  saveBtn.classList.remove('hidden');
  menuItem.closest('.menu').classList.add('hidden');

  saveBtn.onclick = async () => {
    titleEl.setAttribute('contenteditable', 'false');
    bodyEl.setAttribute('contenteditable', 'false');
    saveBtn.classList.add('hidden');

    const newTitle = titleEl.innerText.trim();
    const newBody = bodyEl.innerHTML.trim();

    if (!currentSlug) {
      alert("Missing post slug");
      return;
    }

    try {
      const res = await fetch(`/posts/${currentSlug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newTitle,
          body: newBody
        })
      });

      if (!res.ok) throw new Error("Failed to save");

      alert("Post updated successfully!");
    } catch (err) {
      console.error("Error saving post:", err);
      alert("Failed to save post");
    }
  };
}

function confirmDeletePost() {
  if (!currentSlug) {
    alert("Missing post identifier.");
    return;
  }

  const confirmed = confirm("Are you sure you want to delete this post?");
  if (!confirmed) return;

  const token = localStorage.getItem("token");

  fetch(`/posts/${currentSlug}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to delete post");

      Swal.fire({
        icon: "success",
        title: "Post deleted",
        text: "The post was successfully deleted.",
      }).then(() => {
        window.location.href = "/posts.html"; // Redirect to posts page
      });
    })
    .catch(err => {
      console.error("Error deleting post:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete the post.",
      });
    });
}

const slug = getSlugFromURL();
if (slug) loadPostDetails(slug);
else postContent.innerHTML = `<p>No post slug provided.</p>`;
