const token = localStorage.getItem("token");
if (!token) {
  Swal.fire({
    icon: "error",
    title: "Not Logged In",
    text: "You are not logged in. Redirecting to login page...",
  }).then(() => {
    window.location.href = "/login.html";
  });
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
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error loading users.",
      footer: '<a href="#">Why do I have this issue?</a>'
    });
  }
}

function openUserActionModal(user) {
  selectedUser = user;
  document.getElementById("user-action-title").textContent = `User: ${user.username}`;
  document.getElementById("role-select").value = user.role;
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

    // Close the modal before showing the success message
    closeModals(); // Hide the modal

    Swal.fire({
      icon: "success",
      title: `${selectedUser.username} is now ${newRole}`,
      text: "Role updated successfully!"
    }).then(() => {
      loadUsers(); // Reload the user list
    });
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to update role.",
      footer: '<a href="#">Why do I have this issue?</a>'
    });
  }
};

loadUsers();
