import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    CheckIcon, // Заменили SaveIcon на CheckIcon (галочка)
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
                        <CheckIcon className="h-5 w-5 mr-2" />
                        Сохранить
                    </Button>
                </div>
            </div>

            {/* Simplified content for testing */}
            <Card>
                <CardHeader>
                    <CardTitle>Редактирование персонажа</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                            Редактор персонажа временно упрощен для устранения ошибок
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            Персонаж: {character.name} ({character.level} уровень)
                        </p>
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