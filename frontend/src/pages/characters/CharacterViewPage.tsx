import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
    PencilIcon,
    ArrowLeftIcon,
    HeartIcon,
    ShieldCheckIcon,
    BoltIcon,
    UserIcon,
    SparklesIcon,
    CubeIcon,
} from '@heroicons/react/24/outline';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import LoadingScreen from '@/components/ui/LoadingScreen';
import PortraitGenerator from '@/components/character/PortraitGenerator';
import InventoryManager from '@/components/character/InventoryManager';
import CharacterStats from '@/components/character/CharacterStats';
import { characterService } from '@/services/characterService';
import { formatModifier, getAbilityModifier } from '@/utils';
import type { Character, Inventory } from '@/types';

const CharacterViewPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [showPortraitGenerator, setShowPortraitGenerator] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const queryClient = useQueryClient();

    const { data: character, isLoading, error } = useQuery(
        ['character', id],
        () => characterService.getCharacter(id!),
        {
            enabled: !!id,
            staleTime: 5 * 60 * 1000,
        }
    );

    if (isLoading) {
        return <LoadingScreen message="Загрузка персонажа..." />;
    }

    if (error || !character) {
        return (
            <div className="text-center py-16">
                <div className="text-red-500 text-lg mb-4">Персонаж не найден</div>
                <Button variant="outline" asChild>
                    <Link to="/characters">
                        Вернуться к списку
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" asChild>
                        <Link to="/characters">
                            <ArrowLeftIcon className="h-5 w-5 mr-2" />
                            Назад
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-fantasy font-bold text-gray-900 dark:text-white">
                            {character.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {character.race} {character.character_class} {character.level} уровня
                        </p>
                    </div>
                </div>

                <Button variant="default" asChild>
                    <Link to={`/characters/${id}/edit`}>
                        <PencilIcon className="h-5 w-5 mr-2" />
                        Редактировать
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Stats */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Character Portrait & Basic Info */}
                    <Card variant="character">
                        <CardContent className="p-6">
                            <div className="flex items-start space-x-6">
                                {/* Portrait */}
                                <div className="flex-shrink-0">
                                    {character.portrait_url ? (
                                        <img
                                            src={character.portrait_url}
                                            alt={character.name}
                                            className="w-32 h-32 rounded-lg object-cover border-2 border-primary-200"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
                                            <UserIcon className="h-16 w-16 text-gray-400" />
                                        </div>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={() => setShowPortraitGenerator(true)}
                                    >
                                        <SparklesIcon className="h-4 w-4 mr-1" />
                                        Портрет
                                    </Button>
                                </div>

                                {/* Basic Info */}
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Раса</h3>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{character.race}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Класс</h3>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {character.character_class}
                                                {character.subclass && ` (${character.subclass})`}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Уровень</h3>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{character.level}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Опыт</h3>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{character.experience_points}</p>
                                        </div>
                                        {character.background && (
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Предыстория</h3>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{character.background}</p>
                                            </div>
                                        )}
                                        {character.alignment && (
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Мировоззрение</h3>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{character.alignment}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Appearance */}
                                    {character.appearance && (
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Внешность</h3>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{character.appearance}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ability Scores */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Характеристики</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                {Object.entries(character.abilities).map(([ability, score]) => {
                                    const modifier = getAbilityModifier(score);
                                    const abilityNames: Record<string, string> = {
                                        strength: 'Сила',
                                        dexterity: 'Ловкость',
                                        constitution: 'Телосложение',
                                        intelligence: 'Интеллект',
                                        wisdom: 'Мудрость',
                                        charisma: 'Харизма'
                                    };

                                    return (
                                        <div key={ability} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                {abilityNames[ability]}
                                            </div>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {score}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {formatModifier(modifier)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Personality */}
                    {(character.personality?.traits || character.personality?.ideals || character.personality?.bonds || character.personality?.flaws || character.personality?.backstory) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Личность</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {character.personality?.traits && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Черты характера</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{character.personality.traits}</p>
                                    </div>
                                )}
                                {character.personality?.ideals && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Идеалы</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{character.personality.ideals}</p>
                                    </div>
                                )}
                                {character.personality?.bonds && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Привязанности</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{character.personality.bonds}</p>
                                    </div>
                                )}
                                {character.personality?.flaws && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Слабости</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{character.personality.flaws}</p>
                                    </div>
                                )}
                                {character.personality?.backstory && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Предыстория</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{character.personality.backstory}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Character Stats Component */}
                    <CharacterStats character={character} />

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Быстрые действия</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setShowInventory(true)}
                            >
                                <CubeIcon className="h-4 w-4 mr-2" />
                                Инвентарь
                            </Button>
                            <Button variant="outline" className="w-full" asChild>
                                <Link to={`/characters/${id}/edit`}>
                                    <PencilIcon className="h-4 w-4 mr-2" />
                                    Редактировать
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            {showPortraitGenerator && (
                <PortraitGenerator
                    characterId={character.id}
                    characterName={character.name}
                    characterRace={character.race}
                    characterClass={character.character_class}
                    onClose={() => setShowPortraitGenerator(false)}
                    onSuccess={() => {
                        setShowPortraitGenerator(false);
                        queryClient.invalidateQueries(['character', id]);
                    }}
                />
            )}

            {showInventory && (
                <InventoryManager
                    characterId={character.id}
                    inventory={character.inventory as Inventory}
                    onClose={() => setShowInventory(false)}
                    onUpdate={() => {
                        queryClient.invalidateQueries(['character', id]);
                    }}
                />
            )}
        </div>
    );
};

export default CharacterViewPage;