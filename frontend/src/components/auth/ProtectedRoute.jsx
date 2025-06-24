import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import LoadingScreen from '@components/common/LoadingScreen'

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { isAuthenticated, isLoading, initialized, isAdmin } = useAuth()
    const location = useLocation()

    // Show loading while checking authentication
    if (!initialized || isLoading) {
        return <LoadingScreen message="Проверка авторизации..." />
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                state={{ from: location }}
                replace
            />
        )
    }

    // Check admin requirements
    if (requireAdmin && !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-red-500 mb-4">403</h1>
                    <p className="text-xl text-secondary-300 mb-8">
                        Недостаточно прав доступа
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="btn btn-primary"
                    >
                        Вернуться назад
                    </button>
                </div>
            </div>
        )
    }

    return children
}

export default ProtectedRoute