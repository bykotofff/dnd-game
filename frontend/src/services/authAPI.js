import { apiRequest } from './api'

export const authAPI = {
    // Register new user
    register: async (userData) => {
        const response = await apiRequest.post('/auth/register', userData)
        return response.data
    },

    // Login user
    login: async (credentials) => {
        const response = await apiRequest.post('/auth/login', credentials)
        return response.data
    },

    // Logout user
    logout: async () => {
        const response = await apiRequest.post('/auth/logout')
        return response.data
    },

    // Refresh access token
    refreshToken: async (refreshToken) => {
        const response = await apiRequest.post('/auth/refresh', {
            refresh_token: refreshToken,
        })
        return response.data
    },

    // Get current user profile
    getCurrentUser: async () => {
        const response = await apiRequest.get('/auth/me')
        return response.data
    },

    // Update user profile
    updateProfile: async (profileData) => {
        const response = await apiRequest.put('/users/profile', profileData)
        return response.data
    },

    // Change password
    changePassword: async (passwordData) => {
        const response = await apiRequest.post('/auth/change-password', passwordData)
        return response.data
    },

    // Validate token
    validateToken: async () => {
        const response = await apiRequest.get('/auth/validate')
        return response.data
    },

    // Request password reset
    requestPasswordReset: async (email) => {
        const response = await apiRequest.post('/auth/request-password-reset', { email })
        return response.data
    },

    // Reset password with token
    resetPassword: async (token, newPassword) => {
        const response = await apiRequest.post('/auth/reset-password', {
            token,
            new_password: newPassword,
        })
        return response.data
    },

    // Verify email
    verifyEmail: async (token) => {
        const response = await apiRequest.post('/auth/verify-email', { token })
        return response.data
    },

    // Resend verification email
    resendVerificationEmail: async () => {
        const response = await apiRequest.post('/auth/resend-verification')
        return response.data
    },
}