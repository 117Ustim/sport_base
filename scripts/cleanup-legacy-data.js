/**
 * ОЧИСТКА LEGACY ДАННЫХ
 * 
 * Что удаляет:
 * 1. Коллекция Ustim/* (старая структура, уже мигрирована)
 * 2. Коллекции trainings и trainingWeeks (старая система, не используется)
 * 
 * ВАЖНО: Запускать только после:
 * - Приложение работает стабильно 1-2 недели
 * - Есть свежий backup
 * - Все данные мигрированы корректно
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, getDocs, deleteDoc, writeBatch } = require('firebase/firestore');
const readline = require('readline');

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

// Создаем интерфейс для ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Функция для подтверждения
function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// ============================================
// АНАЛИЗ ДАННЫХ
// ============================================
async function analyzeData() {
  console.log('🔍 Анализ данных для удаления...\n');
  
  const analysis = {
    ustim: {
      exists: false,
      documents: []
    },
    trainings: {
      exists: false,
      count: 0
    },
    trainingWeeks: {
      exists: false,
      count: 0
    }
  };
  
  try {
    // Проверяем Ustim
    console.log('📊 Проверка коллекции Ustim...');
    const ustimDocs = ['People', 'Gyms', 'Attendance', 'Statistics'];
    
    for (const docName of ustimDocs) {
      const docRef = doc(db, 'Ustim', docName);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        analysis.ustim.exists = true;
        analysis.ustim.documents.push(docName);
        
        const data = docSnap.data();
        const keys = Object.keys(data);
        console.log(`   ✅ Ustim/${docName}: ${keys.length} записей`);
      }
    }
    
    if (!analysis.ustim.exists) {
      console.log('   ⚠️  Коллекция Ustim не найдена или пуста');
    }
    
    // Проверяем trainings
    console.log('\n📊 Проверка коллекции trainings...');
    const trainingsRef = collection(db, 'trainings');
    const trainingsSnap = await getDocs(trainingsRef);
    analysis.trainings.count = trainingsSnap.size;
    analysis.trainings.exists = trainingsSnap.size > 0;
    
    if (analysis.trainings.exists) {
      console.log(`   ✅ trainings: ${analysis.trainings.count} документов`);
    } else {
      console.log('   ⚠️  Коллекция trainings пуста');
    }
    
    // Проверяем trainingWeeks
    console.log('\n📊 Проверка коллекции trainingWeeks...');
    const trainingWeeksRef = collection(db, 'trainingWeeks');
    const trainingWeeksSnap = await getDocs(trainingWeeksRef);
    analysis.trainingWeeks.count = trainingWeeksSnap.size;
    analysis.trainingWeeks.exists = trainingWeeksSnap.size > 0;
    
    if (analysis.trainingWeeks.exists) {
      console.log(`   ✅ trainingWeeks: ${analysis.trainingWeeks.count} документов`);
    } else {
      console.log('   ⚠️  Коллекция trainingWeeks пуста');
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error.message);
    throw error;
  }
  
  return analysis;
}

// ============================================
// ПРОВЕРКА МИГРАЦИИ
// ============================================
async function checkMigration() {
  console.log('\n🔍 Проверка миграции данных...\n');
  
  const checks = {
    clients: false,
    gyms: false,
    statistics: false
  };
  
  try {
    // Проверяем clients
    const clientsRef = collection(db, 'clients');
    const clientsSnap = await getDocs(clientsRef);
    checks.clients = clientsSnap.size > 0;
    console.log(`   ${checks.clients ? '✅' : '❌'} clients: ${clientsSnap.size} документов`);
    
    // Проверяем gyms
    const gymsRef = collection(db, 'gyms');
    const gymsSnap = await getDocs(gymsRef);
    checks.gyms = gymsSnap.size > 0;
    console.log(`   ${checks.gyms ? '✅' : '❌'} gyms: ${gymsSnap.size} документов`);
    
    // Проверяем statistics
    const statsRef = collection(db, 'statistics');
    const statsSnap = await getDocs(statsRef);
    checks.statistics = statsSnap.size > 0;
    console.log(`   ${checks.statistics ? '✅' : '❌'} statistics: ${statsSnap.size} документов`);
    
    const allMigrated = checks.clients && checks.gyms && checks.statistics;
    
    if (allMigrated) {
      console.log('\n✅ Все данные успешно мигрированы!');
    } else {
      console.log('\n⚠️  ВНИМАНИЕ: Не все данные мигрированы!');
      console.log('   Рекомендуется сначала выполнить миграцию: npm run migrate');
    }
    
    return allMigrated;
    
  } catch (error) {
    console.error('❌ Ошибка проверки миграции:', error.message);
    throw error;
  }
}

// ============================================
// УДАЛЕНИЕ USTIM
// ============================================
async function deleteUstim() {
  console.log('\n🗑️  Удаление коллекции Ustim...');
  
  try {
    const ustimDocs = ['People', 'Gyms', 'Attendance', 'Statistics'];
    let deletedCount = 0;
    
    for (const docName of ustimDocs) {
      const docRef = doc(db, 'Ustim', docName);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await deleteDoc(docRef);
        deletedCount++;
        console.log(`   ✅ Удален: Ustim/${docName}`);
      }
    }
    
    console.log(`\n✅ Удалено документов Ustim: ${deletedCount}`);
    
  } catch (error) {
    console.error('❌ Ошибка удаления Ustim:', error.message);
    throw error;
  }
}

// ============================================
// УДАЛЕНИЕ TRAININGS
// ============================================
async function deleteTrainings() {
  console.log('\n🗑️  Удаление коллекции trainings...');
  
  try {
    const trainingsRef = collection(db, 'trainings');
    const snapshot = await getDocs(trainingsRef);
    
    if (snapshot.empty) {
      console.log('   ⚠️  Коллекция trainings пуста');
      return;
    }
    
    // Удаляем батчами по 500 документов
    const batchSize = 500;
    let deletedCount = 0;
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = snapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`   ✅ Удалено: ${deletedCount}/${snapshot.size}`);
    }
    
    console.log(`\n✅ Удалено документов trainings: ${deletedCount}`);
    
  } catch (error) {
    console.error('❌ Ошибка удаления trainings:', error.message);
    throw error;
  }
}

// ============================================
// УДАЛЕНИЕ TRAINING WEEKS
// ============================================
async function deleteTrainingWeeks() {
  console.log('\n🗑️  Удаление коллекции trainingWeeks...');
  
  try {
    const trainingWeeksRef = collection(db, 'trainingWeeks');
    const snapshot = await getDocs(trainingWeeksRef);
    
    if (snapshot.empty) {
      console.log('   ⚠️  Коллекция trainingWeeks пуста');
      return;
    }
    
    // Удаляем батчами по 500 документов
    const batchSize = 500;
    let deletedCount = 0;
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = snapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`   ✅ Удалено: ${deletedCount}/${snapshot.size}`);
    }
    
    console.log(`\n✅ Удалено документов trainingWeeks: ${deletedCount}`);
    
  } catch (error) {
    console.error('❌ Ошибка удаления trainingWeeks:', error.message);
    throw error;
  }
}

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================
async function main() {
  console.log('🧹 ОЧИСТКА LEGACY ДАННЫХ\n');
  console.log('⚠️  ВНИМАНИЕ: Это действие необратимо!\n');
  console.log('Перед продолжением убедитесь что:');
  console.log('  1. ✅ Приложение работает стабильно 1-2 недели');
  console.log('  2. ✅ Есть свежий backup (npm run backup)');
  console.log('  3. ✅ Все данные мигрированы корректно\n');
  
  try {
    // Анализ данных
    const analysis = await analyzeData();
    
    // Проверка миграции
    const migrated = await checkMigration();
    
    if (!migrated) {
      console.log('\n❌ ОСТАНОВКА: Сначала выполните миграцию!');
      console.log('   Команда: npm run migrate\n');
      rl.close();
      process.exit(1);
    }
    
    // Подсчет что будет удалено
    let totalToDelete = 0;
    if (analysis.ustim.exists) totalToDelete += analysis.ustim.documents.length;
    if (analysis.trainings.exists) totalToDelete += analysis.trainings.count;
    if (analysis.trainingWeeks.exists) totalToDelete += analysis.trainingWeeks.count;
    
    if (totalToDelete === 0) {
      console.log('\n✅ Нет данных для удаления!');
      rl.close();
      process.exit(0);
    }
    
    console.log(`\n📊 Будет удалено:`);
    if (analysis.ustim.exists) {
      console.log(`   - Ustim: ${analysis.ustim.documents.length} документов`);
    }
    if (analysis.trainings.exists) {
      console.log(`   - trainings: ${analysis.trainings.count} документов`);
    }
    if (analysis.trainingWeeks.exists) {
      console.log(`   - trainingWeeks: ${analysis.trainingWeeks.count} документов`);
    }
    console.log(`   ИТОГО: ${totalToDelete} документов\n`);
    
    // Запрос подтверждения
    const confirmed = await askConfirmation('Вы уверены? Введите "yes" для продолжения: ');
    
    if (!confirmed) {
      console.log('\n❌ Отменено пользователем');
      rl.close();
      process.exit(0);
    }
    
    // Второе подтверждение
    const doubleConfirmed = await askConfirmation('\n⚠️  ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ! Это действие необратимо. Введите "yes" для подтверждения: ');
    
    if (!doubleConfirmed) {
      console.log('\n❌ Отменено пользователем');
      rl.close();
      process.exit(0);
    }
    
    console.log('\n🚀 Начинаем удаление...\n');
    
    // Удаление
    if (analysis.ustim.exists) {
      await deleteUstim();
    }
    
    if (analysis.trainings.exists) {
      await deleteTrainings();
    }
    
    if (analysis.trainingWeeks.exists) {
      await deleteTrainingWeeks();
    }
    
    console.log('\n✅ Очистка завершена успешно!');
    console.log('\n📊 Итого удалено:');
    if (analysis.ustim.exists) {
      console.log(`   ✅ Ustim: ${analysis.ustim.documents.length} документов`);
    }
    if (analysis.trainings.exists) {
      console.log(`   ✅ trainings: ${analysis.trainings.count} документов`);
    }
    if (analysis.trainingWeeks.exists) {
      console.log(`   ✅ trainingWeeks: ${analysis.trainingWeeks.count} документов`);
    }
    
    console.log('\n💡 Рекомендации:');
    console.log('   1. Проверьте что приложение работает корректно');
    console.log('   2. Обновите Firestore Rules (удалите правила для Ustim, trainings, trainingWeeks)');
    console.log('   3. Удалите неиспользуемые сервисы из кода (trainingsService, trainingWeeksService)\n');
    
    rl.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Ошибка очистки:', error);
    console.error('\n💡 Если данные были частично удалены, восстановите из backup:');
    console.error('   npm run restore backups/backup-YYYY-MM-DD/firestore-backup.json\n');
    rl.close();
    process.exit(1);
  }
}

main();
