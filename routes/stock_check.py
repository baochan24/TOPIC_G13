from flask import Blueprint, request, jsonify
from db import get_db_connection

stock_bp = Blueprint("stock_check", __name__, url_prefix="/stock")  


@stock_bp.route("/<int:check_id>/scan", methods=["POST"])
def scan_imei(check_id):
    data = request.get_json()
    imei = data.get("imei_serial")
    actual_status = data.get("actual_status")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT status FROM items WHERE imei_serial = %s",
        (imei,)
    )
    item = cursor.fetchone()

    if item:
        system_status = item["status"]
        is_matched = (system_status == actual_status)
    else:
        system_status = None
        is_matched = False
        actual_status = "EXTRA"

    cursor.execute("""
        INSERT INTO stock_check_items
        (check_id, imei_serial, system_status, actual_status, is_matched)
        VALUES (%s,%s,%s,%s,%s)
    """, (check_id, imei, system_status, actual_status, is_matched))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "imei": imei,
        "system_status": system_status,
        "actual_status": actual_status,
        "matched": is_matched
    }), 201



@stock_bp.route("/<int:check_id>/result", methods=["GET"])
def check_result(check_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT imei_serial, system_status, actual_status, is_matched
        FROM stock_check_items
        WHERE check_id = %s
    """, (check_id,))

    data = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(data), 200


@stock_bp.route("/<int:check_id>/adjust", methods=["POST"])
def adjust_stock(check_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 1. Lấy các IMEI KHÔNG KHỚP
    cursor.execute("""
        SELECT imei_serial, system_status, actual_status
        FROM stock_check_items
        WHERE check_id = %s
          AND is_matched = 0
    """, (check_id,))
    mismatches = cursor.fetchall()

    if not mismatches:
        return jsonify({"message": "No adjustment needed"}), 200

    # 2. Điều chỉnh tồn kho
    for item in mismatches:
        imei = item["imei_serial"]
        actual_status = item["actual_status"]

        if actual_status == "MISSING":
            cursor.execute("""
                UPDATE items
                SET status = 'DEFECT'
                WHERE imei_serial = %s
            """, (imei,))

        elif actual_status == "IN_STOCK":
            cursor.execute("""
                UPDATE items
                SET status = 'IN_STOCK'
                WHERE imei_serial = %s
            """, (imei,))

        # EXTRA → chỉ ghi nhận, KHÔNG auto thêm vào hệ thống

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "message": "Stock adjusted successfully",
        "adjusted_items": len(mismatches)
    }), 200

