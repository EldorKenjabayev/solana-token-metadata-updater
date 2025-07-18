#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔍 Проверка конфигурации Solana Metadata Tool');
console.log('===============================================\n');

let hasErrors = false;

// Проверка Node.js версии
function checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    console.log('📦 Версия Node.js:');
    console.log(`   Текущая: ${nodeVersion}`);
    
    if (majorVersion >= 18) {
        console.log('   ✅ Версия поддерживается\n');
    } else {
        console.log('   ❌ Требуется Node.js 18.x или выше\n');
        hasErrors = true;
    }
}

// Проверка зависимостей
function checkDependencies() {
    console.log('📚 Зависимости:');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const dependencies = Object.keys(packageJson.dependencies || {});
        
        let missingDeps = [];
        
        dependencies.forEach(dep => {
            try {
                require.resolve(dep);
                console.log(`   ✅ ${dep}`);
            } catch (error) {
                console.log(`   ❌ ${dep} - не установлен`);
                missingDeps.push(dep);
                hasErrors = true;
            }
        });
        
        if (missingDeps.length === 0) {
            console.log('   🎉 Все зависимости установлены\n');
        } else {
            console.log(`\n   💡 Запустите: npm install\n`);
        }
        
    } catch (error) {
        console.log('   ❌ Не удалось прочитать package.json\n');
        hasErrors = true;
    }
}

// Проверка кошелька
function checkWallet() {
    console.log('💼 Кошелек:');
    
    const walletPath = process.env.WALLET_PATH || './wallets/keypair.json';
    
    if (fs.existsSync(walletPath)) {
        try {
            const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
            
            if (Array.isArray(walletData) && walletData.length === 64) {
                console.log('   ✅ Кошелек найден и имеет правильный формат');
                console.log(`   📍 Файл: ${walletPath}`);
            } else {
                console.log('   ❌ Кошелек имеет неверный формат');
                console.log('   💡 Должен быть массив из 64 чисел');
                hasErrors = true;
            }
        } catch (error) {
            console.log('   ❌ Не удалось прочитать файл кошелька');
            console.log(`   💡 Проверьте JSON формат файла ${walletPath}`);
            hasErrors = true;
        }
    } else {
        console.log(`   ❌ Файл кошелька не найден: ${walletPath}`);
        console.log('   💡 Создайте файл кошелька или укажите правильный путь в .env');
        hasErrors = true;
    }
    
    console.log('');
}

// Проверка конфигурации токена
function checkTokenConfig() {
    console.log('🎯 Конфигурация токена:');
    
    try {
        const config = require('../src/config.js');
        
        // Проверка обязательных полей
        if (config.mintAddress) {
            console.log(`   ✅ Адрес токена: ${config.mintAddress}`);
            
            if (config.mintAddress.length !== 44) {
                console.log('   ⚠️  Адрес токена может быть неверным (не 44 символа)');
            }
        } else {
            console.log('   ❌ Адрес токена не указан');
            hasErrors = true;
        }
        
        if (config.metadata?.name) {
            console.log(`   ✅ Название: ${config.metadata.name}`);
        } else {
            console.log('   ❌ Название токена не указано');
            hasErrors = true;
        }
        
        if (config.metadata?.symbol) {
            console.log(`   ✅ Символ: ${config.metadata.symbol}`);
        } else {
            console.log('   ❌ Символ токена не указан');
            hasErrors = true;
        }
        
        // Проверка изображения
        if (config.metadata?.imagePath) {
            const imagePath = path.resolve(config.metadata.imagePath);
            
            if (fs.existsSync(imagePath)) {
                const stats = fs.statSync(imagePath);
                const sizeKB = (stats.size / 1024).toFixed(1);
                
                console.log(`   ✅ Изображение: ${config.metadata.imagePath} (${sizeKB} KB)`);
            } else {
                console.log(`   ❌ Файл изображения не найден: ${config.metadata.imagePath}`);
                hasErrors = true;
            }
        } else {
            console.log('   ❌ Путь к изображению не указан');
            hasErrors = true;
        }
        
    } catch (error) {
        console.log('   ❌ Ошибка загрузки конфигурации');
        console.log(`   💡 ${error.message}`);
        hasErrors = true;
    }
    
    console.log('');
}

// Итоговый отчет
function showSummary() {
    console.log('📋 Итоговый отчет:');
    console.log('==================');
    
    if (hasErrors) {
        console.log('❌ Обнаружены критические ошибки');
        console.log('💡 Исправьте ошибки перед запуском скрипта\n');
        process.exit(1);
    } else {
        console.log('✅ Все проверки пройдены успешно!');
        console.log('🚀 Вы можете запустить скрипт: npm start\n');
    }
}

// Запуск всех проверок
function runAllChecks() {
    checkNodeVersion();
    checkDependencies();
    checkWallet();
    checkTokenConfig();
    showSummary();
}

// Основная функция
if (require.main === module) {
    runAllChecks();
}