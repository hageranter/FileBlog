document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    Swal.fire({
      icon: "error",
      title: "Not Logged In",
      text: "You are not logged in. Redirecting to login page...",
    }).then(() => (window.location.href = "/login.html"));
    return; // Stop execution
  }

  async function loadUsers() {
    try {
      const res = await fetch("/admin/users", {

        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        Swal.fire({
          icon: "warning",
          title: "Session Expired",
          text: "Your session has expired. Redirecting to login page...",
        }).then(() => {
          localStorage.removeItem("token");
          window.location.href = "/login.html";
        });
        return;
      }

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
        card.setAttribute("data-username", user.username.toLowerCase());

        card.innerHTML = `
          <div class="user-card-top">
            <img src="${user.avatarUrl || '/images/profile-icon.jpg'}" class="avatar-img" alt="${user.username}" />
            <div class="user-details">
              <strong>${user.username}</strong>
              <p>${user.email}</p>
              <span class="role-badge">${user.role}</span>
            </div>
          </div>
          <div class="user-actions">
            <button class="action-btn" onclick="changeUserRole('${user.username}')">
              <i class="fas fa-user-cog"></i> Role
            </button>
            <button class="delete-action-btn" onclick="confirmDeleteUser('${user.username}')">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        `;
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

  window.changeUserRole = async function (username) {
    Swal.fire({
      title: `Change role for ${username}`,
      input: 'select',
      inputOptions: {
        Admin: 'Admin',
        Editor: 'Editor',
        Author: 'Author'
      },
      inputPlaceholder: 'Select a role',
      showCancelButton: true
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          const res = await fetch(`/admin/users/${username}/role`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: result.value }),
          });

          if (!res.ok) throw new Error();

          Swal.fire("Updated!", `${username}'s role changed to ${result.value}.`, "success");
          loadUsers();
        } catch {
          Swal.fire("Error", "Role update failed", "error");
        }
      }
    });
  };

  window.confirmDeleteUser = async function (username) {
    Swal.fire({
      title: `Delete ${username}?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/admin/users/${username}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) throw new Error();

          Swal.fire("Deleted!", `${username} has been removed.`, "success");
          loadUsers();
        } catch {
          Swal.fire("Error", "Failed to delete user", "error");
        }
      }
    });
  };

  // Add search input listener
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const query = this.value.toLowerCase();
      const cards = document.querySelectorAll(".user-card");

      cards.forEach((card) => {
        const username = card.getAttribute("data-username");
        card.style.display = username.includes(query) ? "flex" : "none";
      });
    });
  }

  


  // Load users on page ready
  loadUsers();
});
