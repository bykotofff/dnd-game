#!/bin/bash

# D&D AI Game Server - Скрипт быстрого запуска
# Автоматизирует процесс установки и запуска backend

set -e  # Остановка при любой ошибке

echo "================================================"
echo "D&D AI Game Server - Quick Start"
echo "================================================"

# Проверка системных требований
check_requirements() {
    echo "🔍 Проверка системных требований..."

    # Проверка Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
        exit 1
    fi

    # Проверка Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
        exit 1
    fi

    # Проверка Python 3.11
    if ! command -v python3.11 &> /dev/null; then
        echo "⚠️  Python 3.11 не найден. Пытаюсь использовать python3..."
        if ! command -v python3 &> /dev/null; then
            echo "❌ Python 3 не установлен. Установите Python 3.11+ и попробуйте снова."
            exit 1
        fi
        PYTHON_CMD="python3"
    else
        PYTHON_CMD="python3.11"
    fi

    # Проверка свободного места (минимум 10GB)
    FREE_SPACE=$(df . | tail -1 | awk '{print $4}')
    if [ $FREE_SPACE -lt 10485760 ]; then  # 10GB в KB
        echo "⚠️  Предупреждение: Свободного места меньше 10GB. Рекомендуется освободить место."
    fi

    echo "✅ Системные требования проверены"
}

# Создание и настройка .env файла
setup_env() {
    echo "⚙️  Настройка конфигурации..."

    if [ ! -f .env ]; then
        echo "📝 Создание .env файла..."

        # Генерация случайных ключей
        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
        ENCRYPTION_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")

        cat > .env << EOF
# Общие настройки
DEBUG=True
HOST=0.0.0.0
PORT=8000

# База данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dnd_game
DB_USER=dnd_user
DB_PASSWORD=dnd_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# Ollama
OLLAMA_HOST=localhost
OLLAMA_PORT=11434
OLLAMA_MODEL=llama3.1:8b

# Stable Diffusion
SD_HOST=localhost
SD_PORT=7860

# Безопасность (сгенерировано автоматически)
SECRET_KEY=$SECRET_KEY
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Логирование
LOG_LEVEL=INFO
EOF
        echo "✅ .env файл создан с автоматически сгенерированными ключами"
    else
        echo "✅ .env файл уже существует"
    fi
}

# Создание виртуального окружения и установка зависимостей
setup_python() {
    echo "🐍 Настройка Python окружения..."

    if [ ! -d "venv" ]; then
        echo "📦 Создание виртуального окружения..."
        $PYTHON_CMD -m venv venv
    fi

    echo "📥 Активация виртуального окружения и установка зависимостей..."
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt

    echo "✅ Python окружение настроено"
}

# Запуск Docker сервисов
start_docker_services() {
    echo "🐳 Запуск Docker сервисов..."

    # Проверка, что Docker запущен
    if ! docker info &> /dev/null; then
        echo "❌ Docker daemon не запущен. Запустите Docker и попробуйте снова."
        exit 1
    fi

    echo "🚀 Запуск контейнеров..."
    docker-compose up -d

    echo "⏳ Ожидание готовности сервисов..."
    sleep 10

    # Проверка статуса контейнеров
    echo "📊 Статус контейнеров:"
    docker-compose ps

    echo "✅ Docker сервисы запущены"
}

# Настройка Ollama
setup_ollama() {
    echo "🤖 Настройка Ollama (ИИ)..."

    echo "⏳ Ожидание готовности Ollama..."
    sleep 20

    echo "📥 Загрузка модели ИИ (это может занять несколько минут)..."
    docker exec dnd_ollama ollama pull llama3.1:8b

    # Проверка загруженных моделей
    echo "📋 Загруженные модели:"
    docker exec dnd_ollama ollama list

    echo "✅ Ollama настроена"
}

# Проверка готовности сервисов
check_services() {
    echo "🔍 Проверка готовности сервисов..."

    # PostgreSQL
    echo -n "🗄️  PostgreSQL: "
    if docker exec dnd_postgres pg_isready -U dnd_user -q; then
        echo "✅ Готов"
    else
        echo "❌ Не готов"
    fi

    # Redis
    echo -n "📊 Redis: "
    if docker exec dnd_redis redis-cli ping &> /dev/null; then
        echo "✅ Готов"
    else
        echo "❌ Не готов"
    fi

    # Ollama
    echo -n "🤖 Ollama: "
    if curl -f http://localhost:11434/api/tags &> /dev/null; then
        echo "✅ Готов"
    else
        echo "❌ Не готов"
    fi

    # Stable Diffusion
    echo -n "🎨 Stable Diffusion: "
    if curl -f http://localhost:7860/health &> /dev/null; then
        echo "✅ Готов"
    else
        echo "⚠️  Запускается... (может занять время)"
    fi
}

# Запуск backend сервера
start_backend() {
    echo "🚀 Запуск backend сервера..."

    source venv/bin/activate

    echo "🔥 Сервер запускается на http://localhost:8000"
    echo "📚 API документация: http://localhost:8000/docs"
    echo "🌐 Swagger UI: http://localhost:8000/redoc"
    echo ""
    echo "Для остановки нажмите Ctrl+C"
    echo ""

    python run.py
}

# Функция очистки при ошибке
cleanup_on_error() {
    echo ""
    echo "❌ Произошла ошибка при запуске"
    echo "🧹 Попытка очистки..."

    docker-compose down
    echo "📞 Для получения помощи обратитесь к SETUP.md"
}

# Установка обработчика ошибок
trap cleanup_on_error ERR

# Главная функция
main() {
    echo "🎯 Начинаю автоматическую установку и запуск..."
    echo ""

    check_requirements
    setup_env
    setup_python
    start_docker_services
    setup_ollama
    check_services

    echo ""
    echo "================================================"
    echo "✅ Установка завершена успешно!"
    echo "================================================"
    echo ""

    # Запрос пользователя на запуск сервера
    read -p "🚀 Запустить backend сервер сейчас? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_backend
    else
        echo "💡 Для запуска сервера выполните:"
        echo "   source venv/bin/activate"
        echo "   python run.py"
    fi
}

# Проверка аргументов командной строки
case "${1:-}" in
    --help|-h)
        echo "D&D AI Game Server - Скрипт быстрого запуска"
        echo ""
        echo "Использование:"
        echo "  $0                 - Полная установка и запуск"
        echo "  $0 --services-only - Только запуск Docker сервисов"
        echo "  $0 --backend-only  - Только запуск backend (сервисы должны быть запущены)"
        echo "  $0 --stop          - Остановка всех сервисов"
        echo "  $0 --help          - Эта справка"
        exit 0
        ;;
    --services-only)
        echo "🐳 Запуск только Docker сервисов..."
        check_requirements
        start_docker_services
        setup_ollama
        check_services
        echo "✅ Сервисы запущены"
        ;;
    --backend-only)
        echo "🚀 Запуск только backend сервера..."
        if [ ! -f .env ]; then
            echo "❌ .env файл не найден. Запустите полную установку."
            exit 1
        fi
        if [ ! -d venv ]; then
            setup_python
        fi
        start_backend
        ;;
    --stop)
        echo "🛑 Остановка всех сервисов..."
        docker-compose down
        echo "✅ Сервисы остановлены"
        ;;
    "")
        main
        ;;
    *)
        echo "❌ Неизвестный аргумент: $1"
        echo "Используйте --help для справки"
        exit 1
        ;;
esac