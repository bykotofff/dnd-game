import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    UserIcon,
    PencilIcon,
    CheckIcon,
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

    // Получение полного профиля - исправлен для TanStack Query v5
    const { data: profile, isLoading, error } = useQuery<UserProfile>({
        queryKey: ['profile'],
        queryFn: () => apiService.get('/api/users/me'),
        staleTime: 5 * 60 * 1000, // 5 минут
    });

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

    // Мутация для обновления профиля - исправлена для TanStack Query v5
    const updateProfileMutation = useMutation({
        mutationFn: (data: ProfileFormData) => apiService.put('/api/users/me', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['auth'] });
            toast.success('Профиль обновлен!');
            setIsEditing(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Ошибка при обновлении профиля');
        },
    });

    const onSubmit = (data: ProfileFormData) => {
        updateProfileMutation.mutate(data);
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-red-600">
                            Ошибка при загрузке профиля
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Profile Header */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserIcon className="w-6 h-6" />
                        Профиль пользователя
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                {profile?.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt="Avatar"
                                        className="w-24 h-24 rounded-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="w-12 h-12 text-gray-400" />
                                )}
                            </div>
                            <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
                                <CameraIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Basic Info */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {profile?.display_name || profile?.username}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        @{profile?.username}
                                    </p>
                                </div>
                                <Button
                                    onClick={() => setIsEditing(!isEditing)}
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    {isEditing ? 'Отменить' : 'Редактировать'}
                                </Button>
                            </div>

                            {isEditing ? (
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Отображаемое имя
                                        </label>
                                        <Input
                                            {...register('display_name')}
                                            placeholder="Введите отображаемое имя"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            О себе
                                        </label>
                                        <textarea
                                            {...register('bio')}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            rows={3}
                                            placeholder="Расскажите о себе"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="submit"
                                            disabled={!isDirty || isSubmitting}
                                            className="flex items-center gap-2"
                                        >
                                            <CheckIcon className="w-4 h-4" />
                                            Сохранить
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-gray-600 dark:text-gray-400">
                                        <strong>Email:</strong> {profile?.email}
                                    </p>
                                    {profile?.bio && (
                                        <p className="text-gray-600 dark:text-gray-400">
                                            <strong>О себе:</strong> {profile.bio}
                                        </p>
                                    )}
                                    <p className="text-gray-600 dark:text-gray-400">
                                        <strong>Зарегистрирован:</strong> {formatDate(profile?.created_at)}
                                    </p>
                                    {profile?.last_login && (
                                        <p className="text-gray-600 dark:text-gray-400">
                                            <strong>Последний вход:</strong> {formatDate(profile.last_login)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <TrophyIcon className="w-8 h-8 text-yellow-500" />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Игр сыграно
                                </h3>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {profile?.games_played || 0}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <ClockIcon className="w-8 h-8 text-blue-500" />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Время в игре
                                </h3>
                                <p className="text-2xl font-bold text-blue-600">
                                    {Math.round((profile?.total_playtime || 0) / 60)} ч
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <FireIcon className="w-8 h-8 text-red-500" />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Статус
                                </h3>
                                <p className="text-sm font-medium text-green-600">
                                    {profile?.is_verified ? 'Верифицирован' : 'Активен'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfilePage;