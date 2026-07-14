import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db_connection

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    """
    Cleans up users and reviews tables before and after each test.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM review_files;")
    cursor.execute("DELETE FROM reviews;")
    cursor.execute("DELETE FROM users;")
    conn.commit()
    conn.close()
    yield
    # Clean up again after test
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM review_files;")
    cursor.execute("DELETE FROM reviews;")
    cursor.execute("DELETE FROM users;")
    conn.commit()
    conn.close()

def get_auth_headers():
    user_data = {"email": "tester@example.com", "password": "password123"}
    client.post("/api/v1/auth/signup", json=user_data)
    login_res = client.post("/api/v1/auth/login", json=user_data)
    token = login_res.json()["token"]
    return {"Authorization": f"Bearer {token}"}

def test_github_connect():
    headers = get_auth_headers()
    
    # 1. Connect GitHub account (Mock)
    connect_payload = {"code": "mock_test_code"}
    res = client.post("/api/v1/github/connect", json=connect_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["github_username"] == "mock_developer"
    
    # 2. Get user repositories
    repos_res = client.get("/api/v1/github/repositories", headers=headers)
    assert repos_res.status_code == 200
    repos_data = repos_res.json()
    assert "repositories" in repos_data
    assert len(repos_data["repositories"]) > 0
    assert repos_data["repositories"][0]["name"] == "revive-code"

def test_github_repo_details():
    headers = get_auth_headers()
    # Connect first
    client.post("/api/v1/github/connect", json={"code": "mock_test_code"}, headers=headers)
    
    # Get repo details
    res = client.get("/api/v1/github/repositories/mock_developer/revive-code", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "revive-code"
    assert "branches" in data
    assert "default_branch" in data
    assert "master" in data["branches"]

def test_github_repo_and_pr_review():
    headers = get_auth_headers()
    # Connect
    client.post("/api/v1/github/connect", json={"code": "mock_test_code"}, headers=headers)
    
    # 1. Test repository review
    review_payload = {
        "repository_url": "https://github.com/mock_developer/revive-code",
        "branch": "master"
    }
    res = client.post("/api/v1/github/review", json=review_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "overallScore" in data
    assert "issues" in data
    assert "files_content" in data
    assert len(data["files_content"]) > 0
    review_id = data["id"]
    
    # Check that file content was saved to DB and retrieves successfully
    detail_res = client.get(f"/api/v1/review/{review_id}", headers=headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert "files_content" in detail_data
    assert len(detail_data["files_content"]) > 0
    
    # 2. Test PR review
    pr_payload = {
        "repository_url": "https://github.com/mock_developer/revive-code",
        "pr_number": 12
    }
    res_pr = client.post("/api/v1/github/pull-request/review", json=pr_payload, headers=headers)
    assert res_pr.status_code == 200
    data_pr = res_pr.json()
    assert "overallScore" in data_pr
    assert "issues" in data_pr
    assert data_pr["pr_number"] == 12

def test_github_history():
    headers = get_auth_headers()
    client.post("/api/v1/github/connect", json={"code": "mock_test_code"}, headers=headers)
    
    # Run a repo review to populate history
    review_payload = {
        "repository_url": "https://github.com/mock_developer/revive-code",
        "branch": "master"
    }
    client.post("/api/v1/github/review", json=review_payload, headers=headers)
    
    # Check github history endpoint
    res = client.get("/api/v1/github/history", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "history" in data
    assert len(data["history"]) == 1
    assert "revive-code" in data["history"][0]["code"]


def test_github_url_validation():
    from app.services.repository_review import validate_github_url
    
    # Valid URLs
    validate_github_url("https://github.com/owner/repo")
    validate_github_url("https://github.com/owner/repo.git")
    validate_github_url("https://github.com/owner/repo/")
    validate_github_url("https://github.com/owner-name/repo.name")
    
    # Invalid URLs
    with pytest.raises(ValueError, match="Invalid GitHub repository URL"):
        validate_github_url("https://github.com/owner")  # missing repo
    with pytest.raises(ValueError, match="Invalid GitHub repository URL"):
        validate_github_url("http://github.com/owner/repo")  # HTTP not allowed
    with pytest.raises(ValueError, match="Invalid GitHub repository URL"):
        validate_github_url("--upload-pack=blah")  # option injection
    with pytest.raises(ValueError, match="Invalid GitHub repository URL"):
        validate_github_url("https://github.com/owner/repo/subfolder")  # subfolder not allowed
    with pytest.raises(ValueError, match="Invalid GitHub repository URL"):
        validate_github_url("https://malicious.com/owner/repo")  # wrong host


def test_token_encryption_and_legacy_fallback():
    from app.services.encryption import encrypt_token, decrypt_token, SECRET_KEY
    import base64
    
    token = "ghp_1234567890abcdef"
    
    # 1. Test normal encrypt and decrypt (Fernet)
    encrypted = encrypt_token(token)
    assert encrypted != token
    assert decrypt_token(encrypted) == token
    
    # 2. Test legacy XOR decryption fallback
    # Manually encrypt using legacy XOR cipher
    key_bytes = SECRET_KEY.encode('utf-8')
    token_bytes = token.encode('utf-8')
    legacy_encrypted = bytearray(len(token_bytes))
    for i in range(len(token_bytes)):
        legacy_encrypted[i] = token_bytes[i] ^ key_bytes[i % len(key_bytes)]
    legacy_b64 = base64.b64encode(legacy_encrypted).decode('utf-8')
    
    # Decrypt should fallback and work
    assert decrypt_token(legacy_b64) == token


def test_api_github_review_invalid_url():
    headers = get_auth_headers()
    # Connect account first
    client.post("/api/v1/github/connect", json={"code": "mock_test_code"}, headers=headers)
    
    # Request with invalid URL
    review_payload = {
        "repository_url": "https://malicious-domain.com/owner/repo",
        "branch": "master"
    }
    # Hits `/api/v1/github/review`
    res = client.post("/api/v1/github/review", json=review_payload, headers=headers)
    assert res.status_code == 500
    assert "Invalid GitHub repository URL" in res.json()["detail"]
    
    # Hits `/api/v1/github/repository` (anonymous / optional user)
    res_anon = client.post("/api/v1/github/repository", json=review_payload, headers=headers)
    assert res_anon.status_code == 400
    assert "Invalid GitHub repository URL" in res_anon.json()["detail"]

