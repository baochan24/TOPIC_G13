#bảo hành trả kho

from flask import Blueprint, jsonify

returns_bp = returns_bp = Blueprint(
    "returns",
    __name__,
    url_prefix="/returns"
)

@returns_bp.route("/", methods=["GET"])
def get_returns():
    return "OK returns"
