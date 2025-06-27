import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    UsersIcon,
    StarIcon,
    CalendarIcon,
    GlobeAltIcon,
    LockClosedIcon,
    PencilIcon,
    TrashIcon,
    PlayIcon,
    UserPlusIcon,
    ChatBubbleLeftRightIcon,
    CogIcon,
    BookOpenIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { campaignService } from '@/services/campaignService';
import { gameService } from '@/services/gameService';  // ✅ Добавлен импорт
import { useAuthStore } from '@/store/authStore';
import type { CampaignDetailResponse } from '@/services/campaignService';

const CampaignDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'world' | 'players' | 'settings'>('overview');

    const { data: campaign, isLoading, error } = useQuery(
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

    // ✅ НОВАЯ ЛОГИКА: Мутация для запуска игры
    const startGameMutation = useMutation(
        async () => {
            if (!campaign?.id) throw new Error('Campaign ID is required');

            // Сначала ищем существующие игры для этой кампании
            const games = await gameService.getGames({ campaign_id: campaign.id });

            if (games && games.length > 0) {
                // Если игра существует, берем первую активную
                const activeGame = games.find(g => g.status === 'active' || g.status === 'waiting');
                if (activeGame) {
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

            return { gameId: newGame.id, isNew: true };
        },
        {
            onSuccess: (data) => {
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
            },
        }
    );

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

                                {/* ✅ ИСПРАВЛЕННАЯ КНОПКА "Начать игру" */}
                                <Button
                                    variant="primary"
                                    className="flex items-center gap-2"
                                    onClick={() => startGameMutation.mutate()}
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

                        {/* Кнопка для игроков - перейти к игре */}
                        {isPlayer && !isCreator && (
                            <Button
                                variant="primary"
                                className="flex items-center gap-2"
                                onClick={() => startGameMutation.mutate()}
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
                                    if (window.confirm('Вы уверены, что хотите архивировать эту кампанию?')) {
                                        deleteMutation.mutate();
                                    }
                                }}
                                disabled={deleteMutation.isLoading}
                            >
                                <TrashIcon className="w-4 h-4 mr-2" />
                                Архивировать
                            </Button>
                        )}
                    </div>
                </div>

                {/* Campaign Info */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <h1 className="text-3xl font-bold font-fantasy text-gray-900 dark:text-white">
                                {campaign.name}
                            </h1>
                            {getStatusBadge(campaign.status)}
                            {campaign.is_public ? (
                                <GlobeAltIcon className="w-5 h-5 text-green-500" title="Публичная кампания" />
                            ) : (
                                <LockClosedIcon className="w-5 h-5 text-amber-500" title="Приватная кампания" />
                            )}
                        </div>

                        {campaign.description && (
                            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                                {campaign.description}
                            </p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                    {currentPlayers}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    из {maxPlayers} игроков
                                </div>
                            </div>

                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                    {campaign.starting_level}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Стартовый уровень
                                </div>
                            </div>

                            {campaign.setting && (
                                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-lg font-semibold text-primary-600 dark:text-primary-400 truncate">
                                        {campaign.setting}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Сеттинг
                                    </div>
                                </div>
                            )}

                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                                    ⚖️
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    ИИ {campaign.ai_style || 'balanced'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpenIcon className="w-5 h-5" />
                        Детали кампании
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {campaign.main_story && (
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                Основная история
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {campaign.main_story}
                            </p>
                        </div>
                    )}

                    {campaign.world_description && (
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                Описание мира
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {campaign.world_description}
                            </p>
                        </div>
                    )}

                    {campaign.house_rules && (
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                Домашние правила
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {campaign.house_rules}
                            </p>
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Создана:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                    {formatDate(campaign.created_at)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Тип:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                    {campaign.is_public ? 'Публичная' : 'Приватная'}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CampaignDetailPage;