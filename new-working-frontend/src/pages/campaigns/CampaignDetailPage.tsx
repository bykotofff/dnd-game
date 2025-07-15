// new-working-frontend/src/pages/campaigns/CampaignDetailPage.tsx (ОБНОВЛЕННАЯ ВЕРСИЯ)
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    ArrowLeftIcon,
    PencilIcon,
    PlayIcon,
    UserPlusIcon,
    ChatBubbleLeftRightIcon,
    TrashIcon,
    UsersIcon,
    CalendarIcon,
    MapPinIcon,
    BookOpenIcon,
    CogIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { CharacterSelectionModal } from '@/components/CharacterSelectionModal'; // ✅ НОВЫЙ ИМПОРТ
import { campaignService } from '@/services/campaignService';
import { gameService } from '@/services/gameService';
import { useAuthStore } from '@/store/authStore';
import type { CharacterResponse } from '@/types/character'; // ✅ НОВЫЙ ИМПОРТ

const CampaignDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // ✅ НОВОЕ СОСТОЯНИЕ для модального окна выбора персонажа
    const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState<CharacterResponse | null>(null);

    const {
        data: campaign,
        isLoading,
        error,
    } = useQuery(
        ['campaign', id],
        () => campaignService.getCampaign(id!),
        {
            enabled: !!id,
            staleTime: 5 * 60 * 1000,
        }
    );

    const joinMutation = useMutation(
        () => campaignService.joinCampaign(id!),
        {
            onSuccess: () => {
                toast.success('Заявка на присоединение отправлена!');
                queryClient.invalidateQueries(['campaign', id]);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.detail || 'Ошибка при присоединении к кампании');
            },
        }
    );

    const deleteMutation = useMutation(
        () => campaignService.deleteCampaign(id!),
        {
            onSuccess: () => {
                toast.success('Кампания архивирована');
                navigate('/campaigns');
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.detail || 'Ошибка при удалении кампании');
            },
        }
    );

    // ✅ ОБНОВЛЕННАЯ ЛОГИКА: Мутация для запуска игры с выбранным персонажем
    const startGameMutation = useMutation(
        async ({ characterId }: { characterId: string }) => {
            if (!campaign?.id) throw new Error('Campaign ID is required');

            // Сначала ищем существующие игры для этой кампании
            const games = await gameService.getGames({ campaign_id: campaign.id });

            if (games && games.length > 0) {
                // Если игра существует, берем первую активную
                const activeGame = games.find(g => g.status === 'active' || g.status === 'waiting');
                if (activeGame) {
                    // Присоединяемся к существующей игре с выбранным персонажем
                    await gameService.joinGame(activeGame.id, { character_id: characterId });
                    return { gameId: activeGame.id, isNew: false };
                }
            }

            // Если активной игры нет, создаем новую
            const newGame = await gameService.createGame({
                campaign_id: campaign.id,
                name: `${campaign.name} - Игра`,
                description: `Игра по кампании "${campaign.name}"`,
                max_players: campaign.max_players
            });

            // Присоединяемся к новой игре с выбранным персонажем
            await gameService.joinGame(newGame.id, { character_id: characterId });

            return { gameId: newGame.id, isNew: true };
        },
        {
            onSuccess: (data) => {
                setIsCharacterModalOpen(false);
                setSelectedCharacter(null);

                if (data.isNew) {
                    toast.success('Игра создана! Переходим к игре...');
                } else {
                    toast.success('Подключаемся к существующей игре...');
                }

                // Переходим к игре через секунду для лучшего UX
                setTimeout(() => {
                    navigate(`/game/${data.gameId}`);
                }, 1000);
            },
            onError: (error: any) => {
                console.error('Error starting game:', error);
                toast.error(error.response?.data?.detail || 'Ошибка при запуске игры');
                setIsCharacterModalOpen(false);
                setSelectedCharacter(null);
            },
        }
    );

    // ✅ НОВАЯ ФУНКЦИЯ: Обработка клика по кнопке "Начать игру"
    const handleStartGameClick = () => {
        setIsCharacterModalOpen(true);
    };

    // ✅ НОВАЯ ФУНКЦИЯ: Обработка выбора персонажа
    const handleCharacterSelected = (character: CharacterResponse) => {
        setSelectedCharacter(character);
        startGameMutation.mutate({ characterId: character.id });
    };

    if (isLoading) return <LoadingScreen />;
    if (error || !campaign) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Кампания не найдена
                    </h2>
                    <Button onClick={() => navigate('/campaigns')}>
                        Вернуться к кампаниям
                    </Button>
                </div>
            </div>
        );
    }

    // ✅ ИСПРАВЛЕНИЕ: Безопасная проверка players
    const isCreator = user?.id === campaign.creator_id;
    const campaignPlayers = Array.isArray(campaign?.players) ? campaign.players : [];
    const isPlayer = campaignPlayers.includes(user?.id || '');
    const currentPlayers = typeof campaign?.current_players === 'number' ? campaign.current_players : 0;
    const maxPlayers = typeof campaign?.max_players === 'number' ? campaign.max_players : 6;
    const canJoin = !isPlayer && !isCreator && currentPlayers < maxPlayers;

    const getStatusBadge = (status: string) => {
        const styles = {
            planning: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
            active: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
            waiting: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
            on_hold: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
            completed: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
            archived: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
        };

        const labels = {
            planning: 'Планирование',
            active: 'Активна',
            waiting: 'Ожидание',
            on_hold: 'Приостановлена',
            completed: 'Завершена',
            archived: 'Архивирована',
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.planning}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/campaigns')}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Вернуться к кампаниям
                        </Button>

                        <div className="flex items-center gap-3">
                            {/* Кнопки для создателя */}
                            {isCreator && (
                                <>
                                    <Link to={`/campaigns/${id}/edit`}>
                                        <Button variant="outline" className="flex items-center gap-2">
                                            <PencilIcon className="w-4 h-4" />
                                            Редактировать
                                        </Button>
                                    </Link>

                                    {/* ✅ ОБНОВЛЕННАЯ КНОПКА "Начать игру" с выбором персонажа */}
                                    <Button
                                        variant="primary"
                                        className="flex items-center gap-2"
                                        onClick={handleStartGameClick}
                                        disabled={startGameMutation.isLoading}
                                    >
                                        {startGameMutation.isLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                Запуск...
                                            </>
                                        ) : (
                                            <>
                                                <PlayIcon className="w-4 h-4" />
                                                Начать игру
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}

                            {/* Кнопка присоединения для других пользователей */}
                            {canJoin && (
                                <Button
                                    variant="primary"
                                    onClick={() => joinMutation.mutate()}
                                    disabled={joinMutation.isLoading}
                                    className="flex items-center gap-2"
                                >
                                    {joinMutation.isLoading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    ) : (
                                        <UserPlusIcon className="w-4 h-4" />
                                    )}
                                    Присоединиться
                                </Button>
                            )}

                            {/* ✅ ОБНОВЛЕННАЯ КНОПКА для игроков - перейти к игре с выбором персонажа */}
                            {isPlayer && !isCreator && (
                                <Button
                                    variant="primary"
                                    className="flex items-center gap-2"
                                    onClick={handleStartGameClick}
                                    disabled={startGameMutation.isLoading}
                                >
                                    {startGameMutation.isLoading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    ) : (
                                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                    )}
                                    Перейти к игре
                                </Button>
                            )}

                            {/* Кнопка удаления для создателя */}
                            {isCreator && (
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => {
                                        if (window.confirm('Вы уверены, что хотите архивировать эту кампанию?'))
                                            deleteMutation.mutate();
                                    }}
                                    disabled={deleteMutation.isLoading}
                                    className="flex items-center gap-2"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    {deleteMutation.isLoading ? 'Удаление...' : 'Архивировать'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Campaign Title & Status */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {campaign.name}
                            </h1>
                            <div className="flex items-center gap-4 mt-2">
                                {getStatusBadge(campaign.status)}
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Создана {formatDate(campaign.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Campaign Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        {campaign.description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpenIcon className="w-5 h-5" />
                                        Описание
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {campaign.description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* World Description */}
                        {campaign.world_description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPinIcon className="w-5 h-5" />
                                        Игровой мир
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {campaign.world_description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* House Rules */}
                        {campaign.house_rules && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CogIcon className="w-5 h-5" />
                                        Домашние правила
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {campaign.house_rules}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Campaign Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UsersIcon className="w-5 h-5" />
                                    Информация о кампании
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Создатель
                                    </dt>
                                    <dd className="text-sm text-gray-900 dark:text-white">
                                        {campaign.creator_username || 'Неизвестен'}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Сеттинг
                                    </dt>
                                    <dd className="text-sm text-gray-900 dark:text-white">
                                        {campaign.setting || 'Не указан'}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Игроки
                                    </dt>
                                    <dd className="text-sm text-gray-900 dark:text-white">
                                        {currentPlayers} / {maxPlayers}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Начальный уровень
                                    </dt>
                                    <dd className="text-sm text-gray-900 dark:text-white">
                                        {campaign.starting_level || 1} уровень
                                    </dd>
                                </div>

                                {campaign.ai_style && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Стиль ИИ-мастера
                                        </dt>
                                        <dd className="text-sm text-gray-900 dark:text-white">
                                            {campaign.ai_style === 'balanced' ? 'Сбалансированный' :
                                                campaign.ai_style === 'serious' ? 'Серьезный' :
                                                    campaign.ai_style === 'humorous' ? 'Юмористический' :
                                                        campaign.ai_style === 'dramatic' ? 'Драматический' :
                                                            campaign.ai_style}
                                        </dd>
                                    </div>
                                )}

                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Статус
                                    </dt>
                                    <dd className="text-sm">
                                        {getStatusBadge(campaign.status)}
                                    </dd>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Game Settings */}
                        {campaign.settings && Object.keys(campaign.settings).length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CogIcon className="w-5 h-5" />
                                        Настройки игры
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        {campaign.settings.milestone_leveling !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Развитие по вехам
                                                </span>
                                                <span className="text-gray-900 dark:text-white">
                                                    {campaign.settings.milestone_leveling ? 'Да' : 'Нет'}
                                                </span>
                                            </div>
                                        )}
                                        {campaign.settings.allow_homebrew !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Homebrew контент
                                                </span>
                                                <span className="text-gray-900 dark:text-white">
                                                    {campaign.settings.allow_homebrew ? 'Разрешен' : 'Запрещен'}
                                                </span>
                                            </div>
                                        )}
                                        {campaign.settings.pvp_allowed !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    PvP
                                                </span>
                                                <span className="text-gray-900 dark:text-white">
                                                    {campaign.settings.pvp_allowed ? 'Разрешен' : 'Запрещен'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Быстрые действия</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {isCreator && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start"
                                            asChild
                                        >
                                            <Link to={`/campaigns/${id}/edit`}>
                                                <PencilIcon className="w-4 h-4 mr-2" />
                                                Редактировать кампанию
                                            </Link>
                                        </Button>
                                    </>
                                )}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => window.open(`/characters/create`, '_blank')}
                                >
                                    <UserPlusIcon className="w-4 h-4 mr-2" />
                                    Создать персонажа
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* ✅ МОДАЛЬНОЕ ОКНО ВЫБОРА ПЕРСОНАЖА */}
            <CharacterSelectionModal
                isOpen={isCharacterModalOpen}
                onClose={() => {
                    setIsCharacterModalOpen(false);
                    setSelectedCharacter(null);
                }}
                onCharacterSelected={handleCharacterSelected}
                campaignName={campaign.name}
                loading={startGameMutation.isLoading}
            />
        </>
    );
};

export default CampaignDetailPage;