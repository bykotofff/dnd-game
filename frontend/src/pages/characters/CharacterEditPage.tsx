import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    SaveIcon,
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

    const { data: character, isLoading, error } = useQuery(
        ['character', id],
        () => characterService.getCharacter(id!),
        {
            enabled: !!id,
            staleTime: 5 * 60 * 1000,
        }
    );

    const updateMutation = useMutation(
        (data: UpdateCharacterData) => characterService.updateCharacter(id!, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['character', id]);
                queryClient.invalidateQueries('characters');
                toast.success('Персонаж обновлен!');
            },
            onError: () => {
                toast.error('Ошибка при обновлении персонажа');
            },
        }
    );

    const deleteMutation = useMutation(
        () => characterService.deleteCharacter(id!),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('characters');
                toast.success('Персонаж удален');
                navigate('/characters');
            },
            onError: () => {
                toast.error('Ошибка при удалении персонажа');
            },
        }
    );

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isDirty },
        reset,
    } = useForm<UpdateCharacterData>();

    // Initialize form with character data
    useEffect(() => {
        if (character) {
            reset({
                name: character.name,
                level: character.level,
                experience_points: character.experience_points,
                strength: character.abilities.strength,
                dexterity: character.abilities.dexterity,
                constitution: character.abilities.constitution,
                intelligence: character.abilities.intelligence,
                wisdom: character.abilities.wisdom,
                charisma: character.abilities.charisma,
                max_hit_points: character.hit_points.max,
                current_hit_points: character.hit_points.current,
                temporary_hit_points: character.hit_points.temporary,
                armor_class: character.armor_class,
                appearance: character.appearance,
                personality_traits: character.personality.traits,
                ideals: character.personality.ideals,
                bonds: character.personality.bonds,
                flaws: character.personality.flaws,
                backstory: character.personality.backstory,
            });
        }
    }, [character, reset]);

    const watchedValues = watch();

    const onSubmit = async (data: UpdateCharacterData) => {
        await updateMutation.mutateAsync(data);
    };

    const handleDelete = async () => {
        if (window.confirm(`Вы уверены, что хотите удалить персонажа "${character?.name}"?`)) {
            await deleteMutation.mutateAsync();
        }
    };

    const adjustAbility = (ability: keyof UpdateCharacterData, delta: number) => {
        const currentValue = watchedValues[ability] as number;
        const newValue = Math.max(1, Math.min(30, currentValue + delta));
        setValue(ability, newValue);
    };

    const adjustHP = (type: 'current' | 'max' | 'temporary', delta: number) => {
        const fieldMap = {
            current: 'current_hit_points',
            max: 'max_hit_points',
            temporary: 'temporary_hit_points',
        };

        const field = fieldMap[type] as keyof UpdateCharacterData;
        const currentValue = watchedValues[field] as number;
        let newValue = currentValue + delta;

        if (type === 'current') {
            newValue = Math.max(0, Math.min(watchedValues.max_hit_points as number, newValue));
        } else if (type === 'max') {
            newValue = Math.max(1, newValue);
        } else {
            newValue = Math.max(0, newValue);
        }

        setValue(field, newValue);
    };

    if (isLoading) {
        return <LoadingScreen message="Загрузка персонажа..." />;
    }

    if (error || !character) {
        return (
            <div className="text-center py-16">
                <div className="text-red-500 text-lg mb-4">Персонаж не найден</div>
                <Button variant="outline" asChild>
                    <Link to="/characters">Вернуться к списку</Link>
                </Button>
            </div>
        );
    }

    const tabs = [
        { id: 'stats', name: 'Характеристики', icon: HeartIcon },
        { id: 'combat', name: 'Боевые', icon: ShieldCheckIcon },
        { id: 'personality', name: 'Личность', icon: SparklesIcon },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" asChild>
                        <Link to={`/characters/${id}`}>
                            <ArrowLeftIcon className="h-5 w-5 mr-2" />
                            Назад
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-fantasy font-bold text-gray-900 dark:text-white">
                            Редактирование: {character.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {character.race} {character.character_class} {character.level} уровня
                        </p>
                    </div>
                </div>

                <div className="flex space-x-3">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        loading={deleteMutation.isLoading}
                    >
                        <TrashIcon className="h-5 w-5 mr-2" />
                        Удалить
                    </Button>

                    <Button
                        variant="fantasy"
                        onClick={handleSubmit(onSubmit)}
                        loading={updateMutation.isLoading}
                        disabled={!isDirty}
                    >
                        <SaveIcon className="h-5 w-5 mr-2" />
                        Сохранить
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Card>
                <CardContent className="p-0">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex space-x-8 px-6">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === tab.id
                                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span>{tab.name}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="p-6">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'stats' && (
                                <div className="space-y-8">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input
                                            label="Имя персонажа"
                                            error={errors.name?.message}
                                            {...register('name', { required: 'Имя обязательно' })}
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Уровень"
                                                type="number"
                                                min={1}
                                                max={20}
                                                {...register('level', {
                                                    required: 'Уровень обязателен',
                                                    min: 1,
                                                    max: 20
                                                })}
                                            />

                                            <Input
                                                label="Опыт"
                                                type="number"
                                                min={0}
                                                {...register('experience_points', { min: 0 })}
                                            />
                                        </div>
                                    </div>

                                    {/* Ability Scores */}
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Характеристики
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {[
                                                { key: 'strength', name: 'Сила' },
                                                { key: 'dexterity', name: 'Ловкость' },
                                                { key: 'constitution', name: 'Телосложение' },
                                                { key: 'intelligence', name: 'Интеллект' },
                                                { key: 'wisdom', name: 'Мудрость' },
                                                { key: 'charisma', name: 'Харизма' },
                                            ].map(({ key, name }) => {
                                                const score = watchedValues[key as keyof UpdateCharacterData] as number;
                                                const modifier = getAbilityModifier(score);

                                                return (
                                                    <Card key={key} className="p-4">
                                                        <div className="text-center space-y-3">
                                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                                {name}
                                                            </h4>

                                                            <div className="flex items-center justify-center space-x-3">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => adjustAbility(key as keyof UpdateCharacterData, -1)}
                                                                    disabled={score <= 1}
                                                                >
                                                                    <MinusIcon className="h-4 w-4" />
                                                                </Button>

                                                                <div className="text-center min-w-[60px]">
                                                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                                        {score}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                        {formatModifier(modifier)}
                                                                    </div>
                                                                </div>

                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => adjustAbility(key as keyof UpdateCharacterData, 1)}
                                                                    disabled={score >= 30}
                                                                >
                                                                    <PlusIcon className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Appearance */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Внешность
                                        </label>
                                        <textarea
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                            rows={3}
                                            placeholder="Опишите внешность персонажа..."
                                            {...register('appearance')}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'combat' && (
                                <div className="space-y-8">
                                    {/* Hit Points */}
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Очки здоровья
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {[
                                                { key: 'max_hit_points', name: 'Максимум', type: 'max' as const },
                                                { key: 'current_hit_points', name: 'Текущие', type: 'current' as const },
                                                { key: 'temporary_hit_points', name: 'Временные', type: 'temporary' as const },
                                            ].map(({ key, name, type }) => {
                                                const value = watchedValues[key] as number;

                                                return (
                                                    <Card key={key} className="p-4">
                                                        <div className="text-center space-y-3">
                                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                                {name}
                                                            </h4>

                                                            <div className="flex items-center justify-center space-x-3">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => adjustHP(type, -1)}
                                                                    disabled={type === 'current' ? value <= 0 : type === 'max' ? value <= 1 : value <= 0}
                                                                >
                                                                    <MinusIcon className="h-4 w-4" />
                                                                </Button>

                                                                <div className="text-center min-w-[60px]">
                                                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                                        {value}
                                                                    </div>
                                                                </div>

                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => adjustHP(type, 1)}
                                                                >
                                                                    <PlusIcon className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Armor Class */}
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Защита
                                        </h3>
                                        <div className="max-w-xs">
                                            <Input
                                                label="Класс брони"
                                                type="number"
                                                min={1}
                                                max={30}
                                                {...register('armor_class', { min: 1, max: 30 })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'personality' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Черты характера
                                            </label>
                                            <textarea
                                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                                rows={2}
                                                placeholder="Как ведет себя ваш персонаж?"
                                                {...register('personality_traits')}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Идеалы
                                            </label>
                                            <textarea
                                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                                rows={2}
                                                placeholder="Во что верит ваш персонаж?"
                                                {...register('ideals')}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Привязанности
                                            </label>
                                            <textarea
                                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                                rows={2}
                                                placeholder="Что важно для вашего персонажа?"
                                                {...register('bonds')}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Слабости
                                            </label>
                                            <textarea
                                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                                rows={2}
                                                placeholder="Какие у персонажа есть недостатки?"
                                                {...register('flaws')}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Предыстория
                                            </label>
                                            <textarea
                                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                                rows={4}
                                                placeholder="Расскажите историю вашего персонажа..."
                                                {...register('backstory')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </CardContent>
            </Card>

            {/* Unsaved Changes Warning */}
            {isDirty && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-6 right-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 shadow-lg"
                >
                    <div className="flex items-center space-x-3">
                        <SparklesIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              У вас есть несохраненные изменения
            </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSubmit(onSubmit)}
                            loading={updateMutation.isLoading}
                        >
                            Сохранить
                        </Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default CharacterEditPage;