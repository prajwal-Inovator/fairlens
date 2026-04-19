

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from fairlearn.metrics import (
    MetricFrame,
    demographic_parity_difference,
    equalized_odds_difference,
    selection_rate,
    false_positive_rate,
    false_negative_rate
)
import warnings
warnings.filterwarnings('ignore')

# ------------------------------------------------------------------
# FUNCTION: load_dataset
# ------------------------------------------------------------------
def load_dataset(file_path: str) -> pd.DataFrame:
    """
    Load CSV dataset and perform basic validation.
    
    Args:
        file_path: Path to CSV file
        
    Returns:
        pandas DataFrame
        
    Raises:
        ValueError: If file is empty or has insufficient rows
    """
    print(f"[✓] Loading dataset from {file_path}")
    df = pd.read_csv(file_path)
    
    if df.empty:
        raise ValueError("Dataset is empty")
    
    if df.shape[0] < 10:
        raise ValueError(f"Dataset has only {df.shape[0]} rows. Minimum 10 rows required.")
    
    print(f"[✓] Loaded {df.shape[0]} rows, {df.shape[1]} columns")
    return df

# ------------------------------------------------------------------
# FUNCTION: preprocess
# ------------------------------------------------------------------
def preprocess(df: pd.DataFrame, target_col: str, sensitive_col: str):
    """
    Preprocess dataset: encode categorical variables, separate features,
    target, and sensitive attribute.
    
    Args:
        df: Input DataFrame
        target_col: Name of target column
        sensitive_col: Name of sensitive attribute column
        
    Returns:
        X: Feature matrix (encoded)
        y: Target vector (binary, 0/1)
        sensitive: Sensitive attribute vector (encoded)
    """
    print(f"[✓] Preprocessing data...")
    
    # Make a copy to avoid modifying original
    data = df.copy()
    
    # Validate columns exist
    if target_col not in data.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset")
    if sensitive_col not in data.columns:
        raise ValueError(f"Sensitive column '{sensitive_col}' not found in dataset")
    
    # Handle missing values (simple drop for now)
    initial_rows = len(data)
    data = data.dropna()
    if len(data) < initial_rows:
        print(f"[!] Dropped {initial_rows - len(data)} rows with missing values")
    
    # Encode target variable to binary (0/1)
    le_target = LabelEncoder()
    y = le_target.fit_transform(data[target_col])
    
    # Store original target labels for later reference
    target_classes = le_target.classes_.tolist()
    print(f"[✓] Target '{target_col}' classes: {target_classes}")
    
    # Encode sensitive attribute
    le_sensitive = LabelEncoder()
    sensitive = le_sensitive.fit_transform(data[sensitive_col])
    sensitive_groups = le_sensitive.classes_.tolist()
    print(f"[✓] Sensitive '{sensitive_col}' groups: {sensitive_groups}")
    
    # Prepare feature matrix (exclude target and sensitive columns)
    feature_cols = [col for col in data.columns if col not in [target_col, sensitive_col]]
    X_raw = data[feature_cols]
    
    # Encode categorical features
    X = X_raw.copy()
    categorical_cols = X.select_dtypes(include=['object']).columns
    for col in categorical_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
    
    print(f"[✓] Features: {list(X.columns)}")
    print(f"[✓] Final shapes - X: {X.shape}, y: {y.shape}, sensitive: {sensitive.shape}")
    
    return X, y, sensitive

# ------------------------------------------------------------------
# FUNCTION: train_model
# ------------------------------------------------------------------
def train_model(X_train, y_train):
    """
    Train a logistic regression classifier.
    
    Args:
        X_train: Training features
        y_train: Training labels
        
    Returns:
        Trained LogisticRegression model
    """
    model = LogisticRegression(
        max_iter=1000,
        random_state=42,
        class_weight='balanced'  # Helps with imbalanced datasets
    )
    model.fit(X_train, y_train)
    print(f"[✓] Model trained successfully")
    return model

# ------------------------------------------------------------------
# FUNCTION: compute_bias_metrics
# ------------------------------------------------------------------
def compute_bias_metrics(model, X_test, y_test, sensitive_test):
    """
    Compute fairness metrics using Fairlearn.
    
    Args:
        model: Trained classifier
        X_test: Test features
        y_test: True test labels
        sensitive_test: Sensitive attribute for test set
        
    Returns:
        dict containing:
        - accuracy: overall accuracy
        - demographic_parity_diff: difference in selection rates
        - equalized_odds_diff: difference in equalized odds
        - overall_metrics: dict with selection_rate, fpr, fnr
        - by_group: list of group-wise metrics
    """
    print(f"[✓] Computing bias metrics...")
    
    # Predictions
    y_pred = model.predict(X_test)
    
    # Overall accuracy
    accuracy = accuracy_score(y_test, y_pred)
    
    # Demographic parity difference
    dp_diff = demographic_parity_difference(
        y_test, y_pred, sensitive_features=sensitive_test
    )
    
    # Equalized odds difference (max of FPR and FNR differences)
    eo_diff = equalized_odds_difference(
        y_test, y_pred, sensitive_features=sensitive_test
    )
    
    # Overall metrics (aggregated)
    overall_selection_rate = selection_rate(y_test, y_pred)
    overall_fpr = false_positive_rate(y_test, y_pred)
    overall_fnr = false_negative_rate(y_test, y_pred)
    
    # Group-wise metrics using MetricFrame
    metric_frame = MetricFrame(
        metrics={
            'selection_rate': selection_rate,
            'false_positive_rate': false_positive_rate,
            'false_negative_rate': false_negative_rate,
            'accuracy': accuracy_score
        },
        y_true=y_test,
        y_pred=y_pred,
        sensitive_features=sensitive_test
    )
    
    # Extract group names (encoded back to original if needed, but use indices)
    groups = [f"Group_{i}" for i in range(len(metric_frame.by_group))]
    # Try to get original group labels if possible (from sensitive_test unique values)
    unique_groups = np.unique(sensitive_test)
    groups = [str(g) for g in unique_groups]
    
    by_group = []
    for i, group in enumerate(groups):
        by_group.append({
            'group': group,
            'selection_rate': float(metric_frame.by_group['selection_rate'].iloc[i]),
            'false_positive_rate': float(metric_frame.by_group['false_positive_rate'].iloc[i]),
            'false_negative_rate': float(metric_frame.by_group['false_negative_rate'].iloc[i]),
            'accuracy': float(metric_frame.by_group['accuracy'].iloc[i])
        })
    
    print(f"[✓] Metrics computed: DP diff={dp_diff:.4f}, EO diff={eo_diff:.4f}, Acc={accuracy:.4f}")
    
    return {
        'accuracy': float(accuracy),
        'demographic_parity_diff': float(dp_diff),
        'equalized_odds_diff': float(eo_diff),
        'overall_metrics': {
            'selection_rate': float(overall_selection_rate),
            'false_positive_rate': float(overall_fpr),
            'false_negative_rate': float(overall_fnr),
            'accuracy': float(accuracy)
        },
        'by_group': by_group
    }

# ------------------------------------------------------------------
# FUNCTION: generate_summary
# ------------------------------------------------------------------
def generate_summary(metrics: dict, sensitive_col: str, target_col: str) -> str:
    """
    Generate a plain-English summary of bias findings.
    
    Args:
        metrics: Output from compute_bias_metrics
        sensitive_col: Name of sensitive attribute column
        target_col: Name of target column
        
    Returns:
        Human-readable summary string
    """
    dp_diff = abs(metrics['demographic_parity_diff'])
    eo_diff = abs(metrics['equalized_odds_diff'])
    groups = metrics['by_group']
    
    # Determine bias level
    if dp_diff > 0.2 or eo_diff > 0.15:
        bias_level = "HIGH"
        verdict = "significant bias detected"
    elif dp_diff > 0.1 or eo_diff > 0.08:
        bias_level = "MODERATE"
        verdict = "moderate bias detected"
    else:
        bias_level = "LOW"
        verdict = "low bias detected"
    
    # Find most disadvantaged group (lowest selection rate)
    if groups:
        min_sel = min(groups, key=lambda x: x['selection_rate'])
        max_sel = max(groups, key=lambda x: x['selection_rate'])
        gap = (max_sel['selection_rate'] - min_sel['selection_rate']) * 100
        summary = (f"Analysis of {target_col} prediction across {sensitive_col} groups shows {verdict}. "
                   f"The demographic parity difference is {dp_diff*100:.1f}% and equalized odds difference is {eo_diff*100:.1f}%. "
                   f"The group '{min_sel['group']}' has a selection rate of {min_sel['selection_rate']*100:.1f}%, "
                   f"which is {gap:.1f} percentage points lower than the highest group '{max_sel['group']}'. "
                   f"This suggests potential unfair disadvantage for {min_sel['group']} individuals.")
    else:
        summary = f"Analysis complete. Demographic parity difference: {dp_diff*100:.1f}%, equalized odds difference: {eo_diff*100:.1f}%."
    
    return summary

# ------------------------------------------------------------------
# MASTER FUNCTION: run_bias_analysis
# ------------------------------------------------------------------
def run_bias_analysis(file_path: str, target_col: str, sensitive_col: str) -> dict:
    """
    Master function: load data, preprocess, train model, compute bias metrics,
    and return complete fairness report.
    
    Args:
        file_path: Path to CSV file
        target_col: Name of target column (binary)
        sensitive_col: Name of sensitive attribute column
        
    Returns:
        dict containing:
        - accuracy, demographic_parity_diff, equalized_odds_diff
        - bias_level, bias_color
        - overall_metrics, by_group
        - summary
        - metadata (target_col, sensitive_col, row_count)
    """
    print("\n" + "="*60)
    print("FairLens Bias Detector - Starting Analysis")
    print("="*60)
    
    # Step 1: Load dataset
    df = load_dataset(file_path)
    
    # Step 2: Preprocess
    X, y, sensitive = preprocess(df, target_col, sensitive_col)
    
    # Step 3: Train/test split (80/20)
    X_train, X_test, y_train, y_test, sensitive_train, sensitive_test = train_test_split(
        X, y, sensitive, test_size=0.2, random_state=42, stratify=y
    )
    print(f"[✓] Train/test split: {X_train.shape[0]} train, {X_test.shape[0]} test")
    
    # Step 4: Train model
    model = train_model(X_train, y_train)
    
    # Step 5: Compute metrics
    metrics = compute_bias_metrics(model, X_test, y_test, sensitive_test)
    
    # Step 6: Determine bias level and color
    dp_abs = abs(metrics['demographic_parity_diff'])
    eo_abs = abs(metrics['equalized_odds_diff'])
    if dp_abs > 0.2 or eo_abs > 0.15:
        bias_level = "HIGH"
        bias_color = "red"
    elif dp_abs > 0.1 or eo_abs > 0.08:
        bias_level = "MODERATE"
        bias_color = "amber"
    else:
        bias_level = "LOW"
        bias_color = "green"
    
    # Step 7: Generate summary
    summary = generate_summary(metrics, sensitive_col, target_col)
    
    # Step 8: Build final result
    result = {
        'accuracy': metrics['accuracy'],
        'demographic_parity_diff': metrics['demographic_parity_diff'],
        'equalized_odds_diff': metrics['equalized_odds_diff'],
        'bias_level': bias_level,
        'bias_color': bias_color,
        'overall_metrics': metrics['overall_metrics'],
        'by_group': metrics['by_group'],
        'summary': summary,
        'target_col': target_col,
        'sensitive_col': sensitive_col,
        'row_count': len(df)
    }
    
    print("\n" + "="*60)
    print(f"Analysis Complete. Bias Level: {bias_level}")
    print("="*60 + "\n")
    
    return result