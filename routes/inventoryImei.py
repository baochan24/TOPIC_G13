# Nhập kho sản phẩm theo IMEI (FINAL)
from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.auth_middleware import require_auth, require_role
import uuid

inventory_bp = Blueprint("inventory", __name__, url_prefix="/inventory")


# =========================
# Helper: ghi log hệ thống
# =========================
def log_action(cursor, user_id, action, ip):
    cursor.execute("""
        INSERT INTO system_logs (log_id, user_id, action, ip_address)
        VALUES (%s,%s,%s,%s)
    """, (
        str(uuid.uuid4())[:30],
        user_id,
        action,
        ip
    ))


# =========================
# 1. Nhập kho 1 IMEI
# =========================
@inventory_bp.route("/import", methods=["POST"])
@require_auth
@require_role("admin", "staff")
def import_item():
    data = request.get_json()
    product_id = data.get("product_id")
    imei_serial = data.get("imei_serial")
    condition = data.get("condition", "NEW")

    if not product_id or not imei_serial:
        return jsonify({"message": "Thiếu product_id hoặc imei_serial"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT product_id FROM products WHERE product_id=%s", (product_id,))
        if not cursor.fetchone():
            return jsonify({"message": "Product không tồn tại"}), 404

        cursor.execute("SELECT imei_serial FROM items WHERE imei_serial=%s", (imei_serial,))
        if cursor.fetchone():
            return jsonify({"message": "IMEI đã tồn tại"}), 409

        cursor.execute("""
            INSERT INTO items (imei_serial, product_id, status, item_condition)
            VALUES (%s,%s,'IN_STOCK',%s)
        """, (imei_serial, product_id, condition))

        log_action(cursor, request.user["sub"],
                   f"IMPORT IMEI={imei_serial} PRODUCT={product_id}",
                   request.remote_addr)

        conn.commit()
        return jsonify({"message": "Nhập kho thành công"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# =========================
# 2. Nhập kho hàng loạt
# =========================
@inventory_bp.route("/import-batch", methods=["POST"])
@require_auth
@require_role("admin", "staff")
def import_batch_items():
    data = request.get_json()
    product_id = data.get("product_id")
    items = data.get("items", [])

    if not product_id or not items:
        return jsonify({"message": "Thiếu dữ liệu"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    success, failed = 0, []

    try:
        for it in items:
            try:
                cursor.execute("""
                    INSERT INTO items (imei_serial, product_id, status, item_condition)
                    VALUES (%s,%s,'IN_STOCK',%s)
                """, (it["imei_serial"], product_id, it.get("condition", "NEW")))
                success += 1
            except Exception:
                failed.append(it["imei_serial"])

        log_action(cursor, request.user["sub"],
                   f"IMPORT_BATCH PRODUCT={product_id} SUCCESS={success}",
                   request.remote_addr)

        conn.commit()
        return jsonify({"imported": success, "failed": failed}), 201

    finally:
        cursor.close()
        conn.close()


# =========================
# 3. Tra cứu IMEI
# =========================
@inventory_bp.route("/imei/<imei_serial>", methods=["GET"])
@require_auth
def get_item_by_imei(imei_serial):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT i.imei_serial, i.status, i.item_condition,
               p.product_name, p.brand
        FROM items i
        JOIN products p ON p.product_id = i.product_id
        WHERE i.imei_serial=%s
    """, (imei_serial,))

    item = cursor.fetchone()
    cursor.close()
    conn.close()

    if not item:
        return jsonify({"message": "IMEI không tồn tại"}), 404

    return jsonify(item), 200


# =========================
# 4. Cập nhật trạng thái IMEI
# =========================
@inventory_bp.route("/imei/<imei_serial>/status", methods=["PUT"])
@require_auth
@require_role("admin", "staff")
def update_imei_status(imei_serial):
    new_status = request.json.get("status")

    if new_status not in ["IN_STOCK", "SOLD", "WARRANTY", "DEFECT"]:
        return jsonify({"message": "Trạng thái không hợp lệ"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("UPDATE items SET status=%s WHERE imei_serial=%s",
                   (new_status, imei_serial))

    log_action(cursor, request.user["sub"],
               f"UPDATE_STATUS IMEI={imei_serial} STATUS={new_status}",
               request.remote_addr)

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Cập nhật trạng thái thành công"}), 200


# =========================
# 5. Báo cáo tồn kho
# =========================
@inventory_bp.route("/", methods=["GET"])
@require_auth
@require_role("admin", "staff")
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
