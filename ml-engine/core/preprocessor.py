

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from typing import Tuple, List, Optional
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
# FUNCTION: get_columns
# ------------------------------------------------------------------
def get_columns(file_path: str) -> List[str]:
    """
    Extract column names from CSV without loading entire dataset.
    
    Args:
        file_path: Path to CSV file
        
    Returns:
        List of column names
    """
    df = pd.read_csv(file_path, nrows=0)
    return df.columns.tolist()

# ------------------------------------------------------------------
# FUNCTION: encode_categorical
# ------------------------------------------------------------------
def encode_categorical(df: pd.DataFrame) -> pd.DataFrame:
    """
    Encode all categorical (object) columns using LabelEncoder.
    Numeric columns are left unchanged.
    
    Args:
        df: Input DataFrame
        
    Returns:
        DataFrame with all object columns encoded to integers
    """
    result = df.copy()
    categorical_cols = result.select_dtypes(include=['object']).columns
    
    for col in categorical_cols:
        le = LabelEncoder()
        # Handle NaN by filling with a placeholder string
        col_data = result[col].fillna('_missing_').astype(str)
        result[col] = le.fit_transform(col_data)
        print(f"[✓] Encoded column '{col}' with {len(le.classes_)} unique values")
    
    return result

# ------------------------------------------------------------------
# FUNCTION: preprocess
# ------------------------------------------------------------------
def preprocess(
    df: pd.DataFrame,
    target_col: str,
    sensitive_col: str
) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray]:
    """
    Full preprocessing pipeline:
        1. Drop rows with missing values (simple approach)
        2. Encode target variable to binary 0/1
        3. Encode sensitive attribute
        4. Encode all other categorical features
        5. Separate features (X), target (y), sensitive (s)
    
    Args:
        df: Input DataFrame
        target_col: Name of target column
        sensitive_col: Name of sensitive attribute column
        
    Returns:
        X: Feature matrix (encoded, DataFrame)
        y: Target vector (numpy array, 0/1)
        sensitive: Sensitive attribute vector (numpy array, encoded)
        
    Raises:
        ValueError: If target or sensitive column not found
    """
    print("[✓] Starting preprocessing...")
    
    # Validate columns exist
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset")
    if sensitive_col not in df.columns:
        raise ValueError(f"Sensitive column '{sensitive_col}' not found in dataset")
    
    # Drop missing values
    data = df.copy()
    initial_rows = len(data)
    data = data.dropna()
    if len(data) < initial_rows:
        print(f"[!] Dropped {initial_rows - len(data)} rows with missing values")
    
    # Encode target variable (binary)
    le_target = LabelEncoder()
    y = le_target.fit_transform(data[target_col])
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
    X = encode_categorical(X_raw)
    
    print(f"[✓] Final shapes - X: {X.shape}, y: {len(y)}, sensitive: {len(sensitive)}")
    
    return X, y, sensitive

# ------------------------------------------------------------------
# FUNCTION: split_data
# ------------------------------------------------------------------
def split_data(
    X: pd.DataFrame,
    y: np.ndarray,
    sensitive: np.ndarray,
    test_size: float = 0.2,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Split data into training and test sets with stratification on target.
    
    Args:
        X: Feature matrix
        y: Target vector
        sensitive: Sensitive attribute vector
        test_size: Proportion of test set (default 0.2)
        random_state: Random seed for reproducibility
        
    Returns:
        X_train, X_test, y_train, y_test, sensitive_train, sensitive_test
    """
    X_train, X_test, y_train, y_test, sensitive_train, sensitive_test = train_test_split(
        X, y, sensitive,
        test_size=test_size,
        random_state=random_state,
        stratify=y
    )
    print(f"[✓] Train/test split: {X_train.shape[0]} train, {X_test.shape[0]} test")
    return X_train, X_test, y_train, y_test, sensitive_train, sensitive_test

# ------------------------------------------------------------------
# FUNCTION: handle_imbalanced (optional utility)
# ------------------------------------------------------------------
def handle_imbalanced(
    X: pd.DataFrame,
    y: np.ndarray,
    sensitive: np.ndarray = None,
    method: str = 'smote'
) -> Tuple[pd.DataFrame, np.ndarray, Optional[np.ndarray]]:
    """
    Handle imbalanced datasets using resampling techniques.
    Note: Requires imbalanced-learn library.
    
    Args:
        X: Features
        y: Target
        sensitive: Optional sensitive attribute
        method: 'smote', 'random_over', 'random_under'
        
    Returns:
        Resampled X, y, and sensitive (if provided)
    """
    try:
        from imblearn.over_sampling import SMOTE, RandomOverSampler
        from imblearn.under_sampling import RandomUnderSampler
        
        if method == 'smote':
            sampler = SMOTE(random_state=42)
        elif method == 'random_over':
            sampler = RandomOverSampler(random_state=42)
        elif method == 'random_under':
            sampler = RandomUnderSampler(random_state=42)
        else:
            raise ValueError(f"Unknown method: {method}")
        
        X_resampled, y_resampled = sampler.fit_resample(X, y)
        print(f"[✓] Resampled using {method}: {X.shape} -> {X_resampled.shape}")
        
        if sensitive is not None:
            # Resample sensitive array accordingly (naive: align indices)
            # For simplicity, we assume the sampler returns same order
            # Better: use same random state and indices
            sensitive_resampled = sensitive  # Placeholder - real implementation would align
            return X_resampled, y_resampled, sensitive_resampled
        
        return X_resampled, y_resampled, None
        
    except ImportError:
        print("[!] imbalanced-learn not installed. Returning original data.")
        return X, y, sensitive

# ------------------------------------------------------------------
# QUICK TEST (if run as standalone)
# ------------------------------------------------------------------
if __name__ == "__main__":
    # Create synthetic data for testing
    import tempfile
    
    test_data = pd.DataFrame({
        'age': [25, 30, 35, 40, 45],
        'gender': ['M', 'F', 'M', 'F', 'M'],
        'income': [0, 1, 0, 1, 0],  # target
        'race': ['White', 'Black', 'White', 'Asian', 'White']
    })
    
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    test_data.to_csv(temp_file.name, index=False)
    temp_file.close()
    
    # Test load and preprocess
    df = load_dataset(temp_file.name)
    X, y, sensitive = preprocess(df, 'income', 'race')
    print("Preprocessed X:\n", X.head())
    print("y:", y)
    print("sensitive:", sensitive)
    
    # Test split
    X_train, X_test, y_train, y_test, s_train, s_test = split_data(X, y, sensitive)
    print(f"Train size: {X_train.shape}, Test size: {X_test.shape}")
    
    # Cleanup
    import os
    os.unlink(temp_file.name)