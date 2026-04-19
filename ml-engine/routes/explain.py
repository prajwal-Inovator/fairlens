

import os
import tempfile
import pandas as pd
import numpy as np
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import traceback

# Import core modules
from core.explainer import explain_model
from core.preprocessor import preprocess

# ------------------------------------------------------------------
# BLUEPRINT INITIALIZATION
# ------------------------------------------------------------------
explain_bp = Blueprint('explain', __name__)

# Configuration
ALLOWED_EXTENSIONS = {'csv'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# ------------------------------------------------------------------
# HELPER: allowed_file
# ------------------------------------------------------------------
def allowed_file(filename: str) -> bool:
    """
    Check if file has a CSV extension.
    
    Args:
        filename: Name of the uploaded file
        
    Returns:
        True if file extension is .csv, False otherwise
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ------------------------------------------------------------------
# HELPER: save_uploaded_file
# ------------------------------------------------------------------
def save_uploaded_file(file) -> str:
    """
    Save uploaded file to temporary location.
    
    Args:
        file: Flask file object from request.files
        
    Returns:
        Path to saved temporary file
        
    Raises:
        ValueError: If file is invalid or empty
    """
    if file.filename == '':
        raise ValueError('No file selected')
    
    if not allowed_file(file.filename):
        raise ValueError(f'Invalid file type. Only {", ".join(ALLOWED_EXTENSIONS)} allowed')
    
    filename = secure_filename(file.filename)
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"fairlens_explain_{os.urandom(8).hex()}_{filename}")
    file.save(temp_path)
    
    # Check file size
    if os.path.getsize(temp_path) > MAX_FILE_SIZE:
        os.unlink(temp_path)
        raise ValueError(f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB')
    
    return temp_path

# ------------------------------------------------------------------
# HELPER: train_model_for_shap
# ------------------------------------------------------------------
def train_model_for_shap(X_train, y_train):
    """
    Train a simple logistic regression model for SHAP explanation.
    This is a lightweight model suitable for explanation purposes.
    
    Args:
        X_train: Training features (DataFrame or numpy array)
        y_train: Training labels (Series or numpy array)
        
    Returns:
        Trained sklearn LogisticRegression model
    """
    from sklearn.linear_model import LogisticRegression
    
    model = LogisticRegression(
        max_iter=1000,
        random_state=42,
        class_weight='balanced'  # Helps with imbalanced datasets
    )
    model.fit(X_train, y_train)
    return model

# ------------------------------------------------------------------
# ROUTE: POST /explain/analyze
# ------------------------------------------------------------------
@explain_bp.route('/explain/analyze', methods=['POST'])
def analyze_explain():
    """
    Generate SHAP explanations for an uploaded CSV model.
    
    Expects multipart/form-data with fields:
        - file: CSV file (required)
        - targetCol: Name of target column (required)
        - sensitiveCol: Name of sensitive attribute column (required)
    
    Returns:
        JSON with SHAP results:
        {
            "top_features": [{"feature": str, "importance": float, "direction": str}],
            "per_group_shap": {"group_name": [{"feature": str, "importance": float, "direction": str}]},
            "explanation": str
        }
    """
    temp_path = None
    try:
        # Validate file presence
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        # Validate form fields
        target_col = request.form.get('targetCol')
        sensitive_col = request.form.get('sensitiveCol')
        
        if not target_col or not sensitive_col:
            return jsonify({'error': 'Missing required fields: targetCol, sensitiveCol'}), 400
        
        # Save uploaded file
        temp_path = save_uploaded_file(file)
        print(f"[✓] File saved to {temp_path}")
        
        # Load and preprocess data
        df = pd.read_csv(temp_path)
        print(f"[✓] Loaded DataFrame with shape {df.shape}")
        
        X, y, sensitive = preprocess(df, target_col, sensitive_col)
        print(f"[✓] Preprocessed: X shape {X.shape}, y shape {y.shape}, sensitive shape {sensitive.shape}")
        
        # Train model (simple logistic regression for SHAP)
        from sklearn.model_selection import train_test_split
        
        X_train, X_test, y_train, y_test, sensitive_train, sensitive_test = train_test_split(
            X, y, sensitive, test_size=0.3, random_state=42, stratify=y
        )
        
        model = train_model_for_shap(X_train, y_train)
        print(f"[✓] Model trained with accuracy {model.score(X_test, y_test):.3f}")
        
        # Get SHAP explanations
        feature_names = X.columns.tolist()
        shap_result = explain_model(model, X_train, X_test, feature_names, sensitive_test)
        print(f"[✓] SHAP explanations generated")
        
        return jsonify(shap_result)
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"[✗] Error in /explain/analyze: {traceback.format_exc()}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
            print(f"[✓] Cleaned up temp file: {temp_path}")

# ------------------------------------------------------------------
# ROUTE: GET /explain/sample/<name>
# ------------------------------------------------------------------
@explain_bp.route('/explain/sample/<name>', methods=['GET'])
def explain_sample(name: str):
    """
    Generate SHAP explanations for a built-in sample dataset.
    
    Query parameters:
        - targetCol (required): Target column name
        - sensitiveCol (required): Sensitive attribute column name
    
    Args:
        name: Sample dataset identifier ('adult_income', 'german_credit', 'compas')
    
    Returns:
        JSON with SHAP results (same structure as POST endpoint)
    """
    try:
        target_col = request.args.get('targetCol')
        sensitive_col = request.args.get('sensitiveCol')
        
        if not target_col or not sensitive_col:
            return jsonify({'error': 'Missing query parameters: targetCol, sensitiveCol'}), 400
        
        # Map sample names to file paths
        sample_files = {
            'adult_income': 'datasets/adult_income.csv',
            'german_credit': 'datasets/german_credit.csv',
            'compas': 'datasets/compas.csv'
        }
        
        if name not in sample_files:
            return jsonify({'error': f'Unknown sample dataset: {name}. Available: {list(sample_files.keys())}'}), 404
        
        # Get absolute path to sample dataset
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        file_path = os.path.join(base_dir, sample_files[name])
        
        if not os.path.exists(file_path):
            return jsonify({'error': f'Sample dataset file not found: {sample_files[name]}'}), 500
        
        print(f"[✓] Loading sample dataset: {name} from {file_path}")
        
        # Load and preprocess
        df = pd.read_csv(file_path)
        X, y, sensitive = preprocess(df, target_col, sensitive_col)
        
        # Train/test split
        from sklearn.model_selection import train_test_split
        
        X_train, X_test, y_train, y_test, sensitive_train, sensitive_test = train_test_split(
            X, y, sensitive, test_size=0.3, random_state=42, stratify=y
        )
        
        # Train model
        model = train_model_for_shap(X_train, y_train)
        print(f"[✓] Model trained for {name}")
        
        # Generate SHAP explanations
        feature_names = X.columns.tolist()
        shap_result = explain_model(model, X_train, X_test, feature_names, sensitive_test)
        
        return jsonify(shap_result)
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"[✗] Error in /explain/sample/{name}: {traceback.format_exc()}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

# ------------------------------------------------------------------
# ROUTE: GET /explain/health
# ------------------------------------------------------------------
@explain_bp.route('/explain/health', methods=['GET'])
def health():
    """Health check for explain blueprint."""
    return jsonify({'status': 'ok', 'blueprint': 'explain'})