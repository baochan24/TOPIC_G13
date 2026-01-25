from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.hash import check_password
from utils.auth_middleware import generate_token
import uuid

authLogin_bp = Blueprint("auth_login", __name__, url_prefix="/auth")

@authLogin_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"message": "Missing username or password"}), 400

    username = data['username']
    password = data['password']

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT u.user_id, u.password_hash, r.role_name
        FROM users u
        JOIN user_roles ur ON u.user_id = ur.user_id
        JOIN roles r ON ur.role_id = r.role_id
        WHERE u.username = %s
        LIMIT 1
    """, (username,))

    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user or not check_password(password, user['password_hash']):
        return jsonify({"message": "Invalid username or password"}), 401

    token = generate_token(user['user_id'], user['role_name'])

    # Log login
    try:
        log_conn = get_db_connection()
        log_cursor = log_conn.cursor()
        log_id = str(uuid.uuid4())
        log_cursor.execute("""
            INSERT INTO system_logs (log_id, user_id, action, ip_address)
            VALUES (%s, %s, %s, %s)
        """, (log_id, user['user_id'], 'LOGIN', request.remote_addr))
        log_conn.commit()
        log_cursor.close()
        log_conn.close()
    except Exception as e:
        print(f"Log error: {e}")

    return jsonify({
        "token": token,
        "role": user['role_name'],
        "message": "Đăng nhập thành công"
    })
