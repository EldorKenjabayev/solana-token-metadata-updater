# Инструкции для создания токена в Mainnet

## 1. Подготовка окружения

```bash
# Переключаемся на mainnet
solana config set --url mainnet-beta

# Создаем новый кошелек (если нужно)
solana-keygen new --no-bip39-passphrase -o wallets/mainnet-keypair.json

# !ВАЖНО: Для mainnet нужно иметь реальные SOL на балансе
# Airdrop в mainnet не работает
```

## 2. Настройка .env для mainnet

```properties
# Настройки сети
SOLANA_NETWORK=mainnet-beta

# Путь к файлу кошелька
WALLET_PATH=./wallets/mainnet-keypair.json

# Метаданные токена (настроить под свои нужды)
TOKEN_NAME=Your Token Name
TOKEN_SYMBOL=YTN
TOKEN_URI=https://your-metadata-uri.json
```

## 3. Создание токена в mainnet

```bash
# Активируем кошелек
solana config set --keypair wallets/mainnet-keypair.json

# Создаем токен
spl-token create-token --decimals 6

# Сохраняем адрес токена
MINT_ADDR=<адрес_созданного_токена>

# Создаем аккаунт для токена
spl-token create-account $MINT_ADDR

# Минтим токены
spl-token mint $MINT_ADDR 1000000000

# Блокируем эмиссию (mint authority)
spl-token authorize --authority "$WALLET_PATH" "$MINT_ADDR" mint --disable

# Проверяем баланс
spl-token balance $MINT_ADDR
```

## 4. Добавление метаданных

```bash
# Убедитесь что в .env указан правильный SOLANA_NETWORK=mainnet-beta
node set-metadata-v2.js
```

## Важные отличия от devnet:

1. Используется сеть mainnet-beta вместо devnet
2. Нужны реальные SOL для транзакций
3. Нет возможности использовать airdrop
4. Транзакции платные, нужно иметь достаточный баланс
5. Действия необратимы - будьте внимательны при выполнении команд

## Проверка результатов:

После выполнения всех команд, токен будет виден в Explorer:
https://explorer.solana.com/address/<MINT_ADDR>

И будет иметь:
- Фиксированную эмиссию
- Метаданные (имя, символ, изображение)
- Реальный баланс на вашем кошельке
