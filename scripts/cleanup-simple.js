/**
 * ПРОСТАЯ ОЧИСТКА LEGACY ДАННЫХ
 * Запускается с авторизацией через существующий аккаунт
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, getDocs, deleteDoc, writeBatch } = require('firebase/firestore');
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

// Учетные данные из .env
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD env vars.');
  console.error('Set them before running this script.');
  process.exit(1);
}

async function login() {
  console.log('🔐 Авторизация...');
  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Авторизован как:', auth.currentUser.email);
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error.message);
    throw error;
  }
}

async function analyzeData() {
  console.log('\n🔍 Анализ данных...\n');
  
  const analysis = {
    ustim: { exists: false, documents: [] },
    trainings: { exists: false, count: 0 },
    trainingWeeks: { exists: false, count: 0 }
  };
  
  try {
    // Проверяем Ustim
    console.log('📊 Проверка Ustim...');
    const ustimDocs = ['People', 'Gyms', 'Attendance', 'Statistics'];
    
    for (const docName of ustimDocs) {
      try {
        const docRef = doc(db, 'Ustim', docName);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          analysis.ustim.exists = true;
          analysis.ustim.documents.push(docName);
          const data = docSnap.data();
          const keys = Object.keys(data);
          console.log(`   ✅ Ustim/${docName}: ${keys.length} записей`);
        }
      } catch (error) {
        console.log(`   ⚠️  Ustim/${docName}: не найден или нет доступа`);
      }
    }
    
    // Проверяем trainings
    console.log('\n📊 Проверка trainings...');
    try {
      const trainingsRef = collection(db, 'trainings');
      const trainingsSnap = await getDocs(trainingsRef);
      analysis.trainings.count = trainingsSnap.size;
      analysis.trainings.exists = trainingsSnap.size > 0;
      console.log(`   ${analysis.trainings.exists ? '✅' : '⚠️'} trainings: ${analysis.trainings.count} документов`);
    } catch (error) {
      console.log('   ⚠️  trainings: нет доступа');
    }
    
    // Проверяем trainingWeeks
    console.log('\n📊 Проверка trainingWeeks...');
    try {
      const trainingWeeksRef = collection(db, 'trainingWeeks');
      const trainingWeeksSnap = await getDocs(trainingWeeksRef);
      analysis.trainingWeeks.count = trainingWeeksSnap.size;
      analysis.trainingWeeks.exists = trainingWeeksSnap.size > 0;
      console.log(`   ${analysis.trainingWeeks.exists ? '✅' : '⚠️'} trainingWeeks: ${analysis.trainingWeeks.count} документов`);
    } catch (error) {
      console.log('   ⚠️  trainingWeeks: нет доступа');
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error.message);
  }
  
  return analysis;
}

async function deleteUstim() {
  console.log('\n🗑️  Удаление Ustim...');
  
  const ustimDocs = ['People', 'Gyms', 'Attendance', 'Statistics'];
  let deletedCount = 0;
  
  for (const docName of ustimDocs) {
    try {
      const docRef = doc(db, 'Ustim', docName);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await deleteDoc(docRef);
        deletedCount++;
        console.log(`   ✅ Удален: Ustim/${docName}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Ошибка удаления Ustim/${docName}:`, error.message);
    }
  }
  
  console.log(`\n✅ Удалено документов Ustim: ${deletedCount}`);
}

async function deleteTrainings() {
  console.log('\n🗑️  Удаление trainings...');
  
  try {
    const trainingsRef = collection(db, 'trainings');
    const snapshot = await getDocs(trainingsRef);
    
    if (snapshot.empty) {
      console.log('   ⚠️  Коллекция trainings пуста');
      return;
    }
    
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
    console.log('   ⚠️  Ошибка удаления trainings:', error.message);
  }
}

async function deleteTrainingWeeks() {
  console.log('\n🗑️  Удаление trainingWeeks...');
  
  try {
    const trainingWeeksRef = collection(db, 'trainingWeeks');
    const snapshot = await getDocs(trainingWeeksRef);
    
    if (snapshot.empty) {
      console.log('   ⚠️  Коллекция trainingWeeks пуста');
      return;
    }
    
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
    console.log('   ⚠️  Ошибка удаления trainingWeeks:', error.message);
  }
}

async function main() {
  console.log('🧹 ОЧИСТКА LEGACY ДАННЫХ\n');
  
  try {
    // Авторизация
    await login();
    
    // Анализ
    const analysis = await analyzeData();
    
    // Подсчет
    let totalToDelete = 0;
    if (analysis.ustim.exists) totalToDelete += analysis.ustim.documents.length;
    if (analysis.trainings.exists) totalToDelete += analysis.trainings.count;
    if (analysis.trainingWeeks.exists) totalToDelete += analysis.trainingWeeks.count;
    
    if (totalToDelete === 0) {
      console.log('\n✅ Нет данных для удаления!');
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
    
    console.log('🚀 Начинаем удаление...\n');
    
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
    
    console.log('\n✅ Очистка завершена!');
    console.log('\n💡 Следующие шаги:');
    console.log('   1. Проверьте работу приложений');
    console.log('   2. Удалите неиспользуемые сервисы из кода\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  }
}

main();
