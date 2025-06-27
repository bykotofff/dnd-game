import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PaperAirplaneIcon,
    EyeSlashIcon,
    EyeIcon,
    UserIcon,
    SparklesIcon,
    ExclamationTriangleIcon,
    ChatBubbleLeftRightIcon,
    MicrophoneIcon,
    SpeakerWaveIcon,
    Cog6ToothIcon,
    FaceSmileIcon,
    CommandLineIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useGameChat, useGameUI, useGameActions } from '@/store/gameStore';
import type { GameMessage } from '@/types';

interface GameChatProps {
    className?: string;
}

interface ChatCommand {
    command: string;
    description: string;
    usage: string;
    example: string;
}

const CHAT_COMMANDS: ChatCommand[] = [
    {
        command: '/roll',
        description: 'Roll dice',
        usage: '/roll [dice] [purpose]',
        example: '/roll 1d20+5 Attack Roll'
    },
    {
        command: '/r',
        description: 'Short roll command',
        usage: '/r [dice]',
        example: '/r 2d6+3'
    },
    {
        command: '/action',
        description: 'Perform an action',
        usage: '/action [description]',
        example: '/action draws sword and charges'
    },
    {
        command: '/me',
        description: 'Describe character action',
        usage: '/me [action]',
        example: '/me looks around nervously'
    },
    {
        command: '/whisper',
        description: 'Send private message',
        usage: '/w [player] [message]',
        example: '/w John I found a secret door'
    },
    {
        command: '/ooc',
        description: 'Out of character message',
        usage: '/ooc [message]',
        example: '/ooc Can we take a 5 minute break?'
    }
];

// Emoji shortcuts
const EMOJI_SHORTCUTS: { [key: string]: string } = {
    ':d20:': '🎲',
    ':sword:': '⚔️',
    ':shield:': '🛡️',
    ':fire:': '🔥',
    ':lightning:': '⚡',
    ':heart:': '❤️',
    ':skull:': '💀',
    ':magic:': '✨',
    ':gold:': '💰',
    ':potion:': '🧪',
    ':bow:': '🏹',
    ':dagger:': '🗡️',
    ':crown:': '👑',
    ':crystal:': '💎'
};

const GameChat: React.FC<GameChatProps> = ({ className = '' }) => {
    const { messages, chatInput, sendMessage, sendAction, setChatInput } = useGameChat();
    const { selectedCharacterId, playersOnline } = useGameUI();
    const { rollDice } = useGameActions();

    // Local state
    const [showCommands, setShowCommands] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [filterOOC, setFilterOOC] = useState(false);
    const [filterSystem, setFilterSystem] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const soundRef = useRef<HTMLAudioElement | null>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize notification sound
    useEffect(() => {
        soundRef.current = new Audio();
        soundRef.current.volume = 0.3;

        return () => {
            if (soundRef.current) {
                soundRef.current.pause();
                soundRef.current = null;
            }
        };
    }, []);

    // Play notification sound for new messages
    useEffect(() => {
        if (messages.length > 0 && soundEnabled) {
            const lastMessage = messages[messages.length - 1];
            // Don't play sound for own messages or system messages
            if (lastMessage.sender.type !== 'system' && soundRef.current) {
                try {
                    soundRef.current.currentTime = 0;
                    soundRef.current.play().catch(() => {
                        // Sound failed, continue silently
                    });
                } catch (error) {
                    // Sound failed, continue silently
                }
            }
        }
    }, [messages, soundEnabled]);

    // Filter messages
    const filteredMessages = useMemo(() => {
        return messages.filter(message => {
            if (filterOOC && message.is_ooc) return false;
            if (filterSystem && message.sender.type === 'system') return false;
            return true;
        });
    }, [messages, filterOOC, filterSystem]);

    // Process emoji shortcuts
    const processEmojis = (text: string): string => {
        let processed = text;
        Object.entries(EMOJI_SHORTCUTS).forEach(([shortcut, emoji]) => {
            processed = processed.replace(new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
        });
        return processed;
    };

    // Parse and execute chat commands
    const parseCommand = (input: string): boolean => {
        const trimmed = input.trim();
        if (!trimmed.startsWith('/')) return false;

        const parts = trimmed.split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');

        switch (command) {
            case '/roll':
            case '/r':
                handleRollCommand(args);
                return true;

            case '/action':
            case '/me':
                if (args) {
                    sendAction(args);
                }
                return true;

            case '/whisper':
            case '/w':
                handleWhisperCommand(args);
                return true;

            case '/ooc':
                if (args) {
                    sendMessage(args, true); // true = OOC
                }
                return true;

            case '/clear':
                // Could implement clear chat history
                return true;

            case '/help':
                setShowCommands(true);
                return true;

            default:
                return false;
        }
    };

    const handleRollCommand = (args: string) => {
        const parts = args.split(' ');
        const notation = parts[0];
        const purpose = parts.slice(1).join(' ');

        if (notation) {
            rollDice(notation, purpose || undefined);
        }
    };

    const handleWhisperCommand = (args: string) => {
        const firstSpace = args.indexOf(' ');
        if (firstSpace === -1) return;

        const target = args.substring(0, firstSpace);
        const message = args.substring(firstSpace + 1);

        if (target && message) {
            // For now, just send as regular message with whisper prefix
            sendMessage(`[Whisper to ${target}] ${message}`, false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const processedInput = processEmojis(chatInput);

        // Try to parse as command first
        if (!parseCommand(processedInput)) {
            // Regular message
            sendMessage(processedInput, false);
        }

        setChatInput('');
        setIsTyping(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setChatInput(value);

        // Show typing indicator
        if (value && !isTyping) {
            setIsTyping(true);
        } else if (!value && isTyping) {
            setIsTyping(false);
        }
    };

    const insertEmoji = (emoji: string) => {
        const input = inputRef.current;
        if (input) {
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const newValue = chatInput.slice(0, start) + emoji + chatInput.slice(end);
            setChatInput(newValue);

            // Focus back to input and set cursor position
            setTimeout(() => {
                input.focus();
                input.setSelectionRange(start + emoji.length, start + emoji.length);
            }, 0);
        }
        setShowEmojis(false);
    };

    const getMessageStyle = (message: GameMessage): string => {
        const baseClass = 'chat-message p-3 rounded-lg mb-2 break-words';

        if (message.is_ooc) {
            return `${baseClass} chat-message ooc bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400`;
        }

        switch (message.message_type) {
            case 'action':
                return `${baseClass} chat-message action bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400`;
            case 'dice_roll':
                return `${baseClass} chat-message dice bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400`;
            default:
                switch (message.sender.type) {
                    case 'dm':
                    case 'ai':
                        return `${baseClass} chat-message dm bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400`;
                    case 'system':
                        return `${baseClass} chat-message system bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400`;
                    default:
                        return `${baseClass} chat-message player bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400`;
                }
        }
    };

    const formatMessageContent = (content: string): string => {
        // Process basic markdown-like formatting
        let formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // *italic*
            .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">$1</code>'); // `code`

        return formatted;
    };

    const formatTimestamp = (timestamp: string): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Card className={`flex flex-col h-full ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    Game Chat
                    {playersOnline.length > 0 && (
                        <span className="text-sm font-normal text-gray-500">
                            ({playersOnline.length} online)
                        </span>
                    )}
                </CardTitle>

                <div className="flex items-center gap-1">
                    {/* Filter buttons */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilterOOC(!filterOOC)}
                        className={`h-8 w-8 p-0 ${filterOOC ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                        title="Filter OOC messages"
                    >
                        {filterOOC ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`h-8 w-8 p-0 ${!soundEnabled ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                        title="Toggle sound notifications"
                    >
                        {soundEnabled ? <SpeakerWaveIcon className="h-4 w-4" /> : <MicrophoneIcon className="h-4 w-4" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCommands(!showCommands)}
                        className="h-8 w-8 p-0"
                        title="Show chat commands"
                    >
                        <CommandLineIcon className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                {/* Chat Commands Panel */}
                <AnimatePresence>
                    {showCommands && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-b border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800"
                        >
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Chat Commands
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {CHAT_COMMANDS.map((cmd) => (
                                    <div key={cmd.command} className="space-y-1">
                                        <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                            {cmd.command}
                                        </div>
                                        <div className="text-gray-600 dark:text-gray-400">
                                            {cmd.description}
                                        </div>
                                        <div className="font-mono text-gray-500 dark:text-gray-500">
                                            {cmd.example}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages Area */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-2"
                    style={{ maxHeight: 'calc(100vh - 300px)' }}
                >
                    <AnimatePresence initial={false}>
                        {filteredMessages.map((message, index) => (
                            <motion.div
                                key={`${message.id}-${index}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className={getMessageStyle(message)}
                            >
                                {/* Message Header */}
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        {/* Sender Icon */}
                                        {message.sender.type === 'ai' || message.sender.type === 'dm' ? (
                                            <SparklesIcon className="h-4 w-4 text-purple-500" />
                                        ) : message.sender.type === 'system' ? (
                                            <ExclamationTriangleIcon className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <UserIcon className="h-4 w-4 text-blue-500" />
                                        )}

                                        {/* Sender Name */}
                                        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                                            {message.sender.name || 'Unknown'}
                                        </span>

                                        {/* Message Type Badge */}
                                        {message.message_type === 'action' && (
                                            <span className="text-xs bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded-full">
                                                Action
                                            </span>
                                        )}
                                        {message.message_type === 'dice_roll' && (
                                            <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded-full">
                                                🎲 Roll
                                            </span>
                                        )}
                                        {message.is_ooc && (
                                            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                                OOC
                                            </span>
                                        )}
                                        {message.is_whisper && (
                                            <span className="text-xs bg-purple-200 dark:bg-purple-800 px-2 py-0.5 rounded-full">
                                                Whisper
                                            </span>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatTimestamp(message.timestamp)}
                                    </span>
                                </div>

                                {/* Message Content */}
                                <div
                                    className="text-gray-900 dark:text-white"
                                    dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                                />

                                {/* Dice Roll Data */}
                                {message.dice_data && (
                                    <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border text-sm">
                                        <div className="font-mono">
                                            {message.dice_data.notation} = <span className="font-bold">{message.dice_data.result}</span>
                                            {message.dice_data.is_critical && <span className="text-yellow-500 ml-1">⭐ CRITICAL!</span>}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            Individual rolls: [{message.dice_data.individual_rolls.join(', ')}]
                                            {message.dice_data.purpose && ` • ${message.dice_data.purpose}`}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-gray-500 dark:text-gray-400 italic"
                        >
                            You are typing...
                        </motion.div>
                    )}

                    {/* Auto-scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>

                {/* Emoji Panel */}
                <AnimatePresence>
                    {showEmojis && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800"
                        >
                            <div className="grid grid-cols-8 gap-2">
                                {Object.values(EMOJI_SHORTCUTS).map((emoji, index) => (
                                    <button
                                        key={index}
                                        onClick={() => insertEmoji(emoji)}
                                        className="text-xl hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input Area */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowEmojis(!showEmojis)}
                            className="h-8 w-8 p-0"
                        >
                            <FaceSmileIcon className="h-4 w-4" />
                        </Button>

                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Type a message... (use /help for commands)"
                            value={chatInput}
                            onChange={handleInputChange}
                            className="flex-1"
                            autoComplete="off"
                        />

                        <Button
                            type="submit"
                            disabled={!chatInput.trim()}
                            size="sm"
                            variant="default"
                        >
                            <PaperAirplaneIcon className="h-4 w-4" />
                        </Button>
                    </form>

                    {/* Input hints */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {chatInput.startsWith('/') ? (
                            <span>💡 Command mode - type /help for available commands</span>
                        ) : (
                            <span>💬 Press Enter to send • Use /roll for dice • Use /ooc for out of character</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default GameChat;