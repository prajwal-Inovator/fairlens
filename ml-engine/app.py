

import os
import tempfile
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback

# Import core modules
from core.bias_detector import run_bias_analysis
from core.explainer import explain_model
from core.fair_model import mitigate_bias
from core.preprocessor import load_dataset, preprocess

# ------------------------------------------------------------------
# INITIALIZE FLASK APP
# ------------------------------------------------------------------
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:4000"])

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
UPLOAD_FOLDER = tempfile.gettempdir()
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Sample datasets metadata
SAMPLE_DATASETS = {
    'adult_income': {
        'file': 'datasets/adult_income.csv',
        'description': 'UCI Adult Income dataset (48,842 rows)',
        'default_target': 'income',
        'default_sensitive': 'sex'
    },
    'german_credit': {
        'file': 'datasets/german_credit.csv',
        'description': 'UCI German Credit dataset (1,000 rows)',
        'default_target': 'credit_risk',
        'default_sensitive': 'sex'
    },
    'compas': {
        'file': 'datasets/compas.csv',
        'description': 'ProPublica COMPAS dataset (7,214 rows)',
        'default_target': 'two_year_recid',
        'default_sensitive': 'race'
    }
}

# ------------------------------------------------------------------
# HELPER: Save uploaded file
# ------------------------------------------------------------------
def save_uploaded_file(file):
    """Save uploaded file to temporary location and return path."""
    if file.filename == '':
        raise ValueError('No file selected')
    if not file.filename.endswith('.csv'):
        raise ValueError('Only CSV files are allowed')
    
    temp_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(temp_path)
    return temp_path

# ------------------------------------------------------------------
# HELPER: Get sample dataset path
# ------------------------------------------------------------------
def get_sample_path(name):
    """Get absolute path to sample dataset CSV."""
    if name not in SAMPLE_DATASETS:
        raise ValueError(f'Unknown sample dataset: {name}')
    # Assume datasets folder is in same directory as app.py
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, SAMPLE_DATASETS[name]['file'])

# ------------------------------------------------------------------
# ENDPOINT: GET /api/health
# ------------------------------------------------------------------
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'fairlens-ml-engine',
        'version': '1.0.0'
    })

# ------------------------------------------------------------------
# ENDPOINT: POST /api/columns
# ------------------------------------------------------------------
@app.route('/api/columns', methods=['POST'])
def get_columns():
    """
    Get column names from uploaded CSV.
    Expects multipart/form-data with field 'file'.
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        temp_path = save_uploaded_file(file)
        
        df = pd.read_csv(temp_path)
        columns = df.columns.tolist()
        
        # Clean up temp file
        os.unlink(temp_path)
        
        return jsonify({'columns': columns})
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ------------------------------------------------------------------
# ENDPOINT: POST /api/analyze
# ------------------------------------------------------------------
@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Run full bias analysis.
    Expects multipart/form-data with fields:
        - file (CSV)
        - targetCol (string)
        - sensitiveCol (string)
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        target_col = request.form.get('targetCol')
        sensitive_col = request.form.get('sensitiveCol')
        
        if not target_col or not sensitive_col:
            return jsonify({'error': 'Missing targetCol or sensitiveCol'}), 400
        
        temp_path = save_uploaded_file(file)
        
        # Run bias analysis
        result = run_bias_analysis(temp_path, target_col, sensitive_col)
        
        # Clean up
        os.unlink(temp_path)
        
        return jsonify(result)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ------------------------------------------------------------------
# ENDPOINT: POST /api/explain
# ------------------------------------------------------------------
@app.route('/api/explain', methods=['POST'])
def explain():
    """
    Generate SHAP explanations for model predictions.
    Expects multipart/form-data with fields:
        - file (CSV)
        - targetCol (string)
        - sensitiveCol (string)
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        target_col = request.form.get('targetCol')
        sensitive_col = request.form.get('sensitiveCol')
        
        if not target_col or not sensitive_col:
            return jsonify({'error': 'Missing targetCol or sensitiveCol'}), 400
        
        temp_path = save_uploaded_file(file)
        
        # Load and preprocess
        df = pd.read_csv(temp_path)
        X, y, sensitive = preprocess(df, target_col, sensitive_col)
        
        # Train model (simple logistic regression for explanation)
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import train_test_split
        
        X_train, X_test, y_train, y_test, sensitive_train, sensitive_test = train_test_split(
            X, y, sensitive, test_size=0.3, random_state=42
        )
        
        model = LogisticRegression(max_iter=1000, random_state=42)
        model.fit(X_train, y_train)
        
        # Get SHAP explanations
        shap_result = explain_model(model, X_train, X_test, X.columns.tolist(), sensitive_test)
        
        # Clean up
        os.unlink(temp_path)
        
        return jsonify(shap_result)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ------------------------------------------------------------------
# ENDPOINT: POST /api/mitigate
# ------------------------------------------------------------------
@app.route('/api/mitigate', methods=['POST'])
def mitigate():
    """
    Apply fairness mitigation (ExponentiatedGradient) to model.
    Expects multipart/form-data with fields:
        - file (CSV)
        - targetCol (string)
        - sensitiveCol (string)
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        target_col = request.form.get('targetCol')
        sensitive_col = request.form.get('sensitiveCol')
        
        if not target_col or not sensitive_col:
            return jsonify({'error': 'Missing targetCol or sensitiveCol'}), 400
        
        temp_path = save_uploaded_file(file)
        
        # Run mitigation
        result = mitigate_bias(temp_path, target_col, sensitive_col)
        
        # Clean up
        os.unlink(temp_path)
        
        return jsonify(result)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ------------------------------------------------------------------
# SAMPLE DATASET ENDPOINTS
# ------------------------------------------------------------------
@app.route('/api/sample/<name>', methods=['GET'])
def get_sample_info(name):
    """Get metadata for a sample dataset."""
    if name not in SAMPLE_DATASETS:
        return jsonify({'error': 'Sample not found'}), 404
    return jsonify({
        'name': name,
        'description': SAMPLE_DATASETS[name]['description'],
        'default_target': SAMPLE_DATASETS[name]['default_target'],
        'default_sensitive': SAMPLE_DATASETS[name]['default_sensitive']
    })

@app.route('/api/sample/<name>/columns', methods=['GET'])
def get_sample_columns(name):
    """Get column names from sample dataset."""
    try:
        if name not in SAMPLE_DATASETS:
            return jsonify({'error': 'Sample not found'}), 404
        file_path = get_sample_path(name)
        df = pd.read_csv(file_path)
        return jsonify({'columns': df.columns.tolist()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sample/<name>/analyze', methods=['GET'])
def analyze_sample(name):
    """Run bias analysis on sample dataset."""
    try:
        if name not in SAMPLE_DATASETS:
            return jsonify({'error': 'Sample not found'}), 404
        
        target_col = request.args.get('targetCol')
        sensitive_col = request.args.get('sensitiveCol')
        
        if not target_col or not sensitive_col:
            return jsonify({'error': 'Missing targetCol or sensitiveCol'}), 400
        
        file_path = get_sample_path(name)
        result = run_bias_analysis(file_path, target_col, sensitive_col)
        return jsonify(result)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/sample/<name>/explain', methods=['GET'])
def explain_sample(name):
    """Get SHAP explanations for sample dataset."""
    try:
        if name not in SAMPLE_DATASETS:
            return jsonify({'error': 'Sample not found'}), 404
        
        target_col = request.args.get('targetCol')
        sensitive_col = request.args.get('sensitiveCol')
        
        if not target_col or not sensitive_col:
            return jsonify({'error': 'Missing targetCol or sensitiveCol'}), 400
        
        file_path = get_sample_path(name)
        df = pd.read_csv(file_path)
        X, y, sensitive = preprocess(df, target_col, sensitive_col)
        
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import train_test_split
        
        X_train, X_test, y_train, y_test, sensitive_train, sensitive_test = train_test_split(
            X, y, sensitive, test_size=0.3, random_state=42
        )
        
        model = LogisticRegression(max_iter=1000, random_state=42)
        model.fit(X_train, y_train)
        
        shap_result = explain_model(model, X_train, X_test, X.columns.tolist(), sensitive_test)
        return jsonify(shap_result)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/sample/<name>/mitigate', methods=['GET'])
def mitigate_sample(name):
    """Apply fairness mitigation to sample dataset."""
    try:
        if name not in SAMPLE_DATASETS:
            return jsonify({'error': 'Sample not found'}), 404
        
        target_col = request.args.get('targetCol')
        sensitive_col = request.args.get('sensitiveCol')
        
        if not target_col or not sensitive_col:
            return jsonify({'error': 'Missing targetCol or sensitiveCol'}), 400
        
        file_path = get_sample_path(name)
        result = mitigate_bias(file_path, target_col, sensitive_col)
        return jsonify(result)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------
if __name__ == '__main__':
    print("[✓] Starting FairLens ML Engine...")
    print(f"    Sample datasets available: {list(SAMPLE_DATASETS.keys())}")
    app.run(host='0.0.0.0', port=5000, debug=True)