from flask import Blueprint, request, jsonify
from db import get_db_connection

inventory_bp = Blueprint("inventory", __name__, url_prefix="/inventory")

@inventory_bp.route("/import", methods=["POST"])
def import_item():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 415

    data = request.get_json()

    product_id = data.get("product_id")
    imei_serial = data.get("imei_serial")
    condition = data.get("condition")

    if not product_id or not imei_serial:
        return jsonify({"error": "Missing data"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO items (product_id, imei_serial, status, item_condition)
            VALUES (%s, %s, 'IN_STOCK', %s)
            """,
            (product_id, imei_serial, condition)
        )
        conn.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({"message": "Import success"}), 201


@inventory_bp.route("/inventory", methods=["GET"])
def get_inventory():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT i.imei_serial, i.status, i.item_condition,
               p.product_name
        FROM items i
        JOIN products p ON i.product_id = p.product_id
        ORDER BY i.imei_serial
    """)

    items = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(items), 200

