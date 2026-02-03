// ✅ SECURITY FIX: Валидация входных данных

// Проверка email
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Проверка телефона (украинский формат)
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return true; // Телефон опциональный
  const trimmed = phone.trim();
  if (trimmed === '') return true; // Пустой телефон допустим
  
  // Убираем все символы кроме цифр для подсчета
  const digitsOnly = trimmed.replace(/\D/g, '');
  
  // Проверяем что есть хотя бы 10 цифр и только допустимые символы
  const phoneRegex = /^[\d\s\+\-\(\)\.]+$/;
  return phoneRegex.test(trimmed) && digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

// Проверка имени/фамилии
export const isValidName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
};

// Проверка числовых значений
export const isValidNumber = (value, min = 0, max = 1000) => {
  if (value === '' || value === null || value === undefined) return true; // Опциональное поле
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

// Валидация данных клиента
export const validateClientData = (clientData) => {
  const errors = [];

  // Обязательные поля
  if (!isValidName(clientData.name)) {
    errors.push('Ім\'я повинно містити від 2 до 50 символів');
  }

  if (!isValidName(clientData.surname)) {
    errors.push('Прізвище повинно містити від 2 до 50 символів');
  }

  // Опциональные поля с валидацией
  if (clientData.email && !isValidEmail(clientData.email)) {
    errors.push('Невірний формат email');
  }

  if (clientData.phone && !isValidPhone(clientData.phone)) {
    console.log('Invalid phone detected:', clientData.phone);
    errors.push(`Невірний формат телефону: "${clientData.phone}"`);
  }

  if (clientData.growth && !isValidNumber(clientData.growth, 50, 250)) {
    errors.push('Зріст повинен бути від 50 до 250 см');
  }

  if (clientData.weight && !isValidNumber(clientData.weight, 20, 300)) {
    errors.push('Вага повинна бути від 20 до 300 кг');
  }

  if (clientData.price && !isValidNumber(clientData.price, 0, 10000)) {
    errors.push('Ціна повинна бути від 0 до 10000');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Санитизация строк (удаление опасных символов)
export const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>]/g, '') // Удаляем < и > для защиты от XSS
    .substring(0, 500); // Ограничиваем длину
};

// Санитизация данных клиента
export const sanitizeClientData = (clientData) => {
  return {
    name: sanitizeString(clientData.name),
    surname: sanitizeString(clientData.surname),
    phone: sanitizeString(clientData.phone),
    email: sanitizeString(clientData.email),
    gym: sanitizeString(clientData.gym),
    gymId: sanitizeString(clientData.gymId),
    sex: sanitizeString(clientData.sex),
    address: sanitizeString(clientData.address),
    growth: clientData.growth || '',
    weight: clientData.weight || '',
    price: clientData.price || 250,
    userId: sanitizeString(clientData.userId),
  };
};
