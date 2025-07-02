import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    EyeIcon,
    EarIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    ArrowRightIcon,
    ChatBubbleLeftIcon,
    HandRaisedIcon,
    ShieldCheckIcon,
    BoltIcon,
    HeartIcon,
    CubeIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface ActionHelpersProps {
    onActionSelect: (action: string) => void;
    disabled?: boolean;
    className?: string;
}

interface ActionCategory {
    name: string;
    icon: React.ComponentType<any>;
    color: string;
    actions: {
        text: string;
        action: string;
        icon?: React.ComponentType<any>;
        description?: string;
    }[];
}

const ActionHelpers: React.FC<ActionHelpersProps> = ({
                                                         onActionSelect,
                                                         disabled = false,
                                                         className = ''
                                                     }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('basic');
    const [isExpanded, setIsExpanded] = useState(true);

    // Категории действий
    const actionCategories: Record<string, ActionCategory> = {
        basic: {
            name: 'Базовые',
            icon: EyeIcon,
            color: 'blue',
            actions: [
                {
                    text: 'Осмотреться',
                    action: 'Внимательно осматриваю окружающую обстановку',
                    icon: EyeIcon,
                    description: 'Изучить окружение'
                },
                {
                    text: 'Слушать',
                    action: 'Прислушиваюсь к звукам вокруг',
                    icon: EarIcon,
                    description: 'Сконцентрироваться на звуках'
                },
                {
                    text: 'Поиск',
                    action: 'Ищу что-то полезное или подозрительное',
                    icon: MagnifyingGlassIcon,
                    description: 'Найти предметы или улики'
                },
                {
                    text: 'Подождать',
                    action: 'Жду и наблюдаю за происходящим',
                    icon: ClockIcon,
                    description: 'Выждать подходящий момент'
                },
                {
                    text: 'Идти вперед',
                    action: 'Осторожно двигаюсь вперед',
                    icon: ArrowRightIcon,
                    description: 'Продвинуться дальше'
                },
                {
                    text: 'Говорить',
                    action: 'Обращаюсь к группе: ',
                    icon: ChatBubbleLeftIcon,
                    description: 'Сказать что-то важное'
                }
            ]
        },
        combat: {
            name: 'Бой',
            icon: ShieldCheckIcon,
            color: 'red',
            actions: [
                {
                    text: 'Атака',
                    action: 'Атакую ближайшего противника',
                    icon: BoltIcon,
                    description: 'Атаковать врага'
                },
                {
                    text: 'Защита',
                    action: 'Принимаю защитную стойку',
                    icon: ShieldCheckIcon,
                    description: 'Защищаться от атак'
                },
                {
                    text: 'Заклинание',
                    action: 'Читаю заклинание: ',
                    icon: SparklesIcon,
                    description: 'Использовать магию'
                },
                {
                    text: 'Укрыться',
                    action: 'Ищу укрытие от атак',
                    icon: ShieldCheckIcon,
                    description: 'Найти защиту'
                },
                {
                    text: 'Помощь',
                    action: 'Помогаю союзнику в бою',
                    icon: HeartIcon,
                    description: 'Поддержать товарища'
                },
                {
                    text: 'Отступить',
                    action: 'Отхожу на безопасное расстояние',
                    icon: ArrowRightIcon,
                    description: 'Покинуть опасную зону'
                }
            ]
        },
        social: {
            name: 'Общение',
            icon: ChatBubbleLeftIcon,
            color: 'green',
            actions: [
                {
                    text: 'Убедить',
                    action: 'Пытаюсь убедить: ',
                    icon: ChatBubbleLeftIcon,
                    description: 'Использовать убеждение'
                },
                {
                    text: 'Обмануть',
                    action: 'Пытаюсь обмануть: ',
                    icon: SparklesIcon,
                    description: 'Использовать обман'
                },
                {
                    text: 'Запугать',
                    action: 'Пытаюсь запугать: ',
                    icon: BoltIcon,
                    description: 'Использовать угрозы'
                },
                {
                    text: 'Торговаться',
                    action: 'Пытаюсь договориться о цене: ',
                    icon: HandRaisedIcon,
                    description: 'Вести переговоры'
                },
                {
                    text: 'Расспросить',
                    action: 'Задаю вопросы: ',
                    icon: MagnifyingGlassIcon,
                    description: 'Получить информацию'
                },
                {
                    text: 'Похвалить',
                    action: 'Хвалю и лестью: ',
                    icon: HeartIcon,
                    description: 'Использовать лесть'
                }
            ]
        },
        skills: {
            name: 'Навыки',
            icon: CubeIcon,
            color: 'purple',
            actions: [
                {
                    text: 'Скрытность',
                    action: 'Пытаюсь спрятаться и двигаться незаметно',
                    icon: EyeIcon,
                    description: 'Действовать скрытно'
                },
                {
                    text: 'Акробатика',
                    action: 'Использую акробатику для ',
                    icon: BoltIcon,
                    description: 'Ловкие маневры'
                },
                {
                    text: 'Лечение',
                    action: 'Оказываю первую помощь ',
                    icon: HeartIcon,
                    description: 'Вылечить раны'
                },
                {
                    text: 'Взлом',
                    action: 'Пытаюсь взломать ',
                    icon: MagnifyingGlassIcon,
                    description: 'Вскрыть замок или ловушку'
                },
                {
                    text: 'Ремесло',
                    action: 'Создаю или чиню ',
                    icon: HandRaisedIcon,
                    description: 'Изготовить что-то'
                },
                {
                    text: 'Выслеживание',
                    action: 'Ищу следы и пытаюсь выследить ',
                    icon: EyeIcon,
                    description: 'Найти следы'
                }
            ]
        }
    };

    const getColorClasses = (color: string, isActive: boolean = false) => {
        const colors = {
            blue: isActive
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-blue-900/30 border-blue-700/50 text-blue-300 hover:bg-blue-800/40 hover:border-blue-600 hover:text-white',
            red: isActive
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-red-900/30 border-red-700/50 text-red-300 hover:bg-red-800/40 hover:border-red-600 hover:text-white',
            green: isActive
                ? 'bg-green-600 border-green-500 text-white'
                : 'bg-green-900/30 border-green-700/50 text-green-300 hover:bg-green-800/40 hover:border-green-600 hover:text-white',
            purple: isActive
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-purple-900/30 border-purple-700/50 text-purple-300 hover:bg-purple-800/40 hover:border-purple-600 hover:text-white'
        };
        return colors[color as keyof typeof colors] || colors.blue;
    };

    return (
        <Card className={`bg-gray-800 border-gray-700 ${className}`}>
            <CardContent className="p-4">
                {/* Header with toggle */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">Быстрые действия</h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-400 hover:text-white"
                    >
                        {isExpanded ? 'Скрыть' : 'Показать'}
                    </Button>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4"
                        >
                            {/* Category tabs */}
                            <div className="flex space-x-2 overflow-x-auto">
                                {Object.entries(actionCategories).map(([key, category]) => {
                                    const Icon = category.icon;
                                    const isActive = selectedCategory === key;

                                    return (
                                        <Button
                                            key={key}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedCategory(key)}
                                            className={`flex items-center space-x-2 whitespace-nowrap border transition-all duration-200 ${getColorClasses(category.color, isActive)}`}
                                            disabled={disabled}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="font-medium">{category.name}</span>
                                        </Button>
                                    );
                                })}
                            </div>

                            {/* Action buttons */}
                            <motion.div
                                key={selectedCategory}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
                            >
                                {actionCategories[selectedCategory].actions.map((action, index) => {
                                    const Icon = action.icon || ChatBubbleLeftIcon;
                                    const category = actionCategories[selectedCategory];

                                    return (
                                        <Button
                                            key={index}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onActionSelect(action.action)}
                                            disabled={disabled}
                                            className={`flex items-center justify-start space-x-2 p-3 h-auto text-left border transition-all duration-200 ${getColorClasses(category.color)}`}
                                            title={action.description}
                                        >
                                            <Icon className="w-4 h-4 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm">
                                                    {action.text}
                                                </div>
                                                {action.description && (
                                                    <div className="text-xs opacity-75 truncate">
                                                        {action.description}
                                                    </div>
                                                )}
                                            </div>
                                        </Button>
                                    );
                                })}
                            </motion.div>

                            {/* Help text */}
                            <div className="text-xs text-gray-400 bg-gray-900/50 rounded p-2 border border-gray-700">
                                💡 <strong>Подсказка:</strong> Нажмите на действие, чтобы добавить его в поле ввода.
                                Вы можете дополнить или изменить текст перед отправкой.
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
};

export default ActionHelpers;