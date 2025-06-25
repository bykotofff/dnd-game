import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SparklesIcon,
    PhotoIcon,
    ArrowPathIcon,
    CheckIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { characterService } from '@/services/characterService';
import type { Character } from '@/types';

interface PortraitGeneratorProps {
    character: Character;
    onPortraitGenerated?: (portraitUrl: string) => void;
}

const PortraitGenerator: React.FC<PortraitGeneratorProps> = ({
                                                                 character,
                                                                 onPortraitGenerated,
                                                             }) => {
    const [customPrompt, setCustomPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateMutation = useMutation(
        (prompt?: string) => characterService.generatePortrait(character.id, prompt),
        {
            onSuccess: (data) => {
                setGeneratedImage(data.portrait_url);
                toast.success('Портрет сгенерирован!');
                if (onPortraitGenerated) {
                    onPortraitGenerated(data.portrait_url);
                }
            },
            onError: () => {
                toast.error('Ошибка при генерации портрета');
            },
        }
    );

    const generatePortrait = async () => {
        setIsGenerating(true);
        try {
            await generateMutation.mutateAsync(customPrompt || undefined);
        } finally {
            setIsGenerating(false);
        }
    };

    const getAutoPrompt = () => {
        const parts = [];

        if (character.race) parts.push(character.race.toLowerCase());
        if (character.character_class) parts.push(character.character_class.toLowerCase());
        if (character.appearance) parts.push(character.appearance);

        return parts.join(', ') + ', fantasy character portrait, detailed';
    };

    const presetPrompts = [
        'heroic and noble bearing',
        'mysterious and shadowy',
        'wise and ancient',
        'young and energetic',
        'battle-scarred warrior',
        'elegant and refined',
        'wild and untamed',
        'scholarly and intellectual',
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <SparklesIcon className="w-5 h-5" />
                    <span>Генератор портретов ИИ</span>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Current Portrait */}
                <div className="text-center">
                    <div className="relative inline-block">
                        {character.portrait_url || generatedImage ? (
                            <img
                                src={generatedImage || character.portrait_url}
                                alt={character.name}
                                className="w-32 h-32 rounded-lg object-cover border-2 border-primary-200 dark:border-primary-700"
                            />
                        ) : (
                            <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-900 rounded-lg flex items-center justify-center border-2 border-primary-200 dark:border-primary-700">
                                <PhotoIcon className="w-16 h-16 text-primary-400 dark:text-primary-500" />
                            </div>
                        )}

                        {isGenerating && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                <ArrowPathIcon className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>

                    {!character.portrait_url && !generatedImage && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Портрет не установлен
                        </p>
                    )}
                </div>

                {/* Auto-generated prompt preview */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Автоматический промпт:
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        {getAutoPrompt()}
                    </p>
                </div>

                {/* Custom prompt input */}
                <div>
                    <Input
                        label="Дополнительное описание (необязательно)"
                        placeholder="Добавьте детали внешности, настроения, стиля..."
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        helperText="Опишите особенности, которые хотите видеть в портрете"
                    />
                </div>

                {/* Preset prompts */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Быстрые стили:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {presetPrompts.map((preset) => (
                            <button
                                key={preset}
                                onClick={() => setCustomPrompt(preset)}
                                className="px-3 py-1 text-xs bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 rounded-full hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors"
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate button */}
                <div className="flex space-x-3">
                    <Button
                        onClick={generatePortrait}
                        loading={isGenerating}
                        disabled={isGenerating}
                        className="flex-1"
                        variant="fantasy"
                    >
                        <SparklesIcon className="w-4 h-4 mr-2" />
                        {isGenerating ? 'Генерируется...' : 'Сгенерировать портрет'}
                    </Button>

                    {customPrompt && (
                        <Button
                            variant="outline"
                            onClick={() => setCustomPrompt('')}
                            disabled={isGenerating}
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                {/* Generated image preview */}
                <AnimatePresence>
                    {generatedImage && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20"
                        >
                            <div className="flex items-center space-x-3">
                                <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Новый портрет сгенерирован!
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400">
                                        Портрет автоматически сохранен с персонажем
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tips */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        💡 Советы для лучших результатов:
                    </h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Описывайте цвет волос, глаз, тон кожи</li>
                        <li>• Указывайте возраст (молодой, средних лет, пожилой)</li>
                        <li>• Добавляйте настроение (серьезный, улыбающийся, грустный)</li>
                        <li>• Упоминайте особенности (шрамы, татуировки, украшения)</li>
                    </ul>
                </div>

                {/* Technical info */}
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    <p>Генерация может занять 30-60 секунд</p>
                    <p>Изображения создаются с помощью Stable Diffusion</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default PortraitGenerator;