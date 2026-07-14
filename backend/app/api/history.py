import json
from fastapi import APIRouter, HTTPException, Depends, status
from app.db import get_db_connection
from app.api.dependencies import get_current_user
from app.services import scoring_service, summary_service

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
