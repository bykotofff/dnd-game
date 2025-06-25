import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

// Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import CharactersPage from '@/pages/characters/CharactersPage';
import CharacterCreatePage from '@/pages/characters/CharacterCreatePage';
import CharacterViewPage from '@/pages/characters/CharacterViewPage';
import CampaignsPage from '@/pages/campaigns/CampaignsPage';
import GamePage from '@/pages/game/GamePage';
import ProfilePage from '@/pages/profile/ProfilePage';

// Components
import Layout from '@/components/layout/Layout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Create React Query client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

function App() {
    const { isAuthenticated, isLoading, refreshUser } = useAuthStore();

    // Initialize auth state on app load
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                    <Routes>
                        {/* Public routes */}
                        <Route
                            path="/login"
                            element={
                                isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
                            }
                        />

                        {/* Protected routes */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<DashboardPage />} />

                            {/* Characters */}
                            <Route path="characters" element={<CharactersPage />} />
                            <Route path="characters/create" element={<CharacterCreatePage />} />
                            <Route path="characters/:id" element={<CharacterViewPage />} />
                            <Route path="characters/:id/edit" element={<CharacterEditPage />} />

                            {/* Campaigns */}
                            <Route path="campaigns" element={<CampaignsPage />} />

                            {/* Profile */}
                            <Route path="profile" element={<ProfilePage />} />
                        </Route>

                        {/* Game route (full screen) */}
                        <Route
                            path="/game/:gameId"
                            element={
                                <ProtectedRoute>
                                    <GamePage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Catch all route */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>

                    {/* Global toast notifications */}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: '#fff',
                                color: '#374151',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                            },
                            success: {
                                iconTheme: {
                                    primary: '#10b981',
                                    secondary: '#fff',
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#fff',
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