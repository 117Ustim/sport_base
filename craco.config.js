// ✅ SECURITY FIX: Удаление console.log в production build
module.exports = {
  babel: {
    plugins: [
      // Удаляем console.log только в production
      process.env.NODE_ENV === 'production' && [
        'transform-remove-console',
        {
          exclude: ['error', 'warn'] // Оставляем console.error и console.warn
        }
      ]
    ].filter(Boolean)
  }
};
