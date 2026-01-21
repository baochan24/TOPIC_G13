const API = "http://localhost:5000/categories";

// BroadcastChannel để đồng bộ dashboard
const statsChannel = new BroadcastChannel('stats-update');

function loadCategories() {
  console.log('Loading categories...');
  fetch(API)
    .then(res => {
      console.log('Fetch response:', res);
      return res.json();
    })
    .then(data => {
      console.log('Categories data:', data);
      const table = document.getElementById("categoryTable");
      table.innerHTML = "";
      data.forEach(c => {
        table.innerHTML += `
          <tr>
            <td>${c.category_id}</td>
            <td>${c.category_name}</td>
          </tr>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading categories:', error);
    });
}

function addCategory() {
  const id = document.getElementById("categoryId").value;
  const name = document.getElementById("categoryName").value;

  fetch(API, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      category_id: id,
      category_name: name
    })
  }).then(() => {
    loadCategories();
    statsChannel.postMessage('update-stats'); // Đồng bộ dashboard
  });
}

loadCategories();

// Auto refresh every 10 seconds
setInterval(loadCategories, 10000);
