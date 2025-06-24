import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';

import { useAuthActions } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import type { LoginCredentials } from '@/types';

const LoginPage: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuthActions();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<LoginCredentials>();

    const onSubmit = async (data: LoginCredentials) => {
        try {
            await login(data);
            toast.success('Успешный вход в систему!');
            navigate(from, { replace: true });
        } catch (error: any) {
            console.error('Login failed:', error);

            const errorMessage = error.response?.data?.detail || 'Ошибка входа';

            if (errorMessage.includes('credentials')) {
                setError('username', { message: 'Неверные учетные данные' });
                setError('password', { message: 'Неверные учетные данные' });
            } else {
                toast.error(errorMessage);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-amber-50 to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="text-6xl mb-4">⚔️</div>
                    <h1 className="text-3xl font-fantasy font-bold text-gray-900 dark:text-white">
                        D&D AI Game
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Войдите в свой аккаунт
                    </p>
                </div>

                {/* Login Form */}
                <Card variant="fantasy" className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-center font-fantasy">Вход в игру</CardTitle>
                        <CardDescription className="text-center">
                            Добро пожаловать обратно, искатель приключений!
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Username */}
                            <Input
                                label="Имя пользователя или Email"
                                type="text"
                                autoComplete="username"
                                leftIcon={<UserIcon className="h-5 w-5" />}
                                error={errors.username?.message}
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
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

                {/* Demo credentials */}
                {import.meta.env.DEV && (
                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <CardContent className="pt-6">
                            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                                Демо-аккаунты для тестирования:
                            </h3>
                            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                <div>Игрок: <code>testuser</code> / <code>test123</code></div>
                                <div>Админ: <code>admin</code> / <code>admin123</code></div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default LoginPage;