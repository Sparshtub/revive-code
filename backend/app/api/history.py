from fastapi import APIRouter

router = APIRouter()

@router.get("/history")
async def get_history():
    return {
        "history": [
            {
                "id": "mock-review-1",
                "repository": "local-code-paste",
                "score": 87,
                "language": "python",
                "created_at": "2026-07-13T20:00:00Z"
            }
        ]
    }

@router.delete("/review/{id}")
async def delete_review(id: str):
    return {
        "status": "success",
        "message": f"Deleted review {id}",
        "id": id
    }
