// ===============================
// API CONFIG (FIXED)
// ===============================
const API_BASE = 'http://127.0.0.1:5000';
window.API_BASE = API_BASE;

// ===============================
// TOKEN & ROLE
// ===============================
function getToken() {
  return localStorage.getItem('token') || '';
}

function setToken(token) {
  if (token) localStorage.setItem('token', token);
}

function setRole(role) {
  if (role) localStorage.setItem('role', role);
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
}

function getAuthHeaders(extra) {
  const h = { 'Content-Type': 'application/json', ...(extra || {}) };
  const t = getToken();
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

function getRole() {
  return localStorage.getItem('role') || '';
}

function requireAuth(redirectUrl = 'auth.html') {
  if (!getToken()) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}
