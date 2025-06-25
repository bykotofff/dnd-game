import React from 'react';
import { motion } from 'framer-motion';
import {
    HeartIcon,
    ShieldCheckIcon,
    BoltIcon,
    SparklesIcon,
    FireIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';

import { Card, CardContent } from '@/components/ui/Card';
import { formatModifier, getAbilityModifier, getProficiencyBonus } from '@/utils';
import type { Character } from '@/types';

interface CharacterStatsProps {
    character: Character;
    onDamage?: (amount: number) => void;
    onHeal?: (amount: number) => void;
}

const CharacterStats: React.FC<CharacterStatsProps> = ({
                                                           character,
                                                           onDamage,
                                                           onHeal,
                                                       }) => {
    const getHPPercentage = () => {
        const current = character.hit_points.current + character.hit_points.temporary;
        const max = character.hit_points.max;
        return Math.min(100, (current / max) * 100);
    };

    const getHPColor = () => {
        const percentage = getHPPercentage();
        if (percentage > 75) return 'from-green-400 to-green-500';
        if (percentage > 50) return 'from-yellow-400 to-yellow-500';
        if (percentage > 25) return 'from-orange-400 to-orange-500';
        return 'from-red-400 to-red-500';
    };

    const getInitiativeBonus = () => {
        return getAbilityModifier(character.abilities.dexterity);
    };

    const getPassivePerception = () => {
        const wisdomMod = getAbilityModifier(character.abilities.wisdom);
        const proficiency = character.skills.perception?.proficient ? character.proficiency_bonus : 0;
        return 10 + wisdomMod + proficiency;
    };

    const getSpellSaveDC = () => {
        // Примерный расчет для основных заклинательных классов
        const spellcastingAbilities: Record<string, keyof typeof character.abilities> = {
            wizard: 'intelligence',
            sorcerer: 'charisma',
            warlock: 'charisma',
            bard: 'charisma',
            cleric: 'wisdom',
            druid: 'wisdom',
            ranger: 'wisdom',
            paladin: 'charisma',
        };

        const ability = spellcastingAbilities[character.character_class.toLowerCase()];
        if (!ability) return null;

        const abilityMod = getAbilityModifier(character.abilities[ability]);
        return 8 + abilityMod + character.proficiency_bonus;
    };

    const stats = [
        {
            name: 'Очки здоровья',
            value: `${character.hit_points.current}/${character.hit_points.max}`,
            icon: HeartIcon,
            color: 'text-red-500',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            extra: character.hit_points.temporary > 0 ? `+${character.hit_points.temporary} врем.` : null,
        },
        {
            name: 'Класс брони',
            value: character.armor_class,
            icon: ShieldCheckIcon,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            name: 'Скорость',
            value: `${character.speed} фт`,
            icon: BoltIcon,
            color: 'text-green-500',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            name: 'Бонус мастерства',
            value: `+${character.proficiency_bonus}`,
            icon: SparklesIcon,
            color: 'text-purple-500',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
            name: 'Инициатива',
            value: formatModifier(getInitiativeBonus()),
            icon: FireIcon,
            color: 'text-orange-500',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        },
        {
            name: 'Пассивное восприятие',
            value: getPassivePerception(),
            icon: EyeIcon,
            color: 'text-indigo-500',
            bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        },
    ];

    const spellSaveDC = getSpellSaveDC();
    if (spellSaveDC) {
        stats.push({
            name: 'СЛ заклинаний',
            value: spellSaveDC,
            icon: SparklesIcon,
            color: 'text-violet-500',
            bgColor: 'bg-violet-50 dark:bg-violet-900/20',
        });
    }

    return (
        <div className="space-y-6">
            {/* HP Bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Очки здоровья
              </span>
                            <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {character.hit_points.current}/{character.hit_points.max}
                </span>
                                {character.hit_points.temporary > 0 && (
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                    +{character.hit_points.temporary}
                  </span>
                                )}
                            </div>
                        </div>

                        {/* HP Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <motion.div
                                className={`h-full bg-gradient-to-r ${getHPColor()} transition-all duration-500`}
                                initial={{ width: 0 }}
                                animate={{ width: `${getHPPercentage()}%` }}
                            />
                        </div>

                        {/* HP Actions */}
                        {(onDamage || onHeal) && (
                            <div className="flex space-x-2">
                                {onDamage && (
                                    <button
                                        onClick={() => {
                                            const damage = prompt('Урон:');
                                            if (damage && !isNaN(Number(damage))) {
                                                onDamage(Number(damage));
                                            }
                                        }}
                                        className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-3 py-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                    >
                                        Урон
                                    </button>
                                )}
                                {onHeal && (
                                    <button
                                        onClick={() => {
                                            const healing = prompt('Исцеление:');
                                            if (healing && !isNaN(Number(healing))) {
                                                onHeal(Number(healing));
                                            }
                                        }}
                                        className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                    >
                                        Лечение
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Combat Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                {stats.slice(1).map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="h-full">
                                <CardContent className="p-3">
                                    <div className={`${stat.bgColor} rounded-lg p-3 text-center`}>
                                        <Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                            {stat.value}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            {stat.name}
                                        </div>
                                        {stat.extra && (
                                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                {stat.extra}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Status Effects */}
            {character.active_effects.length > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Активные эффекты
                        </h4>
                        <div className="space-y-2">
                            {character.active_effects.map((effect, index) => (
                                <div
                                    key={index}
                                    className={`p-2 rounded text-sm ${
                                        effect.beneficial
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                                            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                                    }`}
                                >
                                    <div className="font-medium">{effect.name}</div>
                                    <div className="text-xs opacity-75">{effect.description}</div>
                                    {effect.duration > 0 && (
                                        <div className="text-xs mt-1">
                                            Длительность: {effect.duration} раунд(ов)
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default CharacterStats;