var _logsPage = 1, _logsLimit = 20;

/* =========================
   HEADERS
========================= */
function hd() {
  if (typeof getAuthHeaders === 'function') return getAuthHeaders();
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + (typeof getToken === 'function' ? getToken() : '')
  };
}

/* =========================
   LOAD LOGS (ADMIN)
========================= */
function loadLogs() {
  var q = '?page=' + _logsPage + '&limit=' + _logsLimit;

  var u = document.getElementById('qUserId');
  if (u && u.value.trim()) q += '&user_id=' + encodeURIComponent(u.value.trim());

  var k = document.getElementById('qKeyword');
  if (k && k.value.trim()) q += '&keyword=' + encodeURIComponent(k.value.trim());

  var df = document.getElementById('qDateFrom');
  if (df && df.value) q += '&date_from=' + df.value;

  var dt = document.getElementById('qDateTo');
  if (dt && dt.value) q += '&date_to=' + dt.value;

  fetch(API_BASE + '/auth/system-logs_user' + q, { headers: hd() })
    .then(function (r) {
      if (r.status === 401) { window.location.href = 'auth.html'; return null; }
      if (r.status === 403) {
        var t = document.querySelector('#logsTable tbody');
        if (t) t.innerHTML = '<tr><td colspan="5" class="text-center">Không có quyền (Admin)</td></tr>';
        return null;
      }
      return r.json();
    })
    .then(function (res) {
      if (!res || !res.data) return;

      var t = document.querySelector('#logsTable tbody');
      if (!t) return;

      var rows = res.data || [];
      t.innerHTML = rows.length
        ? rows.map(function (l) {
            return '<tr>'
              + '<td>' + (l.log_id || '') + '</td>'
              + '<td>' + (l.user_id || '') + '</td>'
              + '<td>' + (l.action || '').replace(/</g, '&lt;') + '</td>'
              + '<td>' + (l.ip_address || '') + '</td>'
              + '<td>' + (l.timestamp || '') + '</td>'
              + '</tr>';
          }).join('')
        : '<tr><td colspan="5" class="text-center">Không có dữ liệu</td></tr>';

      document.getElementById('logsPrev').disabled = _logsPage <= 1;
      document.getElementById('logsNext').disabled = rows.length < _logsLimit;
      document.getElementById('logsPageNum').textContent = _logsPage;
    })
    .catch(function () {
      var t = document.querySelector('#logsTable tbody');
      if (t) t.innerHTML = '<tr><td colspan="5" class="text-center">Lỗi tải</td></tr>';
    });
}

/* =========================
   PAGINATION
========================= */
function logsPage(d) {
  _logsPage = Math.max(1, _logsPage + d);
  loadLogs();
}

/* =========================
   STATISTICS (ADMIN)
========================= */
function loadLogStats() {
  fetch(API_BASE + '/auth/system-logs/statistics', { headers: hd() })
    .then(function (r) {
      if (r.status === 401) { window.location.href = 'auth.html'; return null; }
      if (r.status === 403) return [];
      return r.json();
    })
    .then(function (arr) {
      var t = document.querySelector('#statsTable tbody');
      if (!t) return;
      arr = Array.isArray(arr) ? arr : [];
      t.innerHTML = arr.length
        ? arr.map(function (s) {
            return '<tr><td>' + (s.log_date || '') + '</td><td>' + (s.total_logs || 0) + '</td></tr>';
          }).join('')
        : '<tr><td colspan="2" class="text-center">Chưa có dữ liệu</td></tr>';
    });
}

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', function () {
  if (typeof getToken === 'function' && !getToken()) {
    window.location.href = 'auth.html';
    return;
  }

  loadLogs();

  var btn;
  btn = document.getElementById('loadLogsBtn'); if (btn) btn.onclick = loadLogs;
  btn = document.getElementById('logsPrev'); if (btn) btn.onclick = function () { logsPage(-1); };
  btn = document.getElementById('logsNext'); if (btn) btn.onclick = function () { logsPage(1); };
  btn = document.getElementById('loadLogStatsBtn'); if (btn) btn.onclick = loadLogStats;
});
