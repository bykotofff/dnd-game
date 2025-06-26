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
import { useGameUI, useGameActions, useGameChat } from '@/store/gameStore';

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
    const { showDiceRoller, toggleDiceRoller, selectedCharacterId } = useGameUI();
    const { rollDice } = useGameActions();
    const { sendMessage } = useGameChat();

    // State
    const [selectedDice, setSelectedDice] = useState<{ [key: number]: number }>({});
    const [modifier, setModifier] = useState<number>(0);
    const [purpose, setPurpose] = useState<string>('');
    const [advantage, setAdvantage] = useState<boolean>(false);
    const [disadvantage, setDisadvantage] = useState<boolean>(false);
    const [customNotation, setCustomNotation] = useState<string>('');
    const [rollHistory, setRollHistory] = useState<RollResult[]>([]);
    const [isRolling, setIsRolling] = useState<boolean>(false);
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [lastRoll, setLastRoll] = useState<RollResult | null>(null);

    const rollSoundRef = useRef<HTMLAudioElement | null>(null);

    // Initialize sound (optional)
    useEffect(() => {
        // Create audio element for dice roll sound
        rollSoundRef.current = new Audio();
        rollSoundRef.current.volume = 0.3;

        return () => {
            if (rollSoundRef.current) {
                rollSoundRef.current.pause();
                rollSoundRef.current = null;
            }
        };
    }, []);

    // Helper functions
    const rollSingleDie = (sides: number): number => {
        return Math.floor(Math.random() * sides) + 1;
    };

    const addDie = (sides: number) => {
        setSelectedDice(prev => ({
            ...prev,
            [sides]: (prev[sides] || 0) + 1
        }));
    };

    const removeDie = (sides: number) => {
        setSelectedDice(prev => {
            const newDice = { ...prev };
            if (newDice[sides] > 1) {
                newDice[sides]--;
            } else {
                delete newDice[sides];
            }
            return newDice;
        });
    };

    const clearDice = () => {
        setSelectedDice({});
        setModifier(0);
        setPurpose('');
        setAdvantage(false);
        setDisadvantage(false);
        setCustomNotation('');
    };

    const buildNotation = (): string => {
        if (customNotation.trim()) {
            return customNotation.trim();
        }

        const diceStrings = Object.entries(selectedDice)
            .filter(([_, count]) => count > 0)
            .map(([sides, count]) => count === 1 ? `d${sides}` : `${count}d${sides}`)
            .join(' + ');

        if (!diceStrings) return '';

        let notation = diceStrings;
        if (modifier > 0) notation += ` + ${modifier}`;
        if (modifier < 0) notation += ` - ${Math.abs(modifier)}`;

        return notation;
    };

    const parseNotation = (notation: string): { dice: {[key: number]: number}, mod: number } => {
        const dice: {[key: number]: number} = {};
        let mod = 0;

        // Simple parser for notation like "2d6 + 1d4 + 3"
        const parts = notation.toLowerCase().split(/\s*[+\-]\s*/);
        let isNegative = false;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();

            if (i > 0) {
                // Check if this part was preceded by a minus
                const beforePart = notation.substring(0, notation.indexOf(part));
                isNegative = beforePart.lastIndexOf('-') > beforePart.lastIndexOf('+');
            }

            if (part.includes('d')) {
                const [countStr, sidesStr] = part.split('d');
                const count = parseInt(countStr) || 1;
                const sides = parseInt(sidesStr);

                if (sides && DICE_TYPES.some(d => d.sides === sides)) {
                    dice[sides] = (dice[sides] || 0) + (isNegative ? -count : count);
                }
            } else {
                const num = parseInt(part);
                if (!isNaN(num)) {
                    mod += isNegative ? -num : num;
                }
            }
        }

        return { dice, mod };
    };

    const handleRoll = async () => {
        const notation = buildNotation();
        if (!notation) return;

        setIsRolling(true);

        // Play sound effect
        if (rollSoundRef.current) {
            try {
                rollSoundRef.current.currentTime = 0;
                rollSoundRef.current.play().catch(() => {
                    // Sound failed, continue silently
                });
            } catch (error) {
                // Sound failed, continue silently
            }
        }

        // Parse the notation for rolling
        const { dice, mod } = parseNotation(notation);
        const individual: number[] = [];
        let total = 0;

        // Roll each die type
        for (const [sides, count] of Object.entries(dice)) {
            const sidesNum = parseInt(sides);
            for (let i = 0; i < count; i++) {
                const roll = rollSingleDie(sidesNum);
                individual.push(roll);
                total += roll;
            }
        }

        // Handle advantage/disadvantage for d20 rolls
        if (individual.length === 1 && Object.keys(dice).includes('20')) {
            if (advantage || disadvantage) {
                const secondRoll = rollSingleDie(20);
                individual.push(secondRoll);

                if (advantage) {
                    total = Math.max(individual[0], secondRoll);
                } else {
                    total = Math.min(individual[0], secondRoll);
                }
            }
        }

        // Add modifier
        total += mod;

        // Check for critical (natural 20 on d20)
        const isCritical = individual.some(roll => roll === 20) && Object.keys(dice).includes('20');

        // Create roll result
        const rollResult: RollResult = {
            id: Date.now().toString(),
            notation,
            result: total,
            individual,
            purpose: purpose || undefined,
            advantage,
            disadvantage,
            modifier: mod,
            timestamp: new Date().toISOString(),
            isCritical
        };

        // Simulate rolling animation delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Update state
        setRollHistory(prev => [rollResult, ...prev.slice(0, 19)]); // Keep last 20 rolls
        setLastRoll(rollResult);
        setIsRolling(false);

        // Send to game via WebSocket
        rollDice(notation, purpose || undefined, advantage, disadvantage);

        // Also send chat message about the roll
        const rollMessage = `🎲 ${purpose ? `**${purpose}**: ` : ''}${notation} = **${total}**${isCritical ? ' ⭐ CRITICAL!' : ''}`;
        sendMessage(rollMessage, false);
    };

    const handleQuickRoll = (diceType: DiceType) => {
        const tempDice = { [diceType.sides]: 1 };
        setSelectedDice(tempDice);

        // Auto-roll after brief delay
        setTimeout(() => {
            handleRoll();
        }, 100);
    };

    const loadPreset = (preset: string) => {
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
                        Dice Roller
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
                    {/* Quick Dice Buttons */}
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

                    {/* Dice Builder */}
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
                                        onClick={() => setModifier(prev => prev - 1)}
                                    >
                                        <MinusIcon className="h-3 w-3" />
                                    </Button>
                                    <Input
                                        type="number"
                                        value={modifier}
                                        onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                                        className="w-16 text-center"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setModifier(prev => prev + 1)}
                                    >
                                        <PlusIcon className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            {/* Purpose */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0">
                                    Purpose:
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Attack, Damage, Save..."
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    className="flex-1"
                                />
                            </div>

                            {/* Advantage/Disadvantage */}
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={advantage}
                                        onChange={(e) => {
                                            setAdvantage(e.target.checked);
                                            if (e.target.checked) setDisadvantage(false);
                                        }}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                        Advantage
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={disadvantage}
                                        onChange={(e) => {
                                            setDisadvantage(e.target.checked);
                                            if (e.target.checked) setAdvantage(false);
                                        }}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                                        Disadvantage
                                    </span>
                                </label>
                            </div>

                            {/* Custom Notation */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Custom Notation:
                                </label>
                                <Input
                                    type="text"
                                    placeholder="1d20+5, 2d6+3, etc."
                                    value={customNotation}
                                    onChange={(e) => setCustomNotation(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Presets */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Quick Presets
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'attack', label: 'Attack', icon: '⚔️' },
                                { id: 'damage', label: 'Damage', icon: '💥' },
                                { id: 'save', label: 'Save', icon: '🛡️' },
                                { id: 'ability', label: 'Ability', icon: '💪' },
                                { id: 'initiative', label: 'Initiative', icon: '⚡' },
                            ].map((preset) => (
                                <Button
                                    key={preset.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadPreset(preset.id)}
                                    className="text-xs"
                                >
                                    {preset.icon} {preset.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Current Roll Display */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-center">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Current Roll:
                            </div>
                            <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                                {buildNotation() || 'No dice selected'}
                            </div>
                            {advantage && (
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    with Advantage
                                </div>
                            )}
                            {disadvantage && (
                                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    with Disadvantage
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Last Roll Result */}
                    <AnimatePresence>
                        {lastRoll && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`p-4 rounded-lg border-2 ${lastRoll.isCritical ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-300'}`}
                            >
                                <div className="text-center">
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {lastRoll.purpose && `${lastRoll.purpose}: `}
                                        {lastRoll.notation}
                                    </div>
                                    <div className={`text-3xl font-bold ${lastRoll.isCritical ? 'text-yellow-600' : 'text-blue-600'}`}>
                                        {lastRoll.result}
                                        {lastRoll.isCritical && <span className="ml-2">⭐</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Individual: [{lastRoll.individual.join(', ')}]
                                        {lastRoll.modifier !== 0 && ` + ${lastRoll.modifier}`}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleRoll}
                            disabled={!buildNotation() || isRolling}
                            className="flex-1"
                            variant="fantasy"
                        >
                            {isRolling ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                    className="flex items-center gap-2"
                                >
                                    <ArrowPathIcon className="h-4 w-4" />
                                    Rolling...
                                </motion.div>
                            ) : (
                                <>
                                    <span className="text-lg mr-2">🎲</span>
                                    Roll Dice
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={clearDice}
                            disabled={isRolling}
                        >
                            Clear
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowHistory(!showHistory)}
                        >
                            <ClockIcon className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Roll History */}
                    <AnimatePresence>
                        {showHistory && rollHistory.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2 max-h-40 overflow-y-auto"
                            >
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Roll History
                                </h3>
                                {rollHistory.map((roll) => (
                                    <div
                                        key={roll.id}
                                        className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono">
                                                {roll.notation} = <span className="font-bold">{roll.result}</span>
                                                {roll.isCritical && <span className="text-yellow-500 ml-1">⭐</span>}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(roll.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        {roll.purpose && (
                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                                {roll.purpose}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default DiceRoller;