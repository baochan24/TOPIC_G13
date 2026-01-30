console.log('RETURNS JS LOADED');

/* =========================
   HEADERS (FINAL – CHUẨN)
========================= */
function hd() {
  const token = typeof getToken === 'function' ? getToken() : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': 'Bearer ' + token } : {})
  };
}

/* =========================
   LOAD RETURNS
========================= */
function loadReturnRequests() {
  fetch(API_BASE + '/returns', { headers: hd() })
    .then(function (r) {
      if (r.status === 401) {
        window.location.href = 'auth.html';
        return null;
      }
      if (r.status === 403) {
        return [];
      }
      return r.json();
    })
    .then(function (data) {
      if (!data) return;

      var arr = Array.isArray(data)
        ? data
        : (data && data.data ? data.data : []);

      var t = document.querySelector('#returnsTable tbody');
      if (!t) return;

      if (!arr.length) {
        t.innerHTML =
          '<tr><td colspan="6" class="text-center">Không có dữ liệu hoặc không có quyền (Admin)</td></tr>';
        return;
      }

      t.innerHTML = arr.map(function (r) {
        var retId = (r.return_id || '').replace(/'/g, "\\'");
        return `
          <tr>
            <td>${r.return_id || ''}</td>
            <td>${r.order_item_id || ''}</td>
            <td>${r.reason || '-'}</td>
            <td>${r.refund_amount != null ? r.refund_amount : '-'}</td>
            <td>${r.return_date || 'Chưa xử lý'}</td>
            <td>
              ${
                !r.return_date
                  ? `<button class="btn btn-sm btn-warning" onclick="openProcess('${retId}')">Xử lý</button>`
                  : '-'
              }
            </td>
          </tr>`;
      }).join('');
    })
    .catch(function () {
      var t = document.querySelector('#returnsTable tbody');
      if (t) {
        t.innerHTML =
          '<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>';
      }
    });
}

/* =========================
   OPEN PROCESS MODAL
========================= */
function openProcess(returnId) {
  document.getElementById('processReturnId').value = returnId || '';
  document.getElementById('processApprove').checked = true;
  document.getElementById('processRestock').checked = true;
  document.getElementById('processNote').value = '';
  new bootstrap.Modal(document.getElementById('modalProcess')).show();
}

/* =========================
   PROCESS RETURN
========================= */
function doProcessReturn() {
  var id = document.getElementById('processReturnId').value;
  if (!id) return;

  var body = {
    approve: document.getElementById('processApprove').checked,
    restock: document.getElementById('processRestock').checked,
    note: document.getElementById('processNote').value.trim() || ''
  };

  fetch(API_BASE + '/returns/' + encodeURIComponent(id) + '/process', {
    method: 'POST',
    headers: hd(),
    body: JSON.stringify(body)
  })
    .then(function (r) {
      if (r.status === 401) {
        window.location.href = 'auth.html';
        return null;
      }
      return r.json().then(function (d) {
        return { ok: r.ok, data: d };
      });
    })
    .then(function (r) {
      if (!r) return;

      if (r.ok) {
        bootstrap.Modal
          .getInstance(document.getElementById('modalProcess'))
          .hide();
        loadReturnRequests();
        alert(r.data.message || 'Đã xử lý');
      } else {
        alert(r.data && r.data.message ? r.data.message : 'Lỗi xử lý');
      }
    })
    .catch(function () {
      alert('Lỗi kết nối server');
    });
}

/* =========================
   REQUEST RETURN (CUSTOMER)
========================= */
function requestReturn() {
  var orderItemId = document.getElementById('reqOrderItemId')?.value.trim();
  var reason = document.getElementById('reqReason')?.value.trim() || '';

  if (!orderItemId) {
    alert('Nhập order_item_id');
    return;
  }

  fetch(API_BASE + '/returns/request', {
    method: 'POST',
    headers: hd(),
    body: JSON.stringify({
      order_item_id: orderItemId,
      reason: reason
    })
  })
    .then(function (r) {
      if (r.status === 401) {
        window.location.href = 'auth.html';
        return null;
      }
      return r.json().then(function (d) {
        return { ok: r.ok, status: r.status, data: d };
      });
    })
    .then(function (r) {
      if (!r) return;

      if (r.ok || r.status === 201) {
        alert('Tạo yêu cầu thành công. Mã: ' + (r.data.return_id || ''));
        document.getElementById('reqOrderItemId').value = '';
        document.getElementById('reqReason').value = '';
        loadReturnRequests();
      } else {
        alert(r.data?.message || 'Không có quyền hoặc lỗi');
      }
    })
    .catch(function () {
      alert('Lỗi kết nối server');
    });
}

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', function () {
  const role = getRole();

  // STAFF mới được tạo yêu cầu trả hàng
  const reqBox = document.getElementById('requestReturnBox');
  if (reqBox) {
    reqBox.style.display = role === 'STAFF' ? 'block' : 'none';
  }

  // ADMIN mới được xử lý duyệt
  const adminBox = document.getElementById('returnsAdminBox');
  if (adminBox) {
    adminBox.style.display = role === 'ADMIN' ? 'block' : 'none';
  }

  loadReturnRequests();
});