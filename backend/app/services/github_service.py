import os
import httpx
from typing import List, Dict, Any

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")

def is_mock_token(token: str) -> bool:
    return not token or token.startswith("mock_")

def exchange_code_for_token(code: str) -> str:
    """
    Exchanges OAuth code for access token.
    Falls back to mock token if client secrets are missing or code is mock.
    """
    if code.startswith("mock_") or not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        return f"mock_token_{code}"
        
    url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    payload = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code
    }
    
    with httpx.Client() as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                return data["access_token"]
            raise Exception(data.get("error_description", "Failed to retrieve access token"))
        raise Exception(f"GitHub OAuth error: {response.text}")

def get_user_profile(token: str) -> Dict[str, Any]:
    """
    Retrieves connected GitHub user's profile details.
    """
    if is_mock_token(token):
        return {
            "login": "mock_developer",
            "name": "Mock Developer",
            "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4",
            "html_url": "https://github.com/mock_developer"
        }
        
    url = "https://api.github.com/user"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    with httpx.Client() as client:
        response = client.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        raise Exception(f"Failed to fetch profile: {response.text}")

def get_user_repositories(token: str) -> List[Dict[str, Any]]:
    """
    Lists repositories accessible to the user.
    """
    if is_mock_token(token):
        return [
            {
                "name": "revive-code",
                "full_name": "mock_developer/revive-code",
                "description": "AI-powered static code reviewer and ML dashboard",
                "default_branch": "master",
                "html_url": "https://github.com/mock_developer/revive-code",
                "language": "TypeScript"
            },
            {
                "name": "fastapi-backend",
                "full_name": "mock_developer/fastapi-backend",
                "description": "FastAPI production boilerplate with SQLite and migrations",
                "default_branch": "main",
                "html_url": "https://github.com/mock_developer/fastapi-backend",
                "language": "Python"
            },
            {
                "name": "awesome-frontend",
                "full_name": "mock_developer/awesome-frontend",
                "description": "Vibrant and aesthetic dashboard frontend",
                "default_branch": "main",
                "html_url": "https://github.com/mock_developer/awesome-frontend",
                "language": "TypeScript"
            }
        ]
        
    url = "https://api.github.com/user/repos"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    params = {"per_page": 100, "sort": "updated"}
    
    with httpx.Client() as client:
        response = client.get(url, headers=headers, params=params)
        if response.status_code == 200:
            repos = response.json()
            return [
                {
                    "name": r["name"],
                    "full_name": r["full_name"],
                    "description": r.get("description", ""),
                    "default_branch": r.get("default_branch", "main"),
                    "html_url": r["html_url"],
                    "language": r.get("language", "Multiple")
                }
                for r in repos
            ]
        raise Exception(f"Failed to fetch repositories: {response.text}")

def get_repository_branches(token: str, owner: str, repo: str) -> List[str]:
    """
    List branches of a repository.
    """
    if is_mock_token(token):
        return ["master", "main", "develop", "feature/auth", "feature/ast-perf"]
        
    url = f"https://api.github.com/repos/{owner}/{repo}/branches"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    with httpx.Client() as client:
        response = client.get(url, headers=headers)
        if response.status_code == 200:
            return [b["name"] for b in response.json()]
        raise Exception(f"Failed to fetch branches: {response.text}")

def get_pull_requests(token: str, owner: str, repo: str) -> List[Dict[str, Any]]:
    """
    List pull requests for a repository.
    """
    if is_mock_token(token):
        return [
            {
                "number": 12,
                "title": "feat: Add authentication and session tokens",
                "user": {"login": "mock_developer", "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4"},
                "state": "open",
                "created_at": "2026-07-14T10:00:00Z",
                "base": {"ref": "master"},
                "head": {"ref": "feature/auth"}
            },
            {
                "number": 13,
                "title": "refactor: Optimize AST traversal complexity",
                "user": {"login": "mock_developer", "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4"},
                "state": "open",
                "created_at": "2026-07-14T12:30:00Z",
                "base": {"ref": "master"},
                "head": {"ref": "feature/ast-perf"}
            }
        ]
        
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    params = {"state": "open"}
    
    with httpx.Client() as client:
        response = client.get(url, headers=headers, params=params)
        if response.status_code == 200:
            pulls = response.json()
            return [
                {
                    "number": p["number"],
                    "title": p["title"],
                    "user": {
                        "login": p["user"]["login"],
                        "avatar_url": p["user"].get("avatar_url", "")
                    },
                    "state": p["state"],
                    "created_at": p["created_at"],
                    "base": {"ref": p["base"]["ref"]},
                    "head": {"ref": p["head"]["ref"]}
                }
                for p in pulls
            ]
        raise Exception(f"Failed to fetch pulls: {response.text}")

def get_pr_changed_files(token: str, owner: str, repo: str, pr_number: int) -> List[Dict[str, Any]]:
    """
    List files modified in a pull request.
    """
    if is_mock_token(token):
        if pr_number == 12:
            return [
                {"filename": "backend/app/api/auth.py", "status": "modified"},
                {"filename": "frontend/components/AuthModal.tsx", "status": "modified"}
            ]
        elif pr_number == 13:
            return [
                {"filename": "backend/app/api/review.py", "status": "modified"}
            ]
        return [
            {"filename": "README.md", "status": "modified"}
        ]
        
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/files"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    with httpx.Client() as client:
        response = client.get(url, headers=headers)
        if response.status_code == 200:
            files = response.json()
            return [
                {
                    "filename": f["filename"],
                    "status": f["status"]
                }
                for f in files
            ]
        raise Exception(f"Failed to fetch PR files: {response.text}")
