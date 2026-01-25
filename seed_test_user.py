# -*- coding: utf-8 -*-
"""
Script tạo tài khoản test để đăng nhập và test ứng dụng.
Chạy từ thư mục TOPIC_G13:  python seed_test_user.py

Tài khoản mặc định:  admin / 123456  (role ADMIN)
"""

import sys
import os

# Thêm thư mục gốc vào path để import db, utils
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import get_db_connection
from utils.hash import hash_password


def main():
    print("=== Tạo tài khoản test (admin / 123456) ===\n")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 1. Đảm bảo bảng roles có dữ liệu
        cursor.execute("SELECT role_id FROM roles WHERE role_name = 'ADMIN' LIMIT 1")
        row = cursor.fetchone()
        if not row:
            print("Đang thêm các role vào bảng roles...")
            cursor.execute("""
                INSERT INTO roles (role_id, role_name) VALUES 
                ('ADMIN', 'ADMIN'), ('STAFF', 'STAFF'), ('MANAGER', 'MANAGER'), ('ACCOUNTANT', 'ACCOUNTANT')
            """)
            conn.commit()
            cursor.execute("SELECT role_id FROM roles WHERE role_name = 'ADMIN' LIMIT 1")
            row = cursor.fetchone()
        role_id = row["role_id"]
        print(f"  Role ADMIN: role_id = {role_id}")

        # 2. Kiểm tra user 'admin' đã tồn tại chưa
        cursor.execute("SELECT user_id, password_hash FROM users WHERE username = 'admin' LIMIT 1")
        user = cursor.fetchone()

        pw_hash = hash_password("123456")

        if user:
            cursor.execute(
                "UPDATE users SET password_hash = %s, failed_attempts = 0, is_locked = 0 WHERE username = 'admin'",
                (pw_hash,)
            )
            conn.commit()
            print("  Tài khoản 'admin' đã tồn tại -> đã cập nhật lại mật khẩu thành '123456'.")
        else:
            user_id = "ADMIN001"
            cursor.execute("""
                INSERT INTO users (user_id, username, password_hash, full_name, failed_attempts, is_locked)
                VALUES (%s, 'admin', %s, 'Administrator', 0, 0)
            """, (user_id, pw_hash))

            cursor.execute("SELECT 1 FROM user_roles WHERE user_id = %s", (user_id,))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s)", (user_id, role_id))

            conn.commit()
            print("  Đã tạo tài khoản mới: admin / 123456 (ADMIN)")

        print("\n--- Hướng dẫn test ---")
        print("1. Chạy server:     python app.py")
        print("2. Mở trình duyệt: http://localhost:5000/   hoặc   http://localhost:5000/auth")
        print("3. Đăng nhập:      Tên đăng nhập: admin     Mật khẩu: 123456")
        print("")

    except Exception as e:
        conn.rollback()
        print("LỖI:", e)
        print("\nKiểm tra:")
        print("  - MySQL đang chạy, database 'electronic_store_system' đã tạo")
        print("  - Các bảng: users, user_roles, roles (có cột failed_attempts, is_locked trong users)")
        print("  - db.py: host, user, password đúng")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
