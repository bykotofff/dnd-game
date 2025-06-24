import React from 'react'
import { motion } from 'framer-motion'

const LoadingScreen = ({ message = 'Загрузка...', fullScreen = true }) => {
    const containerClasses = fullScreen
        ? 'fixed inset-0 bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900 flex items-center justify-center z-50'
        : 'flex items-center justify-center p-8'

    return (
        <div className={containerClasses}>
            <div className="text-center">
                {/* Animated D20 */}
                <motion.div
                    className="w-16 h-16 mx-auto mb-6 relative"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    <motion.div
                        className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-dice"
                        animate={{
                            scale: [1, 1.1, 1],
                            rotateY: [0, 180, 360]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        {/* D20 dot in center */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Loading text */}
                <motion.h2
                    className="text-2xl font-fantasy font-semibold text-white mb-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    D&D AI Game
                </motion.h2>

                <motion.p
                    className="text-secondary-300 text-lg mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    {message}
                </motion.p>

                {/* Loading dots animation */}
                <div className="flex justify-center space-x-1">
                    {[0, 1, 2].map((index) => (
                        <motion.div
                            key={index}
                            className="w-2 h-2 bg-primary-500 rounded-full"
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: index * 0.2,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default LoadingScreen