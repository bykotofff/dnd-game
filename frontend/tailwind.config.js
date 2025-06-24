/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // D&D тематические цвета
                primary: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#dc2626',
                    700: '#b91c1c',
                    800: '#991b1b',
                    900: '#7f1d1d',
                },
                secondary: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                },
                accent: {
                    50: '#fefce8',
                    100: '#fef9c3',
                    200: '#fef08a',
                    300: '#fde047',
                    400: '#facc15',
                    500: '#eab308',
                    600: '#ca8a04',
                    700: '#a16207',
                    800: '#854d0e',
                    900: '#713f12',
                },
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                info: '#3b82f6',

                // Игровые цвета
                hp: '#ef4444',
                mana: '#3b82f6',
                stamina: '#10b981',
                xp: '#a855f7',

                // Цвета костей
                dice: {
                    d4: '#ff6b6b',
                    d6: '#4ecdc4',
                    d8: '#45b7d1',
                    d10: '#96ceb4',
                    d12: '#ffeaa7',
                    d20: '#dda0dd',
                    d100: '#98d8c8',
                },
            },
            fontFamily: {
                'fantasy': ['Cinzel', 'serif'],
                'medieval': ['Uncial Antiqua', 'cursive'],
                'sans': ['Inter', 'system-ui', 'sans-serif'],
                'mono': ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'dice-roll': 'diceRoll 0.8s ease-in-out',
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-in-out',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
                'wiggle': 'wiggle 1s ease-in-out infinite',
            },
            keyframes: {
                diceRoll: {
                    '0%': { transform: 'rotate(0deg) scale(1)' },
                    '25%': { transform: 'rotate(90deg) scale(1.1)' },
                    '50%': { transform: 'rotate(180deg) scale(1.2)' },
                    '75%': { transform: 'rotate(270deg) scale(1.1)' },
                    '100%': { transform: 'rotate(360deg) scale(1)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
                    '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
                },
                bounceSubtle: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                wiggle: {
                    '0%, 100%': { transform: 'rotate(-3deg)' },
                    '50%': { transform: 'rotate(3deg)' },
                },
            },
            boxShadow: {
                'dice': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'character-card': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'game-panel': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            },
            backdropBlur: {
                xs: '2px',
            },
            screens: {
                'xs': '475px',
                '3xl': '1600px',
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
                '128': '32rem',
            },
            borderRadius: {
                '4xl': '2rem',
            },
            zIndex: {
                '60': '60',
                '70': '70',
                '80': '80',
                '90': '90',
                '100': '100',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
        require('@tailwindcss/aspect-ratio'),
    ],
}