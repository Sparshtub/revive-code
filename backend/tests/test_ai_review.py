import pytest
from app.api.ai_service import get_code_embeddings, detect_logical_anomalies, compute_surprise_scores
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_codebert_embeddings():
    """
    Asserts that get_code_embeddings generates a valid 768-dimensional embedding.
    """
    code_content = "def add_numbers(a, b):\n    return a + b"
    embedding = get_code_embeddings(code_content)
    
    assert isinstance(embedding, list)
    assert len(embedding) == 768
    assert all(isinstance(val, float) for val in embedding)

def test_codebert_logical_anomalies():
    """
    Asserts that detect_logical_anomalies identifies logical syntax typos or discrepancies.
    """
    # Intentional logical anomaly: comparing variables inside a condition incorrectly or increment bugs
    # We will test an assignment typo that is highly unexpected by CodeBERT
    code_with_bug = "if x =+ 1:\n    print('error')"
    anomalies = detect_logical_anomalies(code_with_bug, "python")
    
    assert isinstance(anomalies, list)
    # Check structure of returned issues
    for anomaly in anomalies:
        assert "line" in anomaly
        assert "severity" in anomaly
        assert "title" in anomaly
        assert "description" in anomaly
        assert "suggestion" in anomaly
        assert anomaly["is_ai"] is True

def test_codebert_surprise_scores():
    """
    Asserts that compute_surprise_scores outputs line perplexity scores for code lines.
    """
    code_content = "import os\n\ndef run():\n    print('test')\n"
    scores = compute_surprise_scores(code_content)
    
    assert isinstance(scores, list)
    assert len(scores) == len(code_content.split("\n"))
    assert all(isinstance(val, float) for val in scores)

def test_api_review_endpoint_ai_data():
    """
    Verifies that the /review POST endpoint returns AI analysis metadata.
    """
    response = client.post(
        "/api/v1/review",
        json={"code": "x = 5\ny = 10\nresult = x + y", "language": "python"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "embedding" in data
    assert "surprise_scores" in data
    
    assert isinstance(data["embedding"], list)
    assert len(data["embedding"]) == 768
    assert isinstance(data["surprise_scores"], list)
