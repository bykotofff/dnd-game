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

// Компонент для игрока
const PlayerCard = ({ player, isCurrentUser = false, isOnline = true, className = "" }) => {
    const statusColor = isOnline ? "bg-green-500" : "bg-gray-400";
    const borderColor = isCurrentUser ? "border-blue-500" : "border-gray-600";

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
                        {player.character_name?.[0] || player.username?.[0] || 'U'}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${statusColor}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                            {player.character_name || 'Безымянный персонаж'}
                        </p>
                        {isCurrentUser && (
                            <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">Вы</span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {player.username || 'Игрок'}
                    </p>
                    {player.current_hp !== undefined && player.max_hp !== undefined && (
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

// Компонент для сообщения чата
const ChatMessage = ({ message, isCurrentUser = false }) => {
    const messageTime = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const getMessageIcon = () => {
        switch (message.type) {
            case 'action':
                return <CommandLineIcon className="w-4 h-4 text-purple-500" />;
            case 'roll':
                return <CubeIcon className="w-4 h-4 text-blue-500" />;
            case 'dm':
                return <SparklesIcon className="w-4 h-4 text-yellow-500" />;
            case 'ooc':
                return <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500" />;
            default:
                return <UserIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    const getMessageColor = () => {
        switch (message.type) {
            case 'action':
                return 'text-purple-600 dark:text-purple-400';
            case 'roll':
                return 'text-blue-600 dark:text-blue-400';
            case 'dm':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'ooc':
                return 'text-gray-600 dark:text-gray-400';
            default:
                return 'text-gray-900 dark:text-white';
        }
    };

    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}>
            <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                <div className="flex items-center space-x-2 mb-1">
                    {getMessageIcon()}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {message.author || 'Системное сообщение'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {messageTime}
                    </span>
                </div>
                <div className={`
                    px-3 py-2 rounded-lg
                    ${isCurrentUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }
                `}>
                    <p className={`text-sm ${getMessageColor()}`}>
                        {message.content}
                    </p>
                </div>
            </div>
        </div>
    );
};

// Генерация случайной стартовой локации с помощью ИИ
const generateRandomStartLocation = (campaign) => {
    const locations = [
        {
            name: "Таверна 'Пьяный дракон'",
            description: "Уютная таверна в небольшом городке, где собираются путешественники и местные жители. Камин весело потрескивает, а бард играет на лютне в углу.",
            weather: "Туман",
            time_of_day: "Вечер",
            ambiance: "Тепло и уютно"
        },
        {
            name: "Перекресток дорог",
            description: "Древний каменный перекресток, где сходятся четыре дороги. Старый указатель показывает направления к разным городам, но некоторые названия стерлись от времени.",
            weather: "Переменная облачность",
            time_of_day: "Утро",
            ambiance: "Таинственно"
        },
        {
            name: "Лагерь у реки",
            description: "Небольшая поляна у быстрой горной реки. Идеальное место для привала - есть пресная вода, а рядом растет хворост для костра.",
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
    const actualPlayers = players?.length > 0 ? players : (playersOnline?.length > 0 ? playersOnline : localPlayers);
    const actualCurrentScene = currentScene || generatedScene;

    // Автоскролл к последнему сообщению
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [actualMessages, scrollToBottom]);

    // Эффект загрузки игры (только один раз при монтировании)
    useEffect(() => {
        if (!gameId || !user) return;

        let isCleanedUp = false;
        let hasLoadedGame = false;
        let hasConnectedWS = false;

        const initializeGame = async () => {
            if (isCleanedUp) return;

            setIsLoadingGame(true);
            setLoadError(null);

            try {
                // Загружаем игру только если она еще не загружена в этом эффекте
                if (!hasLoadedGame && (!currentGame || currentGame.id !== gameId)) {
                    console.log('Loading game:', gameId);
                    await loadGame(gameId);
                    hasLoadedGame = true;
                }

                // Подключаемся к WebSocket только если:
                // 1. Еще не подключались в этом эффекте
                // 2. Не превышен лимит попыток подключения
                if (!hasConnectedWS && !isConnected && !isConnecting && !isCleanedUp &&
                    connectionAttempts < maxConnectionAttempts) {
                    console.log('Connecting to WebSocket for game:', gameId);
                    setHasTriedConnecting(true);
                    setConnectionAttempts(prev => prev + 1);
                    hasConnectedWS = true;

                    try {
                        await connectToGame(gameId);
                    } catch (wsError) {
                        console.warn('WebSocket connection failed:', wsError);
                        if (connectionAttempts >= maxConnectionAttempts - 1) {
                            setLoadError('Не удалось подключиться к серверу. Пожалуйста, проверьте подключение и попробуйте позже.');
                        }
                    }
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

        // Cleanup function - НЕ отключаем WebSocket здесь!
        return () => {
            isCleanedUp = true;
            // Не вызываем disconnectFromGame здесь, так как это приводит к немедленному отключению
        };
    }, [gameId, user?.id]); // Только основные зависимости

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
                content: `Добро пожаловать в игру "${currentGame.name}"! Приключение начинается...`,
                timestamp: new Date().toISOString()
            }
        ]);
    }, [currentGame, actualMessages.length]);

    // Отдельный эффект для инициализации игроков
    useEffect(() => {
        if (!user || actualPlayers.length > 0) return;

        setLocalPlayers([
            {
                user_id: user.id,
                character_id: 'char1',
                username: user.username,
                character_name: user.display_name || 'Искатель приключений',
                is_online: true,
                current_hp: 25,
                max_hp: 25,
                initiative: 15
            }
        ]);
    }, [user, actualPlayers.length]);

    // Отдельный эффект для очистки WebSocket при размонтировании компонента
    useEffect(() => {
        return () => {
            // Отключаем WebSocket только при полном размонтировании компонента
            console.log('Component unmounting, disconnecting WebSocket');
            if (isConnected) {
                disconnectFromGame();
            }
            clearGame();
        };
    }, []); // Пустой массив зависимостей - выполнится только при размонтировании

    // Обработчики
    const handleActionSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!actionInput.trim()) return;

        const action = actionInput.trim();
        setActionInput('');

        try {
            if (isConnected) {
                await sendAction(action);
            } else {
                console.warn('WebSocket not connected, action not sent');
            }
        } catch (error) {
            console.error('Ошибка отправки действия:', error);
        }
    }, [actionInput, isConnected, sendAction]);

    const handleChatSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const message = chatInput.trim();
        setChatInput('');

        try {
            if (isConnected) {
                await sendMessage(message);
            } else {
                console.warn('WebSocket not connected, message not sent');
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
        }
    }, [chatInput, isConnected, sendMessage]);

    const handleDiceRoll = useCallback(async () => {
        const notation = `1${selectedDice}${diceModifier > 0 ? `+${diceModifier}` : diceModifier < 0 ? `${diceModifier}` : ''}`;

        try {
            if (isConnected && rollDice) {
                await rollDice(notation, `Бросок ${selectedDice}`);
            } else {
                console.warn('WebSocket not connected, dice roll not sent');
            }
        } catch (error) {
            console.error('Ошибка броска кубика:', error);
        }
    }, [selectedDice, diceModifier, isConnected, rollDice]);

    const handleLeaveGame = useCallback(() => {
        if (isConnected) {
            disconnectFromGame();
        }
        clearGame();
        navigate('/campaigns');
    }, [isConnected, disconnectFromGame, clearGame, navigate]);

    // Статус подключения с учетом реального состояния
    const connectionStatus = isConnected ? {
        icon: CheckCircleSolid,
        text: 'Подключен',
        color: 'text-green-500'
    } : isConnecting ? {
        icon: WifiIcon,
        text: 'Подключение...',
        color: 'text-yellow-500'
    } : connectionError || connectionAttempts >= maxConnectionAttempts ? {
        icon: ExclamationTriangleIcon,
        text: 'Ошибка подключения',
        color: 'text-red-500'
    } : {
        icon: ExclamationTriangleIcon,
        text: 'Отключен',
        color: 'text-gray-500'
    };

    // Функция для повторной попытки подключения
    const handleRetryConnection = useCallback(async () => {
        if (connectionAttempts < maxConnectionAttempts) {
            setConnectionAttempts(prev => prev + 1);
            setLoadError(null);
            try {
                await connectToGame(gameId);
                console.log('Retry connection successful');
            } catch (error) {
                console.error('Retry connection failed:', error);
                if (connectionAttempts >= maxConnectionAttempts - 1) {
                    setLoadError('Не удалось подключиться к серверу после нескольких попыток.');
                }
            }
        }
    }, [connectionAttempts, maxConnectionAttempts, gameId, connectToGame]);

    // Показываем загрузку
    if (isLoadingGame) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Загрузка игры...</h3>
                    <p className="text-gray-600 dark:text-gray-400">Подключение к серверу и загрузка данных</p>
                </div>
            </div>
        );
    }

    // Показываем ошибку
    if (loadError) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ошибка загрузки</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{loadError}</p>
                    <div className="space-x-4">
                        {connectionAttempts < maxConnectionAttempts && (
                            <Button onClick={handleRetryConnection} variant="default">
                                Попробовать подключиться снова
                            </Button>
                        )}
                        <Button onClick={() => window.location.reload()} variant="outline">
                            Перезагрузить страницу
                        </Button>
                        <Button onClick={() => navigate('/campaigns')} variant="outline">
                            Вернуться к кампаниям
                        </Button>
                    </div>
                    {connectionAttempts >= maxConnectionAttempts && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                            Превышен лимит попыток подключения. Пожалуйста, проверьте работу сервера.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 py-3">
                    <Button
                        onClick={handleLeaveGame}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                    >
                        <ArrowLeftIcon className="w-5 h-5 mr-2" />
                        Выход
                    </Button>

                    <div className="flex items-center space-x-2">
                        <connectionStatus.icon className={`w-5 h-5 ${connectionStatus.color}`} />
                        <span className={`text-sm ${connectionStatus.color}`}>
                            {connectionStatus.text}
                        </span>
                    </div>

                    <Button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        variant="ghost"
                        size="sm"
                    >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                    </Button>
                </div>

                {/* Mobile Tab Navigation */}
                <div className="flex border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('scene')}
                        className={`flex-1 py-3 text-sm font-medium ${
                            activeTab === 'scene'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                                : 'text-gray-500 dark:text-gray-400'
                        }`}
                    >
                        <EyeIcon className="w-4 h-4 mx-auto mb-1" />
                        Сцена
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-3 text-sm font-medium ${
                            activeTab === 'chat'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                                : 'text-gray-500 dark:text-gray-400'
                        }`}
                    >
                        <ChatBubbleLeftIcon className="w-4 h-4 mx-auto mb-1" />
                        Чат
                    </button>
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`flex-1 py-3 text-sm font-medium ${
                            activeTab === 'players'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                                : 'text-gray-500 dark:text-gray-400'
                        }`}
                    >
                        <UsersIcon className="w-4 h-4 mx-auto mb-1" />
                        Игроки
                    </button>
                </div>
            </div>

            {/* Desktop Header */}
            <header className="hidden lg:block bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button
                            onClick={handleLeaveGame}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                        >
                            <ArrowLeftIcon className="w-5 h-5 mr-2" />
                            Покинуть игру
                        </Button>

                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

                        <div className="flex items-center space-x-3">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                {currentGame?.name || 'Игровая сессия'}
                            </h1>
                            {currentGame?.description && (
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    {currentGame.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <connectionStatus.icon className={`w-5 h-5 ${connectionStatus.color}`} />
                            <span className={`text-sm font-medium ${connectionStatus.color}`}>
                                {connectionStatus.text}
                            </span>
                        </div>

                        <Button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            variant="ghost"
                            size="sm"
                            title={soundEnabled ? 'Отключить звук' : 'Включить звук'}
                        >
                            {soundEnabled ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerXMarkIcon className="w-5 h-5" />}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            title="Настройки игры"
                        >
                            <Cog6ToothIcon className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex h-screen lg:pt-0 pt-0">
                {/* Desktop Layout */}
                <div className="hidden lg:flex flex-1">
                    {/* Left Panel - Scene */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-800">
                        {/* Scene Header */}
                        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-semibold flex items-center">
                                    <EyeIcon className="w-6 h-6 mr-2 text-blue-600" />
                                    Текущая сцена
                                </h2>
                                <Button
                                    onClick={() => setShowDetails(!showDetails)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 dark:text-blue-400"
                                >
                                    {showDetails ? 'Скрыть' : 'Детали'}
                                    {showDetails ? <ChevronUpIcon className="w-4 h-4 ml-1" /> : <ChevronDownIcon className="w-4 h-4 ml-1" />}
                                </Button>
                            </div>

                            {/* Scene Info */}
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center space-x-1">
                                        <MapIcon className="w-4 h-4 text-gray-500" />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {actualCurrentScene?.location || 'Неизвестная локация'}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <CloudSolid className="w-4 h-4 text-gray-500" />
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {actualCurrentScene?.weather || 'Ясно'}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        {actualCurrentScene?.time_of_day === 'День' ? (
                                            <SunSolid className="w-4 h-4 text-yellow-500" />
                                        ) : actualCurrentScene?.time_of_day === 'Ночь' ? (
                                            <MoonSolid className="w-4 h-4 text-blue-500" />
                                        ) : (
                                            <CloudSolid className="w-4 h-4 text-gray-500" />
                                        )}
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {actualCurrentScene?.time_of_day || 'День'}
                                        </span>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {showDetails && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                    {actualCurrentScene?.description || 'Описание сцены загружается...'}
                                                </p>
                                                {actualCurrentScene?.ambiance && (
                                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                                                        Атмосфера: {actualCurrentScene.ambiance}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                            {actualMessages.map((message, index) => (
                                <ChatMessage
                                    key={message.id || index}
                                    message={message}
                                    isCurrentUser={message.author === user?.username}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Action Input */}
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                            <form onSubmit={handleActionSubmit} className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <CommandLineIcon className="w-5 h-5 text-purple-600" />
                                    <span className="font-medium text-gray-900 dark:text-white">Игровое действие</span>
                                </div>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={actionInput}
                                        onChange={(e) => setActionInput(e.target.value)}
                                        placeholder="Что делает ваш персонаж?"
                                        disabled={!isConnected}
                                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={!actionInput.trim() || !isConnected}
                                        variant="magic"
                                        size="default"
                                    >
                                        <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                                        Действие
                                    </Button>
                                </div>
                                {!isConnected && (
                                    <p className="text-xs text-red-500">
                                        {connectionError || 'Нет подключения к серверу'}
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Right Panel - Chat & Players */}
                    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
                        {/* Players Section */}
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <div className="p-4">
                                <button
                                    onClick={() => setPlayersCollapsed(!playersCollapsed)}
                                    className="flex items-center justify-between w-full text-left"
                                >
                                    <div className="flex items-center space-x-2">
                                        <UsersIcon className="w-5 h-5 text-green-600" />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            Игроки ({actualPlayers.length})
                                        </span>
                                    </div>
                                    {playersCollapsed ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
                                </button>

                                <AnimatePresence>
                                    {!playersCollapsed && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-3 space-y-2"
                                        >
                                            {actualPlayers.map((player, index) => (
                                                <PlayerCard
                                                    key={player.user_id || index}
                                                    player={player}
                                                    isCurrentUser={player.user_id === user?.id}
                                                    isOnline={player.is_online}
                                                />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Dice Roller */}
                        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <CubeIcon className="w-5 h-5 text-blue-600" />
                                <span className="font-medium text-gray-900 dark:text-white">Кубики</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <select
                                        value={selectedDice}
                                        onChange={(e) => setSelectedDice(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="d4">d4</option>
                                        <option value="d6">d6</option>
                                        <option value="d8">d8</option>
                                        <option value="d10">d10</option>
                                        <option value="d12">d12</option>
                                        <option value="d20">d20</option>
                                        <option value="d100">d100</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={diceModifier}
                                        onChange={(e) => setDiceModifier(parseInt(e.target.value) || 0)}
                                        placeholder="Мод"
                                        className="w-16 px-2 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <Button
                                    onClick={handleDiceRoll}
                                    variant="dice"
                                    size="default"
                                    className="w-full"
                                    disabled={!isConnected}
                                >
                                    <DiceIcon sides={selectedDice} className="w-4 h-4 mr-2" />
                                    Бросить {selectedDice}
                                    {diceModifier !== 0 && (diceModifier > 0 ? `+${diceModifier}` : `${diceModifier}`)}
                                </Button>
                                {!isConnected && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Требуется подключение к серверу
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Chat Section */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-2">
                                    <ChatBubbleLeftIcon className="w-5 h-5 text-gray-600" />
                                    <span className="font-medium text-gray-900 dark:text-white">Чат</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-900">
                                {actualMessages.filter(msg => msg.type === 'chat' || msg.type === 'ooc').map((message, index) => (
                                    <div key={message.id || index} className="text-sm">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {message.author}:
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300 ml-2">
                                            {message.content}
                                        </p>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                                <form onSubmit={handleChatSubmit} className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder={isConnected ? "Сообщение..." : "Нет подключения"}
                                        disabled={!isConnected}
                                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={!chatInput.trim() || !isConnected}
                                        variant="default"
                                        size="sm"
                                    >
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Layout */}
                <div className="lg:hidden flex-1 flex flex-col">
                    {/* Tab Content */}
                    <div className="flex-1 overflow-hidden">
                        {/* Scene Tab */}
                        {activeTab === 'scene' && (
                            <div className="h-full flex flex-col bg-white dark:bg-gray-800">
                                {/* Scene Info */}
                                <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <div className="flex items-center space-x-1">
                                                <MapIcon className="w-4 h-4 text-gray-500" />
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {actualCurrentScene?.location || 'Неизвестная локация'}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <CloudSolid className="w-4 h-4 text-gray-500" />
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {actualCurrentScene?.weather || 'Ясно'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {actualCurrentScene?.description || 'Описание сцены загружается...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                                    {actualMessages.map((message, index) => (
                                        <ChatMessage
                                            key={message.id || index}
                                            message={message}
                                            isCurrentUser={message.author === user?.username}
                                        />
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Action Input */}
                                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                                    <form onSubmit={handleActionSubmit} className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <CommandLineIcon className="w-5 h-5 text-purple-600" />
                                            <span className="font-medium text-gray-900 dark:text-white">Действие</span>
                                        </div>
                                        <div className="flex space-x-2">
                                            <input
                                                type="text"
                                                value={actionInput}
                                                onChange={(e) => setActionInput(e.target.value)}
                                                placeholder="Что делает ваш персонаж?"
                                                disabled={!isConnected}
                                                className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                            />
                                            <Button
                                                type="submit"
                                                disabled={!actionInput.trim() || !isConnected}
                                                variant="magic"
                                                size="default"
                                            >
                                                <PaperAirplaneIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        {!isConnected && (
                                            <p className="text-xs text-red-500">
                                                {connectionError || 'Нет подключения к серверу'}
                                            </p>
                                        )}
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Chat Tab */}
                        {activeTab === 'chat' && (
                            <div className="h-full flex flex-col bg-white dark:bg-gray-800">
                                {/* Dice Roller */}
                                <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <CubeIcon className="w-5 h-5 text-blue-600" />
                                        <span className="font-medium text-gray-900 dark:text-white">Кубики</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <select
                                            value={selectedDice}
                                            onChange={(e) => setSelectedDice(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="d4">d4</option>
                                            <option value="d6">d6</option>
                                            <option value="d8">d8</option>
                                            <option value="d10">d10</option>
                                            <option value="d12">d12</option>
                                            <option value="d20">d20</option>
                                            <option value="d100">d100</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={diceModifier}
                                            onChange={(e) => setDiceModifier(parseInt(e.target.value) || 0)}
                                            placeholder="Мод"
                                            className="w-16 px-2 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <Button
                                            onClick={handleDiceRoll}
                                            variant="dice"
                                            size="sm"
                                            disabled={!isConnected}
                                        >
                                            <DiceIcon sides={selectedDice} className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Chat Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                                    {actualMessages.filter(msg => msg.type === 'chat' || msg.type === 'ooc').map((message, index) => (
                                        <div key={message.id || index} className="text-sm">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {message.author}:
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 ml-2">
                                                {message.content}
                                            </p>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat Input */}
                                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                                    <form onSubmit={handleChatSubmit} className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            placeholder={isConnected ? "Сообщение..." : "Нет подключения"}
                                            disabled={!isConnected}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50"
                                        />
                                        <Button
                                            type="submit"
                                            disabled={!chatInput.trim() || !isConnected}
                                            variant="default"
                                            size="default"
                                        >
                                            <PaperAirplaneIcon className="w-4 h-4" />
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Players Tab */}
                        {activeTab === 'players' && (
                            <div className="h-full overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                                {actualPlayers.map((player, index) => (
                                    <PlayerCard
                                        key={player.user_id || index}
                                        player={player}
                                        isCurrentUser={player.user_id === user?.id}
                                        isOnline={player.is_online}
                                        className="w-full"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GamePage;