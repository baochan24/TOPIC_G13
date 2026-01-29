console.log("CUSTOMERS JS LOADED");

/* ================= AUTH CHECK ================= */
if (typeof requireAuth === "function" && !requireAuth("/auth.html")) {
  console.warn("Not authenticated");
  throw new Error("Unauthorized");
}

/* ================= STATE ================= */
let allCustomers = [];
let currentPage = 1;
const pageSize = 10;

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  loadCustomers();

  document
    .getElementById("loadCustomersBtn")
    ?.addEventListener("click", searchCustomers);

  document.getElementById("btnPrev").onclick = prevPage;
  document.getElementById("btnNext").onclick = nextPage;

  // 🔥 FIX: gắn nút LƯU
  document
    .getElementById("saveCustomerBtn")
    ?.addEventListener("click", saveCustomer);
})

/* ================= LOAD ================= */
function loadCustomers(q = "") {
  let url = `/customers?page=1&page_size=200`;
  if (q) url += `&q=${encodeURIComponent(q)}`;

  fetch(url, { headers: getAuthHeaders() })
    .then(handleAuth)
    .then(res => res.json())   // ✅ THIẾU DÒNG NÀY
    .then(res => {
      console.log("API RESPONSE:", res);

      allCustomers = res.data || [];   // ✅ CHỈ 1 LẦN
      currentPage = 1;
      renderCustomers();
    })
    .catch(err => console.error(err));
}


/* ================= RENDER ================= */
function renderCustomers() {
  const tbody = document.getElementById("customersTable");
  tbody.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const pageData = allCustomers.slice(start, start + pageSize);

  if (!pageData.length) {
    tbody.innerHTML =
      `<tr><td colspan="6" class="text-center text-muted">Không có dữ liệu</td></tr>`;
    updatePagination();
    return;
  }

  pageData.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.customer_id}</td>
      <td>${c.full_name ?? ""}</td>
      <td>${c.phone_number}</td>
      <td>${c.email ?? ""}</td>
      <td>${c.address ?? ""}</td>
      <td>
        <button class="btn btn-sm btn-info me-1"
          onclick="viewHistory('${c.customer_id}')">
          <i class="fa fa-clock"></i>
        </button>
        <button class="btn btn-sm btn-warning me-1"
          onclick="openEditCustomer(
            '${c.customer_id}',
            '${c.full_name ?? ""}',
            '${c.phone_number}',
            '${c.email ?? ""}',
            '${c.address ?? ""}'
          )">
          <i class="fa fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger"
          onclick="deleteCustomer('${c.customer_id}')">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updatePagination();
}

/* ================= SEARCH ================= */
function searchCustomers() {
  const q = document.getElementById("searchQ").value.trim();
  loadCustomers(q); // 🔥 search backend
}

/* ================= PAGINATION ================= */
function updatePagination() {
  document.getElementById("pageNum").innerText = currentPage;
  document.getElementById("paginationInfo").innerText =
    `Tổng ${allCustomers.length} khách`;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderCustomers();
  }
}

function nextPage() {
  if (currentPage * pageSize < allCustomers.length) {
    currentPage++;
    renderCustomers();
  }
}

/* ================= SAVE ================= */
function saveCustomer() {
  const btn = document.getElementById("saveCustomerBtn");
  btn.disabled = true;

  const id = document.getElementById("editCustomerId").value;

  const body = {
    full_name: custFullName.value.trim(),
    phone_number: custPhone.value.trim(),
    email: custEmail.value.trim() || null,
    address: custAddress.value.trim() || null
  };

  if (!body.phone_number) {
    alert("Số điện thoại là bắt buộc");
    btn.disabled = false;
    return;
  }

  const method = id ? "PUT" : "POST";
  const url = id ? `/customers/${id}` : `/customers`;

  fetch(url, {
  method,
  headers: {
    ...getAuthHeaders(),
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
})
  .then(handleAuth)
  .then(res => {
    if (!res.ok) {
      return res.json().then(e => { throw e; });
    }
    return res.json();
  })
  .then(() => {
    document.getElementById("searchQ").value = "";
    currentPage = 1;

    document.getElementById("saveCustomerBtn").blur();

    bootstrap.Modal.getInstance(
      document.getElementById("modalCustomer")
    ).hide();

    loadCustomers();
  })
  .catch(err => alert(err.message || "Lỗi"))
  .finally(() => (btn.disabled = false));

}

/* ================= MODAL ================= */
function openEditCustomer(id, name, phone, email, address) {
  editCustomerId.value = id;
  custFullName.value = name;
  custPhone.value = phone;
  custEmail.value = email;
  custAddress.value = address;

  custPhone.readOnly = true;
  modalCustomerTitle.innerText = "Sửa khách hàng";
  new bootstrap.Modal("#modalCustomer").show();
}

/* ================= HISTORY ================= */
function viewHistory(id) {
  fetch(`/customers/${id}/history`, { headers: getAuthHeaders() })
    .then(handleAuth)
    .then(res => res.json())
    .then(data => {
      historyBody.innerHTML =
        `<pre>${JSON.stringify(data, null, 2)}</pre>`;
      new bootstrap.Modal("#modalHistory").show();
    });
}

/* ================= DELETE ================= */
function deleteCustomer(id) {
  if (!confirm("Xóa khách hàng này?")) return;

  fetch(`/customers/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  })
    .then(handleAuth)
    .then(() => loadCustomers());
}

/* ================= AUTH HANDLER ================= */
function handleAuth(res) {
  if (res.status === 401) {
    alert("Phiên đăng nhập đã hết hạn");
    localStorage.clear();
    window.location.href = "/auth.html";
    throw new Error("Unauthorized");
  }
  return res;
}
// ================= FIX ARIA-HIDDEN WARNING =================
document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("modalCustomer");

  if (modalEl) {
    modalEl.addEventListener("hidden.bs.modal", () => {
      // Đưa focus ra ngoài modal sau khi đóng
      document.getElementById("addCustomerBtn")?.focus();
    });
  }
});
