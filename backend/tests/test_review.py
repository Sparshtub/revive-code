import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_review_empty_code():
    response = client.post("/api/v1/review", json={"code": "", "language": "python"})
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]

def test_review_python_code():
    code_content = """def calculate(x):
    # TODO: implement division
    unused_var = 50
    eval("print(x)")
    return x
"""
    response = client.post("/api/v1/review", json={"code": code_content, "language": "python"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "score" in data
    assert "issues" in data
    
    issues = data["issues"]
    # Check that Ruff detected the unused variable
    assert any("unused_var" in issue["description"] or "unused" in issue["description"].lower() for issue in issues)
    # Check that Bandit detected eval
    assert any("eval" in issue["title"].lower() or "eval" in issue["description"].lower() for issue in issues)
    # Check that Regex detected TODO
    assert any("todo" in issue["title"].lower() for issue in issues)

def test_review_javascript_code():
    code_content = """function process(data) {
    eval(data);
    document.write("done");
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            console.log(i, j);
        }
    }
}"""
    response = client.post("/api/v1/review", json={"code": code_content, "language": "javascript"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    issues = data["issues"]
    
    # Check AST detection of eval
    assert any("eval" in issue["title"].lower() for issue in issues)
    # Check AST detection of document.write
    assert any("document.write" in issue["title"].lower() for issue in issues)
    # Check AST detection of nested loops
    assert any("nested loop" in issue["title"].lower() for issue in issues)
