/**
 * УДАЛЕНИЕ КЛИЕНТА СО ВСЕМИ СВЯЗАННЫМИ ДАННЫМИ
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, getDocs, deleteDoc, query, where } = require('firebase/firestore');
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

// ID клиента для удаления
const CLIENT_ID_TO_DELETE = '1769512329601'; // Нагний Сергей

async function login() {
  console.log('🔐 Авторизация...');
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Авторизован\n');
}

async function deleteClient(clientId) {
  console.log(`🗑️  УДАЛЕНИЕ КЛИЕНТА: ${clientId}\n`);
  
  let deletedCount = {
    client: 0,
    attendance: 0,
    clientBase: 0,
    exercises: 0,
    workouts: 0,
    workoutHistory: 0,
    assignedWorkouts: 0,
    users: 0
  };
  
  try {
    // 1. Получаем информацию о клиенте
    console.log('📋 Получение информации о клиенте...');
    const clientRef = doc(db, 'clients', clientId);
    const clientSnap = await getDoc(clientRef);
    
    if (!clientSnap.exists()) {
      console.log('❌ Клиент не найден!');
      return;
    }
    
    const clientData = clientSnap.data();
    const profile = clientData.profile || {};
    console.log(`   Клиент: ${profile.surname} ${profile.name}`);
    console.log(`   Email: ${profile.email || 'нет'}`);
    console.log(`   Зал: ${profile.gymName || 'нет'}`);
    console.log(`   UserId: ${profile.userId || 'нет'}\n`);
    
    // 2. Удаляем attendance (subcollection)
    console.log('🗑️  Удаление посещаемости...');
    try {
      const attendanceRef = collection(db, 'clients', clientId, 'attendance');
      const attendanceSnap = await getDocs(attendanceRef);
      
      for (const doc of attendanceSnap.docs) {
        await deleteDoc(doc.ref);
        deletedCount.attendance++;
      }
      console.log(`   ✅ Удалено записей посещаемости: ${deletedCount.attendance}`);
    } catch (error) {
      console.log('   ⚠️  Ошибка удаления посещаемости:', error.message);
    }
    
    // 3. Удаляем clientBase (subcollection exercises)
    console.log('\n🗑️  Удаление базы упражнений клиента...');
    try {
      const exercisesRef = collection(db, 'clientBases', clientId, 'exercises');
      const exercisesSnap = await getDocs(exercisesRef);
      
      for (const doc of exercisesSnap.docs) {
        await deleteDoc(doc.ref);
        deletedCount.exercises++;
      }
      console.log(`   ✅ Удалено упражнений: ${deletedCount.exercises}`);
      
      // Удаляем metadata
      const metadataRef = doc(db, 'clientBases', clientId, 'metadata', 'settings');
      const metadataSnap = await getDoc(metadataRef);
      if (metadataSnap.exists()) {
        await deleteDoc(metadataRef);
        console.log('   ✅ Удалены метаданные');
      }
      
      deletedCount.clientBase = 1;
    } catch (error) {
      console.log('   ⚠️  Ошибка удаления базы упражнений:', error.message);
    }
    
    // 4. Удаляем workouts
    console.log('\n🗑️  Удаление тренировок...');
    try {
      const workoutsRef = collection(db, 'workouts');
      const workoutsQuery = query(workoutsRef, where('clientId', '==', clientId));
      const workoutsSnap = await getDocs(workoutsQuery);
      
      for (const doc of workoutsSnap.docs) {
        await deleteDoc(doc.ref);
        deletedCount.workouts++;
      }
      console.log(`   ✅ Удалено тренировок: ${deletedCount.workouts}`);
    } catch (error) {
      console.log('   ⚠️  Ошибка удаления тренировок:', error.message);
    }
    
    // 5. Удаляем workoutHistory
    console.log('\n🗑️  Удаление истории тренировок...');
    try {
      const historyRef = collection(db, 'workoutHistory');
      const historyQuery = query(historyRef, where('clientId', '==', clientId));
      const historySnap = await getDocs(historyQuery);
      
      for (const doc of historySnap.docs) {
        await deleteDoc(doc.ref);
        deletedCount.workoutHistory++;
      }
      console.log(`   ✅ Удалено записей истории: ${deletedCount.workoutHistory}`);
    } catch (error) {
      console.log('   ⚠️  Ошибка удаления истории:', error.message);
    }
    
    // 6. Удаляем assignedWorkouts
    console.log('\n🗑️  Удаление назначенных тренировок...');
    try {
      const assignedRef = collection(db, 'assignedWorkouts');
      const assignedQuery = query(assignedRef, where('clientId', '==', clientId));
      const assignedSnap = await getDocs(assignedQuery);
      
      for (const doc of assignedSnap.docs) {
        await deleteDoc(doc.ref);
        deletedCount.assignedWorkouts++;
      }
      console.log(`   ✅ Удалено назначений: ${deletedCount.assignedWorkouts}`);
    } catch (error) {
      console.log('   ⚠️  Ошибка удаления назначений:', error.message);
    }
    
    // 7. Удаляем user account (если есть userId)
    if (profile.userId) {
      console.log('\n🗑️  Удаление аккаунта пользователя...');
      try {
        const userRef = doc(db, 'users', profile.userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          await deleteDoc(userRef);
          deletedCount.users = 1;
          console.log('   ✅ Удален аккаунт пользователя');
        } else {
          console.log('   ⚠️  Аккаунт пользователя не найден');
        }
      } catch (error) {
        console.log('   ⚠️  Ошибка удаления аккаунта:', error.message);
      }
    }
    
    // 8. Удаляем самого клиента
    console.log('\n🗑️  Удаление клиента...');
    await deleteDoc(clientRef);
    deletedCount.client = 1;
    console.log('   ✅ Клиент удален');
    
    // Итоги
    console.log('\n✅ УДАЛЕНИЕ ЗАВЕРШЕНО!\n');
    console.log('📊 СТАТИСТИКА:');
    console.log(`   Клиент: ${deletedCount.client}`);
    console.log(`   Посещаемость: ${deletedCount.attendance}`);
    console.log(`   База упражнений: ${deletedCount.clientBase}`);
    console.log(`   Упражнения: ${deletedCount.exercises}`);
    console.log(`   Тренировки: ${deletedCount.workouts}`);
    console.log(`   История тренировок: ${deletedCount.workoutHistory}`);
    console.log(`   Назначенные тренировки: ${deletedCount.assignedWorkouts}`);
    console.log(`   Аккаунты пользователей: ${deletedCount.users}`);
    
    const total = Object.values(deletedCount).reduce((a, b) => a + b, 0);
    console.log(`\n   ВСЕГО УДАЛЕНО: ${total} записей\n`);
    
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    throw error;
  }
}

async function main() {
  console.log('🧹 УДАЛЕНИЕ НЕИСПОЛЬЗУЕМОГО КЛИЕНТА\n');
  console.log(`Клиент для удаления: ${CLIENT_ID_TO_DELETE}`);
  console.log('(Нагний Сергей - Колизей)\n');
  
  try {
    await login();
    await deleteClient(CLIENT_ID_TO_DELETE);
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();
