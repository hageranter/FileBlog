async function loadProfile(payload) {
  try {
     res = await fetch(`/users/${payload.username}`);
    if (!res.ok) throw new Error("Profile not found");

    const user = await res.json();
    document.getElementById('username').textContent  = payload.username;
     console.log("Loading profile for:", payload.username);

    document.getElementById('email').textContent     = payload.email || '—';
    document.getElementById('role').textContent      = payload.role || '—';
    document.getElementById('nickname').textContent  = payload.nickname || '—';
    document.getElementById('birthdate').textContent = payload.birthDate || '—';

    //  avatarUrl = `/userfiles/${username}/avatar.jpg`;
    //  check = await fetch(avatarUrl);
    // if (check.ok) {
    //   document.getElementById('avatar').src = avatarUrl;
    // }
  } catch (err) {
    console.error("Failed to load profile:", err);
  }
}

(function () {
   token = localStorage.getItem("token");
  if (!token) {
    console.warn("No JWT in localStorage → user is not logged in");
    return;
  }

  payload = JSON.parse(atob(token.split('.')[1]));
  console.log("Decoded JWT payload ➜", payload);

  loadProfile(payload);
})();
