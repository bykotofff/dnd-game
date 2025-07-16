import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
    {
        variants: {
            variant: {
                // ✅ ИСПРАВЛЕНО: Явные цвета для default кнопки
                default: "bg-blue-600 text-white shadow hover:bg-blue-700 focus-visible:ring-blue-500 border-0",

                // ✅ ИСПРАВЛЕНО: Явные цвета для destructive кнопки
                destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500 border-0",

                // ✅ ИСПРАВЛЕНО: Outline кнопка с контрастными цветами
                outline: "border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus-visible:ring-gray-400",

                // ✅ ИСПРАВЛЕНО: Secondary кнопка с читаемыми цветами
                secondary: "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 focus-visible:ring-gray-400",

                // ✅ ИСПРАВЛЕНО: Ghost кнопка с правильными цветами
                ghost: "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 focus-visible:ring-gray-400",

                // ✅ ИСПРАВЛЕНО: Link кнопка с синим текстом
                link: "text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline hover:text-blue-700 dark:hover:text-blue-300 focus-visible:ring-blue-500",

                // Дополнительные варианты с четкими цветами
                primary: "bg-blue-600 text-white shadow hover:bg-blue-700 focus-visible:ring-blue-500 border-0",
                success: "bg-green-600 text-white shadow hover:bg-green-700 focus-visible:ring-green-500 border-0",
                warning: "bg-yellow-600 text-white shadow hover:bg-yellow-700 focus-visible:ring-yellow-500 border-0",
                danger: "bg-red-600 text-white shadow hover:bg-red-700 focus-visible:ring-red-500 border-0",

                // Специальные варианты для темных областей
                darkOutline: "border-2 border-gray-500 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:border-gray-400 hover:text-white focus-visible:ring-gray-400",
                darkGhost: "text-gray-300 hover:bg-gray-700 hover:text-white focus-visible:ring-gray-400",

                // Специальные варианты для светлых областей
                lightOutline: "border-2 border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 focus-visible:ring-gray-300 shadow-sm",
                lightGhost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-300",
                lightSecondary: "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 hover:text-gray-900 focus-visible:ring-gray-300 shadow-sm",

                // Игровые варианты
                gameAction: "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:from-purple-700 hover:to-blue-700 focus-visible:ring-purple-500 border-0",
                diceRoll: "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:from-green-700 hover:to-emerald-700 focus-visible:ring-green-500 border-0",
                fantasy: "bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg hover:from-amber-700 hover:to-yellow-700 focus-visible:ring-amber-500 border-0"
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
    (props, ref) => {
        const {
            className = '',
            variant = 'default',
            size = 'default',
            asChild = false,
            loading = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            ...restProps
        } = props;

        const isDisabled = disabled || loading;

        return (
            <button
                className={cn(
                    buttonVariants({ variant, size }),
                    loading && "cursor-wait",
                    className
                )}
                ref={ref}
                disabled={isDisabled}
                {...restProps}
            >
                {leftIcon && !loading && (
                    <span className="mr-2 flex-shrink-0">
                        {leftIcon}
                    </span>
                )}

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

                <span className="flex-1 truncate">
                    {children}
                </span>

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