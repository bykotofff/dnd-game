import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    CubeIcon,
    PlusIcon,
    MinusIcon,
    SparklesIcon,
    StarIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useGameData, useGameActions } from '@/store/gameStore';
import { toast } from 'react-hot-toast';

// Стандартные кости D&D
const STANDARD_DICE = [
    { sides: 4, icon: '🔸', color: 'text-blue-400' },
    { sides: 6, icon: '⚀', color: 'text-green-400' },
    { sides: 8, icon: '🔹', color: 'text-yellow-400' },
    { sides: 10, icon: '🔟', color: 'text-orange-400' },
    { sides: 12, icon: '🔮', color: 'text-purple-400' },
    { sides: 20, icon: '🎲', color: 'text-red-400' },
    { sides: 100, icon: '💯', color: 'text-pink-400' },
];

// Быстрые броски для D&D
const QUICK_ROLLS = [
    { label: 'Инициатива', notation: '1d20', purpose: 'Инициатива' },
    { label: 'Атака', notation: '1d20', purpose: 'Бросок атаки' },
    { label: 'Урон мечом', notation: '1d8', purpose: 'Урон мечом' },
    { label: 'Лечение', notation: '1d4+1', purpose: 'Зелье лечения' },
    { label: 'Фаербол', notation: '8d6', purpose: 'Урон фаерболом' },
    { label: 'Спас-бросок', notation: '1d20', purpose: 'Спасательный бросок' },
];

// Проверки характеристик
const ABILITY_CHECKS = [
    { label: 'Сила', ability: 'strength' },
    { label: 'Ловкость', ability: 'dexterity' },
    { label: 'Телосложение', ability: 'constitution' },
    { label: 'Интеллект', ability: 'intelligence' },
    { label: 'Мудрость', ability: 'wisdom' },
    { label: 'Харизма', ability: 'charisma' },
];

const DicePanel: React.FC = () => {
    const { lastDiceRoll, isConnected } = useGameData();
    const { rollDice } = useGameActions();

    const [customNotation, setCustomNotation] = useState('');
    const [customPurpose, setCustomPurpose] = useState('');
    const [diceCount, setDiceCount] = useState(1);
    const [selectedDie, setSelectedDie] = useState(20);
    const [modifier, setModifier] = useState(0);
    const [advantage, setAdvantage] = useState<'none' | 'advantage' | 'disadvantage'>('none');

    // Простой бросок
    const handleSimpleRoll = async (notation: string, purpose?: string) => {
        if (!isConnected) {
            toast.error('Не подключены к игре');
            return;
        }

        try {
            await rollDice(notation, purpose);
        } catch (error) {
            console.error('Failed to roll dice:', error);
        }
    };

    // Построение нотации из компонентов
    const buildNotation = () => {
        let notation = `${diceCount}d${selectedDie}`;

        if (modifier !== 0) {
            notation += modifier > 0 ? `+${modifier}` : `${modifier}`;
        }

        if (advantage === 'advantage') {
            notation += ' advantage';
        } else if (advantage === 'disadvantage') {
            notation += ' disadvantage';
        }

        return notation;
    };

    // Конструктор бросков
    const handleConstructedRoll = async () => {
        const notation = buildNotation();
        const purpose = customPurpose || `${diceCount}d${selectedDie}`;
        await handleSimpleRoll(notation, purpose);
    };

    // Кастомный бросок
    const handleCustomRoll = async () => {
        if (!customNotation.trim()) {
            toast.error('Введите нотацию кости');
            return;
        }

        await handleSimpleRoll(customNotation, customPurpose || 'Кастомный бросок');
    };

    return (
        <div className="p-4 space-y-6">
            {/* Последний результат */}
            {lastDiceRoll && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <Card className="bg-gradient-to-br from-green-900/30 to-green-800/30 border-green-700/50">
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold text-green-100 mb-2">
                                {lastDiceRoll.total}
                            </div>
                            <div className="text-sm text-green-300">
                                {lastDiceRoll.notation}
                            </div>
                            {lastDiceRoll.individual_rolls.length > 1 && (
                                <div className="text-xs text-green-400 mt-1">
                                    [{lastDiceRoll.individual_rolls.join(', ')}]
                                </div>
                            )}
                            {lastDiceRoll.is_critical && (
                                <div className="text-yellow-400 text-sm mt-2">
                                    ⭐ Критический успех!
                                </div>
                            )}
                            {lastDiceRoll.is_fumble && (
                                <div className="text-red-400 text-sm mt-2">
                                    💥 Критическая неудача!
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Стандартные кости */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <CubeIcon className="w-5 h-5" />
                    Стандартные кости
                </h3>
                <div className="grid grid-cols-4 gap-2">
                    {STANDARD_DICE.map((die) => (
                        <Button
                            key={die.sides}
                            onClick={() => handleSimpleRoll(`1d${die.sides}`, `d${die.sides}`)}
                            disabled={!isConnected}
                            variant="outline"
                            className="h-16 flex flex-col items-center justify-center text-xs hover:bg-gray-700"
                        >
                            <span className={`text-lg ${die.color}`}>{die.icon}</span>
                            <span className="text-gray-300">d{die.sides}</span>
                        </Button>
                    ))}
                </div>
            </div>

            {/* Конструктор бросков */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5" />
                    Конструктор
                </h3>

                <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4 space-y-4">
                        {/* Количество костей */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">Количество костей</label>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
                                    size="sm"
                                    variant="outline"
                                    disabled={diceCount <= 1}
                                >
                                    <MinusIcon className="w-4 h-4" />
                                </Button>
                                <span className="w-12 text-center text-white font-medium">{diceCount}</span>
                                <Button
                                    onClick={() => setDiceCount(Math.min(10, diceCount + 1))}
                                    size="sm"
                                    variant="outline"
                                    disabled={diceCount >= 10}
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Тип кости */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">Тип кости</label>
                            <div className="grid grid-cols-4 gap-1">
                                {STANDARD_DICE.map((die) => (
                                    <Button
                                        key={die.sides}
                                        onClick={() => setSelectedDie(die.sides)}
                                        variant={selectedDie === die.sides ? 'primary' : 'outline'}
                                        size="sm"
                                        className="text-xs"
                                    >
                                        d{die.sides}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Модификатор */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">Модификатор</label>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => setModifier(modifier - 1)}
                                    size="sm"
                                    variant="outline"
                                >
                                    <MinusIcon className="w-4 h-4" />
                                </Button>
                                <span className="w-12 text-center text-white font-medium">
                                    {modifier >= 0 ? `+${modifier}` : modifier}
                                </span>
                                <Button
                                    onClick={() => setModifier(modifier + 1)}
                                    size="sm"
                                    variant="outline"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Преимущество/Помеха */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">Преимущество</label>
                            <div className="grid grid-cols-3 gap-1">
                                <Button
                                    onClick={() => setAdvantage('none')}
                                    variant={advantage === 'none' ? 'primary' : 'outline'}
                                    size="sm"
                                    className="text-xs"
                                >
                                    Обычно
                                </Button>
                                <Button
                                    onClick={() => setAdvantage('advantage')}
                                    variant={advantage === 'advantage' ? 'primary' : 'outline'}
                                    size="sm"
                                    className="text-xs text-green-400"
                                >
                                    Преимущество
                                </Button>
                                <Button
                                    onClick={() => setAdvantage('disadvantage')}
                                    variant={advantage === 'disadvantage' ? 'primary' : 'outline'}
                                    size="sm"
                                    className="text-xs text-red-400"
                                >
                                    Помеха
                                </Button>
                            </div>
                        </div>

                        {/* Назначение броска */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">Назначение (опционально)</label>
                            <Input
                                value={customPurpose}
                                onChange={(e) => setCustomPurpose(e.target.value)}
                                placeholder="Например: Атака мечом"
                                className="bg-gray-700 border-gray-600 text-white"
                            />
                        </div>

                        {/* Предпросмотр и кнопка броска */}
                        <div className="text-center">
                            <div className="text-lg font-mono text-amber-400 mb-3">
                                {buildNotation()}
                            </div>
                            <Button
                                onClick={handleConstructedRoll}
                                disabled={!isConnected}
                                variant="primary"
                                className="w-full"
                            >
                                <CubeIcon className="w-4 h-4 mr-2" />
                                Бросить кости
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Быстрые броски */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <StarIcon className="w-5 h-5" />
                    Быстрые броски
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {QUICK_ROLLS.map((roll) => (
                        <Button
                            key={roll.label}
                            onClick={() => handleSimpleRoll(roll.notation, roll.purpose)}
                            disabled={!isConnected}
                            variant="outline"
                            size="sm"
                            className="text-xs hover:bg-gray-700"
                        >
                            {roll.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Проверки характеристик */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-3">Проверки характеристик</h3>
                <div className="grid grid-cols-2 gap-2">
                    {ABILITY_CHECKS.map((check) => (
                        <Button
                            key={check.ability}
                            onClick={() => handleSimpleRoll('1d20', `Проверка ${check.label.toLowerCase()}`)}
                            disabled={!isConnected}
                            variant="outline"
                            size="sm"
                            className="text-xs hover:bg-gray-700"
                        >
                            {check.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Кастомный бросок */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-3">Кастомный бросок</h3>
                <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4 space-y-3">
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">Нотация</label>
                            <Input
                                value={customNotation}
                                onChange={(e) => setCustomNotation(e.target.value)}
                                placeholder="Например: 3d6+2, 1d20 advantage"
                                className="bg-gray-700 border-gray-600 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">Назначение</label>
                            <Input
                                value={customPurpose}
                                onChange={(e) => setCustomPurpose(e.target.value)}
                                placeholder="Назначение броска"
                                className="bg-gray-700 border-gray-600 text-white"
                            />
                        </div>
                        <Button
                            onClick={handleCustomRoll}
                            disabled={!isConnected || !customNotation.trim()}
                            variant="primary"
                            className="w-full"
                        >
                            <CubeIcon className="w-4 h-4 mr-2" />
                            Бросить
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Справка по нотации */}
            <div className="text-xs text-gray-400 space-y-1">
                <div className="font-medium text-gray-300">Примеры нотации:</div>
                <div>• 1d20 - один d20</div>
                <div>• 2d6+3 - два d6 плюс 3</div>
                <div>• 1d20 advantage - с преимуществом</div>
                <div>• 1d20 disadvantage - с помехой</div>
                <div>• 8d6 - восемь d6 (урон фаербола)</div>
            </div>

            {/* Статус подключения */}
            {!isConnected && (
                <div className="text-center p-4 bg-red-900/30 border border-red-700/50 rounded-lg">
                    <div className="text-red-400 text-sm">
                        ⚠️ Не подключены к игре
                    </div>
                    <div className="text-red-300 text-xs mt-1">
                        Броски костей недоступны
                    </div>
                </div>
            )}
        </div>
    );
};

export default DicePanel;