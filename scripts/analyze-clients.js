/**
 * АНАЛИЗ КЛИЕНТОВ
 * Показывает всех клиентов и помогает найти неиспользуемых
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

async function analyzeClients() {
  console.log('📊 АНАЛИЗ КЛИЕНТОВ\n');
  
  try {
    // Получаем всех клиентов
    const clientsRef = collection(db, 'clients');
    const clientsSnap = await getDocs(clientsRef);
    
    console.log(`Всего клиентов в базе: ${clientsSnap.size}\n`);
    
    const clients = [];
    
    for (const doc of clientsSnap.docs) {
      const data = doc.data();
      const profile = data.profile || {};
      
      clients.push({
        id: doc.id,
        name: profile.name || '',
        surname: profile.surname || '',
        email: profile.email || '',
        phone: profile.phone || '',
        gym: profile.gymName || '',
        createdAt: profile.createdAt || '',
        isActive: profile.isActive !== undefined ? profile.isActive : true
      });
    }
    
    // Сортируем по фамилии
    clients.sort((a, b) => (a.surname || '').localeCompare(b.surname || ''));
    
    console.log('СПИСОК ВСЕХ КЛИЕНТОВ:\n');
    console.log('ID'.padEnd(15) + 'Фамилия'.padEnd(20) + 'Имя'.padEnd(15) + 'Email'.padEnd(30) + 'Зал'.padEnd(15) + 'Активен');
    console.log('-'.repeat(110));
    
    clients.forEach(client => {
      const id = client.id.substring(0, 13);
      const surname = (client.surname || '').substring(0, 18);
      const name = (client.name || '').substring(0, 13);
      const email = (client.email || '').substring(0, 28);
      const gym = (client.gym || '').substring(0, 13);
      const active = client.isActive ? '✅' : '❌';
      
      console.log(
        id.padEnd(15) + 
        surname.padEnd(20) + 
        name.padEnd(15) + 
        email.padEnd(30) + 
        gym.padEnd(15) + 
        active
      );
    });
    
    console.log('\n📊 СТАТИСТИКА:');
    console.log(`   Всего клиентов: ${clients.length}`);
    console.log(`   Активных: ${clients.filter(c => c.isActive).length}`);
    console.log(`   Неактивных: ${clients.filter(c => !c.isActive).length}`);
    console.log(`   С email: ${clients.filter(c => c.email).length}`);
    console.log(`   Без email: ${clients.filter(c => !c.email).length}`);
    
    // Группировка по залам
    const byGym = {};
    clients.forEach(c => {
      const gym = c.gym || 'Без зала';
      byGym[gym] = (byGym[gym] || 0) + 1;
    });
    
    console.log('\n📍 ПО ЗАЛАМ:');
    Object.entries(byGym).forEach(([gym, count]) => {
      console.log(`   ${gym}: ${count} клиентов`);
    });
    
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   1. Проверьте список клиентов');
    console.log('   2. Определите каких 2 клиентов вы используете');
    console.log('   3. Запустите: node scripts/cleanup-clients.js');
    console.log('   4. Скрипт спросит какие ID оставить\n');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

async function main() {
  try {
    await login();
    await analyzeClients();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();
