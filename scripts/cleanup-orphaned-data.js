/**
 * УДАЛЕНИЕ ОСИРОТЕВШИХ ДАННЫХ
 * Удаляет все данные клиентов, которых нет в коллекции clients
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, query, where } = require('firebase/firestore');
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

async function login() {
  console.log('🔐 Авторизация...');
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Авторизован\n');
}

async function cleanupOrphanedData() {
  console.log('🧹 УДАЛЕНИЕ ОСИРОТЕВШИХ ДАННЫХ\n');
  console.log('═'.repeat(80));
  
  const stats = {
    workouts: 0,
    workoutHistory: 0,
    assignedWorkouts: 0,
    clientBases: 0,
    users: 0
  };
  
  // 1. Получаем список активных клиентов
  console.log('\n📋 Получение списка активных клиентов...\n');
  
  const clientsRef = collection(db, 'clients');
  const clientsSnap = await getDocs(clientsRef);
  
  const activeClientIds = new Set();
  
  clientsSnap.forEach(doc => {
    activeClientIds.add(doc.id);
    const profile = doc.data().profile || {};
    console.log(`   ✅ ${doc.id} - ${profile.surname} ${profile.name}`);
  });
  
  console.log(`\nВсего активных клиентов: ${activeClientIds.size}`);
  
  // 2. Удаляем осиротевшие данные
  console.log('\n═'.repeat(80));
  console.log('\n🗑️  Начинаем удаление...\n');
  
  // Удаляем workouts
  console.log('🗑️  Удаление тренировок...');
  const workoutsRef = collection(db, 'workouts');
  const workoutsSnap = await getDocs(workoutsRef);
  
  for (const doc of workoutsSnap.docs) {
    const data = doc.data();
    const clientId = data.clientId;
    
    if (clientId && !activeClientIds.has(clientId)) {
      await deleteDoc(doc.ref);
      stats.workouts++;
      console.log(`   ✅ Удалена тренировка: ${data.name || 'Без названия'} [${doc.id}]`);
    }
  }
  
  console.log(`   Удалено тренировок: ${stats.workouts}`);
  
  // Удаляем workoutHistory
  console.log('\n🗑️  Удаление истории тренировок...');
  const historyRef = collection(db, 'workoutHistory');
  const historySnap = await getDocs(historyRef);
  
  for (const doc of historySnap.docs) {
    const data = doc.data();
    const clientId = data.clientId;
    
    if (clientId && !activeClientIds.has(clientId)) {
      await deleteDoc(doc.ref);
      stats.workoutHistory++;
    }
  }
  
  console.log(`   Удалено записей истории: ${stats.workoutHistory}`);
  
  // Удаляем assignedWorkouts
  console.log('\n🗑️  Удаление назначенных тренировок...');
  const assignedRef = collection(db, 'assignedWorkouts');
  const assignedSnap = await getDocs(assignedRef);
  
  for (const doc of assignedSnap.docs) {
    const data = doc.data();
    const clientId = data.clientId;
    
    if (clientId && !activeClientIds.has(clientId)) {
      await deleteDoc(doc.ref);
      stats.assignedWorkouts++;
      console.log(`   ✅ Удалено назначение: ${data.workoutName || 'нет'} [${doc.id}]`);
    }
  }
  
  console.log(`   Удалено назначений: ${stats.assignedWorkouts}`);
  
  // Удаляем clientBases
  console.log('\n🗑️  Удаление баз упражнений...');
  const clientBasesRef = collection(db, 'clientBases');
  const clientBasesSnap = await getDocs(clientBasesRef);
  
  for (const doc of clientBasesSnap.docs) {
    const clientId = doc.id;
    
    if (!activeClientIds.has(clientId)) {
      // Удаляем exercises
      const exercisesRef = collection(db, 'clientBases', clientId, 'exercises');
      const exercisesSnap = await getDocs(exercisesRef);
      
      for (const exDoc of exercisesSnap.docs) {
        await deleteDoc(exDoc.ref);
      }
      
      console.log(`   ✅ Удалена база клиента ${clientId} (${exercisesSnap.size} упражнений)`);
      stats.clientBases++;
    }
  }
  
  console.log(`   Удалено баз: ${stats.clientBases}`);
  
  // Удаляем users
  console.log('\n🗑️  Удаление аккаунтов пользователей...');
  const usersRef = collection(db, 'users');
  const usersSnap = await getDocs(usersRef);
  
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const clientId = data.clientId;
    
    // Пропускаем админов (у них нет clientId)
    if (clientId && !activeClientIds.has(clientId)) {
      await deleteDoc(doc.ref);
      stats.users++;
      console.log(`   ✅ Удален аккаунт: ${data.email || 'нет'} [${doc.id}]`);
    }
  }
  
  console.log(`   Удалено аккаунтов: ${stats.users}`);
  
  // 3. Итоги
  console.log('\n═'.repeat(80));
  console.log('\n✅ ОЧИСТКА ЗАВЕРШЕНА!\n');
  console.log('📊 СТАТИСТИКА:');
  console.log(`   Тренировки: ${stats.workouts}`);
  console.log(`   История тренировок: ${stats.workoutHistory}`);
  console.log(`   Назначенные тренировки: ${stats.assignedWorkouts}`);
  console.log(`   Базы упражнений: ${stats.clientBases}`);
  console.log(`   Аккаунты пользователей: ${stats.users}`);
  
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`\n   ВСЕГО УДАЛЕНО: ${total} записей\n`);
  
  console.log('═'.repeat(80));
  console.log('\n💡 База данных теперь чистая!');
  console.log('   Все данные удаленных клиентов удалены.\n');
}

async function main() {
  try {
    await login();
    await cleanupOrphanedData();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();
