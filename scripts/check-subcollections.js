/**
 * ПРОВЕРКА SUBCOLLECTIONS В CLIENTS
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

// Активные клиенты
const ACTIVE_CLIENTS = ['1769285194499', '1769418005143'];

// Все ID которые ты видишь в Firebase Console
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

async function checkSubcollections() {
  console.log('🔍 ПРОВЕРКА SUBCOLLECTIONS В CLIENTS\n');
  console.log('═'.repeat(80));
  
  console.log('\n📋 Проверяем каждый ID...\n');
  
  for (const clientId of ALL_IDS) {
    const isActive = ACTIVE_CLIENTS.includes(clientId);
    const status = isActive ? '✅ АКТИВНЫЙ' : '❌ УДАЛЕННЫЙ';
    
    console.log(`\n${status} ID: ${clientId}`);
    
    // Проверяем существует ли документ клиента
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      
      if (clientSnap.exists()) {
        const profile = clientSnap.data().profile || {};
        console.log(`   📄 Документ СУЩЕСТВУЕТ`);
        console.log(`   Имя: ${profile.surname} ${profile.name}`);
        console.log(`   Email: ${profile.email || 'нет'}`);
        console.log(`   Зал: ${profile.gymName || 'нет'}`);
      } else {
        console.log(`   ⚠️  Документ НЕ СУЩЕСТВУЕТ (только subcollection)`);
      }
      
      // Проверяем subcollection attendance
      try {
        const attendanceRef = collection(db, 'clients', clientId, 'attendance');
        const attendanceSnap = await getDocs(attendanceRef);
        
        if (attendanceSnap.size > 0) {
          console.log(`   📦 Subcollection 'attendance': ${attendanceSnap.size} записей`);
        }
      } catch (error) {
        // Нет subcollection
      }
      
    } catch (error) {
      console.log(`   ❌ Ошибка проверки: ${error.message}`);
    }
  }
  
  console.log('\n═'.repeat(80));
  console.log('\n💡 ОБЪЯСНЕНИЕ:\n');
  console.log('В Firebase Console показываются:');
  console.log('  1. Документы клиентов (с данными profile)');
  console.log('  2. ID с subcollections (attendance) БЕЗ основного документа\n');
  console.log('Если документ клиента удален, но остались subcollections,');
  console.log('Firebase Console все равно показывает этот ID.\n');
  console.log('Это "призрачные" записи - нужно удалить subcollections!\n');
}

async function main() {
  try {
    await login();
    await checkSubcollections();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();
