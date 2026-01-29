const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'auth.html';
}



// Form scan IMEI
document.getElementById('scanForm').addEventListener('submit', function(e) {
  e.preventDefault();
  scanImei();
});

// BroadcastChannel để đồng bộ dashboard
const statsChannel = new BroadcastChannel('stats-update');

// Scan IMEI
async function scanImei() {
  const checkId = document.getElementById('checkId').value;
  const imei = document.getElementById('imeiSerial').value;
  const actualStatus = document.getElementById('actualStatus').value;

  if (!checkId || !imei) {
    alert('Vui lòng nhập đầy đủ thông tin');
    return;
  }

  const data = {
    imei_serial: imei,
    actual_status: actualStatus
  };

  try {
    const response = await fetch(`/stock/${checkId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (response.ok) {
      alert(`Scan thành công: ${result.imei} - ${result.matched ? 'Khớp' : 'Không khớp'}`);
      document.getElementById('scanForm').reset();
      statsChannel.postMessage('update-stats'); // Đồng bộ dashboard
    } else {
      alert('Lỗi: ' + JSON.stringify(result));
    }
  } catch (error) {
    console.error('Lỗi scan IMEI:', error);
  }
}

// Load kết quả
async function loadResults() {
  const checkId = document.getElementById('checkId').value;
  if (!checkId) {
    alert('Vui lòng nhập Check ID');
    return;
  }

  try {
    const response = await fetch(`/stock/${checkId}/result`);
    const results = await response.json();
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';
    results.forEach(item => {
      const row = `
        <tr>
          <td>${item.imei_serial}</td>
          <td>${item.expected_status || 'N/A'}</td>
          <td>${item.actual_status}</td>
          <td>${item.is_matched ? 'Có' : 'Không'}</td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (error) {
    console.error('Lỗi load kết quả:', error);
  }
}

// Điều chỉnh stock
async function adjustStock() {
  const checkId = document.getElementById('checkId').value;
  if (!checkId) {
    alert('Vui lòng nhập Check ID');
    return;
  }

  try {
    const response = await fetch(`/stock/${checkId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    const resultDiv = document.getElementById('adjustResult');
    if (response.ok) {
      resultDiv.innerHTML = `<div class="alert alert-success">${result.message}. Đã điều chỉnh ${result.adjusted_items} item.</div>`;
      statsChannel.postMessage('update-stats'); // Đồng bộ dashboard
    } else {
      resultDiv.innerHTML = `<div class="alert alert-danger">Lỗi: ${JSON.stringify(result)}</div>`;
    }
  } catch (error) {
    console.error('Lỗi điều chỉnh stock:', error);
    document.getElementById('adjustResult').innerHTML = '<div class="alert alert-danger">Lỗi kết nối</div>';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var loadBtn = document.getElementById('loadResultsBtn');
  if (loadBtn) loadBtn.addEventListener('click', loadResults);

  var adjustBtn = document.getElementById('adjustStockBtn');
  if (adjustBtn) adjustBtn.addEventListener('click', adjustStock);
});
