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

@router.get("/review/{id}")
async def get_review(id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieves detailed information (including code and issues) for a specific review.
    Ensures that the review belongs to the authenticated user.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, user_id, code, language, score, issues, embedding, surprise_scores, category_scores, summary, created_at FROM reviews WHERE id = ?;",
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

    # Handle category_scores and summary, fallback to on-the-fly calculation for legacy reviews
    category_scores_str = None
    summary = None
    try:
        category_scores_str = row["category_scores"]
        summary = row["summary"]
    except Exception:
        pass

    if not category_scores_str or not summary:
        # Legacy review, calculate dynamically
        scoring_res = scoring_service.calculate_scores(issues_list)
        overall_score = scoring_res["overallScore"]
        category_scores = scoring_res["categoryScores"]
        severity_counts = scoring_res["severityCounts"]
        updated_issues = scoring_res["issues"]
        summary = summary_service.generate_summary(overall_score, category_scores, updated_issues)
    else:
        try:
            category_scores = json.loads(category_scores_str)
        except Exception:
            category_scores = {}
            
        severity_counts = {
            "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0
        }
        for issue in issues_list:
            sev = issue.get("severity", "Low").lower()
            if sev in severity_counts:
                severity_counts[sev] += 1
        updated_issues = issues_list
        overall_score = row["score"]
        
    return {
        "id": row["id"],
        "code": row["code"],
        "language": row["language"],
        "score": overall_score,  # Keep for backward compatibility
        "overallScore": overall_score,
        "categoryScores": category_scores,
        "severityCounts": severity_counts,
        "summary": summary,
        "issues": updated_issues,
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
