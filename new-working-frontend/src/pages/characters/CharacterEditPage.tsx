import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    CheckIcon,
    TrashIcon,
    SparklesIcon,
    PlusIcon,
    MinusIcon,
    HeartIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { characterService } from '@/services/characterService';
import { getAbilityModifier, formatModifier } from '@/utils';
import type { Character } from '@/types';
import type { UpdateCharacterData } from '@/services/characterService';

const CharacterEditPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('stats');

    // Исправлено для TanStack Query v5
    const { data: character, isLoading, error } = useQuery({
        queryKey: ['character', id],
        queryFn: () => characterService.getCharacter(id!),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });

    // Исправлено для TanStack Query v5
    const updateMutation = useMutation({
        mutationFn: (data: UpdateCharacterData) => characterService.updateCharacter(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['character', id] });
            queryClient.invalidateQueries({ queryKey: ['characters'] });
            toast.success('Персонаж обновлен!');
        },
        onError: () => {
            toast.error('Ошибка при обновлении персонажа');
        },
    });

    // Исправлено для TanStack Query v5
    const deleteMutation = useMutation({
        mutationFn: () => characterService.deleteCharacter(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['characters'] });
            toast.success('Персонаж удален');
            navigate('/characters');
        },
        onError: () => {
            toast.error('Ошибка при удалении персонажа');
        },
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm<UpdateCharacterData>();

    useEffect(() => {
        if (character) {
            reset({
                name: character.name,
                race: character.race,
                class_name: character.class_name,
                level: character.level,
                experience: character.experience,
                background: character.background,
                alignment: character.alignment,
                hit_points: character.hit_points,
                max_hit_points: character.max_hit_points,
                armor_class: character.armor_class,
                speed: character.speed,
                strength: character.strength,
                dexterity: character.dexterity,
                constitution: character.constitution,
                intelligence: character.intelligence,
                wisdom: character.wisdom,
                charisma: character.charisma,
                proficiency_bonus: character.proficiency_bonus,
                backstory: character.backstory,
                personality_traits: character.personality_traits,
                ideals: character.ideals,
                bonds: character.bonds,
                flaws: character.flaws,
            });
        }
    }, [character, reset]);

    const onSubmit = (data: UpdateCharacterData) => {
        updateMutation.mutate(data);
    };

    const handleDelete = () => {
        if (window.confirm('Вы уверены, что хотите удалить этого персонажа? Это действие нельзя отменить.')) {
            deleteMutation.mutate();
        }
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error || !character) {
        return (
            <div className="max-w-4xl mx-auto p-6">
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
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to={`/characters/${id}`}>
                                <Button variant="outline" size="sm">
                                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                    Назад
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    Редактирование: {character.name}
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {character.race} {character.class_name}, {character.level} уровень
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleDelete}
                                variant="destructive"
                                size="sm"
                                disabled={deleteMutation.isPending}
                            >
                                <TrashIcon className="w-4 h-4 mr-2" />
                                Удалить
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { key: 'stats', label: 'Характеристики' },
                        { key: 'combat', label: 'Боевые характеристики' },
                        { key: 'roleplay', label: 'Личность' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === key
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {activeTab === 'stats' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        {/* Basic Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Основная информация</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Имя персонажа
                                        </label>
                                        <Input {...register('name')} placeholder="Имя персонажа" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Раса
                                        </label>
                                        <Input {...register('race')} placeholder="Раса" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Класс
                                        </label>
                                        <Input {...register('class_name')} placeholder="Класс" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Уровень
                                        </label>
                                        <Input
                                            {...register('level', { valueAsNumber: true })}
                                            type="number"
                                            min="1"
                                            max="20"
                                        />
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
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {[
                                        { key: 'strength', label: 'Сила' },
                                        { key: 'dexterity', label: 'Ловкость' },
                                        { key: 'constitution', label: 'Телосложение' },
                                        { key: 'intelligence', label: 'Интеллект' },
                                        { key: 'wisdom', label: 'Мудрость' },
                                        { key: 'charisma', label: 'Харизма' },
                                    ].map(({ key, label }) => (
                                        <div key={key}>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {label}
                                            </label>
                                            <Input
                                                {...register(key as keyof UpdateCharacterData, { valueAsNumber: true })}
                                                type="number"
                                                min="1"
                                                max="30"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {activeTab === 'combat' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Боевые характеристики</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Текущие хиты
                                        </label>
                                        <Input
                                            {...register('hit_points', { valueAsNumber: true })}
                                            type="number"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Максимальные хиты
                                        </label>
                                        <Input
                                            {...register('max_hit_points', { valueAsNumber: true })}
                                            type="number"
                                            min="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Класс брони
                                        </label>
                                        <Input
                                            {...register('armor_class', { valueAsNumber: true })}
                                            type="number"
                                            min="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Скорость
                                        </label>
                                        <Input
                                            {...register('speed', { valueAsNumber: true })}
                                            type="number"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {activeTab === 'roleplay' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Предыстория и личность</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Предыстория
                                    </label>
                                    <textarea
                                        {...register('backstory')}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        rows={4}
                                        placeholder="Предыстория персонажа..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Черты характера
                                    </label>
                                    <textarea
                                        {...register('personality_traits')}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        rows={3}
                                        placeholder="Черты характера..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Идеалы
                                    </label>
                                    <Input {...register('ideals')} placeholder="Идеалы..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Привязанности
                                    </label>
                                    <Input {...register('bonds')} placeholder="Привязанности..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Слабости
                                    </label>
                                    <Input {...register('flaws')} placeholder="Слабости..." />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={!isDirty || updateMutation.isPending}
                        className="flex items-center gap-2"
                    >
                        <CheckIcon className="w-4 h-4" />
                        {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CharacterEditPage;