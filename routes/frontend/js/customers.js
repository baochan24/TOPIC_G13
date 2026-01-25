if (typeof requireAuth === 'function' && !requireAuth('auth.html')) { /* redirect done */ }
var API_BASE = window.API_BASE || 'http://127.0.0.1:5000';
var _page = 1, _pageSize = 20, _total = 0;

function hd() { return typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : '') }; }

function loadCustomers() {
  var q = (document.getElementById('searchQ') || {}).value || '';
  var url = API_BASE + '/customers?page=' + _page + '&page_size=' + _pageSize;
  if (q) url += '&q=' + encodeURIComponent(q);

  fetch(url, { headers: hd() })
    .then(function(r) { if (r.status === 401) { window.location.href = 'auth.html'; return; } return r.json(); })
    .then(function(res) {
      if (!res || !res.data) return;
      _total = res.total || 0;
      var t = document.getElementById('customersTable');
      if (!t) return;
      t.innerHTML = (res.data || []).map(function(c) {
        return '<tr><td>' + (c.customer_id || '') + '</td><td>' + (c.full_name || '-') + '</td><td>' + (c.phone_number || '-') + '</td><td>' + (c.email || '-') + '</td><td>' + (c.address || '-') + '</td><td><button class="btn btn-sm btn-warning me-1" onclick="openModalCustomer(\'' + (c.customer_id || '').replace(/'/g,"\\'") + '\',\'' + (c.full_name||'').replace(/'/g,"\\'") + '\',\'' + (c.phone_number||'').replace(/'/g,"\\'") + '\',\'' + (c.email||'').replace(/'/g,"\\'") + '\',\'' + (c.address||'').replace(/'/g,"\\'") + '\')">Sửa</button><button class="btn btn-sm btn-info me-1" onclick="viewHistory(\'' + (c.customer_id||'').replace(/'/g,"\\'") + '\')">Lịch sử</button><button class="btn btn-sm btn-danger" onclick="delCustomer(\'' + (c.customer_id||'').replace(/'/g,"\\'") + '\')">Xóa</button></td></tr>';
      }).join('') || '<tr><td colspan="6" class="text-center">Không có dữ liệu</td></tr>';

      var inf = document.getElementById('paginationInfo');
      if (inf) inf.textContent = 'Tổng: ' + _total + ' | Trang ' + _page;
      var pn = document.getElementById('pageNum'); if (pn) pn.textContent = _page;
      var prev = document.getElementById('btnPrev'); if (prev) prev.disabled = _page <= 1;
      var next = document.getElementById('btnNext'); if (next) next.disabled = _page * _pageSize >= _total;
    })
    .catch(function() { var t = document.getElementById('customersTable'); if (t) t.innerHTML = '<tr><td colspan="6" class="text-center">Lỗi tải dữ liệu</td></tr>'; });
}

function goPage(d) { _page = Math.max(1, _page + d); loadCustomers(); }

function openModalCustomer(id, fullName, phone, email, address) {
  document.getElementById('editCustomerId').value = id || '';
  document.getElementById('custFullName').value = fullName || '';
  document.getElementById('custPhone').value = phone || '';
  document.getElementById('custEmail').value = email || '';
  document.getElementById('custAddress').value = address || '';
  document.getElementById('modalCustomerTitle').textContent = id ? 'Sửa khách hàng' : 'Thêm khách hàng';
  document.getElementById('custPhone').readOnly = !!id;
}

function saveCustomer() {
  var id = document.getElementById('editCustomerId').value;
  var body = {
    full_name: document.getElementById('custFullName').value.trim(),
    phone_number: document.getElementById('custPhone').value.trim(),
    email: document.getElementById('custEmail').value.trim() || null,
    address: document.getElementById('custAddress').value.trim() || null
  };
  if (!body.phone_number) { alert('Số điện thoại là bắt buộc'); return; }

  var url = API_BASE + '/customers', method = 'POST';
  if (id) { url += '/' + encodeURIComponent(id); method = 'PUT'; }

  fetch(url, { method: method, headers: hd(), body: JSON.stringify(body) })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, status: r.status, data: d }; }); })
    .then(function(r) {
      if (r.ok || r.status === 201 || r.message) {
        bootstrap.Modal.getInstance(document.getElementById('modalCustomer')).hide();
        loadCustomers();
      } else alert(r.data && r.data.message ? r.data.message : 'Lỗi: ' + JSON.stringify(r.data));
    })
    .catch(function() { alert('Lỗi kết nối'); });
}

function viewHistory(customerId) {
  fetch(API_BASE + '/customers/' + encodeURIComponent(customerId) + '/history', { headers: hd() })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var h = '';
      if (d.orders && d.orders.length) {
        h += '<h6>Đơn hàng</h6><table class="table table-sm"><thead><tr><th>Mã đơn</th><th>Ngày</th><th>Tổng tiền</th></tr></thead><tbody>';
        d.orders.forEach(function(o) { h += '<tr><td>' + (o.order_id||'') + '</td><td>' + (o.order_date||'') + '</td><td>' + (o.total_amount||'') + '</td></tr>'; });
        h += '</tbody></table>';
      }
      if (d.warranties && d.warranties.length) {
        h += '<h6>Bảo hành</h6><table class="table table-sm"><thead><tr><th>Phiếu BH</th><th>Ngày kiểm tra</th><th>Ghi chú</th><th>IMEI</th></tr></thead><tbody>';
        d.warranties.forEach(function(w) { h += '<tr><td>' + (w.warranty_id||'') + '</td><td>' + (w.check_date||'') + '</td><td>' + (w.note||'') + '</td><td>' + (w.imei_serial||'') + '</td></tr>'; });
        h += '</tbody></table>';
      }
      if (!h) h = '<p class="text-muted">Chưa có lịch sử.</p>';
      document.getElementById('historyBody').innerHTML = h;
      new bootstrap.Modal(document.getElementById('modalHistory')).show();
    })
    .catch(function() { alert('Lỗi tải lịch sử'); });
}

function delCustomer(id) {
  if (!id || !confirm('Xóa khách hàng này? (Chỉ xóa được nếu chưa có đơn hàng)')) return;
  fetch(API_BASE + '/customers/' + encodeURIComponent(id), { method: 'DELETE', headers: hd() })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(r) {
      if (r.ok || (r.data && r.data.message)) { loadCustomers(); }
      else alert(r.data && r.data.message ? r.data.message : 'Không thể xóa (có thể đã có đơn hàng)');
    })
    .catch(function() { alert('Lỗi kết nối'); });
}

document.addEventListener('DOMContentLoaded', function() {
  if (typeof getToken === 'function' && !getToken()) { window.location.href = 'auth.html'; return; }
  loadCustomers();
});
