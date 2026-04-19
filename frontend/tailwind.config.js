
/** @type {import('tailwindcss').Config} */
module.exports = {
    // ------------------------------------------------------------------
    // CONTENT PATHS
    // ------------------------------------------------------------------
    // Scan all React component files for class names to include in final CSS.
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],

    // ------------------------------------------------------------------
    // THEME EXTENSION
    // ------------------------------------------------------------------
    theme: {
        extend: {
            // Custom color palette matching dark forensic aesthetic
            colors: {
                // Primary background
                background: {
                    DEFAULT: '#080809',
                    light: '#0f0f12',
                    card: '#1a1a1f',
                },
                // Accent red for bias indicators
                accent: {
                    DEFAULT: '#FF3B3B',
                    dark: '#cc2e2e',
                    light: '#ff6b6b',
                },
                // Semantic colors
                bias: {
                    high: '#EF4444',     // red for severe bias
                    moderate: '#F59E0B', // amber for moderate bias
                    low: '#10B981',      // green for low bias
                },
                // Neutral grays
                gray: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1f2937',
                    900: '#111827',
                    950: '#030712',
                },
            },

            // Custom font family
            fontFamily: {
                'syne': ['Syne', 'sans-serif'],
                'dm-mono': ['DM Mono', 'monospace'],
                // Fallback stacks
                'heading': ['Syne', 'system-ui', 'sans-serif'],
                'data': ['DM Mono', 'monospace', 'Courier New'],
            },

            // Custom border radius
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
            },

            // Custom animations
            animation: {
                'spin-slow': 'spin 1.5s linear infinite',
                'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },

            // Custom box shadows
            boxShadow: {
                'glow-red': '0 0 15px rgba(255, 59, 59, 0.3)',
                'glow-amber': '0 0 15px rgba(245, 158, 11, 0.3)',
                'glow-green': '0 0 15px rgba(16, 185, 129, 0.3)',
            },

            // Background image patterns (grid)
            backgroundImage: {
                'grid-white': 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)',
            },
            backgroundSize: {
                'grid': '50px 50px',
            },
        },
    },

    // ------------------------------------------------------------------
    // PLUGINS
    // ------------------------------------------------------------------
    // No third-party plugins required for base FairLens.
    plugins: [],

    // ------------------------------------------------------------------
    // CORE CONFIGURATION
    // ------------------------------------------------------------------
    // Use class-based dark mode (default is media)
    darkMode: 'class',

    // Enable important for specific use cases if needed
    important: false,
};