if (typeof requireAuth === 'function' && !requireAuth('auth.html')) { /* redirect */ }
var API_BASE = window.API_BASE || 'http://localhost:5000';

function hd() { return typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : ''); }; }

function loadReturnRequests() {
  fetch(API_BASE + '/returns', { headers: hd() })
    .then(function(r) { if (r.status === 401) { window.location.href = 'auth.html'; return; } return r.status === 403 ? [] : r.json(); })
    .then(function(data) {
      var arr = Array.isArray(data) ? data : (data && data.data ? data.data : []);
      var t = document.querySelector('#returnsTable tbody');
      if (!t) return;
      t.innerHTML = arr.map(function(r) {
        var retId = (r.return_id || '').replace(/'/g,"\\'");
        return '<tr><td>' + (r.return_id || '') + '</td><td>' + (r.order_item_id || '') + '</td><td>' + (r.reason || '-') + '</td><td>' + (r.refund_amount != null ? r.refund_amount : '-') + '</td><td>' + (r.return_date || 'Chưa xử lý') + '</td><td>' + (!r.return_date ? '<button class="btn btn-sm btn-warning" onclick="openProcess(\'' + retId + '\')">Xử lý</button>' : '-') + '</td></tr>';
      }).join('') || '<tr><td colspan="6" class="text-center">Không có dữ liệu hoặc không có quyền (Admin)</td></tr>';
    })
    .catch(function() { var t = document.querySelector('#returnsTable tbody'); if (t) t.innerHTML = '<tr><td colspan="6" class="text-center">Lỗi tải</td></tr>'; });
}

function openProcess(returnId) {
  document.getElementById('processReturnId').value = returnId || '';
  document.getElementById('processApprove').checked = true;
  document.getElementById('processRestock').checked = true;
  document.getElementById('processNote').value = '';
  new bootstrap.Modal(document.getElementById('modalProcess')).show();
}

function doProcessReturn() {
  var id = document.getElementById('processReturnId').value;
  if (!id) return;
  var body = {
    approve: document.getElementById('processApprove').checked,
    restock: document.getElementById('processRestock').checked,
    note: document.getElementById('processNote').value.trim() || ''
  };

  fetch(API_BASE + '/returns/' + encodeURIComponent(id) + '/process', { method: 'POST', headers: hd(), body: JSON.stringify(body) })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(r) {
      if (r.ok || (r.data && r.data.message)) { bootstrap.Modal.getInstance(document.getElementById('modalProcess')).hide(); loadReturnRequests(); alert(r.data.message || 'Đã xử lý'); }
      else alert(r.data && r.data.message ? r.data.message : 'Lỗi');
    })
    .catch(function() { alert('Lỗi kết nối'); });
}

function requestReturn() {
  var orderItemId = (document.getElementById('reqOrderItemId') || {}).value.trim();
  var reason = (document.getElementById('reqReason') || {}).value.trim() || '';
  if (!orderItemId) { alert('Nhập order_item_id'); return; }

  fetch(API_BASE + '/returns/request', { method: 'POST', headers: hd(), body: JSON.stringify({ order_item_id: orderItemId, reason: reason }) })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, status: r.status, data: d }; }); })
    .then(function(r) {
      if (r.ok || r.status === 201) { alert('Tạo yêu cầu thành công. Mã: ' + (r.data.return_id || '')); document.getElementById('reqOrderItemId').value = ''; document.getElementById('reqReason').value = ''; loadReturnRequests(); }
      else alert(r.data && r.data.message ? r.data.message : 'Lỗi hoặc không có quyền (role customer)');
    })
    .catch(function() { alert('Lỗi kết nối'); });
}

document.addEventListener('DOMContentLoaded', function() {
  if (typeof getToken === 'function' && !getToken()) { window.location.href = 'auth.html'; return; }
  loadReturnRequests();
});
