if (typeof getToken === 'function' && !getToken()) { window.location.href = 'auth.html'; }
var API_BASE = window.API_BASE || 'http://127.0.0.1:5000';
const statsChannel = new BroadcastChannel('stats-update');

// Load danh sách nhân viên khi trang load
document.addEventListener('DOMContentLoaded', loadStaff);

// Form thêm nhân viên
document.getElementById('addStaffForm').addEventListener('submit', function(e) {
  e.preventDefault();
  addStaff();
});

// Load danh sách nhân viên
async function loadStaff() {
  try {
    const response = await fetch(API_BASE + '/admin/staff', {
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') }
    });
    const staff = await response.json();
    const tbody = document.getElementById('staffTable');
    tbody.innerHTML = '';
    if (response.ok && staff) {
      staff.forEach(member => {
        const row = `
          <tr>
            <td>${member.user_id}</td>
            <td>${member.username}</td>
            <td>${member.full_name || '-'}</td>
            <td>${member.email || '-'}</td>
            <td>${member.phone_number || '-'}</td>
            <td>${member.role_name || '-'}</td>
            <td>${member.is_locked ? '<span class="badge bg-danger">Khóa</span>' : '<span class="badge bg-success">Hoạt động</span>'}</td>
            <td>
              <button class="btn btn-sm btn-warning me-1" onclick="editStaff('${member.user_id}', '${(member.full_name || '').replace(/'/g, "\\'")}', '${(member.email || '').replace(/'/g, "\\'")}', '${member.phone_number || ''}', '${(member.address || '').replace(/'/g, "\\'")}', '${member.role_name}')">
                <i class="fa-solid fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="deleteStaff('${member.user_id}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
        tbody.innerHTML += row;
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không thể tải danh sách nhân viên</td></tr>';
    }
  } catch (error) {
    console.error('Lỗi load nhân viên:', error);
    document.getElementById('staffTable').innerHTML = '<tr><td colspan="8" class="text-center">Lỗi kết nối</td></tr>';
  }
}

// Thêm nhân viên
async function addStaff() {
  const data = {
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    full_name: document.getElementById('fullName').value.trim(),
    address: document.getElementById('address').value.trim(),
    role: document.getElementById('role').value
  };

  if (!data.username || !data.password || !data.email || !data.phone || !data.full_name) {
    alert('Vui lòng điền đầy đủ thông tin bắt buộc');
    return;
  }

  try {
    const response = await fetch(API_BASE + '/admin/staff', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (response.ok) {
      alert('Thêm nhân viên thành công!');
      document.getElementById('addStaffForm').reset();
      loadStaff();
      statsChannel.postMessage('update-stats');
    } else {
      alert('Lỗi: ' + (result.message || result.error || 'Thêm thất bại'));
    }
  } catch (error) {
    console.error('Lỗi thêm nhân viên:', error);
    alert('Lỗi kết nối');
  }
}

// Mở modal sửa
function editStaff(userId, fullName, email, phone, address, role) {
  document.getElementById('editUserId').value = userId;
  document.getElementById('editFullName').value = fullName || '';
  document.getElementById('editEmail').value = email || '';
  document.getElementById('editPhone').value = phone || '';
  document.getElementById('editAddress').value = address || '';
  document.getElementById('editRole').value = role || 'STAFF';
  new bootstrap.Modal(document.getElementById('editStaffModal')).show();
}

// Cập nhật nhân viên
async function updateStaff() {
  const userId = document.getElementById('editUserId').value;
  const data = {
    full_name: document.getElementById('editFullName').value.trim(),
    email: document.getElementById('editEmail').value.trim(),
    phone: document.getElementById('editPhone').value.trim(),
    address: document.getElementById('editAddress').value.trim(),
    role: document.getElementById('editRole').value
  };

  if (!userId || !data.full_name || !data.email || !data.phone) {
    alert('Vui lòng điền đầy đủ thông tin');
    return;
  }

  try {
    const response = await fetch(API_BASE + '/admin/staff/' + userId, {
      method: 'PUT',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (response.ok) {
      alert('Cập nhật thành công!');
      bootstrap.Modal.getInstance(document.getElementById('editStaffModal')).hide();
      loadStaff();
      statsChannel.postMessage('update-stats');
    } else {
      alert('Lỗi: ' + (result.message || result.error || 'Cập nhật thất bại'));
    }
  } catch (error) {
    console.error('Lỗi cập nhật nhân viên:', error);
    alert('Lỗi kết nối');
  }
}

// Xóa nhân viên
async function deleteStaff(userId) {
  if (!confirm('Bạn có chắc muốn xóa nhân viên này?')) return;

  try {
    const response = await fetch(API_BASE + '/admin/staff/' + userId, {
      method: 'DELETE',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Authorization': 'Bearer ' + (getToken ? getToken() : localStorage.getItem('token') || '') }
    });
    const result = await response.json();
    if (response.ok) {
      alert('Xóa nhân viên thành công!');
      loadStaff();
      statsChannel.postMessage('update-stats');
    } else {
      alert('Lỗi: ' + (result.message || result.error || 'Xóa thất bại'));
    }
  } catch (error) {
    console.error('Lỗi xóa nhân viên:', error);
    alert('Lỗi kết nối');
  }
}

// Auto refresh every 30 seconds
setInterval(loadStaff, 30000);
