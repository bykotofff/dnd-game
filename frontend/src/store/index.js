import { configureStore } from '@reduxjs/toolkit'
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'

// Slices
import authSlice from './slices/authSlice'
import characterSlice from './slices/characterSlice'
import gameSlice from './slices/gameSlice'
import campaignSlice from './slices/campaignSlice'
import uiSlice from './slices/uiSlice'

// Middleware
import apiMiddleware from './middleware/apiMiddleware'
import websocketMiddleware from './middleware/websocketMiddleware'

// Persist config for auth slice (to maintain login state)
const authPersistConfig = {
    key: 'auth',
    storage,
    whitelist: ['token', 'user', 'isAuthenticated']
}

// Persist config for UI preferences
const uiPersistConfig = {
    key: 'ui',
    storage,
    whitelist: ['theme', 'sidebarCollapsed', 'soundEnabled', 'notificationsEnabled']
}

// Root reducer
const rootReducer = {
    auth: persistReducer(authPersistConfig, authSlice),
    characters: characterSlice,
    games: gameSlice,
    campaigns: campaignSlice,
    ui: persistReducer(uiPersistConfig, uiSlice),
}

// Configure store
export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
                ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
                ignoredPaths: ['items.dates'],
            },
            immutableCheck: {
                ignoredPaths: ['ignoredPath', 'anotherIgnoredPath'],
            },
        })
            .concat(apiMiddleware)
            .concat(websocketMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
})

// Persistor for redux-persist
export const persistor = persistStore(store)

// Types for TypeScript (if needed)
export const getState = store.getState
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Action creators for common operations
export const {
    // Auth actions
    loginStart,
    loginSuccess,
    loginFailure,
    logout,
    setUser,
    clearError: clearAuthError,
} = authSlice.actions

export const {
    // Character actions
    setCharacters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    setSelectedCharacter,
    setCharacterLoading,
} = characterSlice.actions

export const {
    // Game actions
    setCurrentGame,
    addMessage,
    updateGameState,
    setPlayers,
    setDiceResult,
    clearDiceHistory,
} = gameSlice.actions

export const {
    // Campaign actions
    setCampaigns,
    addCampaign,
    updateCampaign,
    setSelectedCampaign,
} = campaignSlice.actions

export const {
    // UI actions
    setTheme,
    toggleSidebar,
    setSoundEnabled,
    setNotificationsEnabled,
    showModal,
    hideModal,
    showToast,
    hideToast,
} = uiSlice.actions

// Selectors
export const selectAuth = (state) => state.auth
export const selectCharacters = (state) => state.characters
export const selectGames = (state) => state.games
export const selectCampaigns = (state) => state.campaigns
export const selectUI = (state) => state.ui

// Derived selectors
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectCurrentUser = (state) => state.auth.user
export const selectCurrentGame = (state) => state.games.currentGame
export const selectSelectedCharacter = (state) => state.characters.selectedCharacter
export const selectGameMessages = (state) => state.games.messages
export const selectDiceHistory = (state) => state.games.diceHistory

// Async thunk selectors
export const selectAuthLoading = (state) => state.auth.loading
export const selectCharactersLoading = (state) => state.characters.loading
export const selectGamesLoading = (state) => state.games.loading
export const selectCampaignsLoading = (state) => state.campaigns.loading

// Error selectors
export const selectAuthError = (state) => state.auth.error
export const selectCharactersError = (state) => state.characters.error
export const selectGamesError = (state) => state.games.error
export const selectCampaignsError = (state) => state.campaigns.error

export default store