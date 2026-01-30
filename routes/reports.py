# Lap bao cao thong ke
from flask import Blueprint, request, jsonify, g
from db import get_db_connection
from utils.auth_middleware import token_required

reports_bp = Blueprint("reports", __name__, url_prefix="/reports")


# ================== HELPER ==================
def has_permission(cursor, user_id):
    cursor.execute("""
        SELECT r.role_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = %s
    """, (user_id,))
    roles = [r["role_name"] for r in cursor.fetchall()]
    return any(r in ["ADMIN", "STAFF"] for r in roles)


# ================== GENERATE REPORT ==================
@reports_bp.route("/", methods=["POST"])
@token_required
def generate_report():
    current_user_id = g.user_id   # ✅ FIX QUAN TRỌNG NHẤT

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    report_type = data.get("type")
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    if report_type not in ["revenue", "inventory"]:
        return jsonify({"error": "Loại báo cáo không hợp lệ"}), 400

    if report_type == "revenue":
        if not start_date or not end_date:
            return jsonify({"error": "Thiếu ngày"}), 400
        if start_date > end_date:
            return jsonify({"error": "Ngày không hợp lệ"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if not has_permission(cursor, current_user_id):
            return jsonify({"error": "Không có quyền"}), 403

        if report_type == "revenue":
            cursor.execute("""
                SELECT DATE(order_date) AS report_date,
                       SUM(total_amount) AS revenue
                FROM orders
                WHERE order_date BETWEEN %s AND %s
                GROUP BY DATE(order_date)
                ORDER BY report_date
            """, (start_date, end_date))
            rows = cursor.fetchall()

        else:
            cursor.execute("""
                SELECT product_id,
                       COUNT(*) AS total_items,
                       SUM(CASE WHEN status='IN_STOCK' THEN 1 ELSE 0 END) AS in_stock
                FROM items
                GROUP BY product_id
            """)
            rows = cursor.fetchall()

        return jsonify({
            "report_type": report_type,
            "data": rows
        }), 200

    except Exception as e:
        print("REPORT ERROR:", e)
        return jsonify({"error": "Server error"}), 500

    finally:
        cursor.close()
        conn.close()

# ================== EXPORT ==================
@reports_bp.route("/export", methods=["POST"])
@token_required
def export_report():
    return jsonify({
        "message": "Xuất báo cáo PDF / Excel (đang phát triển)"
    })


# ================== COMPARE ==================
@reports_bp.route("/compare", methods=["POST"])
@token_required
def compare_report():
    return jsonify({
        "message": "So sánh báo cáo với kỳ trước (đang phát triển)"
    })


# ================== SCHEDULE ==================
@reports_bp.route("/schedule", methods=["POST"])
@token_required
def schedule_report():
    return jsonify({
        "message": "Lên lịch gửi báo cáo định kỳ (đang phát triển)"
    })
