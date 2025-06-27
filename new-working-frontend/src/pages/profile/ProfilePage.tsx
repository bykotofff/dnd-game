import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    UserIcon,
    PencilIcon,
    CheckIcon, // Исправлено: используем CheckIcon вместо SaveIcon
    CameraIcon,
    ClockIcon,
    TrophyIcon,
    FireIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useAuth } from '@/store/authStore';
import { apiService } from '@/services/api';
import { formatDate } from '@/utils';

interface ProfileFormData {
    display_name: string;
    bio: string;
    avatar_url?: string;
}

interface UserProfile {
    id: string;
    username: string;
    email: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    games_played: number;
    total_playtime: number;
    is_verified: boolean;
    created_at: string;
    last_login?: string;
    last_seen?: string;
}

const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

    // Получение полного профиля
    const { data: profile, isLoading, error } = useQuery<UserProfile>(
        ['profile'],
        () => apiService.get('/api/users/me'),
        {
            staleTime: 5 * 60 * 1000, // 5 минут
        }
    );

    // Форма для редактирования
    const { register, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm<ProfileFormData>({
        defaultValues: {
            display_name: profile?.display_name || '',
            bio: profile?.bio || '',
            avatar_url: profile?.avatar_url || '',
        },
    });

    // Обновление профиля после получения данных
    React.useEffect(() => {
        if (profile) {
            reset({
                display_name: profile.display_name || '',
                bio: profile.bio || '',
                avatar_url: profile.avatar_url || '',
            });
        }
    }, [profile, reset]);

    // Мутация для обновления профиля
    const updateProfileMutation = useMutation(
        (data: ProfileFormData) => apiService.put('/api/users/me', data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['profile']);
                queryClient.invalidateQueries(['auth']);
                toast.success('Профиль обновлен!');
                setIsEditing(false);
            },
            onError: () => {
                toast.error('Ошибка при обновлении профиля');
            },
        }
    );

    const onSubmit = (data: ProfileFormData) => {
        updateProfileMutation.mutate(data);
    };

    const handleCancel = () => {
        reset();
        setIsEditing(false);
    };

    if (isLoading) {
        return <LoadingScreen message="Загрузка профиля..." />;
    }

    if (error || !profile) {
        return (
            <div className="text-center py-16">
                <div className="text-red-500 text-lg mb-4">Ошибка загрузки профиля</div>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    Попробовать снова
                </Button>
            </div>
        );
    }

    const stats = [
        {
            name: 'Игр сыграно',
            value: profile.games_played || 0,
            icon: TrophyIcon,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100 dark:bg-yellow-900',
        },
        {
            name: 'Время в игре',
            value: `${Math.round((profile.total_playtime || 0) / 60)}ч`,
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

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-fantasy font-bold text-gray-900 dark:text-white">
                        Мой профиль
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Управляйте своей учетной записью и настройками
                    </p>
                </div>
                {!isEditing && (
                    <Button variant="default" onClick={() => setIsEditing(true)}>
                        <PencilIcon className="h-5 w-5 mr-2" />
                        Редактировать
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Основная информация */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Основная информация</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isEditing ? (
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Отображаемое имя
                                        </label>
                                        <Input
                                            {...register('display_name')}
                                            placeholder="Как вас зовут?"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            О себе
                                        </label>
                                        <textarea
                                            {...register('bio')}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            placeholder="Расскажите о себе..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            URL аватара
                                        </label>
                                        <Input
                                            {...register('avatar_url')}
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="flex space-x-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCancel}
                                        >
                                            Отмена
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="fantasy"
                                            loading={isSubmitting}
                                            disabled={!isDirty}
                                        >
                                            <CheckIcon className="h-5 w-5 mr-2" />
                                            Сохранить
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-start space-x-6">
                                        {/* Аватар */}
                                        <div className="flex-shrink-0">
                                            {profile.avatar_url ? (
                                                <img
                                                    src={profile.avatar_url}
                                                    alt={profile.display_name || profile.username}
                                                    className="w-20 h-20 rounded-full object-cover border-2 border-primary-200 dark:border-primary-700"
                                                />
                                            ) : (
                                                <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-900 rounded-full flex items-center justify-center border-2 border-primary-200 dark:border-primary-700">
                                                    <UserIcon className="w-10 h-10 text-primary-400 dark:text-primary-500" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Информация */}
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    Отображаемое имя
                                                </label>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {profile.display_name || 'Не указано'}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    Имя пользователя
                                                </label>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {profile.username}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    Email
                                                </label>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {profile.email}
                                                    {profile.is_verified ? (
                                                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                            Подтвержден
                                                        </span>
                                                    ) : (
                                                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                            Не подтвержден
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            {profile.bio && (
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        О себе
                                                    </label>
                                                    <p className="text-gray-900 dark:text-white">
                                                        {profile.bio}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Информация об активности */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Активность</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Дата регистрации
                                    </label>
                                    <p className="text-gray-900 dark:text-white">
                                        {formatDate(profile.created_at)}
                                    </p>
                                </div>

                                {profile.last_login && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Последний вход
                                        </label>
                                        <p className="text-gray-900 dark:text-white">
                                            {formatDate(profile.last_login)}
                                        </p>
                                    </div>
                                )}

                                {profile.last_seen && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Последняя активность
                                        </label>
                                        <p className="text-gray-900 dark:text-white">
                                            {formatDate(profile.last_seen)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Статистика */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Статистика игр</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats.map((stat) => {
                                    const Icon = stat.icon;
                                    return (
                                        <motion.div
                                            key={stat.name}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center space-x-3"
                                        >
                                            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                                <Icon className={`h-5 w-5 ${stat.color}`} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {stat.name}
                                                </p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {stat.value}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;