
#Quan ly san pham
from flask import Blueprint, jsonify, request
from db import get_db_connection
from utils.auth_middleware import require_auth, require_role

products_bp = Blueprint("products", __name__, url_prefix="/products")


# GET: lấy danh sách sản phẩm

@products_bp.route("/", methods=["GET"])
@require_auth
@require_role("admin", "staff")
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
@require_auth
@require_role("admin", "staff")
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


# UPDATE sản phẩm
@products_bp.route("/<product_id>", methods=["PUT"])
@require_auth
@require_role("admin", "staff")
def update_product(product_id):
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 415

    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if product exists
        cursor.execute("SELECT product_id FROM products WHERE product_id = %s", (product_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Product not found"}), 404

        # Update fields
        update_fields = []
        values = []
        for field in ["product_name", "brand", "category_id", "base_price", "warranty_period"]:
            if field in data:
                update_fields.append(f"{field} = %s")
                values.append(data[field])

        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400

        values.append(product_id)
        query = f"UPDATE products SET {', '.join(update_fields)} WHERE product_id = %s"
        cursor.execute(query, values)
        conn.commit()

        return jsonify({"message": "Product updated"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# DELETE sản phẩm
@products_bp.route("/<product_id>", methods=["DELETE"])
@require_auth
@require_role("admin", "staff")
def delete_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if product exists
        cursor.execute("SELECT product_id FROM products WHERE product_id = %s", (product_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Product not found"}), 404

        cursor.execute("DELETE FROM products WHERE product_id = %s", (product_id,))
        conn.commit()

        return jsonify({"message": "Product deleted"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
