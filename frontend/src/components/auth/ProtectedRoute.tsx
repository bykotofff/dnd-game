import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/authStore';
import LoadingScreen from '@/components/ui/LoadingScreen';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
                                                           children,
                                                           requireAdmin = false
                                                       }) => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        // Redirect to login page with return url
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !user?.is_admin) {
        // Redirect to dashboard if admin access required but user is not admin
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;