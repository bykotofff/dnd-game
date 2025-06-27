@tailwind base;
@tailwind components;
@tailwind utilities;

/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap');

/* Base styles */
@layer base {
    html {
    @apply antialiased;
    }

    body {
    @apply bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans;
    }

    /* Scrollbar styles */
    ::-webkit-scrollbar {
    @apply w-2;
    }

    ::-webkit-scrollbar-track {
    @apply bg-gray-100 dark:bg-gray-800;
    }

    ::-webkit-scrollbar-thumb {
    @apply bg-gray-300 dark:bg-gray-600 rounded-full;
    }

    ::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400 dark:bg-gray-500;
    }

    /* Focus styles */
:focus-visible {
    @apply outline-none ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900;
    }
}

/* Component styles */
@layer components {
    /* Fantasy-themed buttons */
.btn-fantasy {
    @apply bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5;
    }

.btn-fantasy:active {
    @apply transform translate-y-0;
    }

    /* Character sheet styles */
.character-stat {
    @apply bg-gradient-to-br from-amber-50 to-amber-100 dark:from-gray-700 dark:to-gray-800 border border-amber-200 dark:border-gray-600 rounded-lg p-3 text-center transition-colors;
    }

.character-stat:hover {
    @apply bg-gradient-to-br from-amber-100 to-amber-200 dark:from-gray-600 dark:to-gray-700;
    }

    /* Dice animation */
.dice-rolling {
        animation: diceRoll 0.6s ease-in-out;
    }

    /* Chat message styles */
.chat-message {
    @apply p-3 rounded-lg mb-2 break-words;
    }

.chat-message.player {
    @apply bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400;
    }

.chat-message.dm {
    @apply bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400;
    }

.chat-message.system {
    @apply bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400 text-sm;
    }

.chat-message.action {
    @apply bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 italic;
    }

.chat-message.dice {
    @apply bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400;
    }

.chat-message.ooc {
    @apply opacity-75 text-sm;
    }

    /* Inventory slot styles */
.inventory-slot {
    @apply border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 min-h-[60px] flex items-center justify-center hover:border-amber-400 transition-colors cursor-pointer;
    }

.inventory-slot.filled {
    @apply border-solid border-amber-400 bg-amber-50 dark:bg-amber-900;
    }
}

/* Utility classes */
@layer utilities {
    /* Text gradients */
.text-gradient {
    @apply bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent;
    }

.text-gradient-fantasy {
    @apply bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent;
    }

    /* Animation delays */
.animate-delay-100 {
        animation-delay: 100ms;
    }

.animate-delay-200 {
        animation-delay: 200ms;
    }

.animate-delay-300 {
        animation-delay: 300ms;
    }
}

/* Keyframe animations */
@keyframes diceRoll {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(90deg) scale(1.1); }
    50% { transform: rotate(180deg) scale(1.2); }
    75% { transform: rotate(270deg) scale(1.1); }
    100% { transform: rotate(360deg) scale(1); }
}

/* Dark mode specific styles */
@media (prefers-color-scheme: dark) {
.parchment {
        background-color: #2d2d2d;
        background-image:
        radial-gradient(circle at 100% 50%, transparent 20%, rgba(255,255,255,0.1) 21%, rgba(255,255,255,0.1) 34%, transparent 35%, transparent),
        linear-gradient(0deg, rgba(255,255,255,0.05) 50%, transparent 50%);
    }
}

/* Print styles */
@media print {
.no-print {
    @apply hidden;
    }

.character-sheet {
    @apply bg-white text-black;
    }
}