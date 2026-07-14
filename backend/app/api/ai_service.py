import os
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForMaskedLM
from typing import List, Dict, Any

tokenizer = None
model = None

def load_model():
    """
    Lazy loads the CodeBERT MLM tokenizer and model.
    """
    global tokenizer, model
    if tokenizer is None or model is None:
        model_name = "microsoft/codebert-base-mlm"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForMaskedLM.from_pretrained(model_name)
        model.eval()

def get_code_embeddings(code: str) -> List[float]:
    """
    Generates a 768-dimensional embedding representation of the code snippet
    by computing the mean of the last hidden states of CodeBERT.
    """
    try:
        load_model()
        # CodeBERT max sequence length is 512
        inputs = tokenizer(code, max_length=512, truncation=True, return_tensors="pt")
        with torch.no_grad():
            outputs = model.roberta(**inputs)
            # outputs.last_hidden_state: [batch, seq_len, hidden_size]
            hidden_states = outputs.last_hidden_state
            mean_embedding = torch.mean(hidden_states, dim=1).squeeze(0)
            return mean_embedding.tolist()
    except Exception as e:
        print(f"Error generating CodeBERT embeddings: {str(e)}")
        # Fallback to zero embedding if it fails
        return [0.0] * 768

def detect_logical_anomalies(code: str, language: str) -> List[Dict[str, Any]]:
    """
    Detects potential logical errors and typos using CodeBERT Masked Language Modeling.
    Masks specific logical operators or keywords, queries predictions, and highlights
    significant discrepancies between written code and CodeBERT suggestions.
    """
    anomalies = []
    try:
        load_model()
        # Tokenize with offsets to map tokens to line numbers
        inputs = tokenizer(code, max_length=512, truncation=True, return_offsets_mapping=True)
        input_ids = inputs["input_ids"]
        offset_mapping = inputs["offset_mapping"]

        # Define check tokens
        target_token_indices = []
        for idx, token_id in enumerate(input_ids):
            if token_id in tokenizer.all_special_ids:
                continue
            token_str = tokenizer.convert_ids_to_tokens(token_id).strip("Ġ")
            # Focus on common operational/logic tokens
            if token_str in ["==", "!=", "<", ">", "<=", ">=", "&&", "||", "and", "or", "not", "=-", "=+", "true", "false", "True", "False"]:
                target_token_indices.append(idx)

        # Cap the number of checked tokens to prevent performance bottlenecks
        target_token_indices = target_token_indices[:15]

        for target_idx in target_token_indices:
            masked_input_ids = list(input_ids)
            original_token_id = masked_input_ids[target_idx]
            masked_input_ids[target_idx] = tokenizer.mask_token_id

            masked_tensor = torch.tensor([masked_input_ids])
            attention_mask = torch.tensor([[1] * len(masked_input_ids)])

            with torch.no_grad():
                outputs = model(masked_tensor, attention_mask=attention_mask)
                predictions = outputs.logits[0, target_idx]
                probs = F.softmax(predictions, dim=-1)

            original_prob = probs[original_token_id].item()
            top_prob, top_token_id = torch.max(probs, dim=-1)
            top_prob = top_prob.item()

            original_token_str = tokenizer.decode([original_token_id]).strip()
            top_token_str = tokenizer.decode([top_token_id]).strip()

            # If original token is highly unexpected (<5% prob) and top recommendation is highly confident (>50% prob)
            if original_prob < 0.05 and top_prob > 0.50 and original_token_str != top_token_str:
                start_char, end_char = offset_mapping[target_idx]
                line_no = code[:start_char].count('\n') + 1

                # Construct suggestion
                description = f"Potential logical typo or bug. Written operator/keyword '{original_token_str}' is highly unexpected in this context. CodeBERT predicts '{top_token_str}' with {top_prob*100:.1f}% confidence."
                
                anomalies.append({
                    "line": line_no,
                    "severity": "Medium" if original_prob > 0.01 else "High",
                    "title": "AI Logical Anomaly",
                    "description": description,
                    "suggestion": f"Consider substituting '{original_token_str}' with '{top_token_str}' after reviewing logic flow.",
                    "is_ai": True
                })
    except Exception as e:
        print(f"Error checking CodeBERT logical anomalies: {str(e)}")
    
    return anomalies

def compute_surprise_scores(code: str) -> List[float]:
    """
    Computes line-by-line surprise scores (perplexity metric) by masking each line's tokens,
    predicting them using CodeBERT, and calculating negative log probabilities.
    Returns a list of float scores mapped index-by-index to lines (1-indexed).
    """
    lines = code.split("\n")
    num_lines = len(lines)
    surprise_scores = [0.0] * num_lines

    try:
        load_model()
        inputs = tokenizer(code, max_length=512, truncation=True, return_offsets_mapping=True)
        input_ids = inputs["input_ids"]
        offset_mapping = inputs["offset_mapping"]

        # Group token indices by line number (1-indexed)
        line_to_token_indices = {}
        for idx, (start, end) in enumerate(offset_mapping):
            if input_ids[idx] in tokenizer.all_special_ids:
                continue
            line_no = code[:start].count("\n") + 1
            if line_no not in line_to_token_indices:
                line_to_token_indices[line_no] = []
            line_to_token_indices[line_no].append(idx)

        # Cap processing to first 50 lines to keep performance responsive
        processed_lines = sorted([l for l in line_to_token_indices.keys() if l <= 50])

        for line_no in processed_lines:
            target_indices = line_to_token_indices[line_no]
            if not target_indices:
                continue

            # Mask all tokens on this line
            masked_input_ids = list(input_ids)
            for idx in target_indices:
                masked_input_ids[idx] = tokenizer.mask_token_id

            masked_tensor = torch.tensor([masked_input_ids])
            attention_mask = torch.tensor([[1] * len(masked_input_ids)])

            with torch.no_grad():
                outputs = model(masked_tensor, attention_mask=attention_mask)
                logits = outputs.logits[0]

            # Calculate average cross entropy loss (surprise) for the masked tokens on this line
            total_loss = 0.0
            for idx in target_indices:
                token_logits = logits[idx]
                token_probs = F.log_softmax(token_logits, dim=-1)
                original_token_id = input_ids[idx]
                # Cross-entropy loss is negative log probability
                total_loss += -token_probs[original_token_id].item()

            avg_loss = total_loss / len(target_indices)
            
            # Map average loss to a 0-100 complexity scale
            # Loss values typically range from 0.1 to 10.0+
            score = min(100.0, max(5.0, avg_loss * 15.0))
            if line_no - 1 < len(surprise_scores):
                surprise_scores[line_no - 1] = round(score, 1)

    except Exception as e:
        print(f"Error computing CodeBERT surprise scores: {str(e)}")

    return surprise_scores
