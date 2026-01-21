
#login phân quyền
#đừng quên import blueprint vào app.py
#đừng sửa nha
from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.inventory import inventory_bp
from routes.stock_check import stock_bp


# import blueprint
from routes.auth import auth_bp
from routes.products import products_bp
from routes.orders import orders_bp
from routes.returns import returns_bp
from routes.categories import categories_bp


app = Flask(__name__)
CORS(app)

# đăng ký blueprint
app.register_blueprint(auth_bp)
app.register_blueprint(products_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(returns_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(stock_bp)
if __name__ == "__main__":
    app.run(debug=True)

@app.route('/')
def index():
    return send_from_directory('routes/frontend', 'index.html')

@app.route('/categories')
def categories():
    return send_from_directory('routes/frontend', 'categories.html')

@app.route('/products')
def products():
    return send_from_directory('routes/frontend', 'products.html')

@app.route('/stock_check')
def stock_check():
    return send_from_directory('routes/frontend', 'stock_Check.html')

@app.route('/<path:filename>')
def static_files(filename):
    if filename.startswith('js/'):
        return send_from_directory('routes/frontend/js', filename[3:])
    elif filename.startswith('style/'):
        return send_from_directory('routes/frontend/style', filename[6:])
    return send_from_directory('routes/frontend', filename)