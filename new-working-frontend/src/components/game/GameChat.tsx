import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PaperAirplaneIcon,
    FaceSmileIcon,
    ChatBubbleLeftIcon,
    UserIcon,
    SparklesIcon,
    CubeIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useGameStore } from '@/store/gameStore';
import type { GameMessage } from '@/types';

interface GameChatProps {
    gameId: string;
    className?: string;
}

const GameChat: React.FC<GameChatProps> = ({ gameId, className = '' }) => {
    // ✅ ИСПРАВЛЕНИЕ: Используем специальный селектор для чата
    const {
        chatMessages,
        chatInput,
        isConnected,
        sendMessage,
        setChatInput,
        setTyping
    } = useGameStore((state) => ({
        chatMessages: state.chatMessages,
        chatInput: state.chatInput,
        isConnected: state.isConnected,
        sendMessage: state.sendMessage,
        setChatInput: state.setChatInput,
        setTyping: state.setTyping
    }));

    const [showEmojis, setShowEmojis] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ✅ ОТЛАДКА: Логируем состояние сообщений
    useEffect(() => {
        console.log('🔍 GameChat: chatMessages updated:', chatMessages.length, chatMessages);
    }, [chatMessages]);

    // ✅ ИСПРАВЛЕНИЕ: Автопрокрутка к новым сообщениям теперь использует chatMessages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]); // Изменено с messages на chatMessages

    // Фокус на input при подключении
    useEffect(() => {
        if (isConnected && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isConnected]);

    // Обработка отправки сообщения
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !isConnected) return;

        // Обработка команд
        if (chatInput.startsWith('/')) {
            handleChatCommand(chatInput);
        } else {
            sendMessage(chatInput, false);
        }

        setChatInput('');
        setShowEmojis(false);
    };

    // Обработка команд чата
    const handleChatCommand = (command: string) => {
        const [cmd, ...args] = command.slice(1).split(' ');

        switch (cmd.toLowerCase()) {
            case 'help':
                showHelpMessage();
                break;
            case 'roll':
                handleDiceRoll(args.join(' '));
                break;
            case 'ooc':
                sendMessage(args.join(' '), true);
                break;
            case 'whisper':
            case 'w':
                handleWhisper(args);
                break;
            default:
                sendMessage(`Неизвестная команда: /${cmd}. Используйте /help для справки`, false);
        }
    };

    // Показ справки
    const showHelpMessage = () => {
        const helpText = `
Доступные команды:
/help - эта справка
/roll [кости] - бросок костей (например: /roll 1d20+5)
/ooc [сообщение] - сообщение вне игры
/whisper [игрок] [сообщение] - личное сообщение
        `.trim();

        sendMessage(helpText, false);
    };

    // Обработка броска костей
    const handleDiceRoll = (diceNotation: string) => {
        if (!diceNotation.trim()) {
            sendMessage('Укажите формулу броска, например: /roll 1d20+5', false);
            return;
        }

        // Здесь будет логика броска костей через WebSocket
        sendMessage(`🎲 Бросаю ${diceNotation}...`, false);
    };

    // Обработка шёпота
    const handleWhisper = (args: string[]) => {
        if (args.length < 2) {
            sendMessage('Использование: /whisper [игрок] [сообщение]', false);
            return;
        }

        const target = args[0];
        const message = args.slice(1).join(' ');
        sendMessage(`👤 Шепчу ${target}: ${message}`, false);
    };

    // Обработка изменения ввода
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setChatInput(e.target.value);

        // Индикатор печати (если нужно)
        if (setTyping && e.target.value.length > 0) {
            setTyping(true);
            setTimeout(() => setTyping(false), 3000);
        }
    };

    // Добавление эмодзи
    const handleEmojiSelect = (emoji: string) => {
        setChatInput(prev => prev + emoji);
        setShowEmojis(false);
        inputRef.current?.focus();
    };

    // Получение типа сообщения для стилизации
    const getMessageStyle = (message: GameMessage) => {
        switch (message.type) {
            case 'ai_dm':
                return 'bg-purple-900/30 border-purple-700/50 text-purple-200';
            case 'system':
                return 'bg-blue-900/30 border-blue-700/50 text-blue-200';
            case 'dice_roll':
                return 'bg-green-900/30 border-green-700/50 text-green-200';
            case 'ooc':
                return 'bg-gray-700/50 border-gray-600/50 text-gray-300';
            case 'action':
                return 'bg-yellow-900/30 border-yellow-700/50 text-yellow-200';
            case 'chat': // ✅ Добавляем стиль для обычных чат сообщений
                return 'bg-gray-800/70 border-gray-600/50 text-white';
            default:
                return 'bg-gray-800/70 border-gray-600/50 text-white';
        }
    };

    // Получение иконки для типа сообщения
    const getMessageIcon = (message: GameMessage) => {
        switch (message.type) {
            case 'ai_dm':
                return <SparklesIcon className="w-4 h-4 text-purple-400" />;
            case 'system':
                return <ExclamationTriangleIcon className="w-4 h-4 text-blue-400" />;
            case 'dice_roll':
                return <CubeIcon className="w-4 h-4 text-green-400" />;
            case 'ooc':
                return <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400" />;
            case 'action':
                return <SparklesIcon className="w-4 h-4 text-yellow-400" />;
            case 'chat': // ✅ Добавляем иконку для обычных чат сообщений
                return <UserIcon className="w-4 h-4 text-blue-400" />;
            default:
                return <UserIcon className="w-4 h-4 text-gray-400" />;
        }
    };

    // Популярные эмодзи
    const popularEmojis = ['😀', '😂', '😅', '😊', '😍', '🤔', '😱', '👍', '👎', '❤️', '🔥', '⚔️', '🛡️', '🏹', '🧙‍♂️', '🐉'];

    return (
        <Card className={`flex flex-col ${className}`}>
            <CardHeader className="pb-3 border-b border-gray-700">
                <CardTitle className="text-lg font-medium text-white flex items-center">
                    <ChatBubbleLeftIcon className="w-5 h-5 mr-2" />
                    Чат игры
                    <div className="ml-auto text-xs text-gray-400">
                        {isConnected ? '🟢 Онлайн' : '🔴 Оффлайн'}
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                    {/* ✅ ОТЛАДКА: Показываем количество сообщений */}
                    {chatMessages.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Пока сообщений нет...</p>
                            <p className="text-sm mt-2">Напишите что-нибудь в чат!</p>
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {/* ✅ ИСПРАВЛЕНИЕ: Используем chatMessages вместо messages */}
                        {chatMessages.map((message, index) => (
                            <motion.div
                                key={`${message.id}-${index}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`rounded-lg p-3 border ${getMessageStyle(message)}`}
                            >
                                <div className="flex items-start space-x-2">
                                    {getMessageIcon(message)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="font-medium text-sm">
                                                {/* ✅ ИСПРАВЛЕНИЕ: Используем author вместо sender */}
                                                {message.author || 'Unknown'}
                                            </span>
                                            <span className="text-xs opacity-60">
                                                {new Date(message.timestamp).toLocaleTimeString()}
                                            </span>
                                            {/* ✅ ИСПРАВЛЕНИЕ: Проверяем metadata для OOC */}
                                            {message.metadata?.is_ooc && (
                                                <span className="text-xs bg-gray-600 px-1 rounded">OOC</span>
                                            )}
                                        </div>
                                        <div className="text-sm leading-relaxed">
                                            {message.content}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="border-t border-gray-700 p-3">
                    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                        <div className="relative flex-1">
                            <Input
                                ref={inputRef}
                                type="text"
                                value={chatInput}
                                onChange={handleInputChange}
                                placeholder={isConnected ? "Напишите сообщение..." : "Подключение..."}
                                disabled={!isConnected}
                                className="pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowEmojis(!showEmojis)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 h-6 w-6"
                            >
                                <FaceSmileIcon className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={!isConnected || !chatInput.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <PaperAirplaneIcon className="w-4 h-4" />
                        </Button>
                    </form>

                    {/* Emoji picker */}
                    {showEmojis && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mt-2 p-2 bg-gray-800 border border-gray-600 rounded-lg"
                        >
                            <div className="grid grid-cols-8 gap-1">
                                {popularEmojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleEmojiSelect(emoji)}
                                        className="p-1 hover:bg-gray-700 rounded text-lg"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default GameChat;