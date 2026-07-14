from typing import List, Dict, Any

def generate_summary(overall_score: int, category_scores: Dict[str, int], issues: List[Dict[str, Any]]) -> str:
    """
    Generates a professional, detailed, and context-aware review summary of the code.
    
    Arguments:
        overall_score: Combined overall quality score (0-100).
        category_scores: Individual category scores (0-100).
        issues: List of issues found in the code.
        
    Returns:
        A concise summary string.
    """
    if not issues:
        return "Excellent! The code is fully clean, well-documented, and adheres to security and maintainability best practices. No issues were detected."
        
    # Analyze issue counts by severity
    critical_count = sum(1 for issue in issues if issue.get("severity") == "Critical")
    high_count = sum(1 for issue in issues if issue.get("severity") == "High")
    medium_count = sum(1 for issue in issues if issue.get("severity") == "Medium")
    low_count = sum(1 for issue in issues if issue.get("severity") == "Low")
    
    # Identify strongest and weakest categories
    strong_categories = [cat.replace("bestPractices", "best practices") for cat, score in category_scores.items() if score >= 85]
    weak_categories = [cat.replace("bestPractices", "best practices") for cat, score in category_scores.items() if score < 70]
    
    # Check for specific issue types
    has_credentials = any("credentials" in issue.get("title", "").lower() or "api_key" in issue.get("title", "").lower() for issue in issues)
    has_unsafe_functions = any(issue.get("title", "").lower() in ["unsafe usage of eval()", "unsafe gets() function", "unsafe strcpy() function"] for issue in issues)
    has_complexity = any("complexity" in issue.get("title", "").lower() or "nested loops" in issue.get("title", "").lower() for issue in issues)
    has_ai_anomalies = any(issue.get("is_ai") is True for issue in issues)
    
    # Build parts of the summary
    summary_parts = []
    
    # Part 1: General Code Health assessment
    if overall_score >= 85:
        summary_parts.append("The code is generally well-structured and displays high-quality coding practices.")
    elif overall_score >= 70:
        summary_parts.append("The code is functional and moderately structured, but it exhibits standard quality concerns that should be addressed.")
    else:
        summary_parts.append("The code has critical structural, security, or maintainability issues and requires immediate refactoring.")
        
    # Part 2: Strong categories
    if strong_categories:
        if len(strong_categories) == 1:
            summary_parts.append(f"It performs exceptionally well in the {strong_categories[0]} category.")
        else:
            summary_parts.append(f"Strong performance is observed in {', '.join(strong_categories[:-1])} and {strong_categories[-1]}.")
            
    # Part 3: Weak categories or issues highlight
    if weak_categories:
        if len(weak_categories) == 1:
            summary_parts.append(f"However, scores are low in {weak_categories[0]}.")
        else:
            summary_parts.append(f"Significant improvements are needed in {', '.join(weak_categories[:-1])} and {weak_categories[-1]}.")
            
    # Part 4: Specific issues callout
    specific_issues = []
    if critical_count > 0:
        specific_issues.append(f"{critical_count} critical safety violations")
    if high_count > 0:
        specific_issues.append(f"{high_count} high-severity issues")
    if has_credentials:
        specific_issues.append("potential hardcoded API credentials")
    if has_unsafe_functions:
        specific_issues.append("unsafe or vulnerable function calls (like eval/gets/strcpy)")
    if has_complexity:
        specific_issues.append("excessive cyclomatic complexity and nested loops")
    if has_ai_anomalies:
        specific_issues.append("logical discrepancies flagged by CodeBERT AI checks")
        
    if specific_issues:
        if len(specific_issues) == 1:
            summary_parts.append(f"We detected {specific_issues[0]}.")
        else:
            summary_parts.append(f"We detected {', '.join(specific_issues[:-1])}, and {specific_issues[-1]}.")
            
    # Part 5: Actionable recommendation
    if critical_count > 0 or has_credentials:
        summary_parts.append("Immediate remediation of security exposures is highly recommended before deploying this code.")
    elif weak_categories or high_count > 0:
        summary_parts.append("Refactoring the flagged sections and adding validation checks will improve maintainability and reliability.")
    else:
        summary_parts.append("Minor tweaks to code formatting and cleanup of outstanding TODO items will prepare this for production.")
        
    return " ".join(summary_parts)
