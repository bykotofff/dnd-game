-- Добавляем новое поле player_characters типа JSONB
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS player_characters JSONB DEFAULT '{}';

-- Обновляем существующие записи, устанавливая пустой объект для поля player_characters
UPDATE games
SET player_characters = '{}'::jsonb
WHERE player_characters IS NULL;

-- Добавляем ограничение NOT NULL для нового поля
ALTER TABLE games
    ALTER COLUMN player_characters SET NOT NULL;

-- Добавляем комментарий к полю для документации
COMMENT ON COLUMN games.player_characters IS 'JSON mapping of user_id to character_id {"user_id": "character_id"}';

-- Создаем индекс для более быстрого поиска по связям игрок-персонаж
CREATE INDEX IF NOT EXISTS idx_games_player_characters
    ON games USING GIN (player_characters);

-- Добавляем проверочное ограничение для валидации JSON структуры
-- (опционально - для дополнительной безопасности данных)
ALTER TABLE games
    ADD CONSTRAINT chk_player_characters_is_object
        CHECK (jsonb_typeof(player_characters) = 'object');