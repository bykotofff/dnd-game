import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Debug info
console.log('🚀 main.tsx loaded');
console.log('Environment:', import.meta.env.MODE);
console.log('DEV mode:', import.meta.env.DEV);

// Error boundary component
class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        console.error('🚨 ErrorBoundary caught error:', error);
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('🚨 Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                        <div className="text-6xl mb-4">⚔️</div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Что-то пошло не так
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Произошла ошибка в приложении. Попробуйте перезагрузить страницу.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-md transition-colors"
                        >
                            Перезагрузить
                        </button>
                        {this.state.error && import.meta.env.DEV && (
                            <details className="mt-4 text-left">
                                <summary className="cursor-pointer text-sm text-gray-500">
                                    Подробности ошибки
                                </summary>
                                <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-32 bg-gray-100 p-2 rounded">
                                    {this.state.error.stack || this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Development tools
if (import.meta.env.DEV) {
    console.log('🔧 Development mode enabled');

    // Enable React DevTools
    if (typeof window !== 'undefined') {
        (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
            onCommitFiberRoot: () => {},
            onCommitFiberUnmount: () => {},
            supportsFiber: true,
        };
    }
}

// Hide initial loading screen when React loads
const hideLoadingScreen = () => {
    try {
        const loadingScreen = document.querySelector('.loading-screen') as HTMLElement;
        if (loadingScreen) {
            console.log('🎭 Hiding loading screen');
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
            }, 300);
        }
    } catch (error) {
        console.warn('⚠️ Could not hide loading screen:', error);
    }
};

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
    console.error('🚨 Root element not found!');
    throw new Error('Root element with id "root" not found in the document');
}

console.log('🎯 Root element found, mounting React app');

// Render app
try {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </React.StrictMode>
    );

    console.log('✅ React app mounted successfully');

    // Hide loading screen after React mounts
    hideLoadingScreen();

} catch (error) {
    console.error('🚨 Failed to mount React app:', error);

    // Fallback error display
    rootElement.innerHTML = `
        <div style="
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: #f9fafb; 
            font-family: system-ui, sans-serif;
        ">
            <div style="
                max-width: 400px; 
                background: white; 
                padding: 2rem; 
                border-radius: 8px; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-align: center;
            ">
                <div style="font-size: 4rem; margin-bottom: 1rem;">⚔️</div>
                <h1 style="color: #111827; margin-bottom: 1rem;">Ошибка загрузки</h1>
                <p style="color: #6b7280; margin-bottom: 1.5rem;">
                    Не удалось загрузить приложение. Проверьте консоль браузера для подробностей.
                </p>
                <button 
                    onclick="window.location.reload()" 
                    style="
                        background: #8B5A2B; 
                        color: white; 
                        padding: 0.5rem 1rem; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer;
                    "
                >
                    Перезагрузить
                </button>
                <details style="margin-top: 1rem; text-align: left;">
                    <summary style="cursor: pointer; color: #6b7280; font-size: 0.875rem;">
                        Подробности ошибки
                    </summary>
                    <pre style="
                        margin-top: 0.5rem; 
                        font-size: 0.75rem; 
                        color: #dc2626; 
                        background: #f3f4f6; 
                        padding: 0.5rem; 
                        border-radius: 4px; 
                        overflow: auto; 
                        max-height: 8rem;
                    ">${error}</pre>
                </details>
            </div>
        </div>
    `;
}