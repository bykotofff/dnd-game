// test-server.mjs
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

    // Простая HTML страница для теста
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Server</title>
</head>
<body>
    <div style="
        min-height: 100vh; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: Arial, sans-serif;
        color: white;
        text-align: center;
    ">
        <div>
            <h1>✅ Node.js ES Module сервер работает!</h1>
            <p>IP: <strong>192.168.4.55:3000</strong></p>
            <p>Время: <strong>${new Date().toLocaleString()}</strong></p>
            <p>URL: <strong>${req.url}</strong></p>
            <p>Method: <strong>${req.method}</strong></p>
            <p>Node.js: <strong>${process.version}</strong></p>
            <div style="margin-top: 20px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px;">
                <strong>Диагностика:</strong><br>
                Если видите это сообщение - Node.js HTTP сервер работает!<br>
                Значит проблема была в Vite конфигурации.
            </div>
            <button onclick="location.reload()" style="
                background: white; 
                color: #667eea; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 5px; 
                cursor: pointer;
                margin-top: 20px;
                font-size: 16px;
            ">
                🔄 Обновить
            </button>
        </div>
    </div>
</body>
</html>`;

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache'
    });

    res.end(html);
});

const PORT = 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 Тестовый ES Module сервер запущен:`);
    console.log(`   Local:   http://localhost:${PORT}/`);
    console.log(`   Network: http://192.168.4.55:${PORT}/`);
    console.log(`   Node.js: ${process.version}`);
    console.log(`   
📋 Инструкции:
1. Откройте http://192.168.4.55:3000/ в браузере
2. Если страница загружается - Node.js работает, проблема в Vite
3. Если не загружается - проблема в сети/файрволе
    `);
});

server.on('error', (err) => {
    console.error('❌ Ошибка сервера:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Порт ${PORT} уже используется. Выполните:`);
        console.error(`taskkill /f /im node.exe`);
        console.error(`netstat -ano | findstr :${PORT}`);
    }
    if (err.code === 'EACCES') {
        console.error(`Нет прав для привязки к порту ${PORT}`);
    }
    if (err.code === 'EADDRNOTAVAIL') {
        console.error(`IP адрес ${HOST} недоступен`);
    }
});

process.on('SIGINT', () => {
    console.log('\n👋 Остановка сервера...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    console.error('❌ Необработанная ошибка:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Необработанное отклонение:', err);
    process.exit(1);
});