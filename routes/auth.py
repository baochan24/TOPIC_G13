from flask import Blueprint, request, jsonify, session
from models.user import User
from utils.hash import hash_password, verify_password

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.get_user_by_username(username)
    if user and verify_password(password, user.password):
        session['user_id'] = user.id
        session['username'] = user.username
        session['role'] = user.role
        return jsonify({"message": "Login successful", "role": user.role})
    return jsonify({"message": "Invalid credentials"}), 401

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'employee')

    if User.get_user_by_username(username):
        return jsonify({"message": "User already exists"}), 400

    hashed_password = hash_password(password)
    User.create_user(username, hashed_password, role)
    return jsonify({"message": "User created"}), 201

@auth_bp.route("/users", methods=["GET"])
def get_users():
    if session.get('role') != 'admin':
        return jsonify({"message": "Admin access required"}), 403
    users = User.get_all_users()
    return jsonify(users)
