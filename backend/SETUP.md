# D&D AI Game Server - Инструкция по установке и запуску

## Системные требования

- **ОС**: Linux (Ubuntu 20.04+), macOS, Windows 10+
- **RAM**: Минимум 8GB, рекомендуется 16GB+
- **Диск**: 20GB свободного места
- **GPU**: NVIDIA GPU с 8GB+ VRAM (для Stable Diffusion)
- **Docker**: Docker Engine 20.10+ и Docker Compose 2.0+
- **Python**: 3.11+

## Установка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd dnd-ai-game
```

### 2. Настройка окружения

```bash
# Копируем файл конфигурации
cp .env.example .env

# Редактируем .env файл
nano .env
```

**Важно**: Измените ключи безопасности в .env файле:
- `SECRET_KEY` - для JWT токенов (минимум 32 символа)
- `ENCRYPTION_KEY` - для шифрования данных (ровно 32 символа)

### 3. Запуск сервисов через Docker

```bash
# Запуск PostgreSQL, Redis, Ollama, Stable Diffusion
docker-compose up -d

# Проверка статуса контейнеров
docker-compose ps
```

### 4. Установка Python зависимостей

```bash
# Создание виртуального окружения
python3.11 -m venv venv
source venv/bin/activate  # Linux/macOS
# или
venv\Scripts\activate  # Windows

# Установка зависимостей
pip install -r requirements.txt
```

### 5. Настройка Ollama

```bash
# Подключение к контейнеру Ollama
docker exec -it dnd_ollama bash

# Загрузка модели ИИ
ollama pull llama3.1:8b

# Проверка модели
ollama list
exit
```

### 6. Проверка сервисов

```bash
# Проверка PostgreSQL
docker exec -it dnd_postgres psql -U dnd_user -d dnd_game -c "SELECT version();"

# Проверка Redis
docker exec -it dnd_redis redis-cli ping

# Проверка Ollama
curl http://localhost:11434/api/tags

# Проверка Stable Diffusion
curl http://localhost:7860/health
```

## Запуск приложения

### 1. Первый запуск (инициализация БД)

```bash
# Активируем виртуальное окружение
source venv/bin/activate

# Запускаем сервер
python run.py
```

Сервер будет доступен по адресу: http://localhost:8000

### 2. Проверка работы API

```bash
# Проверка здоровья сервера
curl http://localhost:8000/health

# Информация об API
curl http://localhost:8000/api/info

# Создание тестового пользователя
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@example.com",
    "password": "password123",
    "display_name": "Игрок 1"
  }'
```

## Структура проекта

```
backend/
├── app/
│   ├── main.py              # Главное приложение FastAPI
│   ├── config.py            # Конфигурация
│   ├── core/                # Ядро системы
│   ├── models/              # Модели базы данных
│   ├── api/                 # API endpoints
│   ├── services/            # Бизнес-логика
│   ├── game/                # D&D механика
│   └── websocket/           # WebSocket обработчики
├── docker-compose.yml       # Docker сервисы
├── requirements.txt         # Python зависимости
├── run.py                   # Скрипт запуска
└── .env                     # Конфигурация
```

## Тестирование

### 1. Тестирование аутентификации

```bash
# Регистрация
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "email": "test@test.com", "password": "test123"}'

# Вход
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test123"}'
```

### 2. Создание персонажа

```bash
# Получаем токен из предыдущего запроса
TOKEN="your_access_token_here"

# Создаем персонажа
curl -X POST http://localhost:8000/api/characters/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aragorn",
    "race": "Human",
    "character_class": "Ranger",
    "strength": 16,
    "dexterity": 14,
    "constitution": 15,
    "intelligence": 12,
    "wisdom": 16,
    "charisma": 13
  }'
```

### 3. Тестирование WebSocket

Для тестирования WebSocket соединений можно использовать специальные инструменты или написать простой клиент:

```python
import asyncio
import websockets
import json

async def test_websocket():
    token = "your_access_token_here"
    game_id = "your_game_id_here"
    
    uri = f"ws://localhost:8000/api/ws/game/{game_id}?token={token}"
    
    async with websockets.connect(uri) as websocket:
        # Отправляем сообщение
        message = {
            "type": "chat_message",
            "data": {
                "content": "Привет всем!",
                "is_ooc": True
            }
        }
        await websocket.send(json.dumps(message))
        
        # Слушаем ответы
        async for message in websocket:
            data = json.loads(message)
            print(f"Получено: {data}")

# Запуск теста
asyncio.run(test_websocket())
```

## Логи и мониторинг

### Просмотр логов

```bash
# Логи backend приложения
tail -f dnd_server.log

# Логи Docker контейнеров
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f postgres
docker-compose logs -f ollama
```

### Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Проверка места на диске
df -h

# Проверка использования GPU (если используется)
nvidia-smi
```

## Производительность и оптимизация

### PostgreSQL

```sql
-- Проверка производительности запросов
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Проверка размера таблиц
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE tablename = 'characters';
```

### Redis

```bash
# Информация о Redis
docker exec -it dnd_redis redis-cli info memory

# Статистика ключей
docker exec -it dnd_redis redis-cli --scan --pattern "*" | head -10
```

## Решение проблем

### Проблема: Ollama не отвечает

```bash
# Проверка статуса
docker exec -it dnd_ollama ollama list

# Перезапуск контейнера
docker-compose restart ollama

# Проверка логов
docker-compose logs ollama
```

### Проблема: Stable Diffusion падает с ошибкой памяти

```bash
# Проверка использования GPU памяти
nvidia-smi

# Уменьшение размера изображений в конфигурации
# Отредактируйте app/services/image_service.py
# Измените default_settings["width"] и ["height"] на 256
```

### Проблема: База данных недоступна

```bash
# Проверка подключения
docker exec -it dnd_postgres pg_isready -U dnd_user

# Перезапуск PostgreSQL
docker-compose restart postgres

# Проверка логов
docker-compose logs postgres
```

## Бэкап и восстановление

### Создание бэкапа

```bash
# Бэкап базы данных
docker exec -t dnd_postgres pg_dump -U dnd_user dnd_game > backup_$(date +%Y%m%d).sql

# Бэкап uploaded файлов
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Бэкап Redis данных
docker exec dnd_redis redis-cli BGSAVE
docker cp dnd_redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

### Восстановление

```bash
# Восстановление базы данных
docker exec -i dnd_postgres psql -U dnd_user dnd_game < backup_20240101.sql

# Восстановление файлов
tar -xzf uploads_backup_20240101.tar.gz

# Восстановление Redis
docker cp redis_backup_20240101.rdb dnd_redis:/data/dump.rdb
docker-compose restart redis
```

## Безопасность

### Рекомендации

1. **Изменить пароли по умолчанию** в .env файле
2. **Использовать HTTPS** в production
3. **Настроить firewall** для ограничения доступа к портам
4. **Регулярно обновлять** зависимости
5. **Мониторить логи** на подозрительную активность

### Обновление ключей безопасности

```bash
# Генерация нового SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Генерация нового ENCRYPTION_KEY
python -c "import secrets; print(secrets.token_urlsafe(24))"
```

## Масштабирование

### Горизонтальное масштабирование

Для увеличения производительности можно:

1. **Запустить несколько экземпляров backend** за load balancer
2. **Использовать Redis Cluster** для распределения нагрузки
3. **Настроить PostgreSQL реплики** для чтения
4. **Добавить CDN** для статических файлов

### Вертикальное масштабирование

1. **Увеличить ресурсы контейнеров** в docker-compose.yml
2. **Оптимизировать PostgreSQL** настройки
3. **Добавить больше GPU** для Stable Diffusion

## Поддержка

### Контакты

- GitHub Issues: [ссылка на репозиторий]
- Документация API: http://localhost:8000/docs
- Swagger UI: http://localhost:8000/redoc

### Известные ограничения

1. **Максимум 6 игроков** в одной игре
2. **Генерация изображений** требует GPU с 8GB+ VRAM
3. **ИИ модель** требует интернет для первоначальной загрузки
4. **WebSocket соединения** ограничены настройками браузера

### Roadmap

- [ ] Поддержка кастомных моделей ИИ
- [ ] Интеграция с внешними D&D API
- [ ] Мобильное приложение
- [ ] Голосовой ввод/вывод
- [ ] 3D визуализация сцен