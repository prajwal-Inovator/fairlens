

import React, { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Line,
    ComposedChart
} from 'recharts';
import {
    ArrowRight,
    TrendingDown,
    CheckCircle,
    AlertTriangle,
    Shield,
    RefreshCw,
    BarChart3,
    Users
} from 'lucide-react';

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
 * HELPER: getImprovementColor
 * ====================================================================
 */
const getImprovementColor = (improvementPercent) => {
    if (improvementPercent >= 50) return 'text-green-400';
    if (improvementPercent >= 20) return 'text-amber-400';
    return 'text-red-400';
};

/**
 * ====================================================================
 * COMPONENT: BeforeAfter
 * ====================================================================
 * @param {Object} props
 * @param {Object} props.originalResult - Original bias analysis result
 * @param {Object} props.fairResult - Fair model result after mitigation
 * @param {boolean} props.isLoading - Whether mitigation is in progress
 * @param {Function} props.onReset - Callback to reset to original model
 * @returns {JSX.Element}
 */
const BeforeAfter = ({ originalResult, fairResult, isLoading = false, onReset }) => {
    // ------------------------------------------------------------------
    // State for view mode: 'split' (side-by-side) or 'delta' (difference only)
    // ------------------------------------------------------------------
    const [viewMode, setViewMode] = useState('split'); // 'split' or 'delta'

    // ------------------------------------------------------------------
    // Early return if no data
    // ------------------------------------------------------------------
    if (!originalResult && !isLoading) {
        return (
            <div className="w-full p-8 text-center border border-dashed border-gray-700 rounded-xl bg-gray-900/20">
                <Shield className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400 font-mono">No fairness comparison data.</p>
                <p className="text-xs text-gray-500 mt-1">Run bias analysis and apply fairness fix first.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="w-full p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
                <p className="text-gray-400 mt-4 font-mono text-sm">Applying fairness fix...</p>
            </div>
        );
    }

    // If fairResult is missing, show placeholder
    if (!fairResult) {
        return (
            <div className="w-full p-8 text-center border border-dashed border-gray-700 rounded-xl bg-gray-900/20">
                <RefreshCw className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400 font-mono">No mitigated model yet.</p>
                <p className="text-xs text-gray-500 mt-1">Click "Apply Fairness Fix" in the Bias Dashboard.</p>
            </div>
        );
    }

    // ------------------------------------------------------------------
    // Destructure results
    // ------------------------------------------------------------------
    const {
        accuracy: origAcc = 0,
        demographic_parity_diff: origDp = 0,
        equalized_odds_diff: origEo = 0,
        by_group: origGroups = []
    } = originalResult;

    const {
        fair_accuracy: fairAcc = 0,
        fair_dp_diff: fairDp = 0,
        fair_eo_diff: fairEo = 0,
        improvement_dp: imprDp = 0,
        improvement_eo: imprEo = 0,
        fair_by_group: fairGroups = [],
        method_used: method = 'ExponentiatedGradient',
        summary: fairSummary = ''
    } = fairResult;

    // Calculate accuracy trade-off
    const accDiff = fairAcc - origAcc;
    const accTradeoff = accDiff * 100;
    const isAccPositive = accTradeoff >= 0;

    // Prepare group comparison data for selection rate
    const groupComparison = useMemo(() => {
        const groupsMap = new Map();
        origGroups.forEach(g => {
            groupsMap.set(g.group, {
                group: g.group,
                orig_selection_rate: g.selection_rate || 0,
                fair_selection_rate: null,
                orig_fnr: g.false_negative_rate || 0,
                fair_fnr: null
            });
        });
        fairGroups.forEach(g => {
            const existing = groupsMap.get(g.group);
            if (existing) {
                existing.fair_selection_rate = g.selection_rate || 0;
                existing.fair_fnr = g.false_negative_rate || 0;
            } else {
                groupsMap.set(g.group, {
                    group: g.group,
                    orig_selection_rate: null,
                    fair_selection_rate: g.selection_rate || 0,
                    orig_fnr: null,
                    fair_fnr: g.false_negative_rate || 0
                });
            }
        });
        return Array.from(groupsMap.values());
    }, [origGroups, fairGroups]);

    // Data for selection rate comparison chart (side-by-side bars)
    const selectionRateChartData = useMemo(() => {
        return groupComparison.map(g => ({
            group: g.group,
            Original: g.orig_selection_rate,
            Fair: g.fair_selection_rate !== null ? g.fair_selection_rate : g.orig_selection_rate
        }));
    }, [groupComparison]);

    // Data for FNR comparison
    const fnrChartData = useMemo(() => {
        return groupComparison.map(g => ({
            group: g.group,
            Original: g.orig_fnr,
            Fair: g.fair_fnr !== null ? g.fair_fnr : g.orig_fnr
        }));
    }, [groupComparison]);

    // ------------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------------
    return (
        <div className="w-full max-w-6xl mx-auto font-['DM_Mono'] space-y-6">

            {/* ========== HEADER ========== */}
            <div className="flex flex-wrap justify-between items-center border-b border-gray-800 pb-4">
                <div>
                    <h2 className="text-2xl font-['Syne'] font-bold tracking-tight text-white flex items-center gap-2">
                        <Shield size={28} className="text-green-400" />
                        Fairness Fix: Before vs After
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Method: <span className="text-green-400">{method}</span> |
                        Accuracy change: <span className={isAccPositive ? 'text-green-400' : 'text-red-400'}>
                            {isAccPositive ? '+' : ''}{accTradeoff.toFixed(1)}%
                        </span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('split')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === 'split'
                                ? 'bg-green-900/50 text-green-300 border border-green-700'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        Side by Side
                    </button>
                    <button
                        onClick={() => setViewMode('delta')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === 'delta'
                                ? 'bg-green-900/50 text-green-300 border border-green-700'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        Delta View
                    </button>
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:bg-red-900/30 hover:text-red-300 transition-colors flex items-center gap-1"
                        >
                            <RefreshCw size={12} /> Reset
                        </button>
                    )}
                </div>
            </div>

            {/* ========== METRICS CARDS (improvement highlights) ========== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Demographic Parity Improvement */}
                <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-400">Demographic Parity Diff</p>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-lg font-mono text-red-400 line-through">{formatPercent(origDp)}</span>
                                <ArrowRight size={16} className="text-gray-500" />
                                <span className="text-xl font-bold text-green-400">{formatPercent(fairDp)}</span>
                            </div>
                        </div>
                        <div className={`text-right ${getImprovementColor(imprDp)}`}>
                            <span className="text-lg font-bold">{imprDp.toFixed(0)}%</span>
                            <p className="text-xs">improvement</p>
                        </div>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
                        <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, imprDp)}%` }}></div>
                    </div>
                </div>

                {/* Equalized Odds Improvement */}
                <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-400">Equalized Odds Diff</p>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-lg font-mono text-red-400 line-through">{formatPercent(origEo)}</span>
                                <ArrowRight size={16} className="text-gray-500" />
                                <span className="text-xl font-bold text-green-400">{formatPercent(fairEo)}</span>
                            </div>
                        </div>
                        <div className={`text-right ${getImprovementColor(imprEo)}`}>
                            <span className="text-lg font-bold">{imprEo.toFixed(0)}%</span>
                            <p className="text-xs">improvement</p>
                        </div>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
                        <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, imprEo)}%` }}></div>
                    </div>
                </div>

                {/* Accuracy Trade-off */}
                <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-400">Accuracy</p>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-lg font-mono text-gray-400">{formatPercent(origAcc)}</span>
                                <ArrowRight size={16} className="text-gray-500" />
                                <span className={`text-xl font-bold ${isAccPositive ? 'text-green-400' : 'text-amber-400'}`}>
                                    {formatPercent(fairAcc)}
                                </span>
                            </div>
                        </div>
                        <div className={`text-right ${isAccPositive ? 'text-green-400' : 'text-amber-400'}`}>
                            <span className="text-lg font-bold">{isAccPositive ? '+' : ''}{accTradeoff.toFixed(1)}%</span>
                            <p className="text-xs">change</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== GROUP SELECTION RATE COMPARISON ========== */}
            <div className="bg-gray-900/40 rounded-xl p-5 border border-gray-800">
                <h3 className="text-sm font-['Syne'] font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <BarChart3 size={16} />
                    Selection Rate by Group: Original vs Fair
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={selectionRateChartData} margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3f" />
                        <XAxis dataKey="group" stroke="#9ca3af" />
                        <YAxis tickFormatter={(v) => formatPercent(v)} stroke="#6b7280" />
                        <Tooltip formatter={(value) => formatPercent(value)} contentStyle={{ backgroundColor: '#1f1f2e', borderColor: '#3f3f55' }} />
                        <Bar dataKey="Original" fill="#EF4444" opacity={0.7} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Fair" fill="#10B981" opacity={0.9} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 text-center mt-2">
                    Red: Original model | Green: Fair model — bars should become more equal
                </p>
            </div>

            {/* ========== FALSE NEGATIVE RATE COMPARISON ========== */}
            <div className="bg-gray-900/40 rounded-xl p-5 border border-gray-800">
                <h3 className="text-sm font-['Syne'] font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    False Negative Rate by Group: Original vs Fair
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={fnrChartData} margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3f" />
                        <XAxis dataKey="group" stroke="#9ca3af" />
                        <YAxis tickFormatter={(v) => formatPercent(v)} stroke="#6b7280" />
                        <Tooltip formatter={(value) => formatPercent(value)} contentStyle={{ backgroundColor: '#1f1f2e', borderColor: '#3f3f55' }} />
                        <Bar dataKey="Original" fill="#EF4444" opacity={0.7} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Fair" fill="#10B981" opacity={0.9} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 text-center mt-2">
                    Lower FNR is better. Fair model should reduce disparity across groups.
                </p>
            </div>

            {/* ========== DELTA VIEW (if selected) ========== */}
            {viewMode === 'delta' && (
                <div className="bg-gray-900/40 rounded-xl p-5 border border-green-800/50">
                    <h3 className="text-sm font-['Syne'] font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <TrendingDown size={16} />
                        Improvement Summary (Delta)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                            <div className="flex justify-between border-b border-gray-700 pb-1">
                                <span>Demographic Parity Δ</span>
                                <span className={getImprovementColor(imprDp)}>{imprDp > 0 ? '-' : '+'}{Math.abs(origDp - fairDp).toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-700 pb-1">
                                <span>Equalized Odds Δ</span>
                                <span className={getImprovementColor(imprEo)}>{imprEo > 0 ? '-' : '+'}{Math.abs(origEo - fairEo).toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-700 pb-1">
                                <span>Accuracy Δ</span>
                                <span className={isAccPositive ? 'text-green-400' : 'text-red-400'}>
                                    {accTradeoff > 0 ? '+' : ''}{accTradeoff.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="text-gray-300 text-xs leading-relaxed border-l border-gray-700 pl-4">
                            <p>{fairSummary}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== PLAIN-ENGLISH SUMMARY CARD ========== */}
            <div className="bg-gradient-to-r from-gray-900/60 to-gray-800/40 rounded-xl p-5 border border-green-800/30">
                <div className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-['Syne'] font-semibold text-gray-300 mb-1">Fairness Fix Applied</h4>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            {fairSummary || `The ${method} reducer improved demographic parity by ${imprDp.toFixed(1)}% and equalized odds by ${imprEo.toFixed(1)}% with a ${Math.abs(accTradeoff).toFixed(1)}% change in accuracy. The fair model is now significantly less biased.`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BeforeAfter;