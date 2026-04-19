

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Upload,
    Settings,
    AlertCircle,
    CheckCircle,
    Loader2,
    ArrowLeft,
    Brain,
    Shield,
    BarChart3
} from 'lucide-react';
import FileUpload from '../components/FileUpload';
import BiasDashboard from '../components/BiasDashboard';
import ExplainerPanel from '../components/ExplainerPanel';
import BeforeAfter from '../components/BeforeAfter';
import FairnessScore from '../components/FairnessScore';
import * as api from '../api/fairlensApi'; // Will be implemented next

/**
 * ====================================================================
 * COMPONENT: Analyze
 * ====================================================================
 */
const Analyze = () => {
    const navigate = useNavigate();

    // ------------------------------------------------------------------
    // State Management
    // ------------------------------------------------------------------
    // Workflow stage: 'upload' | 'configure' | 'analyzing' | 'results'
    const [stage, setStage] = useState('upload');

    // File and dataset state
    const [selectedFile, setSelectedFile] = useState(null);
    const [sampleName, setSampleName] = useState(null);

    // Column selection
    const [availableColumns, setAvailableColumns] = useState([]);
    const [targetColumn, setTargetColumn] = useState('');
    const [sensitiveColumn, setSensitiveColumn] = useState('');
    const [columnError, setColumnError] = useState(null);

    // Results
    const [analysisResult, setAnalysisResult] = useState(null);
    const [shapResult, setShapResult] = useState(null);
    const [fairResult, setFairResult] = useState(null);

    // Loading & error states
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isExplaining, setIsExplaining] = useState(false);
    const [isMitigating, setIsMitigating] = useState(false);
    const [error, setError] = useState(null);

    // UI toggles
    const [showExplainer, setShowExplainer] = useState(false);
    const [showComparison, setShowComparison] = useState(false);

    // ------------------------------------------------------------------
    // Helper: Reset analysis state
    // ------------------------------------------------------------------
    const resetAnalysis = useCallback(() => {
        setAnalysisResult(null);
        setShapResult(null);
        setFairResult(null);
        setShowExplainer(false);
        setShowComparison(false);
        setError(null);
    }, []);

    // ------------------------------------------------------------------
    // Handle file upload (from FileUpload component)
    // ------------------------------------------------------------------
    const handleFileSelect = useCallback(async (file) => {
        if (!file) {
            setSelectedFile(null);
            setSampleName(null);
            setStage('upload');
            resetAnalysis();
            return;
        }

        setSelectedFile(file);
        setSampleName(null);
        setStage('loadingColumns');
        setError(null);
        resetAnalysis();

        try {
            // Fetch column names from backend
            const columns = await api.getColumns(file);
            setAvailableColumns(columns);
            setStage('configure');
        } catch (err) {
            console.error('Failed to fetch columns:', err);
            setError('Could not read CSV columns. Please check file format.');
            setStage('upload');
        }
    }, [resetAnalysis]);

    // ------------------------------------------------------------------
    // Handle sample dataset selection
    // ------------------------------------------------------------------
    const handleSampleSelect = useCallback(async (name) => {
        setSampleName(name);
        setSelectedFile(null);
        setStage('loadingColumns');
        setError(null);
        resetAnalysis();

        try {
            // For sample datasets, we still need column info
            const columns = await api.getSampleColumns(name);
            setAvailableColumns(columns);
            setStage('configure');
        } catch (err) {
            console.error('Failed to load sample:', err);
            setError('Could not load sample dataset.');
            setStage('upload');
        }
    }, [resetAnalysis]);

    // ------------------------------------------------------------------
    // Run bias analysis
    // ------------------------------------------------------------------
    const handleRunAnalysis = useCallback(async () => {
        if (!targetColumn || !sensitiveColumn) {
            setColumnError('Please select both target and sensitive columns');
            return;
        }

        setColumnError(null);
        setIsAnalyzing(true);
        setStage('analyzing');
        setError(null);

        try {
            let result;
            if (selectedFile) {
                result = await api.analyze(selectedFile, targetColumn, sensitiveColumn);
            } else if (sampleName) {
                result = await api.analyzeSample(sampleName, targetColumn, sensitiveColumn);
            } else {
                throw new Error('No file or sample selected');
            }

            setAnalysisResult(result);
            setStage('results');

            // Automatically fetch SHAP explanations after analysis
            setIsExplaining(true);
            try {
                const shap = await api.getExplanation(
                    selectedFile || sampleName,
                    targetColumn,
                    sensitiveColumn,
                    !!sampleName
                );
                setShapResult(shap);
            } catch (shapErr) {
                console.warn('SHAP explanation failed:', shapErr);
                // Don't block main results
            } finally {
                setIsExplaining(false);
            }

        } catch (err) {
            console.error('Analysis failed:', err);
            setError(err.message || 'Bias analysis failed. Please try again.');
            setStage('configure');
        } finally {
            setIsAnalyzing(false);
        }
    }, [targetColumn, sensitiveColumn, selectedFile, sampleName]);

    // ------------------------------------------------------------------
    // Apply fairness fix
    // ------------------------------------------------------------------
    const handleApplyFix = useCallback(async () => {
        if (!analysisResult) return;

        setIsMitigating(true);
        setError(null);

        try {
            let result;
            if (selectedFile) {
                result = await api.mitigate(selectedFile, targetColumn, sensitiveColumn);
            } else if (sampleName) {
                result = await api.mitigateSample(sampleName, targetColumn, sensitiveColumn);
            } else {
                throw new Error('No data source');
            }

            setFairResult(result);
            setShowComparison(true);
        } catch (err) {
            console.error('Mitigation failed:', err);
            setError('Fairness fix failed: ' + err.message);
        } finally {
            setIsMitigating(false);
        }
    }, [analysisResult, selectedFile, sampleName, targetColumn, sensitiveColumn]);

    // ------------------------------------------------------------------
    // Reset to original model (clear fair result)
    // ------------------------------------------------------------------
    const handleResetFair = useCallback(() => {
        setFairResult(null);
        setShowComparison(false);
    }, []);

    // ------------------------------------------------------------------
    // Render different stages
    // ------------------------------------------------------------------
    const renderContent = () => {
        switch (stage) {
            case 'upload':
                return (
                    <div className="max-w-3xl mx-auto">
                        <FileUpload
                            onFileSelect={handleFileSelect}
                            onSampleSelect={handleSampleSelect}
                            isLoading={false}
                        />
                        {error && (
                            <div className="mt-4 p-3 bg-red-900/30 border border-red-600 rounded text-red-300 text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}
                    </div>
                );

            case 'loadingColumns':
                return (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 mx-auto text-red-400 animate-spin" />
                        <p className="text-gray-400 mt-4">Loading dataset columns...</p>
                    </div>
                );

            case 'configure':
                return (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-gray-900/40 rounded-xl border border-gray-800 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Settings size={20} className="text-red-400" />
                                <h2 className="text-xl font-['Syne'] font-bold text-white">Configure Analysis</h2>
                            </div>

                            <div className="space-y-5">
                                {/* Target Column */}
                                <div>
                                    <label className="block text-sm font-['Syne'] text-gray-300 mb-2">
                                        Target Column (what the model predicts)
                                    </label>
                                    <select
                                        value={targetColumn}
                                        onChange={(e) => setTargetColumn(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:border-red-500 focus:outline-none transition-colors"
                                    >
                                        <option value="">Select target column...</option>
                                        {availableColumns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        e.g., income, credit_risk, two_year_recid
                                    </p>
                                </div>

                                {/* Sensitive Column */}
                                <div>
                                    <label className="block text-sm font-['Syne'] text-gray-300 mb-2">
                                        Sensitive Attribute (protected group)
                                    </label>
                                    <select
                                        value={sensitiveColumn}
                                        onChange={(e) => setSensitiveColumn(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:border-red-500 focus:outline-none transition-colors"
                                    >
                                        <option value="">Select sensitive column...</option>
                                        {availableColumns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        e.g., sex, race, age (groups to check for bias)
                                    </p>
                                </div>

                                {columnError && (
                                    <div className="text-red-400 text-sm flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        {columnError}
                                    </div>
                                )}

                                <button
                                    onClick={handleRunAnalysis}
                                    disabled={!targetColumn || !sensitiveColumn || isAnalyzing}
                                    className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-['Syne'] font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Shield size={18} />
                                            Run Bias Scan
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-900/30 border border-red-600 rounded text-red-300 text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                );

            case 'analyzing':
                return (
                    <div className="text-center py-16">
                        <Loader2 className="w-12 h-12 mx-auto text-red-400 animate-spin mb-4" />
                        <p className="text-gray-300 font-['Syne'] text-lg">Running bias analysis...</p>
                        <p className="text-gray-500 text-sm mt-2">Computing fairness metrics and SHAP values</p>
                    </div>
                );

            case 'results':
                return (
                    <div className="space-y-8">
                        {/* Fairness Score Header */}
                        <div className="flex flex-wrap justify-between items-start gap-4">
                            <div>
                                <button
                                    onClick={() => setStage('upload')}
                                    className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-4 transition-colors"
                                >
                                    <ArrowLeft size={14} /> New Analysis
                                </button>
                                <h1 className="text-2xl font-['Syne'] font-bold text-white">Audit Results</h1>
                                <p className="text-gray-500 text-sm mt-1">
                                    Target: {targetColumn} | Sensitive: {sensitiveColumn}
                                </p>
                            </div>
                            <FairnessScore
                                demographicParityDiff={analysisResult?.demographic_parity_diff || 0}
                                equalizedOddsDiff={analysisResult?.equalized_odds_diff || 0}
                                accuracy={analysisResult?.accuracy || 0}
                                size="md"
                                showLabel={false}
                            />
                        </div>

                        {/* Main Dashboard */}
                        <BiasDashboard
                            analysisResult={analysisResult}
                            onApplyFix={handleApplyFix}
                            isLoading={false}
                        />

                        {/* Explainer Toggle */}
                        <div className="border-t border-gray-800 pt-6">
                            <button
                                onClick={() => setShowExplainer(!showExplainer)}
                                className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors"
                            >
                                <Brain size={18} />
                                <span className="font-['Syne'] text-sm">
                                    {showExplainer ? 'Hide' : 'Show'} SHAP Explanations
                                </span>
                            </button>

                            {showExplainer && (
                                <div className="mt-4">
                                    {isExplaining ? (
                                        <div className="text-center py-8">
                                            <Loader2 className="w-6 h-6 mx-auto text-purple-400 animate-spin" />
                                            <p className="text-xs text-gray-500 mt-2">Computing SHAP values...</p>
                                        </div>
                                    ) : (
                                        <ExplainerPanel
                                            shapResult={shapResult}
                                            isLoading={false}
                                            targetCol={targetColumn}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Fairness Fix Comparison */}
                        {showComparison && fairResult && (
                            <div className="border-t border-gray-800 pt-6">
                                <BeforeAfter
                                    originalResult={analysisResult}
                                    fairResult={fairResult}
                                    isLoading={isMitigating}
                                    onReset={handleResetFair}
                                />
                            </div>
                        )}

                        {isMitigating && (
                            <div className="text-center py-8">
                                <Loader2 className="w-6 h-6 mx-auto text-green-400 animate-spin" />
                                <p className="text-gray-400 text-sm mt-2">Applying fairness fix...</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-900/30 border border-red-600 rounded text-red-300 text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    // ------------------------------------------------------------------
    // Main render
    // ------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#080809] to-[#0f0f12]">
            {/* Header */}
            <header className="border-b border-gray-800 bg-black/30 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 cursor-pointer group"
                    >
                        <BarChart3 className="w-5 h-5 text-red-500 group-hover:text-red-400 transition-colors" />
                        <span className="font-['Syne'] font-bold text-xl text-white">
                            Fair<span className="text-red-500">Lens</span>
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                        AI Bias Auditor
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {renderContent()}
            </main>
        </div>
    );
};

export default Analyze;