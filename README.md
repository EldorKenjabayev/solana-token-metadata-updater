# Инструмент для установки метаданных токена Solana

Этот инструмент позволяет создавать токены в сети Solana и устанавливать для них метаданные (название, символ, логотип).

## Подготовка к работе

1. Установите Node.js (если еще не установлен)
2. Установите Solana CLI (если еще не установлен):
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

## Установка и настройка

1. Создайте новую папку и скопируйте в нее все файлы проекта:
   ```bash
   mkdir solana-metadata-tool
   cd solana-metadata-tool
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

3. Создайте кошелек для тестирования:
   ```bash
   mkdir wallets
   solana-keygen new --no-bip39-passphrase -o wallets/keypair.json
   ```
   ⚠️ Сохраните фразу восстановления (seed phrase) в надежном месте!

4. Переключитесь на devnet и получите тестовые SOL:
   ```bash
   solana config set --url devnet
   solana airdrop 2 wallets/keypair.json
   ```

## Создание токена

1. Создайте новый токен:
   ```bash
   spl-token create-token --decimals 6
   ```
   Сохраните адрес токена, он понадобится в следующем шаге!

2. Создайте аккаунт для токена и заминтите токены:
   ```bash
   spl-token create-account ВАШ_АДРЕС_ТОКЕНА
   spl-token mint ВАШ_АДРЕС_ТОКЕНА 1000000000
   ```

## Настройка метаданных

1. Скопируйте файл .env.example в .env:
   ```bash
   cp .env.example .env
   ```

2. Отредактируйте файл .env и укажите ваши значения:
   ```env
   # Выберите сеть (devnet или mainnet-beta)
   SOLANA_NETWORK=devnet

   # Укажите адрес вашего токена
   TOKEN_MINT_ADDRESS=YOUR_TOKEN_ADDRESS_HERE

   # Настройте метаданные токена
   TOKEN_NAME=My Super Token
   TOKEN_SYMBOL=MST
   TOKEN_URI=https://example.com/token-logo.png

   # Путь к файлу кошелька (менять не нужно)
   WALLET_PATH=./wallets/keypair.json
   ```

   Где:
   - TOKEN_NAME - название вашего токена
   - TOKEN_SYMBOL - короткий символ токена (например, BTC, ETH)
   - TOKEN_URI - ссылка на логотип токена (рекомендуемый размер 200x200)

3. Запустите скрипт для установки метаданных:
   ```bash
   node set-metadata-v2.js
   ```

## Проверка результатов

1. После успешного выполнения скрипта вы увидите сообщение:
   ```
   🎉 УСПЕХ! Метаданные созданы!
   🔗 Токен: [адрес вашего токена]
   📝 Метаданные: [адрес метаданных]
   ```

2. Перейдите по ссылке в Solana Explorer, чтобы проверить ваш токен:
   ```
   https://explorer.solana.com/address/[адрес_токена]?cluster=devnet
   ```

## Возможные ошибки

1. "Metadata already exists" - метаданные для этого токена уже существуют.
   Решение: Используйте другой адрес токена или обновите существующие метаданные.

2. "Invalid mint authority" - у вас нет прав на изменение токена.
   Решение: Убедитесь, что вы используете правильный кошелек-владелец токена.

3. "Not enough SOL" - недостаточно SOL для оплаты транзакции.
   Решение: Получите больше тестовых SOL командой:
   ```bash
   solana airdrop 2 wallets/keypair.json
   ```

## Важные замечания

- Все операции выполняются в тестовой сети (devnet)
- Для работы в основной сети (mainnet) измените URL в скрипте на 'https://api.mainnet-beta.solana.com'
- Храните приватные ключи (keypair.json) в безопасном месте
- Перед работой с реальными токенами протестируйте всё в devnet
