
if (!getToken()) {
  window.location.href = "auth.html";
}

// ===============================
// API CONFIG
// ===============================
//const API_BASE = "http://192.168.1.76:5000";

// ===============================
// AUTH CHECK (FIX)
// ===============================
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "/auth";
}

// ===============================
// AUTH HEADERS
// ===============================
function getAuthHeaders() {
  return {
    "Authorization": "Bearer " + localStorage.getItem("token"),
    "Content-Type": "application/json"
  };
}

// ===============================
// BroadcastChannel
// ===============================
const statsChannel = new BroadcastChannel("stats-update");

// ===============================
// FORM SUBMIT (ADD / UPDATE)
// ===============================
document.getElementById("productForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const productIdInput = document.getElementById("productId");

  if (productIdInput.readOnly) {
    updateProduct(productIdInput.value.trim());
  } else {
    addProduct();
  }
});

// ===============================
// LOAD PRODUCTS (FIX HIỂN THỊ)
// ===============================
requireAuth();
async function loadProducts() {
  try {
    const res = await fetch(API_BASE + "/products/", {
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error(res.status);

    const data = await res.json();
    console.log("DATA FROM API:", data); // 👈 ĐÚNG CHỖ

    const tbody = document.querySelector("#productsTable tbody");
    tbody.innerHTML = "";

    data.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.product_id}</td>
        <td>${p.product_name}</td>
        <td>${p.brand}</td>
        <td>${p.category_id}</td>
        <td>${Number(p.base_price).toLocaleString()}</td>
        <td>${p.warranty_period}</td>
        <td>
          <button onclick="editProduct('${p.product_id}')">✏️</button>
          <button onclick="deleteProduct('${p.product_id}')">🗑</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Load products failed:", err);
  }
}


// ===============================
// ADD PRODUCT
// ===============================
async function addProduct() {
  const data = {
    product_id: productId.value,
    product_name: productName.value,
    brand: brand.value,
    category_id: categoryId.value,
    base_price: parseFloat(basePrice.value),
    warranty_period: parseInt(warrantyPeriod.value)
  };

  try {
    const res = await fetch(API_BASE + "/products/", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
      alert("Thêm sản phẩm thành công!");
      productForm.reset();
      loadProducts();
      statsChannel.postMessage("update-stats");
    } else {
      alert(result.error || result.message);
    }
  } catch (e) {
    console.error(e);
  }
}

// ===============================
// UPDATE PRODUCT
// ===============================
async function updateProduct(id) {
  const data = {
    product_name: productName.value,
    brand: brand.value,
    category_id: categoryId.value,
    base_price: parseFloat(basePrice.value),
    warranty_period: parseInt(warrantyPeriod.value)
  };

  try {
    const res = await fetch(API_BASE + "/products/" + id, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
      alert("Cập nhật thành công!");
      productForm.reset();
      productId.readOnly = false;
      document.querySelector("#productForm button").textContent = "Thêm sản phẩm";
      loadProducts();
      statsChannel.postMessage("update-stats");
    } else {
      alert(result.error);
    }
  } catch (e) {
    console.error(e);
  }
}

// ===============================
// DELETE PRODUCT (CHỈ 1 HÀM)
// ===============================
function deleteProduct(id) {
  if (!confirm("Bạn có chắc muốn xóa?")) return;

  fetch(API_BASE + "/products/" + id, {
    method: "DELETE",
    headers: getAuthHeaders()
  })
    .then(res => res.json())
    .then(result => {
      if (result.message) {
        alert("Xóa thành công!");
        loadProducts();
        statsChannel.postMessage("update-stats");
      } else {
        alert(result.error);
      }
    })
    .catch(console.error);
}

// ===============================
// EDIT PRODUCT
// ===============================
function editProduct(id) {
  const rows = document.querySelectorAll("#productsTable tbody tr");

  rows.forEach(row => {
    if (row.children[0].textContent === id) {
      productId.value = row.children[0].textContent;
      productId.readOnly = true;
      productName.value = row.children[1].textContent;
      brand.value = row.children[2].textContent;
      categoryId.value = row.children[3].textContent;
      basePrice.value = row.children[4].textContent;
      warrantyPeriod.value = row.children[5].textContent;
      document.querySelector("#productForm button").textContent = "Cập nhật";
    }
  });
}

// ===============================
// ON LOAD
// ===============================
document.addEventListener("DOMContentLoaded", loadProducts);

// ===============================
// AUTO REFRESH (CÓ TOKEN)
// ===============================
setInterval(() => {
  if (localStorage.getItem("token")) loadProducts();
}, 10000);
