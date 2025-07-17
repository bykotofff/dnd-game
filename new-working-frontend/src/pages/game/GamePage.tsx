import React, { useEffect, useState, useCallback, useRef } from 'react';
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
    SpeakerXMarkIcon,
    MapIcon,
    SparklesIcon,
    FireIcon,
    HeartIcon,
    ShieldCheckIcon,
    StarIcon,
    BoltIcon,
    MoonIcon,
    SunIcon,
    CloudIcon,
    BeakerIcon,
    BookOpenIcon,
    UserIcon,
    UserCircleIcon,
    MicrophoneIcon,
    VideoCameraIcon,
    PhoneIcon,
    PhoneXMarkIcon,
    PlayIcon,
    PauseIcon,
    EllipsisVerticalIcon,
    CommandLineIcon
} from '@heroicons/react/24/outline';
import {
    CheckCircleIcon as CheckCircleSolid,
    WifiIcon as WifiSolid,
    HeartIcon as HeartSolid,
    ShieldCheckIcon as ShieldCheckSolid,
    StarIcon as StarSolid,
    UserIcon as UserSolid,
    MoonIcon as MoonSolid,
    SunIcon as SunSolid,
    CloudIcon as CloudSolid,
    FireIcon as FireSolid,
    BoltIcon as BoltSolid
} from '@heroicons/react/24/solid';

// Импорт реальных сервисов
import { useGameStore } from '../../store/gameStore';
import { useAuth } from '../../store/authStore';
import { gameService } from '../../services/gameService';
import { websocketService } from '../../services/websocketService';

// ✅ НОВЫЕ ИМПОРТЫ для поддержки персонажей
import { PlayersList } from '../../components/game/PlayersList';
import type { PlayerInfo, WebSocketGameState } from '../../types/game';

// Базовый компонент Button
const Button = ({
                    children,
                    onClick,
                    variant = 'default',
                    size = 'default',
                    className = '',
                    disabled = false,
                    type = 'button',
                    ...props
                }) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        ghost: 'text-gray-400 hover:bg-gray-700 hover:text-white focus:ring-gray-500',
        outline: 'border border-gray-600 text-gray-300 hover:bg-gray-700 focus:ring-gray-500',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
        magic: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500',
        dice: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 focus:ring-blue-500'
    };
    const sizes = {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        default: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

// Компонент для отображения кубика
const DiceIcon = ({ sides, className = "w-6 h-6" }) => {
    const diceVariants = {
        d4: "🔺",
        d6: "⚀",
        d8: "🔶",
        d10: "🔟",
        d12: "🔮",
        d20: "🎲",
        d100: "💯"
    };

    return (
        <span className={`${className} inline-flex items-center justify-center text-lg`}>
            {diceVariants[sides] || '🎲'}
        </span>
    );
};

// ✅ ОБНОВЛЕННЫЙ PlayerCard компонент с поддержкой персонажей
const PlayerCard = ({ player, isCurrentUser = false, isOnline = true, className = "" }) => {
    const statusColor = isOnline ? "bg-green-500" : "bg-gray-400";
    const borderColor = isCurrentUser ? "border-blue-500" : "border-gray-600";

    // ✅ Поддержка как старого, так и нового формата данных
    const characterName = player.character_name || player.name;
    const username = player.username || player.user_name;
    const characterInfo = player.character_info;

    return (
        <div className={`
            relative p-3 rounded-lg border-2 transition-all duration-200 
            ${borderColor} 
            ${isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}
            ${className}
        `}>
            <div className="flex items-center space-x-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {characterName?.[0] || username?.[0] || 'U'}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${statusColor}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                            {/* ✅ ПРИОРИТЕТ: Показываем имя персонажа если есть */}
                            {characterName || username || 'Безымянный персонаж'}
                        </p>
                        {isCurrentUser && (
                            <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">Вы</span>
                        )}
                    </div>
                    {/* ✅ Показываем username если есть персонаж */}
                    {characterName && username && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            @{username}
                        </p>
                    )}
                    {/* ✅ Информация о персонаже */}
                    {characterInfo && (
                        <div className="mt-1 space-y-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {characterInfo.race} {characterInfo.character_class} {characterInfo.level} ур.
                            </p>
                            {characterInfo.current_hit_points !== undefined && (
                                <div className="flex items-center space-x-2">
                                    <HeartSolid className="w-3 h-3 text-red-500" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {characterInfo.current_hit_points}/{characterInfo.max_hit_points}
                                    </span>
                                    {characterInfo.armor_class && (
                                        <>
                                            <ShieldCheckSolid className="w-3 h-3 text-blue-500 ml-2" />
                                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                                AC {characterInfo.armor_class}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {/* ✅ Fallback для старого формата */}
                    {!characterInfo && (player.current_hp !== undefined && player.max_hp !== undefined) && (
                        <div className="flex items-center space-x-2 mt-1">
                            <HeartSolid className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {player.current_hp}/{player.max_hp}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ✅ ОБНОВЛЕННЫЙ ChatMessage компонент
const ChatMessage = ({ message, isCurrentUser = false }) => {
    const messageTime = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const getMessageIcon = () => {
        switch (message.type) {
            case 'action':
            case 'player_action':
                return <CommandLineIcon className="w-4 h-4 text-purple-500" />;
            case 'roll':
            case 'dice_roll':
                return <CubeIcon className="w-4 h-4 text-blue-500" />;
            case 'dm':
            case 'ai_response':
            case 'ai_dm':
                return <SparklesIcon className="w-4 h-4 text-yellow-500" />;
            case 'ooc':
                return <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500" />;
            case 'system':
                return <ExclamationTriangleIcon className="w-4 h-4 text-blue-500" />;
            default:
                return <UserIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    const getMessageColor = () => {
        switch (message.type) {
            case 'action':
            case 'player_action':
                return 'text-purple-600 dark:text-purple-400';
            case 'roll':
            case 'dice_roll':
                return 'text-blue-600 dark:text-blue-400';
            case 'dm':
            case 'ai_response':
            case 'ai_dm':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'ooc':
                return 'text-gray-600 dark:text-gray-400';
            case 'system':
                return 'text-blue-600 dark:text-blue-400';
            default:
                return 'text-gray-900 dark:text-white';
        }
    };

    const getMessageBackground = () => {
        switch (message.type) {
            case 'dm':
            case 'ai_response':
            case 'ai_dm':
                return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
            case 'action':
            case 'player_action':
                return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
            case 'system':
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
            case 'roll':
            case 'dice_roll':
                return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            default:
                return isCurrentUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        }
    };

    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg border ${getMessageBackground()}`}>
                <div className="flex items-center space-x-2 mb-1">
                    {getMessageIcon()}
                    <span className={`font-medium text-sm ${getMessageColor()}`}>
                        {/* ✅ ПРИОРИТЕТ: Показываем sender_name (имя персонажа) если есть */}
                        {message.sender_name || message.author || 'Неизвестный'}
                    </span>
                    <span className="text-xs text-gray-500">{messageTime}</span>
                </div>
                <div className={`text-sm ${isCurrentUser && message.type === 'chat' ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                    {message.content || message.message}
                </div>
                {/* ✅ Дополнительная информация для бросков */}
                {(message.type === 'dice_roll' || message.type === 'dice_check_result') && message.total && (
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Результат: {message.total}
                        {message.success !== undefined && (
                            <span className={`ml-2 ${message.success ? 'text-green-600' : 'text-red-600'}`}>
                                {message.success ? '✓ Успех' : '✗ Неудача'}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Функция для генерации случайной стартовой локации
const generateRandomStartLocation = (game) => {
    const locations = [
        {
            name: "Таверна 'Золотой Дракон'",
            description: "Уютная таверна с теплым камином и дружелюбным барменом. Идеальное место для начала приключений.",
            weather: "Ясно",
            time_of_day: "День",
            ambiance: "Спокойно"
        },
        {
            name: "Руины старого храма",
            description: "Полуразрушенный храм забытого божества. Колонны покрыты плющом, а в воздухе витает запах ладана и тайны.",
            weather: "Дождь",
            time_of_day: "Ночь",
            ambiance: "Мистически"
        },
        {
            name: "Торговый караван",
            description: "Большой торговый караван остановился на ночлег. Телеги полны товаров, а купцы обсуждают дела у костра.",
            weather: "Ветрено",
            time_of_day: "Вечер",
            ambiance: "Оживленно"
        }
    ];

    const randomLocation = locations[Math.floor(Math.random() * locations.length)];

    return {
        location: randomLocation.name,
        description: randomLocation.description,
        weather: randomLocation.weather,
        time_of_day: randomLocation.time_of_day,
        ambiance: randomLocation.ambiance,
        generated: true
    };
};

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
        chatMessages,
        currentScene,
        players,
        playersOnline,
        connectToGame,
        disconnectFromGame,
        sendAction,
        sendMessage,
        loadGame,
        rollDice,
        clearGame
    } = useGameStore();

    // ✅ НОВЫЕ СОСТОЯНИЯ для поддержки персонажей
    const [gameState, setGameState] = useState<WebSocketGameState | null>(null);
    const [playersWithCharacters, setPlayersWithCharacters] = useState<Record<string, PlayerInfo>>({});
    const [currentUserCharacter, setCurrentUserCharacter] = useState(null);

    // Локальное состояние интерфейса
    const [actionInput, setActionInput] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [playersCollapsed, setPlayersCollapsed] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [selectedDice, setSelectedDice] = useState('d20');
    const [diceModifier, setDiceModifier] = useState(0);
    const [isLoadingGame, setIsLoadingGame] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('scene'); // scene, chat, players
    const [generatedScene, setGeneratedScene] = useState(null);

    // Refs для автоскролла
    const messagesEndRef = useRef(null);
    const chatEndRef = useRef(null);

    // Локальные состояния для fallback
    const [localMessages, setLocalMessages] = useState([]);
    const [localPlayers, setLocalPlayers] = useState([]);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const [maxConnectionAttempts] = useState(3);
    const [hasTriedConnecting, setHasTriedConnecting] = useState(false);

    // Используем локальные состояния как fallback
    const actualMessages = messages?.length > 0 ? messages : localMessages;
    const actualPlayers = Object.keys(playersWithCharacters).length > 0 ? Object.values(playersWithCharacters) : (players?.length > 0 ? players : localPlayers);
    const actualCurrentScene = currentScene || generatedScene;

    // ✅ НОВАЯ ФУНКЦИЯ: Обработка WebSocket сообщений с поддержкой персонажей
    const handleWebSocketMessage = useCallback((data: any) => {
        try {
            const message = typeof data === 'string' ? JSON.parse(data) : data;

            switch (message.type) {
                case 'game_state':
                    // ✅ Обновляем состояние игры с информацией о персонажах
                    if (message.data) {
                        setGameState(message.data);
                        if (message.data.players) {
                            setPlayersWithCharacters(message.data.players);
                        }
                        if (message.data.your_character) {
                            setCurrentUserCharacter(message.data.your_character);
                        }
                    }
                    break;

                case 'chat_message':
                case 'player_action':
                case 'ai_response':
                case 'system':
                case 'dice_roll_request':
                case 'dice_check_result':
                    // ✅ Обновляем сообщения с поддержкой имен персонажей
                    const gameMessage = {
                        id: `${message.type}-${Date.now()}`,
                        type: message.type,
                        author: message.data.sender_name || message.data.player_name || message.data.author || 'Неизвестный',
                        sender_name: message.data.sender_name || message.data.player_name, // ✅ Новое поле
                        content: message.data.content || message.data.message || message.data.action,
                        timestamp: message.data.timestamp || new Date().toISOString(),
                        // ✅ Дополнительные поля для бросков
                        total: message.data.total,
                        success: message.data.success,
                        base_roll: message.data.base_roll,
                        modifier: message.data.modifier,
                        dc: message.data.dc
                    };

                    setLocalMessages(prev => [...prev, gameMessage]);
                    break;

                case 'error':
                    console.error('WebSocket error:', message.data.message);
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }, []);

    // Автопрокрутка к концу сообщений
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [actualMessages]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // ✅ ОБНОВЛЕННАЯ инициализация игры с поддержкой персонажей
    useEffect(() => {
        if (!gameId || !user?.id) return;

        let isCleanedUp = false;

        const initializeGame = async () => {
            try {
                setIsLoadingGame(true);
                setLoadError(null);

                // Загружаем информацию об игре
                const gameData = await gameService.getGame(gameId);
                if (isCleanedUp) return;

                loadGame(gameId);

                // ✅ Подключаемся к WebSocket с обработчиком персонажей
                if (!isConnected && !isConnecting) {
                    setHasTriedConnecting(true);

                    // Настраиваем обработчики WebSocket
                    websocketService.on('message', handleWebSocketMessage);
                    websocketService.on('connect', () => {
                        console.log('Connected to game WebSocket');
                        setConnectionAttempts(0);
                    });
                    websocketService.on('disconnect', () => {
                        console.log('Disconnected from game WebSocket');
                    });
                    websocketService.on('error', (error) => {
                        console.error('WebSocket error:', error);
                        setConnectionAttempts(prev => prev + 1);
                    });

                    await connectToGame(gameId);
                }

            } catch (error) {
                if (!isCleanedUp) {
                    console.error('Ошибка загрузки игры:', error);
                    setLoadError(error.message || 'Не удалось загрузить игру');
                }
            } finally {
                if (!isCleanedUp) {
                    setIsLoadingGame(false);
                }
            }
        };

        initializeGame();

        // Cleanup function
        return () => {
            isCleanedUp = true;
            websocketService.off('message', handleWebSocketMessage);
        };
    }, [gameId, user?.id, connectToGame, loadGame, isConnected, isConnecting, handleWebSocketMessage]);

    // Отдельный эффект для инициализации данных после загрузки
    useEffect(() => {
        if (!currentGame || generatedScene) return;

        // Генерируем стартовую локацию если её нет
        if (!currentScene) {
            const scene = generateRandomStartLocation(currentGame);
            setGeneratedScene(scene);
        }
    }, [currentGame, currentScene, generatedScene]);

    // Отдельный эффект для инициализации сообщений
    useEffect(() => {
        if (!currentGame || actualMessages.length > 0) return;

        // Добавляем приветственное сообщение только один раз
        setLocalMessages([
            {
                id: 'welcome',
                type: 'dm',
                author: 'Мастер игры',
                content: `Добро пожаловать в игру "${currentGame.name}"!
                
Скоро начнется увлекательное путешествие! Ваша группа собралась в уютной таверне, обсуждая предстоящие дела.`,
                timestamp: new Date().toISOString()
            }
        ]);
    }, [currentGame, actualMessages.length]);

    // ✅ ОБНОВЛЕННАЯ обработка отправки действия
    const handleActionSubmit = useCallback((e) => {
        e.preventDefault();
        if (!actionInput.trim() || !isConnected) return;

        // ✅ Отправляем действие через WebSocket с поддержкой персонажей
        websocketService.send({
            type: 'player_action',
            action: actionInput.trim()
        });

        setActionInput('');
    }, [actionInput, isConnected]);

    // ✅ ОБНОВЛЕННАЯ обработка отправки чата
    const handleChatSubmit = useCallback((e) => {
        e.preventDefault();
        if (!chatInput.trim() || !isConnected) return;

        // ✅ Отправляем сообщение через WebSocket
        websocketService.send({
            type: 'chat_message',
            content: chatInput.trim()
        });

        setChatInput('');
    }, [chatInput, isConnected]);

    // ✅ ОБНОВЛЕННАЯ обработка бросков кубиков
    const handleDiceRoll = useCallback((diceType) => {
        if (!isConnected) return;

        // ✅ Отправляем бросок через WebSocket
        websocketService.send({
            type: 'dice_roll',
            notation: diceType
        });
    }, [isConnected]);

    // Обработка переподключения
    const handleReconnect = useCallback(async () => {
        if (connectionAttempts >= maxConnectionAttempts) {
            setLoadError('Превышено максимальное количество попыток подключения. Перезагрузите страницу.');
            return;
        }

        try {
            setConnectionAttempts(prev => prev + 1);
            await connectToGame(gameId);
        } catch (error) {
            console.error('Reconnection failed:', error);
        }
    }, [connectionAttempts, maxConnectionAttempts, connectToGame, gameId]);

    // Cleanup при размонтировании
    useEffect(() => {
        return () => {
            // Отключаемся только при размонтировании компонента
            disconnectFromGame();
            clearGame();
        };
    }, []);

    // Показываем загрузку
    if (isLoadingGame && !currentGame) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-white mb-2">Загрузка игры...</h2>
                    <p className="text-gray-400">Подключение к серверу</p>
                </div>
            </div>
        );
    }

    // Показываем ошибку
    if (loadError) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Ошибка загрузки</h2>
                    <p className="text-gray-400 mb-4">{loadError}</p>
                    <div className="space-x-3">
                        <Button onClick={handleReconnect} disabled={connectionAttempts >= maxConnectionAttempts}>
                            {connectionAttempts >= maxConnectionAttempts ? 'Превышен лимит' : 'Попробовать снова'}
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/campaigns')}>
                            Вернуться к кампаниям
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentGame) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-white mb-2">Игра не найдена</h2>
                    <p className="text-gray-400 mb-4">Не удалось загрузить данные игры</p>
                    <Button onClick={() => navigate('/campaigns')}>
                        Вернуться к кампаниям
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/campaigns')}
                            className="text-gray-400 hover:text-white"
                        >
                            <ArrowLeftIcon className="w-4 h-4 mr-2" />
                            Назад
                        </Button>

                        <div>
                            <h1 className="text-lg font-semibold">{currentGame.name}</h1>
                            <div className="flex items-center space-x-2 text-sm">
                                {/* ✅ ОБНОВЛЕННЫЙ индикатор подключения */}
                                <div className="flex items-center space-x-1">
                                    {isConnected ? (
                                        <WifiSolid className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <WifiIcon className="w-4 h-4 text-red-500" />
                                    )}
                                    <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                                        {isConnected ? 'Подключено' : isConnecting ? 'Подключение...' : 'Отключено'}
                                    </span>
                                </div>

                                {/* ✅ Информация о сцене */}
                                {actualCurrentScene?.location && (
                                    <div className="flex items-center space-x-1">
                                        <MapIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-400">{actualCurrentScene.location}</span>
                                    </div>
                                )}

                                {/* ✅ Количество игроков онлайн */}
                                <div className="flex items-center space-x-1">
                                    <UsersIcon className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-400">
                                        {actualPlayers.filter(p => p.is_online !== false).length} игроков
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Быстрые броски кубиков */}
                        <Button
                            variant="dice"
                            size="sm"
                            onClick={() => handleDiceRoll('1d20')}
                            disabled={!isConnected}
                            title="Бросить d20"
                        >
                            <DiceIcon sides="d20" className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="dice"
                            size="sm"
                            onClick={() => handleDiceRoll('1d6')}
                            disabled={!isConnected}
                            title="Бросить d6"
                        >
                            <DiceIcon sides="d6" className="w-4 h-4" />
                        </Button>

                        {/* Настройки */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                        >
                            {soundEnabled ? (
                                <SpeakerWaveIcon className="w-4 h-4" />
                            ) : (
                                <SpeakerXMarkIcon className="w-4 h-4" />
                            )}
                        </Button>

                        <Button variant="ghost" size="sm">
                            <Cog6ToothIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Game Messages */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Current Scene */}
                    {actualCurrentScene && (
                        <div className="bg-gray-800 border-b border-gray-700 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-lg flex items-center space-x-2">
                                    <MapIcon className="w-5 h-5 text-blue-400" />
                                    <span>Текущая сцена</span>
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowDetails(!showDetails)}
                                >
                                    {showDetails ? 'Скрыть детали' : 'Показать детали'}
                                    {showDetails ? (
                                        <ChevronUpIcon className="w-4 h-4 ml-1" />
                                    ) : (
                                        <ChevronDownIcon className="w-4 h-4 ml-1" />
                                    )}
                                </Button>
                            </div>

                            <AnimatePresence>
                                {showDetails && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                <div className="flex items-center space-x-1">
                                                    <MapIcon className="w-4 h-4 text-gray-500" />
                                                    <span className="font-medium text-white">
                                                        {actualCurrentScene.location}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <CloudSolid className="w-4 h-4 text-gray-500" />
                                                    <span className="text-gray-400">
                                                        {actualCurrentScene.weather || 'Ясно'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <SunIcon className="w-4 h-4 text-gray-500" />
                                                    <span className="text-gray-400">
                                                        {actualCurrentScene.time_of_day || 'День'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-gray-700 rounded-lg">
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    {actualCurrentScene.description}
                                                </p>
                                                {actualCurrentScene.ambiance && (
                                                    <p className="mt-2 text-xs text-gray-400 italic">
                                                        Атмосфера: {actualCurrentScene.ambiance}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                        {actualMessages.length === 0 ? (
                            <div className="text-center py-8">
                                <SparklesIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">
                                    Ожидание начала игры...
                                </p>
                            </div>
                        ) : (
                            actualMessages.map((message, index) => (
                                <ChatMessage
                                    key={message.id || index}
                                    message={message}
                                    isCurrentUser={message.author === user?.username || message.sender_name === currentUserCharacter?.name}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Action Input */}
                    <div className="border-t border-gray-700 p-4 bg-gray-800">
                        <form onSubmit={handleActionSubmit} className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <CommandLineIcon className="w-5 h-5 text-purple-400" />
                                <span className="font-medium text-white">Игровое действие</span>
                                {/* ✅ Показываем имя персонажа если есть */}
                                {currentUserCharacter && (
                                    <span className="text-sm text-gray-400">
                                        ({currentUserCharacter.name})
                                    </span>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={actionInput}
                                    onChange={(e) => setActionInput(e.target.value)}
                                    placeholder={currentUserCharacter ?
                                        `Что делает ${currentUserCharacter.name}?` :
                                        "Что делает ваш персонаж?"
                                    }
                                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    disabled={!isConnected}
                                />
                                <Button
                                    type="submit"
                                    variant="magic"
                                    disabled={!actionInput.trim() || !isConnected}
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-gray-400">
                                💡 Опишите действие вашего персонажа. ИИ Мастер ответит и при необходимости попросит бросить кубики.
                            </p>
                        </form>
                    </div>
                </div>

                {/* Right Panel - Players & Chat */}
                <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-700">
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`flex-1 px-4 py-2 text-sm font-medium ${
                                activeTab === 'players'
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <UsersIcon className="w-4 h-4 inline mr-2" />
                            Игроки
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex-1 px-4 py-2 text-sm font-medium ${
                                activeTab === 'chat'
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <ChatBubbleLeftIcon className="w-4 h-4 inline mr-2" />
                            Чат
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-hidden">
                        {activeTab === 'players' && (
                            <div className="p-4 space-y-3 overflow-y-auto">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-white">
                                        Игроки ({actualPlayers.length})
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => setPlayersCollapsed(!playersCollapsed)}
                                    >
                                        {playersCollapsed ? (
                                            <ChevronDownIcon className="w-4 h-4" />
                                        ) : (
                                            <ChevronUpIcon className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>

                                {/* ✅ ИСПОЛЬЗУЕМ ОБНОВЛЕННЫЙ PlayerCard с поддержкой персонажей */}
                                {!playersCollapsed && (
                                    <div className="space-y-2">
                                        {actualPlayers.length > 0 ? (
                                            actualPlayers.map((player, index) => (
                                                <PlayerCard
                                                    key={player.user_id || player.id || index}
                                                    player={player}
                                                    isCurrentUser={player.user_id === user?.id || player.username === user?.username}
                                                    isOnline={player.is_online !== false}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-4">
                                                <UserIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-400">
                                                    Игроки еще не подключились
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ✅ Показываем информацию о текущем ходе */}
                                {gameState?.turn_info?.current_player_id && (
                                    <div className="mt-4 p-2 bg-blue-900/20 rounded-lg border border-blue-700">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                            <span className="text-sm text-blue-300">
                                                Ход: {
                                                playersWithCharacters[gameState.turn_info.current_player_id]?.character_name ||
                                                playersWithCharacters[gameState.turn_info.current_player_id]?.username ||
                                                'Неизвестный игрок'
                                            }
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* ✅ Ваш персонаж */}
                                {currentUserCharacter && (
                                    <div className="mt-4 p-3 bg-green-900/20 rounded-lg border border-green-700">
                                        <h4 className="text-sm font-medium text-green-300 mb-2">Ваш персонаж</h4>
                                        <div className="space-y-1 text-xs text-gray-300">
                                            <div className="font-medium">{currentUserCharacter.name}</div>
                                            <div className="text-gray-400">
                                                {currentUserCharacter.race} {currentUserCharacter.character_class} {currentUserCharacter.level} ур.
                                            </div>
                                            {currentUserCharacter.current_hit_points !== undefined && (
                                                <div className="flex items-center space-x-1">
                                                    <HeartSolid className="w-3 h-3 text-red-400" />
                                                    <span>{currentUserCharacter.current_hit_points}/{currentUserCharacter.max_hit_points}</span>
                                                </div>
                                            )}
                                            {currentUserCharacter.armor_class && (
                                                <div className="flex items-center space-x-1">
                                                    <ShieldCheckSolid className="w-3 h-3 text-blue-400" />
                                                    <span>AC {currentUserCharacter.armor_class}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'chat' && (
                            <div className="flex flex-col h-full">
                                {/* Chat Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {chatMessages.length === 0 ? (
                                        <div className="text-center py-8">
                                            <ChatBubbleLeftIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-400">
                                                Начните общение с другими игроками
                                            </p>
                                        </div>
                                    ) : (
                                        chatMessages.map((message, index) => (
                                            <ChatMessage
                                                key={message.id || index}
                                                message={message}
                                                isCurrentUser={message.author === user?.username}
                                            />
                                        ))
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat Input */}
                                <div className="border-t border-gray-700 p-3">
                                    <form onSubmit={handleChatSubmit} className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            placeholder="Сообщение игрокам..."
                                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            disabled={!isConnected}
                                        />
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={!chatInput.trim() || !isConnected}
                                        >
                                            <PaperAirplaneIcon className="w-4 h-4" />
                                        </Button>
                                    </form>
                                    <p className="text-xs text-gray-500 mt-1">
                                        💬 Чат для общения между игроками
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
                    <div className="absolute right-0 top-0 h-full w-80 bg-gray-800 shadow-xl">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-medium text-white">Игроки</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    ✕
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {actualPlayers.map((player, index) => (
                                    <PlayerCard
                                        key={player.user_id || player.id || index}
                                        player={player}
                                        isCurrentUser={player.user_id === user?.id || player.username === user?.username}
                                        isOnline={player.is_online !== false}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamePage;