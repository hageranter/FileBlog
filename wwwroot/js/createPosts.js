console.log('Create Posts JS loaded');
document.getElementById('create-post-form').addEventListener('submit', async function (e) {
  console.log('Create Posts JS loaded');

  e.preventDefault();

  const token = localStorage.getItem('token');
  if (!token) return alert('You must be logged in.');

  const payload = JSON.parse(atob(token.split('.')[1]));
  const username = payload.username;

  const formData = new FormData();
  formData.append('title', document.getElementById('title').value);
  formData.append('description', document.getElementById('description').value);
  formData.append('body', document.getElementById('body').value);
  formData.append('tags', document.getElementById('tags').value);
  formData.append('categories', document.getElementById('categories').value);

  const files = document.getElementById('assets').files;
  for (let i = 0; i < files.length; i++) {
    formData.append('file', files[i]);
  }

  try {
    const res = await fetch(`/posts/create/${username}`, {
      method: 'POST',
      body: formData
    });
    console.log('Create Posts done', res);


    if (!res.ok) throw new Error(await res.text());

    alert('✅ Post created successfully!');
    window.location.href = '/posts.html?mine=true';
  } catch (err) {
    alert('Error: ' + err.message);
  }
});
