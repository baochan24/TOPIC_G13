#Lap bao cao thong ke
from flask import Blueprint, request, jsonify
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
    return any(r in ["MANAGER", "ACCOUNTANT"] for r in roles)


# ================== GENERATE REPORT ==================
@reports_bp.route("/", methods=["POST"])
@token_required
def generate_report(current_user_id):
    """
    USE CASE: Lập báo cáo thống kê
    """

    data = request.get_json()
    report_type = data.get("type")
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    if not start_date or not end_date:
        return jsonify({"error": "Thiếu ngày bắt đầu hoặc kết thúc"}), 400

    if start_date > end_date:
        return jsonify({"error": "Ngày kết thúc phải sau ngày bắt đầu"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # ===== BẢO MẬT =====
        if not has_permission(cursor, current_user_id):
            return jsonify({"error": "Không có quyền truy cập"}), 403

        # ===== DOANH THU =====
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

        # ===== TỒN KHO =====
        elif report_type == "inventory":
            cursor.execute("""
                SELECT 
                    product_id,
                    COUNT(*) AS total_items,
                    SUM(CASE WHEN status = 'IN_STOCK' THEN 1 ELSE 0 END) AS in_stock
                FROM items
                GROUP BY product_id
            """)
            rows = cursor.fetchall()

        else:
            return jsonify({"error": "Loại báo cáo không hợp lệ"}), 400

        if not rows:
            return jsonify({"message": "Không có dữ liệu phù hợp"}), 200

        return jsonify({
            "report_type": report_type,
            "from": start_date,
            "to": end_date,
            "data": rows
        }), 200

    finally:
        cursor.close()
        conn.close()


# ================== EXPORT ==================
@reports_bp.route("/export", methods=["POST"])
@token_required
def export_report(current_user_id):
    return jsonify({
        "message": "Xuất báo cáo PDF / Excel (đang phát triển)"
    })


# ================== COMPARE ==================
@reports_bp.route("/compare", methods=["POST"])
@token_required
def compare_report(current_user_id):
    return jsonify({
        "message": "So sánh báo cáo với kỳ trước (đang phát triển)"
    })


# ================== SCHEDULE ==================
@reports_bp.route("/schedule", methods=["POST"])
@token_required
def schedule_report(current_user_id):
    return jsonify({
        "message": "Lên lịch gửi báo cáo định kỳ (đang phát triển)"
    })
