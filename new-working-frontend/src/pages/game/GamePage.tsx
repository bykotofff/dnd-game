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
    MicrophoneIcon,
    UserGroupIcon,
    ChatBubbleLeftIcon,
    DiceIcon
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import GameChat from '@/components/game/GameChat';
import ScenePanel from '@/components/game/ScenePanel';
import PlayersPanel from '@/components/game/PlayersPanel';
import InitiativeTracker from '@/components/game/InitiativeTracker';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/store/authStore';
import { gameService } from '@/services/gameService';

const GamePage: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Получаем состояние и действия из store
    const store = useGameStore();
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
        setCurrentGame
    } = store;

    // Локальное состояние для загрузки
    const [isLoadingGame, setIsLoadingGame] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Локальное состояние интерфейса
    const [actionInput, setActionInput] = useState('');
    const [showHelperButtons, setShowHelperButtons] = useState(true);

    // Загрузка игры напрямую через gameService
    useEffect(() => {
        const loadGameData = async () => {
            if (!gameId || !user) return;

            setIsLoadingGame(true);
            setLoadError(null);

            try {
                console.log('Loading game data:', gameId);
                const gameData = await gameService.getGame(gameId);
                console.log('Game data loaded:', gameData);

                // Устанавливаем игру в store
                setCurrentGame(gameData);
                setIsLoadingGame(false);

            } catch (error: any) {
                console.error('Failed to load game:', error);
                setLoadError(error.message || 'Не удалось загрузить игру');
                setIsLoadingGame(false);
            }
        };

        loadGameData();
    }, [gameId, user, setCurrentGame]);

    // Автоматическое подключение к WebSocket после загрузки игры
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

    // Обработка отправки действия
    const handleActionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!actionInput.trim()) return;

        sendAction(actionInput.trim());
        setActionInput('');
    };

    // Обработка выхода из игры
    const handleLeaveGame = () => {
        if (isConnected) {
            disconnectFromGame();
        }
        navigate('/campaigns');
    };

    // Вспомогательные кнопки для действий
    const helperActions = [
        { text: 'Осмотреться', action: 'Внимательно осматриваю окружающую обстановку' },
        { text: 'Слушать', action: 'Прислушиваюсь к звукам вокруг' },
        { text: 'Поиск', action: 'Ищу что-то полезное или подозрительное' },
        { text: 'Подождать', action: 'Жду и наблюдаю за происходящим' },
        { text: 'Идти вперед', action: 'Осторожно двигаюсь вперед' },
        { text: 'Говорить', action: 'Обращаюсь к группе:' }
    ];

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
        text: 'Не подключен',
        color: 'text-red-400'
    };

    // Проверка ID игры
    if (!gameId) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Некорректный ID игры</h2>
                    <Button onClick={() => navigate('/campaigns')} variant="outline">
                        Вернуться к кампаниям
                    </Button>
                </div>
            </div>
        );
    }

    // Показываем ошибку если игра не найдена
    if (loadError && !isLoadingGame) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Игра не найдена</h2>
                    <p className="text-gray-400 mb-4">{loadError}</p>
                    <div className="space-x-2">
                        <Button
                            onClick={() => window.location.reload()}
                            variant="primary"
                        >
                            Попробовать еще раз
                        </Button>
                        <Button onClick={() => navigate('/campaigns')} variant="outline">
                            Вернуться к кампаниям
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Показываем загрузку
    if (isLoadingGame || (!currentGame && !loadError)) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-white mb-2">Загрузка игры...</h2>
                    <p className="text-gray-400">Получаем данные об игре</p>
                </div>
            </div>
        );
    }

    // Основной интерфейс игры
    return (
        <div className="min-h-screen bg-gray-900 text-white flex">
            {/* Main game area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button
                            onClick={() => navigate('/campaigns')}
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-semibold text-white">
                                {currentGame?.name || 'Игровая сессия'}
                            </h1>
                            <p className="text-sm text-gray-400">
                                D&D 5e • {(players || playersOnline || []).length} игроков онлайн
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* Connection status */}
                        <div className="flex items-center space-x-2">
                            <connectionStatus.icon className={`w-4 h-4 ${connectionStatus.color}`} />
                            <span className={`text-sm ${connectionStatus.color}`}>
                                {connectionStatus.text}
                            </span>
                        </div>

                        {/* Settings */}
                        <Button variant="ghost" className="text-gray-400 hover:text-white">
                            <Cog6ToothIcon className="w-5 h-5" />
                        </Button>

                        {/* Leave game */}
                        <Button
                            onClick={handleLeaveGame}
                            variant="outline"
                            className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                        >
                            Покинуть игру
                        </Button>
                    </div>
                </header>

                {/* Game content */}
                <div className="flex-1 flex">
                    {/* Main content area */}
                    <div className="flex-1 flex flex-col">
                        {/* Scene panel */}
                        <div className="flex-1 p-4">
                            <ScenePanel
                                scene={currentScene}
                                gameId={gameId}
                                className="h-full"
                            />
                        </div>

                        {/* Player Actions Input */}
                        <div className="bg-gray-800 border-t border-gray-700 p-4">
                            <Card className="bg-gray-700 border-gray-600">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg font-medium text-white flex items-center">
                                        <MicrophoneIcon className="w-5 h-5 mr-2" />
                                        Действия персонажа
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Input form */}
                                    <form onSubmit={handleActionSubmit} className="flex space-x-2">
                                        <Input
                                            type="text"
                                            placeholder="Опишите действие вашего персонажа..."
                                            value={actionInput}
                                            onChange={(e) => setActionInput(e.target.value)}
                                            className="flex-1 bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                            disabled={!isConnected}
                                        />
                                        <Button
                                            type="submit"
                                            disabled={!actionInput.trim() || !isConnected}
                                            variant="primary"
                                        >
                                            <PaperAirplaneIcon className="w-4 h-4" />
                                        </Button>
                                    </form>

                                    {/* Helper action buttons */}
                                    {showHelperButtons && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-300">Быстрые действия:</span>
                                                <Button
                                                    variant="darkGhost"
                                                    size="sm"
                                                    onClick={() => setShowHelperButtons(!showHelperButtons)}
                                                >
                                                    Скрыть
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                                {helperActions.map((action, index) => (
                                                    <Button
                                                        key={index}
                                                        variant="darkOutline"
                                                        size="sm"
                                                        onClick={() => setActionInput(action.action)}
                                                        disabled={!isConnected}
                                                    >
                                                        {action.text}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {!showHelperButtons && (
                                        <Button
                                            variant="darkGhost"
                                            size="sm"
                                            onClick={() => setShowHelperButtons(true)}
                                        >
                                            Показать быстрые действия
                                        </Button>
                                    )}

                                    {/* Подсказки */}
                                    <div className="text-xs text-gray-400 bg-gray-800/50 rounded p-2">
                                        💡 <strong>Подсказка:</strong> Опишите конкретные действия: "Ищу секретные двери", "Подкрадываюсь к охраннику", "Читаю заклинание"
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
                        {/* Players panel */}
                        <div className="p-4 border-b border-gray-700">
                            <PlayersPanel />
                        </div>

                        {/* Initiative tracker */}
                        <div className="p-4 border-b border-gray-700">
                            <InitiativeTracker />
                        </div>

                        {/* Chat */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <GameChat
                                gameId={gameId}
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>

                {/* Connection error display */}
                {connectionError && (
                    <div className="bg-red-900/50 border-t border-red-700 p-4">
                        <div className="flex items-center space-x-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                            <span className="text-red-300">
                                Ошибка подключения: {connectionError}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => connectToGame(gameId)}
                                className="ml-auto text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                            >
                                Переподключиться
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamePage;