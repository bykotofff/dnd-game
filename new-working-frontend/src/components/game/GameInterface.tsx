import React, { useState, useRef, useEffect } from 'react';
import {
    Send,
    MessageSquare,
    Dice6,
    Users,
    Eye,
    Search,
    Ear,
    ChevronDown,
    ChevronUp,
    Settings,
    Volume2,
    VolumeX
} from 'lucide-react';

const GameInterface = () => {
    const [actionInput, setActionInput] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [showDetails, setShowDetails] = useState(false);
    const [playersCollapsed, setPlayersCollapsed] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isLoadingInitialScene, setIsLoadingInitialScene] = useState(true);
    const [selectedDice, setSelectedDice] = useState('d20');
    const [diceModifier, setDiceModifier] = useState(0);

    const chatEndRef = useRef(null);
    const actionTextareaRef = useRef(null);

    const [campaignInfo, setCampaignInfo] = useState({
        name: 'Загрузка...',
        setting: 'unknown',
        aiStyle: 'balanced'
    });

    const [currentScene, setCurrentScene] = useState({
        description: "Вы стоите на краю Проклятого леса Эльвендал. Мертвые деревья скрипят на ветру, а между стволов мелькают странные огоньки. Воздух пропитан запахом серы и гниющих листьев. Вдалеке виднеется разрушенная башня волшебника. Старый тракт, по которому вы шли, здесь заканчивается, превращаясь в едва заметную тропинку. На развилке стоит покосившийся указательный столб с полустертыми надписями. Что вы делаете?",
        location: "Край Проклятого леса",
        weather: "Туманно, ветрено",
        timeOfDay: "Сумерки"
    });

    const [players, setPlayers] = useState([
        {
            id: '1',
            name: 'Арагорн',
            character: 'Рейнджер, 5 ур.',
            hp: '45/52',
            isOnline: true,
            isCurrentTurn: true
        },
        {
            id: '2',
            name: 'Гэндальф',
            character: 'Волшебник, 5 ур.',
            hp: '28/32',
            isOnline: true,
            isCurrentTurn: false
        },
        {
            id: '3',
            name: 'Леголас',
            character: 'Лучник, 4 ур.',
            hp: '34/38',
            isOnline: false,
            isCurrentTurn: false
        }
    ]);

    // Симуляция загрузки начального сюжета
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoadingInitialScene(false);
            setCampaignInfo({
                name: 'Тайны Мордора',
                setting: 'Темное фэнтези',
                aiStyle: 'dramatic'
            });

            // Добавляем начальное сообщение от ИИ
            setMessages([{
                id: '1',
                type: 'ai_dm',
                content: currentScene.description,
                sender: 'ИИ Мастер',
                timestamp: new Date().toISOString()
            }]);
        }, 3000);

        return () => clearTimeout(timer);
    }, [currentScene.description]);

    // Автопрокрутка чата
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleActionSubmit = (e) => {
        if (e) e.preventDefault();
        if (!actionInput.trim()) return;

        const newMessage = {
            id: Date.now().toString(),
            type: 'action',
            content: actionInput,
            sender: 'Вы',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMessage]);
        setActionInput('');

        // Автоматически сфокусироваться обратно на textarea
        setTimeout(() => {
            actionTextareaRef.current?.focus();
        }, 100);
    };

    const handleChatSubmit = (e) => {
        if (e) e.preventDefault();
        if (!chatInput.trim()) return;

        const newMessage = {
            id: Date.now().toString(),
            type: 'chat',
            content: chatInput,
            sender: 'Вы',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMessage]);
        setChatInput('');
    };

    const handleDiceRoll = () => {
        const roll = Math.floor(Math.random() * parseInt(selectedDice.slice(1))) + 1;
        const total = roll + diceModifier;

        const diceMessage = {
            id: Date.now().toString(),
            type: 'dice_roll',
            content: `Бросок ${selectedDice}${diceModifier !== 0 ? (diceModifier > 0 ? '+' + diceModifier : diceModifier) : ''}: ${roll}${diceModifier !== 0 ? ` + ${diceModifier}` : ''} = ${total}`,
            sender: 'Система',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, diceMessage]);
    };

    const getMessageStyle = (type) => {
        switch (type) {
            case 'ai_dm':
                return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-900 dark:text-purple-100';
            case 'action':
                return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-900 dark:text-green-100';
            case 'chat':
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100';
            case 'dice_roll':
                return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-900 dark:text-red-100';
            default:
                return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        }
    };

    const quickActions = ['Восприятие', 'Исследование', 'Прислушаться'];

    return (
        <div className="h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
            {/* Заголовок игры */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold">{campaignInfo.name}</h1>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            </button>
                            <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        {isLoadingInitialScene ? (
                            <div className="flex items-center text-amber-600 dark:text-amber-400">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse mr-2"></div>
                                <span>ИИ создаёт сюжет...</span>
                            </div>
                        ) : (
                            <div className="flex items-center text-green-600 dark:text-green-400">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span>Игра активна • {campaignInfo.setting}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex min-h-0">
                {/* Левая панель - История игры */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Текущая сцена */}
                    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">Текущая сцена</h3>
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                                {showDetails ? 'Скрыть детали' : 'Показать детали'}
                                {showDetails ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                            </button>
                        </div>

                        <div className={`transition-all duration-300 ${showDetails ? 'max-h-96 overflow-y-auto' : 'max-h-20 overflow-hidden'}`}>
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    📍 {currentScene.location} • 🌤️ {currentScene.weather} • 🕒 {currentScene.timeOfDay}
                                </div>
                                <div className="text-sm leading-relaxed">
                                    {currentScene.description}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Лента сообщений */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                        {isLoadingInitialScene ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                                    <h3 className="text-lg font-semibold mb-2">🤖 ИИ Мастер подземелий работает</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">Создаётся уникальный сюжет...</p>
                                </div>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`p-3 rounded-lg border ${getMessageStyle(message.type)} shadow-sm`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-sm">
                                            {message.sender}
                                        </span>
                                        <span className="text-xs opacity-60">
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-sm leading-relaxed">{message.content}</p>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Панель быстрых действий */}
                    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Быстрые действия:</span>
                            {quickActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActionInput(action)}
                                    className="px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center"
                                >
                                    {action === 'Восприятие' && <Eye className="w-3 h-3 mr-1" />}
                                    {action === 'Исследование' && <Search className="w-3 h-3 mr-1" />}
                                    {action === 'Прислушаться' && <Ear className="w-3 h-3 mr-1" />}
                                    {action}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Панель ввода действий */}
                    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ваше действие:
                            </label>
                            <div className="flex space-x-2">
                                <textarea
                                    ref={actionTextareaRef}
                                    value={actionInput}
                                    onChange={(e) => setActionInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            handleActionSubmit();
                                        }
                                    }}
                                    placeholder={isLoadingInitialScene ?
                                        "Ожидание создания сцены..." :
                                        "Опишите что делает ваш персонаж... (Ctrl+Enter для отправки)"
                                    }
                                    disabled={isLoadingInitialScene}
                                    className="flex-1 px-3 py-2 min-h-[100px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                    rows={4}
                                />
                                <button
                                    onClick={handleActionSubmit}
                                    disabled={!actionInput.trim() || isLoadingInitialScene}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Панель кубиков */}
                    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                        <h4 className="font-semibold mb-3 flex items-center text-gray-900 dark:text-white">
                            <Dice6 className="w-5 h-5 mr-2" />
                            Броски кубиков
                        </h4>
                        <div className="flex items-center space-x-3">
                            <select
                                value={selectedDice}
                                onChange={(e) => setSelectedDice(e.target.value)}
                                className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map((dice) => (
                                    <option key={dice} value={dice}>{dice}</option>
                                ))}
                            </select>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => setDiceModifier(Math.max(-10, diceModifier - 1))}
                                    className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    −
                                </button>
                                <span className="text-sm min-w-[2rem] text-center font-mono">
                                    {diceModifier > 0 ? '+' : ''}{diceModifier}
                                </span>
                                <button
                                    onClick={() => setDiceModifier(Math.min(10, diceModifier + 1))}
                                    className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    +
                                </button>
                            </div>
                            <button
                                onClick={handleDiceRoll}
                                className="px-4 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                            >
                                Бросить
                            </button>
                        </div>
                    </div>
                </div>

                {/* Правая панель - Игроки и чат */}
                <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
                    {/* Панель игроков (скрываемая) */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setPlayersCollapsed(!playersCollapsed)}
                            className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex items-center">
                                <Users className="w-5 h-5 mr-2" />
                                <span className="font-semibold">Игроки ({players.filter(p => p.isOnline).length}/{players.length})</span>
                            </div>
                            {playersCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>

                        {!playersCollapsed && (
                            <div className="px-3 pb-3 space-y-2">
                                {players.map((player) => (
                                    <div
                                        key={player.id}
                                        className={`p-2 rounded-lg border ${
                                            player.isCurrentTurn ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' :
                                                player.isOnline ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
                                                    'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    player.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                                }`} />
                                                <span className="font-medium text-sm">{player.name}</span>
                                                {player.isCurrentTurn && (
                                                    <span className="px-1 py-0.5 text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded">
                                                        Ход
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            {player.character} • HP: {player.hp}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Чат игроков */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold flex items-center">
                                <MessageSquare className="w-5 h-5 mr-2" />
                                Чат игроков
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-900 min-h-[200px]">
                            <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                                <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">Арагорн</div>
                                <div className="text-sm text-blue-900 dark:text-blue-100">Готов к приключению!</div>
                            </div>
                            <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                                <div className="text-xs text-green-700 dark:text-green-300 mb-1">Гэндальф</div>
                                <div className="text-sm text-green-900 dark:text-green-100">Проверим ловушки перед входом</div>
                            </div>
                        </div>

                        {/* Поле ввода чата */}
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleChatSubmit();
                                        }
                                    }}
                                    placeholder="Сообщение..."
                                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                                <button
                                    onClick={handleChatSubmit}
                                    disabled={!chatInput.trim()}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameInterface;