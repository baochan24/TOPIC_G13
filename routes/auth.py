from flask import Blueprint, request, jsonify, g
from db import get_db_connection
from utils.hash import check_password
from utils.auth_middleware import generate_token, require_auth

authLogin_bp = Blueprint("auth", __name__, url_prefix="/auth")


# =========================
# LOGIN
# =========================
@authLogin_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"message": "Request phải là JSON"}), 400

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Thiếu username hoặc password"}), 400

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    try:
        # Lấy user + role
        cur.execute("""
            SELECT u.user_id,
                   u.username,
                   u.password_hash,
                   u.is_locked,
                   r.role_name
            FROM users u
            JOIN user_roles ur ON u.user_id = ur.user_id
            JOIN roles r ON ur.role_id = r.role_id
            WHERE u.username = %s
        """, (username,))
        user = cur.fetchone()

        if not user:
            return jsonify({"message": "Sai tài khoản hoặc mật khẩu"}), 401

        if user.get("is_locked"):
            return jsonify({"message": "Tài khoản đã bị khóa"}), 403

        if not check_password(password, user["password_hash"]):
            return jsonify({"message": "Sai tài khoản hoặc mật khẩu"}), 401

        # 🔐 TẠO TOKEN – FIX QUAN TRỌNG
        token = generate_token(
            user_id=user["user_id"],
            role=user["role_name"]
        )

        return jsonify({
            "token": token,
            "user": {
                "user_id": user["user_id"],
                "username": user["username"],
                "role": user["role_name"]
            }
        }), 200

    finally:
        cur.close()
        conn.close()


# =========================
# VERIFY TOKEN
# =========================
@authLogin_bp.route("/verify", methods=["GET"])
@require_auth
def verify():
    """
    Dùng cho frontend check token còn hợp lệ hay không
    """
    return jsonify({
        "valid": True,
        "user": {
            "user_id": g.user_id,
            "role": g.role
        }
    }), 200
