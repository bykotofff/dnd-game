import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    UserCircleIcon,
    PencilIcon,
    EyeIcon,
    EyeSlashIcon,
    KeyIcon,
    SaveIcon,
    CameraIcon,
    TrashIcon,
    CheckIcon,
    XMarkIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useAuth } from '@/store/authStore';
import { userService } from '@/services/userService';
import type { User } from '@/types';

interface ProfileFormData {
    display_name: string;
    email: string;
    bio: string;
}

interface PasswordFormData {
    old_password: string;
    new_password: string;
    confirm_password: string;
}

interface PreferencesFormData {
    theme: 'light' | 'dark' | 'auto';
    sound_enabled: boolean;
    notifications_enabled: boolean;
    auto_roll_damage: boolean;
    show_advanced_options: boolean;
}

const ProfilePage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('profile');
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Profile form
    const profileForm = useForm<ProfileFormData>({
        defaultValues: {
            display_name: user?.display_name || '',
            email: user?.email || '',
            bio: user?.bio || '',
        },
    });

    // Password form
    const passwordForm = useForm<PasswordFormData>();

    // Preferences form
    const preferencesForm = useForm<PreferencesFormData>({
        defaultValues: {
            theme: user?.preferences?.theme || 'auto',
            sound_enabled: user?.preferences?.sound_enabled ?? true,
            notifications_enabled: user?.preferences?.notifications_enabled ?? true,
            auto_roll_damage: user?.preferences?.auto_roll_damage ?? false,
            show_advanced_options: user?.preferences?.show_advanced_options ?? false,
        },
    });

    // Update profile mutation
    const updateProfileMutation = useMutation(
        (data: ProfileFormData) => userService.updateProfile(data),
        {
            onSuccess: () => {
                toast.success('Профиль обновлен!');
                refreshUser();
            },
            onError: () => {
                toast.error('Ошибка при обновлении профиля');
            },
        }
    );

    // Change password mutation
    const changePasswordMutation = useMutation(
        (data: PasswordFormData) => userService.changePassword(data.old_password, data.new_password),
        {
            onSuccess: () => {
                toast.success('Пароль изменен!');
                passwordForm.reset();
                setShowPasswordChange(false);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.detail || 'Ошибка при изменении пароля');
            },
        }
    );

    // Update preferences mutation
    const updatePreferencesMutation = useMutation(
        (data: PreferencesFormData) => userService.updatePreferences(data),
        {
            onSuccess: () => {
                toast.success('Настройки сохранены!');
                refreshUser();
            },
            onError: () => {
                toast.error('Ошибка при сохранении настроек');
            },
        }
    );

    const onProfileSubmit = (data: ProfileFormData) => {
        updateProfileMutation.mutate(data);
    };

    const onPasswordSubmit = (data: PasswordFormData) => {
        if (data.new_password !== data.confirm_password) {
            toast.error('Пароли не совпадают');
            return;
        }
        changePasswordMutation.mutate(data);
    };

    const onPreferencesSubmit = (data: PreferencesFormData) => {
        updatePreferencesMutation.mutate(data);
    };

    if (!user) {
        return <LoadingScreen message="Загрузка профиля..." />;
    }

    const tabs = [
        { id: 'profile', name: 'Профиль', icon: UserCircleIcon },
        { id: 'security', name: 'Безопасность', icon: KeyIcon },
        { id: 'preferences', name: 'Настройки', icon: Cog6ToothIcon },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-fantasy font-bold text-gray-900 dark:text-white">
                    Профиль пользователя
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Управление аккаунтом и настройками
                </p>
            </div>

            {/* User Info Card */}
            <Card variant="character">
                <CardContent className="p-6">
                    <div className="flex items-center space-x-6">
                        {/* Avatar */}
                        <div className="relative">
                            {user.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user.display_name || user.username}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-primary-200 dark:border-primary-700"
                                />
                            ) : (
                                <div className="w-24 h-24 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center border-4 border-primary-200 dark:border-primary-700">
                                    <UserCircleIcon className="w-16 h-16 text-primary-600 dark:text-primary-400" />
                                </div>
                            )}
                            <button className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <CameraIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {user.display_name || user.username}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{user.email}</p>

                            <div className="flex items-center space-x-4 mt-3">
                                <div className="flex items-center space-x-1">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Игр сыграно:
                                    </span>
                                    <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                                        {user.games_played}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Время в игре:
                                    </span>
                                    <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                                        {Math.round(user.total_playtime / 60)}ч
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                                        <Icon className="w-5 h-5" />
                                        <span>{tab.name}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="p-6">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input
                                            label="Отображаемое имя"
                                            {...profileForm.register('display_name')}
                                            error={profileForm.formState.errors.display_name?.message}
                                        />
                                        <Input
                                            label="Email"
                                            type="email"
                                            {...profileForm.register('email', {
                                                required: 'Email обязателен',
                                                pattern: {
                                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                    message: 'Некорректный email',
                                                },
                                            })}
                                            error={profileForm.formState.errors.email?.message}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            О себе
                                        </label>
                                        <textarea
                                            {...profileForm.register('bio')}
                                            rows={4}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="Расскажите о себе..."
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            loading={updateProfileMutation.isLoading}
                                            disabled={!profileForm.formState.isDirty}
                                        >
                                            <SaveIcon className="w-4 h-4 mr-2" />
                                            Сохранить изменения
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                                            Безопасность аккаунта
                                        </h3>
                                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                                            Регулярно меняйте пароль для защиты вашего аккаунта.
                                        </p>

                                        {!showPasswordChange ? (
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowPasswordChange(true)}
                                            >
                                                <KeyIcon className="w-4 h-4 mr-2" />
                                                Сменить пароль
                                            </Button>
                                        ) : (
                                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                                <Input
                                                    label="Текущий пароль"
                                                    type={showCurrentPassword ? 'text' : 'password'}
                                                    {...passwordForm.register('old_password', {
                                                        required: 'Введите текущий пароль',
                                                    })}
                                                    error={passwordForm.formState.errors.old_password?.message}
                                                    rightIcon={
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                            className="text-gray-400 hover:text-gray-600"
                                                        >
                                                            {showCurrentPassword ? (
                                                                <EyeSlashIcon className="w-5 h-5" />
                                                            ) : (
                                                                <EyeIcon className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    }
                                                />

                                                <Input
                                                    label="Новый пароль"
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    {...passwordForm.register('new_password', {
                                                        required: 'Введите новый пароль',
                                                        minLength: {
                                                            value: 8,
                                                            message: 'Пароль должен содержать минимум 8 символов',
                                                        },
                                                    })}
                                                    error={passwordForm.formState.errors.new_password?.message}
                                                    rightIcon={
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                                            className="text-gray-400 hover:text-gray-600"
                                                        >
                                                            {showNewPassword ? (
                                                                <EyeSlashIcon className="w-5 h-5" />
                                                            ) : (
                                                                <EyeIcon className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    }
                                                />

                                                <Input
                                                    label="Подтвердите новый пароль"
                                                    type="password"
                                                    {...passwordForm.register('confirm_password', {
                                                        required: 'Подтвердите новый пароль',
                                                    })}
                                                    error={passwordForm.formState.errors.confirm_password?.message}
                                                />

                                                <div className="flex space-x-3">
                                                    <Button
                                                        type="submit"
                                                        loading={changePasswordMutation.isLoading}
                                                    >
                                                        <CheckIcon className="w-4 h-4 mr-2" />
                                                        Сменить пароль
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setShowPasswordChange(false);
                                                            passwordForm.reset();
                                                        }}
                                                    >
                                                        <XMarkIcon className="w-4 h-4 mr-2" />
                                                        Отмена
                                                    </Button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Preferences Tab */}
                            {activeTab === 'preferences' && (
                                <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                            Настройки интерфейса
                                        </h3>

                                        {/* Theme */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Тема оформления
                                            </label>
                                            <select
                                                {...preferencesForm.register('theme')}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            >
                                                <option value="auto">Системная</option>
                                                <option value="light">Светлая</option>
                                                <option value="dark">Темная</option>
                                            </select>
                                        </div>

                                        {/* Checkboxes */}
                                        <div className="space-y-3">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    {...preferencesForm.register('sound_enabled')}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                                    Звуковые эффекты
                                                </span>
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    {...preferencesForm.register('notifications_enabled')}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                                    Уведомления
                                                </span>
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    {...preferencesForm.register('auto_roll_damage')}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                                    Автоматически бросать урон
                                                </span>
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    {...preferencesForm.register('show_advanced_options')}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                                    Показывать расширенные настройки
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            loading={updatePreferencesMutation.isLoading}
                                            disabled={!preferencesForm.formState.isDirty}
                                        >
                                            <SaveIcon className="w-4 h-4 mr-2" />
                                            Сохранить настройки
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfilePage;