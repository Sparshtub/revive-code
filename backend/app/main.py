from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import review, upload, auth, github, history

app = FastAPI(
    title="AI Code Reviewer API (ReviveCode)",
    description="Backend API for static analysis and ML-based code reviews",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
app.include_router(review.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(github.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
