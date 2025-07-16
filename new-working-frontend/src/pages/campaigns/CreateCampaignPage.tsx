import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckIcon,
    SparklesIcon,
    GlobeAltIcon,
    UsersIcon,
    CogIcon,
    BookOpenIcon,
    UserGroupIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { campaignService } from '@/services/campaignService';
import type { CreateCampaignData } from '@/services/campaignService';

interface FormData extends CreateCampaignData {}

const CAMPAIGN_SETTINGS = [
    { id: 'fantasy', name: 'Фэнтези', description: 'Классическое средневековое фэнтези с магией и драконами' },
    { id: 'modern', name: 'Современность', description: 'Современный мир с элементами мистики' },
    { id: 'sci-fi', name: 'Научная фантастика', description: 'Космические путешествия и высокие технологии' },
    { id: 'cyberpunk', name: 'Киберпанк', description: 'Мрачное будущее с корпорациями и хакерами' },
    { id: 'steampunk', name: 'Стимпанк', description: 'Викторианская эпоха с паровыми технологиями' },
    { id: 'horror', name: 'Хоррор', description: 'Мистика, ужасы и сверхъестественное' },
    { id: 'custom', name: 'Собственный', description: 'Создайте свой уникальный мир' },
];

const AI_STYLES = [
    {
        id: 'balanced',
        name: 'Сбалансированный',
        description: 'Идеальный баланс между серьезностью и юмором',
        icon: '⚖️'
    },
    {
        id: 'serious',
        name: 'Серьезный',
        description: 'Фокус на драме и эпических моментах',
        icon: '🎭'
    },
    {
        id: 'humorous',
        name: 'Юмористический',
        description: 'Легкая атмосфера с шутками и забавными ситуациями',
        icon: '😄'
    },
    {
        id: 'dark',
        name: 'Мрачный',
        description: 'Серьезная и напряженная атмосфера',
        icon: '🌙'
    },
    {
        id: 'heroic',
        name: 'Героический',
        description: 'Классические героические приключения',
        icon: '⚔️'
    }
];

const CreateCampaignPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedSetting, setSelectedSetting] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('');

    const { register, handleSubmit, watch, setValue, formState: { errors, isValid } } = useForm<FormData>({
        mode: 'onChange',
        defaultValues: {
            is_public: false,
            max_players: 4,
            setting: '',
            ai_style: 'balanced',
            allow_homebrew: true,
        }
    });

    // Исправлено для TanStack Query v5
    const createMutation = useMutation({
        mutationFn: (data: CreateCampaignData) => campaignService.createCampaign(data),
        onSuccess: (campaign) => {
            toast.success('Кампания создана!');
            navigate(`/campaigns/${campaign.id}`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Ошибка при создании кампании');
        },
    });

    const onSubmit = (data: FormData) => {
        const formData = {
            ...data,
            setting: selectedSetting,
            ai_style: selectedStyle,
        };
        createMutation.mutate(formData);
    };

    const nextStep = () => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const isStepValid = () => {
        switch (currentStep) {
            case 1:
                return watch('name') && watch('description');
            case 2:
                return selectedSetting;
            case 3:
                return selectedStyle;
            default:
                return false;
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/campaigns')}
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Назад к кампаниям
                    </Button>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Создание новой кампании
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Настройте свою кампанию в несколько простых шагов
                </p>

                {/* Progress Bar */}
                <div className="mt-8 mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Шаг {currentStep} из 3
                        </span>
                        <span className="text-sm text-gray-500">
                            {Math.round((currentStep / 3) * 100)}% завершено
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <motion.div
                            className="bg-blue-600 h-2 rounded-full"
                            initial={{ width: '33%' }}
                            animate={{ width: `${(currentStep / 3) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <AnimatePresence mode="wait">
                    {/* Step 1: Basic Information */}
                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpenIcon className="w-6 h-6" />
                                        Основная информация
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Название кампании*
                                        </label>
                                        <Input
                                            {...register('name', { required: 'Название обязательно' })}
                                            placeholder="Введите название кампании"
                                            error={errors.name?.message}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Описание*
                                        </label>
                                        <textarea
                                            {...register('description', { required: 'Описание обязательно' })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            rows={4}
                                            placeholder="Опишите вашу кампанию..."
                                        />
                                        {errors.description && (
                                            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Максимум игроков
                                            </label>
                                            <Input
                                                {...register('max_players', {
                                                    required: 'Количество игроков обязательно',
                                                    min: { value: 1, message: 'Минимум 1 игрок' },
                                                    max: { value: 8, message: 'Максимум 8 игроков' }
                                                })}
                                                type="number"
                                                min="1"
                                                max="8"
                                                error={errors.max_players?.message}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Тип кампании
                                            </label>
                                            <div className="flex items-center space-x-4">
                                                <label className="flex items-center">
                                                    <input
                                                        {...register('is_public')}
                                                        type="radio"
                                                        value="false"
                                                        className="mr-2"
                                                    />
                                                    <LockClosedIcon className="w-4 h-4 mr-1" />
                                                    Приватная
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        {...register('is_public')}
                                                        type="radio"
                                                        value="true"
                                                        className="mr-2"
                                                    />
                                                    <GlobeAltIcon className="w-4 h-4 mr-1" />
                                                    Публичная
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Step 2: Campaign Setting */}
                    {currentStep === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CogIcon className="w-6 h-6" />
                                        Настройки мира
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {CAMPAIGN_SETTINGS.map((setting) => (
                                            <motion.div
                                                key={setting.id}
                                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                    selectedSetting === setting.id
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                                onClick={() => setSelectedSetting(setting.id)}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                    {setting.name}
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {setting.description}
                                                </p>
                                                {selectedSetting === setting.id && (
                                                    <CheckIcon className="w-5 h-5 text-blue-600 mt-2" />
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Step 3: AI Style */}
                    {currentStep === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <SparklesIcon className="w-6 h-6" />
                                        Стиль ИИ ведущего
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        {AI_STYLES.map((style) => (
                                            <motion.div
                                                key={style.id}
                                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                    selectedStyle === style.id
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                                onClick={() => setSelectedStyle(style.id)}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-2xl">{style.icon}</span>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        {style.name}
                                                    </h3>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {style.description}
                                                </p>
                                                {selectedStyle === style.id && (
                                                    <CheckIcon className="w-5 h-5 text-blue-600 mt-2" />
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>

                                    <div className="space-y-4">
                                        <label className="flex items-center">
                                            <input
                                                {...register('allow_homebrew')}
                                                type="checkbox"
                                                className="mr-3"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                Разрешить homebrew контент (пользовательские расы, классы и т.д.)
                                            </span>
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Назад
                    </Button>

                    {currentStep < 3 ? (
                        <Button
                            type="button"
                            onClick={nextStep}
                            disabled={!isStepValid()}
                        >
                            Далее
                            <ArrowRightIcon className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            disabled={!isStepValid() || createMutation.isPending}
                        >
                            {createMutation.isPending ? (
                                <>
                                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                    Создание...
                                </>
                            ) : (
                                <>
                                    <CheckIcon className="w-4 h-4 mr-2" />
                                    Создать кампанию
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default CreateCampaignPage;