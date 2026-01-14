from flask import Blueprint, request, jsonify
from db import get_db_connection

inventory_bp = Blueprint("inventory", __name__, url_prefix="/inventory")
from flask import Blueprint, request, jsonify
from db import get_db_connection

inventory_bp = Blueprint("inventory", __name__, url_prefix="/inventory")

from flask import Blueprint, request, jsonify
from db import get_db_connection

inventory_bp = Blueprint("inventory", __name__, url_prefix="/inventory")

@inventory_bp.route("/import", methods=["POST"])
def import_item():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 415

    data = request.get_json()
    product_id = data.get("product_id")
    imei_serial = data.get("imei_serial")
    condition = data.get("condition", "NEW")

    if not product_id or not imei_serial:
        return jsonify({"error": "Missing product_id or imei_serial"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 1. Kiểm tra product có tồn tại không
        cursor.execute(
            "SELECT product_id FROM products WHERE product_id = %s",
            (product_id,)
        )
        if cursor.fetchone() is None:
            return jsonify({"error": "Product not found"}), 400

        # 2. Kiểm tra IMEI đã tồn tại chưa
        cursor.execute(
            "SELECT imei_serial FROM items WHERE imei_serial = %s",
            (imei_serial,)
        )
        if cursor.fetchone():
            return jsonify({"error": "IMEI already exists"}), 409

        # 3. Nhập kho
        cursor.execute(
            """
            INSERT INTO items (imei_serial, product_id, status, item_condition)
            VALUES (%s, %s, 'IN_STOCK', %s)
            """,
            (imei_serial, product_id, condition)
        )
        conn.commit()

        return jsonify({
            "message": "Import success",
            "imei_serial": imei_serial,
            "product_id": product_id
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@inventory_bp.route("/", methods=["GET"])
def list_inventory():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            i.imei_serial,
            i.status,
            i.item_condition,
            p.product_name,
            p.brand
        FROM items i
        JOIN products p ON i.product_id = p.product_id
        ORDER BY i.imei_serial
    """)

    items = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(items), 200



#  Nhập kho hàng loạt
@inventory_bp.route("/import-batch", methods=["POST"])
def import_batch_items():
    data = request.get_json()
    product_id = data.get("product_id")
    items = data.get("items")

    if not product_id or not items:
        return jsonify({"error": "Missing data"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    success = 0
    failed = []

    for item in items:
        try:
            cursor.execute(
                """
                INSERT INTO items (imei_serial, product_id, item_condition)
                VALUES (%s, %s, %s)
                """,
                (item["imei_serial"], product_id, item.get("condition", "NEW"))
            )
            success += 1
        except Exception:
            failed.append(item["imei_serial"])

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "imported": success,
        "failed": failed
    }), 201

#  Tra cứu IMEI
@inventory_bp.route("/imei/<imei_serial>", methods=["GET"])
def get_item_by_imei(imei_serial):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT i.imei_serial, i.status, i.item_condition,
               p.product_name
        FROM items i
        JOIN products p ON i.product_id = p.product_id
        WHERE i.imei_serial = %s
    """, (imei_serial,))

    item = cursor.fetchone()
    cursor.close()
    conn.close()

    if not item:
        return jsonify({"error": "IMEI not found"}), 404

    return jsonify(item), 200


#  Xuất kho / bán hàng theo IMEI
@inventory_bp.route("/sell", methods=["POST"])
def sell_item():
    data = request.get_json()
    imei_serial = data.get("imei_serial")

    if not imei_serial:
        return jsonify({"error": "Missing IMEI"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT status FROM items WHERE imei_serial=%s",
        (imei_serial,)
    )
    row = cursor.fetchone()

    if not row:
        return jsonify({"error": "IMEI not found"}), 404

    if row[0] != "IN_STOCK":
        return jsonify({"error": "Item not available"}), 400

    cursor.execute(
        "UPDATE items SET status='SOLD' WHERE imei_serial=%s",
        (imei_serial,)
    )
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Sold successfully"}), 200


#  Cập nhật trạng thái IMEI (bảo hành / lỗi)
@inventory_bp.route("/imei/<imei_serial>/status", methods=["PUT"])
def update_imei_status(imei_serial):
    data = request.get_json()
    new_status = data.get("status")

    if not new_status:
        return jsonify({"error": "Missing status"}), 400

    if new_status not in ["IN_STOCK", "SOLD", "WARRANTY", "DEFECT"]:
        return jsonify({"error": "Invalid status"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # kiểm tra IMEI tồn tại
    cursor.execute(
        "SELECT imei_serial FROM items WHERE imei_serial = %s",
        (imei_serial,)
    )
    if cursor.fetchone() is None:
        cursor.close()
        conn.close()
        return jsonify({"error": "IMEI not found"}), 404

    # cập nhật trạng thái
    cursor.execute(
        "UPDATE items SET status = %s WHERE imei_serial = %s",
        (new_status, imei_serial)
    )
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Status updated successfully",
        "imei_serial": imei_serial,
        "new_status": new_status
    }), 200


#  Báo cáo tồn kho
@inventory_bp.route("/", methods=["GET"])
def inventory_report():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT product_id,
               COUNT(*) AS total,
               SUM(status='IN_STOCK') AS in_stock
        FROM items
        GROUP BY product_id
    """)

    data = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(data), 200