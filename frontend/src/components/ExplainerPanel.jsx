
import React, { useMemo, useState } from 'react';
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
    TrendingUp,
    TrendingDown,
    Info,
    Users,
    Brain,
    ChevronDown,
    ChevronUp
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
 * HELPER: formatImportance
 * ====================================================================
 */
const formatImportance = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
};

/**
 * ====================================================================
 * COMPONENT: ExplainerPanel
 * ====================================================================
 * @param {Object} props
 * @param {Object} props.shapResult - SHAP analysis result from backend
 * @param {boolean} props.isLoading - Whether explanation is loading
 * @param {string} props.targetCol - Name of target variable (for context)
 * @returns {JSX.Element}
 */
const ExplainerPanel = ({ shapResult, isLoading = false, targetCol = 'outcome' }) => {
    // ------------------------------------------------------------------
    // State for per-group dropdown
    // ------------------------------------------------------------------
    const [expandedGroup, setExpandedGroup] = useState(null);

    // ------------------------------------------------------------------
    // Early return if no data
    // ------------------------------------------------------------------
    if (!shapResult && !isLoading) {
        return (
            <div className="w-full p-8 text-center border border-dashed border-gray-700 rounded-xl bg-gray-900/20">
                <Brain className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400 font-mono">No explanation data available.</p>
                <p className="text-xs text-gray-500 mt-1">Run bias analysis first to generate SHAP explanations.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="w-full p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                <p className="text-gray-400 mt-4 font-mono text-sm">Computing SHAP explanations...</p>
            </div>
        );
    }

    // ------------------------------------------------------------------
    // Destructure shapResult with fallbacks
    // ------------------------------------------------------------------
    const {
        top_features = [],
        per_group_shap = {},
        explanation = 'No explanation available. The model\'s decisions are influenced by the features below.'
    } = shapResult;

    // Prepare data for bar chart (top features)
    const chartData = useMemo(() => {
        return top_features.map(f => ({
            name: f.feature,
            importance: f.importance,
            direction: f.direction,
            // color based on direction (positive=green, negative=red)
            color: f.direction === 'positive' ? '#10B981' : '#EF4444'
        }));
    }, [top_features]);

    // Group names from per_group_shap
    const groupNames = useMemo(() => {
        return Object.keys(per_group_shap);
    }, [per_group_shap]);

    // Toggle expanded group
    const toggleGroup = (groupName) => {
        setExpandedGroup(expandedGroup === groupName ? null : groupName);
    };

    // ------------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------------
    return (
        <div className="w-full max-w-6xl mx-auto font-['DM_Mono'] space-y-6">

            {/* ========== HEADER ========== */}
            <div className="border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-['Syne'] font-bold tracking-tight text-white flex items-center gap-2">
                    <Brain size={28} className="text-purple-400" />
                    Model Explainability (SHAP)
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                    Understanding what drives predictions for <span className="text-purple-400">{targetCol}</span>
                </p>
            </div>

            {/* ========== TOP FEATURES BAR CHART ========== */}
            <div className="bg-gray-900/40 rounded-xl p-5 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-['Syne'] font-semibold text-gray-300 flex items-center gap-2">
                        <TrendingUp size={16} />
                        Top Features by Importance
                    </h3>
                    <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1"><TrendingUp size={12} className="text-green-400" /> Positive impact</span>
                        <span className="flex items-center gap-1"><TrendingDown size={12} className="text-red-400" /> Negative impact</span>
                    </div>
                </div>

                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3f" />
                            <XAxis type="number" tickFormatter={(v) => formatImportance(v)} stroke="#6b7280" />
                            <YAxis type="category" dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} width={100} />
                            <Tooltip
                                formatter={(value, name, props) => {
                                    const item = props.payload;
                                    return [
                                        `${formatImportance(value)} (${item.direction === 'positive' ? '↑ pushes toward positive outcome' : '↓ pushes toward negative outcome'})`,
                                        'Importance'
                                    ];
                                }}
                                contentStyle={{ backgroundColor: '#1f1f2e', borderColor: '#3f3f55' }}
                            />
                            <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                                {chartData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-center text-gray-500 py-8">No feature importance data available.</p>
                )}

                <p className="text-xs text-gray-500 mt-3 text-center">
                    Higher importance = greater influence on model's decisions. Red features may indicate bias if they correlate with sensitive attributes.
                </p>
            </div>

            {/* ========== PLAIN-ENGLISH EXPLANATION ========== */}
            <div className="bg-gradient-to-r from-gray-900/60 to-gray-800/40 rounded-xl p-5 border border-purple-800/30">
                <div className="flex items-start gap-3">
                    <Info size={20} className="text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-['Syne'] font-semibold text-gray-300 mb-1">What This Means</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">{explanation}</p>
                    </div>
                </div>
            </div>

            {/* ========== PER-GROUP SHAP VALUES (if available) ========== */}
            {groupNames.length > 0 && (
                <div className="bg-gray-900/40 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-800/30 border-b border-gray-700">
                        <h3 className="text-sm font-['Syne'] font-semibold text-gray-300 flex items-center gap-2">
                            <Users size={16} />
                            Feature Impact by Group
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">How feature importance differs across demographic groups</p>
                    </div>

                    <div className="divide-y divide-gray-800">
                        {groupNames.map((groupName) => {
                            const groupShaps = per_group_shap[groupName] || [];
                            const isExpanded = expandedGroup === groupName;

                            return (
                                <div key={groupName}>
                                    <button
                                        onClick={() => toggleGroup(groupName)}
                                        className="w-full px-5 py-3 flex justify-between items-center hover:bg-gray-800/30 transition-colors text-left"
                                    >
                                        <span className="font-['Syne'] font-medium text-gray-200">{groupName}</span>
                                        <span className="text-gray-400">
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </span>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-5 pb-4 pt-1">
                                            {groupShaps.length > 0 ? (
                                                <div className="space-y-2">
                                                    {groupShaps.slice(0, 5).map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-400">{item.feature}</span>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-32 bg-gray-700 rounded-full h-1.5">
                                                                    <div
                                                                        className={`h-1.5 rounded-full ${item.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${Math.min(100, item.importance * 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className={`text-xs font-mono ${item.direction === 'positive' ? 'text-green-400' : 'text-red-400'}`}>
                                                                    {formatImportance(item.importance)} {item.direction === 'positive' ? '↑' : '↓'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {groupShaps.length > 5 && (
                                                        <p className="text-xs text-gray-500 pt-1">+ {groupShaps.length - 5} more features</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">No detailed SHAP values for this group.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ========== FOOTER NOTE ========== */}
            <div className="text-center text-xs text-gray-600 pt-2">
                SHAP (SHapley Additive exPlanations) values show contribution of each feature to the prediction.
                Positive direction = pushes prediction toward positive class (e.g., higher income, loan approval).
            </div>
        </div>
    );
};

export default ExplainerPanel;