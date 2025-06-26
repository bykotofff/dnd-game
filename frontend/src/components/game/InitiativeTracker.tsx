import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClockIcon,
    PlayIcon,
    PauseIcon,
    ForwardIcon,
    CubeIcon,
    UserIcon,
    SparklesIcon,
    TrophyIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useGameData, useGameActions } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import type { InitiativeEntry, GamePlayer } from '@/services/gameService';

interface InitiativeTrackerProps {
    compact?: boolean;
}

const InitiativeTracker: React.FC<InitiativeTrackerProps> = ({ compact = false }) => {
    const { user } = useAuthStore();
    const {
        initiativeOrder,
        currentTurn,
        turnNumber,
        players,
        isConnected,
    } = useGameData();

    const {
        rollInitiative,
        nextTurn,
    } = useGameActions();

    const [isRollingInitiative, setIsRollingInitiative] = useState(false);

    // Найти текущего игрока
    const currentPlayer = players.find(p => p.user_id === user?.id);
    const hasRolledInitiative = currentPlayer &&
        initiativeOrder.some(entry => entry.character_id === currentPlayer.character_id);

    // Бросок инициативы
    const handleRollInitiative = async () => {
        if (!currentPlayer || !isConnected) return;

        setIsRollingInitiative(true);
        try {
            await rollInitiative(currentPlayer.character_id);
        } finally {
            setIsRollingInitiative(false);
        }
    };

    // Получить информацию об игроке по character_id
    const getPlayerInfo = (characterId: string) => {
        const player = players.find(p => p.character_id === characterId);
        return player || {
            character_name: 'Неизвестный персонаж',
            username: 'Неизвестный игрок',
            is_online: false,
        };
    };

    // Определить, чей сейчас ход
    const getCurrentTurnIndex = () => {
        return initiativeOrder.findIndex(entry => entry.character_id === currentTurn);
    };

    const currentTurnIndex = getCurrentTurnIndex();

    if (compact) {
        return (
            <div className="p-4 bg-gray-800">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        Инициатива
                    </h3>
                    <span className="text-xs text-gray-400">Раунд {turnNumber}</span>
                </div>

                {initiativeOrder.length === 0 ? (
                    <div className="text-center py-4">
                        <div className="text-gray-400 text-sm mb-2">Инициатива не брошена</div>
                        {currentPlayer && !hasRolledInitiative && (
                            <Button
                                onClick={handleRollInitiative}
                                disabled={!isConnected || isRollingInitiative}
                                size="sm"
                                variant="primary"
                                className="text-xs"
                            >
                                {isRollingInitiative ? 'Бросаю...' : 'Бросить'}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {initiativeOrder.slice(0, 3).map((entry, index) => {
                            const playerInfo = getPlayerInfo(entry.character_id);
                            const isActive = entry.character_id === currentTurn;
                            const isCurrentUser = currentPlayer?.character_id === entry.character_id;

                            return (
                                <div
                                    key={entry.character_id}
                                    className={`flex items-center justify-between p-2 rounded text-xs ${
                                        isActive
                                            ? 'bg-amber-900/50 border border-amber-700/50'
                                            : 'bg-gray-700/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-4 h-4 text-center font-bold ${
                                            isActive ? 'text-amber-400' : 'text-gray-400'
                                        }`}>
                                            {index + 1}
                                        </span>
                                        <span className={`truncate ${
                                            isCurrentUser ? 'text-blue-300' : 'text-gray-300'
                                        }`}>
                                            {entry.character_name}
                                        </span>
                                    </div>
                                    <span className={`font-mono ${
                                        isActive ? 'text-amber-300' : 'text-gray-400'
                                    }`}>
                                        {entry.initiative}
                                    </span>
                                </div>
                            );
                        })}
                        {initiativeOrder.length > 3 && (
                            <div className="text-center text-xs text-gray-500 pt-1">
                                +{initiativeOrder.length - 3} ещё...
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Заголовок */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ClockIcon className="w-5 h-5" />
                    Порядок ходов
                </h3>
                <div className="text-sm text-gray-400">
                    Раунд {turnNumber}
                </div>
            </div>

            {/* Управление инициативой */}
            {initiativeOrder.length === 0 ? (
                <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4 text-center">
                        <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h4 className="text-white font-medium mb-2">Инициатива не брошена</h4>
                        <p className="text-gray-400 text-sm mb-4">
                            Бросьте инициативу, чтобы определить порядок ходов
                        </p>
                        {currentPlayer && !hasRolledInitiative && (
                            <Button
                                onClick={handleRollInitiative}
                                disabled={!isConnected || isRollingInitiative}
                                variant="primary"
                            >
                                <CubeIcon className="w-4 h-4 mr-2" />
                                {isRollingInitiative ? 'Бросаю инициативу...' : 'Бросить инициативу'}
                            </Button>
                        )}
                        {hasRolledInitiative && (
                            <div className="text-green-400 text-sm">
                                ✅ Вы уже бросили инициативу
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Текущий ход */}
                    {currentTurn && (
                        <Card className="bg-gradient-to-r from-amber-900/30 to-amber-800/30 border-amber-700/50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center">
                                            <PlayIcon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-white font-medium">
                                                Ход: {getPlayerInfo(currentTurn).character_name}
                                            </div>
                                            <div className="text-amber-300 text-sm">
                                                Игрок: {getPlayerInfo(currentTurn).username}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={nextTurn}
                                        disabled={!isConnected}
                                        variant="outline"
                                        size="sm"
                                        className="border-amber-600 text-amber-300 hover:bg-amber-900/30"
                                    >
                                        <ForwardIcon className="w-4 h-4 mr-1" />
                                        Следующий
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Список участников инициативы */}
                    <div className="space-y-2">
                        <AnimatePresence>
                            {initiativeOrder.map((entry, index) => {
                                const playerInfo = getPlayerInfo(entry.character_id);
                                const isActive = entry.character_id === currentTurn;
                                const isCurrentUser = currentPlayer?.character_id === entry.character_id;

                                return (
                                    <motion.div
                                        key={entry.character_id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                        className={`p-3 rounded-lg border transition-all duration-300 ${
                                            isActive
                                                ? 'bg-amber-900/30 border-amber-700/50 ring-2 ring-amber-500/30'
                                                : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* Позиция */}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                                    isActive
                                                        ? 'bg-amber-600 text-white'
                                                        : index === 0
                                                            ? 'bg-yellow-600 text-white'
                                                            : index === 1
                                                                ? 'bg-gray-500 text-white'
                                                                : index === 2
                                                                    ? 'bg-orange-600 text-white'
                                                                    : 'bg-gray-700 text-gray-300'
                                                }`}>
                                                    {index === 0 && !isActive ? (
                                                        <TrophyIcon className="w-4 h-4" />
                                                    ) : (
                                                        index + 1
                                                    )}
                                                </div>

                                                {/* Информация о персонаже */}
                                                <div>
                                                    <div className={`font-medium ${
                                                        isCurrentUser ? 'text-blue-300' : 'text-white'
                                                    }`}>
                                                        {entry.character_name}
                                                        {isCurrentUser && (
                                                            <span className="text-blue-400 text-xs ml-2">(Вы)</span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-400 flex items-center gap-2">
                                                        {entry.is_player ? (
                                                            <UserIcon className="w-3 h-3" />
                                                        ) : (
                                                            <SparklesIcon className="w-3 h-3" />
                                                        )}
                                                        {entry.is_player ? playerInfo.username : 'NPC'}
                                                        {playerInfo.is_online && (
                                                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Значение инициативы */}
                                            <div className="text-right">
                                                <div className={`text-lg font-bold font-mono ${
                                                    isActive ? 'text-amber-300' : 'text-gray-300'
                                                }`}>
                                                    {entry.initiative}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Инициатива
                                                </div>
                                            </div>
                                        </div>

                                        {/* Индикатор активного хода */}
                                        {isActive && (
                                            <motion.div
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                className="mt-2 h-1 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                                            />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Кнопка для броска инициативы если еще не бросил */}
                    {currentPlayer && !hasRolledInitiative && (
                        <Card className="bg-blue-900/30 border-blue-700/50">
                            <CardContent className="p-4 text-center">
                                <h4 className="text-blue-300 font-medium mb-2">
                                    Вы еще не бросили инициативу
                                </h4>
                                <Button
                                    onClick={handleRollInitiative}
                                    disabled={!isConnected || isRollingInitiative}
                                    variant="primary"
                                >
                                    <CubeIcon className="w-4 h-4 mr-2" />
                                    {isRollingInitiative ? 'Бросаю...' : 'Бросить инициативу'}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Статус подключения */}
            {!isConnected && (
                <div className="text-center p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                    <div className="text-red-400 text-sm">
                        ⚠️ Не подключены к игре
                    </div>
                </div>
            )}
        </div>
    );
};

export default InitiativeTracker;