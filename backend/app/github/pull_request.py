from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.db import get_db_connection
from app.api.dependencies import get_current_user
from app.github.repository import get_user_github_token
from app.services import github_service, repository_review

router = APIRouter()

class PRReviewRequest(BaseModel):
    repository_url: str
    pr_number: int

@router.get("/github/repositories/{repo:path}/pulls")
async def list_pull_requests(repo: str, current_user: dict = Depends(get_current_user)):
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
        pulls = github_service.get_pull_requests(token, owner, repo_name)
        return {"pulls": pulls}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pull requests: {str(e)}"
        )

@router.post("/github/pull-request/review")
async def review_pr(request: PRReviewRequest, current_user: dict = Depends(get_current_user)):
    token = get_user_github_token(current_user)
    repo_url = request.repository_url.strip()
    pr_number = request.pr_number
    
    if not repo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository Git URL is required"
        )
    if pr_number <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PR number must be positive"
        )
        
    try:
        results = repository_review.review_pull_request(
            repo_url=repo_url,
            pr_number=pr_number,
            user_id=current_user["id"],
            token=token
        )
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pull Request analysis failed: {str(e)}"
        )
