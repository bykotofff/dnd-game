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
    const isPlayer = campaign.players.includes(user?.id || '');
    const canJoin = !isPlayer && !isCreator && campaign.current_players < campaign.max_players;

    const getStatusBadge = (status: string) => {
        const styles = {
            planning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            active: 'bg-green-100 text-green-800 border-green-200',
            waiting: 'bg-blue-100 text-blue-800 border-blue-200',
            on_hold: 'bg-gray-100 text-gray-800 border-gray-200',
            completed: 'bg-purple-100 text-purple-800 border-purple-200',
            archived: 'bg-red-100 text-red-800 border-red-200',
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
        ...(isCreator ? [{ id: 'settings', name: 'Настройки', icon: CogIcon }] : []),
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/campaigns')}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Назад к кампаниям
                </button>

                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {campaign.name}
                            </h1>
                            {campaign.is_public ? (
                                <GlobeAltIcon className="w-6 h-6 text-green-500" title="Публичная" />
                            ) : (
                                <LockClosedIcon className="w-6 h-6 text-gray-400" title="Приватная" />
                            )}
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            {getStatusBadge(campaign.status)}
                            {campaign.setting && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    {campaign.setting}
                                </span>
                            )}
                        </div>

                        {campaign.description && (
                            <p className="text-gray-600 dark:text-gray-400 text-lg">
                                {campaign.description}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {isCreator ? (
                            <>
                                <Link to={`/campaigns/${campaign.id}/edit`}>
                                    <Button variant="outline" className="flex items-center gap-2">
                                        <PencilIcon className="w-4 h-4" />
                                        Редактировать
                                    </Button>
                                </Link>
                                <Button
                                    variant="primary"
                                    className="flex items-center gap-2"
                                    onClick={() => navigate(`/games/create?campaign=${campaign.id}`)}
                                >
                                    <PlayIcon className="w-4 h-4" />
                                    Начать игру
                                </Button>
                            </>
                        ) : canJoin ? (
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
                        ) : isPlayer ? (
                            <Button
                                variant="primary"
                                className="flex items-center gap-2"
                                onClick={() => navigate(`/games?campaign=${campaign.id}`)}
                            >
                                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                Перейти к игре
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <UsersIcon className="w-8 h-8 text-blue-500" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Игроки
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {campaign.current_players}/{campaign.max_players}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <StarIcon className="w-8 h-8 text-amber-500" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Уровень
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {campaign.starting_level}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <SparklesIcon className="w-8 h-8 text-purple-500" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    ИИ Стиль
                                </p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {getAiStyleEmoji(campaign.ai_style)}
                                    {campaign.ai_style}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <CalendarIcon className="w-8 h-8 text-green-500" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Создана
                                </p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {formatDate(campaign.created_at)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.id
                                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {campaign.main_story && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Основная история</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {campaign.main_story}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {campaign.house_rules && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Домашние правила</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {campaign.house_rules}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>ИИ-Мастер</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Стиль:</span>
                                            <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                {getAiStyleEmoji(campaign.ai_style)}
                                                {campaign.ai_style}
                                            </span>
                                        </div>
                                        {campaign.ai_personality && (
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400 block mb-2">Личность:</span>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    {campaign.ai_personality}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Настройки доступа</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Публичная:</span>
                                            <span className={`flex items-center gap-2 ${campaign.is_public ? 'text-green-600' : 'text-gray-400'}`}>
                                                {campaign.is_public ? <GlobeAltIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                                                {campaign.is_public ? 'Да' : 'Нет'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Требует одобрение:</span>
                                            <span className="text-gray-900 dark:text-white">
                                                {campaign.requires_approval ? 'Да' : 'Нет'}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* World Tab */}
                {activeTab === 'world' && (
                    <div className="max-w-4xl">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GlobeAltIcon className="w-5 h-5" />
                                    Описание мира
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {campaign.world_description ? (
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {campaign.world_description}
                                    </p>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 italic">
                                        Описание мира еще не добавлено
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Players Tab */}
                {activeTab === 'players' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* TODO: Здесь будет список игроков с персонажами */}
                        <Card>
                            <CardContent className="p-6 text-center">
                                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    Игроки будут отображены здесь
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Список игроков и их персонажей будет реализован в следующих версиях
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Settings Tab (только для создателей) */}
                {activeTab === 'settings' && isCreator && (
                    <div className="max-w-2xl space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-red-600 dark:text-red-400">
                                    Опасная зона
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                            Архивировать кампанию
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            Архивирование скроет кампанию от других игроков. Это действие можно отменить.
                                        </p>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                if (confirm('Вы уверены, что хотите архивировать кампанию?')) {
                                                    deleteMutation.mutate();
                                                }
                                            }}
                                            disabled={deleteMutation.isLoading}
                                            className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            {deleteMutation.isLoading ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                                            ) : (
                                                <TrashIcon className="w-4 h-4" />
                                            )}
                                            Архивировать
                                        </Button>
                                    </div>
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