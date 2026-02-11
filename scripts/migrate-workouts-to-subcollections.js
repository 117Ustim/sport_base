/**
 * СКРИПТ МИГРАЦИИ: workouts.weeks → subcollection
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Читает все документы из коллекции workouts
 * 2. Для каждой тренировки:
 *    - Берет массив weeks
 *    - Создает subcollection workouts/{id}/weeks/{weekNumber}
 *    - Сохраняет каждую неделю как отдельный документ
 *    - Добавляет поле totalWeeks в основной документ
 *    - Удаляет старое поле weeks из основного документа
 * 
 * БЕЗОПАСНОСТЬ:
 * - Сначала создает backup в backups/workouts-migration-backup.json
 * - Работает в режиме DRY_RUN (можно отключить)
 * - Логирует все операции
 * 
 * КАК ЗАПУСТИТЬ:
 * 1. Сначала в режиме DRY_RUN (проверка):
 *    node scripts/migrate-workouts-to-subcollections.js
 * 
 * 2. Потом реальная миграция:
 *    node scripts/migrate-workouts-to-subcollections.js --apply
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  deleteField
} = require('firebase/firestore');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBwS75y3d4T5xPtNYSkh0L2KPKlq-N4Wf4",
  authDomain: "calendar-new-599f8.firebaseapp.com",
  projectId: "calendar-new-599f8",
  storageBucket: "calendar-new-599f8.firebasestorage.app",
  messagingSenderId: "810978067130",
  appId: "1:810978067130:web:195217eefa0c9f269eb883",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Режим работы
const DRY_RUN = !process.argv.includes('--apply');

console.log('🔧 РЕЖИМ:', DRY_RUN ? 'DRY RUN (проверка)' : 'ПРИМЕНЕНИЕ ИЗМЕНЕНИЙ');
console.log('');

/**
 * Создать backup всех workouts
 */
async function createBackup() {
  console.log('📦 Создание backup workouts...');
  
  try {
    const workoutsRef = collection(db, 'workouts');
    const snapshot = await getDocs(workoutsRef);
    
    const backup = {
      timestamp: new Date().toISOString(),
      totalWorkouts: snapshot.size,
      workouts: {}
    };
    
    snapshot.docs.forEach(doc => {
      backup.workouts[doc.id] = doc.data();
    });
    
    // Сохраняем backup
    const backupDir = join(__dirname, '..', 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = join(backupDir, 'workouts-migration-backup.json');
    writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');
    
    console.log(`   ✅ Backup создан: ${backupFile}`);
    console.log(`   📊 Всего тренировок: ${snapshot.size}`);
    console.log('');
    
    return backup;
  } catch (error) {
    console.error('   ❌ Ошибка создания backup:', error.message);
    throw error;
  }
}

/**
 * Мигрировать одну тренировку
 */
async function migrateWorkout(workoutId, workoutData) {
  console.log(`📝 Миграция тренировки: ${workoutId}`);
  console.log(`   Название: ${workoutData.name}`);
  console.log(`   Клиент: ${workoutData.clientId}`);
  
  // Проверяем есть ли weeks
  if (!workoutData.weeks || !Array.isArray(workoutData.weeks)) {
    console.log('   ⚠️  Нет массива weeks, пропускаем');
    return { success: false, reason: 'no_weeks' };
  }
  
  const weeks = workoutData.weeks;
  console.log(`   📅 Недель: ${weeks.length}`);
  
  // Проверяем размер документа
  const docSize = JSON.stringify(workoutData).length;
  console.log(`   📏 Размер документа: ${(docSize / 1024).toFixed(2)} KB`);
  
  if (DRY_RUN) {
    console.log('   🔍 DRY RUN: Пропускаем реальную миграцию');
    console.log('');
    return { success: true, dryRun: true, weeksCount: weeks.length };
  }
  
  try {
    // 1. Создаем subcollection для каждой недели
    for (const week of weeks) {
      const weekNumber = week.weekNumber;
      const weekRef = doc(db, 'workouts', workoutId, 'weeks', String(weekNumber));
      
      const weekData = {
        weekNumber: week.weekNumber,
        days: week.days || {},
        dates: week.dates || {}
      };
      
      await setDoc(weekRef, weekData);
      console.log(`      ✅ Неделя ${weekNumber} сохранена в subcollection`);
    }
    
    // 2. Обновляем основной документ
    const workoutRef = doc(db, 'workouts', workoutId);
    await updateDoc(workoutRef, {
      totalWeeks: weeks.length,
      weeks: deleteField(), // Удаляем старое поле
      migratedAt: new Date().toISOString()
    });
    
    console.log(`   ✅ Основной документ обновлен (weeks удален, totalWeeks добавлен)`);
    console.log('');
    
    return { success: true, weeksCount: weeks.length };
  } catch (error) {
    console.error(`   ❌ Ошибка миграции:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Проверить результат миграции
 */
async function verifyMigration(workoutId, expectedWeeksCount) {
  console.log(`🔍 Проверка миграции: ${workoutId}`);
  
  try {
    // Проверяем основной документ
    const workoutRef = doc(db, 'workouts', workoutId);
    const workoutSnap = await getDoc(workoutRef);
    
    if (!workoutSnap.exists()) {
      console.log('   ❌ Документ не найден');
      return false;
    }
    
    const data = workoutSnap.data();
    
    // Проверяем что weeks удален
    if (data.weeks) {
      console.log('   ❌ Поле weeks все еще существует');
      return false;
    }
    
    // Проверяем что totalWeeks добавлен
    if (data.totalWeeks !== expectedWeeksCount) {
      console.log(`   ❌ totalWeeks неверный: ${data.totalWeeks} (ожидалось ${expectedWeeksCount})`);
      return false;
    }
    
    // Проверяем subcollection
    const weeksRef = collection(db, 'workouts', workoutId, 'weeks');
    const weeksSnap = await getDocs(weeksRef);
    
    if (weeksSnap.size !== expectedWeeksCount) {
      console.log(`   ❌ Недель в subcollection: ${weeksSnap.size} (ожидалось ${expectedWeeksCount})`);
      return false;
    }
    
    console.log(`   ✅ Миграция успешна (${weeksSnap.size} недель)`);
    return true;
  } catch (error) {
    console.error(`   ❌ Ошибка проверки:`, error.message);
    return false;
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('🚀 Начало миграции workouts → subcollections\n');
  
  // 1. Создаем backup
  const backup = await createBackup();
  
  // 2. Получаем все тренировки
  console.log('📋 Загрузка всех тренировок...');
  const workoutsRef = collection(db, 'workouts');
  const snapshot = await getDocs(workoutsRef);
  console.log(`   ✅ Загружено: ${snapshot.size} тренировок\n`);
  
  // 3. Мигрируем каждую тренировку
  const results = {
    total: snapshot.size,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };
  
  for (const docSnapshot of snapshot.docs) {
    const workoutId = docSnapshot.id;
    const workoutData = docSnapshot.data();
    
    const result = await migrateWorkout(workoutId, workoutData);
    
    if (result.success) {
      if (result.dryRun) {
        results.skipped++;
      } else {
        results.migrated++;
        
        // Проверяем результат миграции
        const verified = await verifyMigration(workoutId, result.weeksCount);
        if (!verified) {
          results.failed++;
          results.errors.push({ workoutId, reason: 'verification_failed' });
        }
      }
    } else {
      if (result.reason === 'no_weeks') {
        results.skipped++;
      } else {
        results.failed++;
        results.errors.push({ workoutId, error: result.error });
      }
    }
  }
  
  // 4. Итоговая статистика
  console.log('\n📊 ИТОГИ МИГРАЦИИ:');
  console.log(`   Всего тренировок: ${results.total}`);
  console.log(`   Мигрировано: ${results.migrated}`);
  console.log(`   Пропущено: ${results.skipped}`);
  console.log(`   Ошибок: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ОШИБКИ:');
    results.errors.forEach(err => {
      console.log(`   - ${err.workoutId}: ${err.error || err.reason}`);
    });
  }
  
  if (DRY_RUN) {
    console.log('\n💡 Это был DRY RUN (проверка)');
    console.log('   Для реальной миграции запустите:');
    console.log('   node scripts/migrate-workouts-to-subcollections.js --apply');
  } else {
    console.log('\n✅ Миграция завершена!');
    console.log(`   Backup сохранен в: backups/workouts-migration-backup.json`);
  }
  
  process.exit(0);
}

// Запуск
main().catch(error => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  console.error(error.stack);
  process.exit(1);
});
