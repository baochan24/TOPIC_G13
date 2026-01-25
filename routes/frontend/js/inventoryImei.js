const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'auth.html';
}
if (typeof requireAuth === 'function' && !requireAuth('auth.html')) { /* redirect */ }
var API_BASE = window.API_BASE || 'http://127.0.0.1:5000';
var _lastLookupImei = '';

function hd() { return typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : '') }; }

function importOne() {
  var productId = (document.getElementById('impProductId') || {}).value.trim();
  var imei = (document.getElementById('impImei') || {}).value.trim();
  if (!productId || !imei) { alert('Nhập đủ Mã SP và IMEI'); return; }
  var condition = (document.getElementById('impCondition') || {}).value || 'NEW';

  fetch(API_BASE + '/inventory/import', { method: 'POST', headers: hd(), body: JSON.stringify({ product_id: productId, imei_serial: imei, condition: condition }) })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(r) { if (r.ok || r.data.message) { alert(r.data.message || 'Nhập kho thành công'); document.getElementById('impImei').value = ''; } else alert(r.data.message || r.data.error || 'Lỗi'); })
    .catch(function() { alert('Lỗi kết nối'); });
}

function importBatch() {
  var productId = (document.getElementById('batchProductId') || {}).value.trim();
  var raw = (document.getElementById('batchImeis') || {}).value || '';
  var arr = raw.split(/[\n,;\s]+/).map(function(s) { return s.trim(); }).filter(Boolean);
  if (!productId || !arr.length) { alert('Nhập Mã SP và ít nhất 1 IMEI'); return; }
  var items = arr.map(function(imei) { return { imei_serial: imei, condition: 'NEW' }; });

  fetch(API_BASE + '/inventory/import-batch', { method: 'POST', headers: hd(), body: JSON.stringify({ product_id: productId, items: items }) })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(r) {
      if (r.ok || r.data.imported != null) { alert('Nhập: ' + (r.data.imported || 0) + (r.data.failed && r.data.failed.length ? ', Lỗi: ' + r.data.failed.join(', ') : '')); document.getElementById('batchImeis').value = ''; }
      else alert(r.data.message || 'Lỗi');
    })
    .catch(function() { alert('Lỗi kết nối'); });
}

function lookupImei() {
  var imei = (document.getElementById('lookupImei') || {}).value.trim();
  if (!imei) { alert('Nhập IMEI'); return; }
  _lastLookupImei = imei;

  fetch(API_BASE + '/inventory/imei/' + encodeURIComponent(imei), { headers: hd() })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(r) {
      var res = document.getElementById('lookupResult');
      var su = document.getElementById('statusUpdate');
      if (!res) return;
      if (r.ok && r.data) {
        res.innerHTML = '<div class="alert alert-success">IMEI: ' + (r.data.imei_serial || '') + ' | SP: ' + (r.data.product_name || '') + ' | Hãng: ' + (r.data.brand || '') + ' | Trạng thái: ' + (r.data.status || '') + ' | Tình trạng: ' + (r.data.item_condition || '') + '</div>';
        if (su) { su.classList.remove('d-none'); (document.getElementById('newStatus') || {}).value = r.data.status || 'IN_STOCK'; }
      } else {
        res.innerHTML = '<div class="alert alert-danger">' + (r.data && r.data.message ? r.data.message : 'IMEI không tồn tại') + '</div>';
        if (su) su.classList.add('d-none');
      }
    })
    .catch(function() { var res = document.getElementById('lookupResult'); if (res) res.innerHTML = '<div class="alert alert-danger">Lỗi kết nối</div>'; });
}

function updateImeiStatus() {
  var imei = _lastLookupImei || (document.getElementById('lookupImei') || {}).value.trim();
  var status = (document.getElementById('newStatus') || {}).value;
  if (!imei || !status) { alert('Thiếu IMEI hoặc trạng thái'); return; }

  fetch(API_BASE + '/inventory/imei/' + encodeURIComponent(imei) + '/status', { method: 'PUT', headers: hd(), body: JSON.stringify({ status: status }) })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(r) { if (r.ok || (r.data && r.data.message)) { alert(r.data.message || 'Đã cập nhật'); lookupImei(); } else alert(r.data && r.data.message ? r.data.message : 'Lỗi'); })
    .catch(function() { alert('Lỗi kết nối'); });
}

function loadInventoryReport() {
  fetch(API_BASE + '/inventory/', { headers: hd() })
    .then(function(r) { if (r.status === 401) { window.location.href = 'auth.html'; return; } return r.json(); })
    .then(function(arr) {
      var t = document.querySelector('#reportTable tbody');
      if (!t) return;
      t.innerHTML = (arr || []).map(function(row) {
        return '<tr><td>' + (row.product_id || '') + '</td><td>' + (row.total || 0) + '</td><td>' + (row.in_stock != null ? row.in_stock : '-') + '</td></tr>';
      }).join('') || '<tr><td colspan="3" class="text-center">Chưa có dữ liệu</td></tr>';
    })
    .catch(function() { var t = document.querySelector('#reportTable tbody'); if (t) t.innerHTML = '<tr><td colspan="3" class="text-center">Lỗi tải</td></tr>'; });
}

document.addEventListener('DOMContentLoaded', function() {
  if (typeof getToken === 'function' && !getToken()) { window.location.href = 'auth.html'; return; }
});
