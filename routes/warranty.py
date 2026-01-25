from flask import Blueprint, request, jsonify
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import get_db_connection
import datetime

# Tạo Blueprint cho phần Bảo hành
warranty_bp = Blueprint("warranty", __name__, url_prefix="/warranty")

# --- HÀM PHỤ TRỢ: GHI NHẬN LỊCH SỬ VÒNG ĐỜI (Như trong sơ đồ) ---
def log_lifecycle(cursor, user_id, action, ip="127.0.0.1"):
    """Ghi lại lịch sử thao tác vào system_logs"""
    import uuid
    log_id = "LOG" + str(uuid.uuid4())[:8] # Tạo ID ngẫu nhiên ngắn
    sql = """
        INSERT INTO system_logs (log_id, user_Id, action, ip_address)
        VALUES (%s, %s, %s, %s)
    """
    cursor.execute(sql, (log_id, user_id, action, ip))


# USE CASE 1: TIẾP NHẬN BẢO HÀNH

@warranty_bp.route("/receive", methods=["POST"])
def receive_warranty():
    data = request.json

    warranty_id = data.get('warranty_id')
    imei = data.get('imei_serial')
    staff_id = data.get('staff_id')
    error_note = data.get('note')

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Kiểm tra IMEI tồn tại
        cursor.execute(
            "SELECT status FROM items WHERE imei_serial = %s",
            (imei,)
        )
        item = cursor.fetchone()
        if not item:
            return jsonify({"error": "IMEI không tồn tại"}), 404

        # 2. Tạo phiếu bảo hành
        cursor.execute("""
            INSERT INTO warranty_tickets (
                warranty_id, imei_serial, staff_id,
                check_date, note, status, service_fee
            )
            VALUES (%s, %s, %s, NOW(), %s, 'RECEIVED', 0)
        """, (warranty_id, imei, staff_id, f"Lỗi: {error_note}"))

        # 3. Cập nhật trạng thái máy
        cursor.execute(
            "UPDATE items SET status = 'WARRANTY' WHERE imei_serial = %s",
            (imei,)
        )

        # 4. Log
        log_lifecycle(
            cursor,
            staff_id,
            f"Tiếp nhận bảo hành IMEI {imei}: {error_note}"
        )

        conn.commit()
        return jsonify({"message": "Tiếp nhận bảo hành thành công"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cursor.close()
        conn.close()


# USE CASE 2: CẬP NHẬT TIẾN ĐỘ

@warranty_bp.route("/update_progress", methods=["PUT"])
def update_progress():
    data = request.json

    warranty_id = data.get('warranty_id')
    staff_id = data.get('staff_id')
    new_note = data.get('note')
    is_completed = data.get('is_completed', False)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT note FROM warranty_tickets WHERE warranty_id = %s",
            (warranty_id,)
        )
        ticket = cursor.fetchone()
        if not ticket:
            return jsonify({"error": "Phiếu không tồn tại"}), 404

        old_note = ticket[0] or ""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

        updated_note = f"{old_note} | [{timestamp}] {new_note}"

        new_status = 'COMPLETED' if is_completed else 'IN_PROGRESS'

        cursor.execute("""
            UPDATE warranty_tickets
            SET note = %s, status = %s
            WHERE warranty_id = %s
        """, (updated_note, new_status, warranty_id))

        log_lifecycle(
            cursor,
            staff_id,
            f"Cập nhật tiến độ phiếu {warranty_id}: {new_note}"
        )

        conn.commit()
        return jsonify({"message": "Đã cập nhật tiến độ"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cursor.close()
        conn.close()


# USE CASE 3: TRẢ MÁY BẢO HÀNH

@warranty_bp.route("/return_device", methods=["POST"])
def return_device():
    data = request.json

    warranty_id = data.get('warranty_id')
    staff_id = data.get('staff_id')
    service_fee = data.get('fee', 0)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT imei_serial FROM warranty_tickets WHERE warranty_id = %s",
            (warranty_id,)
        )
        result = cursor.fetchone()
        if not result:
            return jsonify({"error": "Phiếu không tồn tại"}), 404

        imei = result[0]

        # 1. Cập nhật phí + trạng thái
        cursor.execute("""
            UPDATE warranty_tickets
            SET service_fee = %s, status = 'RETURNED'
            WHERE warranty_id = %s
        """, (service_fee, warranty_id))

        # 2. Trả máy
        cursor.execute(
            "UPDATE items SET status = 'SOLD' WHERE imei_serial = %s",
            (imei,)
        )

        # 3. Log
        log_lifecycle(
            cursor,
            staff_id,
            f"Trả máy bảo hành IMEI {imei}, phí: {service_fee}"
        )

        conn.commit()
        return jsonify({"message": "Đã trả máy và đóng phiếu bảo hành"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cursor.close()
        conn.close()