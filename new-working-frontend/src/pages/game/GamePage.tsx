import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeftIcon,
    Cog6ToothIcon,
    UsersIcon,
    ChatBubbleLeftRightIcon,
    CubeIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    SignalIcon,
    SignalSlashIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import LoadingScreen from '@/components/ui/LoadingScreen';
import GameChat from '@/components/game/GameChat';
import DicePanel from '@/components/game/DicePanel';
import InitiativeTracker from '@/components/game/InitiativeTracker';
import PlayersPanel from '@/components/game/PlayersPanel';
import ScenePanel from '@/components/game/ScenePanel';
import CharacterCard from '@/components/game/CharacterCard';
import { useGameData, useGameActions } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { ConnectionState } from '@/services/websocketService';

const GamePage: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const {
        currentGame,
        isConnected,
        isConnecting,
        connectionError,
        messages,
        playersOnline,
        activeCharacters,
        currentScene,
        selectedCharacterId,
    } = useGameData();

    const {
        connectToGame,
        disconnectFromGame,
        loadGame,
        leaveGame,
        clearGame,
    } = useGameActions();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activePanel, setActivePanel] = useState<'chat' | 'players' | 'dice' | 'initiative'>('chat');

    // ✅ ИСПРАВЛЕНИЕ: Безопасная инициализация данных
    const isLoading = isConnecting;
    const error = connectionError;
    const connectionState = isConnected ? ConnectionState.CONNECTED :
        isConnecting ? ConnectionState.CONNECTING :
            ConnectionState.DISCONNECTED;

    // ✅ ИСПРАВЛЕНИЕ: Безопасная работа с массивами
    const players = playersOnline || [];
    const activePlayers = players;
    const currentTurn = null; // TODO: Добавить в store
    const turnNumber = 1; // TODO: Добавить в store

    // Загрузка игры при монтировании
    useEffect(() => {
        if (gameId && connectToGame && disconnectFromGame) {
            // ✅ Используем только connectToGame, который теперь сам загружает игру
            connectToGame(gameId).catch((error) => {
                console.error('Failed to connect to game:', error);
            });
        }

        // Очистка при размонтировании
        return () => {
            if (disconnectFromGame) {
                disconnectFromGame();
            }
        };
    }, [gameId, connectToGame, disconnectFromGame]);

    // Обработка выхода из игры
    const handleLeaveGame = async () => {
        if (confirm('Вы уверены, что хотите покинуть игру?')) {
            await leaveGame();
            navigate('/campaigns');
        }
    };

    // Получение статуса подключения
    const getConnectionStatus = () => {
        switch (connectionState) {
            case ConnectionState.CONNECTED:
                return { color: 'text-green-500', icon: SignalIcon, text: 'Подключено' };
            case ConnectionState.CONNECTING:
                return { color: 'text-yellow-500', icon: ClockIcon, text: 'Подключение...' };
            case ConnectionState.RECONNECTING:
                return { color: 'text-orange-500', icon: ClockIcon, text: 'Переподключение...' };
            case ConnectionState.ERROR:
                return { color: 'text-red-500', icon: ExclamationTriangleIcon, text: 'Ошибка' };
            default:
                return { color: 'text-gray-500', icon: SignalSlashIcon, text: 'Отключено' };
        }
    };

    const connectionStatus = getConnectionStatus();

    // ✅ ИСПРАВЛЕНИЕ: Безопасный поиск текущего игрока
    const currentPlayer = Array.isArray(players) ?
        players.find(p => p.user_id === user?.id) :
        undefined;
    const isCurrentTurn = currentTurn === currentPlayer?.character_id;

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Card className="max-w-md w-full mx-4">
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            Ошибка
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                        <div className="flex gap-2">
                            <Button onClick={() => navigate('/campaigns')} variant="outline">
                                Вернуться к кампаниям
                            </Button>
                            {gameId && (
                                <Button onClick={() => loadGame(gameId)} variant="primary">
                                    Попробовать снова
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!currentGame) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Игра не найдена</h2>
                    <Button onClick={() => navigate('/campaigns')} variant="outline">
                        Вернуться к кампаниям
                    </Button>
                </div>
            </div>
        );
    }

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
                                {currentGame.title}
                            </h1>
                            <p className="text-sm text-gray-400">
                                {currentGame.game_system} • {players.length} игроков онлайн
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
                                gameId={gameId!}
                            />
                        </div>

                        {/* Character sheet area */}
                        {selectedCharacterId && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-gray-700 bg-gray-800"
                            >
                                <div className="p-4">
                                    <CharacterCard characterId={selectedCharacterId} />
                                </div>
                            </motion.div>
                        )}

                        {/* Current turn indicator */}
                        {isCurrentTurn && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-blue-600 text-white p-3 mx-4 mb-4 rounded-lg shadow-lg"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">Ваш ход!</span>
                                    <span className="text-sm opacity-80">
                                        Ход #{turnNumber}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 384, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="bg-gray-800 border-l border-gray-700 flex flex-col"
                            >
                                {/* Sidebar tabs */}
                                <div className="flex bg-gray-900 border-b border-gray-700">
                                    <button
                                        onClick={() => setActivePanel('chat')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                                            activePanel === 'chat'
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                        }`}
                                    >
                                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                        Чат
                                    </button>
                                    <button
                                        onClick={() => setActivePanel('players')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                                            activePanel === 'players'
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                        }`}
                                    >
                                        <UsersIcon className="w-4 h-4" />
                                        Игроки
                                    </button>
                                    <button
                                        onClick={() => setActivePanel('dice')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                                            activePanel === 'dice'
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                        }`}
                                    >
                                        <CubeIcon className="w-4 h-4" />
                                        Кости
                                    </button>
                                    <button
                                        onClick={() => setActivePanel('initiative')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                                            activePanel === 'initiative'
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                        }`}
                                    >
                                        <ClockIcon className="w-4 h-4" />
                                        Инициатива
                                    </button>
                                </div>

                                {/* Sidebar content */}
                                <div className="flex-1 overflow-hidden">
                                    {activePanel === 'chat' && (
                                        <GameChat
                                            gameId={gameId!}
                                            messages={messages}
                                        />
                                    )}
                                    {activePanel === 'players' && (
                                        <PlayersPanel
                                            players={activePlayers}
                                            currentUserId={user?.id}
                                        />
                                    )}
                                    {activePanel === 'dice' && (
                                        <DicePanel gameId={gameId!} />
                                    )}
                                    {activePanel === 'initiative' && (
                                        <InitiativeTracker
                                            gameId={gameId!}
                                            players={activePlayers}
                                            currentTurn={currentTurn}
                                        />
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Sidebar toggle */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-l-lg border border-r-0 border-gray-600 z-10 transition-colors"
                    >
                        <motion.div
                            animate={{ rotate: sidebarOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                        </motion.div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GamePage;