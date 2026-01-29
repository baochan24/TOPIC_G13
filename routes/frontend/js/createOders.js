console.log('CREATE ORDERS JS LOADED');

/* =========================
   CONFIG
========================= */
const API_BASE = 'http://127.0.0.1:5000';

/* =========================
   AUTH GUARD
========================= */
if (typeof requireAuth === 'function') {
  const ok = requireAuth('/auth');
  if (!ok) {
    console.warn('Auth failed – redirecting');
    return;
  }
}

/* =========================
   HEADERS
========================= */
function hd() {
  return {
    ...getAuthHeaders(),
    'Content-Type': 'application/json'
  };
}

/* =========================
   IMEI PARSER
========================= */
function getImeiList() {
  const raw = document.getElementById('imeisInput')?.value || '';
  return raw
    .split(/[\n,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/* =========================
   CHECKOUT
========================= */
async function doCheckout() {
  const imeis = getImeiList();

  if (!imeis.length) {
    alert('Vui lòng nhập ít nhất 1 IMEI');
    return;
  }

  const payload = {
    customer_id: document.getElementById('customerId')?.value?.trim() || null,
    imeis: imeis,
    payment_method:
      document.getElementById('paymentMethod')?.value || 'CASH'
  };

  console.log('Checkout payload:', payload);

  const resEl = document.getElementById('checkoutResult');
  if (!resEl) return;

  resEl.className = 'alert d-none';
  resEl.textContent = '';

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: hd(),
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    resEl.classList.remove('d-none');

    if (res.ok) {
      resEl.classList.add('alert-success');
      resEl.innerHTML = `
        <strong>Thành công!</strong><br>
        Mã đơn: ${data.order_id || 'N/A'}<br>
        Tổng tiền: ${data.total_amount || 0}
      `;
    } else {
      resEl.classList.add('alert-danger');
      resEl.textContent =
        data.message || data.error || 'Tạo đơn hàng thất bại';
    }
  } catch (err) {
    console.error(err);
    resEl.classList.remove('d-none');
    resEl.classList.add('alert-danger');
    resEl.textContent = 'Không kết nối được server';
  }
}

/* =========================
   EVENT BINDING
========================= */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('doCheckoutBtn');
  if (btn) {
    btn.addEventListener('click', doCheckout);
  } else {
    console.warn('Không tìm thấy nút doCheckoutBtn');
  }
});
