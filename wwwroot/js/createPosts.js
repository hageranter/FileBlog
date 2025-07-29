console.log('Create Posts JS loaded');
let pendingStatus = ""; // Track status selected by buttons

const form = document.getElementById('create-post-form');
const statusInput = document.getElementById("post-status");
const scheduleInput = document.getElementById("scheduled-date");
const confirmScheduleBtn = document.getElementById("btn-confirm-schedule");

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const token = localStorage.getItem('token');
  if (!token) {
    return Swal.fire({
      icon: 'warning',
      title: 'Unauthorized',
      text: 'You must be logged in to create a blog.'
    });
  }

  const payload = JSON.parse(atob(token.split('.')[1]));
  const username = payload.username;

  statusInput.value = pendingStatus;
  console.log("Submitting with status:", pendingStatus);

  const formData = new FormData(form);

  if (pendingStatus === "scheduled" && scheduleInput.value) {
    formData.set('scheduledDate', scheduleInput.value);
  }

  const files = document.getElementById('assets').files;
  for (let i = 0; i < files.length; i++) {
    formData.append('file', files[i]);
  }

  try {
    const res = await fetch(`/posts/create/${username}`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error(await res.text());

    Swal.fire({
      icon: 'success',
      title: 'Post Created',
      text: '✅ Your blog has been created successfully!',
      confirmButtonText: 'Go to Explore More Blogs'
    }).then(() => {
      window.location.href = '/posts.html?mine=true';
    });

  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Failed to Create Blog',
      text: err.message
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
