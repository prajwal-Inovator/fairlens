

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Analyze from './pages/Analyze';
import Report from './pages/Report';

/**
 * Simple 404 Not Found component
 */
const NotFound = () => (
    <div className="min-h-screen bg-[#080809] flex items-center justify-center px-6">
        <div className="text-center">
            <h1 className="text-6xl font-['Syne'] font-bold text-gray-700 mb-4">404</h1>
            <p className="text-gray-400 mb-6">Page not found</p>
            <a href="/" className="text-red-400 hover:text-red-300 underline">
                Return to Home
            </a>
        </div>
    </div>
);

/**
 * Main App Component
 * Sets up routing and global providers (if any)
 */
const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/analyze" element={<Analyze />} />
                <Route path="/report" element={<Report />} />

                {/* Redirect unknown routes to 404 */}
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;