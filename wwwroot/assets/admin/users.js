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
  
  // Show the modal and menu, and ensure the menu options are visible.
  document.getElementById("user-action-modal").classList.add("show");
  document.getElementById("action-menu").style.display = "block";
  document.getElementById("change-role-section").style.display = "none";
  document.getElementById("view-posts-section").style.display = "none";
  document.getElementById("delete-user-section").style.display = "none";
}

// Close modal function
function closeModals() {
  document.getElementById("user-action-modal").classList.remove("show");
  document.getElementById("change-role-section").style.display = "none";
  document.getElementById("view-posts-section").style.display = "none";
  document.getElementById("delete-user-section").style.display = "none";
  document.getElementById("action-menu").style.display = "none";
}

// Handle "Change Role" selection
document.getElementById("change-role-btn").onclick = () => {
  document.getElementById("action-menu").style.display = "none";
  document.getElementById("change-role-section").style.display = "block";
};

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

    // Show success alert and close modal after
    Swal.fire({
      icon: "success",
      title: `${selectedUser.username} is now ${newRole}`,
      text: "Role updated successfully!"
    }).then(() => {
      closeModals(); // Close modal after the success alert
      loadUsers(); // Reload the user list after updating the role
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

// Handle "View Posts" selection
document.getElementById("view-posts-btn").onclick = () => {
  document.getElementById("action-menu").style.display = "none";
  document.getElementById("view-posts-section").style.display = "block";
  document.getElementById("view-posts-link").href = `/admin_user_posts.html?user=${selectedUser.username}`;
};

// Handle "Delete User" selection
document.getElementById("delete-user-btn").onclick = () => {
  document.getElementById("action-menu").style.display = "none";
  document.getElementById("delete-user-section").style.display = "block";
};

// Handle user deletion
document.getElementById("confirm-delete-btn").onclick = async () => {
  const confirmDelete = await Swal.fire({
    title: "Are you sure?",
    text: `You are about to delete ${selectedUser.username}.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel'
  });

  if (!confirmDelete.isConfirmed) return;

  try {
    const res = await fetch(`/admin/users/${selectedUser.username}/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Failed to delete user");

    // Show success alert and close modal after
    Swal.fire({
      icon: "success",
      title: `${selectedUser.username} has been deleted.`,
      text: "User deleted successfully!"
    }).then(() => {
      closeModals(); // Close modal after the success alert
      loadUsers(); // Reload the user list after deletion
    });
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error deleting user.",
      footer: '<a href="#">Why do I have this issue?</a>'
    });
  }
};

// Close modal when clicking outside or on close button
document.getElementById("close-user-action-modal").onclick = closeModals;

document.getElementById("back-btn").onclick = () => {
  document.getElementById("action-menu").style.display = "block";
  document.getElementById("change-role-section").style.display = "none";
};

loadUsers();
