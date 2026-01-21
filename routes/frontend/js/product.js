// Load danh sách sản phẩm khi trang load
document.addEventListener('DOMContentLoaded', loadProducts);

// BroadcastChannel để đồng bộ dashboard
const statsChannel = new BroadcastChannel('stats-update');

// Form thêm sản phẩm
document.getElementById('productForm').addEventListener('submit', function(e) {
  e.preventDefault();
  addProduct();
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
    const response = await fetch('http://localhost:5000/products/');
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
    const response = await fetch('http://localhost:5000/products/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch('http://localhost:5000/inventory/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch(`/inventory/imei/${imei}`);
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
  alert('Chức năng sửa chưa implement');
}

function deleteProduct(id) {
  alert('Chức năng xóa chưa implement');
}

// Load products on page load
document.addEventListener('DOMContentLoaded', loadProducts);

// Auto refresh every 10 seconds
setInterval(loadProducts, 10000);
