

from flask import Blueprint, jsonify, request
from db import get_db_connection

products_bp = Blueprint("products", __name__, url_prefix="/products")


# GET: lấy danh sách sản phẩm

@products_bp.route("/", methods=["GET"])
def get_products():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(products), 200



#tạo sản phẩm mới

@products_bp.route("/", methods=["POST"])
def create_product():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 415

    data = request.get_json()

    required_fields = [
        "product_id",
        "product_name",
        "brand",
        "category_id",
        "base_price",
        "warranty_period"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO products
            (product_id, product_name, brand, category_id, base_price, warranty_period)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (
            data["product_id"],
            data["product_name"],
            data["brand"],
            data["category_id"],
            data["base_price"],
            data["warranty_period"]
        ))
        conn.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({"message": "Product created"}), 201
