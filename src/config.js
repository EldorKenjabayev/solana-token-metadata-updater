/**
 * Конфигурация для создания метаданных Solana токена
 */

module.exports = {
  // Адрес токена клиента (ЗАМЕНИТЕ НА ВАШ!)
  mintAddress: "HSu6v8PcmiGV7DrYEccQe8BwhnW7mZ5YWysQ6Sw2oZYv",
  
  // Метаданные токена
  metadata: {
    // Название токена (максимум 32 символа)
    name: "My Token Name",
    
    // Символ токена (максимум 10 символов)
    symbol: "MTN",
    
    // Описание проекта (рекомендуется до 1000 символов)
    description: "Test token for metadata demonstration. This token showcases the integration of Metaplex Token Metadata Protocol with Solana SPL tokens.",
    
    // Путь к изображению логотипа (локальный файл)
    imagePath: "./assets/image.png",
    
    // Веб-сайт проекта (опционально)
    external_url: "", // Например: "https://yourproject.com"
  },
  
  // Настройки загрузки файлов
  upload: {
    // Максимальный размер изображения в байтах (2MB)
    imageMaxSize: 2 * 1024 * 1024,
    
    // Количество попыток загрузки при неудаче
    retryAttempts: 3,
    
    // Таймаут для операций загрузки (в миллисекундах)
    timeout: 30000, // 30 секунд
  },
  
  // Валидация конфигурации
  validate() {
    const errors = [];
    
    // Проверка обязательных полей
    if (!this.mintAddress) {
      errors.push("mintAddress не указан");
    }
    
    if (!this.metadata.name) {
      errors.push("metadata.name не указан");
    }
    
    if (!this.metadata.symbol) {
      errors.push("metadata.symbol не указан");
    }
    
    if (!this.metadata.imagePath) {
      errors.push("metadata.imagePath не указан");
    }
    
    // Проверка длины полей
    if (this.metadata.name.length > 32) {
      errors.push("metadata.name слишком длинный (максимум 32 символа)");
    }
    
    if (this.metadata.symbol.length > 10) {
      errors.push("metadata.symbol слишком длинный (максимум 10 символов)");
    }
    
    if (errors.length > 0) {
      console.error("❌ Ошибки в конфигурации:");
      errors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }
    
    return true;
  }
};

// Автоматическая валидация при импорте
if (require.main !== module) {
  module.exports.validate();
}