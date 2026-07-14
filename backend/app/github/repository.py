from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.db import get_db_connection
from app.api.dependencies import get_current_user
from app.services import github_service, repository_review

router = APIRouter()

class RepoReviewRequest(BaseModel):
    repository_url: str
    branch: Optional[str] = "main"

def get_user_github_token(current_user: dict) -> str:
    """Helper to retrieve github token from user row."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT github_access_token FROM users WHERE id = ?;", (current_user["id"],))
    row = cursor.fetchone()
    conn.close()
    
    if not row or not row["github_access_token"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub account not connected. Please connect your GitHub account first."
        )
    return row["github_access_token"]

@router.get("/github/repositories")
async def list_repositories(current_user: dict = Depends(get_current_user)):
    token = get_user_github_token(current_user)
    try:
        repos = github_service.get_user_repositories(token)
        return {"repositories": repos}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch repositories: {str(e)}"
        )

@router.get("/github/repositories/{repo:path}")
async def get_repository_details(repo: str, current_user: dict = Depends(get_current_user)):
    token = get_user_github_token(current_user)
    
    parts = repo.rstrip("/").split("/")
    if len(parts) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid repository path. Must be 'owner/name'."
        )
    owner, repo_name = parts[-2], parts[-1]
    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]
        
    try:
        branches = github_service.get_repository_branches(token, owner, repo_name)
        # Find default branch by checking repo list or defaulting to main/master
        default_branch = "main"
        if branches:
            if "main" in branches:
                default_branch = "main"
            elif "master" in branches:
                default_branch = "master"
            else:
                default_branch = branches[0]
                
        return {
            "owner": owner,
            "name": repo_name,
            "default_branch": default_branch,
            "branches": branches
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch repository details: {str(e)}"
        )

@router.post("/github/review")
async def review_repo(request: RepoReviewRequest, current_user: dict = Depends(get_current_user)):
    token = get_user_github_token(current_user)
    repo_url = request.repository_url.strip()
    branch = request.branch.strip() if request.branch else "main"
    
    if not repo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository Git URL is required"
        )
        
    try:
        results = repository_review.review_repository(
            repo_url=repo_url,
            branch=branch,
            user_id=current_user["id"],
            token=token
        )
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Repository analysis failed: {str(e)}"
        )

@router.get("/github/history")
async def get_github_history(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, code, language, score, created_at 
        FROM reviews 
        WHERE user_id = ? AND (language = 'multiple' OR code LIKE 'GitHub Repository:%' OR code LIKE 'GitHub Pull Request:%')
        ORDER BY created_at DESC;
        """,
        (current_user["id"],)
    )
    rows = cursor.fetchall()
    conn.close()
    
    history_list = []
    for row in rows:
        history_list.append({
            "id": row["id"],
            "code": row["code"],
            "language": row["language"],
            "score": row["score"],
            "created_at": row["created_at"]
        })
        
    return {"history": history_list}
