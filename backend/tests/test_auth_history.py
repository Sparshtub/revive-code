import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db_connection
# changes are needed 
client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    """
    Cleans up the database users and reviews tables before and after each test.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reviews;")
    cursor.execute("DELETE FROM users;")
    conn.commit()
    conn.close()
    yield
    # Clean up again after test
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reviews;")
    cursor.execute("DELETE FROM users;")
    conn.commit()
    conn.close()

def test_user_signup_and_login():
    # 1. Successful Signup
    signup_data = {"email": "test@example.com", "password": "supersecretpassword1"}
    response = client.post("/api/v1/auth/signup", json=signup_data)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["email"] == "test@example.com"

    # 2. Signup Validation: Password too short
    short_pw_data = {"email": "test2@example.com", "password": "123"}
    response = client.post("/api/v1/auth/signup", json=short_pw_data)
    assert response.status_code == 400
    assert "Password must be at least 8 characters" in response.json()["detail"]

    # 3. Signup Validation: Duplicate Email
    response = client.post("/api/v1/auth/signup", json=signup_data)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

    # 4. Successful Login
    login_response = client.post("/api/v1/auth/login", json=signup_data)
    assert login_response.status_code == 200
    assert login_response.json()["status"] == "success"
    assert "token" in login_response.json()
    token = login_response.json()["token"]

    # 5. Failed Login: Incorrect Password
    wrong_pw_data = {"email": "test@example.com", "password": "wrongpassword1"}
    response = client.post("/api/v1/auth/login", json=wrong_pw_data)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_authenticated_review_history_and_cleanup():
    # 1. Signup and Login to get token
    user_data = {"email": "user@example.com", "password": "password123"}
    client.post("/api/v1/auth/signup", json=user_data)
    login_res = client.post("/api/v1/auth/login", json=user_data)
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Review code as guest (no auth header) - should NOT save to history
    code_content = "def test():\n    pass"
    guest_res = client.post("/api/v1/review", json={"code": code_content, "language": "python"})
    assert guest_res.status_code == 200
    guest_id = guest_res.json()["id"]

    # 3. Check history: Should be empty for this user
    history_res = client.get("/api/v1/history", headers=headers)
    assert history_res.status_code == 200
    assert len(history_res.json()["history"]) == 0

    # 4. Review code as authenticated user
    auth_res = client.post("/api/v1/review", json={"code": code_content, "language": "python"}, headers=headers)
    assert auth_res.status_code == 200
    review_id = auth_res.json()["id"]
    assert review_id != guest_id

    # 5. Check history: Should now contain 1 item
    history_res = client.get("/api/v1/history", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()["history"]
    assert len(history) == 1
    assert history[0]["id"] == review_id
    assert history[0]["language"] == "python"

    # 6. Retrieve detailed review report by ID
    detail_res = client.get(f"/api/v1/review/{review_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["code"] == code_content
    assert detail_res.json()["score"] == auth_res.json()["score"]

    # 7. Access Control: Request review with different token/no token
    no_auth_detail_res = client.get(f"/api/v1/review/{review_id}")
    assert no_auth_detail_res.status_code == 401

    # Create another user and try to steal review
    other_user = {"email": "other@example.com", "password": "password123"}
    client.post("/api/v1/auth/signup", json=other_user)
    other_login = client.post("/api/v1/auth/login", json=other_user)
    other_headers = {"Authorization": f"Bearer {other_login.json()['token']}"}

    stolen_res = client.get(f"/api/v1/review/{review_id}", headers=other_headers)
    assert stolen_res.status_code == 403

    # 8. Delete the review report
    delete_res = client.delete(f"/api/v1/review/{review_id}", headers=headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["status"] == "success"

    # 9. Verify history is empty again
    history_res = client.get("/api/v1/history", headers=headers)
    assert len(history_res.json()["history"]) == 0

    # 10. Verify GET review returns 404 now
    detail_res = client.get(f"/api/v1/review/{review_id}", headers=headers)
    assert detail_res.status_code == 404
