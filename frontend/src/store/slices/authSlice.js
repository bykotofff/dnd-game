import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI } from '@services/authAPI'
import { setAuthToken, removeAuthToken } from '@services/api'

// Initial state
const initialState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    initialized: false,
}

// Async thunks

// Initialize app - check for stored token
export const initializeApp = createAsyncThunk(
    'auth/initialize',
    async (_, { dispatch, getState }) => {
        const { auth } = getState()

        if (auth.token) {
            try {
                setAuthToken(auth.token)
                const user = await authAPI.getCurrentUser()
                return { user, token: auth.token }
            } catch (error) {
                // Token is invalid, clear it
                removeAuthToken()
                throw error
            }
        }

        return null
    }
)

// Login user
export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await authAPI.login(credentials)
            setAuthToken(response.access_token)

            return {
                user: {
                    id: response.user_id,
                    username: response.username,
                },
                token: response.access_token,
                refreshToken: response.refresh_token,
            }
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.detail || 'Ошибка входа в систему'
            )
        }
    }
)

// Register user
export const registerUser = createAsyncThunk(
    'auth/register',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await authAPI.register(userData)
            setAuthToken(response.access_token)

            return {
                user: {
                    id: response.user_id,
                    username: response.username,
                },
                token: response.access_token,
                refreshToken: response.refresh_token,
            }
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.detail || 'Ошибка регистрации'
            )
        }
    }
)

// Refresh token
export const refreshAuthToken = createAsyncThunk(
    'auth/refresh',
    async (_, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState()
            if (!auth.refreshToken) {
                throw new Error('No refresh token available')
            }

            const response = await authAPI.refreshToken(auth.refreshToken)
            setAuthToken(response.access_token)

            return {
                token: response.access_token,
                refreshToken: response.refresh_token,
            }
        } catch (error) {
            removeAuthToken()
            return rejectWithValue('Сессия истекла')
        }
    }
)

// Get current user profile
export const getCurrentUser = createAsyncThunk(
    'auth/getCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const user = await authAPI.getCurrentUser()
            return user
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.detail || 'Ошибка получения профиля'
            )
        }
    }
)

// Update user profile
export const updateUserProfile = createAsyncThunk(
    'auth/updateProfile',
    async (profileData, { rejectWithValue }) => {
        try {
            const user = await authAPI.updateProfile(profileData)
            return user
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.detail || 'Ошибка обновления профиля'
            )
        }
    }
)

// Change password
export const changePassword = createAsyncThunk(
    'auth/changePassword',
    async (passwordData, { rejectWithValue }) => {
        try {
            await authAPI.changePassword(passwordData)
            return true
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.detail || 'Ошибка смены пароля'
            )
        }
    }
)

// Logout user
export const logoutUser = createAsyncThunk(
    'auth/logout',
    async (_, { dispatch }) => {
        try {
            await authAPI.logout()
        } catch (error) {
            // Even if logout fails on server, clear local state
            console.warn('Logout failed on server:', error)
        } finally {
            removeAuthToken()
        }
    }
)

// Auth slice
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Clear error
        clearError: (state) => {
            state.error = null
        },

        // Set user (for updates from other parts of app)
        setUser: (state, action) => {
            state.user = { ...state.user, ...action.payload }
        },

        // Clear auth state
        clearAuth: (state) => {
            state.user = null
            state.token = null
            state.refreshToken = null
            state.isAuthenticated = false
            state.error = null
            removeAuthToken()
        },

        // Set loading state
        setLoading: (state, action) => {
            state.loading = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            // Initialize app
            .addCase(initializeApp.pending, (state) => {
                state.loading = true
            })
            .addCase(initializeApp.fulfilled, (state, action) => {
                state.loading = false
                state.initialized = true

                if (action.payload) {
                    state.user = action.payload.user
                    state.token = action.payload.token
                    state.isAuthenticated = true
                }
            })
            .addCase(initializeApp.rejected, (state) => {
                state.loading = false
                state.initialized = true
                state.user = null
                state.token = null
                state.refreshToken = null
                state.isAuthenticated = false
            })

            // Login
            .addCase(loginUser.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false
                state.user = action.payload.user
                state.token = action.payload.token
                state.refreshToken = action.payload.refreshToken
                state.isAuthenticated = true
                state.error = null
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
                state.isAuthenticated = false
            })

            // Register
            .addCase(registerUser.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false
                state.user = action.payload.user
                state.token = action.payload.token
                state.refreshToken = action.payload.refreshToken
                state.isAuthenticated = true
                state.error = null
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
                state.isAuthenticated = false
            })

            // Refresh token
            .addCase(refreshAuthToken.fulfilled, (state, action) => {
                state.token = action.payload.token
                state.refreshToken = action.payload.refreshToken
            })
            .addCase(refreshAuthToken.rejected, (state) => {
                state.user = null
                state.token = null
                state.refreshToken = null
                state.isAuthenticated = false
            })

            // Get current user
            .addCase(getCurrentUser.fulfilled, (state, action) => {
                state.user = action.payload
            })

            // Update profile
            .addCase(updateUserProfile.pending, (state) => {
                state.loading = true
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.loading = false
                state.user = { ...state.user, ...action.payload }
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })

            // Change password
            .addCase(changePassword.pending, (state) => {
                state.loading = true
            })
            .addCase(changePassword.fulfilled, (state) => {
                state.loading = false
                state.error = null
            })
            .addCase(changePassword.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })

            // Logout
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null
                state.token = null
                state.refreshToken = null
                state.isAuthenticated = false
                state.error = null
                state.loading = false
            })
    },
})

export const { clearError, setUser, clearAuth, setLoading } = authSlice.actions

export default authSlice.reducer