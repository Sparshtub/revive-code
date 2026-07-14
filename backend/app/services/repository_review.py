import os
import uuid
import shutil
import stat
import subprocess
import json
from typing import List, Dict, Any
from app.db import get_db_connection
from app.api.review import perform_raw_analysis, SANDBOX_DIR
from app.services import scoring_service, summary_service

# Supported extensions and languages
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

IGNORE_DIRS = {
    "node_modules", ".git", ".github", ".next", "dist", "build", "out",
    "venv", ".venv", "__pycache__", ".pytest_cache", "sandbox", "target", "obj"
}

def rmtree_onerror(func, path, excinfo):
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass

def rewrite_repo_url(repo_url: str, token: str = None) -> str:
    """Adds token credential authentication to GitHub URL if provided."""
    if not token or token.startswith("mock_"):
        return repo_url
    # Match standard https://github.com/... pattern
    if repo_url.startswith("https://github.com/"):
        return repo_url.replace("https://github.com/", f"https://x-access-token:{token}@github.com/")
    return repo_url

def clone_and_checkout(repo_url: str, dest_dir: str, branch: str = None, pr_number: int = None, token: str = None):
    """Clones repository using optional access token, and checks out specified branch or PR."""
    auth_url = rewrite_repo_url(repo_url, token)
    try:
        # Standard clone command
        clone_cmd = ["git", "clone", "--depth", "1"]
        if branch and not pr_number:
            clone_cmd.extend(["-b", branch])
        clone_cmd.extend([auth_url, dest_dir])
        
        res = subprocess.run(clone_cmd, capture_output=True, text=True, shell=True)
        if res.returncode != 0:
            # Try cloning without branch first, then checkout branch
            clone_cmd_fallback = ["git", "clone", "--depth", "1", auth_url, dest_dir]
            res_fallback = subprocess.run(clone_cmd_fallback, capture_output=True, text=True, shell=True)
            if res_fallback.returncode != 0:
                raise Exception(res_fallback.stderr or "Failed to clone repository")
                
            if branch:
                checkout_cmd = ["git", "checkout", branch]
                subprocess.run(checkout_cmd, cwd=dest_dir, capture_output=True, shell=True)
        
        # If reviewing a PR, fetch the PR head and check it out
        if pr_number:
            fetch_cmd = ["git", "fetch", "origin", f"pull/{pr_number}/head:pr_branch"]
            subprocess.run(fetch_cmd, cwd=dest_dir, capture_output=True, shell=True)
            checkout_cmd = ["git", "checkout", "pr_branch"]
            subprocess.run(checkout_cmd, cwd=dest_dir, capture_output=True, shell=True)
            
    except Exception as e:
        raise Exception(f"Git clone operation failed: {str(e)}")

def scan_files(dir_path: str) -> List[Dict[str, Any]]:
    """Scans directory and returns metadata of all supported code files."""
    scanned = []
    for root, dirs, files in os.walk(dir_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            file_path = os.path.join(root, file)
            _, ext = os.path.splitext(file).lower()
            if ext in LANGUAGE_EXTENSIONS:
                try:
                    size_kb = os.path.getsize(file_path) / 1024
                    if size_kb > 500: # Skip very large files
                        continue
                    rel_path = os.path.relpath(file_path, dir_path)
                    scanned.append({
                        "absolute_path": file_path,
                        "relative_path": rel_path.replace("\\", "/"),
                        "language": LANGUAGE_EXTENSIONS[ext]
                    })
                except Exception:
                    pass
            if len(scanned) >= 50: # Cap at 50 files
                break
        if len(scanned) >= 50:
            break
    return scanned

def get_mock_workspace_files() -> List[Dict[str, Any]]:
    """
    Returns files in the local workspace directory to simulate clone-free scans in Mock Mode.
    Specifically scans backend/app/services/ and frontend/components/ Score/Review components.
    """
    files = []
    # Identify local folders to scan
    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # backend/app
    backend_root = os.path.dirname(app_dir) # backend
    workspace_root = os.path.dirname(backend_root) # revive-code
    
    # We will pick a few specific files to analyze
    target_paths = [
        ("backend/app/services/scoring_service.py", "python"),
        ("backend/app/services/severity_service.py", "python"),
        ("backend/app/services/weighting.py", "python"),
        ("frontend/components/ReviewCard.tsx", "typescript"),
        ("frontend/components/ScoreCard.tsx", "typescript")
    ]
    
    for rel, lang in target_paths:
        abs_path = os.path.join(workspace_root, rel)
        if os.path.exists(abs_path):
            files.append({
                "absolute_path": abs_path,
                "relative_path": rel,
                "language": lang
            })
            
    return files

def analyze_and_aggregate(files: List[Dict[str, Any]], repo_label: str) -> Dict[str, Any]:
    """Runs single-file analysis on files and aggregates repository-wide metrics."""
    all_issues = []
    scores = []
    embeddings = []
    file_contents = {}
    lang_file_counts = {}
    
    for file_info in files:
        rel_path = file_info["relative_path"]
        lang = file_info["language"]
        
        # Track languages
        lang_file_counts[lang] = lang_file_counts.get(lang, 0) + 1
        
        try:
            with open(file_info["absolute_path"], "r", encoding="utf-8", errors="ignore") as f:
                code_content = f.read()
            file_contents[rel_path] = code_content
            
            analysis = perform_raw_analysis(
                code=code_content,
                language=lang,
                file_path_on_disk=file_info["absolute_path"]
            )
            
            for issue in analysis["issues"]:
                issue["file"] = rel_path
                all_issues.append(issue)
                
            scores.append(analysis["score"])
            if "embedding" in analysis and analysis["embedding"]:
                embeddings.append(analysis["embedding"])
        except Exception as e:
            print(f"Failed to analyze file {rel_path}: {str(e)}")
            
    # Calculate overall weighted scores using standard scoring service
    scoring_result = scoring_service.calculate_scores(all_issues)
    overall_score = scoring_result["overallScore"]
    category_scores = scoring_result["categoryScores"]
    severity_counts = scoring_result["severityCounts"]
    updated_issues = scoring_result["issues"]
    
    # Sort issues
    updated_issues.sort(key=lambda x: (x.get("file", ""), x.get("line", 0)))
    
    # Calculate problematic files (group issues by file and sum severity weights)
    # Severity weights: Critical = 10, High = 5, Medium = 2, Low = 1
    severity_weights = {"critical": 10, "high": 5, "medium": 2, "low": 1, "info": 0}
    file_problem_scores = {}
    for issue in updated_issues:
        fpath = issue.get("file", "unknown")
        sev = issue.get("severity", "low").lower()
        weight = severity_weights.get(sev, 1)
        file_problem_scores[fpath] = file_problem_scores.get(fpath, 0) + weight
        
    problematic_files = sorted(
        [{"file": f, "score": s} for f, s in file_problem_scores.items()],
        key=lambda x: x["score"],
        reverse=True
    )[:5]
    
    # Calculate common issue types
    issue_type_counts = {}
    for issue in updated_issues:
        title = issue.get("title", "Linter Violation")
        issue_type_counts[title] = issue_type_counts.get(title, 0) + 1
        
    common_issue_types = sorted(
        [{"title": t, "count": c} for t, c in issue_type_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]
    
    # Calculate language breakdown percentages
    total_scanned_files = len(files)
    language_breakdown = {}
    if total_scanned_files > 0:
        for lang, count in lang_file_counts.items():
            language_breakdown[lang] = round((count / total_scanned_files) * 100, 1)
            
    # Generate aggregate CodeBERT embedding
    repo_embedding = [0.0] * 768
    if embeddings:
        for emb in embeddings:
            for i in range(768):
                repo_embedding[i] += emb[i]
        for i in range(768):
            repo_embedding[i] /= len(embeddings)
            
    # Generate high-level LLM-style repository review summary
    summary = f"This repository '{repo_label}' has an overall code quality score of {overall_score}/100. "
    if overall_score >= 85:
        summary += "The codebase is healthy, demonstrating strong adherence to security practices and maintainable modular standards. "
    elif overall_score >= 70:
        summary += "The codebase is in decent health, but features several modular code smells and complexity bottlenecks. "
    else:
        summary += "The codebase requires significant cleanup. We found multiple security vulnerabilities or highly complex logical nodes. "
        
    if problematic_files:
        summary += f"Issues are primarily concentrated in the following file: {problematic_files[0]['file']}. "
        
    if severity_counts.get("critical", 0) > 0 or severity_counts.get("high", 0) > 0:
        summary += f"Addressing the {severity_counts.get('critical', 0)} critical and {severity_counts.get('high', 0)} high severity issue(s) is highly recommended to improve security and robustness."
    else:
        summary += "Refactoring high cyclomatic complexity zones and formatting stylistic errors will improve standard readability."
        
    return {
        "overallScore": overall_score,
        "categoryScores": category_scores,
        "severityCounts": severity_counts,
        "summary": summary,
        "issues": updated_issues,
        "embedding": repo_embedding,
        "files_content": file_contents,
        "problematic_files": problematic_files,
        "common_issue_types": common_issue_types,
        "language_breakdown": language_breakdown
    }

def save_repository_review(review_id: str, user_id: int, label: str, language: str, results: Dict[str, Any]) -> str:
    """Saves aggregate repository review and file code contents to database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Insert review details
        cursor.execute(
            """
            INSERT INTO reviews (id, user_id, code, language, score, issues, embedding, surprise_scores, category_scores, summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                review_id,
                user_id,
                label,
                language,
                results["overallScore"],
                json.dumps(results["issues"]),
                json.dumps(results["embedding"]),
                json.dumps([]), # surprise scores not stored at repository aggregate level
                json.dumps(results["categoryScores"]),
                results["summary"]
            )
        )
        
        # 2. Insert repository source files content
        for rel_path, content in results["files_content"].items():
            cursor.execute(
                """
                INSERT INTO review_files (review_id, file_path, code_content)
                VALUES (?, ?, ?);
                """,
                (review_id, rel_path, content)
            )
            
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
    return review_id

def review_repository(repo_url: str, branch: str, user_id: int = None, token: str = None) -> Dict[str, Any]:
    """Clones, scans, reviews and persists a GitHub repository."""
    review_id = str(uuid.uuid4())
    label = f"GitHub Repository: {repo_url}\nBranch: {branch}"
    
    # Check if in Mock Mode
    if not token or token.startswith("mock_"):
        files = get_mock_workspace_files()
        results = analyze_and_aggregate(files, repo_url.split("/")[-1])
        # Add metadata fields
        results["id"] = review_id
        results["label"] = label
        results["branch"] = branch
        results["commit"] = "mock_commit_hash_123456"
        results["files_count"] = len(files)
        save_repository_review(review_id, user_id, label, "multiple", results)
        return results
        
    session_id = f"repo_{uuid.uuid4().hex}"
    temp_checkout_dir = os.path.join(SANDBOX_DIR, session_id)
    
    try:
        clone_and_checkout(repo_url, temp_checkout_dir, branch=branch, token=token)
        
        # Get head commit hash
        commit_hash = "unknown"
        try:
            commit_res = subprocess.run(["git", "rev-parse", "HEAD"], cwd=temp_checkout_dir, capture_output=True, text=True, shell=True)
            if commit_res.returncode == 0:
                commit_hash = commit_res.stdout.strip()
        except Exception:
            pass
            
        files = scan_files(temp_checkout_dir)
        if not files:
            raise Exception("No supported code files found in the repository")
            
        results = analyze_and_aggregate(files, repo_url.split("/")[-1])
        results["id"] = review_id
        results["label"] = label
        results["branch"] = branch
        results["commit"] = commit_hash
        results["files_count"] = len(files)
        
        save_repository_review(review_id, user_id, label, "multiple", results)
        return results
    finally:
        if os.path.exists(temp_checkout_dir):
            try:
                shutil.rmtree(temp_checkout_dir, onerror=rmtree_onerror)
            except Exception:
                pass

def review_pull_request(repo_url: str, pr_number: int, user_id: int = None, token: str = None) -> Dict[str, Any]:
    """Clones a repository, checks out PR, parses modified file lists, reviews only modified files, and persists."""
    review_id = str(uuid.uuid4())
    label = f"GitHub Pull Request: {repo_url} (PR #{pr_number})"
    
    if not token or token.startswith("mock_"):
        # Simulated PR files
        from app.services import github_service
        pr_files = github_service.get_pr_changed_files(token, "", "", pr_number)
        
        # Map filenames to mock project workspace files
        mock_files = get_mock_workspace_files()
        files = []
        for pr_f in pr_files:
            # Find a matching mock workspace file by name / similarity
            match = next((f for f in mock_files if pr_f["filename"].split("/")[-1] in f["absolute_path"]), None)
            if match:
                files.append(match)
                
        if not files:
            # Fallback to general workspace mock files if no exact name matches
            files = mock_files[:1]
            
        results = analyze_and_aggregate(files, f"PR #{pr_number}")
        results["id"] = review_id
        results["label"] = label
        results["pr_number"] = pr_number
        results["commit"] = f"mock_pr_commit_{pr_number}"
        results["files_count"] = len(files)
        save_repository_review(review_id, user_id, label, "multiple", results)
        return results
        
    session_id = f"pr_{uuid.uuid4().hex}"
    temp_checkout_dir = os.path.join(SANDBOX_DIR, session_id)
    
    try:
        # Clone repo and checkout PR
        clone_and_checkout(repo_url, temp_checkout_dir, pr_number=pr_number, token=token)
        
        commit_hash = "unknown"
        try:
            commit_res = subprocess.run(["git", "rev-parse", "HEAD"], cwd=temp_checkout_dir, capture_output=True, text=True, shell=True)
            if commit_res.returncode == 0:
                commit_hash = commit_res.stdout.strip()
        except Exception:
            pass
            
        # Call GitHub API to find list of changed files
        parts = repo_url.rstrip("/").split("/")
        owner, repo = parts[-2], parts[-1]
        if repo.endswith(".git"):
            repo = repo[:-4]
            
        from app.services import github_service
        changed_file_metadata = github_service.get_pr_changed_files(token, owner, repo, pr_number)
        changed_filenames = {f["filename"] for f in changed_file_metadata}
        
        # Scan files on disk but filter to changed file list
        all_disk_files = scan_files(temp_checkout_dir)
        files = [f for f in all_disk_files if f["relative_path"] in changed_filenames]
        
        # Fallback to all files if no overlap found
        if not files:
            files = all_disk_files[:5]
            
        results = analyze_and_aggregate(files, f"PR #{pr_number}")
        results["id"] = review_id
        results["label"] = label
        results["pr_number"] = pr_number
        results["commit"] = commit_hash
        results["files_count"] = len(files)
        
        save_repository_review(review_id, user_id, label, "multiple", results)
        return results
    finally:
        if os.path.exists(temp_checkout_dir):
            try:
                shutil.rmtree(temp_checkout_dir, onerror=rmtree_onerror)
            except Exception:
                pass
