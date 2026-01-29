const API = '/categories';
const statsChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('stats-update') : { postMessage: function(){} };

function loadCategories() {
  fetch(API)
    .then(res => res.json())
    .then(data => {
      const table = document.getElementById('categoryTable');
      table.innerHTML = '';
      (data || []).forEach(c => {
        table.innerHTML += `
          <tr>
            <td>${c.category_id || ''}</td>
            <td>${(c.category_name || '').replace(/</g,'&lt;')}</td>
            <td>${(c.description || '-').replace(/</g,'&lt;')}</td>
            <td>
              <button class="btn btn-sm btn-warning me-1" onclick="openEditCategory('${(c.category_id||'').replace(/'/g,"\\'")}','${(c.category_name||'').replace(/'/g,"\\'")}','${(c.description||'').replace(/'/g,"\\'")}')">Sửa</button>
              <button class="btn btn-sm btn-danger" onclick="deleteCategory('${(c.category_id||'').replace(/'/g,"\\'")}')">Xóa</button>
            </td>
          </tr>
        `;
      });
    })
    .catch(() => { document.getElementById('categoryTable').innerHTML = '<tr><td colspan="4" class="text-center">Lỗi tải dữ liệu</td></tr>'; });
}

function addCategory() {
  const name = document.getElementById('categoryName').value.trim();
  const desc = document.getElementById('categoryDesc').value.trim();
  if (!name) { alert('Vui lòng nhập tên danh mục'); return; }

  fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category_name: name, description: desc || null })
  })
    .then(res => res.json().then(r => ({ ok: res.ok, ...r })))
    .then(r => {
      if (r.ok || r.category_id) {
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryDesc').value = '';
        loadCategories();
        statsChannel.postMessage('update-stats');
      } else alert('Lỗi: ' + (r.error || 'Thêm thất bại'));
    })
    .catch(() => alert('Lỗi kết nối'));
}

function openEditCategory(id, name, desc) {
  document.getElementById('editCategoryId').value = id;
  document.getElementById('editCategoryName').value = name || '';
  document.getElementById('editCategoryDesc').value = desc || '';
  new bootstrap.Modal(document.getElementById('editCategoryModal')).show();
}

function saveEditCategory() {
  const id = document.getElementById('editCategoryId').value;
  const name = document.getElementById('editCategoryName').value.trim();
  const desc = document.getElementById('editCategoryDesc').value.trim();
  if (!id || !name) { alert('Thiếu thông tin'); return; }

  fetch(API + '/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category_name: name, description: desc || null })
  })
    .then(res => res.json().then(r => ({ ok: res.ok, ...r })))
    .then(r => {
      if (r.ok || r.message === 'Category updated') {
        bootstrap.Modal.getInstance(document.getElementById('editCategoryModal')).hide();
        loadCategories();
        statsChannel.postMessage('update-stats');
      } else alert('Lỗi: ' + (r.error || 'Cập nhật thất bại'));
    })
    .catch(() => alert('Lỗi kết nối'));
}

function deleteCategory(id) {
  if (!id || !confirm('Xóa danh mục này?')) return;
  fetch(API + '/' + encodeURIComponent(id), { method: 'DELETE' })
    .then(res => res.json().then(r => ({ ok: res.ok, ...r })))
    .then(r => {
      if (r.ok || r.message === 'Category deleted') {
        loadCategories();
        statsChannel.postMessage('update-stats');
      } else alert('Lỗi: ' + (r.error || 'Xóa thất bại'));
    })
    .catch(() => alert('Lỗi kết nối'));
}

loadCategories();
if (typeof setInterval !== 'undefined') setInterval(loadCategories, 15000);

document.addEventListener('DOMContentLoaded', function() {
  var addBtn = document.getElementById('addCategoryBtn');
  if (addBtn) addBtn.addEventListener('click', addCategory);
});
