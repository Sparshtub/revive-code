import os
import hashlib
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.db import get_db_connection

router = APIRouter()

# JWT configuration
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "revive-code-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

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
async def signup(request: AuthRequest):
    email = request.email.lower().strip()
    password = request.password
    
    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during registration: {str(e)}"
        )
        
    conn.close()
    return {
        "status": "success",
        "message": "User registered successfully",
        "email": email
    }

@router.post("/auth/login")
async def login(request: AuthRequest):
    email = request.email.lower().strip()
    password = request.password
    
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
