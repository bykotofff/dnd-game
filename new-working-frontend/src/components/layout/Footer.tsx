import React from 'react';
import { Link } from 'react-router-dom';
import {
    HeartIcon,
    CodeBracketIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="md:flex md:items-center md:justify-between">
                    {/* Left side - Copyright and love */}
                    <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <span>© {currentYear} D&D AI Game</span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                <span>Сделано с</span>
                <HeartIcon className="h-4 w-4 text-red-500" />
                <span>для любителей D&D</span>
              </span>
                        </div>

                        {/* Tech stack badge */}
                        <div className="flex items-center space-x-1 text-xs text-gray-400 dark:text-gray-500">
                            <CodeBracketIcon className="h-4 w-4" />
                            <span>React + TypeScript + AI</span>
                        </div>
                    </div>

                    {/* Right side - Links */}
                    <div className="mt-4 md:mt-0">
                        <div className="flex space-x-6">
                            <Link
                                to="/about"
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                О проекте
                            </Link>
                            <Link
                                to="/help"
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Помощь
                            </Link>
                            <Link
                                to="/rules"
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Правила
                            </Link>
                            <a
                                href="https://github.com/bykotofff/dnd-game"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center space-x-1"
                            >
                                <GlobeAltIcon className="h-4 w-4" />
                                <span>GitHub</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Additional info */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            D&D AI Game использует искусственный интеллект для создания уникального игрового опыта.
                            Не является официальным продуктом Wizards of the Coast.
                        </p>

                        {/* Status indicators */}
                        <div className="flex items-center space-x-4 text-xs">
                            <div className="flex items-center space-x-1">
                                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                <span className="text-gray-500 dark:text-gray-400">Сервер онлайн</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                <span className="text-gray-500 dark:text-gray-400">ИИ активен</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;