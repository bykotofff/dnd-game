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
import { characterService } from '@/services/characterService';
import { getAbilityModifier, formatModifier, calculateMaxHP } from '@/utils';
import type { CreateCharacterData } from '@/services/characterService';

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
    { id: 'fighter', name: 'Воин', description: 'Мастер оружия и доспехов', hitDie: 10 },
    { id: 'wizard', name: 'Волшебник', description: 'Изучает тайны магии', hitDie: 6 },
    { id: 'rogue', name: 'Плут', description: 'Скрытность и ловкость', hitDie: 8 },
    { id: 'cleric', name: 'Жрец', description: 'Служитель божества', hitDie: 8 },
    { id: 'ranger', name: 'Следопыт', description: 'Охотник и защитник природы', hitDie: 10 },
    { id: 'paladin', name: 'Паладин', description: 'Святой воин', hitDie: 10 },
    { id: 'barbarian', name: 'Варвар', description: 'Дикий берсерк', hitDie: 12 },
    { id: 'bard', name: 'Бард', description: 'Мастер песен и магии', hitDie: 8 },
    { id: 'druid', name: 'Друид', description: 'Хранитель природы', hitDie: 8 },
    { id: 'monk', name: 'Монах', description: 'Мастер боевых искусств', hitDie: 8 },
    { id: 'sorcerer', name: 'Чародей', description: 'Врожденная магия', hitDie: 6 },
    { id: 'warlock', name: 'Колдун', description: 'Заключивший договор', hitDie: 8 },
];

const BACKGROUNDS = [
    { id: 'acolyte', name: 'Послушник', description: 'Служили в храме' },
    { id: 'criminal', name: 'Преступник', description: 'Жили вне закона' },
    { id: 'folk-hero', name: 'Народный герой', description: 'Защищали простых людей' },
    { id: 'noble', name: 'Благородный', description: 'Родились в знатной семье' },
    { id: 'sage', name: 'Мудрец', description: 'Посвятили жизнь знаниям' },
    { id: 'soldier', name: 'Солдат', description: 'Служили в армии' },
];

const ALIGNMENTS = [
    { id: 'lg', name: 'Законно-добрый', description: 'Добро через закон и порядок' },
    { id: 'ng', name: 'Нейтрально-добрый', description: 'Добро превыше всего' },
    { id: 'cg', name: 'Хаотично-добрый', description: 'Добро через свободу' },
    { id: 'ln', name: 'Законно-нейтральный', description: 'Порядок и традиции' },
    { id: 'n', name: 'Истинно нейтральный', description: 'Баланс всего' },
    { id: 'cn', name: 'Хаотично-нейтральный', description: 'Свобода превыше всего' },
    { id: 'le', name: 'Законно-злой', description: 'Зло через систему' },
    { id: 'ne', name: 'Нейтрально-злой', description: 'Эгоизм и жестокость' },
    { id: 'ce', name: 'Хаотично-злой', description: 'Разрушение и хаос' },
];

interface FormData extends CreateCharacterData {}

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
    } = useForm<FormData>({
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
    const getPointCost = (score: number) => {
        const costs: Record<number, number> = {
            8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
        };
        return costs[score] || 0;
    };

    const calculateUsedPoints = () => {
        return ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
            .reduce((total, ability) => {
                const score = watchedValues[ability as keyof FormData] as number;
                return total + getPointCost(score);
            }, 0);
    };

    const usedPoints = calculateUsedPoints();
    const remainingPoints = 27 - usedPoints;

    const canIncreaseAbility = (currentScore: number) => {
        return currentScore < 15 && getPointCost(currentScore + 1) <= remainingPoints + getPointCost(currentScore);
    };

    const adjustAbility = (ability: keyof FormData, delta: number) => {
        const currentScore = watchedValues[ability] as number;
        const newScore = Math.max(8, Math.min(15, currentScore + delta));

        if (delta > 0 && !canIncreaseAbility(currentScore)) return;

        setValue(ability, newScore);
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

    const onSubmit = async (data: FormData) => {
        try {
            if (remainingPoints !== 0) {
                toast.error('Распределите все очки характеристик');
                return;
            }

            const character = await characterService.createCharacter(data);
            toast.success('Персонаж успешно создан!');
            navigate(`/characters/${character.id}/edit`);
        } catch (error: any) {
            console.error('Failed to create character:', error);
            toast.error('Ошибка при создании персонажа');
        }
    };

    const renderStep = () => {
        switch (STEPS[currentStep].id) {
            case 'basic':
                return (
                    <div className="space-y-6">
                        <Input
                            label="Имя персонажа"
                            error={errors.name?.message}
                            {...register('name', { required: 'Имя обязательно' })}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Мировоззрение
                            </label>
                            <div className="grid grid-cols-1 gap-3">
                                {ALIGNMENTS.map((alignment) => (
                                    <label
                                        key={alignment.id}
                                        className="relative flex cursor-pointer rounded-lg border p-4 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <input
                                            type="radio"
                                            value={alignment.id}
                                            className="sr-only"
                                            {...register('alignment')}
                                        />
                                        <div className="flex flex-1">
                                            <div className="flex flex-col">
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">
                          {alignment.name}
                        </span>
                                                <span className="block text-sm text-gray-500 dark:text-gray-400">
                          {alignment.description}
                        </span>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'race':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Выберите расу</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {RACES.map((race) => (
                                <label
                                    key={race.id}
                                    className="relative flex cursor-pointer rounded-lg border p-4 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <input
                                        type="radio"
                                        value={race.id}
                                        className="sr-only"
                                        {...register('race', { required: 'Выберите расу' })}
                                    />
                                    <div className="flex flex-1">
                                        <div className="flex flex-col">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">
                        {race.name}
                      </span>
                                            <span className="block text-sm text-gray-500 dark:text-gray-400">
                        {race.description}
                      </span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                );

            case 'class':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Выберите класс</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {CLASSES.map((charClass) => (
                                <label
                                    key={charClass.id}
                                    className="relative flex cursor-pointer rounded-lg border p-4 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <input
                                        type="radio"
                                        value={charClass.id}
                                        className="sr-only"
                                        {...register('character_class', { required: 'Выберите класс' })}
                                    />
                                    <div className="flex flex-1 justify-between">
                                        <div className="flex flex-col">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">
                        {charClass.name}
                      </span>
                                            <span className="block text-sm text-gray-500 dark:text-gray-400">
                        {charClass.description}
                      </span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Кость здоровья: d{charClass.hitDie}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                );

            case 'background':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Выберите предыстория</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {BACKGROUNDS.map((background) => (
                                <label
                                    key={background.id}
                                    className="relative flex cursor-pointer rounded-lg border p-4 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <input
                                        type="radio"
                                        value={background.id}
                                        className="sr-only"
                                        {...register('background')}
                                    />
                                    <div className="flex flex-1">
                                        <div className="flex flex-col">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">
                        {background.name}
                      </span>
                                            <span className="block text-sm text-gray-500 dark:text-gray-400">
                        {background.description}
                      </span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                );

            case 'abilities':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Распределение характеристик</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Система покупки очков (Point Buy)
                            </p>
                            <div className="bg-primary-50 dark:bg-primary-900 rounded-lg p-4">
                                <p className="text-lg font-semibold text-primary-900 dark:text-primary-100">
                                    Осталось очков: {remainingPoints}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { key: 'strength', name: 'Сила' },
                                { key: 'dexterity', name: 'Ловкость' },
                                { key: 'constitution', name: 'Телосложение' },
                                { key: 'intelligence', name: 'Интеллект' },
                                { key: 'wisdom', name: 'Мудрость' },
                                { key: 'charisma', name: 'Харизма' },
                            ].map(({ key, name }) => {
                                const score = watchedValues[key as keyof FormData] as number;
                                const modifier = getAbilityModifier(score);

                                return (
                                    <Card key={key} className="p-4">
                                        <div className="text-center space-y-3">
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {name}
                                            </h4>

                                            <div className="flex items-center justify-center space-x-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => adjustAbility(key as keyof FormData, -1)}
                                                    disabled={score <= 8}
                                                >
                                                    -
                                                </Button>

                                                <div className="text-center min-w-[60px]">
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
                                                    onClick={() => adjustAbility(key as keyof FormData, 1)}
                                                    disabled={!canIncreaseAbility(score)}
                                                >
                                                    +
                                                </Button>
                                            </div>

                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Стоимость: {getPointCost(score)}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {selectedClass && (
                            <Card className="bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
                                <CardContent className="p-4">
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                        Предварительные характеристики
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-blue-700 dark:text-blue-300">Очки здоровья: </span>
                                            <span className="font-medium">
                        {selectedClass.hitDie + getAbilityModifier(watchedValues.constitution)}
                      </span>
                                        </div>
                                        <div>
                                            <span className="text-blue-700 dark:text-blue-300">Класс брони: </span>
                                            <span className="font-medium">
                        {10 + getAbilityModifier(watchedValues.dexterity)}
                      </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                );

            case 'details':
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium">Детали персонажа</h3>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Внешность
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                    rows={3}
                                    placeholder="Опишите внешность вашего персонажа..."
                                    {...register('appearance')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Черты характера
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                    rows={2}
                                    placeholder="Как ведет себя ваш персонаж?"
                                    {...register('personality_traits')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Идеалы
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                    rows={2}
                                    placeholder="Во что верит ваш персонаж?"
                                    {...register('ideals')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Привязанности
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                    rows={2}
                                    placeholder="Что важно для вашего персонажа?"
                                    {...register('bonds')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Слабости
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                    rows={2}
                                    placeholder="Какие у персонажа есть недостатки?"
                                    {...register('flaws')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Предыстория
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                    rows={4}
                                    placeholder="Расскажите историю вашего персонажа..."
                                    {...register('backstory')}
                                />
                            </div>
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
                                        <div className="ml-6 w-12 h-0.5 bg-gray-300 dark:bg-gray-600 hidden sm:block" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Step Content */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <STEPS[currentStep].icon className="w-6 h-6" />
                        <span>{STEPS[currentStep].title}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderStep()}
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
                    className="flex items-center space-x-2"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    <span>Назад</span>
                </Button>

                {currentStep === STEPS.length - 1 ? (
                    <Button
                        variant="fantasy"
                        onClick={handleSubmit(onSubmit)}
                        loading={isSubmitting}
                        disabled={remainingPoints !== 0}
                        className="flex items-center space-x-2"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        <span>Создать персонажа</span>
                    </Button>
                ) : (
                    <Button
                        variant="default"
                        onClick={nextStep}
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