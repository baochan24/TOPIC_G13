/* =========================
   AUTH.JS – FINAL
   Không trùng event
   Không redirect vòng lặp
========================= */

console.log('AUTH JS LOADED');

/* =========================
   AUTO REDIRECT IF LOGGED IN
========================= */
document.addEventListener('DOMContentLoaded', async function () {
  if (typeof getToken !== 'function') return;

  const token = getToken();
  if (!token) return; // chưa login → ở lại trang auth

  try {
    const res = await fetch(API_BASE + '/auth/verify', {
      headers: getAuthHeaders()
    });

    if (res.ok) {
      // đã login → vào dashboard
      window.location.replace('index.html');
    }
  } catch (e) {
    console.log('Token không hợp lệ');
  }
});

/* =========================
   LOGIN SUBMIT
========================= */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    const errorBox = document.getElementById('errorBox');

    if (errorBox) errorBox.classList.add('d-none');

    if (!username || !password) {
      if (errorBox) {
        errorBox.textContent = 'Vui lòng nhập đầy đủ thông tin';
        errorBox.classList.remove('d-none');
      }
      return;
    }

    try {
      const res = await fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        if (errorBox) {
          errorBox.textContent = data.message || 'Đăng nhập thất bại';
          errorBox.classList.remove('d-none');
        }
        return;
      }

      // ✅ LƯU TOKEN + ROLE (ĐÚNG BACKEND)
      setToken(data.token);
      setRole(data.user.role);

      // redirect sau login
      window.location.replace('index.html');

    } catch (err) {
      if (errorBox) {
        errorBox.textContent = 'Không thể kết nối server';
        errorBox.classList.remove('d-none');
      }
    }
  });
}
