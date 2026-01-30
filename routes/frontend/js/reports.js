if (typeof requireAuth === 'function' && !requireAuth('/auth')) {
  window.location.href = 'auth.html';
}

/* KHÔNG khai báo API_BASE ở đây
   API_BASE lấy từ api.js */
   
function hd() {
  const token = typeof getToken === 'function'
    ? getToken()
    : localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + (token || '')
  };
}

function generateReport() {
  const type = document.getElementById('reportType')?.value || 'revenue';
  let start = document.getElementById('startDate')?.value;
  let end = document.getElementById('endDate')?.value;

  if (type === 'revenue' && (!start || !end)) {
    alert('Chọn khoảng ngày cho báo cáo doanh thu');
    return;
  }

  if (start && end && start > end) {
    alert('Từ ngày phải trước đến ngày');
    return;
  }

  if (type === 'inventory') {
    const today = new Date().toISOString().slice(0, 10);
    start = start || today;
    end = end || today;
  }

  const out = document.getElementById('reportOutput');
  if (out) out.innerHTML = '<div class="text-muted">Đang tải...</div>';

  fetch(API_BASE + '/reports/', {
    method: 'POST',
    headers: hd(),
    body: JSON.stringify({
      type: type,
      start_date: start,
      end_date: end
    })
  })
    .then(r => {
      if (r.status === 401) {
        window.location.href = 'auth.html';
        return null;
      }
      return r.json().catch(() => ({
        error: 'Phản hồi không hợp lệ từ server'
      }));
    })
    .then(data => {
      if (!data || !out) return;

      if (data.error) {
        out.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
        return;
      }

      const rows = data.data || [];
      const typ = data.report_type || type;

      let html = `<p class="text-muted">${typ}</p>`;

      if (typ === 'revenue') {
        let total = 0;
        html += `
          <table class="table table-sm">
            <thead class="table-dark">
              <tr><th>Ngày</th><th>Doanh thu</th></tr>
            </thead><tbody>`;
        rows.forEach(r => {
          total += Number(r.revenue || 0);
          html += `<tr><td>${r.report_date}</td><td>${r.revenue}</td></tr>`;
        });
        html += `</tbody></table><strong>Tổng: ${total}</strong>`;
      } else {
        html += `
          <table class="table table-sm">
            <thead class="table-dark">
              <tr><th>Mã SP</th><th>Tổng</th><th>Trong kho</th></tr>
            </thead><tbody>`;
        rows.forEach(r => {
          html += `<tr>
            <td>${r.product_id}</td>
            <td>${r.total_items}</td>
            <td>${r.in_stock}</td>
          </tr>`;
        });
        html += '</tbody></table>';
      }

      out.innerHTML = html;
    })
    .catch(() => {
      if (out) out.innerHTML = '<div class="alert alert-danger">Lỗi kết nối server</div>';
    });
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof getToken === 'function' && !getToken()) {
    window.location.href = 'auth.html';
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  var sd = document.getElementById('startDate');
if (sd && !sd.value) sd.value = today;

var ed = document.getElementById('endDate');
if (ed && !ed.value) ed.value = today;

  document
    .getElementById('generateReportBtn')
    ?.addEventListener('click', generateReport);
});
