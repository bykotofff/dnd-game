import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    HomeIcon,
    UserGroupIcon,
    MapIcon,
    Cog6ToothIcon,
    PlayIcon,
    PlusIcon,
    BookOpenIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import {
    HomeIcon as HomeSolidIcon,
    UserGroupIcon as UserGroupSolidIcon,
    MapIcon as MapSolidIcon,
    Cog6ToothIcon as CogSolidIcon,
    PlayIcon as PlaySolidIcon,
    BookOpenIcon as BookSolidIcon,
} from '@heroicons/react/24/solid';

import { useAuth } from '@/store/authStore';
import { cn } from '@/utils';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NavigationItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    activeIcon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    adminOnly?: boolean;
}

const navigation: NavigationItem[] = [
    {
        name: 'Главная',
        href: '/dashboard',
        icon: HomeIcon,
        activeIcon: HomeSolidIcon,
    },
    {
        name: 'Персонажи',
        href: '/characters',
        icon: UserGroupIcon,
        activeIcon: UserGroupSolidIcon,
    },
    {
        name: 'Кампании',
        href: '/campaigns',
        icon: MapIcon,
        activeIcon: MapSolidIcon,
    },
    {
        name: 'Библиотека',
        href: '/library',
        icon: BookOpenIcon,
        activeIcon: BookSolidIcon,
    },
];

const quickActions = [
    {
        name: 'Создать персонажа',
        href: '/characters/create',
        icon: PlusIcon,
        color: 'text-green-600 dark:text-green-400',
    },
    {
        name: 'Присоединиться к игре',
        href: '/games/join',
        icon: PlayIcon,
        color: 'text-blue-600 dark:text-blue-400',
    },
    {
        name: 'Генератор портретов',
        href: '/tools/portrait-generator',
        icon: SparklesIcon,
        color: 'text-purple-600 dark:text-purple-400',
    },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { user } = useAuth();

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return location.pathname === '/dashboard' || location.pathname === '/';
        }
        return location.pathname.startsWith(href);
    };

    const sidebarVariants = {
        open: {
            x: 0,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 40,
            },
        },
        closed: {
            x: '-100%',
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 40,
            },
        },
    };

    return (
        <>
            {/* Desktop sidebar */}
            <div className="hidden lg:flex lg:flex-shrink-0">
                <div className="flex flex-col w-64">
                    <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 pt-5 pb-4 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
                        <SidebarContent
                            navigation={navigation}
                            quickActions={quickActions}
                            isActive={isActive}
                            user={user}
                            onClose={onClose}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile sidebar */}
            <motion.div
                initial="closed"
                animate={isOpen ? 'open' : 'closed'}
                variants={sidebarVariants}
                className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
            >
                <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
                    <SidebarContent
                        navigation={navigation}
                        quickActions={quickActions}
                        isActive={isActive}
                        user={user}
                        onClose={onClose}
                    />
                </div>
            </motion.div>
        </>
    );
};

interface SidebarContentProps {
    navigation: NavigationItem[];
    quickActions: any[];
    isActive: (href: string) => boolean;
    user: any;
    onClose: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
                                                           navigation,
                                                           quickActions,
                                                           isActive,
                                                           user,
                                                           onClose,
                                                       }) => {
    return (
        <>
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4 mb-8">
                <Link to="/dashboard" className="flex items-center space-x-3" onClick={onClose}>
                    <span className="text-3xl">⚔️</span>
                    <div>
                        <h1 className="font-fantasy font-bold text-xl text-primary-600 dark:text-primary-400">
                            D&D AI Game
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Powered by AI
                        </p>
                    </div>
                </Link>
            </div>

            {/* User info */}
            <div className="px-4 mb-6">
                <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            {user?.avatar_url ? (
                                <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={user.avatar_url}
                                    alt={user.display_name || user.username}
                                />
                            ) : (
                                <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {(user?.display_name || user?.username || 'U').charAt(0).toUpperCase()}
                  </span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {user?.display_name || user?.username}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Игр сыграно: {user?.games_played || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 space-y-1">
                <div className="mb-6">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Навигация
                    </h3>
                    {navigation.map((item) => {
                        if (item.adminOnly && !user?.is_admin) return null;

                        const IconComponent = isActive(item.href) ? item.activeIcon : item.icon;

                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={onClose}
                                className={cn(
                                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    isActive(item.href)
                                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                )}
                            >
                                <IconComponent
                                    className={cn(
                                        'mr-3 h-5 w-5 flex-shrink-0',
                                        isActive(item.href)
                                            ? 'text-primary-500 dark:text-primary-400'
                                            : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                                    )}
                                />
                                {item.name}
                                {item.badge && (
                                    <span className="ml-auto bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-full px-2 py-1">
                    {item.badge}
                  </span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Quick Actions */}
                <div className="mb-6">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Быстрые действия
                    </h3>
                    {quickActions.map((action) => (
                        <Link
                            key={action.name}
                            to={action.href}
                            onClick={onClose}
                            className="group flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <action.icon
                                className={cn(
                                    'mr-3 h-4 w-4 flex-shrink-0',
                                    action.color
                                )}
                            />
                            {action.name}
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Settings */}
            <div className="flex-shrink-0 px-2 pb-4">
                <Link
                    to="/settings"
                    onClick={onClose}
                    className="group flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <Cog6ToothIcon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400" />
                    Настройки
                </Link>
            </div>
        </>
    );
};

export default Sidebar;