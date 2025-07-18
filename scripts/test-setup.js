#!/usr/bin/env node

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { fromWeb3JsKeypair } = require('@metaplex-foundation/umi-web3js-adapters');
const { clusterApiUrl, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
require('dotenv').config();

console.log('🧪 Тестирование настроек Solana Metadata Tool');
console.log('==============================================\n');

const network = process.env.SOLANA_NETWORK || 'devnet';
const walletPath = process.env.WALLET_PATH || './wallets/keypair.json';

async function testSolanaConnection() {
    console.log('🌐 Тестирование подключения к Solana...');
    
    try {
        const rpcUrl = process.env.RPC_URL || clusterApiUrl(network);
        console.log(`   🔗 RPC URL: ${rpcUrl}`);
        console.log(`   📡 Сеть: ${network}`);
        
        const umi = createUmi(rpcUrl);
        
        // Тест подключения
        const slot = await umi.rpc.getSlot();
        console.log(`   ✅ Подключение успешно (слот: ${slot})`);
        
        return umi;
        
    } catch (error) {
        console.log('   ❌ Ошибка подключения к Solana');
        console.log(`   💡 ${error.message}`);
        return null;
    }
}

async function testWallet(umi) {
    console.log('\n💼 Тестирование кошелька...');
    
    try {
        if (!fs.existsSync(walletPath)) {
            throw new Error(`Файл кошелька не найден: ${walletPath}`);
        }
        
        const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
        const keypair = Keypair.fromSecretKey(new Uint8Array(walletData));
        const signer = fromWeb3JsKeypair(keypair);
        
        const publicKey = signer.publicKey.toString();
        console.log(`   📍 Адрес кошелька: ${publicKey}`);
        
        // Проверка баланса
        const balance = await umi.rpc.getBalance(signer.publicKey);
        const solBalance = Number(balance.basisPoints) / LAMPORTS_PER_SOL;
        
        console.log(`   💰 Баланс: ${solBalance.toFixed(6)} SOL`);
        
        if (solBalance === 0) {
            console.log('   ⚠️  Нулевой баланс');
            if (network === 'devnet') {
                console.log('   💡 Получите тестовые токены: solana airdrop 1 --url devnet');
            }
        } else {
            console.log('   ✅ Баланс достаточный для операций');
        }
        
        return { signer, balance: solBalance };
        
    } catch (error) {
        console.log('   ❌ Ошибка загрузки кошелька');
        console.log(`   💡 ${error.message}`);
        return null;
    }
}

async function runFullTest() {
    console.log('🚀 Начинаем полное тестирование...\n');
    
    // 1. Подключение к Solana
    const umi = await testSolanaConnection();
    if (!umi) {
        console.log('\n❌ Критическая ошибка: нет подключения к Solana');
        process.exit(1);
    }
    
    // 2. Тестирование кошелька
    const walletResult = await testWallet(umi);
    if (!walletResult) {
        console.log('\n❌ Критическая ошибка: проблемы с кошельком');
        process.exit(1);
    }
    
    console.log('\n🎉 Все основные проверки пройдены успешно!');
    console.log('🚀 Система готова к созданию метаданных');
    console.log('\n💡 Следующие шаги:');
    console.log('   npm start - запуск на devnet');
    console.log('   npm run mainnet - запуск на mainnet');
}

// Запуск тестирования
if (require.main === module) {
    runFullTest().catch(error => {
        console.error('\n💥 Неожиданная ошибка:', error.message);
        process.exit(1);
    });
}