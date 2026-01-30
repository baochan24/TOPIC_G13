// ===============================
// AUTH CHECK
// ===============================
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'auth.html';
}

// ===============================
// API + HEADERS
// ===============================
//const API_BASE = 'http://192.168.1.76:5000';

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  };
}

// ===============================
// BroadcastChannel
// ===============================
const statsChannel = new BroadcastChannel('stats-update');

// ===============================
// FORM SUBMIT – SCAN IMEI
// ===============================
document.getElementById('scanForm').addEventListener('submit', function (e) {
  e.preventDefault();
  scanImei();
});

// ===============================
// SCAN IMEI
// ===============================
async function scanImei() {
  const checkId = document.getElementById('checkId').value.trim();
  const imei = document.getElementById('imeiSerial').value.trim();

  if (!checkId || !imei) {
    alert('Vui lòng nhập Check ID và IMEI');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/stock/${checkId}/scan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ imei_serial: imei })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Scan thất bại');
      return;
    }

    alert(`Scan thành công: ${data.imei_serial} (${data.actual_status})`);
    document.getElementById('scanForm').reset();
    loadResults();
    statsChannel.postMessage('update-stats');

  } catch (err) {
    console.error('Lỗi scan IMEI:', err);
    alert('Không thể kết nối server');
  }
}

// ===============================
// LOAD KẾT QUẢ KIỂM KÊ
// ===============================
async function loadResults() {
  const checkId = document.getElementById('checkId').value.trim();
  if (!checkId) {
    alert('Vui lòng nhập Check ID');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/stock/${checkId}/result`, {
      headers: getAuthHeaders()
    });

    const results = await res.json();
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';

    results.forEach(item => {
      const row = `
        <tr>
          <td>${item.imei_serial}</td>
          <td>${item.system_status || 'N/A'}</td>
          <td>${item.actual_status}</td>
          <td>${item.is_matched ? '✔️' : '❌'}</td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', row);
    });

  } catch (err) {
    console.error('Lỗi load kết quả:', err);
  }
}


// ===============================
// ĐIỀU CHỈNH TỒN KHO
// ===============================
async function adjustStock() {
  const checkId = document.getElementById('checkId').value.trim();
  if (!checkId) {
    alert('Vui lòng nhập Check ID');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/stock/${checkId}/adjust`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    const resultDiv = document.getElementById('adjustResult');

    if (!res.ok) {
      resultDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
      return;
    }

    resultDiv.innerHTML = `
      <div class="alert alert-success">
        ${data.message} – Đã điều chỉnh ${data.adjusted_items} IMEI
      </div>
    `;
    statsChannel.postMessage('update-stats');

  } catch (err) {
    console.error('Lỗi điều chỉnh kho:', err);
  }
}

// ===============================
// BUTTON EVENTS
// ===============================
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('loadResultsBtn')?.addEventListener('click', loadResults);
  document.getElementById('adjustStockBtn')?.addEventListener('click', adjustStock);
});
