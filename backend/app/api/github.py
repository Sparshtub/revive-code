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

def clone_and_checkout(repo_url: str, dest_dir: str, branch: str = None, pr_number: int = None):
    """
    Clones the repository and checks out the specific branch or pull request.
    Uses git shallow clone to save bandwidth and speed up analysis.
    """
    try:
        # Standard clone command
        clone_cmd = ["git", "clone", "--depth", "1"]
        if branch and not pr_number:
            clone_cmd.extend(["-b", branch])
        clone_cmd.extend([repo_url, dest_dir])
        
        res = subprocess.run(clone_cmd, capture_output=True, text=True, shell=True)
        if res.returncode != 0:
            raise Exception(res.stderr or "Failed to clone repository")
            
        # If reviewing a PR, fetch the PR head and check it out
        if pr_number:
            fetch_cmd = ["git", "fetch", "origin", f"pull/{pr_number}/head:pr_branch"]
            subprocess.run(fetch_cmd, cwd=dest_dir, capture_output=True, shell=True)
            checkout_cmd = ["git", "checkout", "pr_branch"]
            subprocess.run(checkout_cmd, cwd=dest_dir, capture_output=True, shell=True)
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Git operation failed: {str(e)}"
        )

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
        except Exception:
            pass
            
    # Calculate overall average score
    overall_score = round(sum(scores) / len(scores)) if scores else 100
    
    # Sort issues by file path and then by line number
    all_issues.sort(key=lambda x: (x.get("file", ""), x.get("line", 0)))
    
    return {
        "score": overall_score,
        "issues": all_issues
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
        clone_and_checkout(repo_url, temp_checkout_dir, branch=branch)
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
                    "INSERT INTO reviews (id, user_id, code, language, score, issues) VALUES (?, ?, ?, ?, ?, ?);",
                    (
                        review_id,
                        current_user["id"],
                        f"GitHub Repository: {repo_url}\nBranch: {branch}\nFiles Scanned: {len(files)}",
                        "multiple",
                        results["score"],
                        json_dumps_with_utf8(results["issues"])
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
            "score": results["score"],
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
        clone_and_checkout(repo_url, temp_checkout_dir, pr_number=pr_number)
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
                    "INSERT INTO reviews (id, user_id, code, language, score, issues) VALUES (?, ?, ?, ?, ?, ?);",
                    (
                        review_id,
                        current_user["id"],
                        f"GitHub Pull Request: {repo_url} (PR #{pr_number})\nFiles Scanned: {len(files)}",
                        "multiple",
                        results["score"],
                        json_dumps_with_utf8(results["issues"])
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
            "score": results["score"],
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
