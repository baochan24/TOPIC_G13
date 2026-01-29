if (typeof requireAuth === 'function' && !requireAuth('/auth')) { /* redirect - warranty backend không bắt auth nhưng vẫn dùng staff_id */ }
var API_BASE = window.API_BASE || 'http://localhost:5000';

function hd() { return typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' }; }

function receiveWarranty() {
  var warrantyId = (document.getElementById('recWarrantyId') || {}).value.trim();
  var imei = (document.getElementById('recImei') || {}).value.trim();
  var staffId = (document.getElementById('recStaffId') || {}).value.trim();
  var note = (document.getElementById('recNote') || {}).value.trim() || '';
  if (!imei || !staffId) { alert('Nhập IMEI và Staff ID'); return; }
  if (!warrantyId) warrantyId = 'WR-' + Math.random().toString(36).slice(2, 10);

  fetch(API_BASE + '/warranty/receive', { method: 'POST', headers: hd(), body: JSON.stringify({ warranty_id: warrantyId, imei_serial: imei, staff_id: staffId, note: note }) })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(r) { if (r.ok || (r.data && r.data.message)) { alert(r.data.message || 'Tiếp nhận thành công'); } else alert(r.data && r.data.error ? r.data.error : 'Lỗi'); })
    .catch(function() { alert('Lỗi kết nối'); });
}

function updateProgress() {
  var warrantyId = (document.getElementById('updWarrantyId') || {}).value.trim();
  var staffId = (document.getElementById('updStaffId') || {}).value.trim();
  var note = (document.getElementById('updNote') || {}).value.trim() || '';
  var isCompleted = (document.getElementById('updCompleted') || {}).checked;
  if (!warrantyId || !staffId) { alert('Nhập Mã phiếu BH và Staff ID'); return; }

  fetch(API_BASE + '/warranty/update_progress', { method: 'PUT', headers: hd(), body: JSON.stringify({ warranty_id: warrantyId, staff_id: staffId, note: note, is_completed: isCompleted }) })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(r) { if (r.ok || (r.data && r.data.message)) { alert(r.data.message || 'Đã cập nhật'); } else alert(r.data && r.data.error ? r.data.error : 'Lỗi'); })
    .catch(function() { alert('Lỗi kết nối'); });
}

function returnDevice() {
  var warrantyId = (document.getElementById('retWarrantyId') || {}).value.trim();
  var staffId = (document.getElementById('retStaffId') || {}).value.trim();
  var fee = parseFloat((document.getElementById('retFee') || {}).value) || 0;
  if (!warrantyId || !staffId) { alert('Nhập Mã phiếu BH và Staff ID'); return; }

  fetch(API_BASE + '/warranty/return_device', { method: 'POST', headers: hd(), body: JSON.stringify({ warranty_id: warrantyId, staff_id: staffId, fee: fee }) })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(r) { if (r.ok || (r.data && r.data.message)) { alert(r.data.message || 'Đã trả máy'); } else alert(r.data && r.data.error ? r.data.error : 'Lỗi'); })
    .catch(function() { alert('Lỗi kết nối'); });
}

document.addEventListener('DOMContentLoaded', function() {
  var btn1 = document.getElementById('receiveWarrantyBtn');
  if (btn1) btn1.addEventListener('click', receiveWarranty);

  var btn2 = document.getElementById('updateProgressBtn');
  if (btn2) btn2.addEventListener('click', updateProgress);

  var btn3 = document.getElementById('returnDeviceBtn');
  if (btn3) btn3.addEventListener('click', returnDevice);
});
