

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield,
    BarChart3,
    Brain,
    Scale,
    ArrowRight,
    Github,
    Play,
    AlertTriangle,
    CheckCircle,
    TrendingUp
} from 'lucide-react';

/**
 * ====================================================================
 * COMPONENT: FeatureCard
 * ====================================================================
 * Reusable card for feature highlights
 */
const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="group bg-gray-900/40 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-red-500/50 transition-all duration-300 hover:transform hover:-translate-y-1">
        <div className="w-12 h-12 bg-red-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-900/40 transition-colors">
            <Icon className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-['Syne'] font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
);

/**
 * ====================================================================
 * COMPONENT: StatCard
 * ====================================================================
 * Reusable stat display
 */
const StatCard = ({ value, label }) => (
    <div className="text-center">
        <div className="text-3xl font-['Syne'] font-bold text-red-400">{value}</div>
        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{label}</div>
    </div>
);

/**
 * ====================================================================
 * COMPONENT: Home
 * ====================================================================
 */
const Home = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: Scale,
            title: 'Multi-Dataset Bias Detection',
            description: 'Scan CSV datasets or trained ML models for bias across gender, race, age, and other sensitive attributes.'
        },
        {
            icon: BarChart3,
            title: 'Comprehensive Fairness Metrics',
            description: 'Demographic parity, equalized odds, disparate impact, and group-wise performance breakdowns.'
        },
        {
            icon: Brain,
            title: 'SHAP Explainability',
            description: 'Understand WHY the model is biased with feature importance and per-group SHAP values.'
        },
        {
            icon: Shield,
            title: 'Fairness Mitigation',
            description: 'Apply ExponentiatedGradient or GridSearch reduction to get a less biased model with minimal accuracy trade-off.'
        }
    ];

    const sampleDatasets = [
        { name: 'Adult Income', bias: 'Gender (78% men approved vs 11% women)', icon: '🏦' },
        { name: 'German Credit', bias: 'Gender (loan approval disparity)', icon: '💳' },
        { name: 'COMPAS Recidivism', bias: 'Race (2x higher risk flag for Black defendants)', icon: '⚖️' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#080809] to-[#0f0f12] font-['DM_Mono']">

            {/* ========== HERO SECTION ========== */}
            <section className="relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px] pointer-events-none"></div>
                <div className="absolute top-20 right-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

                <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-full px-4 py-1.5 mb-6">
                            <AlertTriangle size={14} className="text-red-400" />
                            <span className="text-xs font-['Syne'] text-red-300 tracking-wide">AI BIAS AUDITOR</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-['Syne'] font-bold tracking-tight text-white mb-6">
                            Fair<span className="text-red-500">Lens</span>
                        </h1>

                        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                            Detect and mitigate algorithmic bias in AI systems before they make unfair decisions about jobs, loans, or justice.
                        </p>

                        <div className="flex flex-wrap justify-center gap-4">
                            <button
                                onClick={() => navigate('/analyze')}
                                className="group bg-red-600 hover:bg-red-500 text-white font-['Syne'] font-semibold px-8 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-red-500/20"
                            >
                                Start Scanning
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => navigate('/analyze')}
                                className="border border-gray-700 hover:border-red-500/50 text-gray-300 hover:text-white px-8 py-3 rounded-lg flex items-center gap-2 transition-all duration-200"
                            >
                                <Play size={16} />
                                Try Sample Dataset
                            </button>
                        </div>

                        {/* Quick stats */}
                        <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16">
                            <StatCard value="3+" label="Built-in Datasets" />
                            <StatCard value="4+" label="Fairness Metrics" />
                            <StatCard value="SHAP" label="Explainability" />
                            <StatCard value="<3%" label="Accuracy Trade-off" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ========== PROBLEM STATEMENT ========== */}
            <section className="border-y border-gray-800/50 bg-gray-900/20 py-12">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="flex justify-center mb-4">
                        <AlertTriangle className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-['Syne'] font-bold text-white mb-4">The Problem</h2>
                    <p className="text-gray-400 leading-relaxed max-w-3xl mx-auto">
                        AI systems now decide who gets hired, approved for a loan, or even assessed for criminal risk.
                        But when these models learn from biased historical data, they <span className="text-red-400 font-semibold">amplify discrimination</span> —
                        unfairly disadvantaging marginalized groups without transparency or recourse.
                    </p>
                </div>
            </section>

            {/* ========== FEATURES GRID ========== */}
            <section className="py-20 px-6 max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-['Syne'] font-bold text-white mb-3">How FairLens Works</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        A complete pipeline from bias detection to mitigation, designed for developers and auditors.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, idx) => (
                        <FeatureCard key={idx} {...feature} />
                    ))}
                </div>
            </section>

            {/* ========== SAMPLE DATASETS PREVIEW ========== */}
            <section className="py-12 px-6 max-w-5xl mx-auto">
                <div className="bg-gray-900/30 rounded-2xl border border-gray-800 p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h3 className="text-xl font-['Syne'] font-bold text-white flex items-center gap-2">
                                <TrendingUp size={22} className="text-red-400" />
                                Known Bias in Real Datasets
                            </h3>
                            <p className="text-gray-500 text-sm mt-1">Test FairLens on these widely-studied benchmarks</p>
                        </div>
                        <button
                            onClick={() => navigate('/analyze')}
                            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                        >
                            Run analysis <ArrowRight size={14} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {sampleDatasets.map((ds, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/20 border border-gray-700/50 hover:border-red-800/30 transition-colors">
                                <div className="text-2xl">{ds.icon}</div>
                                <div className="flex-1">
                                    <div className="font-['Syne'] font-semibold text-gray-200">{ds.name}</div>
                                    <div className="text-xs text-red-400">{ds.bias}</div>
                                </div>
                                <CheckCircle size={16} className="text-gray-600" />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 text-xs text-gray-500 text-center border-t border-gray-800 pt-4">
                        Adult Income (UCI), German Credit (UCI), COMPAS (ProPublica) — each loaded with known fairness issues.
                    </div>
                </div>
            </section>

            {/* ========== CTA BANNER ========== */}
            <section className="py-16 px-6">
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-red-900/20 to-purple-900/20 rounded-2xl border border-red-800/30 p-8 md:p-12 text-center">
                    <Shield className="w-12 h-12 mx-auto text-red-400 mb-4" />
                    <h2 className="text-2xl md:text-3xl font-['Syne'] font-bold text-white mb-3">
                        Ready to audit your AI for fairness?
                    </h2>
                    <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                        Upload your dataset, get a comprehensive fairness report, and apply mitigation — all in one tool.
                    </p>
                    <button
                        onClick={() => navigate('/analyze')}
                        className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-lg font-['Syne'] font-semibold inline-flex items-center gap-2 transition-all"
                    >
                        Launch FairLens Dashboard
                        <ArrowRight size={18} />
                    </button>
                </div>
            </section>

            {/* ========== FOOTER ========== */}
            <footer className="border-t border-gray-800 py-8 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <Scale size={16} />
                        <span>FairLens — AI Bias Auditor for Solution Challenge 2026</span>
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-red-400 transition-colors flex items-center gap-1">
                            <Github size={14} /> GitHub
                        </a>
                        <a href="#" className="hover:text-red-400 transition-colors">Documentation</a>
                        <a href="#" className="hover:text-red-400 transition-colors">About</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;