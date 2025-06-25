import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// Main Pages
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProfilePage from '@/pages/profile/ProfilePage';

// Character Pages
import CharactersPage from '@/pages/characters/CharactersPage';
import CharacterCreatePage from '@/pages/characters/CharacterCreatePage';
import CharacterViewPage from '@/pages/characters/CharacterViewPage';
import CharacterEditPage from '@/pages/characters/CharacterEditPage';

// Campaign Pages
import CampaignsPage from '@/pages/campaigns/CampaignsPage';
import CreateCampaignPage from '@/pages/campaigns/CreateCampaignPage';
import CampaignDetailPage from '@/pages/campaigns/CampaignDetailPage';

// Game Pages
import GamePage from '@/pages/game/GamePage';

// Layout Components
import Layout from '@/components/layout/Layout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Create React Query client with optimized settings
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
        },
        mutations: {
            retry: 1,
        },
    },
});

function App() {
    const { isAuthenticated, isLoading, refreshUser } = useAuthStore();

    // Initialize auth state on app load
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    // Show loading screen while checking authentication
    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                    <Routes>
                        {/* Public routes - redirect if authenticated */}
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

                        {/* Protected routes with main layout */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            {/* Redirect root to dashboard */}
                            <Route index element={<Navigate to="/dashboard" replace />} />

                            {/* Dashboard */}
                            <Route path="dashboard" element={<DashboardPage />} />

                            {/* Character routes */}
                            <Route path="characters" element={<CharactersPage />} />
                            <Route path="characters/create" element={<CharacterCreatePage />} />
                            <Route path="characters/:id" element={<CharacterViewPage />} />
                            <Route path="characters/:id/edit" element={<CharacterEditPage />} />

                            {/* Campaign routes */}
                            <Route path="campaigns" element={<CampaignsPage />} />
                            <Route path="campaigns/create" element={<CreateCampaignPage />} />
                            <Route path="campaigns/:id" element={<CampaignDetailPage />} />
                            <Route path="campaigns/:id/edit" element={<CreateCampaignPage />} />

                            {/* Profile routes */}
                            <Route path="profile" element={<ProfilePage />} />
                            <Route path="settings" element={<ProfilePage />} />

                            {/* Future routes placeholders */}
                            <Route
                                path="library"
                                element={
                                    <div className="text-center py-12">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            Библиотека
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Раздел находится в разработке
                                        </p>
                                    </div>
                                }
                            />
                            <Route
                                path="tools/*"
                                element={
                                    <div className="text-center py-12">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            Инструменты
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Раздел находится в разработке
                                        </p>
                                    </div>
                                }
                            />
                            <Route
                                path="games/join"
                                element={
                                    <div className="text-center py-12">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            Присоединиться к игре
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Функция находится в разработке
                                        </p>
                                    </div>
                                }
                            />
                        </Route>

                        {/* Game route (full screen, no main layout) */}
                        <Route
                            path="/game/:gameId"
                            element={
                                <ProtectedRoute>
                                    <GamePage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Admin routes (if needed in future) */}
                        <Route
                            path="/admin/*"
                            element={
                                <ProtectedRoute requireAdmin>
                                    <div className="text-center py-12">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            Панель администратора
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Раздел находится в разработке
                                        </p>
                                    </div>
                                </ProtectedRoute>
                            }
                        />

                        {/* Catch all route - redirect to dashboard */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>

                    {/* Global toast notifications */}
                    <Toaster
                        position="top-right"
                        reverseOrder={false}
                        gutter={8}
                        containerClassName=""
                        containerStyle={{}}
                        toastOptions={{
                            // Default options for all toasts
                            duration: 4000,
                            style: {
                                background: '#fff',
                                color: '#374151',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                padding: '12px 16px',
                            },
                            // Success toasts
                            success: {
                                duration: 3000,
                                iconTheme: {
                                    primary: '#10b981',
                                    secondary: '#fff',
                                },
                                style: {
                                    border: '1px solid #10b981',
                                },
                            },
                            // Error toasts
                            error: {
                                duration: 5000,
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#fff',
                                },
                                style: {
                                    border: '1px solid #ef4444',
                                },
                            },
                            // Warning toasts
                            loading: {
                                duration: Infinity,
                                iconTheme: {
                                    primary: '#f59e0b',
                                    secondary: '#fff',
                                },
                                style: {
                                    border: '1px solid #f59e0b',
                                },
                            },
                        }}
                    />
                </div>
            </Router>
        </QueryClientProvider>
    );
}

export default App;