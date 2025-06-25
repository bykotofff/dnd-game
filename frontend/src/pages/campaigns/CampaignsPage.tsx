import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    UsersIcon,
    CalendarIcon,
    GlobeAltIcon,
    LockClosedIcon,
    FunnelIcon,
    StarIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { campaignService } from '@/services/campaignService';
import type { CampaignResponse, CampaignFilters } from '@/types';

const CampaignsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'all' | 'my' | 'public'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<CampaignFilters>({});

    // Queries for different tabs
    const { data: allCampaigns, isLoading: allLoading } = useQuery(
        ['campaigns', 'all', filters],
        () => campaignService.getCampaigns(filters),
        {
            enabled: activeTab === 'all',
            staleTime: 2 * 60 * 1000,
        }
    );

    const { data: myCampaigns, isLoading: myLoading } = useQuery(
        ['campaigns', 'my'],
        () => campaignService.getMyCampaigns(),
        {
            enabled: activeTab === 'my',
            staleTime: 2 * 60 * 1000,
        }
    );

    const { data: publicCampaigns, isLoading: publicLoading } = useQuery(
        ['campaigns', 'public'],
        () => campaignService.getPublicCampaigns(),
        {
            enabled: activeTab === 'public',
            staleTime: 2 * 60 * 1000,
        }
    );

    const getCurrentData = () => {
        switch (activeTab) {
            case 'my':
                return myCampaigns || [];
            case 'public':
                return publicCampaigns || [];
            default:
                return allCampaigns || [];
        }
    };

    const getCurrentLoading = () => {
        switch (activeTab) {
            case 'my':
                return myLoading;
            case 'public':
                return publicLoading;
            default:
                return allLoading;
        }
    };

    const filteredCampaigns = getCurrentData().filter(campaign =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (campaign.description && campaign.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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
            month: 'short',
            day: 'numeric',
        });
    };

    if (getCurrentLoading()) {
        return <LoadingScreen />;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Кампании
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Исследуйте миры, созданные ИИ-мастерами
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <Link to="/campaigns/create">
                        <Button variant="primary" className="flex items-center gap-2">
                            <PlusIcon className="w-4 h-4" />
                            Создать кампанию
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'all', label: 'Все кампании', count: allCampaigns?.length },
                        { id: 'my', label: 'Мои кампании', count: myCampaigns?.length },
                        { id: 'public', label: 'Публичные', count: publicCampaigns?.length },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.id
                                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`ml-2 ${
                                    activeTab === tab.id
                                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300'
                                        : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-300'
                                } inline-block py-0.5 px-2 rounded-full text-xs`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Поиск кампаний..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                    <FunnelIcon className="w-4 h-4" />
                    Фильтры
                </Button>
            </div>

            {/* Campaigns Grid */}
            {filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                    <GlobeAltIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {searchQuery ? 'Кампании не найдены' : 'Пока нет кампаний'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {searchQuery
                            ? 'Попробуйте изменить поисковый запрос'
                            : 'Создайте свою первую кампанию или присоединитесь к существующей'
                        }
                    </p>
                    {!searchQuery && (
                        <Link to="/campaigns/create">
                            <Button variant="primary">Создать кампанию</Button>
                        </Link>
                    )}
                </div>
            ) : (
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    {filteredCampaigns.map((campaign) => (
                        <motion.div
                            key={campaign.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Link to={`/campaigns/${campaign.id}`}>
                                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                                                {campaign.name}
                                            </CardTitle>
                                            <div className="flex items-center gap-1 ml-2">
                                                {campaign.is_public ? (
                                                    <GlobeAltIcon className="w-4 h-4 text-green-500" title="Публичная" />
                                                ) : (
                                                    <LockClosedIcon className="w-4 h-4 text-gray-400" title="Приватная" />
                                                )}
                                            </div>
                                        </div>
                                        {campaign.setting && (
                                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                                {campaign.setting}
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        {campaign.description && (
                                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                                                {campaign.description}
                                            </p>
                                        )}

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">Статус:</span>
                                                {getStatusBadge(campaign.status)}
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <UsersIcon className="w-4 h-4" />
                                                    Игроки:
                                                </span>
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {campaign.current_players}/{campaign.max_players}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <StarIcon className="w-4 h-4" />
                                                    Уровень:
                                                </span>
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {campaign.starting_level}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <CalendarIcon className="w-4 h-4" />
                                                    Создана:
                                                </span>
                                                <span className="text-gray-900 dark:text-white">
                                                    {formatDate(campaign.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress bar for player slots */}
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${(campaign.current_players / campaign.max_players) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
};

export default CampaignsPage;