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
import { CharacterSelectionModal } from '@/components/CharacterSelectionModal';
import { campaignService } from '@/services/campaignService';
import { gameService } from '@/services/gameService';
import { useAuthStore } from '@/store/authStore';
import type { CharacterResponse } from '@/types/character';

const CampaignDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Состояние для модального окна выбора персонажа
    const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState<CharacterResponse | null>(null);

    // Загрузка данных кампании
    const {
        data: campaign,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['campaign', id],
        queryFn: () => campaignService.getCampaign(id!),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });

    // Присоединение к кампании
    const joinMutation = useMutation({
        mutationFn: () => campaignService.joinCampaign(id!),
        onSuccess: () => {
            toast.success('Заявка на присоединение отправлена!');
            queryClient.invalidateQueries({ queryKey: ['campaign', id] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Ошибка при присоединении к кампании');
        },
    });

    // Удаление кампании
    const deleteMutation = useMutation({
        mutationFn: () => campaignService.deleteCampaign(id!),
        onSuccess: () => {
            toast.success('Кампания удалена');
            navigate('/campaigns');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Ошибка при удалении кампании');
        },
    });

    // Начало игры
    const startGameMutation = useMutation({
        mutationFn: (characterId: string) => gameService.startGame({
            campaign_id: id!,
            character_id: characterId,
        }),
        onSuccess: (gameData) => {
            toast.success('Игра начинается!');
            navigate(`/game/${gameData.id}`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Ошибка при запуске игры');
        },
    });

    const handleStartGame = () => {
        setIsCharacterModalOpen(true);
    };

    const handleCharacterSelected = (character: CharacterResponse) => {
        setSelectedCharacter(character);
        setIsCharacterModalOpen(false);
        startGameMutation.mutate(character.id);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            active: { text: 'Активная', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
            planning: { text: 'Планирование', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
            paused: { text: 'Приостановлена', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
            completed: { text: 'Завершена', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
            recruiting: { text: 'Набор игроков', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planning;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                {config.text}
            </span>
        );
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error || !campaign) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Card>
                    <CardContent className="p-6 text-center">
                        <div className="text-red-600">
                            Ошибка при загрузке кампании
                        </div>
                        <Link to="/campaigns">
                            <Button className="mt-4">
                                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                Вернуться к кампаниям
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Определяем роли пользователя
    const isCreator = user?.id === campaign.creator_id;
    const playersList = campaign.players || [];
    const isParticipant = playersList.includes(user?.id || '');
    const canStartGame = isCreator || isParticipant;

    return (
        <>
            <div className="max-w-6xl mx-auto p-6 space-y-6">
                {/* Header */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <Link to="/campaigns">
                                <Button variant="outline" size="sm">
                                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                    Назад к кампаниям
                                </Button>
                            </Link>

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
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                if (window.confirm('Вы уверены, что хотите удалить эту кампанию?')) {
                                                    deleteMutation.mutate();
                                                }
                                            }}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <TrashIcon className="w-4 h-4 mr-2" />
                                            {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
                                        </Button>
                                    </>
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
                                    {getStatusBadge(campaign.status || 'planning')}
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Создана {formatDate(campaign.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

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

                        {/* Players */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UsersIcon className="w-5 h-5" />
                                    Участники ({campaign.current_players || 0}/{campaign.max_players})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {playersList.length > 0 ? (
                                    <div className="space-y-3">
                                        {/* Создатель кампании */}
                                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                                        {campaign.dm_user?.display_name?.[0] || campaign.dm_user?.username?.[0] || 'D'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {campaign.dm_user?.display_name || campaign.dm_user?.username || 'Ведущий'}
                                                    </p>
                                                    <p className="text-sm text-purple-600 dark:text-purple-400">
                                                        Мастер игры
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 px-2 py-1 rounded-full">
                                                Ведущий
                                            </span>
                                        </div>

                                        {/* Обычные игроки */}
                                        {playersList.map((playerId, index) => (
                                            <div key={playerId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                            {index + 1}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            Игрок {index + 1}
                                                        </p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            Персонаж не выбран
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                                                    Игрок
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <UsersIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                                            Пока нет участников
                                        </p>
                                        {!isParticipant && !isCreator && (
                                            <Button
                                                onClick={() => joinMutation.mutate()}
                                                disabled={joinMutation.isPending}
                                                size="sm"
                                            >
                                                <UserPlusIcon className="w-4 h-4 mr-2" />
                                                {joinMutation.isPending ? 'Отправка...' : 'Присоединиться'}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Campaign Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CogIcon className="w-5 h-5" />
                                    Информация о кампании
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Ведущий</h4>
                                    <p className="text-gray-900 dark:text-white">
                                        {campaign.dm_user?.display_name || campaign.dm_user?.username || 'Не указан'}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Тип кампании</h4>
                                    <p className="text-gray-900 dark:text-white">
                                        {campaign.is_public ? 'Публичная' : 'Приватная'}
                                    </p>
                                </div>

                                {campaign.setting && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Сеттинг</h4>
                                        <p className="text-gray-900 dark:text-white capitalize">
                                            {campaign.setting === 'fantasy' ? 'Фэнтези' : campaign.setting}
                                        </p>
                                    </div>
                                )}

                                {campaign.starting_level && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Стартовый уровень</h4>
                                        <p className="text-gray-900 dark:text-white">
                                            {campaign.starting_level} уровень
                                        </p>
                                    </div>
                                )}

                                {campaign.allow_homebrew !== undefined && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Homebrew контент</h4>
                                        <p className="text-gray-900 dark:text-white">
                                            {campaign.allow_homebrew ? 'Разрешен' : 'Запрещен'}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Действия</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {canStartGame ? (
                                    <Button
                                        onClick={handleStartGame}
                                        disabled={startGameMutation.isPending}
                                        className="w-full"
                                    >
                                        <PlayIcon className="w-4 h-4 mr-2" />
                                        {startGameMutation.isPending ? 'Запуск...' : 'Начать игру'}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => joinMutation.mutate()}
                                        disabled={joinMutation.isPending}
                                        className="w-full"
                                    >
                                        <UserPlusIcon className="w-4 h-4 mr-2" />
                                        {joinMutation.isPending ? 'Отправка...' : 'Присоединиться'}
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    className="w-full"
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

            {/* Модальное окно выбора персонажа */}
            <CharacterSelectionModal
                isOpen={isCharacterModalOpen}
                onClose={() => {
                    setIsCharacterModalOpen(false);
                    setSelectedCharacter(null);
                }}
                onCharacterSelected={handleCharacterSelected}
                campaignName={campaign.name}
                loading={startGameMutation.isPending}
            />
        </>
    );
};

export default CampaignDetailPage;