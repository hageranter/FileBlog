// import Swal from 'sweetalert2';
// const token = localStorage.getItem("token");

// if (!token) {
//   Swal.fire({
//     icon: "error",
//     title: "Not Logged In",
//     text: "You are not logged in. Redirecting to login page...",
//   }).then(() => {
//     window.location.href = "/login.html";
//   });
// }

// async function loadUsers() {
//   try {
//     const res = await fetch("/admin/users", {
//       headers: { Authorization: `Bearer ${token}` }
//     });

//     if (!res.ok) throw new Error("Unauthorized or failed to load users");

//     const users = await res.json();
//     const container = document.getElementById("user-list");
//     container.innerHTML = "";

//     users.forEach(user => {
//       const userDiv = document.createElement("div");
//       userDiv.classList.add("user-card");

//       userDiv.innerHTML = `
//         <div class="user-info">
//           <a href="admin_user_posts.html?user=${user.username}">${user.username}</a> 
//           <span>- ${user.role}</span>
//         </div>
//         <div class="btn-group">
//           <button class="btn btn-admin" onclick="changeRole('${user.username}', 'Admin')">Make Admin</button>
//           <button class="btn btn-author" onclick="changeRole('${user.username}', 'Author')">Make Author</button>
//         </div>
//       `;

//       container.appendChild(userDiv);
//     });
//   } catch (err) {
//     console.error(err);
//     Swal.fire({
//   icon: "error",
//   title: "Oops...",
//   text: "Something went wrong!",
// });
//   }
// }

// function changeRole(username, newRole) {
//   const token = localStorage.getItem("token");

//   fetch(`/admin/users/${username}/role`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${token}`
//     },
//     body: JSON.stringify({ role: newRole })
//   })
//     .then(res => {
//       if (!res.ok) throw new Error("Failed to update role");
//       return res.json();
//     })
//     .then(data => {
//       Swal.fire({
//         icon: "success",
//         title: "Role Updated",
//         text: `${username} is now ${data.newRole}`
//       });
//       location.reload();
//     })
//     .catch(err => {
//       console.error(err);
//    Swal.fire({
//   icon: "error",
//   title: "Oops...",
//   text: "Something went wrong!",
// });
//     });
// }

// loadUsers();
