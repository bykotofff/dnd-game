import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    CubeIcon,
    ShieldCheckIcon,
    WrenchScrewdriverIcon, // Используем как есть для оружия
    SparklesIcon,
    CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils';
import type { Character, Item, Inventory } from '@/types';

interface InventoryManagerProps {
    character: Character;
    onInventoryUpdate: (inventory: Inventory) => void;
}

interface ItemFormData {
    name: string;
    description: string;
    type: string;
    rarity: Item['rarity'];
    quantity: number;
    weight: number;
    value: number;
    magical: boolean;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({
                                                               character,
                                                               onInventoryUpdate,
                                                           }) => {
    const [showItemForm, setShowItemForm] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [activeTab, setActiveTab] = useState<'items' | 'equipment' | 'currency'>('items');

    const [itemForm, setItemForm] = useState<ItemFormData>({
        name: '',
        description: '',
        type: 'misc',
        rarity: 'common',
        quantity: 1,
        weight: 0,
        value: 0,
        magical: false,
    });

    const inventory = character.inventory;

    const itemTypes = [
        { id: 'weapon', name: 'Оружие', icon: WrenchScrewdriverIcon }, // Исправлено
        { id: 'armor', name: 'Броня', icon: ShieldCheckIcon },
        { id: 'shield', name: 'Щит', icon: ShieldCheckIcon },
        { id: 'consumable', name: 'Расходники', icon: SparklesIcon },
        { id: 'tool', name: 'Инструменты', icon: CubeIcon },
        { id: 'misc', name: 'Разное', icon: CubeIcon },
    ];

    const rarityColors = {
        common: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        uncommon: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        rare: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        very_rare: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        legendary: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        artifact: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    const resetForm = () => {
        setItemForm({
            name: '',
            description: '',
            type: 'misc',
            rarity: 'common',
            quantity: 1,
            weight: 0,
            value: 0,
            magical: false,
        });
        setEditingItem(null);
    };

    const handleAddItem = () => {
        const newItem: Item = {
            id: Date.now().toString(),
            ...itemForm,
            properties: [],
        };

        const newInventory = {
            ...inventory,
            items: [...inventory.items, newItem],
        };

        onInventoryUpdate(newInventory);
        setShowItemForm(false);
        resetForm();
    };

    const handleEditItem = (item: Item) => {
        setEditingItem(item);
        setItemForm({
            name: item.name,
            description: item.description || '',
            type: item.type,
            rarity: item.rarity,
            quantity: item.quantity,
            weight: item.weight,
            value: item.value,
            magical: item.magical,
        });
        setShowItemForm(true);
    };

    const handleUpdateItem = () => {
        if (!editingItem) return;

        const updatedItem = {
            ...editingItem,
            ...itemForm,
        };

        const newInventory = {
            ...inventory,
            items: inventory.items.map(item =>
                item.id === editingItem.id ? updatedItem : item
            ),
        };

        onInventoryUpdate(newInventory);
        setShowItemForm(false);
        resetForm();
    };

    const handleDeleteItem = (itemId: string) => {
        if (window.confirm('Удалить предмет?')) {
            const newInventory = {
                ...inventory,
                items: inventory.items.filter(item => item.id !== itemId),
            };
            onInventoryUpdate(newInventory);
        }
    };

    const handleCurrencyChange = (type: keyof typeof inventory.currency, value: number) => {
        const newInventory = {
            ...inventory,
            currency: {
                ...inventory.currency,
                [type]: Math.max(0, value),
            },
        };
        onInventoryUpdate(newInventory);
    };

    const getTotalWeight = () => {
        return inventory.items.reduce((total, item) => total + (item.weight * item.quantity), 0);
    };

    const getTotalValue = () => {
        const itemsValue = inventory.items.reduce((total, item) => total + (item.value * item.quantity), 0);
        const currencyValue =
            inventory.currency.pp * 10 +
            inventory.currency.gp +
            inventory.currency.ep * 0.5 +
            inventory.currency.sp * 0.1 +
            inventory.currency.cp * 0.01;
        return itemsValue + currencyValue;
    };

    const getItemsByType = (type: string) => {
        return inventory.items.filter(item => item.type === type);
    };

    const tabs = [
        { id: 'items', name: 'Предметы', count: inventory.items.length },
        { id: 'equipment', name: 'Снаряжение', count: Object.keys(inventory.equipment).length },
        { id: 'currency', name: 'Деньги', count: null },
    ];

    return (
        <div className="space-y-6">
            {/* Header with stats */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {inventory.items.length}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Предметов</div>
                        </div>

                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {getTotalWeight().toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Фунтов</div>
                        </div>

                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {getTotalValue().toFixed(0)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Золота</div>
                        </div>

                        <div>
                            <Button
                                variant="fantasy"
                                size="sm"
                                onClick={() => setShowItemForm(true)}
                                className="w-full"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Добавить
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Simplified content for testing */}
            <Card>
                <CardHeader>
                    <CardTitle>Инвентарь персонажа</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                            Инвентарь временно упрощен для устранения ошибок
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            Количество предметов: {inventory.items.length}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default InventoryManager;