// utils/authDebug.ts - Помощник для диагностики проблем с аутентификацией

export interface AuthDebugInfo {
    hasAuthTokens: boolean;
    hasLegacyToken: boolean;
    hasAuthStore: boolean;
    authTokensData: any;
    authStoreData: any;
    currentUser: any;
    recommendations: string[];
}

export function debugAuthState(): AuthDebugInfo {
    const info: AuthDebugInfo = {
        hasAuthTokens: false,
        hasLegacyToken: false,
        hasAuthStore: false,
        authTokensData: null,
        authStoreData: null,
        currentUser: null,
        recommendations: [],
    };

    // Проверяем auth_tokens (основной способ хранения токенов)
    try {
        const authTokensString = localStorage.getItem('auth_tokens');
        if (authTokensString) {
            info.hasAuthTokens = true;
            info.authTokensData = JSON.parse(authTokensString);

            if (!info.authTokensData.access_token) {
                info.recommendations.push('auth_tokens найден, но access_token отсутствует');
            } else if (info.authTokensData.access_token.length < 10) {
                info.recommendations.push('access_token слишком короткий, возможно поврежден');
            }
        } else {
            info.recommendations.push('Основное хранилище токенов (auth_tokens) не найдено');
        }
    } catch (error) {
        info.recommendations.push('Ошибка при чтении auth_tokens: ' + error);
    }

    // Проверяем legacy auth_token
    try {
        const authToken = localStorage.getItem('auth_token');
        if (authToken) {
            info.hasLegacyToken = true;
            info.recommendations.push('Найден устаревший auth_token, рекомендуется перелогиниться');
        }
    } catch (error) {
        info.recommendations.push('Ошибка при чтении legacy auth_token: ' + error);
    }

    // Проверяем Zustand auth store
    try {
        const authStoreString = localStorage.getItem('auth-store');
        if (authStoreString) {
            info.hasAuthStore = true;
            info.authStoreData = JSON.parse(authStoreString);

            if (info.authStoreData.state?.user) {
                info.currentUser = info.authStoreData.state.user;

                if (!info.authStoreData.state.isAuthenticated) {
                    info.recommendations.push('Пользователь найден в store, но isAuthenticated = false');
                }
            } else {
                info.recommendations.push('auth-store найден, но пользователь отсутствует');
            }
        } else {
            info.recommendations.push('Zustand auth store не найден');
        }
    } catch (error) {
        info.recommendations.push('Ошибка при чтении auth-store: ' + error);
    }

    // Общие рекомендации
    if (!info.hasAuthTokens && !info.hasLegacyToken) {
        info.recommendations.push('Токены аутентификации не найдены. Необходимо войти в систему.');
    }

    if (info.hasAuthTokens && !info.hasAuthStore) {
        info.recommendations.push('Токены есть, но состояние приложения не синхронизировано');
    }

    if (!info.hasAuthTokens && info.hasAuthStore) {
        info.recommendations.push('Состояние приложения указывает на аутентификацию, но токены отсутствуют');
    }

    return info;
}

export function printAuthDebug(): void {
    const info = debugAuthState();

    console.group('🔐 Auth Debug Information');
    console.log('Has auth_tokens:', info.hasAuthTokens);
    console.log('Has legacy auth_token:', info.hasLegacyToken);
    console.log('Has auth store:', info.hasAuthStore);

    if (info.authTokensData) {
        console.log('Auth tokens data:', info.authTokensData);
    }

    if (info.currentUser) {
        console.log('Current user:', info.currentUser);
    }

    if (info.recommendations.length > 0) {
        console.group('📋 Recommendations:');
        info.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
        console.groupEnd();
    }

    console.groupEnd();
}

export function fixAuthState(): boolean {
    console.log('🔧 Attempting to fix auth state...');

    const info = debugAuthState();

    // Если есть токены, но нет auth store - пытаемся восстановить
    if (info.hasAuthTokens && !info.hasAuthStore && info.authTokensData?.access_token) {
        try {
            // Создаем минимальную структуру auth store
            const authStoreData = {
                state: {
                    user: {
                        id: 'unknown',
                        username: 'unknown',
                        email: 'unknown',
                    },
                    isAuthenticated: true,
                },
                version: 0,
            };

            localStorage.setItem('auth-store', JSON.stringify(authStoreData));
            console.log('✅ Auth store восстановлен');
            return true;
        } catch (error) {
            console.error('❌ Не удалось восстановить auth store:', error);
        }
    }

    // Если есть legacy токен, переносим его
    if (info.hasLegacyToken && !info.hasAuthTokens) {
        try {
            const legacyToken = localStorage.getItem('auth_token');
            if (legacyToken) {
                const authTokens = {
                    access_token: legacyToken,
                    refresh_token: '',
                    token_type: 'bearer',
                };
                localStorage.setItem('auth_tokens', JSON.stringify(authTokens));
                console.log('✅ Legacy токен перенесен в новый формат');
                return true;
            }
        } catch (error) {
            console.error('❌ Не удалось перенести legacy токен:', error);
        }
    }

    console.log('❓ Автоматическое исправление недоступно. Требуется повторный вход.');
    return false;
}

// Компонент для отображения проблем с аутентификацией
export function AuthDebugComponent(): JSX.Element {
    const info = debugAuthState();

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                🔐 Проблемы с аутентификацией
    </h3>

    <div className="space-y-2 text-sm">
    <div className="grid grid-cols-3 gap-4">
    <div className={`flex items-center ${info.hasAuthTokens ? 'text-green-600' : 'text-red-600'}`}>
    <span className="mr-2">{info.hasAuthTokens ? '✅' : '❌'}</span>
    Токены
    </div>
    <div className={`flex items-center ${info.hasAuthStore ? 'text-green-600' : 'text-red-600'}`}>
    <span className="mr-2">{info.hasAuthStore ? '✅' : '❌'}</span>
    Состояние
    </div>
    <div className={`flex items-center ${info.currentUser ? 'text-green-600' : 'text-red-600'}`}>
    <span className="mr-2">{info.currentUser ? '✅' : '❌'}</span>
    Пользователь
    </div>
    </div>

    {info.recommendations.length > 0 && (
        <div className="mt-3">
        <h4 className="font-medium text-yellow-800">Рекомендации:</h4>
    <ul className="list-disc list-inside space-y-1 text-yellow-700">
        {info.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
            ))}
        </ul>
        </div>
    )}

    <div className="mt-3 flex gap-2">
    <button
        onClick={printAuthDebug}
    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
        >
        Показать детали в консоли
    </button>
    <button
    onClick={fixAuthState}
    className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
        >
        Попытаться исправить
    </button>
    <button
    onClick={() => {
        localStorage.clear();
        window.location.href = '/login';
    }}
    className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
        >
        Очистить и перелогиниться
    </button>
    </div>
    </div>
    </div>
);
}