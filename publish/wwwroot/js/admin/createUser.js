document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("open-create-user-btn");
  const cancelBtn = document.getElementById("cancel-create-user");
  const overlay = document.getElementById("create-user-overlay");
  const form = document.getElementById("create-user-form");

  // Show popup
  openBtn?.addEventListener("click", () => {
    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });

  // Hide popup + reset form
  cancelBtn?.addEventListener("click", () => {
    overlay.classList.add("hidden");
    form.reset();
    document.body.style.overflow = "";
  });

  // Handle form submit
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("new-username").value.trim();
    const email = document.getElementById("new-email").value.trim();
    const password = document.getElementById("new-password").value;
    const role = document.getElementById("new-role").value;

    try {
      const res = await fetch("/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ username, email, password, role }),
      });

      if (!res.ok) throw new Error("Failed to create user");

      Swal.fire({
        icon: "success",
        title: "User Created",
        text: `${username} has been created`,
      }).then(() => {
        overlay.classList.add("hidden");
        form.reset();
        document.body.style.overflow = "";
        if (typeof loadUsers === "function") loadUsers(); // Refresh user list
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to create user. This user may already exist.",
      });
    }
  });
});
