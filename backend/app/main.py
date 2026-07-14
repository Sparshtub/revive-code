from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import review, upload, auth, github, history

app = FastAPI(
    title="AI Code Reviewer API (ReviveCode)",
    description="Backend API for static analysis and ML-based code reviews",
    version="1.0.0"
)

# CORS configuration
import os
allowed_origins_str = os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
allow_all_origins = "*" in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if not allow_all_origins else ["*"],
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    from app.db import init_db
    init_db()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AI Code Reviewer API (ReviveCode)"
    }

# Include routers
from app.github import auth as github_auth, repository as github_repo, pull_request as github_pr

app.include_router(review.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(github.router, prefix="/api/v1")
app.include_router(github_auth.router, prefix="/api/v1")
app.include_router(github_repo.router, prefix="/api/v1")
app.include_router(github_pr.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
