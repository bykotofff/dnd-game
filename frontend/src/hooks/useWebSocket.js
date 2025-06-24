import { useState, useEffect, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { getWebSocketURL } from '@services/api'

const RECONNECT_INTERVAL = 3000
const MAX_RECONNECT_ATTEMPTS = 5

export const useWebSocket = (path, options = {}) => {
    const { token } = useSelector((state) => state.auth)

    const [socket, setSocket] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState(null)
    const [messages, setMessages] = useState([])

    const reconnectAttempts = useRef(0)
    const reconnectTimeout = useRef(null)
    const messageHandlers = useRef(new Map())

    const {
        autoReconnect = true,
        onConnect,
        onDisconnect,
        onError,
        onMessage,
    } = options

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (!token || !path) return

        setIsConnecting(true)
        setError(null)

        try {
            const wsUrl = `${getWebSocketURL(path)}?token=${token}`
            const ws = new WebSocket(wsUrl)

            ws.onopen = () => {
                console.log('🔌 WebSocket connected:', path)
                setSocket(ws)
                setIsConnected(true)
                setIsConnecting(false)
                setError(null)
                reconnectAttempts.current = 0

                onConnect?.()
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    console.log('📨 WebSocket message:', data)

                    setMessages(prev => [...prev, data])

                    // Call specific message handlers
                    const handler = messageHandlers.current.get(data.type)
                    if (handler) {
                        handler(data)
                    }

                    // Call global message handler
                    onMessage?.(data)
                } catch (error) {
                    console.error('❌ Error parsing WebSocket message:', error)
                }
            }

            ws.onclose = (event) => {
                console.log('🔌 WebSocket closed:', event.code, event.reason)
                setSocket(null)
                setIsConnected(false)
                setIsConnecting(false)

                onDisconnect?.(event)

                // Auto-reconnect if enabled and connection was not closed intentionally
                if (autoReconnect && event.code !== 1000 && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts.current++
                    console.log(`🔄 Attempting to reconnect... (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`)

                    reconnectTimeout.current = setTimeout(() => {
                        connect()
                    }, RECONNECT_INTERVAL)
                }
            }

            ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error)
                setError('WebSocket connection error')
                setIsConnecting(false)

                onError?.(error)
            }

        } catch (error) {
            console.error('❌ Failed to create WebSocket:', error)
            setError('Failed to create WebSocket connection')
            setIsConnecting(false)
        }
    }, [token, path, autoReconnect, onConnect, onDisconnect, onError, onMessage])

    // Disconnect from WebSocket
    const disconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current)
            reconnectTimeout.current = null
        }

        if (socket) {
            socket.close(1000, 'Disconnected by user')
        }

        setSocket(null)
        setIsConnected(false)
        setIsConnecting(false)
        setError(null)
        reconnectAttempts.current = 0
    }, [socket])

    // Send message
    const sendMessage = useCallback((message) => {
        if (socket && isConnected) {
            const messageString = typeof message === 'string' ? message : JSON.stringify(message)
            socket.send(messageString)
            console.log('📤 WebSocket send:', message)
            return true
        } else {
            console.warn('⚠️ Cannot send message: WebSocket not connected')
            return false
        }
    }, [socket, isConnected])

    // Add message handler
    const addMessageHandler = useCallback((messageType, handler) => {
        messageHandlers.current.set(messageType, handler)

        return () => {
            messageHandlers.current.delete(messageType)
        }
    }, [])

    // Send specific message types
    const sendChatMessage = useCallback((content, characterId = null, isOOC = false) => {
        return sendMessage({
            type: 'chat_message',
            data: {
                content,
                character_id: characterId,
                is_ooc: isOOC,
            },
        })
    }, [sendMessage])

    const sendPlayerAction = useCallback((action, characterId = null) => {
        return sendMessage({
            type: 'player_action',
            data: {
                action,
                character_id: characterId,
            },
        })
    }, [sendMessage])

    const sendDiceRoll = useCallback((diceNotation, purpose = '', characterId = null, modifiers = {}) => {
        return sendMessage({
            type: 'dice_roll',
            data: {
                dice_notation: diceNotation,
                purpose,
                character_id: characterId,
                modifiers,
            },
        })
    }, [sendMessage])

    const sendCharacterUpdate = useCallback((characterId, updates) => {
        return sendMessage({
            type: 'character_update',
            data: {
                character_id: characterId,
                updates,
            },
        })
    }, [sendMessage])

    const sendGameCommand = useCallback((command, args = {}) => {
        return sendMessage({
            type: 'game_command',
            data: {
                command,
                args,
            },
        })
    }, [sendMessage])

    // Clear messages
    const clearMessages = useCallback(() => {
        setMessages([])
    }, [])

    // Get messages of specific type
    const getMessagesByType = useCallback((messageType) => {
        return messages.filter(msg => msg.type === messageType)
    }, [messages])

    // Auto-connect when token and path are available
    useEffect(() => {
        if (token && path) {
            connect()
        }

        return () => {
            disconnect()
        }
    }, [token, path, connect, disconnect])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current)
            }
            disconnect()
        }
    }, [disconnect])

    return {
        // Connection state
        socket,
        isConnected,
        isConnecting,
        error,

        // Messages
        messages,

        // Actions
        connect,
        disconnect,
        sendMessage,
        addMessageHandler,
        clearMessages,

        // Convenient message senders
        sendChatMessage,
        sendPlayerAction,
        sendDiceRoll,
        sendCharacterUpdate,
        sendGameCommand,

        // Utilities
        getMessagesByType,

        // Stats
        reconnectAttempts: reconnectAttempts.current,
    }
}