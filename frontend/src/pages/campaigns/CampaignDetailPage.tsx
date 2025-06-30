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

    const isCreator = user?.id === campaign.creator_id;
    // ✅ ИСПРАВЛЕНИЕ: Добавляем проверку на undefined для players
    const campaignPlayers = campaign.players || [];
    const isPlayer = campaignPlayers.includes(user?.id || '');
    const canJoin = !isPlayer && !isCreator && (campaign.current_players || 0) < campaign.max_players;

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

    const getAiStyleEmoji = (style: string) => {
        const emojis = {
            balanced: '⚖️',
            serious: '🎭',
            humorous: '😄',
            dramatic: '🎬',
        };
        return emojis[style as keyof typeof emojis] || '⚖️';
    };

    const tabs = [
        { id: 'overview', name: 'Обзор', icon: BookOpenIcon },
        { id: 'world', name: 'Мир', icon: GlobeAltIcon },
        { id: 'players', name: 'Игроки', icon: UsersIcon },
        ...(isCreator ? [{ id: 'settings', name: 'Настройки', icon: CogIcon }] : [])
    ] as const;

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

                    <div className="flex items-center gap-2">
                        {isCreator && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/campaigns/${id}/edit`)}
                                >
                                    <PencilIcon className="w-4 h-4 mr-2" />
                                    Редактировать
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => {
                                        if (window.confirm('Вы уверены, что хотите архивировать эту кампанию?')) {
                                            deleteMutation.mutate();
                                        }
                                    }}
                                    loading={deleteMutation.isLoading}
                                >
                                    <TrashIcon className="w-4 h-4 mr-2" />
                                    Архивировать
                                </Button>
                            </>
                        )}

                        {canJoin && (
                            <Button
                                variant="primary"
                                onClick={() => joinMutation.mutate()}
                                loading={joinMutation.isLoading}
                            >
                                <UserPlusIcon className="w-4 h-4 mr-2" />
                                Присоединиться
                            </Button>
                        )}

                        {(isCreator || isPlayer) && campaign.status === 'active' && (
                            <Button
                                variant="success"
                                onClick={() => navigate(`/game/${campaign.id}`)}
                            >
                                <PlayIcon className="w-4 h-4 mr-2" />
                                Играть
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
                                    {campaign.current_players || 0}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    из {campaign.max_players} игроков
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
                                    {getAiStyleEmoji(campaign.ai_style || 'balanced')}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    ИИ {campaign.ai_style || 'balanced'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                                        ${isActive
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    }
                                    `}
                                >
                                    <Icon className="w-5 h-5" />
                                    {tab.name}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Main Story */}
                        {campaign.main_story && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpenIcon className="w-5 h-5" />
                                        Основная история
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                        {campaign.main_story}
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
                                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                        {campaign.house_rules}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* AI Personality */}
                        {campaign.ai_personality && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <SparklesIcon className="w-5 h-5" />
                                        Личность ИИ мастера
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                        {campaign.ai_personality}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Campaign Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5" />
                                    Информация о кампании
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Создана:</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {formatDate(campaign.created_at)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Статус:</span>
                                    <span>{getStatusBadge(campaign.status)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Тип:</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {campaign.is_public ? 'Публичная' : 'Приватная'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Требует одобрения:</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {campaign.requires_approval ? 'Да' : 'Нет'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'world' && (
                    <div className="space-y-6">
                        {campaign.world_description ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <GlobeAltIcon className="w-5 h-5" />
                                        Описание мира
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                        {campaign.world_description}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="text-center py-12">
                                <GlobeAltIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    Описание мира не добавлено
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {isCreator
                                        ? 'Добавьте описание мира в настройках кампании'
                                        : 'Мастер ещё не добавил описание мира'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'players' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <UsersIcon className="w-5 h-5" />
                                        Игроки ({(campaign.current_players || 0)} из {campaign.max_players})
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {campaignPlayers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {campaignPlayers.map((playerId, index) => (
                                            <div
                                                key={playerId}
                                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                            >
                                                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                                                        {index + 1}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        Игрок {index + 1}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        ID: {playerId.substring(0, 8)}...
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                            Пока нет игроков
                                        </h3>
                                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                                            Кампания ждёт первых участников
                                        </p>
                                        {canJoin && (
                                            <Button
                                                onClick={() => joinMutation.mutate()}
                                                loading={joinMutation.isLoading}
                                            >
                                                <UserPlusIcon className="w-4 h-4 mr-2" />
                                                Стать первым игроком
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'settings' && isCreator && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CogIcon className="w-5 h-5" />
                                    Настройки кампании
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate(`/campaigns/${id}/edit`)}
                                    >
                                        <PencilIcon className="w-4 h-4 mr-2" />
                                        Редактировать кампанию
                                    </Button>

                                    <Button
                                        variant="danger"
                                        onClick={() => {
                                            if (window.confirm('Вы уверены, что хотите архивировать эту кампанию? Это действие нельзя отменить.')) {
                                                deleteMutation.mutate();
                                            }
                                        }}
                                        loading={deleteMutation.isLoading}
                                    >
                                        <TrashIcon className="w-4 h-4 mr-2" />
                                        Архивировать кампанию
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default CampaignDetailPage;