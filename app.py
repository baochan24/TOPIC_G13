from flask import Flask, send_from_directory
from flask_cors import CORS
# from flask_cors import CORS  # Removed: same origin, no CORS needed

# ===== IMPORT BLUEPRINT =====
from routes.auth import authLogin_bp 
from routes.viewSystemLogs import view_logs_bp
from routes.products import products_bp
from routes.customers import customers_bp
from routes.categories import categories_bp
from routes.warranty import warranty_bp
from routes.inventoryImei import inventory_bp
from routes.stock_check import stock_bp
from routes.reports import reports_bp
from routes.returnsMoney import returnsMoney_bp
from routes.createOders import create_order_bp
from routes.employer_management import admin_bp

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ems-secret-key-123'

CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)
# ===== REGISTER BLUEPRINT =====
app.register_blueprint(authLogin_bp)
app.register_blueprint(products_bp)
app.register_blueprint(returnsMoney_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(stock_bp)
app.register_blueprint(warranty_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(customers_bp)
app.register_blueprint(create_order_bp)
app.register_blueprint(view_logs_bp)
app.register_blueprint(admin_bp)

# ===== FRONTEND ROUTES =====
@app.route('/')
def index():
    return send_from_directory('routes/frontend', 'index.html')

@app.route('/auth')
def auth_page():
    return send_from_directory('routes/frontend', 'auth.html')

@app.route('/categories')
def categories():
    return send_from_directory('routes/frontend', 'categories.html')

@app.route('/products')
def products():
    return send_from_directory('routes/frontend', 'products.html')

@app.route('/stock_check')
def stock_check():
    return send_from_directory('routes/frontend', 'stock_Check.html')

@app.route('/customers')
def customers_page():
    return send_from_directory('routes/frontend', 'customers.html')

@app.route('/orders')
def orders_page():
    return send_from_directory('routes/frontend', 'createOders.html')

@app.route('/reports')
def reports_page():
    return send_from_directory('routes/frontend', 'reports.html')

@app.route('/warranty')
def warranty_page():
    return send_from_directory('routes/frontend', 'warranty.html')

@app.route('/system-logs')
def system_logs_page():
    return send_from_directory('routes/frontend', 'viewSystemLogs.html')

@app.route('/employer-management')
def employer_management_page():
    return send_from_directory('routes/frontend', 'employer_management.html')

# ===== STATIC FILES =====
@app.route('/<path:filename>')
def static_files(filename):
    if filename.startswith('js/'):
        return send_from_directory('routes/frontend/js', filename[3:])
    if filename.startswith('style/'):
        return send_from_directory('routes/frontend/style', filename[6:])
    return send_from_directory('routes/frontend', filename)

# ===== RUN SERVER (LUÔN ĐỂ CUỐI) =====
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
