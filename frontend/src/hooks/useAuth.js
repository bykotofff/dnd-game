import { useSelector, useDispatch } from 'react-redux'
import { useCallback, useEffect } from 'react'
import {
    loginUser,
    registerUser,
    logoutUser,
    getCurrentUser,
    updateUserProfile,
    changePassword,
    clearError,
    initializeApp,
} from '@store/slices/authSlice'

export const useAuth = () => {
    const dispatch = useDispatch()

    const {
        user,
        token,
        isAuthenticated,
        loading,
        error,
        initialized,
    } = useSelector((state) => state.auth)

    // Login function
    const login = useCallback(async (credentials) => {
        try {
            const result = await dispatch(loginUser(credentials)).unwrap()
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error }
        }
    }, [dispatch])

    // Register function
    const register = useCallback(async (userData) => {
        try {
            const result = await dispatch(registerUser(userData)).unwrap()
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error }
        }
    }, [dispatch])

    // Logout function
    const logout = useCallback(() => {
        dispatch(logoutUser())
    }, [dispatch])

    // Update profile function
    const updateProfile = useCallback(async (profileData) => {
        try {
            const result = await dispatch(updateUserProfile(profileData)).unwrap()
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error }
        }
    }, [dispatch])

    // Change password function
    const updatePassword = useCallback(async (passwordData) => {
        try {
            await dispatch(changePassword(passwordData)).unwrap()
            return { success: true }
        } catch (error) {
            return { success: false, error }
        }
    }, [dispatch])

    // Refresh user data
    const refreshUser = useCallback(() => {
        if (isAuthenticated) {
            dispatch(getCurrentUser())
        }
    }, [dispatch, isAuthenticated])

    // Clear auth error
    const clearAuthError = useCallback(() => {
        dispatch(clearError())
    }, [dispatch])

    // Initialize app on mount
    useEffect(() => {
        if (!initialized) {
            dispatch(initializeApp())
        }
    }, [dispatch, initialized])

    // Listen for logout events from other tabs
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'accessToken' && !e.newValue && isAuthenticated) {
                // Token was removed in another tab
                dispatch(logoutUser())
            }
        }

        const handleAuthLogout = () => {
            if (isAuthenticated) {
                dispatch(logoutUser())
            }
        }

        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('auth:logout', handleAuthLogout)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('auth:logout', handleAuthLogout)
        }
    }, [dispatch, isAuthenticated])

    return {
        // State
        user,
        token,
        isAuthenticated,
        loading,
        error,
        initialized,
        isLoading: loading,

        // Actions
        login,
        register,
        logout,
        updateProfile,
        updatePassword,
        refreshUser,
        clearError: clearAuthError,

        // Computed values
        isAdmin: user?.is_admin || false,
        username: user?.username || '',
        displayName: user?.display_name || user?.username || '',
        email: user?.email || '',
        avatarUrl: user?.avatar_url || null,
    }
}