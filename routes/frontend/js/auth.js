document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorBox = document.getElementById('errorBox');

  errorBox.classList.add('d-none');

  console.log('API_BASE:', window.API_BASE);

  try {
    const res = await fetch(`${window.API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    console.log('Response status:', res.status);

    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.message || 'Đăng nhập thất bại';
      errorBox.classList.remove('d-none');
      return;
    }

    setToken(data.token);
    setRole(data.role);

    window.location.href = 'index.html';

  } catch (err) {
    console.error(err);
    errorBox.textContent = 'Không thể kết nối server';
    errorBox.classList.remove('d-none');
  }
});
