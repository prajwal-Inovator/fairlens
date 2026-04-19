

import numpy as np
import pandas as pd
import shap
from typing import List, Dict, Any, Union
import warnings
warnings.filterwarnings('ignore')

# ------------------------------------------------------------------
# HELPER: _get_top_features
# ------------------------------------------------------------------
def _get_top_features(
    shap_values: np.ndarray,
    feature_names: List[str],
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Extract top K features by mean absolute SHAP value and determine direction.
    
    Args:
        shap_values: SHAP values matrix (samples x features)
        feature_names: List of feature names
        top_k: Number of top features to return
        
    Returns:
        List of dicts: [{"feature": str, "importance": float, "direction": str}, ...]
        where direction is 'positive' (pushes prediction up) or 'negative'.
    """
    # Mean absolute SHAP value per feature
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    # Mean SHAP (signed) to determine direction
    mean_shap = shap_values.mean(axis=0)
    
    # Create list of (feature, importance, direction)
    features = []
    for i, name in enumerate(feature_names):
        importance = float(mean_abs_shap[i])
        direction = 'positive' if mean_shap[i] > 0 else 'negative'
        features.append({
            'feature': name,
            'importance': importance,
            'direction': direction
        })
    
    # Sort by importance descending and take top_k
    features.sort(key=lambda x: x['importance'], reverse=True)
    return features[:top_k]

# ------------------------------------------------------------------
# HELPER: _generate_explanation_text
# ------------------------------------------------------------------
def _generate_explanation_text(
    top_features: List[Dict[str, Any]],
    sensitive_groups: List[str] = None
) -> str:
    """
    Generate a plain-English explanation of SHAP findings.
    
    Args:
        top_features: List of top features with importance and direction
        sensitive_groups: Optional list of sensitive groups for context
        
    Returns:
        Human-readable explanation string
    """
    if not top_features:
        return "No feature importance data available."
    
    # Build explanation
    explanation_parts = []
    for i, feat in enumerate(top_features[:3]):  # Top 3 for explanation
        pct = f"{feat['importance'] * 100:.1f}%"
        direction_text = "increases the likelihood of a positive outcome" if feat['direction'] == 'positive' else "decreases the likelihood"
        explanation_parts.append(f"{feat['feature']} ({pct}) {direction_text}")
    
    explanation = f"The top factors driving model predictions are: " + ", ".join(explanation_parts[:-1]) + (" and " + explanation_parts[-1] if len(explanation_parts) > 1 else explanation_parts[0]) + "."
    
    if sensitive_groups:
        explanation += f" Feature impacts vary across {len(sensitive_groups)} groups, which may indicate bias sources."
    
    return explanation

# ------------------------------------------------------------------
# MAIN FUNCTION: explain_model
# ------------------------------------------------------------------
def explain_model(
    model: Any,
    X_train: Union[np.ndarray, pd.DataFrame],
    X_test: Union[np.ndarray, pd.DataFrame],
    feature_names: List[str],
    sensitive_test: Union[np.ndarray, pd.Series] = None,
    top_k: int = 5
) -> Dict[str, Any]:
    """
    Generate SHAP explanations for model predictions.
    
    Args:
        model: Trained sklearn-compatible model (with predict_proba or predict)
        X_train: Training data (used as background for SHAP)
        X_test: Test data to explain
        feature_names: List of feature names corresponding to columns
        sensitive_test: Optional sensitive attribute for per-group SHAP
        top_k: Number of top features to return
        
    Returns:
        Dict containing:
            - top_features: List of top K features with importance and direction
            - per_group_shap: Dict mapping group names to their top features
            - explanation: Plain-English summary
    """
    print("[✓] Starting SHAP explanation generation...")
    
    # Convert to numpy arrays if pandas DataFrames
    if isinstance(X_train, pd.DataFrame):
        X_train = X_train.values
    if isinstance(X_test, pd.DataFrame):
        X_test = X_test.values
    
    # Ensure feature_names length matches
    if len(feature_names) != X_train.shape[1]:
        print(f"[!] Warning: feature_names length ({len(feature_names)}) != X_train columns ({X_train.shape[1]}). Using generic names.")
        feature_names = [f"feature_{i}" for i in range(X_train.shape[1])]
    
    try:
        # Choose SHAP explainer based on model type
        # For tree-based models, TreeExplainer is faster; for linear, LinearExplainer; else KernelExplainer
        if hasattr(model, 'tree_') or str(type(model)).find('tree') != -1:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_test)
            # TreeExplainer may return list for multi-class; take class 1 if binary
            if isinstance(shap_values, list):
                shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        elif hasattr(model, 'coef_') or str(type(model)).find('linear') != -1:
            explainer = shap.LinearExplainer(model, X_train)
            shap_values = explainer.shap_values(X_test)
        else:
            # Use KernelExplainer (slower but generic)
            # Use a small background sample for performance
            background = shap.sample(X_train, min(100, X_train.shape[0]))
            explainer = shap.KernelExplainer(model.predict_proba, background)
            # For binary classification, get SHAP for positive class
            shap_values = explainer.shap_values(X_test)
            if isinstance(shap_values, list):
                shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        
        print(f"[✓] SHAP values computed: shape {shap_values.shape}")
        
        # Get overall top features
        top_features = _get_top_features(shap_values, feature_names, top_k)
        
        # Per-group SHAP values if sensitive_test provided
        per_group_shap = {}
        if sensitive_test is not None:
            # Convert to numpy if needed
            if isinstance(sensitive_test, pd.Series):
                sensitive_test = sensitive_test.values
            
            unique_groups = np.unique(sensitive_test)
            for group in unique_groups:
                group_mask = sensitive_test == group
                if np.sum(group_mask) > 0:
                    group_shap = shap_values[group_mask]
                    group_top = _get_top_features(group_shap, feature_names, top_k)
                    per_group_shap[str(group)] = group_top
        
        # Generate explanation text
        explanation = _generate_explanation_text(top_features, list(per_group_shap.keys()) if per_group_shap else None)
        
        result = {
            'top_features': top_features,
            'per_group_shap': per_group_shap,
            'explanation': explanation
        }
        
        print("[✓] SHAP explanation generation complete")
        return result
        
    except Exception as e:
        print(f"[✗] SHAP explanation failed: {str(e)}")
        # Return fallback result with error information
        return {
            'top_features': [{'feature': 'error', 'importance': 0.0, 'direction': 'neutral'}],
            'per_group_shap': {},
            'explanation': f"SHAP explanation could not be generated due to: {str(e)}. Consider using a simpler model or smaller dataset."
        }

# ------------------------------------------------------------------
# ALTERNATIVE: explain_with_sample (convenience wrapper)
# ------------------------------------------------------------------
def explain_with_sample(
    model: Any,
    X_sample: Union[np.ndarray, pd.DataFrame],
    feature_names: List[str],
    sensitive_sample: Union[np.ndarray, pd.Series] = None
) -> Dict[str, Any]:
    """
    Simplified version that explains a single sample or small batch.
    Useful for interactive demos.
    
    Args:
        model: Trained model
        X_sample: Single sample or small batch
        feature_names: Feature names
        sensitive_sample: Optional sensitive attribute for grouping
        
    Returns:
        Same structure as explain_model
    """
    # Ensure 2D
    if X_sample.ndim == 1:
        X_sample = X_sample.reshape(1, -1)
    # Use dummy training data (requires model to have been fitted)
    # This is just a wrapper; for real use, you'd have training data.
    # We'll assume model already knows its feature dimension.
    # Instead, we'll use a KernelExplainer with a small background sampled from model's training?
    # For simplicity, we'll call explain_model with X_train = X_sample (not ideal but works for demo)
    # Better: pass training data separately.
    raise NotImplementedError("Use explain_model with explicit X_train for full functionality.")

# ------------------------------------------------------------------
# QUICK TEST (if run as standalone)
# ------------------------------------------------------------------
if __name__ == "__main__":
    # Quick test with synthetic data
    from sklearn.linear_model import LogisticRegression
    from sklearn.datasets import make_classification
    
    print("Testing explainer module...")
    X, y = make_classification(n_samples=500, n_features=5, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = LogisticRegression()
    model.fit(X_train, y_train)
    
    feature_names = [f"feat_{i}" for i in range(5)]
    result = explain_model(model, X_train, X_test, feature_names)
    print("Result:", result)