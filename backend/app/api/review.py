import os
import tempfile
import subprocess
import json
import re
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from tree_sitter_languages import get_language, get_parser
from app.db import get_db_connection
from app.api.dependencies import get_optional_current_user
from app.api.ai_service import get_code_embeddings, detect_logical_anomalies, compute_surprise_scores
from app.services import scoring_service, summary_service

router = APIRouter()

# Create a local sandbox directory inside backend to isolate files
dir_path = os.path.dirname(os.path.abspath(__file__))
backend_dir = None
for _ in range(5):
    if os.path.exists(os.path.join(dir_path, ".venv")) or os.path.exists(os.path.join(dir_path, "requirements.txt")):
        backend_dir = dir_path
        break
    dir_path = os.path.dirname(dir_path)
    
if not backend_dir:
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SANDBOX_DIR = os.path.join(backend_dir, "sandbox")
os.makedirs(SANDBOX_DIR, exist_ok=True)

class ReviewRequest(BaseModel):
    code: str
    language: str = "python"

def analyze_ast(code: str, language_name: str) -> List[Dict[str, Any]]:
    issues = []
    
    # Map input language to tree-sitter language names
    lang_map = {
        "python": "python",
        "javascript": "javascript",
        "typescript": "typescript",
        "go": "go",
        "java": "java",
        "cpp": "cpp"
    }
    
    ts_lang_name = lang_map.get(language_name.lower())
    if not ts_lang_name:
        return issues
        
    try:
        parser = get_parser(ts_lang_name)
        tree = parser.parse(bytes(code, "utf8"))
        root_node = tree.root_node
    except Exception:
        # Fallback if parser fails to load
        return issues

    def traverse(node, depth=0):
        node_type = node.type
        
        # 1. Nested loops detection
        if node_type in ("for_statement", "while_statement", "for_in_statement", "for_of_statement", "for_range_statement"):
            inner_loops = []
            def find_loops(n):
                if n != node and n.type in ("for_statement", "while_statement", "for_in_statement", "for_of_statement", "for_range_statement"):
                    inner_loops.append(n)
                for child in n.children:
                    find_loops(child)
            find_loops(node)
            if inner_loops:
                issues.append({
                    "line": node.start_point[0] + 1,
                    "severity": "Medium",
                    "title": "Nested loops detected",
                    "description": "Nested loops can result in O(N^2) or higher complexity. Analyze if you can cache computations or flatten loop logic.",
                    "suggestion": "// Consider flattening loops or extracting a helper function"
                })
        
        # 2. Large function detection
        if node_type in ("function_declaration", "function_definition", "arrow_function", "method_definition", "function_item", "method_declaration"):
            start_line = node.start_point[0] + 1
            end_line = node.end_point[0] + 1
            lines_count = end_line - start_line + 1
            
            func_name = "anonymous"
            # Extract function name identifier
            for child in node.children:
                if child.type == "identifier" or child.type == "property_identifier":
                    try:
                        func_name = code[child.start_byte:child.end_byte]
                    except Exception:
                        pass
                    break
            
            if lines_count > 50:
                issues.append({
                    "line": start_line,
                    "severity": "Medium",
                    "title": "Large function detected",
                    "description": f"Function '{func_name}' spans {lines_count} lines. Keep functions under 50 lines to comply with clean code guidelines.",
                    "suggestion": f"// Refactor '{func_name}' by dividing it into smaller modular procedures."
                })
                
        # 3. Security/best practice checks mapping using child lookup instead of field names
        if node_type == "call_expression":
            callee = None
            for child in node.children:
                if child.type in ("identifier", "member_expression", "property_identifier"):
                    callee = child
                    break
            
            if callee:
                if callee.type == "identifier" and ts_lang_name in ("javascript", "typescript"):
                    fn_name = code[callee.start_byte:callee.end_byte]
                    if fn_name == "eval":
                        issues.append({
                            "line": node.start_point[0] + 1,
                            "severity": "Critical",
                            "title": "Unsafe usage of eval()",
                            "description": "eval() evaluates strings as code and is vulnerable to code injection. It also hinders runtime optimization.",
                            "suggestion": "// Use safer parsing alternatives\nconst parsed = JSON.parse(strData);"
                        })
                elif callee.type == "member_expression" and ts_lang_name in ("javascript", "typescript"):
                    obj = None
                    prop = None
                    for c in callee.children:
                        if c.type == "identifier":
                            obj = c
                        elif c.type == "property_identifier":
                            prop = c
                    if obj and prop:
                        obj_name = code[obj.start_byte:obj.end_byte]
                        prop_name = code[prop.start_byte:prop.end_byte]
                        if obj_name == "document" and prop_name == "write":
                            issues.append({
                                "line": node.start_point[0] + 1,
                                "severity": "High",
                                "title": "document.write() violation",
                                "description": "document.write() blocks HTML parsers and can lead to XSS. Prefer DOM API methods.",
                                "suggestion": "// Prefer modern DOM insertion APIs\nconst div = document.createElement('div');\ndiv.textContent = content;\ndocument.body.appendChild(div);"
                            })
                elif callee.type == "identifier" and ts_lang_name == "cpp":
                    fn_name = code[callee.start_byte:callee.end_byte]
                    if fn_name == "gets":
                        issues.append({
                            "line": node.start_point[0] + 1,
                            "severity": "Critical",
                            "title": "Unsafe gets() function",
                            "description": "gets() doesn't limit character count and invites buffer overflow issues. Use std::getline instead.",
                            "suggestion": "// Use standard line reading\nstd::string line;\nstd::getline(std::cin, line);"
                        })
                    elif fn_name == "strcpy":
                        issues.append({
                            "line": node.start_point[0] + 1,
                            "severity": "High",
                            "title": "Unsafe strcpy() function",
                            "description": "strcpy() copies strings without verification of sizes. Replace with std::strncpy.",
                            "suggestion": "// Safe bounded string copying\nstd::strncpy(dest, src, sizeof(dest) - 1);\ndest[sizeof(dest) - 1] = '\\0';"
                        })
                        
        elif node_type == "method_invocation" and ts_lang_name == "java":
            name = None
            for c in node.children:
                if c.type == "identifier":
                    name = c
            if name and code[name.start_byte:name.end_byte] == "printStackTrace":
                issues.append({
                    "line": node.start_point[0] + 1,
                    "severity": "Low",
                    "title": "Avoid raw printStackTrace()",
                    "description": "Raw trace logs leak backend implementation signatures. Configure slf4j/log4j output logging instead.",
                    "suggestion": "// Log via standard logging system\nlogger.error(\"Exception occurred: \", e);"
                })
                    
        for child in node.children:
            traverse(child, depth + 1)
            
    traverse(root_node)
    return issues

def run_regex_checks(code: str) -> List[Dict[str, Any]]:
    issues = []
    
    # 1. Hardcoded API Keys / Credentials
    credential_regex = re.compile(
        r"(?:api_key|apikey|secret|token|password|passwd|private_key|auth_token)\s*[:=]\s*['\"]([a-zA-Z0-9_\-\.]{16,})['\"]",
        re.IGNORECASE
    )
    for match in credential_regex.finditer(code):
        start_idx = match.start()
        line_num = code[:start_idx].count("\n") + 1
        issues.append({
            "line": line_num,
            "severity": "Critical",
            "title": "Potential hardcoded credentials",
            "description": "Detected a potential credential signature hardcoded in plain text. Exposing credentials in codes increases breach vector risk.",
            "suggestion": "# Fetch secrets from configuration environments\nimport os\napi_token = os.environ.get('API_SECRET_TOKEN')"
        })
        
    # 2. TODO comments reminder
    todo_regex = re.compile(r"(?:#|//|/\*|--)\s*TODO\s*[:\-]?\s*(.+)", re.IGNORECASE)
    for match in todo_regex.finditer(code):
        start_idx = match.start()
        line_num = code[:start_idx].count("\n") + 1
        todo_msg = match.group(1).strip()
        issues.append({
            "line": line_num,
            "severity": "Low",
            "title": "Uncompleted tasks (TODO)",
            "description": f"Outstanding task found: '{todo_msg}'. Close all todo blocks before merging code to master.",
            "suggestion": f"# Finalize the task:\n# {todo_msg}"
        })
        
    return issues

def analyze_python_cli(file_path: str) -> Dict[str, Any]:
    issues = []
    mi_score = 100
    
    # Executable paths
    ruff_path = os.path.join(backend_dir, ".venv", "Scripts", "ruff.exe")
    bandit_path = os.path.join(backend_dir, ".venv", "Scripts", "bandit.exe")
    radon_path = os.path.join(backend_dir, ".venv", "Scripts", "radon.exe")
    
    # 1. Ruff Linting
    if os.path.exists(ruff_path):
        res = subprocess.run(
            [ruff_path, "check", "--output-format", "json", file_path],
            capture_output=True, text=True, shell=True
        )
        try:
            ruff_data = json.loads(res.stdout)
            for issue in ruff_data:
                code_rule = issue.get("code", "")
                severity = "Low"
                if code_rule.startswith("E9") or code_rule.startswith("F82"):
                    severity = "High"
                elif code_rule.startswith("F4"):
                    severity = "Medium"
                    
                issues.append({
                    "line": issue.get("location", {}).get("row", 1),
                    "severity": severity,
                    "title": f"Lint Error {code_rule}",
                    "description": issue.get("message", "Lint rules violated."),
                    "suggestion": issue.get("fix", {}).get("message", None)
                })
        except Exception:
            pass
            
    # 2. Bandit Security Lint
    if os.path.exists(bandit_path):
        res = subprocess.run(
            [bandit_path, "-f", "json", file_path],
            capture_output=True, text=True, shell=True
        )
        try:
            bandit_data = json.loads(res.stdout)
            for result in bandit_data.get("results", []):
                sev_map = {
                    "HIGH": "Critical",
                    "MEDIUM": "High",
                    "LOW": "Medium"
                }
                issues.append({
                    "line": result.get("line_number", 1),
                    "severity": sev_map.get(result.get("issue_severity"), "Medium"),
                    "title": f"Security concern ({result.get('test_id')})",
                    "description": result.get("issue_text", ""),
                    "suggestion": f"# Safer pattern:\n# Review advice: {result.get('more_info')}"
                })
        except Exception:
            pass
            
    # 3. Radon Maintainability Index (MI) & Complexity (CC)
    if os.path.exists(radon_path):
        res = subprocess.run(
            [radon_path, "mi", "-j", file_path],
            capture_output=True, text=True, shell=True
        )
        try:
            mi_data = json.loads(res.stdout)
            for key, val in mi_data.items():
                if isinstance(val, dict) and "mi" in val:
                    mi_score = int(val["mi"])
        except Exception:
            pass
            
        res = subprocess.run(
            [radon_path, "cc", "-j", file_path],
            capture_output=True, text=True, shell=True
        )
        try:
            cc_data = json.loads(res.stdout)
            for file_key, blocks in cc_data.items():
                for block in blocks:
                    complexity = block.get("complexity", 1)
                    if complexity > 10:
                        issues.append({
                            "line": block.get("lineno", 1),
                            "severity": "High" if complexity > 20 else "Medium",
                            "title": f"High Complexity: {block.get('name')}()",
                            "description": f"Cyclomatic complexity is {complexity}. Highly complex code blocks are prone to regressions.",
                            "suggestion": f"# Segment '{block.get('name')}' functions into smaller units."
                        })
        except Exception:
            pass
            
    return {"issues": issues, "maintainability_score": mi_score}

def perform_raw_analysis(code: str, language: str, file_path_on_disk: str = None) -> Dict[str, Any]:
    aggregated_issues = []
    
    # 1. Base regex metrics
    aggregated_issues.extend(run_regex_checks(code))
    
    # 2. AST parsing queries
    aggregated_issues.extend(analyze_ast(code, language))
    
    # 3. Run Python specific engines if selected
    base_score = 95
    if language.lower() == "python":
        if file_path_on_disk and os.path.exists(file_path_on_disk):
            try:
                python_results = analyze_python_cli(file_path_on_disk)
                aggregated_issues.extend(python_results["issues"])
                base_score = python_results["maintainability_score"]
            except Exception:
                pass
        else:
            suffix = ".py"
            try:
                with tempfile.NamedTemporaryFile(dir=SANDBOX_DIR, suffix=suffix, delete=False, mode="w", encoding="utf-8") as temp_file:
                    temp_file.write(code)
                    temp_file_path = temp_file.name
                    
                python_results = analyze_python_cli(temp_file_path)
                aggregated_issues.extend(python_results["issues"])
                base_score = python_results["maintainability_score"]
            except Exception:
                pass
            finally:
                if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
                    try:
                        os.remove(temp_file_path)
                    except Exception:
                        pass

    # 4. Run CodeBERT AI analysis (Embeddings, Logical Anomalies, and Surprise/Complexity scores)
    embedding = get_code_embeddings(code)
    surprise_scores = compute_surprise_scores(code)
    ai_anomalies = detect_logical_anomalies(code, language)
    aggregated_issues.extend(ai_anomalies)

    # Clean up duplicate issues (same line and title)
    unique_issues = []
    seen = set()
    for issue in aggregated_issues:
        key = (issue.get("line"), issue.get("title"))
        if key not in seen:
            seen.add(key)
            unique_issues.append(issue)
            
    # Sort issues by line number
    unique_issues.sort(key=lambda x: x.get("line", 0))
    
    # Calculate detailed scores
    # base_score represents Radon Maintainability Index for python, default 100.0 otherwise
    scoring_result = scoring_service.calculate_scores(unique_issues, radon_mi=base_score)
    overall_score = scoring_result["overallScore"]
    category_scores = scoring_result["categoryScores"]
    severity_counts = scoring_result["severityCounts"]
    updated_issues = scoring_result["issues"]
    
    # Generate review summary
    summary = summary_service.generate_summary(overall_score, category_scores, updated_issues)
    
    return {
        "score": overall_score,  # Keep for backward compatibility
        "overallScore": overall_score,
        "categoryScores": category_scores,
        "severityCounts": severity_counts,
        "summary": summary,
        "issues": updated_issues,
        "embedding": embedding,
        "surprise_scores": surprise_scores
    }

@router.post("/review")
async def review_code(request: ReviewRequest, current_user: dict = Depends(get_optional_current_user)):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code content cannot be empty")
        
    res = perform_raw_analysis(request.code, request.language)
    overall_score = res["overallScore"]
    category_scores = res["categoryScores"]
    severity_counts = res["severityCounts"]
    summary = res["summary"]
    updated_issues = res["issues"]
    embedding = res["embedding"]
    surprise_scores = res["surprise_scores"]

    review_id = str(uuid.uuid4())
    if current_user:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO reviews (id, user_id, code, language, score, issues, embedding, surprise_scores, category_scores, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
                (
                    review_id, 
                    current_user["id"], 
                    request.code, 
                    request.language, 
                    overall_score, 
                    json.dumps(updated_issues), 
                    json.dumps(embedding), 
                    json.dumps(surprise_scores),
                    json.dumps(category_scores),
                    summary
                )
            )
            conn.commit()
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=500, detail=f"Database error saving review: {str(e)}")
        conn.close()

    return {
        "id": review_id,
        "status": "success",
        "message": "Review completed successfully",
        "score": overall_score,  # Keep for backward compatibility
        "overallScore": overall_score,
        "categoryScores": category_scores,
        "severityCounts": severity_counts,
        "summary": summary,
        "issues": updated_issues,
        "embedding": embedding,
        "surprise_scores": surprise_scores
    }
