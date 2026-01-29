if (typeof requireAuth === 'function' && !requireAuth('/auth')) { /* redirect */ }
var API_BASE = window.API_BASE || 'http://localhost:5000';
var _logsPage = 1, _logsLimit = 20;

function hd() { return typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : '') }; }

function loadLogs() {
  var q = '?page=' + _logsPage + '&limit=' + _logsLimit;
  var u = (document.getElementById('qUserId') || {}).value.trim(); if (u) q += '&user_id=' + encodeURIComponent(u);
  var k = (document.getElementById('qKeyword') || {}).value.trim(); if (k) q += '&keyword=' + encodeURIComponent(k);
  var df = (document.getElementById('qDateFrom') || {}).value; if (df) q += '&date_from=' + df;
  var dt = (document.getElementById('qDateTo') || {}).value; if (dt) q += '&date_to=' + dt;

  fetch(API_BASE + '/auth/system-logs_user' + q, { headers: hd() })
    .then(function(r) {
      if (r.status === 401) { window.location.href = 'auth.html'; return; }
      if (r.status === 403) { var t = document.querySelector('#logsTable tbody'); if (t) t.innerHTML = '<tr><td colspan="5" class="text-center">Không có quyền (chỉ Admin)</td></tr>'; return; }
      return r.json();
    })
    .then(function(res) {
      if (!res || !res.data) return;
      var t = document.querySelector('#logsTable tbody');
      if (!t) return;
      t.innerHTML = (res.data || []).map(function(l) {
        return '<tr><td>' + (l.log_id || '') + '</td><td>' + (l.user_id || '') + '</td><td>' + (l.action || '').replace(/</g,'&lt;') + '</td><td>' + (l.ip_address || '') + '</td><td>' + (l.timestamp || '') + '</td></tr>';
      }).join('') || '<tr><td colspan="5" class="text-center">Không có dữ liệu</td></tr>';

      var pn = document.getElementById('logsPageNum'); if (pn) pn.textContent = _logsPage;
      document.getElementById('logsPagination').textContent = 'Trang ' + _logsPage + ', limit ' + _logsLimit;
      document.getElementById('logsPrev').disabled = _logsPage <= 1;
      document.getElementById('logsNext').disabled = (res.data || []).length < _logsLimit;
    })
    .catch(function() { var t = document.querySelector('#logsTable tbody'); if (t) t.innerHTML = '<tr><td colspan="5" class="text-center">Lỗi tải</td></tr>'; });
}

function logsPage(d) { _logsPage = Math.max(1, _logsPage + d); loadLogs(); }

function loadLogStats() {
  fetch(API_BASE + '/auth/system-logs/statistics', { headers: hd() })
    .then(function(r) { if (r.status === 401) { window.location.href = 'auth.html'; return; } if (r.status === 403) return []; return r.json(); })
    .then(function(arr) {
      var t = document.querySelector('#statsTable tbody');
      if (!t) return;
      arr = Array.isArray(arr) ? arr : [];
      t.innerHTML = arr.map(function(s) { return '<tr><td>' + (s.log_date || '') + '</td><td>' + (s.total_logs || 0) + '</td></tr>'; }).join('') || '<tr><td colspan="2" class="text-center">Chưa có dữ liệu</td></tr>';
    })
    .catch(function() { var t = document.querySelector('#statsTable tbody'); if (t) t.innerHTML = '<tr><td colspan="2" class="text-center">Lỗi</td></tr>'; });
}

document.addEventListener('DOMContentLoaded', function() {
  if (typeof getToken === 'function' && !getToken()) { window.location.href = 'auth.html'; return; }
  loadLogs();

  var loadBtn = document.getElementById('loadLogsBtn');
  if (loadBtn) loadBtn.addEventListener('click', loadLogs);

  var prevBtn = document.getElementById('logsPrev');
  if (prevBtn) prevBtn.addEventListener('click', function() { logsPage(-1); });

  var nextBtn = document.getElementById('logsNext');
  if (nextBtn) nextBtn.addEventListener('click', function() { logsPage(1); });

  var statsBtn = document.getElementById('loadLogStatsBtn');
  if (statsBtn) statsBtn.addEventListener('click', loadLogStats);
});
