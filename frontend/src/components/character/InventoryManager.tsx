import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    CubeIcon,
    ShieldCheckIcon,
    WrenchScrewdriverIcon,
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
        { id: 'weapon', name: 'Оружие', icon: WrenchScrewdriverIcon },
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

            {/* Tabs */}
            <Card>
                <CardHeader className="pb-0">
                    <div className="flex space-x-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                {tab.name}
                                {tab.count !== null && (
                                    <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full px-2 py-1">
                    {tab.count}
                  </span>
                                )}
                            </button>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'items' && (
                                <div className="space-y-4">
                                    {itemTypes.map((type) => {
                                        const items = getItemsByType(type.id);
                                        const Icon = type.icon;

                                        if (items.length === 0) return null;

                                        return (
                                            <div key={type.id}>
                                                <h3 className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                    <Icon className="w-4 h-4" />
                                                    <span>{type.name}</span>
                                                    <span className="text-gray-500">({items.length})</span>
                                                </h3>

                                                <div className="grid grid-cols-1 gap-3">
                                                    {items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                                        >
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-2">
                                                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                                                        {item.name}
                                                                    </h4>
                                                                    {item.magical && (
                                                                        <SparklesIcon className="w-4 h-4 text-purple-500" />
                                                                    )}
                                                                    <span className={`text-xs px-2 py-1 rounded-full ${rarityColors[item.rarity]}`}>
                                    {item.rarity}
                                  </span>
                                                                    {item.quantity > 1 && (
                                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                      ×{item.quantity}
                                    </span>
                                                                    )}
                                                                </div>

                                                                {item.description && (
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                                        {item.description}
                                                                    </p>
                                                                )}

                                                                <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                                    <span>Вес: {item.weight} фунт.</span>
                                                                    <span>Цена: {item.value} зм</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center space-x-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleEditItem(item)}
                                                                >
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </Button>

                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {inventory.items.length === 0 && (
                                        <div className="text-center py-8">
                                            <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400">Инвентарь пуст</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-4"
                                                onClick={() => setShowItemForm(true)}
                                            >
                                                Добавить первый предмет
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'currency' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                                        {[
                                            { key: 'pp', name: 'Платина', color: 'text-gray-400' },
                                            { key: 'gp', name: 'Золото', color: 'text-yellow-500' },
                                            { key: 'ep', name: 'Электрум', color: 'text-green-500' },
                                            { key: 'sp', name: 'Серебро', color: 'text-gray-300' },
                                            { key: 'cp', name: 'Медь', color: 'text-orange-500' },
                                        ].map(({ key, name, color }) => (
                                            <div key={key} className="text-center">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    {name}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={inventory.currency[key as keyof typeof inventory.currency]}
                                                        onChange={(e) => handleCurrencyChange(
                                                            key as keyof typeof inventory.currency,
                                                            parseInt(e.target.value) || 0
                                                        )}
                                                        className="w-full p-2 text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                                    />
                                                    <CurrencyDollarIcon className={`absolute right-2 top-2 w-5 h-5 ${color}`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                                        <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-2">
                                            Итого в золотых эквивалентах:
                                        </h4>
                                        <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                                            {formatCurrency(inventory.currency)} = {getTotalValue().toFixed(2)} зм
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
            </Card>

            {/* Item form modal */}
            <AnimatePresence>
                {showItemForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowItemForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto"
                        >
                            <div className="p-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                    {editingItem ? 'Редактировать предмет' : 'Добавить предмет'}
                                </h3>

                                <div className="space-y-4">
                                    <Input
                                        label="Название"
                                        value={itemForm.name}
                                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                    />

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Описание
                                        </label>
                                        <textarea
                                            value={itemForm.description}
                                            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                            rows={2}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Тип
                                            </label>
                                            <select
                                                value={itemForm.type}
                                                onChange={(e) => setItemForm({ ...itemForm, type: e.target.value })}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                {itemTypes.map((type) => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Редкость
                                            </label>
                                            <select
                                                value={itemForm.rarity}
                                                onChange={(e) => setItemForm({ ...itemForm, rarity: e.target.value as Item['rarity'] })}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value="common">Обычный</option>
                                                <option value="uncommon">Необычный</option>
                                                <option value="rare">Редкий</option>
                                                <option value="very_rare">Очень редкий</option>
                                                <option value="legendary">Легендарный</option>
                                                <option value="artifact">Артефакт</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <Input
                                            label="Количество"
                                            type="number"
                                            min="1"
                                            value={itemForm.quantity}
                                            onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 1 })}
                                        />

                                        <Input
                                            label="Вес (фунты)"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={itemForm.weight}
                                            onChange={(e) => setItemForm({ ...itemForm, weight: parseFloat(e.target.value) || 0 })}
                                        />

                                        <Input
                                            label="Цена (зм)"
                                            type="number"
                                            min="0"
                                            value={itemForm.value}
                                            onChange={(e) => setItemForm({ ...itemForm, value: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={itemForm.magical}
                                            onChange={(e) => setItemForm({ ...itemForm, magical: e.target.checked })}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label className="text-sm text-gray-700 dark:text-gray-300">
                                            Магический предмет
                                        </label>
                                    </div>
                                </div>

                                <div className="flex space-x-3 mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowItemForm(false);
                                            resetForm();
                                        }}
                                        className="flex-1"
                                    >
                                        Отмена
                                    </Button>

                                    <Button
                                        variant="fantasy"
                                        onClick={editingItem ? handleUpdateItem : handleAddItem}
                                        disabled={!itemForm.name.trim()}
                                        className="flex-1"
                                    >
                                        {editingItem ? 'Обновить' : 'Добавить'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InventoryManager;