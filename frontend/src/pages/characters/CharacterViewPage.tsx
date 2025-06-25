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
    import React, { useState } from 'react';
    import { useParams, Link } from 'react-router-dom';
    import { useQuery } from 'react-query';
    import {
        PencilIcon,
        ArrowLeftIcon,
        HeartIcon,
        ShieldCheckIcon,
        BoltIcon,
        UserIcon,
        SparklesIcon
    } from '@heroicons/react/24/outline';

    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
    import { Button } from '@/components/ui/Button';
    import LoadingScreen from '@/components/ui/LoadingScreen';
    import PortraitGenerator from '@/components/character/PortraitGenerator';
    import { characterService } from '@/services/characterService';
    import { formatModifier, getAbilityModifier } from '@/utils';
    import type { Character } from '@/types';

    const CharacterViewPage: React.FC = () => {
        const { id } = useParams<{ id: string }>();
        const [showPortraitGenerator, setShowPortraitGenerator] = useState(false);

        const { data: character, isLoading, error, refetch } = useQuery(
            ['character', id],
            () => characterService.getCharacter(id!),
            {
                enabled: !!id,
                staleTime: 5 * 60 * 1000,
            }
        );

        const updateInventoryMutation = useMutation(
            (inventory: Inventory) => characterService.updateCharacter(id!, { inventory }),
            {
                onSuccess: () => {
                    queryClient.invalidateQueries(['character', id]);
                },
            }
        );

        const handlePortraitGenerated = (portraitUrl: string) => {
            // Refresh character data to show new portrait
            refetch();
            setShowPortraitGenerator(false);
        };

        const damageCharacterMutation = useMutation(
            (damage: number) => characterService.takeDamage(id!, damage),
            {
                onSuccess: () => {
                    queryClient.invalidateQueries(['character', id]);
                },
            }
        );

        const healCharacterMutation = useMutation(
            (healing: number) => characterService.healCharacter(id!, healing),
            {
                onSuccess: () => {
                    queryClient.invalidateQueries(['character', id]);
                },
            }
        );

        const handleDamage = (amount: number) => {
            damageCharacterMutation.mutate(amount);
        };

        const handleInventoryUpdate = (inventory: Inventory) => {
            updateInventoryMutation.mutate(inventory);
        };

        const CharacterViewPage: React.FC = () => {
            const { id } = useParams<{ id: string }>();

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
                                                    className="w-32 h-32 rounded-lg object-cover border-2 border-primary-200 dark:border-primary-700"
                                                />
                                            ) : (
                                                <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-900 rounded-lg flex items-center justify-center border-2 border-primary-200 dark:border-primary-700">
                                                    <UserIcon className="w-16 h-16 text-primary-400 dark:text-primary-500" />
                                                </div>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full mt-2"
                                                onClick={() => setShowPortraitGenerator(!showPortraitGenerator)}
                                            >
                                                <SparklesIcon className="w-4 h-4 mr-2" />
                                                Генерировать портрет
                                            </Button>
                                        </div>

                                        {/* Basic Info */}
                                        <div className="flex-1 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        Раса
                                                    </label>
                                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {character.race}
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        Класс
                                                    </label>
                                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {character.character_class}
                                                        {character.subclass && ` (${character.subclass})`}
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        Предыстория
                                                    </label>
                                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {character.background || 'Не указана'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        Мировоззрение
                                                    </label>
                                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {character.alignment || 'Не указано'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Core Stats */