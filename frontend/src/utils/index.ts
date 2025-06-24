import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Format dates
export function formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function formatTime(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDateTime(date: string | Date): string {
    return `${formatDate(date)} в ${formatTime(date)}`;
}

// Calculate time ago
export function timeAgo(date: string | Date): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;

    return formatDate(date);
}

// D&D specific utilities
export function getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

export function formatModifier(modifier: number): string {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

export function getProficiencyBonus(level: number): number {
    return Math.ceil(level / 4) + 1;
}

export function getSpellSaveDC(
    spellcastingAbility: number,
    proficiencyBonus: number
): number {
    return 8 + getAbilityModifier(spellcastingAbility) + proficiencyBonus;
}

export function getSpellAttackBonus(
    spellcastingAbility: number,
    proficiencyBonus: number
): number {
    return getAbilityModifier(spellcastingAbility) + proficiencyBonus;
}

// Calculate HP based on class and level
export function calculateMaxHP(
    characterClass: string,
    level: number,
    constitutionModifier: number
): number {
    const hitDie: Record<string, number> = {
        barbarian: 12,
        fighter: 10,
        paladin: 10,
        ranger: 10,
        bard: 8,
        cleric: 8,
        druid: 8,
        monk: 8,
        rogue: 8,
        warlock: 8,
        sorcerer: 6,
        wizard: 6,
    };

    const die = hitDie[characterClass.toLowerCase()] || 8;
    const baseHP = die + constitutionModifier;
    const levelUpHP = (level - 1) * (Math.floor(die / 2) + 1 + constitutionModifier);

    return Math.max(1, baseHP + levelUpHP);
}

// Dice rolling utilities
export function rollDice(sides: number, count: number = 1): number[] {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    return rolls;
}

export function parseDiceNotation(notation: string): {
    count: number;
    sides: number;
    modifier: number;
} {
    const match = notation.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);
    if (!match) {
        throw new Error(`Invalid dice notation: ${notation}`);
    }

    return {
        count: parseInt(match[1] || '1'),
        sides: parseInt(match[2]),
        modifier: parseInt(match[3] || '0'),
    };
}

// Currency utilities
export function formatCurrency(
    currency: { cp: number; sp: number; ep: number; gp: number; pp: number }
): string {
    const parts: string[] = [];

    if (currency.pp > 0) parts.push(`${currency.pp} пл`);
    if (currency.gp > 0) parts.push(`${currency.gp} зм`);
    if (currency.ep > 0) parts.push(`${currency.ep} эм`);
    if (currency.sp > 0) parts.push(`${currency.sp} см`);
    if (currency.cp > 0) parts.push(`${currency.cp} мм`);

    return parts.length > 0 ? parts.join(', ') : '0 мм';
}

export function convertToGold(
    currency: { cp: number; sp: number; ep: number; gp: number; pp: number }
): number {
    return (
        currency.pp * 10 +
        currency.gp +
        currency.ep * 0.5 +
        currency.sp * 0.1 +
        currency.cp * 0.01
    );
}

// Character utilities
export function getCharacterInitiative(dexterityModifier: number): number {
    return dexterityModifier;
}

export function getArmorClass(
    baseAC: number,
    dexModifier: number,
    armorType?: string
): number {
    switch (armorType) {
        case 'light':
            return baseAC + dexModifier;
        case 'medium':
            return baseAC + Math.min(dexModifier, 2);
        case 'heavy':
            return baseAC;
        default:
            return baseAC + dexModifier;
    }
}

// Validation utilities
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidUsername(username: string): boolean {
    return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
}

export function isStrongPassword(password: string): boolean {
    return password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password);
}

// Local storage utilities
export function getFromStorage<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
}

export function setToStorage<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

export function removeFromStorage(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Failed to remove from localStorage:', error);
    }
}

// API utilities
export function createFormData(data: Record<string, any>): FormData {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
            formData.append(key, value);
        } else if (value !== null && value !== undefined) {
            formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
    });

    return formData;
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Generate random ID
export function generateId(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Array utilities
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
        const group = String(item[key]);
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}