import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    SparklesIcon,
    PhotoIcon,
    ArrowPathIcon,
    ArrowDownTrayIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { apiService } from '@/services/api';

interface GeneratedImage {
    url: string;
    prompt: string;
    timestamp: string;
}

const PortraitGeneratorPage: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedStyle, setSelectedStyle] = useState('realistic');
    const [selectedRace, setSelectedRace] = useState('');
    const [selectedClass, setSelectedClass] = useState('');

    const styles = [
        { id: 'realistic', name: 'Реалистичный', description: 'Фотореалистичный стиль' },
        { id: 'fantasy', name: 'Фэнтези', description: 'Классический фэнтези арт' },
        { id: 'anime', name: 'Аниме', description: 'Аниме стиль' },
        { id: 'oil-painting', name: 'Живопись', description: 'Стиль масляной живописи' },
        { id: 'digital-art', name: 'Цифровой арт', description: 'Современный цифровой стиль' },
    ];

    const races = [
        'Человек', 'Эльф', 'Дворф', 'Полурослик', 'Драконорожденный',
        'Гном', 'Полуэльф', 'Полуорк', 'Тифлинг'
    ];

    const classes = [
        'Воин', 'Маг', 'Плут', 'Жрец', 'Рейнджер', 'Паладин',
        'Варвар', 'Бард', 'Друид', 'Монах', 'Колдун', 'Чародей'
    ];

    const presetPrompts = [
        'Эльфийский воин с длинными серебристыми волосами',
        'Дварфийский паладин в сияющих доспехах',
        'Человек-маг с магическим посохом',
        'Тифлинг-плут в темном плаще',
        'Драконорожденный-варвар с боевым топором',
        'Гном-жрец с священным символом',
    ];

    const generateImage = async () => {
        if (!prompt.trim()) {
            toast.error('Введите описание персонажа');
            return;
        }

        setIsGenerating(true);
        try {
            // Формируем полный промпт
            let fullPrompt = prompt;
            if (selectedRace) fullPrompt = `${selectedRace} ${fullPrompt}`;
            if (selectedClass) fullPrompt = `${selectedClass} ${fullPrompt}`;
            fullPrompt += `, ${selectedStyle} style, high quality, detailed`;

            // Используем правильный эндпоинт для автономной генерации портретов
            // Поскольку это генератор портретов не для конкретного персонажа,
            // нам нужен общий эндпоинт генерации изображений
            const response = await apiService.post('/images/generate', {
                prompt: fullPrompt,
                style: selectedStyle,
                width: 512,
                height: 512,
                steps: 30,
                cfg_scale: 7.5,
            });

            const newImage: GeneratedImage = {
                url: response.image_url,
                prompt: fullPrompt,
                timestamp: new Date().toISOString(),
            };

            setGeneratedImages(prev => [newImage, ...prev]);
            toast.success('Портрет успешно сгенерирован!');
        } catch (error: any) {
            console.error('Error generating image:', error);

            // Если эндпоинт не существует, показываем соответствующее сообщение
            if (error.response?.status === 404) {
                toast.error('Сервис генерации изображений недоступен. Проверьте настройки Stable Diffusion.');
            } else {
                toast.error(error.response?.data?.detail || 'Ошибка при генерации изображения');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadImage = async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `portrait-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Изображение скачано!');
        } catch (error) {
            toast.error('Ошибка при скачивании изображения');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-fantasy font-bold text-gray-900 dark:text-white">
                    Генератор портретов
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Создайте уникальные портреты ваших персонажей с помощью ИИ
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Settings Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                                Настройки
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Style Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Стиль
                                </label>
                                <select
                                    value={selectedStyle}
                                    onChange={(e) => setSelectedStyle(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    {styles.map((style) => (
                                        <option key={style.id} value={style.id}>
                                            {style.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Race Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Раса (опционально)
                                </label>
                                <select
                                    value={selectedRace}
                                    onChange={(e) => setSelectedRace(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Выберите расу</option>
                                    {races.map((race) => (
                                        <option key={race} value={race}>
                                            {race}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Class Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Класс (опционально)
                                </label>
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Выберите класс</option>
                                    {classes.map((characterClass) => (
                                        <option key={characterClass} value={characterClass}>
                                            {characterClass}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preset Prompts */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Готовые шаблоны</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {presetPrompts.map((preset, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setPrompt(preset)}
                                        className="w-full text-left p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Generation Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <SparklesIcon className="h-5 w-5 mr-2" />
                                Создание портрета
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Описание персонажа
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Опишите внешность вашего персонажа: цвет волос, глаз, одежда, аксессуары..."
                                />
                            </div>

                            <Button
                                variant="fantasy"
                                onClick={generateImage}
                                loading={isGenerating}
                                disabled={!prompt.trim()}
                                className="w-full"
                            >
                                {isGenerating ? (
                                    <>
                                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                                        Генерация...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="h-5 w-5 mr-2" />
                                        Сгенерировать портрет
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Generated Images */}
                    {generatedImages.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <PhotoIcon className="h-5 w-5 mr-2" />
                                    Сгенерированные портреты
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {generatedImages.map((image, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.3 }}
                                            className="relative group"
                                        >
                                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                <img
                                                    src={image.url}
                                                    alt={`Generated portrait ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => downloadImage(image.url)}
                                                        className="bg-white text-black hover:bg-gray-100"
                                                    >
                                                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                                                        Скачать
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {image.prompt}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    {new Date(image.timestamp).toLocaleString('ru-RU')}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Empty State */}
                    {generatedImages.length === 0 && (
                        <Card>
                            <CardContent className="py-16 text-center">
                                <PhotoIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    Портреты не сгенерированы
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    Опишите внешность персонажа и нажмите "Сгенерировать портрет"
                                </p>
                                <div className="max-w-md mx-auto text-left">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                        Советы для лучших результатов:
                                    </h4>
                                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                        <li>• Опишите основные черты лица и цвет волос</li>
                                        <li>• Укажите особенности расы (острые уши, рога, чешуя)</li>
                                        <li>• Добавьте детали одежды и аксессуаров</li>
                                        <li>• Используйте эмоциональные описания (мудрый, суровый, хитрый)</li>
                                        <li>• Избегайте слишком сложных или противоречивых описаний</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Tips Card */}
            <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
                <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                        <SparklesIcon className="h-6 w-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                                Как создать лучший портрет
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div>
                                    <h4 className="font-medium mb-1">Внешность:</h4>
                                    <p>Цвет волос, глаз, кожи. Особенности лица, шрамы, татуировки</p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-1">Одежда:</h4>
                                    <p>Доспехи, мантии, аксессуары. Цвета и материалы</p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-1">Эмоции:</h4>
                                    <p>Выражение лица, поза, настроение персонажа</p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-1">Освещение:</h4>
                                    <p>Мягкий свет, драматичные тени, магическое свечение</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PortraitGeneratorPage;