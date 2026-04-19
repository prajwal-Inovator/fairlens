

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Database, FileUp, Trash2 } from 'lucide-react';

/**
 * ====================================================================
 * COMPONENT: FileUpload
 * ====================================================================
 * 
 * @param {Object} props
 * @param {Function} props.onFileSelect - Callback when user selects a file (receives File object)
 * @param {Function} props.onSampleSelect - Callback when user clicks a sample dataset (receives string name)
 * @param {boolean} props.isLoading - Disables interactions while analysis is running
 * @param {string[]} props.acceptedFormats - Allowed file extensions (default: ['.csv'])
 * @param {string} props.label - Optional label text for the upload area
 * 
 * @returns {JSX.Element}
 */
const FileUpload = ({
    onFileSelect,
    onSampleSelect,
    isLoading = false,
    acceptedFormats = ['.csv'],
    label = 'Upload dataset (CSV)'
}) => {
    // ------------------------------------------------------------------
    // STATE
    // ------------------------------------------------------------------
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState(null);

    // Ref for hidden file input
    const fileInputRef = useRef(null);

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------
    const validateFile = (file) => {
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!acceptedFormats.includes(extension)) {
            setError(`Invalid file type. Please upload ${acceptedFormats.join(', ')}`);
            return false;
        }
        if (file.size > 100 * 1024 * 1024) { // 100MB limit
            setError('File too large. Maximum size is 100MB.');
            return false;
        }
        setError(null);
        return true;
    };

    const handleFile = (file) => {
        if (!validateFile(file)) return;
        setSelectedFile(file);
        if (onFileSelect) onFileSelect(file);
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (isLoading) return;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    }, [isLoading, onFileSelect]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading) setDragActive(true);
    }, [isLoading]);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }, []);

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Optionally notify parent that file was cleared
        if (onFileSelect) onFileSelect(null);
    };

    const triggerFileDialog = () => {
        if (!isLoading) fileInputRef.current?.click();
    };

    // ------------------------------------------------------------------
    // SAMPLE DATASETS
    // ------------------------------------------------------------------
    const sampleDatasets = [
        { name: 'adult_income', display: '🏦 Adult Income (Hiring Bias)', desc: '48k rows, gender bias in income prediction' },
        { name: 'german_credit', display: '💳 German Credit (Loan Bias)', desc: '1k rows, gender disparity in credit' },
        { name: 'compas', display: '⚖️ COMPAS (Criminal Risk)', desc: '7k rows, racial bias in recidivism' }
    ];

    // ------------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------------
    return (
        <div className="w-full max-w-3xl mx-auto font-['DM_Mono']">
            {/* Label & hint */}
            <div className="mb-3 flex justify-between items-center">
                <label className="text-sm uppercase tracking-wider text-gray-400 font-['Syne']">
                    {label}
                </label>
                <span className="text-xs text-gray-500">
                    Accepted: {acceptedFormats.join(', ')} up to 100MB
                </span>
            </div>

            {/* Drag-and-drop zone */}
            <div
                className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-200
          ${dragActive ? 'border-red-500 bg-red-500/5' : 'border-gray-700 bg-gray-900/30'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-red-400 hover:bg-gray-800/20'}
          ${selectedFile ? 'bg-green-900/10 border-green-600' : ''}
        `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileDialog}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptedFormats.join(',')}
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={isLoading}
                />

                <div className="text-center pointer-events-none">
                    {selectedFile ? (
                        <>
                            <FileUp className="w-12 h-12 mx-auto text-green-400 mb-3" />
                            <p className="text-green-400 font-mono text-sm break-all">
                                {selectedFile.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearSelectedFile();
                                }}
                                className="pointer-events-auto mt-4 inline-flex items-center gap-1 text-xs bg-gray-800 hover:bg-red-900/50 text-gray-300 hover:text-red-400 px-3 py-1 rounded transition-colors"
                            >
                                <Trash2 size={12} /> Remove
                            </button>
                        </>
                    ) : (
                        <>
                            <Upload className={`w-12 h-12 mx-auto mb-3 ${dragActive ? 'text-red-500' : 'text-gray-500'}`} />
                            <p className="text-gray-300 font-['Syne'] font-medium">
                                {dragActive ? 'Drop your CSV file here' : 'Drag & drop or click to browse'}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                CSV file with sensitive attributes (e.g., sex, race, age)
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="mt-3 p-2 bg-red-900/30 border border-red-600 rounded text-red-300 text-xs flex items-center gap-2">
                    <X size={14} />
                    {error}
                </div>
            )}

            {/* Sample datasets section */}
            <div className="mt-8">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                    <Database size={16} />
                    <span className="font-['Syne'] uppercase tracking-wider">Or try a sample dataset</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {sampleDatasets.map((ds) => (
                        <button
                            key={ds.name}
                            onClick={() => {
                                if (!isLoading && onSampleSelect) {
                                    clearSelectedFile(); // clear any uploaded file when sample chosen
                                    onSampleSelect(ds.name);
                                }
                            }}
                            disabled={isLoading}
                            className={`
                text-left p-3 rounded-lg border border-gray-800 bg-gray-900/20
                transition-all duration-150
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500/50 hover:bg-gray-800/40 cursor-pointer'}
              `}
                        >
                            <div className="font-['Syne'] font-semibold text-sm text-gray-200">
                                {ds.display}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 font-mono">
                                {ds.desc}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading overlay hint (optional) */}
            {isLoading && (
                <div className="mt-4 text-center text-xs text-amber-400 animate-pulse">
                    Processing... please wait
                </div>
            )}
        </div>
    );
};

export default FileUpload;