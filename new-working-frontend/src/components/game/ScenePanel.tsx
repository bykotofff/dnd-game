import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    EyeIcon,
    MapIcon,
    ClockIcon,
    SunIcon,
    MoonIcon,
    CloudIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useGameUI } from '@/store/gameStore';

interface ScenePanelProps {
    className?: string;
}

interface SceneInfo {
    location: string;
    description: string;
    weather?: string;
    timeOfDay: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' | 'midnight';
    lighting: 'bright' | 'dim' | 'dark';
    atmosphere: 'peaceful' | 'tense' | 'dangerous' | 'mysterious' | 'festive';
    temperature: 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot' | 'scorching';
    visibility: 'clear' | 'light_fog' | 'heavy_fog' | 'rain' | 'storm';
    npcsPresent: string[];
    importantItems: string[];
    hazards: string[];
    notes: string[];
}

const ScenePanel: React.FC<ScenePanelProps> = ({ className = '' }) => {
    const { currentScene } = useGameUI();
    const [isExpanded, setIsExpanded] = useState(true);
    const [showDetails, setShowDetails] = useState(false);

    // Мок данные для демонстрации - в реальности будут приходить через WebSocket
    const sceneInfo: SceneInfo = {
        location: 'Таверна "Танцующий пони"',
        description: 'Уютная таверна в центре деревни Пригорье. Потрескивающий камин озаряет зал теплым светом, а в воздухе витает аромат жареного мяса и эля. За деревянными столами сидят местные жители и путешественники, ведя тихие беседы. Барменша полирует кружки за массивной дубовой стойкой.',
        weather: 'Легкий дождь',
        timeOfDay: 'evening',
        lighting: 'dim',
        atmosphere: 'peaceful',
        temperature: 'cool',
        visibility: 'light_fog',
        npcsPresent: [
            'Розалинда (барменша)',
            'Старый Том (местный житель)',
            'Торговец Маркус',
            'Таинственный странник в капюшоне'
        ],
        importantItems: [
            'Доска объявлений с заданиями',
            'Карта региона на стене',
            'Сундук торговца под лестницей'
        ],
        hazards: [
            'Скрипучие половицы у лестницы'
        ],
        notes: [
            'Странник внимательно наблюдает за группой',
            'Розалинда выглядит обеспокоенной',
            'В углу слышны шепотки о пропавших караванах'
        ]
    };

    const getTimeIcon = (timeOfDay: string) => {
        switch (timeOfDay) {
            case 'dawn':
            case 'morning':
            case 'noon':
            case 'afternoon':
                return <SunIcon className="h-4 w-4 text-yellow-500" />;
            case 'evening':
            case 'night':
            case 'midnight':
                return <MoonIcon className="h-4 w-4 text-blue-400" />;
            default:
                return <ClockIcon className="h-4 w-4 text-gray-500" />;
        }
    };

    const getAtmosphereColor = (atmosphere: string) => {
        switch (atmosphere) {
            case 'peaceful': return 'text-green-600 dark:text-green-400';
            case 'tense': return 'text-yellow-600 dark:text-yellow-400';
            case 'dangerous': return 'text-red-600 dark:text-red-400';
            case 'mysterious': return 'text-purple-600 dark:text-purple-400';
            case 'festive': return 'text-pink-600 dark:text-pink-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getTimeTranslation = (timeOfDay: string) => {
        const translations: Record<string, string> = {
            dawn: 'Рассвет',
            morning: 'Утро',
            noon: 'Полдень',
            afternoon: 'День',
            evening: 'Вечер',
            night: 'Ночь',
            midnight: 'Полночь'
        };
        return translations[timeOfDay] || timeOfDay;
    };

    const getAtmosphereTranslation = (atmosphere: string) => {
        const translations: Record<string, string> = {
            peaceful: 'Спокойная',
            tense: 'Напряженная',
            dangerous: 'Опасная',
            mysterious: 'Таинственная',
            festive: 'Праздничная'
        };
        return translations[atmosphere] || atmosphere;
    };

    return (
        <Card className={`h-full ${className}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <EyeIcon className="h-5 w-5" />
                        Текущая сцена
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-8 w-8 p-0"
                    >
                        {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4">
                    {/* Основная информация о локации */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <div className="flex items-center gap-2">
                            <MapIcon className="h-4 w-4 text-blue-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {sceneInfo.location}
                            </h3>
                        </div>

                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {sceneInfo.description}
                        </p>
                    </motion.div>

                    {/* Условия окружения */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                        <div className="flex items-center gap-2">
                            {getTimeIcon(sceneInfo.timeOfDay)}
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                {getTimeTranslation(sceneInfo.timeOfDay)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <CloudIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                {sceneInfo.weather}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 col-span-2">
                            <div className="w-2 h-2 rounded-full bg-current" />
                            <span className={`text-xs font-medium ${getAtmosphereColor(sceneInfo.atmosphere)}`}>
                                {getAtmosphereTranslation(sceneInfo.atmosphere)} атмосфера
                            </span>
                        </div>
                    </motion.div>

                    {/* Детальная информация */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDetails(!showDetails)}
                            className="mb-3 text-sm"
                        >
                            <InformationCircleIcon className="h-4 w-4 mr-1" />
                            {showDetails ? 'Скрыть детали' : 'Показать детали'}
                        </Button>

                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3"
                            >
                                {/* NPCs */}
                                {sceneInfo.npcsPresent.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                            Присутствующие NPC
                                        </h4>
                                        <div className="space-y-1">
                                            {sceneInfo.npcsPresent.map((npc, index) => (
                                                <div key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                    {npc}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Важные предметы */}
                                {sceneInfo.importantItems.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                            Важные объекты
                                        </h4>
                                        <div className="space-y-1">
                                            {sceneInfo.importantItems.map((item, index) => (
                                                <div key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-green-500" />
                                                    {item}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Опасности */}
                                {sceneInfo.hazards.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                            Потенциальные опасности
                                        </h4>
                                        <div className="space-y-1">
                                            {sceneInfo.hazards.map((hazard, index) => (
                                                <div key={index} className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                                    <ExclamationTriangleIcon className="w-3 h-3" />
                                                    {hazard}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Заметки ДМ */}
                                {sceneInfo.notes.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                            Заметки
                                        </h4>
                                        <div className="space-y-1">
                                            {sceneInfo.notes.map((note, index) => (
                                                <div key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2 italic">
                                                    <div className="w-1 h-1 rounded-full bg-yellow-500" />
                                                    {note}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Быстрые действия */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="pt-3 border-t border-gray-200 dark:border-gray-700"
                    >
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // Логика восприятия
                                    console.log('Perception check');
                                }}
                            >
                                Восприятие
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // Логика исследования
                                    console.log('Investigation check');
                                }}
                            >
                                Исследование
                            </Button>
                        </div>
                    </motion.div>
                </CardContent>
            )}
        </Card>
    );
};

export default ScenePanel;