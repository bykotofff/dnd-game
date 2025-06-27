import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    PlusIcon,
    UserGroupIcon,
    MapIcon,
    PlayIcon,
    SparklesIcon,
    ClockIcon,
    TrophyIcon,
    FireIcon
} from '@heroicons/react/24/outline';

import { useAuth } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const DashboardPage: React.FC = () => {
    const { user } = useAuth();

    const quickActions = [
        {
            title: 'Создать персонажа',
            description: 'Создайте нового героя для приключений',
            href: '/characters/create',
            icon: PlusIcon,
            color: 'bg-green-500',
            hoverColor: 'hover:bg-green-600',
        },
        {
            title: 'Присоединиться к игре',
            description: 'Найдите активную кампанию',
            href: '/campaigns',
            icon: PlayIcon,
            color: 'bg-blue-500',
            hoverColor: 'hover:bg-blue-600',
        },
        {
            title: 'Создать кампанию',
            description: 'Станьте мастером подземелий',
            href: '/campaigns/create',
            icon: MapIcon,
            color: 'bg-purple-500',
            hoverColor: 'hover:bg-purple-600',
        },
        {
            title: 'Генератор портретов',
            description: 'Создайте портрет с помощью ИИ',
            href: '/tools/portrait-generator',
            icon: SparklesIcon,
            color: 'bg-amber-500',
            hoverColor: 'hover:bg-amber-600',
        },
    ];

    const stats = [
        {
            name: 'Игр сыграно',
            value: user?.games_played || 0,
            icon: TrophyIcon,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100 dark:bg-yellow-900',
        },
        {
            name: 'Время в игре',
            value: `${Math.round((user?.total_playtime || 0) / 60)}ч`,
            icon: ClockIcon,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100 dark:bg-blue-900',
        },
        {
            name: 'Активных персонажей',
            value: 3, // TODO: Получать из API
            icon: UserGroupIcon,
            color: 'text-green-600',
            bgColor: 'bg-green-100 dark:bg-green-900',
        },
        {
            name: 'Уровень активности',
            value: 'Высокий',
            icon: FireIcon,
            color: 'text-red-600',
            bgColor: 'bg-red-100 dark:bg-red-900',
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
            >
                <h1 className="text-4xl font-fantasy font-bold text-gray-900 dark:text-white">
                    Добро пожаловать, {user?.display_name || user?.username}!
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Готовы к новым приключениям? Выберите действие или продолжите существующую кампанию.
                </p>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
                {stats.map((stat) => (
                    <motion.div key={stat.name} variants={itemVariants}>
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center">
                                    <div className={`${stat.bgColor} rounded-lg p-3`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {stat.name}
                                        </p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {stat.value}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
            >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Быстрые действия
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {quickActions.map((action) => (
                        <motion.div key={action.title} variants={itemVariants}>
                            <Link to={action.href}>
                                <Card
                                    className="h-full transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer group"
                                    variant="character"
                                >
                                    <CardContent className="p-6 text-center space-y-4">
                                        <div className={`${action.color} ${action.hoverColor} w-16 h-16 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}>
                                            <action.icon className="h-8 w-8 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                {action.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {action.description}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
                {/* Recent Games */}
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Недавние игры</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <PlayIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Пока нет сыгранных игр</p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    asChild
                                >
                                    <Link to="/campaigns">
                                        Найти игру
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Active Characters */}
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Активные персонажи</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <UserGroupIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Пока нет созданных персонажей</p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    asChild
                                >
                                    <Link to="/characters/create">
                                        Создать персонажа
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Tips Section */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <Card variant="fantasy" className="border-2 border-accent-200 dark:border-accent-700">
                    <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                                <SparklesIcon className="h-8 w-8 text-accent-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Совет дня: Используйте ИИ-генератор портретов
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Создайте уникальный портрет для своего персонажа с помощью нашего ИИ-генератора.
                                    Просто опишите внешность вашего героя, и искусственный интеллект создаст подходящее изображение.
                                </p>
                                <Button variant="fantasy" size="sm" asChild>
                                    <Link to="/tools/portrait-generator">
                                        Попробовать сейчас
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default DashboardPage;