import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PaperAirplaneIcon,
    CubeIcon,
    SparklesIcon,
    UserCircleIcon,
    ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useGameData, useGameActions } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import type { GameMessage, DiceRollResult } from '@/services/gameService';

const GameChat: React.FC = () => {
    const { user } = useAuthStore();
    const { messages, isLoadingMessages, isConnected } = useGameData();
    const { sendMessage, rollDice } = useGameActions();

    const [messageInput, setMessageInput] = useState('');
    const [messageType, setMessageType] = useState<'chat' | 'action' | 'ooc'>('chat');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Автоскролл к последнему сообщению
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Фокус на поле ввода при подключении
    useEffect(() => {
        if (isConnected) {
            inputRef.current?.focus();
        }
    }, [isConnected]);

    // Отправка сообщения
    const handleSendMessage = async () => {
        if (!messageInput.trim() || !isConnected) return;

        const content = messageInput.trim();

        // Проверяем, является ли это командой броска костей
        const diceMatch = content.match(/^\/roll\s+(.+)/i);
        if (diceMatch) {
            const notation = diceMatch[1].trim();
            await rollDice(notation, 'Бросок из чата');
        } else {
            await sendMessage(content, messageType);
        }

        setMessageInput('');
        inputRef.current?.focus();
    };

    // Обработка нажатия Enter
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Форматирование времени
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Получение иконки отправителя
    const getSenderIcon = (message: GameMessage) => {
        if (message.sender_id === 'ai_dm') {
            return <SparklesIcon className="w-5 h-5 text-purple-400" />;
        }
        if (message.message_type === 'system') {
            return <ComputerDesktopIcon className="w-5 h-5 text-blue-400" />;
        }
        if (message.message_type === 'roll') {
            return <CubeIcon className="w-5 h-5 text-green-400" />;
        }
        return <UserCircleIcon className="w-5 h-5 text-gray-400" />;
    };

    // Получение стилей сообщения
    const getMessageStyles = (message: GameMessage) => {
        const isOwnMessage = message.sender_id === user?.id;

        switch (message.message_type) {
            case 'ai_dm':
                return {
                    container: 'bg-purple-900/30 border-purple-700/50',
                    sender: 'text-purple-300',
                    content: 'text-purple-100',
                };
            case 'system':
                return {
                    container: 'bg-blue-900/30 border-blue-700/50',
                    sender: 'text-blue-300',
                    content: 'text-blue-100',
                };
            case 'roll':
                return {
                    container: 'bg-green-900/30 border-green-700/50',
                    sender: 'text-green-300',
                    content: 'text-green-100',
                };
            case 'action':
                return {
                    container: `${isOwnMessage ? 'bg-amber-900/30 border-amber-700/50' : 'bg-gray-800/50 border-gray-700/50'}`,
                    sender: `${isOwnMessage ? 'text-amber-300' : 'text-gray-300'}`,
                    content: `${isOwnMessage ? 'text-amber-100' : 'text-gray-200'} italic`,
                };
            default: // chat
                return {
                    container: `${isOwnMessage ? 'bg-gray-700/50 border-gray-600/50' : 'bg-gray-800/50 border-gray-700/50'}`,
                    sender: `${isOwnMessage ? 'text-white' : 'text-gray-300'}`,
                    content: `${isOwnMessage ? 'text-gray-100' : 'text-gray-200'}`,
                };
        }
    };

    // Рендер результата броска костей
    const renderDiceRoll = (diceRoll: DiceRollResult) => (
        <div className="mt-2 p-3 bg-green-800/30 rounded-lg border border-green-700/50">
            <div className="flex items-center justify-between mb-2">
                <span className="text-green-300 font-medium">{diceRoll.notation}</span>
                <span className="text-green-100 text-lg font-bold">{diceRoll.total}</span>
            </div>

            {diceRoll.individual_rolls.length > 1 && (
                <div className="text-sm text-green-200">
                    Броски: {diceRoll.individual_rolls.join(', ')}
                    {diceRoll.modifiers !== 0 && ` (${diceRoll.modifiers >= 0 ? '+' : ''}${diceRoll.modifiers})`}
                </div>
            )}

            {diceRoll.is_critical && (
                <div className="text-yellow-400 text-sm font-medium mt-1">
                    ⭐ Критический успех!
                </div>
            )}

            {diceRoll.is_fumble && (
                <div className="text-red-400 text-sm font-medium mt-1">
                    💥 Критическая неудача!
                </div>
            )}

            {diceRoll.purpose && (
                <div className="text-green-300 text-sm mt-1">
                    {diceRoll.purpose}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Заголовок чата */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-400" />
                    Игровой чат
                </h2>
                <div className="flex gap-2 mt-2">
                    {[
                        { id: 'chat', label: 'Чат', icon: '💬' },
                        { id: 'action', label: 'Действие', icon: '⚔️' },
                        { id: 'ooc', label: 'Вне игры', icon: '🗣️' },
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setMessageType(type.id as any)}
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                messageType === type.id
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            {type.icon} {type.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingMessages && (
                    <div className="text-center text-gray-400 py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto mb-2" />
                        Загрузка сообщений...
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((message) => {
                        const styles = getMessageStyles(message);
                        const isOwnMessage = message.sender_id === user?.id;

                        return (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className={`p-3 rounded-lg border ${styles.container} ${
                                    isOwnMessage ? 'ml-8' : 'mr-8'
                                }`}
                            >
                                {/* Заголовок сообщения */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {getSenderIcon(message)}
                                        <span className={`font-medium text-sm ${styles.sender}`}>
                                            {message.sender_name}
                                        </span>
                                        {message.message_type === 'action' && (
                                            <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">
                                                Действие
                                            </span>
                                        )}
                                        {message.is_whisper && (
                                            <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
                                                Шепот
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {formatTime(message.timestamp)}
                                    </span>
                                </div>

                                {/* Содержимое сообщения */}
                                <div className={`${styles.content} whitespace-pre-wrap break-words`}>
                                    {message.content}
                                </div>

                                {/* Результат броска костей */}
                                {message.dice_roll && renderDiceRoll(message.dice_roll)}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            {/* Поле ввода */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            ref={inputRef}
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={
                                messageType === 'chat'
                                    ? 'Введите сообщение... (или /roll 1d20 для броска)'
                                    : messageType === 'action'
                                        ? 'Опишите действие персонажа...'
                                        : 'Сообщение вне игры...'
                            }
                            disabled={!isConnected}
                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                    </div>
                    <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || !isConnected}
                        variant="primary"
                        size="icon"
                    >
                        <PaperAirplaneIcon className="w-4 h-4" />
                    </Button>
                </div>

                {/* Подсказки */}
                <div className="mt-2 text-xs text-gray-500">
                    <div className="flex flex-wrap gap-4">
                        <span>Enter - отправить</span>
                        <span>/roll 1d20 - бросить кости</span>
                        <span>/roll 1d20+5 - с модификатором</span>
                        <span>/roll 2d6 advantage - с преимуществом</span>
                    </div>
                </div>

                {/* Статус подключения */}
                {!isConnected && (
                    <div className="mt-2 text-center text-red-400 text-sm">
                        ⚠️ Нет соединения с сервером
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameChat;