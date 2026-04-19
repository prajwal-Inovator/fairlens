

import React, { useMemo } from 'react';
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
import {
    AlertTriangle,
    CheckCircle,
    Scale,
    BarChart3,
    TrendingUp,
    Shield,
    Users,
    Target
} from 'lucide-react';

/**
 * ====================================================================
 * HELPER: getBiasVerdict
 * ====================================================================
 * Returns verdict object based on bias_level and metrics.
 * @param {string} biasLevel - "HIGH" | "MODERATE" | "LOW"
 * @param {number} dpDiff - demographic parity difference (absolute)
 * @param {number} eoDiff - equalized odds difference (absolute)
 * @returns {Object} { label, color, icon, description }
 */
const getBiasVerdict = (biasLevel, dpDiff, eoDiff) => {
    const absDp = Math.abs(dpDiff);
    const absEo = Math.abs(eoDiff);

    if (biasLevel === 'HIGH' || absDp > 0.2 || absEo > 0.15) {
        return {
            label: 'High Bias Detected',
            color: 'red',
            icon: AlertTriangle,
            description: 'Significant disparity between groups. Model may be unfairly discriminating.'
        };
    } else if (biasLevel === 'MODERATE' || absDp > 0.1 || absEo > 0.08) {
        return {
            label: 'Moderate Bias',
            color: 'amber',
            icon: Scale,
            description: 'Some disparity present. Consider fairness mitigation.'
        };
    } else {
        return {
            label: 'Low Bias',
            color: 'green',
            icon: CheckCircle,
            description: 'Metrics within acceptable range. Model appears relatively fair.'
        };
    }
};

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
 * COMPONENT: BiasDashboard
 * ====================================================================
 * @param {Object} props
 * @param {Object} props.analysisResult - Bias analysis data from backend
 * @param {Function} props.onApplyFix - Callback when "Apply Fairness Fix" clicked
 * @param {boolean} props.isLoading - Whether new analysis is loading
 * @returns {JSX.Element}
 */
const BiasDashboard = ({ analysisResult, onApplyFix, isLoading = false }) => {
    // ------------------------------------------------------------------
    // Early return if no data (show skeleton or placeholder)
    // ------------------------------------------------------------------
    if (!analysisResult && !isLoading) {
        return (
            <div className="w-full p-8 text-center border border-dashed border-gray-700 rounded-xl bg-gray-900/20">
                <Scale className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400 font-mono">No analysis results yet.</p>
                <p className="text-xs text-gray-500 mt-1">Upload a dataset and run bias scan.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="w-full p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
                <p className="text-gray-400 mt-4 font-mono text-sm">Analyzing bias...</p>
            </div>
        );
    }

    // ------------------------------------------------------------------
    // Destructure analysisResult with fallbacks
    // ------------------------------------------------------------------
    const {
        accuracy = 0,
        demographic_parity_diff = 0,
        equalized_odds_diff = 0,
        bias_level = 'MODERATE',
        bias_color = 'amber',
        overall_metrics = {},
        by_group = [],
        summary = 'No explanation available.',
        target_col = 'target',
        sensitive_col = 'sensitive',
        row_count = 0
    } = analysisResult;

    // Compute verdict using both bias_level and actual diff values
    const verdict = getBiasVerdict(bias_level, demographic_parity_diff, equalized_odds_diff);
    const VerdictIcon = verdict.icon;

    // Prepare data for selection rate chart
    const selectionRateData = useMemo(() => {
        return by_group.map(group => ({
            group: group.group,
            rate: group.selection_rate || 0,
            // color based on disparity from overall selection rate
            isLow: (group.selection_rate || 0) < (overall_metrics.selection_rate || 0)
        }));
    }, [by_group, overall_metrics.selection_rate]);

    // Prepare data for false negative rate chart
    const fnrData = useMemo(() => {
        return by_group.map(group => ({
            group: group.group,
            rate: group.false_negative_rate || 0,
        }));
    }, [by_group]);

    // Color mapping for bars (red for disadvantaged groups)
    const getBarColor = (groupName, dataArray, valueKey) => {
        const values = dataArray.map(d => d[valueKey]);
        const minVal = Math.min(...values);
        const groupVal = dataArray.find(d => d.group === groupName)?.[valueKey];
        if (groupVal === minVal && minVal < (overall_metrics.selection_rate || 0)) return '#EF4444'; // red
        return '#F59E0B'; // amber default
    };

    // ------------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------------
    return (
        <div className="w-full max-w-6xl mx-auto font-['DM_Mono'] space-y-6">

            {/* ========== HEADER ========== */}
            <div className="flex flex-wrap justify-between items-center border-b border-gray-800 pb-4">
                <div>
                    <h2 className="text-2xl font-['Syne'] font-bold tracking-tight text-white">
                        Fairness Audit Report
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Target: <span className="text-amber-400">{target_col}</span> |
                        Sensitive: <span className="text-amber-400">{sensitive_col}</span> |
                        Rows: {row_count.toLocaleString()}
                    </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1
          ${verdict.color === 'red' ? 'bg-red-900/40 text-red-300 border border-red-700' :
                        verdict.color === 'amber' ? 'bg-amber-900/40 text-amber-300 border border-amber-700' :
                            'bg-green-900/40 text-green-300 border border-green-700'}`}>
                    <VerdictIcon size={14} />
                    {verdict.label}
                </div>
            </div>

            {/* ========== BIAS GAUGE CARD ========== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Verdict description */}
                <div className="col-span-1 bg-gray-900/40 rounded-xl p-5 border border-gray-800">
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${verdict.color === 'red' ? 'bg-red-900/30' :
                                verdict.color === 'amber' ? 'bg-amber-900/30' : 'bg-green-900/30'
                            }`}>
                            <VerdictIcon size={24} className={
                                verdict.color === 'red' ? 'text-red-400' :
                                    verdict.color === 'amber' ? 'text-amber-400' : 'text-green-400'
                            } />
                        </div>
                        <div>
                            <p className="text-sm text-gray-300 leading-relaxed">{verdict.description}</p>
                        </div>
                    </div>
                </div>

                {/* Demographic Parity Gauge (simple bar) */}
                <div className="bg-gray-900/40 rounded-xl p-5 border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wider text-gray-400">Demographic Parity Diff</span>
                        <span className={`font-bold text-sm ${Math.abs(demographic_parity_diff) > 0.2 ? 'text-red-400' :
                                Math.abs(demographic_parity_diff) > 0.1 ? 'text-amber-400' : 'text-green-400'
                            }`}>
                            {formatPercent(demographic_parity_diff)}
                        </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${Math.abs(demographic_parity_diff) > 0.2 ? 'bg-red-500' :
                                    Math.abs(demographic_parity_diff) > 0.1 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                            style={{ width: `${Math.min(100, Math.abs(demographic_parity_diff) * 200)}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Ideal: 0 (equal selection rates across groups)</p>
                </div>

                {/* Equalized Odds Gauge */}
                <div className="bg-gray-900/40 rounded-xl p-5 border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wider text-gray-400">Equalized Odds Diff</span>
                        <span className={`font-bold text-sm ${Math.abs(equalized_odds_diff) > 0.15 ? 'text-red-400' :
                                Math.abs(equalized_odds_diff) > 0.08 ? 'text-amber-400' : 'text-green-400'
                            }`}>
                            {formatPercent(equalized_odds_diff)}
                        </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${Math.abs(equalized_odds_diff) > 0.15 ? 'bg-red-500' :
                                    Math.abs(equalized_odds_diff) > 0.08 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                            style={{ width: `${Math.min(100, Math.abs(equalized_odds_diff) * 200)}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Ideal: 0 (equal error rates across groups)</p>
                </div>
            </div>

            {/* ========== STAT CARDS (accuracy, selection rate, etc) ========== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <Target size={14} />
                        Accuracy
                    </div>
                    <div className="text-xl font-bold text-white mt-1">{formatPercent(accuracy)}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <Users size={14} />
                        Overall Selection Rate
                    </div>
                    <div className="text-xl font-bold text-white mt-1">{formatPercent(overall_metrics.selection_rate)}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <AlertTriangle size={14} />
                        FPR (avg)
                    </div>
                    <div className="text-xl font-bold text-white mt-1">{formatPercent(overall_metrics.false_positive_rate)}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <TrendingUp size={14} />
                        FNR (avg)
                    </div>
                    <div className="text-xl font-bold text-white mt-1">{formatPercent(overall_metrics.false_negative_rate)}</div>
                </div>
            </div>

            {/* ========== CHARTS: Selection Rate & FNR by Group ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Selection Rate Bar Chart */}
                <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-800">
                    <h3 className="text-sm font-['Syne'] font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <BarChart3 size={16} /> Selection Rate by Group
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={selectionRateData} layout="vertical" margin={{ left: 60, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3f" />
                            <XAxis type="number" tickFormatter={(v) => formatPercent(v)} stroke="#6b7280" />
                            <YAxis type="category" dataKey="group" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value) => formatPercent(value)} contentStyle={{ backgroundColor: '#1f1f2e', borderColor: '#3f3f55' }} />
                            <Bar dataKey="rate" fill="#F59E0B" radius={[0, 4, 4, 0]}>
                                {selectionRateData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.rate < (overall_metrics.selection_rate || 0) ? '#EF4444' : '#F59E0B'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 mt-2 text-center">Red bars indicate groups with below-average selection rate</p>
                </div>

                {/* False Negative Rate Bar Chart */}
                <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-800">
                    <h3 className="text-sm font-['Syne'] font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} /> False Negative Rate by Group
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={fnrData} layout="vertical" margin={{ left: 60, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3f" />
                            <XAxis type="number" tickFormatter={(v) => formatPercent(v)} stroke="#6b7280" />
                            <YAxis type="category" dataKey="group" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value) => formatPercent(value)} contentStyle={{ backgroundColor: '#1f1f2e', borderColor: '#3f3f55' }} />
                            <Bar dataKey="rate" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
                                {fnrData.map((entry, idx) => (
                                    <Cell key={`fnr-${idx}`} fill={entry.rate > (overall_metrics.false_negative_rate || 0) ? '#EF4444' : '#8B5CF6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 mt-2 text-center">Higher FNR means more missed positive cases (e.g., loan denials)</p>
                </div>
            </div>

            {/* ========== GROUP BREAKDOWN TABLE ========== */}
            <div className="bg-gray-900/40 rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-800/50 border-b border-gray-700">
                            <tr className="text-left text-gray-400">
                                <th className="px-4 py-3 font-['Syne'] font-semibold">Group</th>
                                <th className="px-4 py-3 font-['Syne'] font-semibold">Selection Rate</th>
                                <th className="px-4 py-3 font-['Syne'] font-semibold">FPR</th>
                                <th className="px-4 py-3 font-['Syne'] font-semibold">FNR</th>
                                <th className="px-4 py-3 font-['Syne'] font-semibold">Accuracy</th>
                                <th className="px-4 py-3 font-['Syne'] font-semibold">Disparity (vs avg)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {by_group.map((group, idx) => {
                                const avgSel = overall_metrics.selection_rate || 0;
                                const disparity = (group.selection_rate || 0) - avgSel;
                                const disparityColor = disparity < -0.05 ? 'text-red-400' : (disparity > 0.05 ? 'text-green-400' : 'text-gray-400');
                                return (
                                    <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 font-mono font-medium text-gray-200">{group.group}</td>
                                        <td className="px-4 py-3 font-mono">{formatPercent(group.selection_rate)}</td>
                                        <td className="px-4 py-3 font-mono">{formatPercent(group.false_positive_rate)}</td>
                                        <td className="px-4 py-3 font-mono">{formatPercent(group.false_negative_rate)}</td>
                                        <td className="px-4 py-3 font-mono">{formatPercent(group.accuracy)}</td>
                                        <td className={`px-4 py-3 font-mono ${disparityColor}`}>
                                            {disparity > 0 ? `+${formatPercent(disparity)}` : formatPercent(disparity)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ========== PLAIN-ENGLISH SUMMARY ========== */}
            <div className="bg-gray-900/40 rounded-xl p-5 border border-gray-800">
                <div className="flex items-start gap-3">
                    <Shield size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-['Syne'] font-semibold text-gray-300 mb-1">Plain-English Summary</h4>
                        <p className="text-sm text-gray-400 leading-relaxed">{summary}</p>
                    </div>
                </div>
            </div>

            {/* ========== APPLY FAIRNESS FIX CTA ========== */}
            <div className="flex justify-center pt-2 pb-4">
                <button
                    onClick={onApplyFix}
                    className="group relative px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg font-['Syne'] font-bold text-white shadow-lg transition-all duration-200 transform hover:scale-[1.02] focus:ring-2 focus:ring-red-400 focus:outline-none"
                >
                    <span className="flex items-center gap-2">
                        <Shield size={18} />
                        Apply Fairness Fix
                    </span>
                    <div className="absolute inset-0 rounded-lg bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                </button>
                <p className="text-xs text-gray-500 ml-4 self-center">
                    Uses ExponentiatedGradient reduction (Fairlearn)
                </p>
            </div>
        </div>
    );
};

export default BiasDashboard;