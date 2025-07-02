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
    // Получаем состояние из store
    const {
        messages,
        chatInput,
        isConnected,
        sendMessage,
        setChatInput,
        setTyping
    } = useGameStore();

    const [showEmojis, setShowEmojis] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Автопрокрутка к новым сообщениям
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
            default:
                return 'bg-gray-800/70 border-gray-600/50 text-white'; // ИСПРАВЛЕНИЕ: убрана прозрачность
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
                    <AnimatePresence initial={false}>
                        {messages.map((message, index) => (
                            <motion.div
                                key={`${message.id}-${index}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`rounded-lg p-3 border ${getMessageStyle(message)}`} // ИСПРАВЛЕНИЕ: убрана лишняя прозрачность
                            >
                                <div className="flex items-start space-x-2">
                                    {getMessageIcon(message)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="font-medium text-sm">
                                                {message.sender}
                                            </span>
                                            <span className="text-xs opacity-60">
                                                {new Date(message.timestamp).toLocaleTimeString()}
                                            </span>
                                            {message.type === 'ooc' && (
                                                <span className="text-xs bg-gray-600 px-1 rounded text-gray-300">
                                                    OOC
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm break-words">
                                            {message.content}
                                        </div>
                                        {message.dice_roll && (
                                            <div className="mt-2 p-2 bg-black/20 rounded text-xs">
                                                🎲 {message.dice_roll.notation}:
                                                <span className="font-bold ml-1">
                                                    {message.dice_roll.total}
                                                </span>
                                                {message.dice_roll.individual_rolls?.length > 1 && (
                                                    <span className="ml-1 opacity-60">
                                                        ({message.dice_roll.individual_rolls.join(', ')})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Placeholder when no messages */}
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Сообщений пока нет</p>
                            <p className="text-sm mt-1">Начните общение!</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Emoji picker */}
                <AnimatePresence>
                    {showEmojis && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-gray-700 p-3"
                        >
                            <div className="grid grid-cols-8 gap-2">
                                {popularEmojis.map((emoji, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleEmojiSelect(emoji)}
                                        className="text-lg hover:bg-gray-700 rounded p-1 transition-colors"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input Area */}
                <div className="border-t border-gray-700 p-3">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowEmojis(!showEmojis)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                        >
                            <FaceSmileIcon className="h-4 w-4" />
                        </Button>

                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Введите сообщение... (используйте /help для команд)"
                            value={chatInput}
                            onChange={handleInputChange}
                            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                            autoComplete="off"
                            disabled={!isConnected}
                        />

                        <Button
                            type="submit"
                            disabled={!chatInput.trim() || !isConnected}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <PaperAirplaneIcon className="h-4 w-4" />
                        </Button>
                    </form>

                    {/* Input hints */}
                    <div className="text-xs text-gray-500 mt-1">
                        {chatInput.startsWith('/') ? (
                            <span>💡 Режим команды - введите /help для доступных команд</span>
                        ) : (
                            <span>💬 Enter для отправки • /roll для костей • /ooc для OOC</span>
                        )}
                    </div>

                    {/* Connection status */}
                    {!isConnected && (
                        <div className="mt-2 text-xs text-red-400 text-center">
                            ⚠️ Не подключен к игре
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default GameChat;