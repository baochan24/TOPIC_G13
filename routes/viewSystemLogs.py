from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.hash import hash_password, check_password
from utils.auth_middleware import generate_token, token_required
import uuid

view_logs_bp = Blueprint("view_logs", __name__, url_prefix="/auth")




# --- XEM NHẬT KÝ HỆ THỐNG (Admin) ---
@view_logs_bp.route("/system-logs_user", methods=["GET"])
@token_required
def view_logs(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    #neu khong phai admin thi k xem
    
    if not is_admin(cursor, current_user_id):
      return jsonify({"message": "Không có quyền"}), 403


    # Query params
    user_id = request.args.get("user_id")
    keyword = request.args.get("keyword")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    offset = (page - 1) * limit

    try:
        sql = "SELECT * FROM system_logs WHERE 1=1"
        params = []

        if user_id:
            sql += " AND user_id = %s"
            params.append(user_id)

        if keyword:
            sql += " AND action LIKE %s"
            params.append(f"%{keyword}%")

        if date_from:
            sql += " AND timestamp >= %s"
            params.append(date_from)

        if date_to:
            sql += " AND timestamp <= %s"
            params.append(date_to)

        sql += " ORDER BY timestamp DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(sql, params)
        logs = cursor.fetchall()

        return jsonify({
            "page": page,
            "limit": limit,
            "data": logs
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
        #xem chi tiet 1 login
@view_logs_bp.route("/system-logs/<log_id>", methods=["GET"])
@token_required
def view_log_detail(current_user_id, log_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT * FROM system_logs WHERE log_id = %s",
            (log_id,)
        )
        log = cursor.fetchone()

        if not log:
            return jsonify({"message": "Log không tồn tại"}), 404

        return jsonify(log), 200

    finally:
        cursor.close()
        conn.close()
        #thong ke nhat ky ( dashboard)
@view_logs_bp.route("/system-logs/statistics", methods=["GET"])
@token_required
def log_statistics(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT 
                DATE(timestamp) AS log_date,
                COUNT(*) AS total_logs
            FROM system_logs
            GROUP BY DATE(timestamp)
            ORDER BY log_date DESC
        """)
        stats = cursor.fetchall()
        return jsonify(stats), 200

    finally:
        cursor.close()
        conn.close()


#check quyen admin
def is_admin(cursor, user_id):
    cursor.execute("""
        SELECT r.role_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = %s
    """, (user_id,))
    roles = [r['role_name'] for r in cursor.fetchall()]
    return "ADMIN" in roles