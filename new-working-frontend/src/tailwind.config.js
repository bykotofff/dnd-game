/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Fantasy D&D theme
                primary: {
                    50: '#F7F4F0',
                    100: '#EDE6D9',
                    200: '#DBC8AF',
                    300: '#C9A985',
                    400: '#B7895B',
                    500: '#8B5A2B', // Main brown
                    600: '#7A4E26',
                    700: '#693F21',
                    800: '#57311C',
                    900: '#462217',
                },
                secondary: {
                    50: '#F5F3F1',
                    100: '#E8E3DE',
                    200: '#D1C6BA',
                    300: '#BAA996',
                    400: '#A38C72',
                    500: '#2D1B14', // Dark brown
                    600: '#5C4A3E',
                    700: '#4A3B31',
                    800: '#382C24',
                    900: '#261D17',
                },
                accent: {
                    50: '#FEFBF0',
                    100: '#FDF7D9',
                    200: '#FBEEB3',
                    300: '#F8E58D',
                    400: '#F6DD67',
                    500: '#D4AF37', // Gold
                    600: '#B8982F',
                    700: '#9C8027',
                    800: '#80691F',
                    900: '#645117',
                },
                fantasy: {
                    red: '#8B0000',      // Dark red for health
                    green: '#228B22',    // Forest green for nature
                    blue: '#191970',     // Midnight blue for magic
                    purple: '#4B0082',   // Indigo for arcane
                    orange: '#FF4500',   // Orange red for fire
                }
            },
            fontFamily: {
                'fantasy': ['Cinzel', 'serif'],
                'sans': ['Inter', 'system-ui', 'sans-serif'],
                'mono': ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'dice-roll': 'diceRoll 0.6s ease-in-out',
                'magic-sparkle': 'magicSparkle 1.5s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'slide-up': 'slideUp 0.3s ease-out',
                'fade-in': 'fadeIn 0.3s ease-out',
            },
            keyframes: {
                diceRoll: {
                    '0%': { transform: 'rotate(0deg) scale(1)' },
                    '25%': { transform: 'rotate(90deg) scale(1.1)' },
                    '50%': { transform: 'rotate(180deg) scale(1.2)' },
                    '75%': { transform: 'rotate(270deg) scale(1.1)' },
                    '100%': { transform: 'rotate(360deg) scale(1)' },
                },
                magicSparkle: {
                    '0%, 100%': { opacity: 0, transform: 'scale(0.8)' },
                    '50%': { opacity: 1, transform: 'scale(1.2)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.5)' },
                    '100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.8)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)', opacity: 0 },
                    '100%': { transform: 'translateY(0)', opacity: 1 },
                },
                fadeIn: {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
            },
        },
    },
    plugins: [],
}