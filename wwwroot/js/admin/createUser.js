document.querySelector('.btn.btn-primary[href="/admin/users/create"]').addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("create-user-overlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
});

document.getElementById("cancel-create-user").addEventListener("click", () => {
  document.getElementById("create-user-overlay").classList.add("hidden");
  document.getElementById("create-user-form").reset();
  document.body.style.overflow = "";
});

document.getElementById("create-user-form").addEventListener("submit", async (e) => {
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
      document.getElementById("create-user-overlay").classList.add("hidden");
      document.getElementById("create-user-form").reset();
      document.body.style.overflow = "";
      if (typeof loadUsers === "function") loadUsers();
    });
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to create user",
    });
  }
});
