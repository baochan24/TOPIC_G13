# KIỂM KÊ KHO THEO IMEI – FINAL
from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.auth_middleware import require_auth, require_role

stock_bp = Blueprint("stock", __name__, url_prefix="/stock")


# =====================================================
# SCAN IMEI
# =====================================================
@stock_bp.route("/<ticket_id>/scan", methods=["POST"])
@require_auth
@require_role("ADMIN", "STAFF")
def scan_imei(ticket_id):
    data = request.get_json()
    imei = data.get("imei_serial")

    if not imei:
        return jsonify({"message": "Thiếu IMEI"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 1. Kiểm tra phiếu kiểm kê
        cursor.execute(
            "SELECT ticket_id FROM inventory_tickets WHERE ticket_id=%s",
            (ticket_id,)
        )
        if not cursor.fetchone():
            return jsonify({"message": "Phiếu kiểm kê không tồn tại"}), 404

        # 2. Kiểm tra IMEI trong hệ thống
        cursor.execute(
            "SELECT status FROM items WHERE imei_serial=%s",
            (imei,)
        )
        item = cursor.fetchone()

        actual_status = "FOUND" if item else "EXTRA"

        # 3. Check IMEI đã scan chưa
        cursor.execute("""
            SELECT id FROM inventory_ticket_items
            WHERE ticket_id=%s AND imei_serial=%s
        """, (ticket_id, imei))

        if cursor.fetchone():
            return jsonify({"message": "IMEI đã được scan"}), 400

        # 4. Ghi nhận kết quả scan
        cursor.execute("""
            INSERT INTO inventory_ticket_items
            (ticket_id, imei_serial, actual_status)
            VALUES (%s, %s, %s)
        """, (ticket_id, imei, actual_status))

        conn.commit()

        return jsonify({
            "imei_serial": imei,
            "actual_status": actual_status
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# =====================================================
# XEM KẾT QUẢ KIỂM KÊ
# =====================================================
@stock_bp.route("/<ticket_id>/result", methods=["GET"])
@require_auth
@require_role("ADMIN", "STAFF")
def check_result(ticket_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            s.imei_serial,
            s.expected_status AS system_status,
            s.actual_status,
            s.is_matched,
            s.scanned_at
        FROM stock_check_items s
        WHERE s.check_id = %s
        ORDER BY s.scanned_at ASC
    """, (ticket_id,))

    data = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(data), 200


# =====================================================
# ĐIỀU CHỈNH TỒN KHO SAU KIỂM KÊ
# =====================================================
@stock_bp.route("/<ticket_id>/adjust", methods=["POST"])
@require_auth
@require_role("ADMIN")
def adjust_stock(ticket_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT it.imei_serial, it.actual_status
        FROM inventory_ticket_items it
        WHERE it.ticket_id = %s
    """, (ticket_id,))

    rows = cursor.fetchall()
    adjusted = 0

    for r in rows:
        imei = r["imei_serial"]
        actual = r["actual_status"]

        if actual == "FOUND":
            cursor.execute("""
                UPDATE items SET status='IN_STOCK'
                WHERE imei_serial=%s
            """, (imei,))
            adjusted += 1

        elif actual == "EXTRA":
            # EXTRA: không tự động thêm – chỉ ghi nhận
            pass

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "message": "Đã điều chỉnh tồn kho",
        "adjusted_items": adjusted
    }), 200
