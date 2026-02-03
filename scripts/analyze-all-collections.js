/**
 * ПОЛНЫЙ АНАЛИЗ ВСЕХ КОЛЛЕКЦИЙ FIREBASE
 * Показывает что хранится в каждой коллекции
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

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
const auth = getAuth(app);

const ADMIN_EMAIL = 'ustimweb72@gmail.com';
const ADMIN_PASSWORD = 'UstikMaxus140572';

// Активные клиенты
const ACTIVE_CLIENTS = ['1769418005143', '1769285194499'];

async function login() {
  console.log('🔐 Авторизация...');
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Авторизован\n');
}

async function analyzeCollection(collectionName) {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    return snapshot;
  } catch (error) {
    return null;
  }
}

async function analyzeGyms() {
  console.log('📍 GYMS (Залы)');
  console.log('─'.repeat(80));
  
  const snapshot = await analyzeCollection('gyms');
  if (!snapshot) {
    console.log('   ⚠️  Нет доступа\n');
    return;
  }
  
  console.log(`   Всего залов: ${snapshot.size}\n`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`   ID: ${doc.id}`);
    console.log(`   Название: ${data.name || 'нет'}`);
    console.log(`   Создан: ${data.createdAt || 'нет'}`);
    console.log('');
  });
}

async function analyzeStatistics() {
  console.log('📊 STATISTICS (Статистика)');
  console.log('─'.repeat(80));
  
  const snapshot = await analyzeCollection('statistics');
  if (!snapshot) {
    console.log('   ⚠️  Нет доступа\n');
    return;
  }
  
  console.log(`   Всего записей верхнего уровня: ${snapshot.size}\n`);
  
  for (const doc of snapshot.docs) {
    console.log(`   Зал ID: ${doc.id}`);
    
    // Проверяем subcollection daily
    try {
      const dailyRef = collection(db, 'statistics', doc.id, 'daily');
      const dailySnap = await getDocs(dailyRef);
      console.log(`   └─ daily: ${dailySnap.size} записей`);
      
      if (dailySnap.size > 0) {
        // Показываем первые 3 и последние 3
        const dates = dailySnap.docs.map(d => d.id).sort();
        if (dates.length <= 6) {
          console.log(`      Даты: ${dates.join(', ')}`);
        } else {
          console.log(`      Первые: ${dates.slice(0, 3).join(', ')}`);
          console.log(`      Последние: ${dates.slice(-3).join(', ')}`);
        }
      }
    } catch (error) {
      console.log('      ⚠️  Ошибка чтения daily');
    }
    console.log('');
  }
}

async function analyzeWorkouts() {
  console.log('💪 WORKOUTS (Программы тренировок)');
  console.log('─'.repeat(80));
  
  const snapshot = await analyzeCollection('workouts');
  if (!snapshot) {
    console.log('   ⚠️  Нет доступа\n');
    return;
  }
  
  console.log(`   Всего тренировок: ${snapshot.size}\n`);
  
  const byClient = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const clientId = data.clientId || 'unknown';
    
    if (!byClient[clientId]) {
      byClient[clientId] = [];
    }
    
    byClient[clientId].push({
      id: doc.id,
      name: data.name || 'Без названия',
      weeks: data.weeks?.length || 0,
      createdAt: data.createdAt || 'нет'
    });
  });
  
  Object.entries(byClient).forEach(([clientId, workouts]) => {
    const isActive = ACTIVE_CLIENTS.includes(clientId);
    const status = isActive ? '✅ АКТИВНЫЙ' : '❌ УДАЛЕННЫЙ';
    
    console.log(`   Клиент: ${clientId} ${status}`);
    console.log(`   Тренировок: ${workouts.length}`);
    
    workouts.forEach(w => {
      console.log(`      - ${w.name} (${w.weeks} недель) [${w.id.substring(0, 15)}...]`);
    });
    console.log('');
  });
}

async function analyzeWorkoutHistory() {
  console.log('📝 WORKOUT HISTORY (История тренировок)');
  console.log('─'.repeat(80));
  
  const snapshot = await analyzeCollection('workoutHistory');
  if (!snapshot) {
    console.log('   ⚠️  Нет доступа\n');
    return;
  }
  
  console.log(`   Всего записей: ${snapshot.size}\n`);
  
  const byClient = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const clientId = data.clientId || 'unknown';
    
    if (!byClient[clientId]) {
      byClient[clientId] = 0;
    }
    byClient[clientId]++;
  });
  
  Object.entries(byClient).forEach(([clientId, count]) => {
    const isActive = ACTIVE_CLIENTS.includes(clientId);
    const status = isActive ? '✅ АКТИВНЫЙ' : '❌ УДАЛЕННЫЙ';
    
    console.log(`   Клиент: ${clientId} ${status}`);
    console.log(`   Записей истории: ${count}`);
    console.log('');
  });
}

async function analyzeAssignedWorkouts() {
  console.log('📤 ASSIGNED WORKOUTS (Назначенные тренировки)');
  console.log('─'.repeat(80));
  
  const snapshot = await analyzeCollection('assignedWorkouts');
  if (!snapshot) {
    console.log('   ⚠️  Нет доступа\n');
    return;
  }
  
  console.log(`   Всего назначений: ${snapshot.size}\n`);
  
  const byClient = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const clientId = data.clientId || 'unknown';
    
    if (!byClient[clientId]) {
      byClient[clientId] = [];
    }
    
    byClient[clientId].push({
      id: doc.id,
      workoutName: data.workoutName || 'нет',
      weekNumber: data.weekNumber || 0,
      status: data.status || 'unknown',
      assignedAt: data.assignedAt || 'нет'
    });
  });
  
  Object.entries(byClient).forEach(([clientId, assignments]) => {
    const isActive = ACTIVE_CLIENTS.includes(clientId);
    const status = isActive ? '✅ АКТИВНЫЙ' : '❌ УДАЛЕННЫЙ';
    
    console.log(`   Клиент: ${clientId} ${status}`);
    console.log(`   Назначений: ${assignments.length}`);
    
    assignments.forEach(a => {
      console.log(`      - ${a.workoutName} (неделя ${a.weekNumber}) [${a.status}]`);
    });
    console.log('');
  });
}

async function analyzeExercises() {
  console.log('🏋️ EXERCISES (База упражнений)');
  console.log('─'.repeat(80));
  
  const snapshot = await analyzeCollection('exercises');
  if (!snapshot) {
    console.log('   ⚠️  Нет доступа\n');
    return;
  }
  
  console.log(`   Всего упражнений: ${snapshot.size}\n`);
  
  const byCategory = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const categoryId = data.categoryId || 'unknown';
    
    if (!byCategory[categoryId]) {
      byCategory[categoryId] = [];
    }
    
    byCategory[categoryId].push(data.name || 'Без названия');
  });
  
  Object.entries(byCategory).forEach(([categoryId, exercises]) => {
    console.log(`   Категория ${categoryId}: ${exercises.length} упражнений`);
  });
  console.log('');
}

async function analyzeCategories() {
  console.log('📁 CATEGORIES (Категории упражнений)');
  console.log('─'.repeat(80));
  
  const snapshot = await analyzeCollection('categories');
  if (!snapshot) {
    console.log('   ⚠️  Нет доступа\n');
    return;
  }
  
  console.log(`   Всего категорий: ${snapshot.size}\n`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`   ${doc.id}: ${data.name || 'нет'}`);
  });
  console.log('');
}

async function analyzeClientBases() {
  console.log('📚 CLIENT BASES (Персональные базы клиентов)');
  console.log('─'.repeat(80));
  
  const snapshot = await analyzeCollection('clientBases');
  if (!snapshot) {
    console.log('   ⚠️  Нет доступа\n');
    return;
  }
  
  console.log(`   Всего баз: ${snapshot.size}\n`);
  
  for (const doc of snapshot.docs) {
    const clientId = doc.id;
    const isActive = ACTIVE_CLIENTS.includes(clientId);
    const status = isActive ? '✅ АКТИВНЫЙ' : '❌ УДАЛЕННЫЙ';
    
    console.log(`   Клиент: ${clientId} ${status}`);
    
    // Проверяем exercises
    try {
      const exercisesRef = collection(db, 'clientBases', clientId, 'exercises');
      const exercisesSnap = await getDocs(exercisesRef);
      console.log(`   └─ exercises: ${exercisesSnap.size} упражнений`);
    } catch (error) {
      console.log('      ⚠️  Ошибка чтения exercises');
    }
    
    // Проверяем metadata
    try {
      const metadataRef = doc(db, 'clientBases', clientId, 'metadata', 'settings');
      const metadataSnap = await getDoc(metadataRef);
      console.log(`   └─ metadata: ${metadataSnap.exists() ? 'есть' : 'нет'}`);
    } catch (error) {
      console.log('      ⚠️  Ошибка чтения metadata');
    }
    
    console.log('');
  }
}

async function analyzeUsers() {
  console.log('👤 USERS (Аккаунты пользователей)');
  console.log('─'.repeat(80));
  
  const snapshot = await analyzeCollection('users');
  if (!snapshot) {
    console.log('   ⚠️  Нет доступа\n');
    return;
  }
  
  console.log(`   Всего пользователей: ${snapshot.size}\n`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const clientId = data.clientId || 'нет';
    const isActive = clientId === 'нет' || ACTIVE_CLIENTS.includes(clientId);
    const status = isActive ? '✅' : '❌';
    
    console.log(`   ${status} User ID: ${doc.id}`);
    console.log(`      Email: ${data.email || 'нет'}`);
    console.log(`      Role: ${data.role || 'нет'}`);
    console.log(`      Client ID: ${clientId}`);
    console.log('');
  });
}

async function main() {
  console.log('🔍 ПОЛНЫЙ АНАЛИЗ FIREBASE\n');
  console.log('═'.repeat(80));
  console.log('\n');
  
  try {
    await login();
    
    await analyzeGyms();
    await analyzeStatistics();
    await analyzeWorkouts();
    await analyzeWorkoutHistory();
    await analyzeAssignedWorkouts();
    await analyzeExercises();
    await analyzeCategories();
    await analyzeClientBases();
    await analyzeUsers();
    
    console.log('═'.repeat(80));
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   Проверьте записи с пометкой ❌ УДАЛЕННЫЙ');
    console.log('   Это данные удаленных клиентов, которые можно очистить\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();
