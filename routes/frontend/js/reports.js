if (typeof requireAuth === 'function' && !requireAuth('auth.html')) { /* redirect */ }
var API_BASE = window.API_BASE || 'http://127.0.0.1:5000';

function hd() { return typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : '') }; }

function generateReport() {
  var type = (document.getElementById('reportType') || {}).value || 'revenue';
  var start = (document.getElementById('startDate') || {}).value;
  var end = (document.getElementById('endDate') || {}).value;
  if (type === 'revenue' && (!start || !end)) { alert('Chọn khoảng ngày cho báo cáo doanh thu'); return; }
  if (start && end && start > end) { alert('Từ ngày phải trước đến ngày'); return; }
  if (type === 'inventory') { start = start || new Date().toISOString().slice(0,10); end = end || new Date().toISOString().slice(0,10); }

  var out = document.getElementById('reportOutput');
  if (out) out.innerHTML = '<div class="text-muted">Đang tải...</div>';

  fetch(API_BASE + '/reports/', { method: 'POST', headers: hd(), body: JSON.stringify({ type: type, start_date: start, end_date: end }) })
    .then(function(r) {
      if (r.status === 401) { window.location.href = 'auth.html'; return; }
      return r.json().then(function(d) { return { ok: r.ok, status: r.status, data: d }; });
    })
    .then(function(r) {
      if (!out) return;
      if (r.data && r.data.message && !r.data.report_type) { out.innerHTML = '<div class="alert alert-warning">' + r.data.message + '</div>'; return; }
      if (r.data && r.data.error) { out.innerHTML = '<div class="alert alert-danger">' + r.data.error + '</div>'; return; }
      if (r.ok || (r.data && r.data.data)) {
        var d = r.data.data || [];
        var typ = r.data.report_type || type;
        var from = r.data.from || start, to = r.data.to || end;
        var html = '<p class="text-muted">' + typ + ' | ' + from + ' → ' + to + '</p>';
        if (typ === 'revenue') {
          html += '<table class="table table-sm"><thead class="table-dark"><tr><th>Ngày</th><th>Doanh thu</th></tr></thead><tbody>';
          var total = 0;
          (d || []).forEach(function(row) { total += parseFloat(row.revenue || 0); html += '<tr><td>' + (row.report_date || '') + '</td><td>' + (row.revenue || 0) + '</td></tr>'; });
          html += '</tbody></table><p><strong>Tổng: ' + total + '</strong></p>';
        } else {
          html += '<table class="table table-sm"><thead class="table-dark"><tr><th>Mã SP</th><th>Tổng</th><th>Trong kho</th></tr></thead><tbody>';
          (d || []).forEach(function(row) { html += '<tr><td>' + (row.product_id || '') + '</td><td>' + (row.total_items || 0) + '</td><td>' + (row.in_stock || 0) + '</td></tr>'; });
          html += '</tbody></table>';
        }
        out.innerHTML = html;
      } else { out.innerHTML = '<div class="alert alert-danger">' + (r.data && r.data.error ? r.data.error : 'Không có quyền hoặc lỗi') + '</div>'; }
    })
    .catch(function() { var o = document.getElementById('reportOutput'); if (o) o.innerHTML = '<div class="alert alert-danger">Lỗi kết nối</div>'; });
}

document.addEventListener('DOMContentLoaded', function() {
  if (typeof getToken === 'function' && !getToken()) { window.location.href = 'auth.html'; return; }
  var today = new Date().toISOString().slice(0,10);
  var sd = document.getElementById('startDate'); if (sd && !sd.value) sd.value = today;
  var ed = document.getElementById('endDate'); if (ed && !ed.value) ed.value = today;
});
