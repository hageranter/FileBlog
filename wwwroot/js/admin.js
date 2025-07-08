const token = localStorage.getItem("token");
if (!token) {
  alert("Not logged in!");
  window.location.href = "/login.html";
}

async function loadUsers() {
  try {
    const res = await fetch("/admin/users", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Unauthorized or failed to load users");

    const users = await res.json();
    const container = document.getElementById("user-list");
    container.innerHTML = "";

    users.forEach(user => {
      const userDiv = document.createElement("div");

      userDiv.innerHTML = `
        <a href="admin_user_posts.html?user=${user.username}" style="font-weight: bold;">
          ${user.username}
        </a> - ${user.role}
        <button onclick="changeRole('${user.username}', 'Admin')">Make Admin</button>
        <button onclick="changeRole('${user.username}', 'Author')">Make Author</button>
        <hr>
      `;

      container.appendChild(userDiv);
    });
  } catch (err) {
    console.error(err);
    alert("Error loading users");
  }
}

function changeRole(username, newRole) {
  const token = localStorage.getItem("token");

  fetch(`/admin/users/${username}/role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ role: newRole })
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to update role");
    return res.json();
  })
  .then(data => {
    alert(`${username} is now ${data.newRole}`);
    location.reload(); 
  })
  .catch(err => {
    console.error(err);
    alert("Error: Failed to update role");
  });
}

loadUsers();
