import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    EyeIcon,
    EyeSlashIcon,
    UserIcon,
    LockClosedIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { useAuthActions } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { isValidEmail, isValidUsername } from '@/utils';
import type { LoginCredentials } from '@/types';

interface LoginFormData extends LoginCredentials {
    rememberMe: boolean;
}

const LoginPage: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const { login } = useAuthActions();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<LoginFormData>({
        defaultValues: {
            rememberMe: false,
        },
    });

    const watchedUsername = watch('username');

    const onSubmit = async (data: LoginFormData) => {
        try {
            await login({
                username: data.username,
                password: data.password,
            });

            toast.success('Добро пожаловать обратно!');
            navigate(from, { replace: true });
        } catch (error: any) {
            console.error('Login failed:', error);

            setLoginAttempts(prev => prev + 1);

            const errorMessage = error.response?.data?.detail || 'Ошибка входа';

            if (errorMessage.includes('credentials') || errorMessage.includes('Invalid')) {
                setError('username', { message: 'Неверные учетные данные' });
                setError('password', { message: 'Проверьте имя пользователя и пароль' });
            } else if (errorMessage.includes('inactive')) {
                setError('username', { message: 'Аккаунт заблокирован' });
            } else {
                toast.error(errorMessage);
            }
        }
    };

    const getUsernameHelperText = () => {
        if (!watchedUsername) return 'Введите имя пользователя или email';

        if (isValidEmail(watchedUsername)) {
            return 'Email адрес';
        } else if (isValidUsername(watchedUsername)) {
            return 'Имя пользователя';
        } else {
            return 'Некорректный формат';
        }
    };

    const isValidInput = watchedUsername && (isValidEmail(watchedUsername) || isValidUsername(watchedUsername));

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-amber-50 to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <div className="text-6xl mb-4 animate-bounce">⚔️</div>
                    <h1 className="text-3xl font-fantasy font-bold text-gray-900 dark:text-white">
                        D&D AI Game
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Войдите в свой аккаунт, чтобы продолжить приключения
                    </p>
                </motion.div>

                {/* Security Warning for multiple failed attempts */}
                {loginAttempts >= 3 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                    >
                        <div className="flex items-center space-x-3">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            <div>
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                    Несколько неудачных попыток входа
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                    Проверьте правильность ввода данных или попробуйте восстановить пароль
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Login Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card variant="fantasy" className="shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-center font-fantasy">Вход в игру</CardTitle>
                            <CardDescription className="text-center">
                                Добро пожаловать обратно, искатель приключений!
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                {/* Username/Email */}
                                <Input
                                    label="Имя пользователя или Email"
                                    type="text"
                                    autoComplete="username"
                                    autoFocus
                                    leftIcon={<UserIcon className="h-5 w-5" />}
                                    rightIcon={
                                        watchedUsername && (
                                            isValidInput ? (
                                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                                            )
                                        )
                                    }
                                    error={errors.username?.message}
                                    helperText={getUsernameHelperText()}
                                    {...register('username', {
                                        required: 'Обязательное поле',
                                        minLength: {
                                            value: 3,
                                            message: 'Минимум 3 символа',
                                        },
                                    })}
                                />

                                {/* Password */}
                                <Input
                                    label="Пароль"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    leftIcon={<LockClosedIcon className="h-5 w-5" />}
                                    rightIcon={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                                        >
                                            {showPassword ? (
                                                <EyeSlashIcon className="h-5 w-5" />
                                            ) : (
                                                <EyeIcon className="h-5 w-5" />
                                            )}
                                        </button>
                                    }
                                    error={errors.password?.message}
                                    {...register('password', {
                                        required: 'Обязательное поле',
                                        minLength: {
                                            value: 6,
                                            message: 'Минимум 6 символов',
                                        },
                                    })}
                                />

                                {/* Remember Me & Forgot Password */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                            {...register('rememberMe')}
                                        />
                                        <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                            Запомнить меня
                                        </label>
                                    </div>

                                    <Link
                                        to="/forgot-password"
                                        className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                                    >
                                        Забыли пароль?
                                    </Link>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    variant="fantasy"
                                    size="lg"
                                    className="w-full"
                                    loading={isSubmitting}
                                >
                                    Войти в игру
                                </Button>
                            </form>

                            {/* Links */}
                            <div className="mt-6 text-center space-y-2">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Нет аккаунта?{' '}
                                    <Link
                                        to="/register"
                                        className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                                    >
                                        Зарегистрироваться
                                    </Link>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Demo credentials */}
                {import.meta.env.DEV && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                            <CardContent className="pt-6">
                                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                                    🧪 Демо-аккаунты для тестирования:
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/30 rounded p-2">
                                        <span>👤 Игрок:</span>
                                        <div className="space-x-2">
                                            <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">testuser</code>
                                            <span>/</span>
                                            <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">test123</code>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/30 rounded p-2">
                                        <span>👑 Админ:</span>
                                        <div className="space-x-2">
                                            <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">admin</code>
                                            <span>/</span>
                                            <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">admin123</code>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Quick Tips */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center"
                >
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        💡 Совет: Используйте демо-аккаунты для быстрого тестирования функций
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;