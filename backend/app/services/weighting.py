from typing import Dict

# Default category weights configuration (must sum to 1.0)
CATEGORY_WEIGHTS: Dict[str, float] = {
    "readability": 0.20,
    "maintainability": 0.20,
    "security": 0.25,
    "performance": 0.15,
    "documentation": 0.10,
    "bestPractices": 0.10
}

# Default severity-based deductions/penalties
SEVERITY_DEDUCTIONS: Dict[str, int] = {
    "Critical": 15,
    "High": 8,
    "Medium": 4,
    "Low": 2,
    "Info": 0
}

def get_category_weights() -> Dict[str, float]:
    """
    Returns the current category weights configuration.
    """
    return CATEGORY_WEIGHTS

def get_severity_deductions() -> Dict[str, int]:
    """
    Returns the severity-based score deductions.
    """
    return SEVERITY_DEDUCTIONS
