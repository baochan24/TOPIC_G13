from flask import Blueprint, request, jsonify
from db import db_cursor
from utils.auth_middleware import require_auth, require_role
import uuid

returnsMoney_bp = Blueprint("returns", __name__, url_prefix="/returns")

# ======================
# Helpers
# ======================
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

# ======================
# 1. Admin xem danh sách yêu cầu trả hàng
# ======================
@returnsMoney_bp.get("")
@require_auth
@require_role("admin")
def list_return_requests():
    with db_cursor() as (_, cur):
        cur.execute(
            """
            SELECT return_id,
                   order_item_id,
                   reason,
                   refund_amount,
                   return_date
            FROM return_tickets
            ORDER BY return_date IS NULL DESC, return_date DESC
            """
        )
        return jsonify(cur.fetchall())

# ======================
# 2. Customer tạo yêu cầu trả hàng
# ======================
@returnsMoney_bp.post("/request")
@require_auth
@require_role("STAFF")
def request_return():
    data = request.get_json() or {}
    order_item_id = data.get("order_item_id")
    reason = data.get("reason", "")

    if not order_item_id:
        return jsonify({"message": "Thiếu order_item_id"}), 400

    with db_cursor() as (_, cur):
        ip = request.remote_addr

        # Staff chỉ cần order_item tồn tại
        cur.execute(
            """
            SELECT oi.order_item_id
            FROM order_items oi
            WHERE oi.order_item_id=%s
            """,
            (order_item_id,),
        )
        if not cur.fetchone():
            return jsonify({"message": "Order item không tồn tại"}), 404

        return_id = _gen_id("RET", 10)
        cur.execute(
            """
            INSERT INTO return_tickets(return_id, order_item_id, reason)
            VALUES(%s,%s,%s)
            """,
            (return_id, order_item_id, reason),
        )

        _log(cur, request.user["sub"], f"RETURN_REQUEST {return_id}", ip)

    return jsonify({"return_id": return_id}), 201

# ======================
# 3. Admin duyệt / từ chối + hoàn tiền
# ======================
@returnsMoney_bp.post("/<return_id>/process")
@require_auth
@require_role("admin")
def process_return(return_id):
    data = request.get_json() or {}
    approve = data.get("approve")
    restock = data.get("restock", True)
    note = data.get("note", "")

    with db_cursor() as (_, cur):
        ip = request.remote_addr

        # Lấy thông tin trả hàng
        cur.execute(
            """
            SELECT oi.imei_serial,
                   oi.sell_price,
                   o.order_id,
                   o.order_date
            FROM return_tickets rt
            JOIN order_items oi ON oi.order_item_id = rt.order_item_id
            JOIN orders o ON o.order_id = oi.order_id
            WHERE rt.return_id=%s
              AND rt.return_date IS NULL
            """,
            (return_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"message": "Yêu cầu không hợp lệ"}), 404

        imei_serial = row["imei_serial"]
        sell_price = row["sell_price"]
        order_id = row["order_id"]

        # ❗ FIX 1: kiểm tra trạng thái IMEI phải là SOLD
        cur.execute(
            "SELECT status FROM items WHERE imei_serial=%s",
            (imei_serial,),
        )
        item = cur.fetchone()
        if not item or item["status"] != "SOLD":
            return jsonify({"message": "IMEI không hợp lệ để trả hàng"}), 409

        # ❗ FIX 2: kiểm tra trong vòng 7 ngày
        cur.execute("SELECT DATEDIFF(NOW(), %s) AS days", (row["order_date"],))
        if cur.fetchone()["days"] > 7:
            approve = False
            note = "Quá hạn 7 ngày"

        if approve:
            # cập nhật return_ticket
            cur.execute(
                """
                UPDATE return_tickets
                SET refund_amount=%s,
                    return_date=NOW(),
                    staff_id=%s
                WHERE return_id=%s
                """,
                (sell_price, request.user["sub"], return_id),
            )

            # cập nhật IMEI
            new_status = "IN_STOCK" if restock else "DEFECT"
            cur.execute(
                "UPDATE items SET status=%s WHERE imei_serial=%s",
                (new_status, imei_serial),
            )

            # ❗ FIX 3: hoàn tiền sau khi update IMEI
            cur.execute(
                """
                INSERT INTO payments(payment_id, order_id, amount, payment_method)
                VALUES(%s,%s,%s,'CASH')
                """,
                (_gen_id("PAY", 10), order_id, sell_price),
            )

            _log(
                cur,
                request.user["sub"],
                f"RETURN_APPROVED {return_id} IMEI={imei_serial} STATUS={new_status}",
                ip,
            )

            return jsonify({
                "message": "Đã duyệt và hoàn tiền",
                "imei_status": new_status,
                "refund_amount": sell_price
            })

        else:
            # từ chối trả hàng
            cur.execute(
                """
                UPDATE return_tickets
                SET refund_amount=0,
                    return_date=NOW(),
                    staff_id=%s
                WHERE return_id=%s
                """,
                (request.user["sub"], return_id),
            )

            _log(
                cur,
                request.user["sub"],
                f"RETURN_REJECTED {return_id} reason={note}",
                ip,
            )

            return jsonify({
                "message": "Từ chối trả hàng",
                "reason": note
            })
