import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

    // Queries for different tabs - исправлены для TanStack Query v5
    const { data: allCampaigns, isLoading: allLoading } = useQuery({
        queryKey: ['campaigns', 'all', filters],
        queryFn: () => campaignService.getCampaigns(filters),
        enabled: activeTab === 'all',
        staleTime: 2 * 60 * 1000,
    });

    const { data: myCampaigns, isLoading: myLoading } = useQuery({
        queryKey: ['campaigns', 'my'],
        queryFn: () => campaignService.getMyCampaigns(),
        enabled: activeTab === 'my',
        staleTime: 2 * 60 * 1000,
    });

    const { data: publicCampaigns, isLoading: publicLoading } = useQuery({
        queryKey: ['campaigns', 'public'],
        queryFn: () => campaignService.getPublicCampaigns(),
        enabled: activeTab === 'public',
        staleTime: 2 * 60 * 1000,
    });

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

    const filteredCampaigns = getCurrentData().filter((campaign: CampaignResponse) =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (getCurrentLoading()) {
        return <LoadingScreen />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Кампании
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Присоединяйтесь к приключениям или создайте свою собственную кампанию
                    </p>
                </div>
                <Link to="/campaigns/create">
                    <Button className="flex items-center gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Создать кампанию
                    </Button>
                </Link>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                placeholder="Поиск кампаний..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline" className="flex items-center gap-2">
                            <FunnelIcon className="w-4 h-4" />
                            Фильтры
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { key: 'all', label: 'Все кампании', icon: GlobeAltIcon },
                        { key: 'my', label: 'Мои кампании', icon: UsersIcon },
                        { key: 'public', label: 'Публичные', icon: StarIcon },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key as any)}
                            className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === key
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            <Icon className="w-5 h-5 mr-2" />
                            {label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Campaigns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.length === 0 ? (
                    <div className="col-span-full">
                        <Card>
                            <CardContent className="p-12 text-center">
                                <GlobeAltIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    Кампаний не найдено
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    {searchQuery
                                        ? 'Попробуйте изменить поисковый запрос'
                                        : 'Создайте свою первую кампанию'}
                                </p>
                                <Link to="/campaigns/create">
                                    <Button>
                                        <PlusIcon className="w-4 h-4 mr-2" />
                                        Создать кампанию
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    filteredCampaigns.map((campaign: CampaignResponse, index: number) => (
                        <motion.div
                            key={campaign.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="hover:shadow-lg transition-shadow duration-200 h-full">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg font-semibold line-clamp-1">
                                                {campaign.name}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    campaign.is_public
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {campaign.is_public ? (
                                                        <GlobeAltIcon className="w-3 h-3 mr-1" />
                                                    ) : (
                                                        <LockClosedIcon className="w-3 h-3 mr-1" />
                                                    )}
                                                    {campaign.is_public ? 'Публичная' : 'Приватная'}
                                                </span>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                    <UsersIcon className="w-3 h-3 mr-1" />
                                                    {campaign.current_players}/{campaign.max_players}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">
                                        {campaign.description || 'Описание отсутствует'}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <CalendarIcon className="w-4 h-4 mr-1" />
                                            {new Date(campaign.created_at).toLocaleDateString('ru-RU')}
                                        </div>
                                        <Link to={`/campaigns/${campaign.id}`}>
                                            <Button size="sm">
                                                Подробнее
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CampaignsPage;