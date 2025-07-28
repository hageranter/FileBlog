const token = localStorage.getItem("token");
if (!token) {
  Swal.fire({
    icon: "error",
    title: "Not Logged In",
    text: "You are not logged in. Redirecting to login page...",
  }).then(() => (window.location.href = "/login.html"));
}

let selectedUser = null;

async function loadUsers() {
  try {
    const res = await fetch("/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load users");

    const users = await res.json();
    const list = document.getElementById("user-list");
    list.innerHTML = "";

    const stats = { Admin: 0, Editor: 0, Author: 0 };
    users.forEach((user) => {
      stats[user.role] = (stats[user.role] || 0) + 1;
    });

    document.getElementById("total-users").textContent = users.length;
    document.getElementById("admin-users").textContent = stats.Admin || 0;
    document.getElementById("editor-users").textContent = stats.Editor || 0;
    document.getElementById("author-users").textContent = stats.Author || 0;

    users.forEach((user) => {
      const card = document.createElement("div");
      card.className = "user-card";
      card.innerHTML = `
        <strong>${user.username}</strong>
        <p>${user.email}</p>
        <span>${user.role}</span>`;
      card.addEventListener("click", (e) => {
        e.stopPropagation();
        openUserActionModal(user);
      });
      list.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error loading users.",
    });
  }
}

function openUserActionModal(user) {
  selectedUser = user;
  document.getElementById("user-action-title").textContent = `User: ${user.username}`;
  document.querySelectorAll(".modal-section").forEach((sec) => (sec.style.display = "none"));
  document.getElementById("action-menu").style.display = "block";
  document.getElementById("user-action-modal").classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModals() {
  document.getElementById("user-action-modal").classList.remove("show");
  document.querySelectorAll(".modal-section").forEach((sec) => (sec.style.display = "none"));
  document.getElementById("action-menu").style.display = "none";
  document.body.style.overflow = "";
}

document.getElementById("close-user-action-modal").addEventListener("click", (e) => {
  e.stopPropagation();
  closeModals();
});
document.querySelector(".modal-content").addEventListener("click", (e) => e.stopPropagation());
window.addEventListener("click", (e) => {
  const modal = document.getElementById("user-action-modal");
  if (modal.classList.contains("show") && e.target === modal) {
    closeModals();
  }
});

document.getElementById("change-role-btn").addEventListener("click", () => {
  document.getElementById("action-menu").style.display = "none";
  document.getElementById("change-role-section").style.display = "block";
});

document.getElementById("save-role-btn").addEventListener("click", async () => {
  const newRole = document.getElementById("role-select").value;
  try {
    const res = await fetch(`/admin/users/${selectedUser.username}/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    });

    if (!res.ok) throw new Error("Role update failed");

    Swal.fire({
      icon: "success",
      title: `${selectedUser.username} is now ${newRole}`,
      text: "Role updated successfully!",
    }).then(() => {
      closeModals();
      loadUsers();
    });
  } catch {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to update role.",
    });
  }
});

document.getElementById("back-btn").addEventListener("click", () => {
  document.querySelectorAll(".modal-section").forEach((sec) => (sec.style.display = "none"));
  document.getElementById("action-menu").style.display = "block";
});

// document.getElementById("view-posts-btn").addEventListener("click", () => {
//   document.getElementById("action-menu").style.display = "none";
//   document.getElementById("view-posts-section").style.display = "block";
//   document.getElementById("view-posts-link").href = `/admin_user_posts.html?user=${selectedUser.username}`;
// });

document.getElementById("delete-user-btn").addEventListener("click", () => {
  document.getElementById("action-menu").style.display = "none";
  document.getElementById("delete-user-section").style.display = "block";
});

document.getElementById("confirm-delete-btn").addEventListener("click", async () => {
  const confirmDelete = await Swal.fire({
    title: "Are you sure?",
    text: `You are about to delete ${selectedUser.username}.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
  });

  if (!confirmDelete.isConfirmed) return;

  try {
    const res = await fetch(`/admin/users/${selectedUser.username}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to delete user");

    Swal.fire({
      icon: "success",
      title: `${selectedUser.username} has been deleted.`,
      text: "User deleted successfully!",
    }).then(() => {
      closeModals();
      loadUsers();
    });
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error deleting user.",
    });
  }
});

// Load on page
loadUsers();
