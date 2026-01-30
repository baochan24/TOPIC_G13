# Tra cứu vòng đời sản phẩm theo IMEI
from flask import Blueprint, request, jsonify
from db import db_cursor
from utils.auth_middleware import require_auth
import uuid

lifecycle_bp = Blueprint("lifecycle", __name__, url_prefix="/lifecycle")

def _gen_id(prefix: str, n: int = 12) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:n]}"

def _log(cur, user_id, action, ip):
    cur.execute(
        """
        INSERT INTO system_logs(log_id, user_id, action, ip_address)
        VALUES(%s,%s,%s,%s)
        """,
        (_gen_id("LOG", 18), user_id, action, ip),
    )

@lifecycle_bp.get("/<imei_serial>")
@require_auth
def get_product_lifecycle(imei_serial):
    role = request.user.get("role")
    ip = request.remote_addr

    # ✅ FIX Ở ĐÂY
    with db_cursor() as (_, cur):

        # 1. Kiểm tra IMEI
        cur.execute(
            """
            SELECT i.imei_serial,
                   i.status,
                   i.item_condition,
                   p.product_name,
                   p.brand,
                   p.warranty_period
            FROM items i
            JOIN products p ON p.product_id = i.product_id
            WHERE i.imei_serial=%s
            """,
            (imei_serial,),
        )
        item = cur.fetchone()
        if not item:
            return jsonify({"message": "Sản phẩm không có trên hệ thống"}), 404

        timeline = []

        # 2. Lịch sử kiểm kê
        cur.execute(
            """
            SELECT it.check_date,
                   iti.actual_status,
                   it.note
            FROM inventory_ticket_items iti
            JOIN inventory_tickets it ON it.ticket_id = iti.ticket_id
            WHERE iti.imei_serial=%s
            ORDER BY it.check_date
            """,
            (imei_serial,),
        )
        for r in cur.fetchall():
            timeline.append({
                "time": r["check_date"],
                "event": "Kiểm kê kho",
                "detail": r["actual_status"],
                "note": r["note"]
            })

        # 3. Lịch sử bán
        cur.execute(
            """
            SELECT o.order_date,
                   o.order_id,
                   o.customer_id
            FROM order_items oi
            JOIN orders o ON o.order_id = oi.order_id
            WHERE oi.imei_serial=%s
            """,
            (imei_serial,),
        )
        order = cur.fetchone()
        if order:
            timeline.append({
                "time": order["order_date"],
                "event": "Bán hàng",
                "detail": f"Order {order['order_id']}",
                "customer_id": order["customer_id"]
            })

        # 4. Bảo hành
        cur.execute(
            """
            SELECT check_date, note, staff_id
            FROM warranty_tickets
            WHERE imei_serial=%s
            ORDER BY check_date
            """,
            (imei_serial,),
        )
        for w in cur.fetchall():
            timeline.append({
                "time": w["check_date"],
                "event": "Bảo hành",
                "detail": w["note"],
                "staff_id": w["staff_id"]
            })

        # 5. Sắp xếp
        timeline.sort(key=lambda x: x["time"] or "")

        # 6. Ẩn dữ liệu cho customer
        if role == "customer":
            for t in timeline:
                t.pop("staff_id", None)
                t.pop("note", None)

        # 7. Log
        _log(
            cur,
            request.user["user_id"],
            f"TRACE_PRODUCT_LIFECYCLE IMEI={imei_serial}",
            ip,
        )

        return jsonify({
            "imei_serial": imei_serial,
            "product": {
                "name": item["product_name"],
                "brand": item["brand"],
                "condition": item["item_condition"],
                "current_status": item["status"],
                "warranty_period": item["warranty_period"]
            },
            "timeline": timeline
        }), 200
