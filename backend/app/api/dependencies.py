from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.db import get_db_connection
from app.api.auth import decode_access_token

# Define standard OAuth2 password bearer scheme pointing to login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency that enforces user authentication.
    Verifies JWT token and resolves user dict.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing sub payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email FROM users WHERE email = ?;", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return {"id": user["id"], "email": user["email"]}

def get_optional_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency that optionally parses the user if authenticated.
    Returns None if token is missing or invalid (no exceptions raised).
    """
    if not token:
        return None
        
    payload = decode_access_token(token)
    if payload is None:
        return None
        
    email = payload.get("sub")
    if not email:
        return None
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email FROM users WHERE email = ?;", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        return None
        
    return {"id": user["id"], "email": user["email"]}
