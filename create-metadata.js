const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const { createCreateMetadataAccountV3Instruction } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

async function createMetadata() {
    try {
        console.log('🚀 Создание метаданных для SPL токена\n');
        
        // Подключение к devnet
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        
        // Загрузка кошелька
        const walletData = JSON.parse(fs.readFileSync('./wallets/keypair.json', 'utf8'));
        const payer = Keypair.fromSecretKey(new Uint8Array(walletData));
        
        console.log(`✅ Кошелек: ${payer.publicKey.toString().slice(0, 8)}...`);
        
        // Параметры токена
        const mintAddress = new PublicKey('HSu6v8PcmiGV7DrYEccQe8BwhnW7mZ5YWysQ6Sw2oZYv');
        const metadataUri = 'https://arweave.net/9AwRjcRpHNqPrxRcikz9KNg4Q5fHJxtkv5JVjiCikJBw';
        
        // Вычисление адреса метаданных
        const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
        const [metadataAddress] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mintAddress.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );
        
        console.log(`📍 Metadata Address: ${metadataAddress.toString()}`);
        
        // Создание инструкции метаданных
        const instruction = createCreateMetadataAccountV3Instruction(
            {
                metadata: metadataAddress,
                mint: mintAddress,
                mintAuthority: payer.publicKey,
                payer: payer.publicKey,
                updateAuthority: payer.publicKey,
            },
            {
                createMetadataAccountArgsV3: {
                    data: {
                        name: 'My Token Name',
                        symbol: 'MTN',
                        uri: metadataUri,
                        sellerFeeBasisPoints: 0,
                        creators: [
                            {
                                address: payer.publicKey,
                                verified: true,
                                share: 100,
                            },
                        ],
                        collection: null,
                        uses: null,
                    },
                    isMutable: true,
                    collectionDetails: null,
                },
            }
        );
        
        // Создание и отправка транзакции
        const transaction = new Transaction().add(instruction);
        const signature = await connection.sendTransaction(transaction, [payer]);
        
        console.log(`✅ Транзакция отправлена: ${signature}`);
        console.log('⏳ Ожидание подтверждения...');
        
        await connection.confirmTransaction(signature);
        
        console.log('\n🎉 УСПЕХ! Метаданные созданы!');
        console.log(`🔗 Explorer: https://explorer.solana.com/address/${mintAddress.toString()}?cluster=devnet`);
        console.log(`📜 Транзакция: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        
        if (error.message.includes('already exists')) {
            console.error('💡 Токен уже имеет метаданные');
            console.error('🔗 Проверьте: https://explorer.solana.com/address/HSu6v8PcmiGV7DrYEccQe8BwhnW7mZ5YWysQ6Sw2oZYv?cluster=devnet');
        }
    }
}

createMetadata();
