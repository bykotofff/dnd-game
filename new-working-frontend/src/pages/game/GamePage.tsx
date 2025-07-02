import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeftIcon,
    Cog6ToothIcon,
    WifiIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    PaperAirplaneIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    SpeakerWaveIcon,
    UsersIcon,
    ChatBubbleLeftIcon,
    CubeIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    SpeakerXMarkIcon
} from '@heroicons/react/24/outline';

// Импорт реальных сервисов
import { useGameStore } from '../../store/gameStore';
import { useAuth } from '../../store/authStore';
import { gameService } from '../../services/gameService';
import { websocketService } from '../../services/websocketService';

// Имитация существующих компонентов
const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', disabled = false, ...props }) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        ghost: 'text-gray-400 hover:bg-gray-700 hover:text-white',
        outline: 'border border-gray-600 text-gray-300 hover:bg-gray-700',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700'
    };
    const sizes = {
        sm: 'px-2 py-1 text-sm',
        default: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

const Card = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ children, className = '' }) => (
    <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${className}`}>
        {children}
    </div>
);

const CardContent = ({ children, className = '' }) => (
    <div className={`p-4 ${className}`}>
        {children}
    </div>
);

const CardTitle = ({ children, className = '' }) => (
    <h3 className={`font-semibold text-gray-900 dark:text-white ${className}`}>
        {children}
    </h3>
);

const GamePage = () => {
    // Параметры и навигация
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Получаем состояние из gameStore
    const {
        currentGame,
        isConnected,
        isConnecting,
        connectionError,
        messages,
        currentScene,
        players,
        playersOnline,
        connectToGame,
        disconnectFromGame,
        sendAction,
        sendMessage,
        setCurrentGame,
        loadGame
    } = useGameStore();

    // Локальное состояние интерфейса
    const [actionInput, setActionInput] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [playersCollapsed, setPlayersCollapsed] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [selectedDice, setSelectedDice] = useState('d20');
    const [diceModifier, setDiceModifier] = useState(0);
    const [isLoadingGame, setIsLoadingGame] = useState(false);
    const [loadError, setLoadError] = useState(null);

    // Загрузка игры при монтировании
    useEffect(() => {
        const loadGameData = async () => {
            if (!gameId || !user) return;

            setIsLoadingGame(true);
            setLoadError(null);

            try {
                console.log('Loading game data:', gameId);
                await loadGame(gameId);
                setIsLoadingGame(false);
            } catch (error) {
                console.error('Failed to load game:', error);
                setLoadError(error.message || 'Не удалось загрузить игру');
                setIsLoadingGame(false);
            }
        };

        loadGameData();
    }, [gameId, user, loadGame]);

    // Автоматическое подключение к WebSocket
    useEffect(() => {
        if (currentGame && gameId && !isConnected && !isConnecting && !loadError) {
            console.log('Connecting to game WebSocket:', gameId);
            connectToGame(gameId).catch((error) => {
                console.error('Failed to connect to game:', error);
            });
        }
    }, [currentGame, gameId, isConnected, isConnecting, connectToGame, loadError]);

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            if (isConnected) {
                disconnectFromGame();
            }
        };
    }, [isConnected, disconnectFromGame]);

    // Обработчики событий - теперь используют реальные сервисы
    const handleActionSubmit = async () => {
        if (!actionInput.trim() || !gameId) return;

        try {
            // Отправляем действие через WebSocket для немедленного отображения
            await sendAction(actionInput.trim());

            // Также отправляем на backend для обработки ИИ
            await gameService.getAiResponse(gameId, actionInput.trim(), {
                current_scene: currentScene?.description,
                players: players?.length || 0
            });

            setActionInput('');
        } catch (error) {
            console.error('Failed to send action:', error);
        }
    };

    const handleChatSubmit = async () => {
        if (!chatInput.trim()) return;

        try {
            await sendMessage(chatInput.trim(), false);
            setChatInput('');
        } catch (error) {
            console.error('Failed to send chat message:', error);
        }
    };

    const handleDiceRoll = async () => {
        if (!gameId) return;

        try {
            const notation = selectedDice + (diceModifier !== 0 ? (diceModifier > 0 ? '+' + diceModifier : diceModifier) : '');
            await gameService.rollDice(gameId, notation, 'manual_roll');
        } catch (error) {
            console.error('Failed to roll dice:', error);
        }
    };

    const handleLeaveGame = () => {
        if (isConnected) {
            disconnectFromGame();
        }
        navigate('/campaigns');
    };

    // Статус подключения
    const connectionStatus = isConnected ? {
        icon: CheckCircleIcon,
        text: 'Подключен',
        color: 'text-green-400'
    } : isConnecting ? {
        icon: WifiIcon,
        text: 'Подключение...',
        color: 'text-yellow-400'
    } : {
        icon: ExclamationTriangleIcon,
        text: 'Ошибка',
        color: 'text-red-400'
    };

    const getMessageStyle = (type) => {
        switch (type) {
            case 'ai_dm':
                return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-900 dark:text-purple-100';
            case 'action':
                return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-900 dark:text-green-100';
            case 'dice_roll':
                return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-900 dark:text-red-100';
            case 'chat':
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100';
            default:
                return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        }
    };

    const quickActions = ['Восприятие', 'Исследование', 'Прислушаться'];

    // Показываем состояние загрузки
    if (isLoadingGame) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Загрузка игры...</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Подключение к серверу</p>
                </div>
            </div>
        );
    }

    // Показываем ошибку загрузки
    if (loadError) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ошибка загрузки</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{loadError}</p>
                    <Button onClick={() => window.location.reload()}>
                        Попробовать снова
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            <div className="flex flex-col h-screen">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                            <Button
                                onClick={handleLeaveGame}
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white flex-shrink-0"
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                            </Button>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg font-semibold truncate">
                                    {currentGame?.name || 'Игровая сессия'}
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    D&D 5e • {(playersOnline || players || []).length} игроков онлайн
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 flex-shrink-0">
                            {/* Статус подключения */}
                            <div className="flex items-center space-x-2">
                                <connectionStatus.icon className={`w-4 h-4 ${connectionStatus.color}`} />
                                <span className={`text-sm ${connectionStatus.color}`}>
                                    {connectionStatus.text}
                                </span>
                            </div>

                            {/* Кнопки управления */}
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {soundEnabled ? <SpeakerWaveIcon className="w-4 h-4" /> : <SpeakerXMarkIcon className="w-4 h-4" />}
                            </button>
                            <Button variant="ghost" size="sm">
                                <Cog6ToothIcon className="w-4 h-4" />
                            </Button>
                            <Button
                                onClick={handleLeaveGame}
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                                Покинуть игру
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Game content */}
                <div className="flex-1 flex min-h-0">
                    {/* Main content area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Scene panel - исправлена проблема с показом деталей */}
                        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-lg flex items-center">
                                    <EyeIcon className="w-5 h-5 mr-2" />
                                    Текущая сцена
                                </h3>
                                <Button
                                    onClick={() => setShowDetails(!showDetails)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 dark:text-blue-400"
                                >
                                    {showDetails ? 'Скрыть детали' : 'Показать детали'}
                                    {showDetails ? <ChevronUpIcon className="w-4 h-4 ml-1" /> : <ChevronDownIcon className="w-4 h-4 ml-1" />}
                                </Button>
                            </div>

                            <div className={`transition-all duration-300 ${showDetails ? 'max-h-96 overflow-y-auto' : 'max-h-20 overflow-hidden'}`}>
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                        📍 {currentScene?.location || 'Неизвестная локация'} •
                                        🌤️ {currentScene?.weather || 'Ясно'} •
                                        🕒 {currentScene?.time_of_day || 'День'}
                                    </div>
                                    <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                        {currentScene?.description || 'Описание сцены недоступно. Мастер готовит новое приключение...'}
                                    </div>
                                    {currentScene?.atmosphere && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                            {currentScene.atmosphere}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                            {!messages || messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">🤖 ИИ Мастер готовит приключение</h3>
                                        <p className="text-gray-500 dark:text-gray-500 text-sm">Создается уникальный сюжет для вашей партии...</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`p-3 rounded-lg border ${getMessageStyle(message.type)} shadow-sm`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-sm">
                                                {message.sender || message.sender_name || 'Неизвестный'}
                                            </span>
                                            <span className="text-xs opacity-60">
                                                {new Date(message.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-relaxed">{message.content}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Quick Actions - улучшенные кнопки в компактной панели */}
                        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Быстрые действия:</span>
                                {quickActions.map((action, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActionInput(action)}
                                        className="px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center"
                                    >
                                        {action === 'Восприятие' && <EyeIcon className="w-3 h-3 mr-1" />}
                                        {action === 'Исследование' && <MagnifyingGlassIcon className="w-3 h-3 mr-1" />}
                                        {action === 'Прислушаться' && <SpeakerWaveIcon className="w-3 h-3 mr-1" />}
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Player Actions Input - увеличенное поле ввода */}
                        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <PaperAirplaneIcon className="w-4 h-4 inline mr-1" />
                                    Действия персонажа:
                                </label>
                                <div className="flex space-x-2">
                                    <textarea
                                        value={actionInput}
                                        onChange={(e) => setActionInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                handleActionSubmit();
                                            }
                                        }}
                                        placeholder={!isConnected ?
                                            "Отключено от сервера..." :
                                            "Опишите что делает ваш персонаж... (Ctrl+Enter для отправки)"
                                        }
                                        disabled={!isConnected}
                                        className="flex-1 px-3 py-2 min-h-[100px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:opacity-50"
                                        rows={4}
                                    />
                                    <Button
                                        onClick={handleActionSubmit}
                                        disabled={!actionInput.trim() || !isConnected}
                                        className="px-4 py-2 h-fit"
                                    >
                                        <PaperAirplaneIcon className="w-5 h-5" />
                                    </Button>
                                </div>
                                {!isConnected && (
                                    <p className="text-xs text-red-500 mt-1">Подключение к серверу потеряно</p>
                                )}
                            </div>
                        </div>

                        {/* Dice Panel - восстановленный интерфейс кубиков */}
                        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                            <h4 className="font-semibold mb-3 flex items-center text-gray-900 dark:text-white">
                                <CubeIcon className="w-5 h-5 mr-2" />
                                Броски кубиков
                            </h4>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <select
                                        value={selectedDice}
                                        onChange={(e) => setSelectedDice(e.target.value)}
                                        className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map((dice) => (
                                            <option key={dice} value={dice}>{dice}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center space-x-1">
                                        <button
                                            onClick={() => setDiceModifier(Math.max(-10, diceModifier - 1))}
                                            className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                        >
                                            −
                                        </button>
                                        <span className="text-sm min-w-[2rem] text-center font-mono">
                                            {diceModifier > 0 ? '+' : ''}{diceModifier}
                                        </span>
                                        <button
                                            onClick={() => setDiceModifier(Math.min(10, diceModifier + 1))}
                                            className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <Button
                                        onClick={handleDiceRoll}
                                        variant="secondary"
                                        size="sm"
                                        disabled={!isConnected}
                                    >
                                        Бросить
                                    </Button>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {isConnected ? 'Готов к игре' : 'Отключено от сервера'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar - игроки и чат */}
                    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
                        {/* Players Panel - теперь скрываемая */}
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setPlayersCollapsed(!playersCollapsed)}
                                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center">
                                    <UsersIcon className="w-5 h-5 mr-2" />
                                    <span className="font-semibold">
                                        Игроки ({(players || []).filter(p => p.isOnline || p.is_online).length}/{(players || []).length})
                                    </span>
                                </div>
                                {playersCollapsed ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
                            </button>

                            {!playersCollapsed && (
                                <div className="px-3 pb-3 space-y-2">
                                    {(!players || players.length === 0) ? (
                                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                            <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Игроки подключаются...</p>
                                        </div>
                                    ) : (
                                        players.map((player) => (
                                            <div
                                                key={player.id || player.user_id}
                                                className={`p-2 rounded-lg border ${
                                                    player.isCurrentTurn || player.is_current_turn ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' :
                                                        player.isOnline || player.is_online ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
                                                            'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            player.isOnline || player.is_online ? 'bg-green-500' : 'bg-gray-400'
                                                        }`} />
                                                        <span className="font-medium text-sm">
                                                            {player.name || player.username || player.character_name}
                                                        </span>
                                                        {(player.isCurrentTurn || player.is_current_turn) && (
                                                            <span className="px-1 py-0.5 text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded">
                                                                Ход
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {player.initiative || '—'}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                    {player.character || player.character_name || 'Персонаж не выбран'}
                                                </div>
                                                {(player.hp || (player.current_hp !== undefined && player.max_hp !== undefined)) && (
                                                    <div className="flex items-center justify-between mt-2">
                                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                                            HP: {player.hp ? `${player.hp.current}/${player.hp.max}` : `${player.current_hp}/${player.max_hp}`}
                                                        </div>
                                                        <div className="flex-1 mx-2">
                                                            <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-green-500 transition-all duration-300"
                                                                    style={{
                                                                        width: `${player.hp ?
                                                                            (player.hp.current / player.hp.max) * 100 :
                                                                            (player.current_hp / player.max_hp) * 100
                                                                        }%`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                    <div className="flex gap-2 mt-3">
                                        <Button variant="outline" size="sm" className="flex-1 text-xs">
                                            Сменить персонажа
                                        </Button>
                                        <Button variant="ghost" size="sm" className="flex-1 text-xs">
                                            Пригласить игроков
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat - увеличенная область чата */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold flex items-center">
                                    <ChatBubbleLeftIcon className="w-5 h-5 mr-2" />
                                    Чат игроков
                                </h3>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-900 min-h-[200px]">
                                {/* Фильтруем сообщения чата из общих сообщений */}
                                {messages?.filter(msg => msg.type === 'chat' || msg.message_type === 'chat').length > 0 ? (
                                    messages
                                        .filter(msg => msg.type === 'chat' || msg.message_type === 'chat')
                                        .map((message) => (
                                            <div key={message.id} className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                                                <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">
                                                    {message.sender || message.sender_name || message.author}
                                                </div>
                                                <div className="text-sm text-blue-900 dark:text-blue-100">{message.content}</div>
                                            </div>
                                        ))
                                ) : (
                                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                        <ChatBubbleLeftIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Чат пуст. Напишите первое сообщение!</p>
                                    </div>
                                )}
                            </div>

                            {/* Chat input - улучшенное поле ввода */}
                            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleChatSubmit();
                                            }
                                        }}
                                        placeholder="Сообщение..."
                                        disabled={!isConnected}
                                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50"
                                    />
                                    <Button
                                        onClick={handleChatSubmit}
                                        disabled={!chatInput.trim() || !isConnected}
                                        size="sm"
                                    >
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                                {!isConnected && (
                                    <p className="text-xs text-red-500 mt-1">Отключено от сервера</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GamePage;