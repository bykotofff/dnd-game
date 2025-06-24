import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import { store } from '@store/index'
import { useAuth } from '@hooks/useAuth'
import { initializeApp } from '@store/slices/authSlice'

// Pages
import HomePage from '@pages/HomePage'
import LoginPage from '@pages/LoginPage'
import RegisterPage from '@pages/RegisterPage'
import DashboardPage from '@pages/DashboardPage'
import CharactersPage from '@pages/CharactersPage'
import CampaignsPage from '@pages/CampaignsPage'
import GamePage from '@pages/GamePage'
import ProfilePage from '@pages/ProfilePage'

// Components
import ProtectedRoute from '@components/auth/ProtectedRoute'
import LoadingScreen from '@components/common/LoadingScreen'
import Navigation from '@components/common/Navigation'

// Styles
import '@styles/globals.css'

// Main App Component
function AppContent() {
    const { isAuthenticated, isLoading, user } = useAuth()

    useEffect(() => {
        // Initialize app - check for stored auth token
        store.dispatch(initializeApp())
    }, [])

    if (isLoading) {
        return <LoadingScreen />
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900">
            <Router>
                {/* Navigation - shown only when authenticated */}
                <AnimatePresence>
                    {isAuthenticated && (
                        <motion.div
                            initial={{ y: -100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -100, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Navigation user={user} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <main className={isAuthenticated ? 'pt-16' : ''}>
                    <Routes>
                        {/* Public Routes */}
                        <Route
                            path="/"
                            element={
                                isAuthenticated ? (
                                    <Navigate to="/dashboard" replace />
                                ) : (
                                    <HomePage />
                                )
                            }
                        />
                        <Route
                            path="/login"
                            element={
                                isAuthenticated ? (
                                    <Navigate to="/dashboard" replace />
                                ) : (
                                    <LoginPage />
                                )
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                isAuthenticated ? (
                                    <Navigate to="/dashboard" replace />
                                ) : (
                                    <RegisterPage />
                                )
                            }
                        />

                        {/* Protected Routes */}
                        <Route path="/dashboard" element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        } />

                        <Route path="/characters" element={
                            <ProtectedRoute>
                                <CharactersPage />
                            </ProtectedRoute>
                        } />

                        <Route path="/campaigns" element={
                            <ProtectedRoute>
                                <CampaignsPage />
                            </ProtectedRoute>
                        } />

                        <Route path="/game/:gameId" element={
                            <ProtectedRoute>
                                <GamePage />
                            </ProtectedRoute>
                        } />

                        <Route path="/profile" element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        } />

                        {/* 404 Route */}
                        <Route path="*" element={
                            <div className="min-h-screen flex items-center justify-center">
                                <div className="text-center">
                                    <h1 className="text-6xl font-bold text-primary-500 mb-4">404</h1>
                                    <p className="text-xl text-secondary-300 mb-8">Страница не найдена</p>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => window.history.back()}
                                        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                    >
                                        Вернуться назад
                                    </motion.button>
                                </div>
                            </div>
                        } />
                    </Routes>
                </main>

                {/* Toast Notifications */}
                <Toaster
                    position="top-right"
                    gutter={8}
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#1e293b',
                            color: '#f1f5f9',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                        },
                        success: {
                            style: {
                                background: '#065f46',
                                border: '1px solid #10b981',
                            },
                        },
                        error: {
                            style: {
                                background: '#7f1d1d',
                                border: '1px solid #ef4444',
                            },
                        },
                    }}
                />
            </Router>
        </div>
    )
}

// App Wrapper with Redux Provider
function App() {
    return (
        <Provider store={store}>
            <AppContent />
        </Provider>
    )
}

export default App