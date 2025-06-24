import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    SparklesIcon,
    UsersIcon,
    CpuChipIcon,
    PhotoIcon,
    ChatBubbleLeftRightIcon,
    DiceIcon
} from '@heroicons/react/24/outline'

const HomePage = () => {
    const features = [
        {
            icon: CpuChipIcon,
            title: 'ИИ Данжеон Мастер',
            description: 'Умный ИИ создает увлекательные приключения и управляет игровым миром',
        },
        {
            icon: UsersIcon,
            title: 'Многопользовательская игра',
            description: 'Играйте с друзьями в режиме реального времени до 6 игроков',
        },
        {
            icon: PhotoIcon,
            title: 'Генерация изображений',
            description: 'Автоматическое создание портретов персонажей и локаций',
        },
        {
            icon: DiceIcon,
            title: 'Система костей',
            description: 'Полная поддержка бросков костей D&D 5e с анимацией',
        },
        {
            icon: ChatBubbleLeftRightIcon,
            title: 'Живое общение',
            description: 'Чат в реальном времени с поддержкой ролевого отыгрыша',
        },
        {
            icon: SparklesIcon,
            title: 'Магия приключений',
            description: 'Создавайте незабываемые истории в мире фэнтези',
        },
    ]

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 },
        },
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl"></div>
                </div>

                <div className="relative container-fluid py-20">
                    <motion.div
                        className="text-center max-w-4xl mx-auto"
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                    >
                        {/* Logo/Title */}
                        <motion.h1
                            className="text-6xl md:text-8xl font-fantasy font-bold mb-6"
                            variants={itemVariants}
                        >
              <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
                D&D AI Game
              </span>
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            className="text-xl md:text-2xl text-secondary-300 mb-8 leading-relaxed"
                            variants={itemVariants}
                        >
                            Погрузитесь в мир Dungeons & Dragons с искусственным интеллектом в роли Данжеон Мастера
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                            variants={itemVariants}
                        >
                            <Link to="/register">
                                <motion.button
                                    className="btn btn-primary text-lg px-8 py-4 w-full sm:w-auto"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Начать приключение
                                </motion.button>
                            </Link>

                            <Link to="/login">
                                <motion.button
                                    className="btn btn-ghost text-lg px-8 py-4 w-full sm:w-auto"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Войти в игру
                                </motion.button>
                            </Link>
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto"
                            variants={itemVariants}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold text-primary-400">∞</div>
                                <div className="text-sm text-secondary-400">Приключений</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-accent-400">24/7</div>
                                <div className="text-sm text-secondary-400">ИИ Мастер</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-400">6</div>
                                <div className="text-sm text-secondary-400">Игроков</div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-secondary-800/50">
                <div className="container-fluid">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-fantasy font-bold text-white mb-4">
                            Возможности игры
                        </h2>
                        <p className="text-xl text-secondary-300 max-w-2xl mx-auto">
                            Современные технологии делают D&D более захватывающим и доступным
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                        initial="hidden"
                        whileInView="visible"
                        variants={containerVariants}
                        viewport={{ once: true }}
                    >
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                className="game-panel p-6 text-center group hover:border-primary-500/50 transition-colors"
                                variants={itemVariants}
                                whileHover={{ y: -5, scale: 1.02 }}
                            >
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <feature.icon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-secondary-300 leading-relaxed">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="py-20">
                <div className="container-fluid">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-fantasy font-bold text-white mb-4">
                            Как это работает
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {[
                            {
                                step: '1',
                                title: 'Создайте персонажа',
                                description: 'Выберите расу, класс и создайте уникального героя',
                            },
                            {
                                step: '2',
                                title: 'Присоединитесь к приключению',
                                description: 'Найдите кампанию или создайте собственную',
                            },
                            {
                                step: '3',
                                title: 'Играйте с ИИ',
                                description: 'Искусственный интеллект ведет захватывающую игру',
                            },
                        ].map((item, index) => (
                            <motion.div
                                key={index}
                                className="text-center"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.2 }}
                                viewport={{ once: true }}
                            >
                                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                                    {item.step}
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-3">
                                    {item.title}
                                </h3>
                                <p className="text-secondary-300">
                                    {item.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-primary-600 to-accent-600">
                <div className="container-fluid text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-fantasy font-bold text-white mb-6">
                            Готовы к приключению?
                        </h2>
                        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                            Присоединяйтесь к тысячам игроков в самой умной D&D игре
                        </p>
                        <Link to="/register">
                            <motion.button
                                className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Начать играть бесплатно
                            </motion.button>
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    )
}

export default HomePage