/**
 * УДАЛЕНИЕ ПРИЗРАЧНЫХ SUBCOLLECTIONS
 * Удаляет subcollections клиентов, у которых нет основного документа
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, getDoc } = require('firebase/firestore');
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

// Все ID которые видны в Firebase Console
const ALL_IDS = [
  '1767905610741',
  '1768298988347',
  '1768313707872',
  '1768936041102',
  '1769285194499',
  '1769369140401',
  '1769418005143'
];

async function login() {
  console.log('🔐 Авторизация...');
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Авторизован\n');
}

async function cleanupGhostSubcollections() {
  console.log('🧹 УДАЛЕНИЕ ПРИЗРАЧНЫХ SUBCOLLECTIONS\n');
  console.log('═'.repeat(80));
  
  let totalDeleted = 0;
  const ghostIds = [];
  
  console.log('\n🔍 Поиск призрачных записей...\n');
  
  for (const clientId of ALL_IDS) {
    // Проверяем существует ли документ клиента
    const clientRef = doc(db, 'clients', clientId);
    const clientSnap = await getDoc(clientRef);
    
    if (!clientSnap.exists()) {
      // Документа нет, но может быть subcollection
      console.log(`👻 Призрак найден: ${clientId}`);
      
      // Проверяем и удаляем attendance
      try {
        const attendanceRef = collection(db, 'clients', clientId, 'attendance');
        const attendanceSnap = await getDocs(attendanceRef);
        
        if (attendanceSnap.size > 0) {
          console.log(`   📦 Найдено attendance: ${attendanceSnap.size} записей`);
          
          // Удаляем все записи
          for (const doc of attendanceSnap.docs) {
            await deleteDoc(doc.ref);
            totalDeleted++;
          }
          
          console.log(`   ✅ Удалено: ${attendanceSnap.size} записей`);
          ghostIds.push(clientId);
        }
      } catch (error) {
        console.log(`   ⚠️  Ошибка: ${error.message}`);
      }
      
      console.log('');
    }
  }
  
  console.log('═'.repeat(80));
  console.log('\n✅ ОЧИСТКА ЗАВЕРШЕНА!\n');
  console.log('📊 СТАТИСТИКА:');
  console.log(`   Призрачных ID найдено: ${ghostIds.length}`);
  console.log(`   Записей attendance удалено: ${totalDeleted}\n`);
  
  if (ghostIds.length > 0) {
    console.log('🗑️  Удалены subcollections для:');
    ghostIds.forEach(id => {
      console.log(`   - ${id}`);
    });
    console.log('');
  }
  
  console.log('═'.repeat(80));
  console.log('\n💡 Теперь в Firebase Console должны остаться только 2 клиента:');
  console.log('   - 1769285194499 (Федоренко Артур)');
  console.log('   - 1769418005143 (Коновалова Анна)\n');
}

async function main() {
  try {
    await login();
    await cleanupGhostSubcollections();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();
