-- Инициализация базы данных для D&D AI Game
-- Этот файл выполняется при первом запуске PostgreSQL в Docker

-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Создание индексов для полнотекстового поиска
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание пользователя приложения (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dnd_user') THEN
CREATE ROLE dnd_user WITH LOGIN PASSWORD 'dnd_password';
END IF;
END
$$;

-- Предоставление прав
GRANT ALL PRIVILEGES ON DATABASE dnd_game TO dnd_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dnd_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dnd_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO dnd_user;

-- Настройки для оптимизации производительности
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = '200';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = '100';

-- Применение настроек (требует перезапуска PostgreSQL)
SELECT pg_reload_conf();

-- Создание схемы для логов (опционально)
CREATE SCHEMA IF NOT EXISTS logs;

-- Таблица для логов API запросов
CREATE TABLE IF NOT EXISTS logs.api_requests (
                                                 id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            method VARCHAR(10),
    path TEXT,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    response_status INTEGER,
    response_time_ms INTEGER,
    request_body JSONB,
    response_body JSONB
    );

-- Таблица для логов игровых событий
CREATE TABLE IF NOT EXISTS logs.game_events (
                                                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            game_id UUID,
                            user_id UUID,
                            event_type VARCHAR(50),
    event_data JSONB,
    character_id UUID
    );

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_api_requests_timestamp ON logs.api_requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON logs.api_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_game_events_timestamp ON logs.game_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON logs.game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_user_id ON logs.game_events(user_id);

-- Функция для очистки старых логов
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $
DECLARE
deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Удаляем логи старше 30 дней
DELETE FROM logs.api_requests
WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';

GET DIAGNOSTICS temp_count = ROW_COUNT;
deleted_count := deleted_count + temp_count;

DELETE FROM logs.game_events
WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';

GET DIAGNOSTICS temp_count = ROW_COUNT;
deleted_count := deleted_count + temp_count;

RETURN deleted_count;
END;
$ LANGUAGE plpgsql;

-- Предоставляем права пользователю на схему logs
GRANT ALL PRIVILEGES ON SCHEMA logs TO dnd_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA logs TO dnd_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA logs TO dnd_user;

COMMIT;