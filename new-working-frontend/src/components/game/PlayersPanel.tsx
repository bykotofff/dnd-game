import React from 'react';
import { motion } from 'framer-motion';
import {
    UsersIcon,
    ShieldCheckIcon,
    HeartIcon,
    StarIcon,
    BoltIcon,
    WifiIcon,
    XCircleIcon,
    UserPlusIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useGameStore } from '@/store/gameStore';
import type { Character } from '@/types';

interface PlayersPanelProps {
    className?: string;
}

interface PlayerInfo {
    id: string;
    username: string;
    isOnline: boolean;
    character?: Character;
    isCurrentTurn?: boolean;
}

const PlayersPanel: React.FC<PlayersPanelProps> = ({ className = '' }) => {
    const { playersOnline, selectedCharacterId, selectCharacter } = useGameStore();

    // Мок данные для демонстрации - в реальности будут приходить через WebSocket
    const players: PlayerInfo[] = [
        {
            id: 'player1',
            username: 'Арагорн',
            isOnline: true,
            isCurrentTurn: true,
            character: {
                id: 'char1',
                name: 'Арагорн',
                race: 'Человек',
                character_class: 'Рейнджер',
                level: 5,
                hit_points: { current: 45, max: 52, temporary: 0 },
                armor_class: 16,
                abilities: {
                    strength: 16,
                    dexterity: 14,
                    constitution: 14,
                    intelligence: 12,
                    wisdom: 15,
                    charisma: 13
                }
            } as Character
        },
        {
            id: 'player2',
            username: 'Гэндальф',
            isOnline: true,
            character: {
                id: 'char2',
                name: 'Гэндальф',
                race: 'Человек',
                character_class: 'Волшебник',
                level: 5,
                hit_points: { current: 38, max: 40, temporary: 2 },
                armor_class: 12,
                abilities: {
                    strength: 8,
                    dexterity: 14,
                    constitution: 13,
                    intelligence: 18,
                    wisdom: 16,
                    charisma: 12
                }
            } as Character
        },
        {
            id: 'player3',
            username: 'Леголас',
            isOnline: false,
            character: {
                id: 'char3',
                name: 'Леголас',
                race: 'Эльф',
                character_class: 'Следопыт',
                level: 4,
                hit_points: { current: 32, max: 36, temporary: 0 },
                armor_class: 15,
                abilities: {
                    strength: 12,
                    dexterity: 18,
                    constitution: 12,
                    intelligence: 14,
                    wisdom: 16,
                    charisma: 11
                }
            } as Character
        }
    ];

    const getHealthColor = (current: number, max: number) => {
        const percentage = (current / max) * 100;
        if (percentage >= 75) return 'text-green-600 dark:text-green-400';
        if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
        if (percentage >= 25) return 'text-orange-600 dark:text-orange-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getHealthBarColor = (current: number, max: number) => {
        const percentage = (current / max) * 100;
        if (percentage >= 75) return 'bg-green-500';
        if (percentage >= 50) return 'bg-yellow-500';
        if (percentage >= 25) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <Card className={`bg-white dark:bg-gray-800 ${className}`}>
            <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-base sm:text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    <span className="hidden sm:inline">Игроки</span>
                    <span className="sm:hidden">Группа</span>
                    <span className="ml-auto text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {players.filter(p => p.isOnline).length}/{players.length}
                    </span>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-3 sm:p-4 space-y-3">
                {/* Список игроков */}
                <div className="space-y-2">
                    {players.map((player) => (
                        <motion.div
                            key={player.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-2 sm:p-3 rounded-lg border transition-all ${
                                player.isCurrentTurn
                                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                                    : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                            } ${
                                selectedCharacterId === player.character?.id
                                    ? 'ring-2 ring-blue-500'
                                    : ''
                            }`}
                        >
                            {/* Игрок и статус */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    <div className="flex items-center space-x-2">
                                        {player.isOnline ? (
                                            <WifiIcon className="w-3 h-3 text-green-500" />
                                        ) : (
                                            <XCircleIcon className="w-3 h-3 text-gray-400" />
                                        )}
                                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {player.username}
                                        </span>
                                    </div>
                                    {player.isCurrentTurn && (
                                        <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            <span className="text-xs text-blue-600 dark:text-blue-400 hidden sm:inline">
                                                Ход
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Персонаж */}
                            {player.character ? (
                                <div
                                    className="space-y-2 cursor-pointer"
                                    onClick={() => selectCharacter?.(player.character!.id)}
                                >
                                    {/* Основная информация */}
                                    <div className="flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {player.character.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {player.character.race} {player.character.character_class} {player.character.level} ур.
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center space-x-1">
                                                <ShieldCheckIcon className="w-3 h-3" />
                                                <span>{player.character.armor_class}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Здоровье */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-1">
                                                <HeartIcon className="w-3 h-3 text-red-500" />
                                                <span className={`text-xs font-medium ${getHealthColor(
                                                    player.character.hit_points.current,
                                                    player.character.hit_points.max
                                                )}`}>
                                                    {player.character.hit_points.current}/{player.character.hit_points.max}
                                                </span>
                                                {player.character.hit_points.temporary > 0 && (
                                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                                        (+{player.character.hit_points.temporary})
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Полоса здоровья */}
                                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all ${getHealthBarColor(
                                                    player.character.hit_points.current,
                                                    player.character.hit_points.max
                                                )}`}
                                                style={{
                                                    width: `${Math.max(
                                                        (player.character.hit_points.current / player.character.hit_points.max) * 100,
                                                        5
                                                    )}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
                                    Персонаж не выбран
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Кнопки управления */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-2">
                        <Button
                            variant="lightOutline"
                            size="sm"
                            className="w-full flex items-center justify-center gap-2"
                            onClick={() => {
                                // Логика смены персонажа
                                console.log('Change character');
                            }}
                        >
                            <ArrowPathIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs sm:text-sm">Сменить персонажа</span>
                        </Button>
                        <Button
                            variant="lightSecondary"
                            size="sm"
                            className="w-full flex items-center justify-center gap-2"
                            onClick={() => {
                                // Логика приглашения игроков
                                console.log('Invite players');
                            }}
                        >
                            <UserPlusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs sm:text-sm">Пригласить игроков</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default PlayersPanel;