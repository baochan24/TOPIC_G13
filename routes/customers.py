from flask import Blueprint, request, jsonify
from db import db_cursor
from utils.auth_middleware import require_auth, require_role
import uuid

customers_bp = Blueprint("customers", __name__, url_prefix="/customers")

# ==========================
# Utils
# ==========================
def gen_id(prefix, n=8):
    return f"{prefix}-{uuid.uuid4().hex[:n]}"

def log(cur, user_id, action, ip):
    log_id = gen_id("LOG", 16)
    cur.execute(
        "INSERT INTO system_logs(log_id, user_id, action, ip_address) VALUES(%s,%s,%s,%s)",
        (log_id, user_id, action, ip),
    )

# ==========================
# 1. LIST / SEARCH CUSTOMERS
# ==========================
@customers_bp.get("")
@require_auth
@require_role("ADMIN", "STAFF")
def list_customers():
    page = max(int(request.args.get("page", 1)), 1)
    page_size = min(int(request.args.get("page_size", 50)), 200)
    q = (request.args.get("q") or "").strip()

    offset = (page - 1) * page_size

    with db_cursor() as (_, cur):
        if q:
            like = f"%{q}%"
            cur.execute(
                """
                SELECT customer_id, full_name, phone_number, email, address
                FROM customers
                WHERE phone_number LIKE %s
                   OR full_name LIKE %s
                   OR email LIKE %s
                ORDER BY customer_id
                LIMIT %s OFFSET %s
                """,
                (like, like, like, page_size, offset),
            )
            data = cur.fetchall()

            cur.execute(
                """
                SELECT COUNT(*) total
                FROM customers
                WHERE phone_number LIKE %s
                   OR full_name LIKE %s
                   OR email LIKE %s
                """,
                (like, like, like),
            )
        else:
            cur.execute(
                """
                SELECT customer_id, full_name, phone_number, email, address
                FROM customers
                ORDER BY customer_id
                LIMIT %s OFFSET %s
                """,
                (page_size, offset),
            )
            data = cur.fetchall()
            cur.execute("SELECT COUNT(*) total FROM customers")

        total = cur.fetchone()["total"]

    return jsonify({
        "page": page,
        "page_size": page_size,
        "total": total,
        "data": data
    })

# ==========================
# 2. CREATE CUSTOMER
# ==========================
@customers_bp.post("")
@require_auth
@require_role("ADMIN", "STAFF")
def create_customer():
    data = request.get_json() or {}

    full_name = data.get("full_name")
    phone = data.get("phone_number")
    email = data.get("email")
    address = data.get("address")

    if not phone:
        return jsonify({"message": "Số điện thoại là bắt buộc"}), 400

    with db_cursor() as (_, cur):
        ip = request.remote_addr

        # Extend: khách đã tồn tại
        cur.execute("SELECT * FROM customers WHERE phone_number=%s", (phone,))
        existed = cur.fetchone()
        if existed:
            return jsonify({
                "message": "Khách hàng đã tồn tại",
                "customer": existed
            }), 409

        customer_id = gen_id("C")

        cur.execute(
            """
            INSERT INTO customers(customer_id, full_name, phone_number, email, address)
            VALUES(%s,%s,%s,%s,%s)
            """,
            (customer_id, full_name, phone, email, address),
        )

        log(cur, request.user["sub"], f"CREATE_CUSTOMER {customer_id}", ip)

    return jsonify({
        "message": "Thêm khách hàng thành công",
        "customer_id": customer_id
    }), 201

# ==========================
# 3. UPDATE CUSTOMER
# ==========================
@customers_bp.put("/<customer_id>")
@require_auth
@require_role("ADMIN", "STAFF")
def update_customer(customer_id):
    data = request.get_json() or {}

    with db_cursor() as (_, cur):
        ip = request.remote_addr

        cur.execute(
            """
            UPDATE customers
            SET full_name=%s,
                phone_number=%s,
                email=%s,
                address=%s
            WHERE customer_id=%s
            """,
            (
                data.get("full_name"),
                data.get("phone_number"),
                data.get("email"),
                data.get("address"),
                customer_id,
            ),
        )

        log(cur, request.user["sub"], f"UPDATE_CUSTOMER {customer_id}", ip)

    return jsonify({"message": "Cập nhật thành công"})

# ==========================
# 4. CUSTOMER HISTORY (INCLUDE)
# ==========================
@customers_bp.get("/<customer_id>/history")
@require_auth
@require_role("ADMIN", "STAFF")
def customer_history(customer_id):
    with db_cursor() as (_, cur):
        # Orders
        cur.execute(
            """
            SELECT o.order_id, o.order_date, o.total_amount
            FROM orders o
            WHERE o.customer_id=%s
            ORDER BY o.order_date DESC
            """,
            (customer_id,),
        )
        orders = cur.fetchall()

        # Warranty
        cur.execute(
            """
            SELECT wt.warranty_id, wt.check_date, wt.note, i.imei_serial
            FROM warranty_tickets wt
            JOIN items i ON wt.imei_serial=i.imei_serial
            JOIN order_items oi ON oi.imei_serial=i.imei_serial
            JOIN orders o ON o.order_id=oi.order_id
            WHERE o.customer_id=%s
            """,
            (customer_id,),
        )
        warranties = cur.fetchall()

    return jsonify({
        "orders": orders,
        "warranties": warranties
    })

# ==========================
# 5. DELETE CUSTOMER (ADMIN)
# ==========================
@customers_bp.delete("/<customer_id>")
@require_auth
@require_role("ADMIN")
def delete_customer(customer_id):
    with db_cursor() as (_, cur):
        ip = request.remote_addr

        cur.execute(
            "SELECT 1 FROM orders WHERE customer_id=%s LIMIT 1",
            (customer_id,),
        )
        if cur.fetchone():
            return jsonify({"message": "Không thể xóa khách đã có đơn hàng"}), 409

        cur.execute("DELETE FROM customers WHERE customer_id=%s", (customer_id,))
        log(cur, request.user["sub"], f"DELETE_CUSTOMER {customer_id}", ip)

    return jsonify({"message": "Đã xóa khách hàng"})
