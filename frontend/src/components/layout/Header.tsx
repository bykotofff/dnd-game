import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
    Bars3Icon,
    BellIcon,
    MagnifyingGlassIcon,
    UserCircleIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    SunIcon,
    MoonIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

import { useAuth, useAuthActions } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const { user } = useAuth();
    const { logout } = useAuthActions();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(
        document.documentElement.classList.contains('dark')
    );

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Вы вышли из системы');
            navigate('/login');
        } catch (error) {
            toast.error('Ошибка при выходе');
        }
    };

    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);

        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // TODO: Implement search functionality
            toast.info(`Поиск: ${searchQuery}`);
        }
    };

    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left side */}
                    <div className="flex items-center space-x-4">
                        {/* Mobile menu button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={onMenuClick}
                        >
                            <Bars3Icon className="h-6 w-6" />
                        </Button>

                        {/* Logo - only show on mobile when sidebar is closed */}
                        <Link
                            to="/dashboard"
                            className="lg:hidden flex items-center space-x-2"
                        >
                            <span className="text-2xl">⚔️</span>
                            <span className="font-fantasy font-bold text-xl text-primary-600 dark:text-primary-400">
                D&D
              </span>
                        </Link>

                        {/* Search bar - hidden on mobile */}
                        <form
                            onSubmit={handleSearch}
                            className="hidden md:block flex-1 max-w-lg"
                        >
                            <Input
                                type="text"
                                placeholder="Поиск персонажей, кампаний..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
                                className="w-full"
                            />
                        </form>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center space-x-4">
                        {/* Theme toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            {isDarkMode ? (
                                <SunIcon className="h-5 w-5" />
                            ) : (
                                <MoonIcon className="h-5 w-5" />
                            )}
                        </Button>

                        {/* Notifications */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative"
                        >
                            <BellIcon className="h-6 w-6" />
                            {/* Notification badge */}
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
                        </Button>

                        {/* User menu */}
                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                                <span className="sr-only">Открыть меню пользователя</span>
                                {user?.avatar_url ? (
                                    <img
                                        className="h-8 w-8 rounded-full object-cover"
                                        src={user.avatar_url}
                                        alt={user.display_name || user.username}
                                    />
                                ) : (
                                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                                )}
                                <span className="hidden lg:block text-gray-700 dark:text-gray-300 font-medium">
                  {user?.display_name || user?.username}
                </span>
                            </Menu.Button>

                            <Transition
                                as={React.Fragment}
                                enter="transition ease-out duration-200"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {user?.display_name || user?.username}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {user?.email}
                                        </p>
                                    </div>

                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link
                                                to="/profile"
                                                className={cn(
                                                    'flex items-center px-4 py-2 text-sm',
                                                    active
                                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                        : 'text-gray-700 dark:text-gray-300'
                                                )}
                                            >
                                                <UserCircleIcon className="h-4 w-4 mr-3" />
                                                Профиль
                                            </Link>
                                        )}
                                    </Menu.Item>

                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link
                                                to="/settings"
                                                className={cn(
                                                    'flex items-center px-4 py-2 text-sm',
                                                    active
                                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                        : 'text-gray-700 dark:text-gray-300'
                                                )}
                                            >
                                                <Cog6ToothIcon className="h-4 w-4 mr-3" />
                                                Настройки
                                            </Link>
                                        )}
                                    </Menu.Item>

                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={handleLogout}
                                                    className={cn(
                                                        'flex items-center w-full px-4 py-2 text-sm text-left',
                                                        active
                                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                            : 'text-gray-700 dark:text-gray-300'
                                                    )}
                                                >
                                                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                                                    Выйти
                                                </button>
                                            )}
                                        </Menu.Item>
                                    </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    </div>
                </div>
            </div>

            {/* Mobile search bar */}
            <div className="md:hidden px-4 pb-4">
                <form onSubmit={handleSearch}>
                    <Input
                        type="text"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
                    />
                </form>
            </div>
        </header>
    );
};

export default Header;