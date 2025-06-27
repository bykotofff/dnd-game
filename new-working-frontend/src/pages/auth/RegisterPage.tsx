import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
    EyeIcon,
    EyeSlashIcon,
    UserIcon,
    EnvelopeIcon,
    LockClosedIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';

import { useAuthActions } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { isValidEmail, isValidUsername, isStrongPassword } from '@/utils';
import type { RegisterData } from '@/types';

interface RegisterFormData extends RegisterData {
    confirmPassword: string;
    agreeToTerms: boolean;
}

const RegisterPage: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register: registerUser } = useAuthActions();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<RegisterFormData>();

    const watchedPassword = watch('password');
    const watchedUsername = watch('username');
    const watchedEmail = watch('email');

    // Real-time validation helpers
    const getPasswordStrength = (password: string) => {
        if (!password) return { score: 0, text: '', color: '' };

        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const levels = [
            { score: 0, text: 'Очень слабый', color: 'text-red-500' },
            { score: 1, text: 'Слабый', color: 'text-red-400' },
            { score: 2, text: 'Средний', color: 'text-yellow-500' },
            { score: 3, text: 'Хороший', color: 'text-blue-500' },
            { score: 4, text: 'Сильный', color: 'text-green-500' },
            { score: 5, text: 'Очень сильный', color: 'text-green-600' },
        ];

        return levels[score];
    };

    const passwordStrength = getPasswordStrength(watchedPassword || '');

    const onSubmit = async (data: RegisterFormData) => {
        try {
            // Client-side validation
            if (!isValidUsername(data.username)) {
                setError('username', {
                    message: 'Имя пользователя должно содержать 3-20 символов и только буквы, цифры и _'
                });
                return;
            }

            if (!isValidEmail(data.email)) {
                setError('email', { message: 'Некорректный email адрес' });
                return;
            }

            if (!isStrongPassword(data.password)) {
                setError('password', {
                    message: 'Пароль должен содержать минимум 8 символов, заглавные и строчные буквы, цифры'
                });
                return;
            }

            if (data.password !== data.confirmPassword) {
                setError('confirmPassword', { message: 'Пароли не совпадают' });
                return;
            }

            if (!data.agreeToTerms) {
                toast.error('Необходимо согласиться с условиями использования');
                return;
            }

            // Register user
            const registerData: RegisterData = {
                username: data.username,
                email: data.email,
                password: data.password,
                display_name: data.display_name,
            };

            await registerUser(registerData);
            toast.success('Регистрация прошла успешно! Добро пожаловать!');
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Registration failed:', error);

            const errorMessage = error.response?.data?.detail || 'Ошибка регистрации';

            if (errorMessage.includes('username')) {
                setError('username', { message: 'Это имя пользователя уже занято' });
            } else if (errorMessage.includes('email')) {
                setError('email', { message: 'Этот email уже зарегистрирован' });
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
                        Создайте аккаунт для начала приключений
                    </p>
                </div>

                {/* Registration Form */}
                <Card variant="fantasy" className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-center font-fantasy">Регистрация</CardTitle>
                        <CardDescription className="text-center">
                            Присоединяйтесь к сообществу искателей приключений!
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Username */}
                            <div>
                                <Input
                                    label="Имя пользователя"
                                    type="text"
                                    autoComplete="username"
                                    leftIcon={<UserIcon className="h-5 w-5" />}
                                    rightIcon={
                                        watchedUsername && (
                                            isValidUsername(watchedUsername) ? (
                                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <XCircleIcon className="h-5 w-5 text-red-500" />
                                            )
                                        )
                                    }
                                    error={errors.username?.message}
                                    helperText="3-20 символов, только буквы, цифры и _"
                                    {...register('username', {
                                        required: 'Обязательное поле',
                                        minLength: {
                                            value: 3,
                                            message: 'Минимум 3 символа',
                                        },
                                        maxLength: {
                                            value: 20,
                                            message: 'Максимум 20 символов',
                                        },
                                        pattern: {
                                            value: /^[a-zA-Z0-9_]+$/,
                                            message: 'Только буквы, цифры и подчеркивания',
                                        },
                                    })}
                                />
                            </div>

                            {/* Display Name */}
                            <Input
                                label="Отображаемое имя (необязательно)"
                                type="text"
                                autoComplete="name"
                                helperText="Как вас будут видеть другие игроки"
                                {...register('display_name', {
                                    maxLength: {
                                        value: 50,
                                        message: 'Максимум 50 символов',
                                    },
                                })}
                            />

                            {/* Email */}
                            <div>
                                <Input
                                    label="Email"
                                    type="email"
                                    autoComplete="email"
                                    leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                                    rightIcon={
                                        watchedEmail && (
                                            isValidEmail(watchedEmail) ? (
                                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <XCircleIcon className="h-5 w-5 text-red-500" />
                                            )
                                        )
                                    }
                                    error={errors.email?.message}
                                    {...register('email', {
                                        required: 'Обязательное поле',
                                        pattern: {
                                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                            message: 'Некорректный email адрес',
                                        },
                                    })}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <Input
                                    label="Пароль"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
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
                                            value: 8,
                                            message: 'Минимум 8 символов',
                                        },
                                    })}
                                />

                                {/* Password strength indicator */}
                                {watchedPassword && (
                                    <div className="mt-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-300 ${
                                                        passwordStrength.score >= 4 ? 'bg-green-500' :
                                                            passwordStrength.score >= 3 ? 'bg-blue-500' :
                                                                passwordStrength.score >= 2 ? 'bg-yellow-500' :
                                                                    'bg-red-500'
                                                    }`}
                                                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.text}
                      </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <Input
                                label="Подтвердите пароль"
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                leftIcon={<LockClosedIcon className="h-5 w-5" />}
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeSlashIcon className="h-5 w-5" />
                                        ) : (
                                            <EyeIcon className="h-5 w-5" />
                                        )}
                                    </button>
                                }
                                error={errors.confirmPassword?.message}
                                {...register('confirmPassword', {
                                    required: 'Подтвердите пароль',
                                    validate: (value) =>
                                        value === watchedPassword || 'Пароли не совпадают',
                                })}
                            />

                            {/* Terms agreement */}
                            <div className="flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    {...register('agreeToTerms', {
                                        required: 'Необходимо согласиться с условиями',
                                    })}
                                />
                                <div className="text-sm">
                                    <label className="text-gray-700 dark:text-gray-300">
                                        Я согласен с{' '}
                                        <Link
                                            to="/terms"
                                            className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                                        >
                                            условиями использования
                                        </Link>{' '}
                                        и{' '}
                                        <Link
                                            to="/privacy"
                                            className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                                        >
                                            политикой конфиденциальности
                                        </Link>
                                    </label>
                                    {errors.agreeToTerms && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                            {errors.agreeToTerms.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                variant="fantasy"
                                size="lg"
                                className="w-full"
                                loading={isSubmitting}
                            >
                                Создать аккаунт
                            </Button>
                        </form>

                        {/* Links */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Уже есть аккаунт?{' '}
                                <Link
                                    to="/login"
                                    className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                                >
                                    Войти
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RegisterPage;