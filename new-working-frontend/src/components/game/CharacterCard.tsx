import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    HeartIcon,
    ShieldIcon,
    BoltIcon,
    StarIcon,
    EyeIcon,
    PlusIcon,
    MinusIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    SparklesIcon,
    FireIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Character } from '@/types';

interface CharacterCardProps {
    character: Character;
    isSelected?: boolean;
    isCurrentTurn?: boolean;
    onSelect?: (character: Character) => void;
    onUpdateHP?: (characterId: string, newHP: number, tempHP?: number) => void;
    onAddEffect?: (characterId: string, effect: any) => void;
    className?: string;
}

const CharacterCard: React.FC<CharacterCardProps> = ({
                                                         character,
                                                         isSelected = false,
                                                         isCurrentTurn = false,
                                                         onSelect,
                                                         onUpdateHP,
                                                         onAddEffect,
                                                         className = ''
                                                     }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hpInput, setHpInput] = useState('');
    const [tempHpInput, setTempHpInput] = useState('');
    const [showHPControls, setShowHPControls] = useState(false);

    const getHealthPercentage = () => {
        return (character.hit_points.current / character.hit_points.max) * 100;
    };

    const getHealthColor = (percentage: number) => {
        if (percentage <= 0) return 'text-gray-500';
        if (percentage <= 25) return 'text-red-500';
        if (percentage <= 50) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getHealthBgColor = (percentage: number) => {
        if (percentage <= 0) return 'bg-gray-500';
        if (percentage <= 25) return 'bg-red-500';
        if (percentage <= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getModifier = (score: number) => {
        return Math.floor((score - 10) / 2);
    };

    const formatModifier = (modifier: number) => {
        return modifier >= 0 ? `+${modifier}` : `${modifier}`;
    };

    const handleHPChange = (delta: number) => {
        const newHP = Math.max(0, Math.min(character.hit_points.max, character.hit_points.current + delta));
        onUpdateHP?.(character.id, newHP);
    };

    const handleTempHPChange = (newTempHP: number) => {
        onUpdateHP?.(character.id, character.hit_points.current, Math.max(0, newTempHP));
    };

    const applyHPInput = () => {
        if (hpInput) {
            const value = parseInt(hpInput);
            if (!isNaN(value)) {
                const newHP = Math.max(0, Math.min(character.hit_points.max, value));
                onUpdateHP?.(character.id, newHP);
                setHpInput('');
            }
        }
        if (tempHpInput) {
            const value = parseInt(tempHpInput);
            if (!isNaN(value)) {
                handleTempHPChange(value);
                setTempHpInput('');
            }
        }
        setShowHPControls(false);
    };

    const healthPercentage = getHealthPercentage();
    const isUnconscious = character.hit_points.current <= 0;
    const isDying = isUnconscious && character.hit_points.current < 0;

    return (
        <Card
            className={`transition-all duration-200 ${className} ${
                isSelected
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:shadow-md'
            } ${
                isCurrentTurn
                    ? 'ring-2 ring-yellow-400 ring-opacity-75'
                    : ''
            } ${
                isUnconscious
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : ''
            }`}
        >
            <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => onSelect?.(character)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-fantasy">
                            {character.name}
                        </CardTitle>
                        {isCurrentTurn && (
                            <StarIcon className="h-4 w-4 text-yellow-500" />
                        )}
                        {isUnconscious && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="h-8 w-8 p-0"
                    >
                        <EyeIcon className="h-4 w-4" />
                    </Button>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {character.race} {character.character_class} {character.level}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Основные характеристики */}
                <div className="grid grid-cols-3 gap-4">
                    {/* HP */}
                    <motion.div
                        className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                        whileHover={{ scale: 1.05 }}
                    >
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <HeartIcon className={`h-4 w-4 ${getHealthColor(healthPercentage)}`} />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">HP</span>
                        </div>
                        <div
                            className={`text-lg font-bold ${getHealthColor(healthPercentage)} cursor-pointer`}
                            onClick={() => setShowHPControls(!showHPControls)}
                        >
                            {character.hit_points.current}/{character.hit_points.max}
                        </div>
                        {character.hit_points.temporary > 0 && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                                +{character.hit_points.temporary} temp
                            </div>
                        )}
                        {/* HP Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                            <div
                                className={`h-1 rounded-full transition-all duration-300 ${
                                    getHealthBgColor(healthPercentage)
                                }`}
                                style={{ width: `${Math.max(0, healthPercentage)}%` }}
                            />
                        </div>
                        {isUnconscious && (
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                                {isDying ? 'Умирает' : 'Без сознания'}
                            </div>
                        )}
                    </motion.div>

                    {/* AC */}
                    <motion.div
                        className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                        whileHover={{ scale: 1.05 }}
                    >
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <ShieldIcon className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">AC</span>
                        </div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {character.armor_class}
                        </div>
                    </motion.div>

                    {/* Level */}
                    <motion.div
                        className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
                        whileHover={{ scale: 1.05 }}
                    >
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <BoltIcon className="h-4 w-4 text-purple-500" />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Lv</span>
                        </div>
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {character.level}
                        </div>
                    </motion.div>
                </div>

                {/* HP Controls */}
                {showHPControls && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3"
                    >
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleHPChange(-5)}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                                -5
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleHPChange(-1)}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                                -1
                            </Button>
                            <Input
                                type="number"
                                placeholder="HP"
                                value={hpInput}
                                onChange={(e) => setHpInput(e.target.value)}
                                className="w-16 text-center text-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleHPChange(1)}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                                +1
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleHPChange(5)}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                                +5
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Temp HP"
                                value={tempHpInput}
                                onChange={(e) => setTempHpInput(e.target.value)}
                                className="flex-1 text-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={applyHPInput}
                            >
                                Применить
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3"
                    >
                        {/* Ability Scores */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Характеристики
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(character.abilities).map(([ability, score]) => (
                                    <div key={ability} className="text-center p-1 bg-gray-50 dark:bg-gray-800 rounded">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                                            {ability.slice(0, 3)}
                                        </div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                                            {score}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            {formatModifier(getModifier(score))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Active Effects */}
                        {character.active_effects && character.active_effects.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Активные эффекты
                                </h4>
                                <div className="space-y-1">
                                    {character.active_effects.map((effect, index) => (
                                        <div
                                            key={index}
                                            className={`p-2 rounded text-xs flex items-center gap-2 ${
                                                effect.beneficial
                                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                                            }`}
                                        >
                                            {effect.beneficial ? (
                                                <SparklesIcon className="h-3 w-3" />
                                            ) : (
                                                <FireIcon className="h-3 w-3" />
                                            )}
                                            <div className="flex-1">
                                                <div className="font-medium">{effect.name}</div>
                                                {effect.duration > 0 && (
                                                    <div className="text-xs opacity-75">
                                                        {effect.duration} раунд(ов)
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Быстрые действия
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        // Логика восстановления HP
                                        onUpdateHP?.(character.id, character.hit_points.max);
                                    }}
                                >
                                    <ArrowPathIcon className="h-3 w-3 mr-1" />
                                    Heal Max
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        // Логика добавления эффекта
                                        onAddEffect?.(character.id, { name: 'Custom Effect' });
                                    }}
                                >
                                    <PlusIcon className="h-3 w-3 mr-1" />
                                    Эффект
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
};

export default CharacterCard;