// new-working-frontend/src/components/game/PlayersList.tsx (НОВЫЙ КОМПОНЕНТ)
import React from 'react';
import {
    UserIcon,
    ShieldCheckIcon,
    SparklesIcon,
    WifiIcon,
    HeartIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface PlayerInfo {
    user_id: string;
    username: string;
    character_name: string;
    character_info?: {
        id: string;
        name: string;
        race: string;
        character_class: string;
        level: number;
        current_hit_points: number;
        max_hit_points: number;
        armor_class: number;
    };
    is_online: boolean;
    is_current_user: boolean;
}

interface PlayersListProps {
    players: Record<string, PlayerInfo>;
    currentPlayerId?: string;
}

export const PlayersList: React.FC<PlayersListProps> = ({
                                                            players,
                                                            currentPlayerId,
                                                        }) => {
    const getCharacterClassIcon = (characterClass: string) => {
        const classIcons: Record<string, React.ComponentType<any>> = {
            fighter: ShieldCheckIcon,
            wizard: SparklesIcon,
            rogue: UserIcon,
            cleric: UserIcon,
            ranger: UserIcon,
            paladin: ShieldCheckIcon,
            barbarian: ShieldCheckIcon,
            bard: SparklesIcon,
            druid: SparklesIcon,
            monk: UserIcon,
            sorcerer: SparklesIcon,
            warlock: SparklesIcon,
        };

        const IconComponent = classIcons[characterClass?.toLowerCase()] || UserIcon;
        return IconComponent;
    };

    const getHealthColor = (current: number, max: number) => {
        const percentage = (current / max) * 100;
        if (percentage > 75) return 'bg-green-500';
        if (percentage > 50) return 'bg-yellow-500';
        if (percentage > 25) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const playersArray = Object.values(players);

    if (playersArray.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5" />
                        Игроки
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Игроки еще не присоединились
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    Игроки ({playersArray.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {playersArray.map((player) => {
                        const isCurrentTurn = currentPlayerId === player.user_id;
                        const character = player.character_info;
                        const IconComponent = character
                            ? getCharacterClassIcon(character.character_class)
                            : UserIcon;

                        return (
                            <div
                                key={player.user_id}
                                className={`p-3 rounded-lg border transition-all duration-200 ${
                                    isCurrentTurn
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                                } ${
                                    player.is_current_user
                                        ? 'ring-2 ring-green-500 border-green-500'
                                        : ''
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    {/* Иконка персонажа/класса */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                        isCurrentTurn
                                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                        <IconComponent className="w-5 h-5" />
                                    </div>

                                    {/* Информация об игроке */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            {/* ✅ ОТОБРАЖАЕМ ИМЯ ПЕРСОНАЖА */}
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {player.character_name || player.username}
                                            </h4>

                                            {/* Индикаторы статуса */}
                                            <div className="flex items-center space-x-1">
                                                {player.is_current_user && (
                                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full">
                                                        Вы
                                                    </span>
                                                )}

                                                {isCurrentTurn && (
                                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                                                        Ход
                                                    </span>
                                                )}

                                                {/* Индикатор онлайн статуса */}
                                                <div className={`w-2 h-2 rounded-full ${
                                                    player.is_online ? 'bg-green-500' : 'bg-gray-400'
                                                }`} />
                                            </div>
                                        </div>

                                        {/* Информация о персонаже */}
                                        {character && (
                                            <div className="mt-1">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {character.race} {character.character_class} {character.level} ур.
                                                </p>

                                                {/* Полоска здоровья */}
                                                <div className="mt-1 flex items-center space-x-2">
                                                    <HeartIcon className="w-3 h-3 text-red-500" />
                                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                                getHealthColor(character.current_hit_points, character.max_hit_points)
                                                            }`}
                                                            style={{
                                                                width: `${Math.max(0, Math.min(100, (character.current_hit_points / character.max_hit_points) * 100))}%`
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                                        {character.current_hit_points}/{character.max_hit_points}
                                                    </span>
                                                </div>

                                                {/* AC */}
                                                <div className="mt-1 flex items-center space-x-1">
                                                    <ShieldCheckIcon className="w-3 h-3 text-blue-500" />
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                                        AC {character.armor_class}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Если нет персонажа, показываем только username */}
                                        {!character && player.character_name !== player.username && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                @{player.username}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Информация о текущем ходе */}
                {currentPlayerId && (
                    <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-sm text-blue-700 dark:text-blue-300">
                                Ход игрока: {players[currentPlayerId]?.character_name || players[currentPlayerId]?.username || 'Неизвестный'}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};