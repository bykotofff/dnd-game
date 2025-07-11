// Замените содержимое файла new-working-frontend/src/components/game/DiceRoller.tsx

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDownIcon,
    ChevronUpIcon,
    PlusIcon,
    MinusIcon,
    XMarkIcon,
    ArrowPathIcon,
    SparklesIcon,
    ExclamationTriangleIcon,
    CheckIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useGameStore } from '@/store/gameStore';

interface DiceRollerProps {
    className?: string;
}

interface DiceType {
    sides: number;
    name: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

interface RollResult {
    id: string;
    notation: string;
    result: number;
    individual: number[];
    purpose?: string;
    advantage?: boolean;
    disadvantage?: boolean;
    modifier: number;
    timestamp: string;
    isCritical: boolean;
}

const DICE_TYPES: DiceType[] = [
    { sides: 4, name: 'd4', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
    { sides: 6, name: 'd6', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
    { sides: 8, name: 'd8', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
    { sides: 10, name: 'd10', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
    { sides: 12, name: 'd12', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
    { sides: 20, name: 'd20', color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-300' },
    { sides: 100, name: 'd100', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-300' },
];

const DiceRoller: React.FC<DiceRollerProps> = ({ className = '' }) => {
    // ✅ НОВОЕ: Используем обновленный gameStore
    const {
        showDiceRoller,
        toggleDiceRoller,
        selectedCharacterId,
        rollDice,
        sendMessage,
        messages
    } = useGameStore();

    const [selectedDice, setSelectedDice] = useState<Record<number, number>>({});
    const [modifier, setModifier] = useState<number>(0);
    const [purpose, setPurpose] = useState<string>('');
    const [advantage, setAdvantage] = useState<boolean>(false);
    const [disadvantage, setDisadvantage] = useState<boolean>(false);
    const [isRolling, setIsRolling] = useState<boolean>(false);
    const [rollHistory, setRollHistory] = useState<RollResult[]>([]);
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [notation, setNotation] = useState<string>('1d20');

    // ✅ НОВОЕ: Поиск ожидающего запроса на проверку
    const pendingRollRequest = messages
        ?.filter(msg => msg.metadata?.requires_dice_roll)
        ?.pop();

    // ✅ НОВОЕ: Автоматическая настройка для проверок навыков
    useEffect(() => {
        if (pendingRollRequest?.metadata?.auto_modifier) {
            const meta = pendingRollRequest.metadata;

            // Для проверок навыков настраиваем автоматически
            setNotation(meta.dice_notation || '1d20');
            setPurpose(`Проверка ${meta.skill_display}`);
            setSelectedDice({ 20: 1 }); // Всегда d20 для проверок
            setModifier(0); // Модификатор будет добавлен автоматически
            setAdvantage(meta.advantage || false);
            setDisadvantage(meta.disadvantage || false);
        }
    }, [pendingRollRequest]);

    const addDie = (sides: number) => {
        if (pendingRollRequest?.metadata?.auto_modifier) {
            // Для проверок навыков не даем менять кости
            return;
        }

        setSelectedDice(prev => ({
            ...prev,
            [sides]: (prev[sides] || 0) + 1
        }));
    };

    const removeDie = (sides: number) => {
        if (pendingRollRequest?.metadata?.auto_modifier) {
            return;
        }

        setSelectedDice(prev => {
            const newValue = (prev[sides] || 0) - 1;
            if (newValue <= 0) {
                const { [sides]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [sides]: newValue };
        });
    };

    const buildNotation = (): string => {
        if (pendingRollRequest?.metadata?.auto_modifier) {
            // Для проверок навыков используем только d20
            return '1d20';
        }

        const diceNotations = Object.entries(selectedDice)
            .filter(([_, count]) => count > 0)
            .map(([sides, count]) => `${count}d${sides}`)
            .join(' + ');

        if (!diceNotations) return '';

        let result = diceNotations;
        if (modifier > 0) {
            result += ` + ${modifier}`;
        } else if (modifier < 0) {
            result += ` ${modifier}`;
        }

        return result;
    };

    const handleRoll = async () => {
        const currentNotation = buildNotation() || notation;
        if (!currentNotation) return;

        setIsRolling(true);

        try {
            // ✅ НОВОЕ: Используем rollDice из gameStore
            await rollDice(currentNotation, purpose, advantage, disadvantage);

            // Сбрасываем только если это была проверка навыка
            if (pendingRollRequest?.metadata?.auto_modifier) {
                // После успешного броска очищаем форму
                setSelectedDice({});
                setNotation('1d20');
                setPurpose('');
                setAdvantage(false);
                setDisadvantage(false);
                setModifier(0);
            }

        } catch (error) {
            console.error('Error rolling dice:', error);
        } finally {
            setIsRolling(false);
        }
    };

    const handleQuickRoll = async (diceType: DiceType) => {
        if (pendingRollRequest?.metadata?.auto_modifier) {
            // Для проверок навыков используем только специальную кнопку
            return;
        }

        setIsRolling(true);
        try {
            await rollDice(`1d${diceType.sides}`, `Quick ${diceType.name} roll`);
        } catch (error) {
            console.error('Error with quick roll:', error);
        } finally {
            setIsRolling(false);
        }
    };

    const loadPreset = (preset: string) => {
        if (pendingRollRequest?.metadata?.auto_modifier) {
            return; // Не позволяем менять пресеты во время проверки навыков
        }

        switch (preset) {
            case 'attack':
                setSelectedDice({ 20: 1 });
                setPurpose('Attack Roll');
                break;
            case 'damage':
                setSelectedDice({ 8: 1 });
                setModifier(3);
                setPurpose('Damage');
                break;
            case 'save':
                setSelectedDice({ 20: 1 });
                setPurpose('Saving Throw');
                break;
            case 'ability':
                setSelectedDice({ 20: 1 });
                setPurpose('Ability Check');
                break;
            case 'initiative':
                setSelectedDice({ 20: 1 });
                setPurpose('Initiative');
                break;
            default:
                break;
        }
    };

    if (!showDiceRoller) {
        return null;
    }

    const currentNotation = buildNotation() || notation;
    const isSkillCheck = pendingRollRequest?.metadata?.auto_modifier;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 ${className}`}
        >
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">🎲</span>
                        {isSkillCheck ? 'Проверка навыка' : 'Dice Roller'}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleDiceRoller}
                        className="h-8 w-8 p-0"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* ✅ НОВОЕ: Информация о проверке навыка */}
                    {isSkillCheck && (
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                                <SparklesIcon className="h-4 w-4" />
                                Требуется проверка: {pendingRollRequest.metadata.skill_display}
                            </h4>

                            {/* ✅ НОВОЕ: Показываем четкую инструкцию по броску */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded border mb-3">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    📋 Инструкция: Бросьте <span className="font-bold text-blue-600">{pendingRollRequest.metadata.dice_instruction}</span>
                                </p>
                            </div>

                            <p className="text-sm text-blue-600 dark:text-blue-300 mb-2">
                                Модификатор +{pendingRollRequest.metadata.modifier} будет добавлен автоматически
                            </p>

                            {pendingRollRequest.metadata.advantage && (
                                <p className="text-sm text-green-600 font-medium">✨ Преимущество: Бросьте 2d20 и возьмите лучший</p>
                            )}
                            {pendingRollRequest.metadata.disadvantage && (
                                <p className="text-sm text-red-600 font-medium">⚠️ Помеха: Бросьте 2d20 и возьмите худший</p>
                            )}
                        </div>
                    )}

                    {/* Quick Dice Buttons */}
                    {!isSkillCheck && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Quick Roll
                            </h3>
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                {DICE_TYPES.map((dice) => (
                                    <motion.button
                                        key={dice.sides}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleQuickRoll(dice)}
                                        className={`p-3 rounded-lg border-2 ${dice.bgColor} ${dice.borderColor} ${dice.color} font-bold text-center hover:shadow-md transition-all`}
                                        disabled={isRolling}
                                    >
                                        {dice.name}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dice Builder */}
                    {!isSkillCheck && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Build Roll
                            </h3>
                            <div className="space-y-3">
                                {/* Selected Dice */}
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                    {DICE_TYPES.map((dice) => {
                                        const count = selectedDice[dice.sides] || 0;
                                        return (
                                            <div key={dice.sides} className="space-y-1">
                                                <div className={`p-2 rounded border ${dice.bgColor} ${dice.borderColor} text-center`}>
                                                    <div className={`text-sm font-bold ${dice.color}`}>
                                                        {dice.name}
                                                    </div>
                                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                        {count}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => removeDie(dice.sides)}
                                                        disabled={count === 0}
                                                        className="flex-1 h-6 p-0"
                                                    >
                                                        <MinusIcon className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addDie(dice.sides)}
                                                        className="flex-1 h-6 p-0"
                                                    >
                                                        <PlusIcon className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Modifier */}
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0">
                                        Modifier:
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setModifier(modifier - 1)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <MinusIcon className="h-4 w-4" />
                                        </Button>
                                        <Input
                                            type="number"
                                            value={modifier}
                                            onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                                            className="w-20 text-center h-8"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setModifier(modifier + 1)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Purpose */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Purpose (optional)
                        </label>
                        <Input
                            type="text"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder={isSkillCheck ? `Проверка ${pendingRollRequest?.metadata?.skill_display}` : "Attack, damage, saving throw..."}
                            disabled={isSkillCheck}
                            className="w-full"
                        />
                    </div>

                    {/* Advantage/Disadvantage */}
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={advantage}
                                onChange={(e) => setAdvantage(e.target.checked)}
                                disabled={isSkillCheck || disadvantage}
                                className="rounded"
                            />
                            <span className="text-sm text-green-600 font-medium">
                                ✨ Advantage
                            </span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={disadvantage}
                                onChange={(e) => setDisadvantage(e.target.checked)}
                                disabled={isSkillCheck || advantage}
                                className="rounded"
                            />
                            <span className="text-sm text-red-600 font-medium">
                                ⚠️ Disadvantage
                            </span>
                        </label>
                    </div>

                    {/* Current Roll Preview */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Current Roll:
                        </div>
                        <div className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                            {currentNotation || 'Select dice...'}
                            {isSkillCheck && (
                                <span className="text-sm text-blue-600 ml-2">
                                    (+ modifier will be added automatically)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Presets */}
                    {!isSkillCheck && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Presets
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { key: 'attack', label: 'Attack', icon: '⚔️' },
                                    { key: 'damage', label: 'Damage', icon: '💥' },
                                    { key: 'save', label: 'Save', icon: '🛡️' },
                                    { key: 'ability', label: 'Ability', icon: '💪' },
                                    { key: 'initiative', label: 'Initiative', icon: '⚡' },
                                ].map(preset => (
                                    <Button
                                        key={preset.key}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => loadPreset(preset.key)}
                                        className="text-xs"
                                    >
                                        {preset.icon} {preset.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Roll Button */}
                    <Button
                        onClick={handleRoll}
                        disabled={!currentNotation || isRolling}
                        className="w-full py-3 text-lg font-bold"
                        size="lg"
                    >
                        {isRolling ? (
                            <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                            <span className="text-2xl mr-2">🎲</span>
                        )}
                        {isSkillCheck ? `Roll ${pendingRollRequest?.metadata?.skill_display}` : 'Roll Dice'}
                    </Button>

                    {/* Skill Check Info */}
                    {isSkillCheck && (
                        <div className="text-center bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                <strong>Модификатор {pendingRollRequest?.metadata?.skill_display}:</strong> +{pendingRollRequest?.metadata?.modifier}
                            </p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                Будет добавлен автоматически к результату броска
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default DiceRoller;