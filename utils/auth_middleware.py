from functools import wraps
from flask import request, jsonify,g
import jwt
from datetime import datetime, timedelta, timezone

SECRET = "SECRET_KEY_ELECTRONIC_STORE"

# ================= TOKEN =================
def generate_token(user_id, role):
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=8)
    }
    

    token = jwt.encode(payload, SECRET, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


# ================= AUTH =================
def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):

        # ✅ Cho phép CORS preflight
        if request.method == "OPTIONS":
            return "", 200

        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"message": "Missing token"}), 401

        token = auth.split(" ", 1)[1]

        try:
            payload = jwt.decode(token, SECRET, algorithms=["HS256"])
            g.user_id= payload["user_id"]  # ✅ FIX QUAN TRỌNG NHẤT
            g.role= payload["role"]
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expired"}), 401
        except Exception:
            return jsonify({"message": "Invalid token"}), 401

        request.user = payload
        return fn(*args, **kwargs)

    return wrapper


# ✅ alias để import
require_auth = token_required


# ================= ROLE =================
def require_role(*roles):
    roles = [r.upper() for r in roles]

    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = getattr(request, "user", None)
            if not user:
                return jsonify({"message": "Unauthorized"}), 401

            user_role = user.get("role", "").upper()
            if user_role not in roles:
                return jsonify({"message": "Forbidden"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return deco
