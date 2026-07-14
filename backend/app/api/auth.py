import os
import hashlib
import jwt
import re
import time
import logging
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from app.db import get_db_connection

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

# JWT configuration with strict environment validation
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
IS_DEV = os.environ.get("ENVIRONMENT", "development").lower() in ("dev", "development")

if not SECRET_KEY:
    if not IS_DEV:
        raise ValueError("CRITICAL SECURITY ERROR: JWT_SECRET_KEY environment variable MUST be set in production mode!")
    SECRET_KEY = "revive-code-super-secret-key-change-in-production"
elif SECRET_KEY == "revive-code-super-secret-key-change-in-production" and not IS_DEV:
    raise ValueError("CRITICAL SECURITY ERROR: The default development JWT_SECRET_KEY cannot be used in production mode!")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Simple in-memory IP rate limiter
import sys
RATE_LIMITS = defaultdict(list)
WINDOW_SECONDS = 60
MAX_ATTEMPTS = 5
IS_TESTING = "pytest" in sys.modules or os.environ.get("ENVIRONMENT") == "testing"

def check_rate_limit(ip: str) -> bool:
    if IS_TESTING:
        return True
    now = time.time()
    RATE_LIMITS[ip] = [t for t in RATE_LIMITS[ip] if now - t < WINDOW_SECONDS]
    if len(RATE_LIMITS[ip]) >= MAX_ATTEMPTS:
        return False
    RATE_LIMITS[ip].append(now)
    return True

# Security utilities
def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2 with SHA-256 and a random salt."""
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}:{pw_hash.hex()}"

def verify_password(password: str, hashed_password: str) -> bool:
    """Verifies a password against its stored hash."""
    try:
        salt_hex, hash_hex = hashed_password.split(":")
        salt = bytes.fromhex(salt_hex)
        pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return pw_hash.hex() == hash_hex
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    """Generates a JWT access token valid for the configured duration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decodes a JWT access token, returning the payload if valid."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None

# Pydantic schemas
class AuthRequest(BaseModel):
    email: EmailStr
    password: str

# Endpoints
@router.post("/auth/signup")
async def signup(request: Request, auth_req: AuthRequest):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later."
        )

    email = auth_req.email.lower().strip()
    password = auth_req.password
    
    # Secure Password Strength check
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one letter and one number."
        )
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user already exists
    cursor.execute("SELECT id FROM users WHERE email = ?;", (email,))
    existing_user = cursor.fetchone()
    if existing_user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already registered."
        )
        
    # Hash password and store user
    pw_hash = hash_password(password)
    try:
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?);",
            (email, pw_hash)
        )
        conn.commit()
    except Exception as e:
        conn.close()
        logger.error(f"Database error during registration for {email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal database error occurred during registration. Please try again later."
        )
        
    conn.close()
    return {
        "status": "success",
        "message": "User registered successfully",
        "email": email
    }

@router.post("/auth/login")
async def login(request: Request, auth_req: AuthRequest):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later."
        )

    email = auth_req.email.lower().strip()
    password = auth_req.password
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, email, password_hash FROM users WHERE email = ?;", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
        
    token = create_access_token(data={"sub": user["email"]})
    
    return {
        "status": "success",
        "message": "Logged in successfully",
        "token": token,
        "email": user["email"]
    }

