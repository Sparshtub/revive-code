import json
from fastapi import APIRouter, HTTPException, Depends, status
from app.db import get_db_connection
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    """
    Fetches the review history list for the authenticated user.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, language, score, created_at FROM reviews WHERE user_id = ? ORDER BY created_at DESC;",
        (current_user["id"],)
    )
    rows = cursor.fetchall()
    conn.close()
    
    history_list = []
    for row in rows:
        history_list.append({
            "id": row["id"],
            "language": row["language"],
            "score": row["score"],
            "created_at": row["created_at"]
        })
        
    return {"history": history_list}

@router.get("/review/{id}")
async def get_review(id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieves detailed information (including code and issues) for a specific review.
    Ensures that the review belongs to the authenticated user.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, user_id, code, language, score, issues, embedding, surprise_scores, created_at FROM reviews WHERE id = ?;",
        (id,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review report not found."
        )
        
    if row["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this review report."
        )
        
    try:
        issues_list = json.loads(row["issues"])
    except Exception:
        issues_list = []
        
    try:
        embedding_list = json.loads(row["embedding"]) if row["embedding"] else []
    except Exception:
        embedding_list = []

    try:
        surprise_scores_list = json.loads(row["surprise_scores"]) if row["surprise_scores"] else []
    except Exception:
        surprise_scores_list = []
        
    return {
        "id": row["id"],
        "code": row["code"],
        "language": row["language"],
        "score": row["score"],
        "issues": issues_list,
        "embedding": embedding_list,
        "surprise_scores": surprise_scores_list,
        "created_at": row["created_at"]
    }

@router.delete("/review/{id}")
async def delete_review(id: str, current_user: dict = Depends(get_current_user)):
    """
    Deletes a review record from the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify owner first
    cursor.execute("SELECT user_id FROM reviews WHERE id = ?;", (id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review report not found."
        )
        
    if row["user_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this review report."
        )
        
    cursor.execute("DELETE FROM reviews WHERE id = ? AND user_id = ?;", (id, current_user["id"]))
    conn.commit()
    conn.close()
    
    return {
        "status": "success",
        "message": f"Review {id} has been deleted.",
        "id": id
    }
