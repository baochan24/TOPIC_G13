# ================== QUẢN LÝ NHÂN VIÊN ==================
from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.hash import hash_password
from utils.auth_middleware import token_required,g
import uuid
import re

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


# ================== HELPER ==================
def is_admin(cursor, user_id):
    cursor.execute("""
        SELECT r.role_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = %s
    """, (user_id,))
    return any(row['role_name'] == "ADMIN" for row in cursor.fetchall())


def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email) 


def is_valid_phone(phone):
    return phone.isdigit() and len(phone) >= 9


def write_log(cursor, admin_id, action):
    cursor.execute("""
        INSERT INTO system_logs (log_id, user_id, action)
        VALUES (%s, %s, %s)
    """, (
        "LOG" + uuid.uuid4().hex[:8].upper(),
        admin_id,
        action
    ))


# ================== 1. XEM DANH SÁCH ==================
@admin_bp.route("/staff", methods=["GET"])
@token_required
def list_staff():
    current_user_id = g.user_id   # ✅ FIX

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if not is_admin(cursor, current_user_id):
            return jsonify({"message": "Không có quyền"}), 403

        cursor.execute("""
            SELECT u.user_id, u.username, u.full_name, u.email, u.phone,
                   r.role_name
            FROM users u
            JOIN user_roles ur ON u.user_id = ur.user_id
            JOIN roles r ON ur.role_id = r.role_id
        """)
        return jsonify(cursor.fetchall()), 200

    finally:
        cursor.close()
        conn.close()


# ================== 2. THÊM NHÂN VIÊN ==================
@admin_bp.route("/staff", methods=["POST"])
@token_required
def add_staff():
    current_user_id = g.user_id
    data = request.json

    username  = data.get("username")
    password  = data.get("password")
    full_name = data.get("full_name")
    email     = data.get("email")
    phone     = data.get("phone")
    role_name = data.get("role_name")

    if not all([username, password, full_name, role_name]):
        return jsonify({"message": "Thiếu trường bắt buộc (*)"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if not is_admin(cursor, current_user_id):
            return jsonify({"message": "Không có quyền"}), 403

        cursor.execute("SELECT 1 FROM users WHERE username=%s", (username,))
        if cursor.fetchone():
            return jsonify({"message": "Tài khoản đã tồn tại"}), 400

        cursor.execute(
            "SELECT role_id FROM roles WHERE role_name=%s",
            (role_name,)
        )
        role = cursor.fetchone()
        if not role:
            return jsonify({"message": "Vai trò không hợp lệ"}), 400

        user_id = "NV" + uuid.uuid4().hex[:6].upper()
        pw_hash = hash_password(password)

        cursor.execute("""
            INSERT INTO users (user_id, username, password_hash, full_name, email, phone)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (user_id, username, pw_hash, full_name, email, phone))

        cursor.execute("""
            INSERT INTO user_roles (user_id, role_id)
            VALUES (%s, %s)
        """, (user_id, role["role_id"]))

        write_log(cursor, current_user_id, f"Thêm nhân viên {user_id}")

        conn.commit()
        return jsonify({"message": "Thêm nhân viên thành công"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400

    finally:
        cursor.close()
        conn.close()

# ================== 3. SỬA NHÂN VIÊN ==================
@admin_bp.route("/staff/<user_id>", methods=["PUT"])
@token_required
def update_staff(user_id):
    current_user_id = g.user_id   # ✅ FIX
    data = request.json

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if not is_admin(cursor, current_user_id):
            return jsonify({"message": "Không có quyền"}), 403

        cursor.execute("SELECT 1 FROM users WHERE user_id=%s", (user_id,))
        if not cursor.fetchone():
            return jsonify({"message": "Nhân viên không tồn tại"}), 404

        fields = []
        values = []

        for col in ["full_name", "email", "phone"]:
            if data.get(col):
                if col == "email" and not is_valid_email(data[col]):
                    return jsonify({"message": "Email không hợp lệ"}), 400
                if col == "phone" and not is_valid_phone(data[col]):
                    return jsonify({"message": "SĐT không hợp lệ"}), 400

                fields.append(f"{col}=%s")
                values.append(data[col])

        if fields:
            cursor.execute(
                f"UPDATE users SET {', '.join(fields)} WHERE user_id=%s",
                (*values, user_id)
            )

        if data.get("role_id"):
            cursor.execute("""
                UPDATE user_roles SET role_id=%s WHERE user_id=%s
            """, (data["role_id"], user_id))

        write_log(cursor, current_user_id, f"Sửa thông tin nhân viên {user_id}")

        conn.commit()
        return jsonify({"message": "Cập nhật thành công"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400

    finally:
        cursor.close()
        conn.close()


# ================== 4. XÓA NHÂN VIÊN ==================
@admin_bp.route("/staff/<user_id>", methods=["DELETE"])
@token_required
def delete_staff(user_id):
    current_user_id = g.user_id   # ✅ FIX
    if current_user_id == user_id:
        return jsonify({"message": "Không thể xóa chính mình"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if not is_admin(cursor, current_user_id):
            return jsonify({"message": "Không có quyền"}), 403

        cursor.execute("SELECT 1 FROM users WHERE user_id=%s", (user_id,))
        if not cursor.fetchone():
            return jsonify({"message": "Nhân viên không tồn tại"}), 404

        cursor.execute("DELETE FROM user_roles WHERE user_id=%s", (user_id,))
        cursor.execute("DELETE FROM users WHERE user_id=%s", (user_id,))

        write_log(cursor, current_user_id, f"Xóa nhân viên {user_id}")

        conn.commit()
        return jsonify({"message": "Xóa thành công"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400

    finally:
        cursor.close()
        conn.close()
