/**
 * ПРОВЕРКА ОСИРОТЕВШИХ ДАННЫХ
 * Находит данные клиентов, которых уже нет в коллекции clients
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

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD env vars.');
  console.error('Set them before running this script.');
  process.exit(1);
}

async function login() {
  console.log('🔐 Авторизация...');
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Авторизован\n');
}

async function findOrphanedData() {
  console.log('🔍 ПОИСК ОСИРОТЕВШИХ ДАННЫХ\n');
  console.log('═'.repeat(80));
  
  // 1. Получаем список ВСЕХ клиентов из коллекции clients
  console.log('\n📋 Шаг 1: Получение списка активных клиентов...\n');
  
  const clientsRef = collection(db, 'clients');
  const clientsSnap = await getDocs(clientsRef);
  
  const activeClientIds = new Set();
  
  console.log('АКТИВНЫЕ КЛИЕНТЫ:');
  clientsSnap.forEach(doc => {
    activeClientIds.add(doc.id);
    const profile = doc.data().profile || {};
    console.log(`   ✅ ${doc.id} - ${profile.surname} ${profile.name}`);
  });
  
  console.log(`\nВсего активных клиентов: ${activeClientIds.size}`);
  
  // 2. Проверяем все коллекции на наличие данных удаленных клиентов
  console.log('\n═'.repeat(80));
  console.log('\n📊 Шаг 2: Поиск данных удаленных клиентов...\n');
  
  const orphanedData = {
    workouts: [],
    workoutHistory: [],
    assignedWorkouts: [],
    clientBases: [],
    users: []
  };
  
  // Проверяем workouts
  console.log('🔍 Проверка WORKOUTS...');
  const workoutsRef = collection(db, 'workouts');
  const workoutsSnap = await getDocs(workoutsRef);
  
  workoutsSnap.forEach(doc => {
    const data = doc.data();
    const clientId = data.clientId;
    
    if (clientId && !activeClientIds.has(clientId)) {
      orphanedData.workouts.push({
        id: doc.id,
        clientId: clientId,
        name: data.name || 'Без названия',
        weeks: data.weeks?.length || 0
      });
    }
  });
  
  console.log(`   Найдено осиротевших тренировок: ${orphanedData.workouts.length}`);
  
  // Проверяем workoutHistory
  console.log('\n🔍 Проверка WORKOUT HISTORY...');
  const historyRef = collection(db, 'workoutHistory');
  const historySnap = await getDocs(historyRef);
  
  historySnap.forEach(doc => {
    const data = doc.data();
    const clientId = data.clientId;
    
    if (clientId && !activeClientIds.has(clientId)) {
      if (!orphanedData.workoutHistory.find(item => item.clientId === clientId)) {
        orphanedData.workoutHistory.push({
          clientId: clientId,
          count: 0
        });
      }
      
      const item = orphanedData.workoutHistory.find(item => item.clientId === clientId);
      item.count++;
    }
  });
  
  console.log(`   Найдено осиротевших записей истории: ${historySnap.size - (historySnap.size - orphanedData.workoutHistory.reduce((sum, item) => sum + item.count, 0))}`);
  
  // Проверяем assignedWorkouts
  console.log('\n🔍 Проверка ASSIGNED WORKOUTS...');
  const assignedRef = collection(db, 'assignedWorkouts');
  const assignedSnap = await getDocs(assignedRef);
  
  assignedSnap.forEach(doc => {
    const data = doc.data();
    const clientId = data.clientId;
    
    if (clientId && !activeClientIds.has(clientId)) {
      orphanedData.assignedWorkouts.push({
        id: doc.id,
        clientId: clientId,
        workoutName: data.workoutName || 'нет',
        weekNumber: data.weekNumber || 0
      });
    }
  });
  
  console.log(`   Найдено осиротевших назначений: ${orphanedData.assignedWorkouts.length}`);
  
  // Проверяем clientBases
  console.log('\n🔍 Проверка CLIENT BASES...');
  const clientBasesRef = collection(db, 'clientBases');
  const clientBasesSnap = await getDocs(clientBasesRef);
  
  for (const doc of clientBasesSnap.docs) {
    const clientId = doc.id;
    
    if (!activeClientIds.has(clientId)) {
      // Считаем упражнения
      const exercisesRef = collection(db, 'clientBases', clientId, 'exercises');
      const exercisesSnap = await getDocs(exercisesRef);
      
      orphanedData.clientBases.push({
        clientId: clientId,
        exercisesCount: exercisesSnap.size
      });
    }
  }
  
  console.log(`   Найдено осиротевших баз: ${orphanedData.clientBases.length}`);
  
  // Проверяем users
  console.log('\n🔍 Проверка USERS...');
  const usersRef = collection(db, 'users');
  const usersSnap = await getDocs(usersRef);
  
  usersSnap.forEach(doc => {
    const data = doc.data();
    const clientId = data.clientId;
    
    // Пропускаем админов (у них нет clientId)
    if (clientId && !activeClientIds.has(clientId)) {
      orphanedData.users.push({
        userId: doc.id,
        clientId: clientId,
        email: data.email || 'нет',
        role: data.role || 'нет'
      });
    }
  });
  
  console.log(`   Найдено осиротевших пользователей: ${orphanedData.users.length}`);
  
  // 3. Выводим детальный отчет
  console.log('\n═'.repeat(80));
  console.log('\n📊 ДЕТАЛЬНЫЙ ОТЧЕТ\n');
  
  const allOrphaned = new Set();
  
  // Собираем все уникальные clientId
  orphanedData.workouts.forEach(item => allOrphaned.add(item.clientId));
  orphanedData.workoutHistory.forEach(item => allOrphaned.add(item.clientId));
  orphanedData.assignedWorkouts.forEach(item => allOrphaned.add(item.clientId));
  orphanedData.clientBases.forEach(item => allOrphaned.add(item.clientId));
  orphanedData.users.forEach(item => allOrphaned.add(item.clientId));
  
  if (allOrphaned.size === 0) {
    console.log('✅ Осиротевших данных не найдено! База чистая.\n');
    return null;
  }
  
  console.log(`Найдено удаленных клиентов с данными: ${allOrphaned.size}\n`);
  
  allOrphaned.forEach(clientId => {
    console.log(`❌ КЛИЕНТ: ${clientId}`);
    
    // Workouts
    const workouts = orphanedData.workouts.filter(w => w.clientId === clientId);
    if (workouts.length > 0) {
      console.log(`   📦 Тренировки: ${workouts.length}`);
      workouts.forEach(w => {
        console.log(`      - ${w.name} (${w.weeks} недель) [${w.id}]`);
      });
    }
    
    // History
    const history = orphanedData.workoutHistory.find(h => h.clientId === clientId);
    if (history) {
      console.log(`   📝 История тренировок: ${history.count} записей`);
    }
    
    // Assigned
    const assigned = orphanedData.assignedWorkouts.filter(a => a.clientId === clientId);
    if (assigned.length > 0) {
      console.log(`   📤 Назначенные тренировки: ${assigned.length}`);
      assigned.forEach(a => {
        console.log(`      - ${a.workoutName} (неделя ${a.weekNumber}) [${a.id}]`);
      });
    }
    
    // Client Base
    const base = orphanedData.clientBases.find(b => b.clientId === clientId);
    if (base) {
      console.log(`   📚 База упражнений: ${base.exercisesCount} упражнений`);
    }
    
    // Users
    const user = orphanedData.users.find(u => u.clientId === clientId);
    if (user) {
      console.log(`   👤 Аккаунт: ${user.email} [${user.userId}]`);
    }
    
    console.log('');
  });
  
  console.log('═'.repeat(80));
  console.log('\n💡 Для удаления всех осиротевших данных запустите:');
  console.log('   node scripts/cleanup-orphaned-data.js\n');
  
  return orphanedData;
}

async function main() {
  try {
    await login();
    await findOrphanedData();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();
