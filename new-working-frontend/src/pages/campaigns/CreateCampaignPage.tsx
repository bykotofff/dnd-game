import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
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
        id: 'dramatic',
        name: 'Драматический',
        description: 'Глубокие эмоции и сложные моральные дилеммы',
        icon: '🎬'
    },
];

const CreateCampaignPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedSetting, setSelectedSetting] = useState('');
    const [selectedAiStyle, setSelectedAiStyle] = useState('balanced');

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        defaultValues: {
            max_players: 4,
            starting_level: 1,
            ai_style: 'balanced',
            is_public: false,
            requires_approval: true,
        },
    });

    const createMutation = useMutation(
        (data: CreateCampaignData) => campaignService.createCampaign(data),
        {
            onSuccess: (campaign) => {
                toast.success('Кампания успешно создана!');
                navigate(`/campaigns/${campaign.id}`);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.detail || 'Ошибка при создании кампании');
            },
        }
    );

    const onSubmit = (data: FormData) => {
        const campaignData: CreateCampaignData = {
            ...data,
            setting: selectedSetting,
            ai_style: selectedAiStyle,
        };
        createMutation.mutate(campaignData);
    };

    const nextStep = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const steps = [
        { id: 1, name: 'Основная информация', icon: BookOpenIcon },
        { id: 2, name: 'Сеттинг и мир', icon: GlobeAltIcon },
        { id: 3, name: 'ИИ и настройки', icon: SparklesIcon },
        { id: 4, name: 'Игроки и доступ', icon: UserGroupIcon },
    ];

    const currentStepData = steps.find(step => step.id === currentStep);

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/campaigns')}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Назад к кампаниям
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Создание новой кампании
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Создайте уникальный мир для своих приключений
                </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                                    currentStep >= step.id
                                        ? 'bg-amber-600 border-amber-600 text-white'
                                        : 'border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500'
                                }`}>
                                    {currentStep > step.id ? (
                                        <CheckIcon className="w-5 h-5" />
                                    ) : (
                                        <step.icon className="w-5 h-5" />
                                    )}
                                </div>
                                <span className={`mt-2 text-sm font-medium ${
                                    currentStep >= step.id
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    {step.name}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-4 ${
                                    currentStep > step.id
                                        ? 'bg-amber-600'
                                        : 'bg-gray-300 dark:bg-gray-600'
                                }`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {currentStepData?.icon && <currentStepData.icon className="w-5 h-5" />}
                            {currentStepData?.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Step 1: Basic Information */}
                                {currentStep === 1 && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Название кампании *
                                            </label>
                                            <Input
                                                {...register('name', { required: 'Название обязательно' })}
                                                placeholder="Например: Проклятье Стратольма"
                                                error={errors.name?.message}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Описание
                                            </label>
                                            <textarea
                                                {...register('description')}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Краткое описание вашей кампании..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Максимум игроков
                                                </label>
                                                <Input
                                                    {...register('max_players', {
                                                        required: true,
                                                        min: 1,
                                                        max: 8
                                                    })}
                                                    type="number"
                                                    min="1"
                                                    max="8"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Стартовый уровень
                                                </label>
                                                <Input
                                                    {...register('starting_level', {
                                                        required: true,
                                                        min: 1,
                                                        max: 20
                                                    })}
                                                    type="number"
                                                    min="1"
                                                    max="20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Setting and World */}
                                {currentStep === 2 && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                                Выберите сеттинг
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {CAMPAIGN_SETTINGS.map((setting) => (
                                                    <div
                                                        key={setting.id}
                                                        onClick={() => setSelectedSetting(setting.id)}
                                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                                            selectedSetting === setting.id
                                                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                                        }`}
                                                    >
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            {setting.name}
                                                        </h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            {setting.description}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Описание мира
                                            </label>
                                            <textarea
                                                {...register('world_description')}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Опишите мир вашей кампании..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Основная история
                                            </label>
                                            <textarea
                                                {...register('main_story')}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Основная сюжетная линия..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: AI and Settings */}
                                {currentStep === 3 && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                                Стиль ИИ-мастера
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {AI_STYLES.map((style) => (
                                                    <div
                                                        key={style.id}
                                                        onClick={() => setSelectedAiStyle(style.id)}
                                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                                            selectedAiStyle === style.id
                                                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">{style.icon}</span>
                                                            <div>
                                                                <h4 className="font-medium text-gray-900 dark:text-white">
                                                                    {style.name}
                                                                </h4>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                    {style.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Личность ИИ-мастера
                                            </label>
                                            <textarea
                                                {...register('ai_personality')}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Опишите, каким должен быть ваш ИИ-мастер..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Домашние правила
                                            </label>
                                            <textarea
                                                {...register('house_rules')}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Особые правила для вашей кампании..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Players and Access */}
                                {currentStep === 4 && (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <GlobeAltIcon className="w-5 h-5 text-green-500" />
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            Публичная кампания
                                                        </h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            Другие игроки смогут найти и присоединиться к кампании
                                                        </p>
                                                    </div>
                                                </div>
                                                <input
                                                    {...register('is_public')}
                                                    type="checkbox"
                                                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <LockClosedIcon className="w-5 h-5 text-blue-500" />
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            Требовать одобрение
                                                        </h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            Новые игроки должны получить ваше одобрение
                                                        </p>
                                                    </div>
                                                </div>
                                                <input
                                                    {...register('requires_approval')}
                                                    type="checkbox"
                                                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                            <div className="flex">
                                                <SparklesIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                                                <div className="ml-3">
                                                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                                        Готово к созданию!
                                                    </h4>
                                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                                        ИИ-мастер будет готов управлять вашей кампанией сразу после создания.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Назад
                    </Button>

                    {currentStep < 4 ? (
                        <Button
                            type="button"
                            variant="primary"
                            onClick={nextStep}
                            className="flex items-center gap-2"
                        >
                            Далее
                            <ArrowRightIcon className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={createMutation.isLoading}
                            className="flex items-center gap-2"
                        >
                            {createMutation.isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Создание...
                                </>
                            ) : (
                                <>
                                    <CheckIcon className="w-4 h-4" />
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