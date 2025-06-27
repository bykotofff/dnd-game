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
        isLoading,
        error,
        connectionState,
        isConnected,
        players,
        activePlayers,
        currentTurn,
        turnNumber,
        currentScene,
    } = useGameData();

    const {
        joinGame,
        leaveGame,
        loadGame,
        clearGame,
    } = useGameActions();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activePanel, setActivePanel] = useState<'chat' | 'players' | 'dice' | 'initiative'>('chat');

    // Загрузка игры при монтировании
    useEffect(() => {
        if (gameId) {
            loadGame(gameId);
        }

        // Очистка при размонтировании
        return () => {
            clearGame();
        };
    }, [gameId, loadGame, clearGame]);

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

    // Поиск текущего игрока
    const currentPlayer = players.find(p => p.user_id === user?.id);
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
            <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/campaigns')}
                        className="text-gray-400 hover:text-white"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Button>

                    <div>
                        <h1 className="text-xl font-bold">{currentGame.name}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>Раунд {turnNumber}</span>
                            {currentScene && <span>• {currentScene}</span>}
                            <span>• {activePlayers.length} игроков онлайн</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Статус подключения */}
                    <div className={`flex items-center gap-2 text-sm ${connectionStatus.color}`}>
                        <connectionStatus.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{connectionStatus.text}</span>
                    </div>

                    {/* Настройки */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white"
                    >
                        <Cog6ToothIcon className="w-5 h-5" />
                    </Button>

                    {/* Выход */}
                    <Button
                        variant="ghost"
                        onClick={handleLeaveGame}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                        Покинуть игру
                    </Button>
                </div>
            </header>

            {/* Основной контент */}
            <div className="flex-1 flex overflow-hidden">
                {/* Левая панель - персонаж и информация */}
                <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
                    {/* Карточка персонажа */}
                    {currentPlayer && (
                        <div className="p-4 border-b border-gray-700">
                            <CharacterCard
                                player={currentPlayer}
                                isCurrentTurn={isCurrentTurn}
                                compact
                            />
                        </div>
                    )}

                    {/* Сцена */}
                    <div className="flex-1 overflow-auto">
                        <ScenePanel
                            scene={currentScene}
                            description={currentGame.description || ''}
                        />
                    </div>

                    {/* Инициатива */}
                    <div className="border-t border-gray-700">
                        <InitiativeTracker compact />
                    </div>
                </div>

                {/* Центральная область - чат */}
                <div className="flex-1 flex flex-col bg-gray-850">
                    <GameChat />
                </div>

                {/* Правая панель - инструменты */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-gray-800 border-l border-gray-700 overflow-hidden"
                        >
                            {/* Вкладки панелей */}
                            <div className="border-b border-gray-700">
                                <div className="flex">
                                    {[
                                        { id: 'chat', icon: ChatBubbleLeftRightIcon, label: 'Чат' },
                                        { id: 'players', icon: UsersIcon, label: 'Игроки' },
                                        { id: 'dice', icon: CubeIcon, label: 'Кости' },
                                        { id: 'initiative', icon: ClockIcon, label: 'Ходы' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActivePanel(tab.id as any)}
                                            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                                                activePanel === tab.id
                                                    ? 'border-amber-500 text-amber-400 bg-gray-700'
                                                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                                            }`}
                                        >
                                            <tab.icon className="w-4 h-4 mx-auto mb-1" />
                                            <div className="hidden sm:block">{tab.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Содержимое панели */}
                            <div className="h-full overflow-auto">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activePanel}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full"
                                    >
                                        {activePanel === 'chat' && (
                                            <div className="p-4">
                                                <h3 className="text-lg font-semibold mb-4">Быстрый чат</h3>
                                                <div className="space-y-2">
                                                    {[
                                                        'Готов!',
                                                        'Нужно время подумать...',
                                                        'Бросаю инициативу',
                                                        'Атакую!',
                                                        'Использую заклинание',
                                                        'Пропускаю ход',
                                                    ].map((message) => (
                                                        <Button
                                                            key={message}
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-left justify-start"
                                                            onClick={() => {
                                                                // TODO: Отправить быстрое сообщение
                                                            }}
                                                        >
                                                            {message}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {activePanel === 'players' && <PlayersPanel />}
                                        {activePanel === 'dice' && <DicePanel />}
                                        {activePanel === 'initiative' && <InitiativeTracker />}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Кнопка переключения боковой панели */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg shadow-lg z-10 transition-colors"
            >
                <motion.div
                    animate={{ rotate: sidebarOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                </motion.div>
            </button>

            {/* Уведомление о текущем ходе */}
            <AnimatePresence>
                {isCurrentTurn && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-600 text-white px-6 py-3 rounded-lg shadow-lg z-20"
                    >
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-5 h-5" />
                            <span className="font-medium">Ваш ход!</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Уведомление о потере соединения */}
            <AnimatePresence>
                {!isConnected && connectionState !== ConnectionState.CONNECTING && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-20"
                    >
                        <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            <span className="font-medium">Соединение потеряно</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GamePage;