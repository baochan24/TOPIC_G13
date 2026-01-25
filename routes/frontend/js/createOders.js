if (typeof requireAuth === 'function' && !requireAuth('auth.html')) { /* redirect */ }
var API_BASE = window.API_BASE || 'http://127.0.0.1:5000';

function hd() { return typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : '') }; }

function getImeiList() {
  var raw = (document.getElementById('imeisInput') || {}).value || '';
  return raw.split(/[\n,;\s]+/).map(function(s) { return s.trim(); }).filter(Boolean);
}

function doCheckout() {
  var imeis = getImeiList();
  if (!imeis.length) { alert('Vui lòng nhập ít nhất 1 IMEI'); return; }

  var customerId = (document.getElementById('customerId') || {}).value.trim() || null;
  var paymentMethod = (document.getElementById('paymentMethod') || {}).value || 'CASH';

  var resEl = document.getElementById('checkoutResult');
  if (resEl) { resEl.classList.add('d-none'); resEl.classList.remove('alert-success','alert-danger'); }

  fetch(API_BASE + '/orders', {
    method: 'POST',
    headers: hd(),
    body: JSON.stringify({ customer_id: customerId, imeis: imeis, payment_method: paymentMethod })
  })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, status: r.status, data: d }; }); })
    .then(function(r) {
      if (!resEl) return;
      resEl.classList.remove('d-none');
      if (r.ok || r.status === 201) {
        resEl.classList.add('alert-success');
        resEl.innerHTML = '<strong>Thành công.</strong> Mã đơn: ' + (r.data.order_id || '') + ', Tổng: ' + (r.data.total_amount != null ? r.data.total_amount : '') + ' ' + (r.data.message || '');
      } else {
        resEl.classList.add('alert-danger');
        resEl.innerHTML = (r.data && r.data.message) ? r.data.message : ('Lỗi: ' + JSON.stringify(r.data));
      }
    })
    .catch(function() {
      if (resEl) { resEl.classList.remove('d-none'); resEl.classList.add('alert-danger'); resEl.textContent = 'Lỗi kết nối'; }
    });
}

// Preview IMEI khi gõ
(function(){
  var ta = document.getElementById('imeisInput');
  var pr = document.getElementById('imeisPreview');
  if (!ta || !pr) return;
  function up() {
    var arr = getImeiList();
    pr.innerHTML = arr.length ? ('<small class="text-muted">Số IMEI: ' + arr.length + '</small>') : '';
  }
  ta.addEventListener('input', up);
  ta.addEventListener('change', up);
})();
