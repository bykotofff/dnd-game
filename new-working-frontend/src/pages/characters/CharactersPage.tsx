import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    PlusIcon,
    UserGroupIcon,
    PencilIcon,
    EyeIcon,
    HeartIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { characterService } from '@/services/characterService';
import { formatDate } from '@/utils';
import type { CharacterListItem } from '@/services/characterService';

const CharactersPage: React.FC = () => {
    // Исправлено для TanStack Query v5
    const { data: characters, isLoading, error } = useQuery({
        queryKey: ['characters'],
        queryFn: () => characterService.getCharacters(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (isLoading) {
        return <LoadingScreen message="Загрузка персонажей..." />;
    }

    if (error) {
        return (
            <div className="text-center py-16">
                <div className="text-red-500 text-lg mb-4">Ошибка загрузки персонажей</div>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    Попробовать снова
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-fantasy font-bold text-gray-900 dark:text-white">
                        Мои персонажи
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Управляйте своими героями и создавайте новых персонажей
                    </p>
                </div>
                <Button variant="fantasy" asChild>
                    <Link to="/characters/create">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Создать персонажа
                    </Link>
                </Button>
            </div>

            {/* Characters Grid */}
            {characters && characters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {characters.map((character: CharacterListItem, index: number) => (
                        <motion.div
                            key={character.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                            <Card className="character-card hover:shadow-lg transition-all duration-300 group">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-xl font-fantasy text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {character.name}
                                            </CardTitle>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {character.race} {character.class_name}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                {character.level}
                                            </div>
                                            <div className="text-xs text-gray-500">уровень</div>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    {/* Character Portrait */}
                                    <div className="mb-4">
                                        <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                                            {character.portrait_url ? (
                                                <img
                                                    src={character.portrait_url}
                                                    alt={character.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <UserGroupIcon className="w-12 h-12 text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Character Stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="text-center">
                                            <div className="flex items-center justify-center mb-1">
                                                <HeartIcon className="w-4 h-4 text-red-500 mr-1" />
                                                <span className="text-sm font-medium">HP</span>
                                            </div>
                                            <div className="text-lg font-bold text-red-600">
                                                {character.hit_points?.current || 0}/{character.hit_points?.max || 0}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center mb-1">
                                                <ShieldCheckIcon className="w-4 h-4 text-blue-500 mr-1" />
                                                <span className="text-sm font-medium">AC</span>
                                            </div>
                                            <div className="text-lg font-bold text-blue-600">
                                                {character.armor_class || 10}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center mb-1">
                                                <span className="text-sm font-medium">XP</span>
                                            </div>
                                            <div className="text-sm font-bold text-green-600">
                                                {character.experience || 0}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Background & Created Date */}
                                    <div className="space-y-2 mb-4">
                                        {character.background && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-medium">Предыстория:</span> {character.background}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500">
                                            Создан: {formatDate(character.created_at)}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                            asChild
                                        >
                                            <Link to={`/characters/${character.id}`}>
                                                <EyeIcon className="w-4 h-4 mr-1" />
                                                Смотреть
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1"
                                            asChild
                                        >
                                            <Link to={`/characters/${character.id}/edit`}>
                                                <PencilIcon className="w-4 h-4 mr-1" />
                                                Изменить
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="text-center py-16">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <UserGroupIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
                        <h3 className="text-2xl font-fantasy font-bold text-gray-900 dark:text-white mb-4">
                            У вас пока нет персонажей
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                            Создайте своего первого героя и отправьтесь в захватывающие приключения в мире D&D!
                        </p>
                        <Button variant="fantasy" size="lg" asChild>
                            <Link to="/characters/create">
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Создать первого персонажа
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default CharactersPage;