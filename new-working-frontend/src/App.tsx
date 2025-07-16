import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// Tool Pages
import PortraitGeneratorPage from '@/pages/tools/PortraitGeneratorPage';

// Components
import Layout from '@/components/layout/Layout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Create React Query client with TanStack Query v5 syntax
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v3)
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
                            {/* Dashboard */}
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<DashboardPage />} />

                            {/* Profile */}
                            <Route path="profile" element={<ProfilePage />} />

                            {/* Characters */}
                            <Route path="characters" element={<CharactersPage />} />
                            <Route path="characters/create" element={<CharacterCreatePage />} />
                            <Route path="characters/:id" element={<CharacterViewPage />} />
                            <Route path="characters/:id/edit" element={<CharacterEditPage />} />

                            {/* Campaigns */}
                            <Route path="campaigns" element={<CampaignsPage />} />
                            <Route path="campaigns/create" element={<CreateCampaignPage />} />
                            <Route path="campaigns/:id" element={<CampaignDetailPage />} />

                            {/* Game */}
                            <Route path="game/:gameId" element={<GamePage />} />

                            {/* Tools */}
                            <Route path="tools/portrait-generator" element={<PortraitGeneratorPage />} />
                        </Route>

                        {/* Catch all route */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>

                    {/* Global toast notifications */}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: 'var(--background)',
                                color: 'var(--foreground)',
                                border: '1px solid var(--border)',
                            },
                            success: {
                                iconTheme: {
                                    primary: '#10b981',
                                    secondary: '#ffffff',
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#ffffff',
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