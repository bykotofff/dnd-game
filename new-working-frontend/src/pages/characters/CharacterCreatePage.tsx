import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    SparklesIcon,
    UserIcon,
    ShieldCheckIcon,
    BookOpenIcon,
    HeartIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { apiService } from '@/services/api';
import { getAbilityModifier, formatModifier } from '@/utils';

interface CreateCharacterData {
    name: string;
    race: string;
    character_class: string;
    background?: string;
    alignment?: string;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    personality_traits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
    backstory?: string;
}

// D&D данные
const RACES = [
    { id: 'human', name: 'Человек', description: 'Универсальная раса с бонусом ко всем характеристикам' },
    { id: 'elf', name: 'Эльф', description: 'Грациозная раса с острыми чувствами и магическими способностями' },
    { id: 'dwarf', name: 'Дворф', description: 'Крепкая раса, искусная в ремесле и стойкая к магии' },
    { id: 'halfling', name: 'Полурослик', description: 'Маленький и удачливый народ' },
    { id: 'dragonborn', name: 'Драконорожденный', description: 'Потомки драконов с дыханием стихий' },
    { id: 'gnome', name: 'Гном', description: 'Маленький народ с природной магией' },
    { id: 'half-elf', name: 'Полуэльф', description: 'Наследники двух миров' },
    { id: 'half-orc', name: 'Полуорк', description: 'Сильные воины с орочьей кровью' },
    { id: 'tiefling', name: 'Тифлинг', description: 'Потомки дьяволов с инфернальной магией' },
];

const CLASSES = [
    { id: 'fighter', name: 'Воин', description: 'Мастер боя и оружия', hitDie: 10 },
    { id: 'wizard', name: 'Маг', description: 'Изучает тайны магии', hitDie: 6 },
    { id: 'rogue', name: 'Плут', description: 'Скрытность и ловкость', hitDie: 8 },
    { id: 'cleric', name: 'Жрец', description: 'Служитель божества', hitDie: 8 },
    { id: 'ranger', name: 'Рейнджер', description: 'Страж дикой природы', hitDie: 10 },
    { id: 'paladin', name: 'Паладин', description: 'Святой воин', hitDie: 10 },
    { id: 'barbarian', name: 'Варвар', description: 'Первобытная ярость', hitDie: 12 },
    { id: 'bard', name: 'Бард', description: 'Мастер песен и магии', hitDie: 8 },
    { id: 'druid', name: 'Друид', description: 'Хранитель природы', hitDie: 8 },
    { id: 'monk', name: 'Монах', description: 'Мастер боевых искусств', hitDie: 8 },
    { id: 'warlock', name: 'Колдун', description: 'Заключивший пакт', hitDie: 8 },
    { id: 'sorcerer', name: 'Чародей', description: 'Врожденная магия', hitDie: 6 },
];

const BACKGROUNDS = [
    { id: 'acolyte', name: 'Послушник', description: 'Служили в храме' },
    { id: 'criminal', name: 'Преступник', description: 'Жили вне закона' },
    { id: 'folk-hero', name: 'Народный герой', description: 'Защищали простых людей' },
    { id: 'noble', name: 'Дворянин', description: 'Родились в знатной семье' },
    { id: 'sage', name: 'Мудрец', description: 'Посвятили жизнь знаниям' },
    { id: 'soldier', name: 'Солдат', description: 'Служили в армии' },
    { id: 'charlatan', name: 'Шарлатан', description: 'Мастер обмана' },
    { id: 'entertainer', name: 'Артист', description: 'Развлекали публику' },
    { id: 'guild-artisan', name: 'Ремесленник', description: 'Член гильдии' },
    { id: 'hermit', name: 'Отшельник', description: 'Жили в уединении' },
];

const ALIGNMENTS = [
    { id: 'lg', name: 'Законно-добрый', description: 'Добро через справедливость' },
    { id: 'ng', name: 'Нейтрально-добрый', description: 'Просто добрые поступки' },
    { id: 'cg', name: 'Хаотично-добрый', description: 'Добро через свободу' },
    { id: 'ln', name: 'Законно-нейтральный', description: 'Порядок и традиции' },
    { id: 'n', name: 'Истинно нейтральный', description: 'Баланс всего' },
    { id: 'cn', name: 'Хаотично-нейтральный', description: 'Свобода превыше всего' },
    { id: 'le', name: 'Законно-злой', description: 'Зло через систему' },
    { id: 'ne', name: 'Нейтрально-злой', description: 'Эгоизм и жестокость' },
    { id: 'ce', name: 'Хаотично-злой', description: 'Разрушение и хаос' },
];

const STEPS = [
    { id: 'basic', title: 'Основы', icon: UserIcon },
    { id: 'race', title: 'Раса', icon: SparklesIcon },
    { id: 'class', title: 'Класс', icon: ShieldCheckIcon },
    { id: 'background', title: 'Предыстория', icon: BookOpenIcon },
    { id: 'abilities', title: 'Характеристики', icon: HeartIcon },
    { id: 'details', title: 'Детали', icon: BookOpenIcon },
];

const CharacterCreatePage: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [pointBuyPoints, setPointBuyPoints] = useState(27);
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CreateCharacterData>({
        defaultValues: {
            strength: 8,
            dexterity: 8,
            constitution: 8,
            intelligence: 8,
            wisdom: 8,
            charisma: 8,
        },
    });

    const watchedValues = watch();
    const selectedClass = CLASSES.find(c => c.id === watchedValues.character_class);

    // Point buy system
    const getPointCost = (score: number): number => {
        if (score <= 8) return 0;
        if (score <= 13) return score - 8;
        if (score === 14) return 7;
        if (score === 15) return 9;
        return 0;
    };

    // Calculate remaining points
    const usedPoints = [
        'strength',
        'dexterity',
        'constitution',
        'intelligence',
        'wisdom',
        'charisma'
    ].reduce((total, ability) => {
        const score = watchedValues[ability as keyof CreateCharacterData] as number || 8;
        return total + getPointCost(score);
    }, 0);

    const remainingPoints = 27 - usedPoints;

    const adjustAbility = (ability: keyof CreateCharacterData, delta: number) => {
        const currentValue = watchedValues[ability] as number || 8;
        const newValue = Math.max(8, Math.min(15, currentValue + delta));

        // Check if we have enough points
        const newCost = getPointCost(newValue);
        const oldCost = getPointCost(currentValue);
        const pointDiff = newCost - oldCost;

        if (pointDiff <= remainingPoints) {
            setValue(ability, newValue);
        }
    };

    const onSubmit = async (data: CreateCharacterData) => {
        try {
            const characterData = {
                name: data.name,
                race: data.race,
                character_class: data.character_class,
                background: data.background || null,
                alignment: data.alignment || null,
                // Основные характеристики
                strength: Number(data.strength),
                dexterity: Number(data.dexterity),
                constitution: Number(data.constitution),
                intelligence: Number(data.intelligence),
                wisdom: Number(data.wisdom),
                charisma: Number(data.charisma),
                // Описательные поля
                appearance: data.appearance || null,
                personality_traits: data['personality_traits'] || null,
                ideals: data.ideals || null,
                bonds: data.bonds || null,
                flaws: data.flaws || null,
                backstory: data.backstory || null
            };

            const response = await apiService.post('/characters/', characterData);
            toast.success('Персонаж создан успешно!');
            navigate(`/characters/${response.id}`);
        } catch (error: any) {
            console.error('Error creating character:', error);
            toast.error(error.response?.data?.detail || 'Ошибка при создании персонажа');
        }
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0: // Basic info
                return watchedValues.name?.trim();
            case 1: // Race
                return watchedValues.race;
            case 2: // Class
                return watchedValues.character_class;
            case 3: // Background
                return watchedValues.background;
            case 4: // Abilities
                return remainingPoints === 0;
            case 5: // Details
                return true;
            default:
                return true;
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Basic Info
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Имя персонажа *
                            </label>
                            <Input
                                {...register('name', { required: 'Имя обязательно' })}
                                placeholder="Введите имя вашего героя"
                                error={errors.name?.message}
                            />
                        </div>
                    </div>
                );

            case 1: // Race
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Выберите расу
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {RACES.map((race) => (
                                <label key={race.id} className="flex items-start space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                    <input
                                        type="radio"
                                        {...register('race', { required: 'Выберите расу' })}
                                        value={race.id}
                                        className="mt-1 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {race.name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {race.description}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                );

            case 2: // Class
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Выберите класс
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {CLASSES.map((characterClass) => (
                                <label key={characterClass.id} className="flex items-start space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                    <input
                                        type="radio"
                                        {...register('character_class', { required: 'Выберите класс' })}
                                        value={characterClass.id}
                                        className="mt-1 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {characterClass.name}
                                            </span>
                                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                ХП: d{characterClass.hitDie}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {characterClass.description}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                );

            case 3: // Background & Alignment
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Предыстория
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {BACKGROUNDS.map((background) => (
                                    <label key={background.id} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                        <input
                                            type="radio"
                                            {...register('background', { required: 'Выберите предыстория' })}
                                            value={background.id}
                                            className="mt-1 text-primary-600 focus:ring-primary-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {background.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {background.description}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Мировоззрение
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {ALIGNMENTS.map((alignment) => (
                                    <label key={alignment.id} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                        <input
                                            type="radio"
                                            {...register('alignment')}
                                            value={alignment.id}
                                            className="mt-1 text-primary-600 focus:ring-primary-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {alignment.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {alignment.description}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 4: // Abilities (Point Buy)
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Распределение характеристик
                            </h3>
                            <div className="text-right">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Осталось очков:
                                </div>
                                <div className={`text-2xl font-bold ${remainingPoints === 0 ? 'text-green-600' : 'text-primary-600'}`}>
                                    {remainingPoints}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { key: 'strength', name: 'Сила' },
                                { key: 'dexterity', name: 'Ловкость' },
                                { key: 'constitution', name: 'Телосложение' },
                                { key: 'intelligence', name: 'Интеллект' },
                                { key: 'wisdom', name: 'Мудрость' },
                                { key: 'charisma', name: 'Харизма' },
                            ].map((ability) => {
                                const score = watchedValues[ability.key as keyof CreateCharacterData] as number || 8;
                                const modifier = getAbilityModifier(score);
                                const cost = getPointCost(score);

                                return (
                                    <div key={ability.key} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {ability.name}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                Стоимость: {cost}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => adjustAbility(ability.key as keyof CreateCharacterData, -1)}
                                                disabled={score <= 8}
                                            >
                                                -
                                            </Button>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {score}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {formatModifier(modifier)}
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => adjustAbility(ability.key as keyof CreateCharacterData, 1)}
                                                disabled={score >= 15 || remainingPoints < (getPointCost(score + 1) - cost)}
                                            >
                                                +
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {remainingPoints !== 0 && (
                            <div className="text-center text-amber-600 dark:text-amber-400">
                                Распределите все очки для продолжения
                            </div>
                        )}
                    </div>
                );

            case 5: // Details
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Детали персонажа
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Черты характера
                                </label>
                                <textarea
                                    {...register('personality_traits')}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Как ведет себя персонаж..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Идеалы
                                </label>
                                <textarea
                                    {...register('ideals')}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Во что верит персонаж..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Привязанности
                                </label>
                                <textarea
                                    {...register('bonds')}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Что связывает с миром..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Слабости
                                </label>
                                <textarea
                                    {...register('flaws')}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Недостатки персонажа..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Предыстория
                            </label>
                            <textarea
                                {...register('backstory')}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="Расскажите историю вашего персонажа..."
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-fantasy font-bold text-gray-900 dark:text-white">
                    Создание персонажа
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Создайте уникального героя для ваших приключений
                </p>
            </div>

            {/* Progress Steps */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = index === currentStep;
                            const isCompleted = index < currentStep;

                            return (
                                <div key={step.id} className="flex items-center">
                                    <div
                                        className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                                            isActive
                                                ? 'border-primary-500 bg-primary-500 text-white'
                                                : isCompleted
                                                    ? 'border-green-500 bg-green-500 text-white'
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="ml-3 hidden sm:block">
                                        <p
                                            className={`text-sm font-medium ${
                                                isActive
                                                    ? 'text-primary-600 dark:text-primary-400'
                                                    : isCompleted
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-gray-500 dark:text-gray-400'
                                            }`}
                                        >
                                            {step.title}
                                        </p>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className="hidden sm:block w-16 h-0.5 bg-gray-200 dark:bg-gray-700 ml-4" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Step Content */}
            <Card>
                <CardContent className="p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderStepContent()}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Назад
                </Button>

                {currentStep === STEPS.length - 1 ? (
                    <Button
                        variant="fantasy"
                        onClick={handleSubmit(onSubmit)}
                        loading={isSubmitting}
                        disabled={!canProceed()}
                        className="flex items-center space-x-2"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        <span>Создать персонажа</span>
                    </Button>
                ) : (
                    <Button
                        variant="default"
                        onClick={nextStep}
                        disabled={!canProceed()}
                        className="flex items-center space-x-2"
                    >
                        <span>Далее</span>
                        <ArrowRightIcon className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default CharacterCreatePage;