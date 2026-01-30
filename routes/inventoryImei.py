# Nhập kho sản phẩm theo IMEI (FINAL - FIXED)
from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.auth_middleware import require_auth, require_role
import uuid

def gen_id(prefix, n=10):
    return f"{prefix}-{uuid.uuid4().hex[:n]}"

inventory_bp = Blueprint("inventory", __name__, url_prefix="/inventory")


# =========================
# Helper: ghi log hệ thống
# =========================
def log_action(cursor, user_id, action, ip):
    cursor.execute("""
        INSERT INTO system_logs (log_id, user_id, action, ip_address)
        VALUES (%s,%s,%s,%s)
    """, (
        gen_id("LOG", 16),
        user_id,
        action,
        ip
    ))


# =========================
# 1. Nhập kho IMEI (chuẩn)
# =========================
@inventory_bp.route("/import", methods=["POST"])
@require_auth
@require_role("STAFF", "ADMIN")
def import_inventory():
    data = request.get_json() or {}

    product_id = data.get("product_id")
    imeis = data.get("imeis", [])

    if not product_id or not isinstance(imeis, list) or not imeis:
        return jsonify({"message": "Thiếu product_id hoặc imeis"}), 400

    staff_id = request.user.get("user_id")  # ✅ FIX ĐÚNG JWT

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        for imei in imeis:
            cur.execute("""
                INSERT INTO items(item_id, product_id, imei_serial, status)
                VALUES (%s,%s,%s,'IN_STOCK')
            """, (
                gen_id("IT", 12),
                product_id,
                imei
            ))

        log_action(
            cur,
            staff_id,
            f"IMPORT IMEI PRODUCT={product_id} COUNT={len(imeis)}",
            request.remote_addr
        )

        conn.commit()
        return jsonify({
            "message": "Nhập kho thành công",
            "count": len(imeis)
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()


# =========================
# 2. Nhập kho hàng loạt
# =========================
@inventory_bp.route("/import-batch", methods=["POST"])
@require_auth
@require_role("STAFF", "ADMIN")
def import_batch_items():
    data = request.get_json() or {}
    product_id = data.get("product_id")
    items = data.get("items", [])

    if not product_id or not isinstance(items, list) or not items:
        return jsonify({"message": "Thiếu dữ liệu"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    success, failed = 0, []

    try:
        for it in items:
            try:
                cursor.execute("""
                    INSERT INTO items
                    (item_id, imei_serial, product_id, status, item_condition)
                    VALUES (%s,%s,%s,'IN_STOCK',%s)
                """, (
                    gen_id("IT", 12),
                    it["imei_serial"],
                    product_id,
                    it.get("condition", "NEW")
                ))
                success += 1
            except Exception:
                failed.append(it.get("imei_serial"))

        log_action(
            cursor,
            request.user.get("user_id"),
            f"IMPORT_BATCH PRODUCT={product_id} SUCCESS={success}",
            request.remote_addr
        )

        conn.commit()
        return jsonify({
            "imported": success,
            "failed": failed
        }), 201

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
@require_role("STAFF", "ADMIN")
def update_imei_status(imei_serial):
    new_status = request.json.get("status")

    if new_status not in ["IN_STOCK", "SOLD", "WARRANTY", "DEFECT"]:
        return jsonify({"message": "Trạng thái không hợp lệ"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE items SET status=%s WHERE imei_serial=%s
    """, (new_status, imei_serial))

    log_action(
        cursor,
        request.user.get("user_id"),
        f"UPDATE_STATUS IMEI={imei_serial} STATUS={new_status}",
        request.remote_addr
    )

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Cập nhật trạng thái thành công"}), 200


# =========================
# 5. Báo cáo tồn kho
# =========================
@inventory_bp.route("/", methods=["GET"])
@require_auth
@require_role("STAFF", "ADMIN")
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
