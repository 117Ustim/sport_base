export const getWeightFromBase = (exerciseId, numberTimes, exercises, columns, options = {}) => {
  const { isStarred = false, isGroup = false, preferAColumn = false } = typeof options === 'object' ? options : { isStarred: !!options };

  if (!exercises || exercises.length === 0) return '';
  
  // Ищем упражнение в базе по exercise_id
  const exercise = exercises.find(ex => ex.exercise_id === exerciseId);
  if (!exercise || !exercise.data) return '';
  
  let weight;
  
  // 1. Если это группа или явно указан приоритет колонки "А", сначала ищем её
  if ((isGroup || preferAColumn) && columns && columns.length > 0) {
    const aColumn = columns.find(col => {
      const name = String(col.name || '').trim().toUpperCase();
      return name === 'A' || name === 'А'; // Латиница и кириллица
    });
    
    if (aColumn) {
      weight = exercise.data[aColumn.id] ?? exercise.data[String(aColumn.id)];
    }
  }

  // 2. Если вес всё еще не найден, пытаемся найти колонку по названию повторений (например "8" или "*8")
  if ((weight === undefined || weight === '' || weight === '—') && columns && columns.length > 0) {
    const targetName = isStarred ? `*${numberTimes}` : String(numberTimes);
    const targetNameWithSpace = isStarred ? `* ${numberTimes}` : String(numberTimes);

    const targetColumn = columns.find(col => {
      const name = String(col.name || '').trim();
      return name === targetName || name === targetNameWithSpace;
    });

    if (targetColumn) {
      weight = exercise.data[targetColumn.id] ?? exercise.data[String(targetColumn.id)];
    }

    // Если звездный вес не нашли, пробуем обычный как fallback (или наоборот)
    if (weight === undefined || weight === '' || weight === '—') {
      const fallbackName = !isStarred ? `*${numberTimes}` : String(numberTimes);
      const fallbackColumn = columns.find(col => String(col.name).trim() === fallbackName);
      if (fallbackColumn) {
        weight = exercise.data[fallbackColumn.id] ?? exercise.data[String(fallbackColumn.id)];
      }
    }
  }
  
  // 3. Fallback: индекс = количество раз - 1 (старая логика)
  if (!isGroup && !preferAColumn && (weight === undefined || weight === '' || weight === '—')) {
    const weightIndex = String(numberTimes - 1);
    weight = exercise.data[weightIndex];
  }
  
  // Возвращаем вес только если он не пустой
  if (weight && weight !== '' && weight !== '—') {
    return weight;
  }
  
  return '';
};
