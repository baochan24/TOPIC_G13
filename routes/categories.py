from flask import Blueprint, request, jsonify
from db import get_db_connection
import uuid

categories_bp = Blueprint("categories", __name__, url_prefix="/categories")

# CREATE
@categories_bp.route("", methods=["POST"])
def create_category():
    data = request.get_json()
    if not data or not data.get("category_name"):
        return jsonify({"error": "category_name is required"}), 400

    category_id = f"CAT-{uuid.uuid4().hex[:6].upper()}"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO categories (category_id, category_name, description)
        VALUES (%s, %s, %s)
    """, (
        category_id,
        data["category_name"],
        data.get("description")
    ))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "message": "Category created",
        "category_id": category_id
    }), 201


# READ
@categories_bp.route("", methods=["GET"])
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT category_id, category_name, description, created_at
        FROM categories
        WHERE is_active = 1
    """)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data), 200


# UPDATE
@categories_bp.route("/<category_id>", methods=["PUT"])
def update_category(category_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE categories
        SET category_name = %s,
            description = %s
        WHERE category_id = %s AND is_active = 1
    """, (
        data.get("category_name"),
        data.get("description"),
        category_id
    ))

    if cursor.rowcount == 0:
        return jsonify({"error": "Category not found"}), 404

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Category updated"}), 200


# DELETE (soft delete)
@categories_bp.route("/<category_id>", methods=["DELETE"])
def delete_category(category_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE categories SET is_active = 0 WHERE category_id = %s",
        (category_id,)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Category deleted"}), 200

