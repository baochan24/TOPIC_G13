#bán hàng

from flask import Blueprint, jsonify

orders_bp = Blueprint("orders", __name__, url_prefix="/orders")

@orders_bp.route("/", methods=["GET"])
def get_orders():
    return []
