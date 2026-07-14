import os
import re
import uuid
import shutil
import stat
import subprocess
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Any
from app.db import get_db_connection
from app.api.dependencies import get_optional_current_user
from app.api.review import perform_raw_analysis, SANDBOX_DIR
from app.services import scoring_service, summary_service
from app.services.repository_review import clone_and_checkout

router = APIRouter()

# Supported file extensions and their corresponding languages
LANGUAGE_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".java": "java",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".h": "cpp",
    ".hpp": "cpp"
}

# Directories to skip during scanning
IGNORE_DIRS = {
    "node_modules",
    ".git",
    ".github",
    ".next",
    "dist",
    "build",
    "out",
    "venv",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    "sandbox",
    "target",
    "obj"
}

class RepoReviewRequest(BaseModel):
    repository_url: str
    branch: str = "main"

class PRReviewRequest(BaseModel):
    repository_url: str
    pr_number: int

def rmtree_onerror(func, path, excinfo):
    """
    Error handler for shutil.rmtree on Windows to force-remove read-only files
    (like those in .git folders).
    """
    os.chmod(path, stat.S_IWRITE)
    func(path)

# clone_and_checkout imported from app.services.repository_review

def scan_repository_files(repo_path: str) -> List[Dict[str, str]]:
    """
    Recursively scans the directory and returns metadata of supported files.
    Enforces limits on file count (max 50) and file sizes (max 500KB).
    """
    files_to_review = []
    
    for root, dirs, files in os.walk(repo_path):
        # Modify dirs in-place to skip ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            file_path = os.path.join(root, file)
            _, ext = os.path.splitext(file).lower()
            
            if ext in LANGUAGE_EXTENSIONS:
                try:
                    # Skip large files
                    size_kb = os.path.getsize(file_path) / 1024
                    if size_kb > 500:
                        continue
                        
                    rel_path = os.path.relpath(file_path, repo_path)
                    files_to_review.append({
                        "absolute_path": file_path,
                        "relative_path": rel_path,
                        "language": LANGUAGE_EXTENSIONS[ext]
                    })
                except Exception:
                    pass
                    
            if len(files_to_review) >= 50:
                break
                
        if len(files_to_review) >= 50:
            break
            
    return files_to_review

def analyze_repo_files(files: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Runs the static analysis engine on all parsed files and aggregates reports.
    """
    all_issues = []
    scores = []
    embeddings = []
    
    for file_info in files:
        try:
            with open(file_info["absolute_path"], "r", encoding="utf-8", errors="ignore") as f:
                code_content = f.read()
                
            # Perform code review on file
            analysis = perform_raw_analysis(
                code=code_content,
                language=file_info["language"],
                file_path_on_disk=file_info["absolute_path"]
            )
            
            # Map issues to their file context
            for issue in analysis["issues"]:
                issue["file"] = file_info["relative_path"]
                all_issues.append(issue)
                
            scores.append(analysis["score"])
            if "embedding" in analysis and analysis["embedding"]:
                embeddings.append(analysis["embedding"])
        except Exception:
            pass
            
    # Calculate overall weighted average score
    # Aggregate all issues to perform project-wide scoring
    scoring_result = scoring_service.calculate_scores(all_issues)
    overall_score = scoring_result["overallScore"]
    category_scores = scoring_result["categoryScores"]
    severity_counts = scoring_result["severityCounts"]
    updated_issues = scoring_result["issues"]
    
    # Generate project-wide summary review
    summary = summary_service.generate_summary(overall_score, category_scores, updated_issues)
    
    # Calculate aggregated mean embedding of the repository
    repo_embedding = [0.0] * 768
    if embeddings:
        for emb in embeddings:
            for i in range(768):
                repo_embedding[i] += emb[i]
        for i in range(768):
            repo_embedding[i] /= len(embeddings)
            
    # Sort issues by file path and then by line number
    updated_issues.sort(key=lambda x: (x.get("file", ""), x.get("line", 0)))
    
    return {
        "score": overall_score,
        "overallScore": overall_score,
        "categoryScores": category_scores,
        "severityCounts": severity_counts,
        "summary": summary,
        "issues": updated_issues,
        "embedding": repo_embedding
    }

@router.post("/github/repository")
async def review_repository(request: RepoReviewRequest, current_user: dict = Depends(get_optional_current_user)):
    repo_url = request.repository_url.strip()
    branch = request.branch.strip() if request.branch else "main"
    
    if not repo_url:
        raise HTTPException(status_code=400, detail="Repository URL is required")
        
    # Create unique checkout directory
    session_id = f"repo_{uuid.uuid4().hex}"
    temp_checkout_dir = os.path.join(SANDBOX_DIR, session_id)
    
    try:
        try:
            clone_and_checkout(repo_url, temp_checkout_dir, branch=branch)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Git operation failed: {str(e)}"
            )
        files = scan_repository_files(temp_checkout_dir)
        
        if not files:
            raise HTTPException(
                status_code=400,
                detail="No supported code files found in the repository."
            )
            
        results = analyze_repo_files(files)
        
        # Optionally persist repository review to database
        review_id = str(uuid.uuid4())
        if current_user:
            conn = get_db_connection()
            cursor = conn.cursor()
            try:
                # Store aggregated report
                cursor.execute(
                    "INSERT INTO reviews (id, user_id, code, language, score, issues, embedding, surprise_scores, category_scores, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
                    (
                        review_id,
                        current_user["id"],
                        f"GitHub Repository: {repo_url}\nBranch: {branch}\nFiles Scanned: {len(files)}",
                        "multiple",
                        results["overallScore"],
                        json_dumps_with_utf8(results["issues"]),
                        json_dumps_with_utf8(results["embedding"]),
                        json_dumps_with_utf8([]),
                        json_dumps_with_utf8(results["categoryScores"]),
                        results["summary"]
                    )
                )
                conn.commit()
            except Exception as e:
                conn.close()
                raise HTTPException(status_code=500, detail=f"Database save failed: {str(e)}")
            conn.close()
            
        return {
            "id": review_id,
            "status": "success",
            "message": f"Analyzed {len(files)} files successfully.",
            "repository": repo_url,
            "branch": branch,
            "score": results["overallScore"],
            "overallScore": results["overallScore"],
            "categoryScores": results["categoryScores"],
            "severityCounts": results["severityCounts"],
            "summary": results["summary"],
            "issues": results["issues"]
        }
        
    finally:
        # Guarantee cleanup of cloned codebase
        if os.path.exists(temp_checkout_dir):
            try:
                shutil.rmtree(temp_checkout_dir, onerror=rmtree_onerror)
            except Exception:
                pass

@router.post("/github/pr")
async def review_pr(request: PRReviewRequest, current_user: dict = Depends(get_optional_current_user)):
    repo_url = request.repository_url.strip()
    pr_number = request.pr_number
    
    if not repo_url:
        raise HTTPException(status_code=400, detail="Repository URL is required")
    if pr_number <= 0:
        raise HTTPException(status_code=400, detail="PR number must be positive")
        
    session_id = f"pr_{uuid.uuid4().hex}"
    temp_checkout_dir = os.path.join(SANDBOX_DIR, session_id)
    
    try:
        try:
            clone_and_checkout(repo_url, temp_checkout_dir, pr_number=pr_number)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Git operation failed: {str(e)}"
            )
        files = scan_repository_files(temp_checkout_dir)
        
        if not files:
            raise HTTPException(
                status_code=400,
                detail="No supported code files found in this Pull Request."
            )
            
        results = analyze_repo_files(files)
        
        review_id = str(uuid.uuid4())
        if current_user:
            conn = get_db_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "INSERT INTO reviews (id, user_id, code, language, score, issues, embedding, surprise_scores, category_scores, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
                    (
                        review_id,
                        current_user["id"],
                        f"GitHub Pull Request: {repo_url} (PR #{pr_number})\nFiles Scanned: {len(files)}",
                        "multiple",
                        results["overallScore"],
                        json_dumps_with_utf8(results["issues"]),
                        json_dumps_with_utf8(results["embedding"]),
                        json_dumps_with_utf8([]),
                        json_dumps_with_utf8(results["categoryScores"]),
                        results["summary"]
                    )
                )
                conn.commit()
            except Exception as e:
                conn.close()
                raise HTTPException(status_code=500, detail=f"Database save failed: {str(e)}")
            conn.close()
            
        return {
            "id": review_id,
            "status": "success",
            "message": f"Analyzed PR #{pr_number} ({len(files)} files) successfully.",
            "repository": repo_url,
            "pr_number": pr_number,
            "score": results["overallScore"],
            "overallScore": results["overallScore"],
            "categoryScores": results["categoryScores"],
            "severityCounts": results["severityCounts"],
            "summary": results["summary"],
            "issues": results["issues"]
        }
        
    finally:
        if os.path.exists(temp_checkout_dir):
            try:
                shutil.rmtree(temp_checkout_dir, onerror=rmtree_onerror)
            except Exception:
                pass

def json_dumps_with_utf8(data: Any) -> str:
    """Helper to dump JSON preserving UTF-8 strings."""
    import json
    return json.dumps(data, ensure_ascii=False)
