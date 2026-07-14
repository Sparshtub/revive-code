from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from app.api.dependencies import get_current_user

router = APIRouter()

MAX_FILE_SIZE = 1024 * 1024  # 1 MB in bytes

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large. Maximum supported file size is 1MB."
        )
        
    try:
        code_str = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only UTF-8 encoded text files are supported"
        )
        
    return {
        "filename": file.filename,
        "status": "success",
        "code": code_str
    }
