import axios from 'axios'

// Base API URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Create axios instance
export const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Auth token management
let authToken = null

export const setAuthToken = (token) => {
    authToken = token
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
        delete api.defaults.headers.common['Authorization']
    }
}

export const removeAuthToken = () => {
    authToken = null
    delete api.defaults.headers.common['Authorization']
}

export const getAuthToken = () => authToken

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Add timestamp to avoid caching issues
        config.params = {
            ...config.params,
            _t: Date.now(),
        }

        // Log requests in development
        if (import.meta.env.DEV) {
            console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
                params: config.params,
                data: config.data,
            })
        }

        return config
    },
    (error) => {
        console.error('🚨 API Request Error:', error)
        return Promise.reject(error)
    }
)

// Response interceptor
api.interceptors.response.use(
    (response) => {
        // Log responses in development
        if (import.meta.env.DEV) {
            console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                status: response.status,
                data: response.data,
            })
        }

        return response
    },
    async (error) => {
        const originalRequest = error.config

        console.error('🚨 API Response Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data,
        })

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            // Try to refresh token
            const refreshToken = localStorage.getItem('refreshToken')
            if (refreshToken && authToken) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
                        refresh_token: refreshToken,
                    })

                    const newToken = response.data.access_token
                    setAuthToken(newToken)
                    localStorage.setItem('accessToken', newToken)

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${newToken}`
                    return api(originalRequest)
                } catch (refreshError) {
                    // Refresh failed, redirect to login
                    removeAuthToken()
                    localStorage.removeItem('accessToken')
                    localStorage.removeItem('refreshToken')

                    // Dispatch logout action (handled by store)
                    window.dispatchEvent(new CustomEvent('auth:logout'))

                    return Promise.reject(refreshError)
                }
            } else {
                // No refresh token, redirect to login
                removeAuthToken()
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')

                window.dispatchEvent(new CustomEvent('auth:logout'))
            }
        }

        // Handle network errors
        if (error.code === 'NETWORK_ERROR' || !error.response) {
            error.message = 'Проблема с подключением к серверу'
        }

        // Handle specific error codes
        if (error.response?.status === 403) {
            error.message = 'Недостаточно прав доступа'
        } else if (error.response?.status === 404) {
            error.message = 'Ресурс не найден'
        } else if (error.response?.status === 500) {
            error.message = 'Внутренняя ошибка сервера'
        } else if (error.response?.status >= 400 && error.response?.status < 500) {
            error.message = error.response.data?.detail || 'Ошибка запроса'
        }

        return Promise.reject(error)
    }
)

// Generic API functions
export const apiRequest = {
    get: (url, config = {}) => api.get(url, config),
    post: (url, data = {}, config = {}) => api.post(url, data, config),
    put: (url, data = {}, config = {}) => api.put(url, data, config),
    patch: (url, data = {}, config = {}) => api.patch(url, data, config),
    delete: (url, config = {}) => api.delete(url, config),
}

// File upload helper
export const uploadFile = async (url, file, onProgress = null) => {
    const formData = new FormData()
    formData.append('file', file)

    const config = {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }

    if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
            const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
            )
            onProgress(percentCompleted)
        }
    }

    return api.post(url, formData, config)
}

// WebSocket URL helper
export const getWebSocketURL = (path) => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = import.meta.env.VITE_WS_HOST || window.location.host
    return `${wsProtocol}//${wsHost}/api/ws${path}`
}

// Health check
export const healthCheck = async () => {
    try {
        const response = await api.get('/health')
        return response.data
    } catch (error) {
        throw new Error('Server is not responding')
    }
}

// Error helpers
export const isNetworkError = (error) => {
    return error.code === 'NETWORK_ERROR' || !error.response
}

export const getErrorMessage = (error) => {
    if (isNetworkError(error)) {
        return 'Проблема с подключением к серверу'
    }

    return error.response?.data?.detail || error.message || 'Произошла ошибка'
}

export const isValidationError = (error) => {
    return error.response?.status === 422 || error.response?.status === 400
}

export const getValidationErrors = (error) => {
    if (!isValidationError(error)) return {}

    const errors = {}
    const details = error.response?.data?.detail || []

    if (Array.isArray(details)) {
        details.forEach((detail) => {
            if (detail.loc && detail.loc.length > 1) {
                const field = detail.loc[detail.loc.length - 1]
                errors[field] = detail.msg
            }
        })
    }

    return errors
}

// Request cancellation
export const createCancelToken = () => {
    const source = axios.CancelToken.source()
    return {
        token: source.token,
        cancel: source.cancel,
    }
}

export const isRequestCancelled = (error) => {
    return axios.isCancel(error)
}

// Retry helper
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
    let lastError

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await requestFn()
        } catch (error) {
            lastError = error

            if (i === maxRetries || error.response?.status < 500) {
                throw error
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
        }
    }

    throw lastError
}

export default api