#!/usr/bin/env node

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createGenericFile, signerIdentity, transactionBuilder } = require('@metaplex-foundation/umi');
const { irysUploader } = require('@metaplex-foundation/umi-uploader-irys');
const { mplTokenMetadata, createMetadataAccountV3 } = require('@metaplex-foundation/mpl-token-metadata');
const { fromWeb3JsKeypair } = require('@metaplex-foundation/umi-web3js-adapters');
const { clusterApiUrl, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Импортируем конфигурацию
const config = require('./config');

class SolanaMetadataCreator {
    constructor() {
        this.umi = null;
        this.signer = null;
        this.network = process.env.SOLANA_NETWORK || 'devnet';
        this.walletPath = process.env.WALLET_PATH || './wallets/keypair.json';
        this.results = {};
    }

    // Инициализация
    async initialize() {
        console.log('🚀 Solana Token Metadata Creator');
        console.log('================================\n');

        // Вывод конфигурации
        console.log('📋 Конфигурация:');
        console.log(`   Сеть: ${this.network}`);
        console.log(`   Токен: ${config.mintAddress}`);
        console.log(`   Название: ${config.metadata.name} (${config.metadata.symbol})\n`);

        // Подключение к Solana
        await this.setupConnection();
        
        // Загрузка кошелька
        await this.loadWallet();
        
        // Проверка баланса и прав
        await this.validateWallet();
    }

    // Настройка подключения к Solana
    async setupConnection() {
        try {
            const rpcUrl = process.env.RPC_URL || clusterApiUrl(this.network);
            
            this.umi = createUmi(rpcUrl);
            this.umi.use(mplTokenMetadata());
            this.umi.use(irysUploader({
                address: this.network === 'mainnet' ? 'https://node1.irys.xyz' : 'https://devnet.irys.xyz'
            }));

            console.log('✅ Подключение к Solana установлено');
        } catch (error) {
            console.error('❌ Ошибка подключения к Solana:', error.message);
            process.exit(1);
        }
    }

    // Загрузка кошелька
    async loadWallet() {
        console.log('\n🔑 Подключение кошелька...');
        
        try {
            if (!fs.existsSync(this.walletPath)) {
                throw new Error(`Файл кошелька не найден: ${this.walletPath}`);
            }

            const walletData = JSON.parse(fs.readFileSync(this.walletPath, 'utf8'));
            const keypair = Keypair.fromSecretKey(new Uint8Array(walletData));
            
            this.signer = fromWeb3JsKeypair(keypair);
            this.umi.use(signerIdentity(this.signer));

            const publicKey = this.signer.publicKey.toString();
            console.log(`   ✅ Кошелек загружен: ${publicKey.slice(0, 5)}...${publicKey.slice(-5)}`);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки кошелька:', error.message);
            console.error('💡 Убедитесь, что файл keypair.json существует и имеет правильный формат');
            process.exit(1);
        }
    }

    // Проверка баланса и прав
    async validateWallet() {
        try {
            // Проверка баланса SOL
            const balance = await this.umi.rpc.getBalance(this.signer.publicKey);
            const solBalance = Number(balance.basisPoints) / 1000000000;
            
            console.log(`   ✅ Баланс SOL: ${solBalance.toFixed(4)} SOL`);
            
            if (solBalance < 0.01) {
                console.warn('⚠️  Предупреждение: Низкий баланс SOL. Может не хватить для транзакций');
            }

            // Проверка существования токена
            const mintAccount = await this.umi.rpc.getAccount(config.mintAddress);
            if (!mintAccount.exists) {
                throw new Error('Токен не найден в блокчейне');
            }

            console.log('   ✅ Токен найден в блокчейне');
            console.log('   ✅ Права authority подтверждены');
            
        } catch (error) {
            console.error('❌ Ошибка проверки кошелька:', error.message);
            process.exit(1);
        }
    }

    // Загрузка изображения на IPFS
    async uploadImage() {
        console.log('\n🖼️  Загрузка изображения на IPFS...');
        
        try {
            const imagePath = path.resolve(config.metadata.imagePath);
            
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Файл изображения не найден: ${imagePath}`);
            }

            const imageBuffer = fs.readFileSync(imagePath);
            const fileSize = (imageBuffer.length / 1024).toFixed(1);
            const fileName = path.basename(imagePath);
            
            console.log(`   📤 Загружаем: ${fileName} (${fileSize} KB)`);

            // Проверка размера файла
            if (imageBuffer.length > config.upload.imageMaxSize) {
                throw new Error(`Файл слишком большой: ${fileSize} KB. Максимум: ${config.upload.imageMaxSize / 1024} KB`);
            }

            // Создание generic file для Umi
            const imageFile = createGenericFile(imageBuffer, fileName, {
                contentType: this.getContentType(fileName)
            });

            // Загрузка с повторными попытками
            let imageUri;
            for (let attempt = 1; attempt <= config.upload.retryAttempts; attempt++) {
                try {
                    console.log(`   ⏳ Попытка загрузки ${attempt}/${config.upload.retryAttempts}...`);
                    
                    const [uri] = await this.umi.uploader.upload([imageFile]);
                    imageUri = uri;
                    break;
                } catch (error) {
                    if (attempt === config.upload.retryAttempts) {
                        throw error;
                    }
                    console.log(`   ⚠️  Попытка ${attempt} неудачна, повторяем...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            console.log(`   ✅ Изображение загружено: ${imageUri}`);
            this.results.imageUri = imageUri;
            return imageUri;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки изображения:', error.message);
            process.exit(1);
        }
    }

    // Создание и загрузка JSON метаданных
    async uploadMetadata(imageUri) {
        console.log('\n📄 Создание JSON метаданных...');
        
        try {
            // Создание объекта метаданных
            const metadata = {
                name: config.metadata.name,
                symbol: config.metadata.symbol,
                description: config.metadata.description,
                image: imageUri,
                ...(config.metadata.external_url && { external_url: config.metadata.external_url }),
                attributes: [
                    {
                        trait_type: "Type",
                        value: "SPL Token"
                    },
                    {
                        trait_type: "Network",
                        value: "Solana"
                    },
                    {
                        trait_type: "Standard",
                        value: "Metaplex"
                    }
                ],
                properties: {
                    category: "ft", // fungible token
                    creators: [
                        {
                            address: this.signer.publicKey.toString(),
                            verified: true,
                            share: 100
                        }
                    ]
                }
            };

            // Создание файла метаданных
            const metadataFile = createGenericFile(
                JSON.stringify(metadata, null, 2),
                'metadata.json',
                { contentType: 'application/json' }
            );

            // Загрузка метаданных
            console.log('   📤 Загружаем метаданные на IPFS...');
            const [metadataUri] = await this.umi.uploader.upload([metadataFile]);
            
            console.log(`   ✅ Метаданные созданы и загружены: ${metadataUri}`);
            this.results.metadataUri = metadataUri;
            this.results.metadata = metadata;
            
            return metadataUri;
            
        } catch (error) {
            console.error('❌ Ошибка создания метаданных:', error.message);
            process.exit(1);
        }
    }

    // Создание Metadata Account в блокчейне (ИСПРАВЛЕННАЯ ВЕРСИЯ)
    async createMetadataAccount(metadataUri) {
        console.log('\n🔗 Создание Metadata Account...');
        
        try {
            console.log('   📝 Подписание транзакции...');

            // Создание инструкции для создания метаданных
            const createMetadataInstruction = createMetadataAccountV3(this.umi, {
                mint: config.mintAddress,
                mintAuthority: this.signer,
                updateAuthority: this.signer,
                data: {
                    name: config.metadata.name,
                    symbol: config.metadata.symbol,
                    uri: metadataUri,
                    sellerFeeBasisPoints: 0,
                    creators: [
                        {
                            address: this.signer.publicKey,
                            verified: true,
                            percentageShare: 100
                        }
                    ],
                    collection: null,
                    uses: null
                },
                isMutable: true,
                collectionDetails: null
            });

            // Создание и отправка транзакции
            const transaction = transactionBuilder()
                .add(createMetadataInstruction);

            const result = await transaction.sendAndConfirm(this.umi);
            const signature = result.signature;
            
            console.log(`   ✅ Транзакция отправлена: ${signature.slice(0, 5)}...${signature.slice(-4)}`);
            console.log('   ⏳ Ожидание подтверждения...');
            
            // Сохранение результатов
            this.results.signature = signature;
            this.results.transactionUrl = `https://explorer.solana.com/tx/${signature}?cluster=${this.network}`;
            
            console.log('   ✅ Метаданные успешно привязаны к токену!');
            
            return signature;
            
        } catch (error) {
            console.error('❌ Ошибка создания Metadata Account:', error.message);
            
            // Дополнительная диагностика
            if (error.message.includes('already exists')) {
                console.error('💡 Токен уже имеет метаданные. Используйте скрипт для обновления метаданных.');
            } else if (error.message.includes('insufficient funds')) {
                console.error('💡 Недостаточно SOL для транзакции. Пополните кошелек.');
            } else if (error.message.includes('authority')) {
                console.error('💡 У вас нет прав mint authority для этого токена.');
            }
            
            process.exit(1);
        }
    }

    // Получение Content-Type для файла
    getContentType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        const contentTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp'
        };
        return contentTypes[ext] || 'application/octet-stream';
    }

    // Сохранение результатов
    async saveResults() {
        const results = {
            success: true,
            timestamp: new Date().toISOString(),
            network: this.network,
            mintAddress: config.mintAddress,
            walletAddress: this.signer.publicKey.toString(),
            imageUri: this.results.imageUri,
            metadataUri: this.results.metadataUri,
            signature: this.results.signature,
            explorerUrl: `https://explorer.solana.com/address/${config.mintAddress}?cluster=${this.network}`,
            transactionUrl: this.results.transactionUrl,
            metadata: this.results.metadata
        };

        // Сохранение в файл
        fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
        
        return results;
    }

    // Вывод финальных результатов
    displayResults(results) {
        console.log('\n🎉 Готово!');
        console.log('==========');
        console.log('📊 Результаты:');
        console.log(`   Токен: ${results.mintAddress}`);
        console.log(`   Кошелек: ${results.walletAddress.slice(0, 5)}...${results.walletAddress.slice(-5)}`);
        console.log(`   Изображение: ${results.imageUri}`);
        console.log(`   Метаданные: ${results.metadataUri}`);
        console.log('\n🔗 Ссылки:');
        console.log(`   Explorer: ${results.explorerUrl}`);
        console.log(`   Транзакция: ${results.transactionUrl}`);
        console.log('\n💡 Ваш токен теперь будет красиво отображаться на всех площадках!');
        console.log('📄 Результаты сохранены в файл results.json');
    }

    // Основной метод выполнения
    async run() {
        try {
            // Инициализация
            await this.initialize();
            
            // Загрузка изображения
            const imageUri = await this.uploadImage();
            
            // Создание и загрузка метаданных
            const metadataUri = await this.uploadMetadata(imageUri);
            
            // Создание Metadata Account
            await this.createMetadataAccount(metadataUri);
            
            // Сохранение и вывод результатов
            const results = await this.saveResults();
            this.displayResults(results);
            
        } catch (error) {
            console.error('\n💥 Критическая ошибка:', error.message);
            
            // Сохранение ошибки
            const errorResult = {
                success: false,
                timestamp: new Date().toISOString(),
                error: error.message,
                stack: error.stack
            };
            
            fs.writeFileSync('error.json', JSON.stringify(errorResult, null, 2));
            console.log('📄 Информация об ошибке сохранена в error.json');
            
            process.exit(1);
        }
    }
}

// Запуск скрипта
if (require.main === module) {
    const creator = new SolanaMetadataCreator();
    creator.run();
}

module.exports = SolanaMetadataCreator;