const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const { 
    createCreateMetadataAccountV3Instruction,
    PROGRAM_ID 
} = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
require('dotenv').config();

async function setMetadata() {
    try {
        console.log('🚀 Начинаем установку метаданных токена...\n');
        
        // Connect to network from .env
        const network = process.env.SOLANA_NETWORK === 'mainnet-beta' 
            ? 'https://api.mainnet-beta.solana.com' 
            : 'https://api.devnet.solana.com';
        
        const connection = new Connection(network, 'confirmed');
        const walletData = JSON.parse(fs.readFileSync(process.env.WALLET_PATH, 'utf8'));
        const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
        
        console.log(`✅ Используется кошелек: ${wallet.publicKey.toString()}`);
        console.log(`📡 Сеть: ${process.env.SOLANA_NETWORK}`);
        
        const mintAddress = new PublicKey(process.env.TOKEN_MINT_ADDRESS);

        const tokenMetadata = {
            name: process.env.TOKEN_NAME,
            symbol: process.env.TOKEN_SYMBOL,
            uri: process.env.TOKEN_URI,
            sellerFeeBasisPoints: 0,
            creators: [
                {
                    address: wallet.publicKey,
                    verified: true,
                    share: 100,
                }
            ],
            collection: null,
            uses: null,
        };

        console.log('\n1. Создание метаданных для токена...');
        console.log(`Название: ${tokenMetadata.name}`);
        console.log(`Символ: ${tokenMetadata.symbol}`);
        const [metadataAddress] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata'),
                PROGRAM_ID.toBuffer(),
                mintAddress.toBuffer(),
            ],
            PROGRAM_ID
        );

        console.log(`\n2. Метаданные будут созданы по адресу: ${metadataAddress.toString()}`);
        const instruction = createCreateMetadataAccountV3Instruction(
            {
                metadata: metadataAddress,
                mint: mintAddress,
                mintAuthority: wallet.publicKey,
                payer: wallet.publicKey,
                updateAuthority: wallet.publicKey,
            },
            {
                createMetadataAccountArgsV3: {
                    data: tokenMetadata,
                    isMutable: true,
                    collectionDetails: null,
                },
            }
        );
        const transaction = new Transaction().add(instruction);
        const signature = await connection.sendTransaction(transaction, [wallet]);
        
        console.log(`\n3. ✅ Транзакция отправлена: ${signature}`);
        console.log('⏳ Ожидание подтверждения...');
        
        await connection.confirmTransaction(signature);
        
        console.log('\n🎉 УСПЕХ! Метаданные созданы!');
        console.log(`🔗 Токен: ${mintAddress.toString()}`);
        console.log(`📝 Метаданные: ${metadataAddress.toString()}`);
        console.log(`🌐 Посмотреть в Explorer: https://explorer.solana.com/address/${mintAddress.toString()}?cluster=devnet`);

    } catch (error) {
        console.error('❌ Ошибка:', error);
        console.error('💡 Детали:', error.message);
        if (error.message.includes('already exists')) {
            console.error('\n💡 Примечание: Метаданные для этого токена уже существуют.');
            console.error('Попробуйте обновить существующие метаданные вместо создания новых.');
        }
    }
}

setMetadata();
