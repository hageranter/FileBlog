const token = localStorage.getItem("token");
if (!token) {
  alert("Not logged in!");
  window.location.href = "/login.html";
}

let selectedUser = null;

async function loadUsers() {
  try {
    const res = await fetch("/admin/users", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to load users");

    const users = await res.json();
    const list = document.getElementById("user-list");
    list.innerHTML = "";

    const stats = { Admin: 0, Editor: 0, Author: 0 };
    users.forEach(user => {
      stats[user.role] = (stats[user.role] || 0) + 1;
    });

    document.getElementById("total-users").textContent = users.length;
    document.getElementById("admin-users").textContent = stats.Admin || 0;
    document.getElementById("editor-users").textContent = stats.Editor || 0;
    document.getElementById("author-users").textContent = stats.Author || 0;

    users.forEach(user => {
      const card = document.createElement("div");
      card.className = "user-card";
      card.innerHTML = `
        <strong>${user.username}</strong>
        <p>${user.email}</p>
        <span>${user.role}</span>
      `;
      card.onclick = () => openUserActionModal(user);
      list.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    alert("Error loading users");
  }
}

function openUserActionModal(user) {
  selectedUser = user;
  document.getElementById("user-action-title").textContent = `User: ${user.username}`;
  document.getElementById("role-select").value = user.role;
  document.getElementById("view-posts-btn").href = `/admin_user_posts.html?user=${user.username}`;
  document.getElementById("user-action-modal").classList.add("show");
}

function closeModals() {
  document.getElementById("user-action-modal").classList.remove("show");
  document.getElementById("code-modal").classList.remove("show");
}

document.getElementById("close-user-action-modal").onclick = closeModals;

document.getElementById("save-role-btn").onclick = async () => {
  const newRole = document.getElementById("role-select").value;
  try {
    const res = await fetch(`/admin/users/${selectedUser.username}/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ role: newRole })
    });

    if (!res.ok) throw new Error("Role update failed");
    alert(`${selectedUser.username} is now ${newRole}`);
    closeModals();
    loadUsers();
  } catch (err) {
    alert("Failed to update role");
  }
};

document.getElementById("close-modal-btn").onclick = closeModals;

document.getElementById("delete-user-btn").onclick = async () => {
  if (!selectedUser) return;

  const confirmDelete = confirm(`Are you sure you want to delete ${selectedUser.username}?`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`/admin/users/${selectedUser.username}/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Failed to delete user");

    alert(`${selectedUser.username} has been deleted.`);
    closeModals();
    loadUsers();
  } catch (err) {
    console.error(err);
    alert("Error deleting user");
  }
};


loadUsers();
