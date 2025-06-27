import React from 'react';
import { motion } from 'framer-motion';
import {
    UsersIcon,
    ShieldCheckIcon,
    HeartIcon,
    StarIcon,
    BoltIcon,
    WifiIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useGameUI, useGameActions } from '@/store/gameStore';
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
    const { playersOnline, selectedCharacterId } = useGameUI();
    const { selectCharacter } = useGameActions();

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
                hit_points: { current: 32, max: 35, temporary: 0 },
                armor_class: 12,
                abilities: {
                    strength: 10,
                    dexterity: 12,
                    constitution: 12,
                    intelligence: 18,
                    wisdom: 16,
                    charisma: 14
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
                level: 5,
                hit_points: { current: 0, max: 42, temporary: 0 },
                armor_class: 15,
                abilities: {
                    strength: 12,
                    dexterity: 18,
                    constitution: 12,
                    intelligence: 14,
                    wisdom: 16,
                    charisma: 12
                }
            } as Character
        }
    ];

    const getHealthPercentage = (character: Character) => {
        return (character.hit_points.current / character.hit_points.max) * 100;
    };

    const getHealthColor = (percentage: number) => {
        if (percentage <= 0) return 'text-gray-500';
        if (percentage <= 25) return 'text-red-500';
        if (percentage <= 50) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getHealthBgColor = (percentage: number) => {
        if (percentage <= 0) return 'bg-gray-500';
        if (percentage <= 25) return 'bg-red-500';
        if (percentage <= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <Card className={`h-full ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="h-5 w-5" />
                    Игроки ({players.filter(p => p.isOnline).length}/{players.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {players.map((player, index) => (
                    <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                            selectedCharacterId === player.character?.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        } ${
                            player.isCurrentTurn
                                ? 'ring-2 ring-yellow-400 ring-opacity-50'
                                : ''
                        }`}
                        onClick={() => player.character && selectCharacter(player.character.id)}
                    >
                        {/* Статус подключения и имя игрока */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                    player.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                }`} />
                                <span className="font-medium text-sm text-gray-900 dark:text-white">
                                    {player.username}
                                </span>
                                {player.isCurrentTurn && (
                                    <StarIcon className="h-4 w-4 text-yellow-500" />
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {player.isOnline ? (
                                    <WifiIcon className="h-4 w-4 text-green-500" />
                                ) : (
                                    <XCircleIcon className="h-4 w-4 text-gray-400" />
                                )}
                            </div>
                        </div>

                        {/* Информация о персонаже */}
                        {player.character ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {player.character.name}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {player.character.race} {player.character.character_class} {player.character.level}
                                    </span>
                                </div>

                                {/* HP Bar */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1">
                                            <HeartIcon className={`h-3 w-3 ${
                                                getHealthColor(getHealthPercentage(player.character))
                                            }`} />
                                            <span className="text-gray-600 dark:text-gray-400">HP</span>
                                        </div>
                                        <span className={`font-medium ${
                                            getHealthColor(getHealthPercentage(player.character))
                                        }`}>
                                            {player.character.hit_points.current}/{player.character.hit_points.max}
                                            {player.character.hit_points.temporary > 0 && (
                                                <span className="text-blue-500">
                                                    (+{player.character.hit_points.temporary})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                getHealthBgColor(getHealthPercentage(player.character))
                                            }`}
                                            style={{
                                                width: `${Math.max(0, getHealthPercentage(player.character))}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* AC and Level */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-xs">
                                        <ShieldCheckIcon className="h-3 w-3 text-blue-500" />
                                        <span className="text-gray-600 dark:text-gray-400">AC</span>
                                        <span className="font-medium text-blue-600 dark:text-blue-400">
                                            {player.character.armor_class}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs">
                                        <BoltIcon className="h-3 w-3 text-purple-500" />
                                        <span className="text-gray-600 dark:text-gray-400">Lv</span>
                                        <span className="font-medium text-purple-600 dark:text-purple-400">
                                            {player.character.level}
                                        </span>
                                    </div>
                                </div>

                                {/* Статус эффекты (если есть) */}
                                {player.character.hit_points.current <= 0 && (
                                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                                        Без сознания
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                                Персонаж не выбран
                            </div>
                        )}
                    </motion.div>
                ))}

                {/* Кнопки управления */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                                // Логика смены персонажа
                                console.log('Change character');
                            }}
                        >
                            Сменить персонажа
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => {
                                // Логика приглашения игроков
                                console.log('Invite players');
                            }}
                        >
                            Пригласить игроков
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default PlayersPanel;