import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
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
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Development tools
if (import.meta.env.DEV) {
    // Enable React DevTools
    if (typeof window !== 'undefined') {
        (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
            onCommitFiberRoot: () => {},
            onCommitFiberUnmount: () => {},
            supportsFiber: true,
        };
    }
}

// Render app
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>
);