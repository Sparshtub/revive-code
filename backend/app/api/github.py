from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class RepoReviewRequest(BaseModel):
    repository_url: str
    branch: str = "main"

class PRReviewRequest(BaseModel):
    repository_url: str
    pr_number: int

@router.post("/github/repository")
async def review_repository(request: RepoReviewRequest):
    return {
        "status": "success",
        "message": f"Triggered review for repository: {request.repository_url}",
        "repository": request.repository_url,
        "branch": request.branch
    }

@router.post("/github/pr")
async def review_pr(request: PRReviewRequest):
    return {
        "status": "success",
        "message": f"Triggered review for PR #{request.pr_number} in {request.repository_url}",
        "repository": request.repository_url,
        "pr_number": request.pr_number
    }
