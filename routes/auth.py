from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.hash import check_password
from utils.auth_middleware import generate_token, require_auth

authLogin_bp = Blueprint("auth", __name__, url_prefix="/auth")

@authLogin_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT u.user_id, u.password_hash, r.role_name
        FROM users u
        JOIN user_roles ur ON u.user_id = ur.user_id
        JOIN roles r ON ur.role_id = r.role_id
        WHERE u.username = %s
    """, (username,))

    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user or not check_password(password, user["password_hash"]):
        return jsonify({"message": "Sai tài khoản hoặc mật khẩu"}), 401

    token = generate_token(user["user_id"], user["role_name"])

    return jsonify({
        "token": token,
        "role": user["role_name"]
    })

@authLogin_bp.route("/verify", methods=["GET"])
@require_auth
def verify():
    return jsonify({"valid": True, "user": request.user})
