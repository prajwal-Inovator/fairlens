

import React, { useMemo } from 'react';
import { Shield, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

/**
 * ====================================================================
 * HELPER: computeFairnessScore
 * ====================================================================
 * Calculates a 0-100 fairness score based on:
 *   - Demographic parity difference (ideal 0 → 100 points)
 *   - Equalized odds difference (ideal 0 → 100 points)
 *   - Accuracy penalty (optional, low accuracy reduces score)
 * 
 * Formula:
 *   dpScore = max(0, (1 - min(1, |dpDiff| / 0.3)) * 50)
 *   eoScore = max(0, (1 - min(1, |eoDiff| / 0.25)) * 50)
 *   total = dpScore + eoScore
 *   if accuracy < 0.6: total *= (accuracy / 0.6)
 * 
 * @param {number} dpDiff - Demographic parity difference (absolute)
 * @param {number} eoDiff - Equalized odds difference (absolute)
 * @param {number} accuracy - Model accuracy (0-1)
 * @returns {number} Score between 0 and 100
 */
const computeFairnessScore = (dpDiff, eoDiff, accuracy) => {
    const absDp = Math.abs(dpDiff);
    const absEo = Math.abs(eoDiff);

    // DP: 0 difference = 50 points, 0.3+ difference = 0 points
    const dpScore = Math.max(0, (1 - Math.min(1, absDp / 0.3))) * 50;
    // EO: 0 difference = 50 points, 0.25+ difference = 0 points
    const eoScore = Math.max(0, (1 - Math.min(1, absEo / 0.25))) * 50;

    let total = dpScore + eoScore;

    // Penalize very low accuracy (below 0.6)
    if (accuracy < 0.6) {
        total = total * (accuracy / 0.6);
    }

    return Math.round(Math.min(100, Math.max(0, total)));
};

/**
 * ====================================================================
 * HELPER: getScoreGrade
 * ====================================================================
 * @param {number} score - Fairness score (0-100)
 * @returns {Object} { label, color, icon, description }
 */
const getScoreGrade = (score) => {
    if (score >= 80) {
        return {
            label: 'Excellent Fairness',
            color: 'green',
            icon: CheckCircle,
            description: 'Model shows minimal bias across protected groups.'
        };
    } else if (score >= 60) {
        return {
            label: 'Moderate Fairness',
            color: 'amber',
            icon: Shield,
            description: 'Some bias present. Consider mitigation for critical use.'
        };
    } else if (score >= 40) {
        return {
            label: 'Concerning Bias',
            color: 'orange',
            icon: AlertTriangle,
            description: 'Significant disparities detected. Fairness fix recommended.'
        };
    } else {
        return {
            label: 'Severe Bias',
            color: 'red',
            icon: AlertTriangle,
            description: 'Critical fairness violations. Immediate mitigation required.'
        };
    }
};

/**
 * ====================================================================
 * COMPONENT: FairnessScore
 * ====================================================================
 * @param {Object} props
 * @param {number} props.demographicParityDiff - DP difference (can be negative)
 * @param {number} props.equalizedOddsDiff - EO difference
 * @param {number} props.accuracy - Model accuracy (0-1)
 * @param {string} props.size - "sm" | "md" | "lg" (default "md")
 * @param {boolean} props.showLabel - Show text label below gauge (default true)
 * @param {boolean} props.showDetails - Show DP/EO breakdown (default false)
 * @returns {JSX.Element}
 */
const FairnessScore = ({
    demographicParityDiff = 0,
    equalizedOddsDiff = 0,
    accuracy = 0.8,
    size = 'md',
    showLabel = true,
    showDetails = false
}) => {
    // Compute fairness score
    const score = useMemo(() =>
        computeFairnessScore(demographicParityDiff, equalizedOddsDiff, accuracy),
        [demographicParityDiff, equalizedOddsDiff, accuracy]
    );

    const grade = getScoreGrade(score);
    const GradeIcon = grade.icon;

    // Size mappings
    const sizeMap = {
        sm: {
            container: 'w-24 h-24',
            text: 'text-2xl',
            subtext: 'text-[10px]',
            iconSize: 16
        },
        md: {
            container: 'w-32 h-32',
            text: 'text-3xl',
            subtext: 'text-xs',
            iconSize: 20
        },
        lg: {
            container: 'w-40 h-40',
            text: 'text-4xl',
            subtext: 'text-sm',
            iconSize: 24
        }
    };

    const sz = sizeMap[size] || sizeMap.md;

    // SVG circular progress parameters
    const radius = size === 'sm' ? 40 : size === 'md' ? 50 : 65;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - score / 100);

    // Stroke color based on score
    const getStrokeColor = () => {
        if (score >= 80) return '#10B981'; // green
        if (score >= 60) return '#F59E0B'; // amber
        if (score >= 40) return '#F97316'; // orange
        return '#EF4444'; // red
    };

    return (
        <div className="font-['DM_Mono']">
            <div className="flex flex-col items-center">
                {/* Circular Gauge */}
                <div className={`relative ${sz.container}`}>
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background circle */}
                        <circle
                            cx="50%"
                            cy="50%"
                            r={radius}
                            stroke="#2d2d3f"
                            strokeWidth="8"
                            fill="none"
                            className="transition-all"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="50%"
                            cy="50%"
                            r={radius}
                            stroke={getStrokeColor()}
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-700 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`${sz.text} font-bold text-white`}>{score}</span>
                        {size !== 'sm' && <span className={`${sz.subtext} text-gray-500`}>/100</span>}
                    </div>
                </div>

                {/* Label and Grade */}
                {showLabel && (
                    <div className="mt-3 text-center">
                        <div className={`flex items-center justify-center gap-1 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                            <GradeIcon size={sz.iconSize} className={`text-${grade.color}-400`} />
                            <span className={`font-['Syne'] font-semibold text-gray-200`}>{grade.label}</span>
                        </div>
                        <p className={`text-gray-500 ${size === 'sm' ? 'text-[10px]' : 'text-xs'} mt-1 max-w-[200px]`}>
                            {grade.description}
                        </p>
                    </div>
                )}

                {/* Detailed metrics breakdown */}
                {showDetails && (
                    <div className="mt-4 w-full bg-gray-900/40 rounded-lg p-3 border border-gray-800 text-xs space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Demographic Parity Δ:</span>
                            <span className={`font-mono ${Math.abs(demographicParityDiff) > 0.2 ? 'text-red-400' :
                                    Math.abs(demographicParityDiff) > 0.1 ? 'text-amber-400' : 'text-green-400'
                                }`}>
                                {(demographicParityDiff * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Equalized Odds Δ:</span>
                            <span className={`font-mono ${Math.abs(equalizedOddsDiff) > 0.15 ? 'text-red-400' :
                                    Math.abs(equalizedOddsDiff) > 0.08 ? 'text-amber-400' : 'text-green-400'
                                }`}>
                                {(equalizedOddsDiff * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Accuracy:</span>
                            <span className="font-mono text-blue-400">{(accuracy * 100).toFixed(1)}%</span>
                        </div>
                        <div className="pt-1 border-t border-gray-700 mt-1">
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span>Fairness Score Formula</span>
                                <span>DP(50) + EO(50) - acc penalty</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FairnessScore;