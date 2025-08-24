
console.log('Create Posts JS loaded');
let pendingStatus = ""; // Track status selected by buttons

const form = document.getElementById('create-post-form');
const statusInput = document.getElementById("post-status");
const scheduleInput = document.getElementById("scheduled-date");
const confirmScheduleBtn = document.getElementById("btn-confirm-schedule");

function getToken() {
  return localStorage.getItem('token');
}
function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const token = getToken();
  if (!token) {
    return Swal.fire({
      icon: 'warning',
      title: 'Unauthorized',
      text: 'You must be logged in to create a blog.'
    });
  }

  let payload;
  try {
    payload = JSON.parse(atob(token.split('.')[1]));
  } catch {
    return Swal.fire({ icon: 'error', title: 'Invalid session', text: 'Please log in again.' });
  }
  const username = payload.username;

  statusInput.value = pendingStatus;
  console.log("Submitting with status:", pendingStatus);

  const formData = new FormData(form);

  if (pendingStatus === "scheduled" && scheduleInput.value) {
    formData.set('scheduledDate', scheduleInput.value);
  }

  const filesInput = document.getElementById('assets');
  if (filesInput && filesInput.files) {
    for (let i = 0; i < filesInput.files.length; i++) {
      formData.append('file', filesInput.files[i]);
    }
  }

  try {
    // ✅ POST to the namespaced API route
    const res = await fetch(`/api/posts/create/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: authHeaders(),   // ✅ include Bearer token
      body: formData
    });

    if (!res.ok) throw new Error(await res.text());

    Swal.fire({
      icon: 'success',
      title: 'Post Created',
      text: '✅ Your blog has been created successfully!',
      confirmButtonText: 'Go to Explore More Blogs'
    }).then(() => {
      // redirect wherever your list page is; keep if you already have /posts.html
      window.location.href = '/posts?mine=true';
    });

  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Failed to Create Blog',
      text: err.message || 'Something went wrong.'
    });
  }
});

document.getElementById("btn-publish").addEventListener("click", () => {
  pendingStatus = "published";
  form.requestSubmit();
});

document.getElementById("btn-draft").addEventListener("click", () => {
  pendingStatus = "draft";
  form.requestSubmit();
});

document.getElementById("btn-schedule").addEventListener("click", () => {
  scheduleInput.style.display = "inline-block";
  confirmScheduleBtn.style.display = "inline-block";
  scheduleInput.focus();
});

confirmScheduleBtn.addEventListener("click", () => {
  if (scheduleInput.value) {
    pendingStatus = "scheduled";
    form.requestSubmit();
  } else {
    Swal.fire({
      icon: 'info',
      title: 'Schedule Missing',
      text: 'Please select a date and time before confirming.'
    });
  }
});

document.getElementById("btn-discard").addEventListener("click", () => {
  Swal.fire({
    icon: 'warning',
    title: 'Discard Blog?',
    text: 'Are you sure you want to discard everything?',
    showCancelButton: true,
    confirmButtonText: 'Yes, discard it',
    cancelButtonText: 'Cancel'
  }).then(result => {
    if (result.isConfirmed) {
      form.reset();
      scheduleInput.style.display = "none";
      confirmScheduleBtn.style.display = "none";
      Swal.fire('Cleared!', 'Blog form has been reset.', 'success');
    }
  });
});

// Handle contact form submission (unchanged; /contact isn’t under /api)
async function submitForm() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  if (!name || !email || !message) {
    Swal.fire({
      icon: 'warning',
      title: 'Missing Fields',
      text: 'Please fill in all the fields before submitting.',
      confirmButtonColor: '#f0ad4e'
    });
    return;
  }

  try {
    const response = await fetch("/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message })
    });

    if (response.ok) {
      Swal.fire({
        icon: 'success',
        title: 'Message Sent',
        text: 'We’ve received your message. Please check your email!',
        confirmButtonColor: '#3085d6'
      });
      document.getElementById("contact-form").reset();
    } else {
      throw new Error("Request failed");
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'Something went wrong while sending your message.',
      confirmButtonColor: '#d33'
    });
    console.error("Contact form error:", error);
  }
}

// Auth-based UI adjustments
(function () {
  const token = getToken();
  if (!token) return;

  const authBtns = document.getElementById('auth-buttons');
  const userProfile = document.getElementById('user-profile');

  if (authBtns) authBtns.style.display = 'none';
  if (userProfile) userProfile.style.display = 'inline-block';

  try {
    const { username } = JSON.parse(atob(token.split('.')[1]));

    // /users stays as-is (not namespaced); add Authorization if it’s protected
    fetch(`/users/${encodeURIComponent(username)}`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        const avatarUrl = user?.avatarUrl || '/images/profile-icon.jpg';
        const profileImg = document.getElementById('profile-icon');
        if (profileImg) profileImg.src = avatarUrl;
      })
      .catch(() => {
        const fallbackImg = document.getElementById('profile-icon');
        if (fallbackImg) fallbackImg.src = '/images/profile-icon.jpg';
      });
  } catch (err) {
    console.error('Invalid token format:', err);
    const profileImg = document.getElementById('profile-icon');
    if (profileImg) profileImg.src = '/images/profile-icon.jpg';
  }

  const ctaBtn = document.querySelector('.cta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      window.location.href = token ? '/createPosts.html' : '/login';
    });
  }
})();
