import React, { useState } from 'react';
import { Send, MessageSquare, Dice6 } from 'lucide-react';

// Основной игровой интерфейс с исправлениями
const GameInterface = () => {
    const [actionInput, setActionInput] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoadingInitialScene, setIsLoadingInitialScene] = useState(true);
    const [campaignInfo, setCampaignInfo] = useState({
        name: 'Загрузка...',
        setting: 'unknown',
        aiStyle: 'balanced'
    });

    // Симуляция загрузки начального сюжета от ИИ
    React.useEffect(() => {
        const generateInitialScene = async () => {
            setIsLoadingInitialScene(true);

            // Симуляция API вызова к backend для генерации начального сюжета
            setTimeout(() => {
                const generatedScenes = [
                    {
                        scene: "Вы стоите на краю Проклятого леса Эльвендал. Мертвые деревья скрипят на ветру, а между стволов мелькают странные огоньки. Воздух пропитан запахом серы и гниющих листьев. Вдалеке виднеется разрушенная башня волшебника. Что вы делаете?",
                        setting: "Темное фэнтези"
                    },
                    {
                        scene: "Торговый караван внезапно останавливается. Впереди дорогу перегородил огромный оползень, а в воздухе слышны крики хищных птиц. Торговец нервно оглядывается и шепчет о бандитах в этих краях. Солнце начинает садиться. Что вы делаете?",
                        setting: "Классическое фэнтези"
                    },
                    {
                        scene: "Механические шестеренки громко щелкают в стенах подземного города гномов. Паровые трубы шипят, выпуская горячий пар. Местный изобретатель взволнованно машет руками, рассказывая о пропавшем артефакте. Его мастерская разгромлена. Что вы делаете?",
                        setting: "Стимпанк фэнтези"
                    }
                ];

                const randomScene = generatedScenes[Math.floor(Math.random() * generatedScenes.length)];

                setCampaignInfo({
                    name: `Приключения ${randomScene.setting}`,
                    setting: randomScene.setting,
                    aiStyle: 'dramatic'
                });

                setMessages([
                    {
                        id: '1',
                        type: 'system',
                        content: `🎲 ИИ Мастер подземелий создал новый уникальный сюжет для вашей кампании "${randomScene.setting}"`,
                        sender: 'Система ИИ',
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: '2',
                        type: 'ai_dm',
                        content: randomScene.scene,
                        sender: 'ИИ Мастер подземелий',
                        timestamp: new Date().toISOString()
                    }
                ]);

                setIsLoadingInitialScene(false);
            }, 2000);
        };

        generateInitialScene();
    }, []);

    const handleActionSubmit = () => {
        if (!actionInput.trim()) return;

        const newMessage = {
            id: Date.now().toString(),
            type: 'action',
            content: actionInput,
            sender: 'Вы',
            timestamp: new Date().toISOString()
        };

        setMessages([...messages, newMessage]);
        setActionInput('');
    };

    const handleChatSubmit = () => {
        if (!chatInput.trim()) return;

        const newMessage = {
            id: Date.now().toString(),
            type: 'chat',
            content: chatInput,
            sender: 'Вы',
            timestamp: new Date().toISOString()
        };

        setMessages([...messages, newMessage]);
        setChatInput('');
    };

    const handleKeyPress = (e, handler) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handler();
        }
    };

    const getMessageStyle = (type) => {
        switch (type) {
            case 'system':
                return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700';
            case 'ai_dm':
                return 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700';
            case 'action':
                return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700';
            case 'chat':
                return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
            default:
                return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        }
    };

    const quickActions = [
        'Осмотреться',
        'Прислушаться',
        'Осторожно войти',
        'Проверить на ловушки',
        'Зажечь факел',
        'Готовить оружие'
    ];

    return (
        <div className="h-screen bg-gray-900 text-white flex flex-col">
            {/* Заголовок игры */}
            <div className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold">{campaignInfo.name}</h1>
                    <div className="flex items-center space-x-2 text-sm">
                        {isLoadingInitialScene ? (
                            <div className="flex items-center text-yellow-400">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-2"></div>
                                <span>ИИ создаёт сюжет...</span>
                            </div>
                        ) : (
                            <div className="flex items-center text-green-400">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                <span>Игра активна • {campaignInfo.setting}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex">
                {/* Левая панель - История игры */}
                <div className="flex-1 flex flex-col">
                    {/* Лента сообщений */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {isLoadingInitialScene ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                                    <h3 className="text-lg font-semibold text-white mb-2">🤖 ИИ Мастер подземелий работает</h3>
                                    <p className="text-gray-400 text-sm">Создаётся уникальный сюжет на основе настроек вашей кампании...</p>
                                    <div className="mt-3 text-xs text-gray-500">
                                        • Анализ сеттинга и персонажей<br/>
                                        • Генерация локаций и квестов<br/>
                                        • Создание атмосферного вступления
                                    </div>
                                </div>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`p-3 rounded-lg border ${getMessageStyle(message.type)} text-gray-900 dark:text-gray-100`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-sm">
                                            {message.sender}
                                        </span>
                                        <span className="text-xs opacity-60">
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-sm">{message.content}</p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Панель ввода действий */}
                    <div className="border-t border-gray-700 bg-gray-800 p-4">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Ваше действие:
                                </label>
                                <div className="flex space-x-2">
                                    <textarea
                                        value={actionInput}
                                        onChange={(e) => setActionInput(e.target.value)}
                                        onKeyPress={(e) => handleKeyPress(e, handleActionSubmit)}
                                        placeholder={isLoadingInitialScene ? "Ожидание создания сюжета..." : "Опишите что вы хотите сделать..."}
                                        disabled={isLoadingInitialScene}
                                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                        rows={2}
                                    />
                                    <button
                                        onClick={handleActionSubmit}
                                        disabled={!actionInput.trim() || isLoadingInitialScene}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Быстрые действия */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Быстрые действия:
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {quickActions.map((action, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setActionInput(action)}
                                            className="px-3 py-1 text-sm bg-gray-600 text-white border border-gray-500 rounded-md hover:bg-gray-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Правая панель */}
                <div className="w-80 border-l border-gray-700 bg-gray-800 flex flex-col">
                    {/* Чат игроков */}
                    <div className="flex-1 flex flex-col">
                        <div className="p-3 border-b border-gray-700">
                            <h3 className="font-semibold flex items-center">
                                <MessageSquare className="w-5 h-5 mr-2" />
                                Чат игроков
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            <div className="p-2 rounded bg-gray-700 text-white">
                                <div className="text-xs text-gray-300 mb-1">Игрок1</div>
                                <div className="text-sm">Готов к приключению!</div>
                            </div>
                            <div className="p-2 rounded bg-gray-700 text-white">
                                <div className="text-xs text-gray-300 mb-1">Игрок2</div>
                                <div className="text-sm">Проверим ловушки перед входом</div>
                            </div>
                        </div>

                        {/* Поле ввода чата */}
                        <div className="p-3 border-t border-gray-700">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => handleKeyPress(e, handleChatSubmit)}
                                    placeholder="Сообщение..."
                                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleChatSubmit}
                                    disabled={!chatInput.trim()}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Панель кубиков */}
                    <div className="border-t border-gray-700 p-3">
                        <h4 className="font-semibold mb-2 flex items-center">
                            <Dice6 className="w-5 h-5 mr-2" />
                            Броски кубиков
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                            {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map((dice) => (
                                <button
                                    key={dice}
                                    className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    onClick={() => setActionInput(`Бросок ${dice}`)}
                                >
                                    {dice}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameInterface;