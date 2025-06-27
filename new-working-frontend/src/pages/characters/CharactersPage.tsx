import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
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
    const { data: characters, isLoading, error } = useQuery(
        'characters',
        () => characterService.getCharacters(),
        {
            staleTime: 5 * 60 * 1000, // 5 minutes
        }
    );

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
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {characters.map((character, index) => (
                        <CharacterCard key={character.id} character={character} index={index} />
                    ))}
                </motion.div>
            ) : (
                <Card>
                    <CardContent className="py-16">
                        <div className="text-center">
                            <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                У вас пока нет персонажей
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Создайте своего первого героя для участия в приключениях
                            </p>
                            <Button variant="fantasy" asChild>
                                <Link to="/characters/create">
                                    Создать персонажа
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

interface CharacterCardProps {
    character: CharacterListItem;
    index: number;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card
                variant="character"
                className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-fantasy">
                            {character.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                            {character.is_alive ? (
                                <div className="flex items-center text-green-600 dark:text-green-400">
                                    <HeartIcon className="h-4 w-4 mr-1" />
                                    <span className="text-xs">Жив</span>
                                </div>
                            ) : (
                                <div className="flex items-center text-red-600 dark:text-red-400">
                                    <HeartIcon className="h-4 w-4 mr-1" />
                                    <span className="text-xs">Мертв</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Character Info */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Раса:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                {character.race}
              </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Класс:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                {character.character_class}
              </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Уровень:</span>
                            <div className="flex items-center space-x-1">
                                <ShieldCheckIcon className="h-4 w-4 text-primary-500" />
                                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {character.level}
                </span>
                            </div>
                        </div>
                    </div>

                    {/* Creation Date */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-3">
                        Создан: {formatDate(character.created_at)}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            asChild
                        >
                            <Link to={`/characters/${character.id}`}>
                                <EyeIcon className="h-4 w-4 mr-1" />
                                Просмотр
                            </Link>
                        </Button>

                        <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            asChild
                        >
                            <Link to={`/characters/${character.id}/edit`}>
                                <PencilIcon className="h-4 w-4 mr-1" />
                                Изменить
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default CharactersPage;