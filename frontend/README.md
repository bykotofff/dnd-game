# D&D AI Game - Frontend

Современный React фронтенд для D&D игры с ИИ-мастером.

## 🚀 Быстрый старт

### Установка зависимостей

```bash
npm install
# или
yarn install
```

### Настройка окружения

```bash
# Скопируйте файл конфигурации
cp .env.example .env

# Отредактируйте переменные окружения
nano .env
```

### Запуск в режиме разработки

```bash
npm run dev
# или
yarn dev
```

Приложение будет доступно по адресу: http://localhost:3000

### Сборка для продакшена

```bash
npm run build
# или
yarn build
```

## 📁 Структура проекта

```
src/
├── components/          # Переиспользуемые компоненты
│   ├── ui/             # Базовые UI компоненты
│   ├── auth/           # Компоненты аутентификации
│   ├── character/      # Компоненты персонажей
│   ├── game/           # Игровые компоненты
│   └── layout/         # Компоненты лейаута
├── pages/              # Страницы приложения
├── hooks/              # Custom React hooks
├── services/           # API сервисы
├── store/              # Zustand stores
├── types/              # TypeScript типы
├── utils/              # Утилиты
└── styles/             # Глобальные стили
```

## 🎨 Технологии

- **React 18** с TypeScript
- **Vite** для быстрой сборки
- **Tailwind CSS** для стилизации
- **Zustand** для управления состоянием
- **React Query** для серверного состояния
- **Socket.io** для WebSocket соединений
- **React Hook Form** для форм
- **Framer Motion** для анимаций

## 🎯 Основные фичи

### ✅ Реализовано

1. **Аутентификация**
    - Форма входа/регистрации
    - Защищенные маршруты
    - Автоматическое обновление токенов

2. **UI Компоненты**
    - Система дизайна в стиле фэнтези
    - Адаптивные компоненты
    - Темная/светлая тема

3. **Структура приложения**
    - Роутинг
    - Глобальное состояние
    - API интеграция

### 🚧 В разработке

1. **Страница Dashboard**
2. **Создание/редактирование персонажей**
3. **Управление кампаниями**
4. **Игровой интерфейс**
5. **WebSocket интеграция**

## 🔧 Команды разработки

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Превью сборки
npm run preview

# Линтинг
npm run lint

# Проверка типов
npm run type-check
```

## 🎮 Компоненты игры

### Character Builder
- Пошаговое создание персонажа
- Генерация портретов через ИИ
- Интерактивный лист персонажа

### Game Session
- Чат с поддержкой команд
- Виртуальные кости
- Управление персонажами
- WebSocket для реального времени

### Campaign Manager
- Создание кампаний
- Управление игроками
- Настройки ИИ-мастера

## 📱 Адаптивность

Приложение оптимизировано для:
- 📱 Мобильные устройства (320px+)
- 📱 Планшеты (768px+)
- 💻 Десктоп (1024px+)
- 🖥️ Широкие экраны (1440px+)

## 🎨 Дизайн система

### Цвета
- **Primary**: Коричневые оттенки (дерево/кожа)
- **Secondary**: Темно-коричневые
- **Accent**: Золотые оттенки
- **Fantasy**: Тематические цвета для HP, магии и т.д.

### Типографика
- **Заголовки**: Cinzel (fantasy serif)
- **Основной текст**: Inter (modern sans-serif)
- **Код/статы**: JetBrains Mono

### Анимации
- Кости при броске
- Магические эффекты
- Переходы между страницами
- Hover эффекты

## 🔌 API Интеграция

### Эндпоинты
- `/api/auth/*` - Аутентификация
- `/api/characters/*` - Персонажи
- `/api/campaigns/*` - Кампании
- `/api/games/*` - Игры
- `/ws/game/{id}` - WebSocket для игр

### Состояние
- **Auth Store**: Пользователь и аутентификация
- **Game Store**: Текущая игра и WebSocket
- **React Query**: Кэширование API данных

## 🐛 Отладка

### Полезные инструменты
- React DevTools
- Redux DevTools (для Zustand)
- Network tab для API запросов
- Console для WebSocket событий

### Типичные проблемы
1. **CORS ошибки**: Проверьте настройки backend
2. **WebSocket не подключается**: Убедитесь что backend запущен
3. **Токен истек**: Автоматически обновляется через interceptors

## 🚀 Деплой

### Переменные окружения для продакшена
```bash
VITE_API_URL=https://your-api-domain.com
VITE_WS_URL=wss://your-api-domain.com
VITE_NODE_ENV=production
```

### Настройка Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /var/www/dnd-frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 📄 Лицензия

MIT License - см. файл LICENSE