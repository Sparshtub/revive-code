from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.db import get_db_connection
from app.api.dependencies import get_current_user
from app.services import github_service

router = APIRouter()

class ConnectRequest(BaseModel):
    code: str

@router.post("/github/connect")
async def connect_github(request: ConnectRequest, current_user: dict = Depends(get_current_user)):
    code = request.code.strip()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code is required"
        )
        
    try:
        # 1. Exchange authorization code for access token
        access_token = github_service.exchange_code_for_token(code)
        
        # 2. Retrieve user profile details using retrieved token
        profile = github_service.get_user_profile(access_token)
        username = profile.get("login")
        
        if not username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not retrieve GitHub username"
            )
            
        # 3. Update database record for current logged-in user
        from app.services.encryption import encrypt_token
        encrypted_token = encrypt_token(access_token)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET github_username = ?, github_access_token = ? WHERE id = ?;",
            (username, encrypted_token, current_user["id"])
        )
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": "GitHub account connected successfully",
            "github_username": username
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"GitHub connection failed: {str(e)}"
        )

@router.post("/github/disconnect")
async def disconnect_github(current_user: dict = Depends(get_current_user)):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET github_username = NULL, github_access_token = NULL WHERE id = ?;",
            (current_user["id"],)
        )
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": "GitHub account disconnected successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"GitHub disconnection failed: {str(e)}"
        )
