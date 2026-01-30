function lookupLifecycle() {
  const imei = document.getElementById('imeiInput').value.trim();
  if (!imei) {
    alert('Vui lòng nhập IMEI');
    return;
  }

  fetch(API_BASE + '/lifecycle/' + encodeURIComponent(imei), {
    headers: typeof getAuthHeaders === 'function'
      ? getAuthHeaders()
      : { 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') }
  })
    .then(r => {
      if (!r.ok) return r.json().then(d => Promise.reject(d));
      return r.json();
    })
    .then(data => {
      const resultCard = document.getElementById('resultCard');
      const productInfo = document.getElementById('productInfo');
      const timelineEl = document.getElementById('lifecycleTimeline');

      // ===== Thông tin sản phẩm =====
      productInfo.innerHTML = `
        <div class="row">
          <div class="col-md-6">
            <strong>IMEI:</strong> ${data.imei_serial}<br>
            <strong>Sản phẩm:</strong> ${data.product.name}<br>
            <strong>Hãng:</strong> ${data.product.brand}
          </div>
          <div class="col-md-6">
            <strong>Trạng thái hiện tại:</strong>
            <span class="badge bg-info">${getStatusText(data.product.current_status)}</span><br>
            <strong>Tình trạng:</strong> ${data.product.condition}<br>
            <strong>Bảo hành:</strong> ${data.product.warranty_period} tháng
          </div>
        </div>
      `;

      // ===== Timeline =====
      timelineEl.innerHTML = '';
      if (Array.isArray(data.timeline) && data.timeline.length) {
        data.timeline.forEach(t => {
          const time = t.time ? new Date(t.time).toLocaleString('vi-VN') : '';
          timelineEl.innerHTML += `
            <div class="timeline-item mb-2">
              <strong>${t.event}</strong> – ${time}<br>
              <small class="text-muted">${t.detail || ''} ${t.note || ''}</small>
            </div>
          `;
        });
      } else {
        timelineEl.innerHTML =
          '<div class="timeline-item">Chưa có lịch sử vòng đời</div>';
      }

      resultCard.classList.remove('d-none');
    })
    .catch(err => {
      console.error('Lỗi tra cứu:', err);
      alert(err.message || 'IMEI không tồn tại');
    });
}

function getStatusText(status) {
  const map = {
    'IN_STOCK': 'Trong kho',
    'SOLD': 'Đã bán',
    'WARRANTY': 'Bảo hành',
    'DEFECT': 'Lỗi'
  };
  return map[status] || status;
}

document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('lookupLifecycleBtn');
  if (btn) btn.addEventListener('click', lookupLifecycle);

  const input = document.getElementById('imeiInput');
  if (input) {
    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') lookupLifecycle();
    });
  }
});