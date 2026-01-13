
#sản phẩm

from flask import Blueprint, jsonify

products_bp = Blueprint("products", __name__, url_prefix="/products")

@products_bp.route("/", methods=["GET"])
def get_products():
    return jsonify([])

@products_bp.route("/", methods=["POST"])
def create_product():
    return jsonify({"message": "Created"})
