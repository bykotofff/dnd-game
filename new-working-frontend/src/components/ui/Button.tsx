import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const buttonVariants = cva(
    // Базовые стили - ИСПРАВЛЕНИЕ: убран text-black, добавлен font-medium
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
    {
        variants: {
            variant: {
                // ИСПРАВЛЕНИЕ: все варианты теперь имеют явно заданные цвета текста
                default: "bg-primary text-primary-foreground shadow hover:bg-primary/90 focus-visible:ring-primary text-white",
                destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive text-white",
                outline: "border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white hover:border-gray-500",
                secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:ring-secondary text-gray-900 dark:text-gray-100",
                ghost: "text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring text-gray-400 hover:bg-gray-700 hover:text-white",
                link: "text-primary underline-offset-4 hover:underline focus-visible:ring-primary text-blue-400 hover:text-blue-300",
                // Дополнительные варианты для игрового интерфейса
                primary: "bg-blue-600 text-white shadow hover:bg-blue-700 focus-visible:ring-blue-500",
                success: "bg-green-600 text-white shadow hover:bg-green-700 focus-visible:ring-green-500",
                warning: "bg-yellow-600 text-white shadow hover:bg-yellow-700 focus-visible:ring-yellow-500",
                danger: "bg-red-600 text-white shadow hover:bg-red-700 focus-visible:ring-red-500",
                // Темные варианты для игрового интерфейса
                darkOutline: "border-2 border-gray-500 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:border-gray-400 hover:text-white focus-visible:ring-gray-400",
                darkGhost: "text-gray-300 hover:bg-gray-700 hover:text-white focus-visible:ring-gray-400",
                // Специальные варианты
                gameAction: "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:from-purple-700 hover:to-blue-700 focus-visible:ring-purple-500",
                diceRoll: "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:from-green-700 hover:to-emerald-700 focus-visible:ring-green-500"
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-10 rounded-md px-8",
                xl: "h-12 rounded-lg px-10 text-base",
                icon: "h-9 w-9",
                iconSm: "h-8 w-8",
                iconLg: "h-10 w-10"
            }
        },
        defaultVariants: {
            variant: "default",
            size: "default"
        }
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({
         className = '',
         variant = 'default',
         size = 'default',
         asChild = false,
         loading = false,
         leftIcon,
         rightIcon,
         children,
         disabled,
         ...props
     }, ref) => {
        const isDisabled = disabled || loading;

        return (
            <button
                className={cn(
                    buttonVariants({ variant, size, className }),
                    // Дополнительные стили для состояния загрузки
                    loading && "cursor-wait",
                    // Убеждаемся что текст виден
                    "font-medium"
                )}
                ref={ref}
                disabled={isDisabled}
                {...props}
            >
                {/* Левая иконка */}
                {leftIcon && !loading && (
                    <span className="mr-2 flex-shrink-0">
                        {leftIcon}
                    </span>
                )}

                {/* Индикатор загрузки */}
                {loading && (
                    <span className="mr-2 flex-shrink-0">
                        <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    </span>
                )}

                {/* Содержимое кнопки */}
                <span className="flex-1 truncate">
                    {children}
                </span>

                {/* Правая иконка */}
                {rightIcon && !loading && (
                    <span className="ml-2 flex-shrink-0">
                        {rightIcon}
                    </span>
                )}
            </button>
        );
    }
);

Button.displayName = "Button";

export { Button, buttonVariants };