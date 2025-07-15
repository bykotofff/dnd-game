// new-working-frontend/src/components/CharacterSelectionModal.tsx
import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    XMarkIcon,
    UserIcon,
    ShieldCheckIcon,
    SparklesIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { characterService } from '@/services/characterService';
import type { CharacterResponse } from '@/types/character';

interface CharacterSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCharacterSelected: (character: CharacterResponse) => void;
    campaignName: string;
    loading?: boolean;
}

export const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({
                                                                                    isOpen,
                                                                                    onClose,
                                                                                    onCharacterSelected,
                                                                                    campaignName,
                                                                                    loading = false,
                                                                                }) => {
    const [selectedCharacter, setSelectedCharacter] = useState<CharacterResponse | null>(null);

    // Загружаем персонажей пользователя
    const {
        data: characters = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ['characters'],
        queryFn: () => characterService.getCharacters(),
        enabled: isOpen, // Загружаем только когда модал открыт
    });

    const handleConfirm = () => {
        if (!selectedCharacter) {
            toast.error('Выберите персонажа для игры');
            return;
        }

        onCharacterSelected(selectedCharacter);
    };

    const handleCharacterClick = (character: CharacterResponse) => {
        setSelectedCharacter(character);
    };

    const getCharacterClassIcon = (characterClass: string) => {
        // Простые иконки для разных классов
        const classIcons: Record<string, React.ComponentType<any>> = {
            fighter: ShieldCheckIcon,
            wizard: SparklesIcon,
            rogue: UserIcon,
            cleric: UserIcon,
            ranger: UserIcon,
            paladin: ShieldCheckIcon,
            barbarian: ShieldCheckIcon,
            bard: SparklesIcon,
            druid: SparklesIcon,
            monk: UserIcon,
            sorcerer: SparklesIcon,
            warlock: SparklesIcon,
        };

        const IconComponent = classIcons[characterClass.toLowerCase()] || UserIcon;
        return IconComponent;
    };

    const getCharacterLevelBadge = (level: number) => {
        const color = level >= 10 ? 'bg-purple-100 text-purple-800' :
            level >= 5 ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800';

        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                {level} ур.
            </span>
        );
    };

    // Простой спиннер
    const LoadingSpinner = () => (
        <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
                Загрузка персонажей...
            </span>
        </div>
    );

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <Dialog.Title
                                            as="h3"
                                            className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                                        >
                                            Выберите персонажа
                                        </Dialog.Title>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            Выберите персонажа для участия в кампании "{campaignName}"
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="mb-6">
                                    {isLoading ? (
                                        <LoadingSpinner />
                                    ) : error ? (
                                        <div className="text-center py-8">
                                            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
                                            <p className="text-red-600 dark:text-red-400">
                                                Ошибка загрузки персонажей
                                            </p>
                                        </div>
                                    ) : characters.length === 0 ? (
                                        <div className="text-center py-8">
                                            <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                У вас пока нет созданных персонажей
                                            </p>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    onClose();
                                                    window.open('/characters/create', '_blank');
                                                }}
                                            >
                                                Создать персонажа
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 max-h-96 overflow-y-auto">
                                            {characters.map((character) => {
                                                const isSelected = selectedCharacter?.id === character.id;
                                                const IconComponent = getCharacterClassIcon(character.character_class);

                                                return (
                                                    <Card
                                                        key={character.id}
                                                        className={`cursor-pointer transition-all duration-200 ${
                                                            isSelected
                                                                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                                : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
                                                        }`}
                                                        onClick={() => handleCharacterClick(character)}
                                                    >
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center space-x-4">
                                                                {/* Иконка класса */}
                                                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                                                                    isSelected
                                                                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300'
                                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                                }`}>
                                                                    <IconComponent className="w-6 h-6" />
                                                                </div>

                                                                {/* Информация о персонаже */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                            {character.name}
                                                                        </h4>
                                                                        {getCharacterLevelBadge(character.level)}
                                                                    </div>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                        {character.race} {character.character_class}
                                                                    </p>
                                                                    {character.background && (
                                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                            {character.background}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                {/* Индикатор выбора */}
                                                                {isSelected && (
                                                                    <div className="flex-shrink-0">
                                                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={loading}
                                    >
                                        Отмена
                                    </Button>

                                    <Button
                                        variant="primary"
                                        onClick={handleConfirm}
                                        disabled={!selectedCharacter || loading || characters.length === 0}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                                <span>Запуск...</span>
                                            </>
                                        ) : (
                                            'Начать игру'
                                        )}
                                    </Button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};