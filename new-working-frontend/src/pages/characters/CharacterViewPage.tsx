// CharacterViewPage.tsx - исправленный
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

    // Исправлено для TanStack Query v5
    const { data: character, isLoading, error } = useQuery({
        queryKey: ['character', id],
        queryFn: () => characterService.getCharacter(id!),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });

    // Остальной код остается без изменений...
    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error || !character) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <Card>
                    <CardContent className="p-6 text-center">
                        <div className="text-red-600">
                            Ошибка при загрузке персонажа
                        </div>
                        <Link to="/characters">
                            <Button className="mt-4">
                                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                Вернуться к персонажам
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Character Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/characters">
                                <Button variant="outline" size="sm">
                                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                    Назад
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {character.name}
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {character.race} {character.class_name}, {character.level} уровень
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setShowPortraitGenerator(true)}
                                variant="outline"
                                size="sm"
                            >
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                Создать портрет
                            </Button>
                            <Link to={`/characters/${id}/edit`}>
                                <Button size="sm">
                                    <PencilIcon className="w-4 h-4 mr-2" />
                                    Редактировать
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Character Stats */}
                <div className="lg:col-span-2">
                    <CharacterStats character={character} />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Portrait */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Портрет</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                {character.portrait_url ? (
                                    <img
                                        src={character.portrait_url}
                                        alt={character.name}
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                ) : (
                                    <UserIcon className="w-16 h-16 text-gray-400" />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Действия</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                onClick={() => setShowInventory(true)}
                                variant="outline"
                                className="w-full justify-start"
                            >
                                <CubeIcon className="w-4 h-4 mr-2" />
                                Инвентарь
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            {showPortraitGenerator && (
                <PortraitGenerator
                    character={character}
                    onClose={() => setShowPortraitGenerator(false)}
                />
            )}

            {showInventory && (
                <InventoryManager
                    characterId={character.id}
                    onClose={() => setShowInventory(false)}
                />
            )}
        </div>
    );
};

export default CharacterViewPage;