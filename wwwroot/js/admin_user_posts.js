const params = new URLSearchParams(window.location.search);
const username = params.get("user");
const token = localStorage.getItem("token");

document.getElementById("page-title").innerText = `Posts by ${username}`;

const postsContainer = document.getElementById("posts-container");

fetch(`/admin/users/${username}/posts`, {
  headers: {
    "Authorization": `Bearer ${token}`
  }
})
  .then(res => {
    if (!res.ok) throw new Error("Failed to load posts");
    return res.json();
  })
  .then(posts => {
    postsContainer.innerHTML = "";

    if (posts.length === 0) {
      postsContainer.innerText = "No posts found.";
      return;
    }

    posts.forEach(post => {
      const div = document.createElement("div");
      div.classList.add("post");

      div.innerHTML = `
        <h3>${post.title}</h3>
        <p>${post.description || post.body?.substring(0, 100) || ""}</p>
        <button onclick="deletePost('${username}', '${post.id}')">Delete</button>
        <hr />
      `;

      postsContainer.appendChild(div);
    });
  })
  .catch(err => {
    console.error("Error loading posts:", err);
    postsContainer.innerHTML = "<p>Failed to load posts.</p>";
  });

function deletePost(username, postId) {
  if (!confirm("Are you sure you want to delete this post?")) return;

  fetch(`/admin/users/${username}/posts/${postId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to delete post");
      alert("Post deleted.");
      location.reload();
    })
    .catch(err => {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    });
}
