from typing import List, Dict, Any
from app.services.weighting import get_category_weights, get_severity_deductions
from app.services.severity_service import get_standard_severity, classify_category

def calculate_scores(issues: List[Dict[str, Any]], radon_mi: float = 100.0) -> Dict[str, Any]:
    """
    Calculates individual category scores and the overall score for a list of issues.
    
    Arguments:
        issues: List of issue dictionaries.
        radon_mi: Radon maintainability index (if applicable, defaults to 100.0).
        
    Returns:
        A dictionary containing:
            - overallScore: The weighted overall score (0-100).
            - categoryScores: A dictionary mapping each category to its score (0-100).
            - severityCounts: A dictionary containing counts of issues grouped by severity level.
            - issues: The list of issues, updated with their standard category and severity fields.
    """
    weights = get_category_weights()
    deductions = get_severity_deductions()
    
    # Initialize category scores and issue containers
    category_scores = {cat: 100.0 for cat in weights.keys()}
    
    # Ensure Radon MI forms the base score of maintainability if available
    # Radon MI normally goes up to 100. Let's bound it between 0 and 100.
    clamped_mi = max(0.0, min(100.0, float(radon_mi)))
    category_scores["maintainability"] = clamped_mi
    
    severity_counts = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "info": 0
    }
    
    updated_issues = []
    
    for issue in issues:
        # Standardize severity
        raw_sev = issue.get("severity", "Low")
        std_sev = get_standard_severity(raw_sev)
        
        # Standardize category
        category = classify_category(issue)
        
        # Update issue fields in place or create a copy
        updated_issue = dict(issue)
        updated_issue["severity"] = std_sev
        updated_issue["category"] = category
        updated_issues.append(updated_issue)
        
        # Increment severity counts
        severity_counts[std_sev.lower()] += 1
        
        # Subtract deduction penalty from the respective category score
        penalty = deductions.get(std_sev, 0)
        category_scores[category] -= penalty
        
    # Clamp category scores between 0 and 100, rounding them
    rounded_category_scores = {}
    for cat, score in category_scores.items():
        rounded_category_scores[cat] = int(max(0, min(100, round(score))))
        
    # Calculate overall weighted average score
    overall_weighted_score = 0.0
    for cat, weight in weights.items():
        overall_weighted_score += rounded_category_scores[cat] * weight
        
    overall_score = int(max(0, min(100, round(overall_weighted_score))))
    
    return {
        "overallScore": overall_score,
        "categoryScores": rounded_category_scores,
        "severityCounts": severity_counts,
        "issues": updated_issues
    }
