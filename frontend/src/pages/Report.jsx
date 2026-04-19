

import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Download,
    Printer,
    ArrowLeft,
    FileJson,
    Shield,
    AlertTriangle,
    CheckCircle,
    Scale,
    Users,
    Target,
    Brain
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import FairnessScore from '../components/FairnessScore';

/**
 * ====================================================================
 * HELPER: formatPercent
 * ====================================================================
 */
const formatPercent = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
};

/**
 * ====================================================================
 * HELPER: getBiasLevelBadge
 * ====================================================================
 */
const getBiasLevelBadge = (level) => {
    switch (level) {
        case 'HIGH':
            return { text: 'High Bias', color: 'red', icon: AlertTriangle };
        case 'MODERATE':
            return { text: 'Moderate Bias', color: 'amber', icon: Scale };
        case 'LOW':
            return { text: 'Low Bias', color: 'green', icon: CheckCircle };
        default:
            return { text: 'Unknown', color: 'gray', icon: Shield };
    }
};

/**
 * ====================================================================
 * COMPONENT: Report
 * ====================================================================
 */
const Report = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const reportRef = useRef();

    // Extract data from navigation state (or could fetch from API)
    const {
        analysisResult,
        shapResult,
        fairResult,
        targetCol = 'target',
        sensitiveCol = 'sensitive',
        datasetName = 'Uploaded Dataset',
        analysisTimestamp = new Date().toISOString()
    } = location.state || {};

    // If no data, show error/redirect
    if (!analysisResult) {
        return (
            <div className="min-h-screen bg-[#080809] flex items-center justify-center px-6">
                <div className="text-center">
                    <Shield className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h2 className="text-2xl font-['Syne'] font-bold text-white mb-2">No Report Data</h2>
                    <p className="text-gray-400 mb-6">Please run a bias analysis first.</p>
                    <button
                        onClick={() => navigate('/analyze')}
                        className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-['Syne'] font-semibold"
                    >
                        Go to Analyzer
                    </button>
                </div>
            </div>
        );
    }

    // Destructure analysis result
    const {
        accuracy = 0,
        demographic_parity_diff = 0,
        equalized_odds_diff = 0,
        bias_level = 'MODERATE',
        overall_metrics = {},
        by_group = [],
        summary = '',
        row_count = 0
    } = analysisResult;

    const biasBadge = getBiasLevelBadge(bias_level);
    const BiasIcon = biasBadge.icon;

    // Prepare chart data for selection rate
    const selectionRateData = by_group.map(g => ({
        group: g.group,
        rate: g.selection_rate || 0
    }));

    // Prepare FNR data
    const fnrData = by_group.map(g => ({
        group: g.group,
        rate: g.false_negative_rate || 0
    }));

    // ------------------------------------------------------------------
    // Export functions
    // ------------------------------------------------------------------
    const handlePrint = () => {
        window.print();
    };

    const handleDownloadJSON = () => {
        const reportData = {
            metadata: {
                datasetName,
                targetCol,
                sensitiveCol,
                timestamp: analysisTimestamp,
                rowCount: row_count
            },
            analysis: analysisResult,
            shap: shapResult || null,
            fairModel: fairResult || null
        };
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fairlens_report_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#080809] font-['DM_Mono']">
            {/* Header with actions */}
            <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10 print:bg-white print:border-black">
                <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
                        >
                            <Printer size={14} /> Print / PDF
                        </button>
                        <button
                            onClick={handleDownloadJSON}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
                        >
                            <FileJson size={14} /> Export JSON
                        </button>
                    </div>
                </div>
            </header>

            {/* Report Content */}
            <div ref={reportRef} className="max-w-5xl mx-auto px-6 py-8 print:px-4 print:py-4">

                {/* Title Section */}
                <div className="text-center mb-10 print:mb-6">
                    <h1 className="text-4xl font-['Syne'] font-bold text-white print:text-black mb-2">
                        FairLens <span className="text-red-500">Audit Report</span>
                    </h1>
                    <p className="text-gray-400 print:text-gray-600 text-sm">
                        Generated on {new Date(analysisTimestamp).toLocaleString()}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 bg-gray-800/50 print:bg-gray-100 rounded-full px-4 py-1.5 text-xs">
                        <Shield size={14} />
                        <span>{datasetName}</span>
                        <span className="text-gray-500">•</span>
                        <span>Target: {targetCol}</span>
                        <span className="text-gray-500">•</span>
                        <span>Sensitive: {sensitiveCol}</span>
                        <span className="text-gray-500">•</span>
                        <span>{row_count.toLocaleString()} rows</span>
                    </div>
                </div>

                {/* Executive Summary Card */}
                <div className="bg-gray-900/40 print:bg-gray-100 rounded-xl border border-gray-800 print:border-gray-300 p-6 mb-8">
                    <div className="flex flex-wrap gap-6 items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <BiasIcon size={20} className={`text-${biasBadge.color}-500`} />
                                <h2 className="text-xl font-['Syne'] font-bold text-white print:text-black">
                                    Executive Summary
                                </h2>
                            </div>
                            <p className="text-gray-300 print:text-gray-700 leading-relaxed text-sm">
                                {summary || `The model shows ${biasBadge.text.toLowerCase()} with a demographic parity difference of ${formatPercent(demographic_parity_diff)} and equalized odds difference of ${formatPercent(equalized_odds_diff)}. ${biasBadge.text === 'High Bias' ? 'Immediate mitigation is recommended.' : biasBadge.text === 'Moderate Bias' ? 'Consider applying fairness constraints.' : 'Fairness metrics are within acceptable ranges.'}`}
                            </p>
                        </div>
                        <div className="print:hidden">
                            <FairnessScore
                                demographicParityDiff={demographic_parity_diff}
                                equalizedOddsDiff={equalized_odds_diff}
                                accuracy={accuracy}
                                size="sm"
                                showLabel={false}
                            />
                        </div>
                        {/* Print version of score */}
                        <div className="hidden print:block text-right">
                            <div className="text-2xl font-bold">
                                {Math.round((1 - Math.min(1, Math.abs(demographic_parity_diff) / 0.3)) * 50 + (1 - Math.min(1, Math.abs(equalized_odds_diff) / 0.25)) * 50)}/100
                            </div>
                            <div className="text-xs">Fairness Score</div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-900/30 print:bg-gray-50 rounded-lg p-4 border border-gray-800 print:border-gray-300">
                        <div className="text-gray-400 print:text-gray-500 text-xs uppercase tracking-wider">Accuracy</div>
                        <div className="text-2xl font-bold text-white print:text-black mt-1">{formatPercent(accuracy)}</div>
                    </div>
                    <div className="bg-gray-900/30 print:bg-gray-50 rounded-lg p-4 border border-gray-800 print:border-gray-300">
                        <div className="text-gray-400 print:text-gray-500 text-xs uppercase tracking-wider">Demographic Parity Δ</div>
                        <div className={`text-2xl font-bold mt-1 ${Math.abs(demographic_parity_diff) > 0.2 ? 'text-red-400' : Math.abs(demographic_parity_diff) > 0.1 ? 'text-amber-400' : 'text-green-400'} print:text-black`}>
                            {formatPercent(demographic_parity_diff)}
                        </div>
                    </div>
                    <div className="bg-gray-900/30 print:bg-gray-50 rounded-lg p-4 border border-gray-800 print:border-gray-300">
                        <div className="text-gray-400 print:text-gray-500 text-xs uppercase tracking-wider">Equalized Odds Δ</div>
                        <div className={`text-2xl font-bold mt-1 ${Math.abs(equalized_odds_diff) > 0.15 ? 'text-red-400' : Math.abs(equalized_odds_diff) > 0.08 ? 'text-amber-400' : 'text-green-400'} print:text-black`}>
                            {formatPercent(equalized_odds_diff)}
                        </div>
                    </div>
                    <div className="bg-gray-900/30 print:bg-gray-50 rounded-lg p-4 border border-gray-800 print:border-gray-300">
                        <div className="text-gray-400 print:text-gray-500 text-xs uppercase tracking-wider">Overall Selection Rate</div>
                        <div className="text-2xl font-bold text-white print:text-black mt-1">{formatPercent(overall_metrics.selection_rate)}</div>
                    </div>
                </div>

                {/* Group Breakdown Table */}
                <div className="mb-8">
                    <h3 className="text-lg font-['Syne'] font-bold text-white print:text-black mb-4 flex items-center gap-2">
                        <Users size={18} /> Group Breakdown
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-gray-800/50 print:bg-gray-200">
                                <tr className="border-b border-gray-700 print:border-gray-300">
                                    <th className="px-4 py-3 text-left font-['Syne'] font-semibold text-gray-300 print:text-black">Group</th>
                                    <th className="px-4 py-3 text-left font-['Syne'] font-semibold text-gray-300 print:text-black">Selection Rate</th>
                                    <th className="px-4 py-3 text-left font-['Syne'] font-semibold text-gray-300 print:text-black">False Positive Rate</th>
                                    <th className="px-4 py-3 text-left font-['Syne'] font-semibold text-gray-300 print:text-black">False Negative Rate</th>
                                    <th className="px-4 py-3 text-left font-['Syne'] font-semibold text-gray-300 print:text-black">Accuracy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 print:divide-gray-300">
                                {by_group.map((group, idx) => (
                                    <tr key={idx} className="hover:bg-gray-800/20">
                                        <td className="px-4 py-3 font-mono text-gray-200 print:text-black">{group.group}</td>
                                        <td className="px-4 py-3 font-mono">{formatPercent(group.selection_rate)}</td>
                                        <td className="px-4 py-3 font-mono">{formatPercent(group.false_positive_rate)}</td>
                                        <td className="px-4 py-3 font-mono">{formatPercent(group.false_negative_rate)}</td>
                                        <td className="px-4 py-3 font-mono">{formatPercent(group.accuracy)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gray-900/30 print:bg-gray-50 rounded-xl p-4 border border-gray-800 print:border-gray-300">
                        <h4 className="text-sm font-['Syne'] font-semibold text-gray-300 print:text-black mb-3">Selection Rate by Group</h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={selectionRateData} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3f" print-stroke="#ccc" />
                                <XAxis type="number" tickFormatter={(v) => formatPercent(v)} stroke="#9ca3af" print-stroke="#666" />
                                <YAxis type="category" dataKey="group" stroke="#9ca3af" print-stroke="#666" />
                                <Tooltip formatter={(value) => formatPercent(value)} />
                                <Bar dataKey="rate" fill="#F59E0B" radius={[0, 4, 4, 0]}>
                                    {selectionRateData.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.rate < (overall_metrics.selection_rate || 0) ? '#EF4444' : '#F59E0B'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-gray-900/30 print:bg-gray-50 rounded-xl p-4 border border-gray-800 print:border-gray-300">
                        <h4 className="text-sm font-['Syne'] font-semibold text-gray-300 print:text-black mb-3">False Negative Rate by Group</h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={fnrData} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3f" print-stroke="#ccc" />
                                <XAxis type="number" tickFormatter={(v) => formatPercent(v)} stroke="#9ca3af" print-stroke="#666" />
                                <YAxis type="category" dataKey="group" stroke="#9ca3af" print-stroke="#666" />
                                <Tooltip formatter={(value) => formatPercent(value)} />
                                <Bar dataKey="rate" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SHAP Explanations (if available) */}
                {shapResult && shapResult.top_features && shapResult.top_features.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-['Syne'] font-bold text-white print:text-black mb-4 flex items-center gap-2">
                            <Brain size={18} /> Feature Importance (SHAP)
                        </h3>
                        <div className="bg-gray-900/30 print:bg-gray-50 rounded-xl p-4 border border-gray-800 print:border-gray-300">
                            <div className="space-y-2">
                                {shapResult.top_features.slice(0, 5).map((feat, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-300 print:text-black">{feat.feature}</span>
                                        <div className="flex items-center gap-3 w-2/3">
                                            <div className="flex-1 bg-gray-700 print:bg-gray-300 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${feat.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'}`}
                                                    style={{ width: `${feat.importance * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-mono text-gray-400 print:text-gray-600">{formatPercent(feat.importance)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 print:text-gray-500 mt-3">{shapResult.explanation || 'SHAP values show each feature\'s contribution to predictions.'}</p>
                        </div>
                    </div>
                )}

                {/* Fairness Fix Comparison (if applied) */}
                {fairResult && (
                    <div className="mb-8">
                        <h3 className="text-lg font-['Syne'] font-bold text-white print:text-black mb-4 flex items-center gap-2">
                            <Shield size={18} /> Fairness Mitigation Results
                        </h3>
                        <div className="bg-gray-900/30 print:bg-gray-50 rounded-xl p-5 border border-green-800/30 print:border-green-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <div className="text-xs text-gray-400 print:text-gray-500">Demographic Parity</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-red-400 line-through text-sm">{formatPercent(demographic_parity_diff)}</span>
                                        <span className="text-green-400 font-bold">{formatPercent(fairResult.fair_dp_diff)}</span>
                                        <span className="text-xs text-green-400">(-{fairResult.improvement_dp?.toFixed(0)}%)</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 print:text-gray-500">Equalized Odds</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-red-400 line-through text-sm">{formatPercent(equalized_odds_diff)}</span>
                                        <span className="text-green-400 font-bold">{formatPercent(fairResult.fair_eo_diff)}</span>
                                        <span className="text-xs text-green-400">(-{fairResult.improvement_eo?.toFixed(0)}%)</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 print:text-gray-500">Accuracy</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-gray-400 text-sm">{formatPercent(accuracy)}</span>
                                        <span className="text-amber-400 font-bold">{formatPercent(fairResult.fair_accuracy)}</span>
                                        <span className="text-xs text-amber-400">({((fairResult.fair_accuracy - accuracy) * 100).toFixed(1)}%)</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300 print:text-gray-700">{fairResult.summary || `Fairness improved by ${fairResult.improvement_dp?.toFixed(0)}% in DP and ${fairResult.improvement_eo?.toFixed(0)}% in EO with ${Math.abs((fairResult.fair_accuracy - accuracy) * 100).toFixed(1)}% accuracy change.`}</p>
                            <p className="text-xs text-gray-500 print:text-gray-400 mt-2">Method: {fairResult.method_used || 'ExponentiatedGradient'}</p>
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                <div className="bg-gray-900/20 print:bg-gray-50 rounded-xl p-5 border border-gray-700 print:border-gray-300">
                    <h3 className="text-md font-['Syne'] font-bold text-white print:text-black mb-2 flex items-center gap-2">
                        <AlertTriangle size={16} /> Recommendations
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 print:text-gray-700">
                        {Math.abs(demographic_parity_diff) > 0.2 && (
                            <li>Demographic parity difference exceeds 0.2 — consider reweighting or adversarial debiasing.</li>
                        )}
                        {Math.abs(equalized_odds_diff) > 0.15 && (
                            <li>Equalized odds difference is high — the model treats groups differently in error rates.</li>
                        )}
                        {by_group.some(g => (g.false_negative_rate || 0) > 0.3) && (
                            <li>High false negative rates for some groups may cause unfair denial of opportunities.</li>
                        )}
                        {!fairResult && (Math.abs(demographic_parity_diff) > 0.1 || Math.abs(equalized_odds_diff) > 0.08) && (
                            <li>Apply the fairness fix (ExponentiatedGradient) to reduce bias with minimal accuracy loss.</li>
                        )}
                        {fairResult && (fairResult.improvement_dp > 50 || fairResult.improvement_eo > 50) && (
                            <li>The mitigated model shows significant fairness improvement — consider deploying it.</li>
                        )}
                        {(Math.abs(demographic_parity_diff) <= 0.1 && Math.abs(equalized_odds_diff) <= 0.08) && (
                            <li>Fairness metrics are within acceptable ranges. Continue monitoring for data drift.</li>
                        )}
                    </ul>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-500 print:text-gray-400 mt-10 pt-4 border-t border-gray-800 print:border-gray-300">
                    FairLens AI Bias Auditor — Generated by FairLens v1.0. Metrics based on Fairlearn and SHAP.
                    This report is for informational purposes and should be reviewed by domain experts.
                </div>
            </div>
        </div>
    );
};

export default Report;