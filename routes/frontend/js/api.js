// ===============================
// API CONFIG (FINAL)
// ===============================
const API_BASE = 'http://192.168.1.76:5000';
window.API_BASE = API_BASE;

// ===============================
// TOKEN & ROLE
// ===============================
function getToken() {
  return localStorage.getItem("token");
}

function setToken(token) {
  if (token) localStorage.setItem('token', token);
}

function setRole(role) {
  if (role) localStorage.setItem('role', role);
}

function getRole() {
  return localStorage.getItem('role') || '';
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
}


function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getToken()
  };
}
function requireAuth(redirectUrl = 'auth.html') {
  if (!getToken()) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}
