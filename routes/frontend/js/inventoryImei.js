// ================== AUTH ==================
requireAuth(); // dùng auth chuẩn từ api.js

let _lastLookupImei = '';

// ================== HEADERS ==================
function hd() {
  return getAuthHeaders();
}

// ================== IMPORT 1 IMEI ==================
function importOne() {
  const productId = document.getElementById('impProductId')?.value.trim();
  const imei = document.getElementById('impImei')?.value.trim();
  const condition = document.getElementById('impCondition')?.value || 'NEW';

  if (!productId || !imei) {
    alert('Nhập đủ Mã SP và IMEI');
    return;
  }

 fetch(API_BASE + '/inventory/import', {
  method: 'POST',
  headers: hd(),
  body: JSON.stringify({
    product_id: productId,
    imeis: [imei]   // ✅ PHẢI là array
  })
})
  .then(r => r.json())
  .then(d => {
    if (d.error || d.message?.includes('Thiếu')) {
      alert(d.message || d.error);
      return;
    }
    alert(d.message || 'Nhập kho thành công');
    document.getElementById('impImei').value = '';
  })
  .catch(() => alert('Lỗi kết nối'));

}

// ================== IMPORT BATCH ==================
function importBatch() {
  const productId = document.getElementById('batchProductId')?.value.trim();
  const raw = document.getElementById('batchImeis')?.value || '';

  const items = raw
    .split(/[\n,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(imei => ({ imei_serial: imei, condition: 'NEW' }));

  if (!productId || !items.length) {
    alert('Nhập Mã SP và ít nhất 1 IMEI');
    return;
  }

  fetch(API_BASE + '/inventory/import-batch', {
    method: 'POST',
    headers: hd(),
    body: JSON.stringify({ product_id: productId, items })
  })
    .then(r => r.json())
    .then(d => {
      alert(`Nhập: ${d.imported || 0}${d.failed?.length ? ', Lỗi: ' + d.failed.join(', ') : ''}`);
      document.getElementById('batchImeis').value = '';
    })
    .catch(() => alert('Lỗi kết nối'));
}

// ================== LOOKUP IMEI ==================
function lookupImei() {
  const imei = document.getElementById('lookupImei')?.value.trim();
  if (!imei) return alert('Nhập IMEI');

  _lastLookupImei = imei;

  fetch(API_BASE + '/inventory/imei/' + encodeURIComponent(imei), { headers: hd() })
    .then(r => r.json())
    .then(d => {
      const res = document.getElementById('lookupResult');
      const su = document.getElementById('statusUpdate');

      if (!d || d.message) {
        res.innerHTML = `<div class="alert alert-danger">${d.message || 'IMEI không tồn tại'}</div>`;
        su?.classList.add('d-none');
        return;
      }

      res.innerHTML = `
        <div class="alert alert-success">
          IMEI: ${d.imei_serial} |
          SP: ${d.product_name} |
          Hãng: ${d.brand} |
          Trạng thái: ${d.status} |
          Tình trạng: ${d.item_condition}
        </div>`;

      su?.classList.remove('d-none');
      document.getElementById('newStatus').value = d.status;
    })
    .catch(() => alert('Lỗi kết nối'));
}

// ================== UPDATE STATUS ==================
function updateImeiStatus() {
  const imei = _lastLookupImei;
  const status = document.getElementById('newStatus')?.value;

  if (!imei || !status) return alert('Thiếu IMEI hoặc trạng thái');

  fetch(API_BASE + `/inventory/imei/${encodeURIComponent(imei)}/status`, {
    method: 'PUT',
    headers: hd(),
    body: JSON.stringify({ status })
  })
    .then(r => r.json())
    .then(d => {
      alert(d.message || 'Đã cập nhật');
      lookupImei();
    })
    .catch(() => alert('Lỗi kết nối'));
}

// ================== INVENTORY REPORT ==================
function loadInventoryReport() {
  fetch(API_BASE + '/inventory/', { headers: hd() })
    .then(r => r.json())
    .then(arr => {
      const t = document.querySelector('#reportTable tbody');
      if (!t) return;

      t.innerHTML = arr.length
        ? arr.map(r => `
          <tr>
            <td>${r.product_id}</td>
            <td>${r.total}</td>
            <td>${r.in_stock}</td>
          </tr>`).join('')
        : '<tr><td colspan="3" class="text-center">Chưa có dữ liệu</td></tr>';
    })
    .catch(() => alert('Lỗi tải báo cáo'));
}

// ================== EVENTS ==================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('importOneBtn')?.addEventListener('click', importOne);
  document.getElementById('importBatchBtn')?.addEventListener('click', importBatch);
  document.getElementById('lookupImeiBtn')?.addEventListener('click', lookupImei);
  document.getElementById('updateImeiStatusBtn')?.addEventListener('click', updateImeiStatus);
  document.getElementById('loadInventoryReportBtn')?.addEventListener('click', loadInventoryReport);
});
