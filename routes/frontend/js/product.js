if (typeof getToken === 'function' && !getToken()) { window.location.href = 'auth.html'; }
var API_BASE = window.API_BASE || 'http://127.0.0.1:5000';


// Load danh sách sản phẩm khi trang load
document.addEventListener('DOMContentLoaded', loadProducts);

// BroadcastChannel để đồng bộ dashboard
const statsChannel = new BroadcastChannel('stats-update');

// Form thêm sản phẩm
document.getElementById('productForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const productId = document.getElementById('productId').value.trim();
  if (productId) {
    // Nếu có productId, là update
    updateProduct(productId);
  } else {
    // Ngược lại là add
    addProduct();
  }
});

// Form import IMEI
document.getElementById('imeiForm').addEventListener('submit', function(e) {
  e.preventDefault();
  importImei();
});

// Load danh sách sản phẩm
async function loadProducts() {
  console.log('Loading products...');
  try {
    const response = await fetch(API_BASE + '/products/', {
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') }
    });
    console.log('Fetch response:', response);
    const products = await response.json();
    console.log('Products data:', products);
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';
    products.forEach(product => {
      const row = `
        <tr>
          <td>${product.product_id}</td>
          <td>${product.product_name}</td>
          <td>${product.brand}</td>
          <td>${product.category_id}</td>
          <td>${product.base_price}</td>
          <td>${product.warranty_period} tháng</td>
          <td>
            <button class="btn btn-sm btn-warning" onclick="editProduct('${product.product_id}')">Sửa</button>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.product_id}')">Xóa</button>
          </td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (error) {
    console.error('Lỗi load sản phẩm:', error);
  }
}

// Thêm sản phẩm
async function addProduct() {
  const data = {
    product_id: document.getElementById('productId').value,
    product_name: document.getElementById('productName').value,
    brand: document.getElementById('brand').value,
    category_id: document.getElementById('categoryId').value,
    base_price: parseFloat(document.getElementById('basePrice').value),
    warranty_period: parseInt(document.getElementById('warrantyPeriod').value)
  };

  try {
    const response = await fetch(API_BASE + '/products/', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (response.ok) {
      alert('Thêm sản phẩm thành công!');
      document.getElementById('productForm').reset();
      loadProducts();
      statsChannel.postMessage('update-stats'); // Đồng bộ dashboard
    } else {
      alert('Lỗi: ' + result.error);
    }
  } catch (error) {
    console.error('Lỗi thêm sản phẩm:', error);
  }
}

// Import IMEI
async function importImei() {
  const data = {
    product_id: document.getElementById('importProductId').value,
    imei_serial: document.getElementById('imeiSerial').value,
    condition: document.getElementById('condition').value
  };

  try {
    const response = await fetch(API_BASE + '/inventory/import', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (response.ok) {
      alert('Import IMEI thành công!');
      document.getElementById('imeiForm').reset();
      statsChannel.postMessage('update-stats'); // Đồng bộ dashboard
    } else {
      alert('Lỗi: ' + result.error);
    }
  } catch (error) {
    console.error('Lỗi import IMEI:', error);
  }
}

// Kiểm tra IMEI
async function checkImei() {
  const imei = document.getElementById('checkImei').value;
  if (!imei) {
    alert('Vui lòng nhập IMEI');
    return;
  }

  try {
    const url = (API_BASE || '') + '/inventory/imei/' + encodeURIComponent(imei);
    const opts = { headers: {} };
    if (typeof getAuthHeaders === 'function') opts.headers = getAuthHeaders();
    else if (typeof getToken === 'function' && getToken()) opts.headers = { 'Authorization': 'Bearer ' + getToken() };
    const response = await fetch(url, opts);
    const result = await response.json();
    const resultDiv = document.getElementById('imeiResult');
    if (response.ok) {
      resultDiv.innerHTML = `
        <div class="alert alert-success">
          IMEI: ${result.imei_serial}<br>
          Sản phẩm: ${result.product_name}<br>
          Trạng thái: ${result.status}<br>
          Tình trạng: ${result.item_condition}
        </div>
      `;
    } else {
      resultDiv.innerHTML = '<div class="alert alert-danger">IMEI không tồn tại</div>';
    }
  } catch (error) {
    console.error('Lỗi kiểm tra IMEI:', error);
    document.getElementById('imeiResult').innerHTML = '<div class="alert alert-danger">Lỗi kết nối</div>';
  }
}

// Placeholder cho edit và delete (cần backend)
function editProduct(id) {
  // Tìm sản phẩm trong danh sách đã load
  const tbody = document.querySelector('#productsTable tbody');
  const rows = tbody.querySelectorAll('tr');
  let productData = null;
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells[0].textContent === id) {
      productData = {
        product_id: cells[0].textContent,
        product_name: cells[1].textContent,
        brand: cells[2].textContent,
        category_id: cells[3].textContent,
        base_price: parseFloat(cells[4].textContent),
        warranty_period: parseInt(cells[5].textContent.replace(' tháng', ''))
      };
    }
  });

  if (productData) {
    // Điền vào form
    const productIdInput = document.getElementById('productId');
    productIdInput.value = productData.product_id;
    productIdInput.readOnly = true; // Không cho sửa mã sản phẩm
    document.getElementById('productName').value = productData.product_name;
    document.getElementById('brand').value = productData.brand;
    document.getElementById('categoryId').value = productData.category_id;
    document.getElementById('basePrice').value = productData.base_price;
    document.getElementById('warrantyPeriod').value = productData.warranty_period;

    // Thay đổi button submit thành Update
    const submitBtn = document.querySelector('#productForm button[type="submit"]');
    submitBtn.textContent = 'Cập nhật sản phẩm';

    // Scroll to form
    document.getElementById('productForm').scrollIntoView();
  }
}

function deleteProduct(id) {
  if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
    fetch(API_BASE + '/products/' + id, {
      method: 'DELETE',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') }
    })
    .then(response => response.json())
    .then(result => {
      if (result.message) {
        alert('Xóa thành công!');
        loadProducts();
        statsChannel.postMessage('update-stats');
      } else {
        alert('Lỗi: ' + result.error);
      }
    })
    .catch(error => {
      console.error('Lỗi xóa sản phẩm:', error);
      alert('Lỗi kết nối');
    });
  }
}

// Thêm hàm update
async function updateProduct(id) {
  const data = {
    product_name: document.getElementById('productName').value,
    brand: document.getElementById('brand').value,
    category_id: document.getElementById('categoryId').value,
    base_price: parseFloat(document.getElementById('basePrice').value),
    warranty_period: parseInt(document.getElementById('warrantyPeriod').value)
  };

  try {
    const response = await fetch(API_BASE + '/products/' + id, {
      method: 'PUT',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (response.ok) {
      alert('Cập nhật sản phẩm thành công!');
      document.getElementById('productForm').reset();
      document.getElementById('productId').readOnly = false; // Reset readonly
      loadProducts();
      statsChannel.postMessage('update-stats');

      // Reset button
      const submitBtn = document.querySelector('#productForm button[type="submit"]');
      submitBtn.textContent = 'Thêm sản phẩm';
    } else {
      alert('Lỗi: ' + result.error);
    }
  } catch (error) {
    console.error('Lỗi cập nhật sản phẩm:', error);
  }
}

// Load products on page load
document.addEventListener('DOMContentLoaded', loadProducts);

// Auto refresh every 10 seconds
setInterval(loadProducts, 10000);
