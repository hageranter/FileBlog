console.log('Create Posts JS loaded');
let pendingStatus = ""; // Track status selected by buttons

const form = document.getElementById('create-post-form');
const statusInput = document.getElementById("post-status");
const scheduleInput = document.getElementById("scheduled-date");
const confirmScheduleBtn = document.getElementById("btn-confirm-schedule");

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const token = localStorage.getItem('token');
  if (!token) return alert('You must be logged in.');

  const payload = JSON.parse(atob(token.split('.')[1]));
  const username = payload.username;

  // Set the hidden input value based on button pressed
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

    showSuccessModal('✅ Post created successfully!');
  } catch (err) {
    showErrorModal('❌ Error: ' + err.message);
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
    alert("Please select a date/time first.");
  }
});

document.getElementById("btn-discard").addEventListener("click", () => {
  if (confirm("Discard this post?")) {
    form.reset();
    scheduleInput.style.display = "none";
    confirmScheduleBtn.style.display = "none";
  }
});

// Optional: Custom success / error modals
function showSuccessModal(message) {
  const modal = document.createElement('div');
  modal.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); color:white; display:flex; align-items:center; justify-content:center; font-size:2em; z-index:1000;';
  modal.innerHTML = `${message}<br><button onclick="window.location.href='/posts.html?mine=true'">OK</button>`;
  document.body.appendChild(modal);
}

function showErrorModal(message) {
  const modal = document.createElement('div');
  modal.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); color:white; display:flex; align-items:center; justify-content:center; font-size:2em; z-index:1000;';
  modal.innerHTML = `${message}<br><button onclick="this.parentElement.remove()">Close</button>`;
  document.body.appendChild(modal);
}
