from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class AuthRequest(BaseModel):
    email: str
    password: str

@router.post("/auth/signup")
async def signup(request: AuthRequest):
    return {
        "status": "success",
        "message": "User registered successfully",
        "email": request.email
    }

@router.post("/auth/login")
async def login(request: AuthRequest):
    return {
        "status": "success",
        "message": "Logged in successfully",
        "token": "mock-jwt-token-xyz"
    }
