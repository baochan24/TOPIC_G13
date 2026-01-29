document.addEventListener("DOMContentLoaded", async () => {
  const token = getToken();
  if (!token) return;

  const res = await fetch(API_BASE + "/auth/verify", {
    headers: getAuthHeaders()
  });

  if (res.ok) {
    window.location.href = "index.html";
  }
});

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const username = usernameInput.value;
  const password = passwordInput.value;

  const res = await fetch(API_BASE + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (!res.ok) return alert(data.message);

  setToken(data.token);
  setRole(data.role);
  window.location.href = "index.html";
});


document.addEventListener('DOMContentLoaded', async function () {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: getAuthHeaders()
    });

    if (res.ok) {
      window.location.href = '/index.html';
    }
  } catch (_) {
    console.log('Token invalid');
  }
});

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorBox = document.getElementById('errorBox');

  errorBox.classList.add('d-none');

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.message || 'Đăng nhập thất bại';
      errorBox.classList.remove('d-none');
      return;
    }

    setToken(data.token);
    setRole(data.role);
    window.location.href = '/index.html';

  } catch (err) {
    errorBox.textContent = 'Không thể kết nối server';
    errorBox.classList.remove('d-none');
  }
});
