if (typeof getToken === 'function' && !getToken()) { window.location.href = 'auth.html'; }
var API_BASE = window.API_BASE || 'http://127.0.0.1:5000';

function lookupLifecycle() {
  const imei = document.getElementById('imeiInput').value.trim();
  if (!imei) {
    alert('Vui lòng nhập IMEI');
    return;
  }

  fetch(API_BASE + '/lifecycle/' + encodeURIComponent(imei), {
    headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') }
  })
  .then(response => response.json())
  .then(data => {
    const resultCard = document.getElementById('resultCard');
    const productInfo = document.getElementById('productInfo');
    const timeline = document.getElementById('lifecycleTimeline');

    if (data.error || !data.product) {
      resultCard.classList.add('d-none');
      alert(data.error || 'IMEI không tồn tại');
      return;
    }

    // Hiển thị thông tin sản phẩm
    productInfo.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <strong>IMEI:</strong> ${data.product.imei_serial}<br>
          <strong>Sản phẩm:</strong> ${data.product.product_name}<br>
          <strong>Hãng:</strong> ${data.product.brand}<br>
        </div>
        <div class="col-md-6">
          <strong>Trạng thái hiện tại:</strong> <span class="status-badge status-${data.product.status.toLowerCase()}">${getStatusText(data.product.status)}</span><br>
          <strong>Tình trạng:</strong> ${data.product.item_condition}<br>
          <strong>Bảo hành:</strong> ${data.product.warranty_period} tháng<br>
        </div>
      </div>
    `;

    // Hiển thị timeline
    timeline.innerHTML = '';
    if (data.lifecycle && data.lifecycle.length > 0) {
      data.lifecycle.forEach(item => {
        const date = new Date(item.created_at).toLocaleString('vi-VN');
        timeline.innerHTML += `
          <div class="timeline-item">
            <strong>${getStatusText(item.status)}</strong> - ${date}<br>
            <small class="text-muted">${item.notes || ''}</small>
          </div>
        `;
      });
    } else {
      timeline.innerHTML = '<div class="timeline-item">Chưa có lịch sử trạng thái</div>';
    }

    resultCard.classList.remove('d-none');
  })
  .catch(error => {
    console.error('Lỗi tra cứu:', error);
    alert('Lỗi kết nối');
  });
}

function getStatusText(status) {
  const statusMap = {
    'IN_STOCK': 'Trong kho',
    'SOLD': 'Đã bán',
    'WARRANTY': 'Bảo hành',
    'DEFECT': 'Lỗi'
  };
  return statusMap[status] || status;
}

// Enter key support
document.getElementById('imeiInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    lookupLifecycle();
  }
});

document.addEventListener('DOMContentLoaded', function() {
  var lookupBtn = document.getElementById('lookupLifecycleBtn');
  if (lookupBtn) lookupBtn.addEventListener('click', lookupLifecycle);
});
