from typing import Dict, Any

# Mapping of raw severities to standard forms
SEVERITY_MAP = {
    "critical": "Critical",
    "high": "High",
    "medium": "Medium",
    "low": "Low",
    "info": "Info"
}

def get_standard_severity(raw_severity: str) -> str:
    """
    Standardizes a raw severity string into one of: Critical, High, Medium, Low, Info.
    Defaults to 'Low' if unmatched.
    """
    if not raw_severity:
        return "Low"
    
    normalized = raw_severity.strip().lower()
    return SEVERITY_MAP.get(normalized, "Low")

def classify_category(issue: Dict[str, Any]) -> str:
    """
    Classifies an issue into one of the 6 standard categories:
    - readability
    - maintainability
    - security
    - performance
    - documentation
    - bestPractices
    """
    title = issue.get("title", "").lower()
    description = issue.get("description", "").lower()
    suggestion = issue.get("suggestion", "")
    suggestion_str = suggestion.lower() if suggestion else ""
    
    # Combined text for keyword scanning
    combined_text = f"{title} {description} {suggestion_str}"
    
    # 1. Security Check
    security_keywords = [
        "security", "vulnerab", "unsafe", "eval", "gets", "strcpy",
        "password", "secret", "token", "credential", "key", "bandit",
        "injection", "buffer overflow", "xss", "document.write"
    ]
    if any(keyword in combined_text for keyword in security_keywords):
        return "security"
        
    # 2. Performance Check
    performance_keywords = [
        "performance", "complexity", "nested loop", "o(n", "complexity is", "loop logic"
    ]
    if any(keyword in combined_text for keyword in performance_keywords):
        # Complexity can be performance or maintainability; if it mentions loop or O(N), it's performance.
        # If it's pure cyclomatic complexity or large function, it's maintainability.
        if "nested" in combined_text or "loop" in combined_text or "o(n" in combined_text:
            return "performance"
            
    # 3. Maintainability Check
    maintainability_keywords = [
        "maintainab", "complexity", "cyclomatic", "large function", "radon.cc", "refactor"
    ]
    if any(keyword in combined_text for keyword in maintainability_keywords):
        return "maintainability"
        
    # 4. Documentation Check
    documentation_keywords = [
        "todo", "comment", "documentation", "docstring", "missing doc"
    ]
    if any(keyword in combined_text for keyword in documentation_keywords):
        return "documentation"
        
    # 5. Readability Check
    readability_keywords = [
        "readability", "lint", "format", "style", "whitespace", "import", "unused import", "ruff"
    ]
    if any(keyword in combined_text for keyword in readability_keywords):
        return "readability"
        
    # 6. Default to Best Practices
    return "bestPractices"
