

import os
import tempfile
import pandas as pd
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import traceback

# Import core modules
from core.bias_detector import run_bias_analysis
from core.preprocessor import get_columns as get_csv_columns

# ------------------------------------------------------------------
# BLUEPRINT INITIALIZATION
# ------------------------------------------------------------------
scan_bp = Blueprint('scan', __name__)

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
    temp_path = os.path.join(temp_dir, f"fairlens_scan_{os.urandom(8).hex()}_{filename}")
    file.save(temp_path)
    
    # Check file size (after saving)
    if os.path.getsize(temp_path) > MAX_FILE_SIZE:
        os.unlink(temp_path)
        raise ValueError(f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB')
    
    return temp_path

# ------------------------------------------------------------------
# ROUTE: POST /scan/analyze
# ------------------------------------------------------------------
@scan_bp.route('/scan/analyze', methods=['POST'])
def analyze_upload():
    """
    Run bias analysis on uploaded CSV file.
    
    Expects multipart/form-data with fields:
        - file: CSV file (required)
        - targetCol: Name of target column (required)
        - sensitiveCol: Name of sensitive attribute column (required)
    
    Returns:
        JSON with bias analysis results (see bias_detector.py output)
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
        
        # Run bias analysis
        result = run_bias_analysis(temp_path, target_col, sensitive_col)
        print(f"[✓] Bias analysis completed for {target_col} vs {sensitive_col}")
        
        return jsonify(result)
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"[✗] Error in /scan/analyze: {traceback.format_exc()}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
            print(f"[✓] Cleaned up temp file: {temp_path}")

# ------------------------------------------------------------------
# ROUTE: GET /scan/sample/<name>
# ------------------------------------------------------------------
@scan_bp.route('/scan/sample/<name>', methods=['GET'])
def analyze_sample(name: str):
    """
    Run bias analysis on a built-in sample dataset.
    
    Query parameters:
        - targetCol (required): Target column name
        - sensitiveCol (required): Sensitive attribute column name
    
    Args:
        name: Sample dataset identifier ('adult_income', 'german_credit', 'compas')
    
    Returns:
        JSON with bias analysis results
    """
    try:
        target_col = request.args.get('targetCol')
        sensitive_col = request.args.get('sensitiveCol')
        
        if not target_col or not sensitive_col:
            return jsonify({'error': 'Missing query parameters: targetCol, sensitiveCol'}), 400
        
        # Map sample names to file paths (relative to ml-engine directory)
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
        
        # Run bias analysis
        result = run_bias_analysis(file_path, target_col, sensitive_col)
        print(f"[✓] Sample analysis completed for {name}")
        
        return jsonify(result)
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"[✗] Error in /scan/sample/{name}: {traceback.format_exc()}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

# ------------------------------------------------------------------
# ROUTE: POST /scan/columns (optional utility)
# ------------------------------------------------------------------
@scan_bp.route('/scan/columns', methods=['POST'])
def get_columns():
    """
    Extract column names from uploaded CSV without running full analysis.
    
    Expects multipart/form-data with field 'file'.
    
    Returns:
        JSON with list of column names
    """
    temp_path = None
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        temp_path = save_uploaded_file(file)
        
        # Use pandas to read only headers
        df = pd.read_csv(temp_path, nrows=0)
        columns = df.columns.tolist()
        
        return jsonify({'columns': columns})
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"[✗] Error in /scan/columns: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)

# ------------------------------------------------------------------
# ROUTE: GET /scan/health (sub-endpoint for blueprint health)
# ------------------------------------------------------------------
@scan_bp.route('/scan/health', methods=['GET'])
def health():
    """Health check for scan blueprint."""
    return jsonify({'status': 'ok', 'blueprint': 'scan'})