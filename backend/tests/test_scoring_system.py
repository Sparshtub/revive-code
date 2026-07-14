import pytest
from app.services.severity_service import get_standard_severity, classify_category
from app.services.scoring_service import calculate_scores
from app.services.summary_service import generate_summary
from app.services.weighting import get_category_weights, get_severity_deductions

def test_get_standard_severity():
    assert get_standard_severity("critical") == "Critical"
    assert get_standard_severity("HIGH") == "High"
    assert get_standard_severity("Medium  ") == "Medium"
    assert get_standard_severity("low") == "Low"
    assert get_standard_severity("info") == "Info"
    assert get_standard_severity("unknown") == "Low"
    assert get_standard_severity("") == "Low"
    assert get_standard_severity(None) == "Low"

def test_classify_category():
    # Security
    assert classify_category({"title": "Unsafe usage of eval()", "description": "some description"}) == "security"
    assert classify_category({"title": "Potential API Key exposure", "description": "password = '123'"}) == "security"
    
    # Performance
    assert classify_category({"title": "nested loops", "description": "O(N^2) complexity"}) == "performance"
    assert classify_category({"title": "some title", "description": "complexity is too high inside the loop logic"}) == "performance"
    
    # Maintainability
    assert classify_category({"title": "Large function detected", "description": "function length spans 150 lines"}) == "maintainability"
    assert classify_category({"title": "Radon CC warning", "description": "cyclomatic complexity score"}) == "maintainability"
    
    # Documentation
    assert classify_category({"title": "TODO item", "description": "complete comments"}) == "documentation"
    assert classify_category({"title": "missing docstring", "description": "add documentation"}) == "documentation"
    
    # Readability
    assert classify_category({"title": "Ruff formatting issue", "description": "extra whitespace"}) == "readability"
    
    # Best Practices (fallback)
    assert classify_category({"title": "Some raw error", "description": "avoid prints"}) == "bestPractices"

def test_calculate_scores_clean():
    res = calculate_scores([])
    assert res["overallScore"] == 100
    assert all(score == 100 for score in res["categoryScores"].values())
    assert all(count == 0 for count in res["severityCounts"].values())

def test_calculate_scores_deductions():
    issues = [
        {"title": "Unsafe eval", "description": "security bug", "severity": "critical"},
        {"title": "Large function", "description": "refactor code", "severity": "medium"},
        {"title": "TODO reminder", "description": "doc comment", "severity": "low"}
    ]
    
    res = calculate_scores(issues)
    
    # Verify categories
    # Security category: 100 - 15 (Critical) = 85
    # Maintainability category: 100 - 4 (Medium) = 96
    # Documentation category: 100 - 2 (Low) = 98
    # Others: 100
    assert res["categoryScores"]["security"] == 85
    assert res["categoryScores"]["maintainability"] == 96
    assert res["categoryScores"]["documentation"] == 98
    assert res["categoryScores"]["readability"] == 100
    assert res["categoryScores"]["performance"] == 100
    assert res["categoryScores"]["bestPractices"] == 100
    
    # Verify overall weighted score calculation:
    # weights: readability (0.2), maintainability (0.2), security (0.25), performance (0.15), documentation (0.10), bestPractices (0.10)
    # expected overall = (100 * 0.2) + (96 * 0.2) + (85 * 0.25) + (100 * 0.15) + (98 * 0.10) + (100 * 0.10)
    # = 20.0 + 19.2 + 21.25 + 15.0 + 9.8 + 10.0 = 95.25 -> rounded to 95
    assert res["overallScore"] == 95
    
    # Verify severity counts
    assert res["severityCounts"]["critical"] == 1
    assert res["severityCounts"]["medium"] == 1
    assert res["severityCounts"]["low"] == 1

def test_calculate_scores_clamping():
    # Subtracting enough to drop scores below 0
    issues = [{"title": "eval", "description": "security violation", "severity": "critical"} for _ in range(10)]
    res = calculate_scores(issues)
    assert res["categoryScores"]["security"] == 0
    
    # Test overall clamping
    assert res["overallScore"] >= 0

def test_generate_summary():
    category_scores = {
        "readability": 90,
        "maintainability": 65,
        "security": 100,
        "performance": 100,
        "documentation": 80,
        "bestPractices": 95
    }
    
    issues = [
        {"title": "Large function", "description": "refactor code", "severity": "Medium", "category": "maintainability"}
    ]
    
    summary = generate_summary(86, category_scores, issues)
    
    assert "maintainability" in summary.lower()
    assert "security" in summary.lower()
    assert "performance" in summary.lower()
