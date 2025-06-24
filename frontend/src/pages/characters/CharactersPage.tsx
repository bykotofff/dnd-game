import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const CharactersPage: React.FC = () => {
    return (
        <div className="space-y-8">
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
        </div>
    );
};

export default CharactersPage;