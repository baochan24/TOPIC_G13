from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.auth_middleware import require_auth, require_role
import uuid

create_order_bp = Blueprint("create_orders", __name__, url_prefix="/orders")

def gen_id(prefix, n=10):
    return f"{prefix}-{uuid.uuid4().hex[:n]}"

@create_order_bp.route("", methods=["POST"])
@require_auth
@require_role("STAFF", "ADMIN")
def checkout():
    data = request.get_json() or {}
    customer_id = data.get("customer_id")
    imeis = data.get("imeis", [])
    payment_method = (data.get("payment_method") or "CASH").upper()

    if not imeis:
        return jsonify({"message": "Thiếu IMEI"}), 400

    staff_id = request.user["sub"]

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    try:
        # 1️⃣ kiểm tra IMEI + tồn kho
        placeholders = ",".join(["%s"] * len(imeis))
        cur.execute(
            f"""
            SELECT i.imei_serial, p.base_price
            FROM items i
            JOIN products p ON p.product_id = i.product_id
            WHERE i.imei_serial IN ({placeholders})
              AND i.status = 'IN_STOCK'
            """,
            tuple(imeis)
        )
        rows = cur.fetchall()

        if len(rows) != len(imeis):
            return jsonify({"message": "Có IMEI không hợp lệ hoặc đã bán"}), 409

        # 2️⃣ tính tiền
        total_amount = sum(float(r["base_price"]) for r in rows)

        # 3️⃣ tạo order
        order_id = gen_id("ORD", 12)
        cur.execute(
            """
            INSERT INTO orders(order_id, staff_id, customer_id, total_amount)
            VALUES (%s,%s,%s,%s)
            """,
            (order_id, staff_id, customer_id, total_amount)
        )

        # 4️⃣ order_items + trừ kho
        for r in rows:
            cur.execute(
                """
                INSERT INTO order_items(order_item_id, order_id, imei_serial, sell_price)
                VALUES (%s,%s,%s,%s)
                """,
                (gen_id("OI", 14), order_id, r["imei_serial"], r["base_price"])
            )
            cur.execute(
                "UPDATE items SET status='SOLD' WHERE imei_serial=%s",
                (r["imei_serial"],)
            )

        # 5️⃣ payment
        cur.execute(
            """
            INSERT INTO payments(payment_id, order_id, amount, payment_method)
            VALUES (%s,%s,%s,%s)
            """,
            (gen_id("PAY", 12), order_id, total_amount, payment_method)
        )

        conn.commit()

        return jsonify({
            "message": "Lập đơn hàng thành công",
            "order_id": order_id,
            "total_amount": total_amount
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()
