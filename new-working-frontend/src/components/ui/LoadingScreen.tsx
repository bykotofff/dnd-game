import React from 'react';

interface LoadingScreenProps {
    message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
                                                         message = "Загрузка..."
                                                     }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800">
            <div className="text-center">
                <div className="text-6xl mb-6 animate-bounce">⚔️</div>
                <h1 className="text-2xl font-fantasy font-bold text-primary-800 dark:text-primary-200 mb-4">
                    D&D AI Game
                </h1>
                <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce animate-delay-100"></div>
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce animate-delay-200"></div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {message}
                </p>
            </div>
        </div>
    );
};

export default LoadingScreen;