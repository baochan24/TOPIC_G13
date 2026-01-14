
#login phân quyền
#đừng quên import blueprint vào app.py
#đừng sửa nha
from flask import Flask
from routes.inventory import inventory_bp
from routes.stock_check import stock_bp

# import blueprint
from routes.auth import auth_bp
from routes.products import products_bp
from routes.orders import orders_bp
from routes.returns import returns_bp
from routes.categories import categories_bp
app = Flask(__name__)

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
    print(app.url_map)



#login phân quyền