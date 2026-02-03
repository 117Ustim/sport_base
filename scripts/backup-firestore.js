/**
 * СКРИПТ ДЛЯ BACKUP ВСЕХ ДАННЫХ FIRESTORE
 * 
 * Что делает:
 * 1. Экспортирует все коллекции в JSON файлы
 * 2. Сохраняет в папку backups/ с датой и временем
 * 3. Создает полную копию базы данных
 * 
 * Как запустить:
 * node scripts/backup-firestore.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
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

// Список коллекций для backup
const COLLECTIONS = [
  'users',
  'workouts',
  'workoutHistory',
  'assignedWorkouts',
  'exercises',
  'categories',
  'trainings',
  'trainingWeeks',
  'clientBases' // Это коллекция с subcollections
];

// Legacy коллекция Ustim
const LEGACY_COLLECTIONS = {
  'Ustim': ['People', 'Gyms', 'Attendance', 'Statistics']
};

async function backupCollection(collectionName) {
  console.log(`📦 Backing up collection: ${collectionName}`);
  
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    const data = {};
    snapshot.docs.forEach(doc => {
      data[doc.id] = doc.data();
    });
    
    console.log(`   ✅ Backed up ${snapshot.size} documents`);
    return data;
  } catch (error) {
    console.error(`   ❌ Error backing up ${collectionName}:`, error.message);
    return {};
  }
}

async function backupLegacyCollection(parentCollection, docName) {
  console.log(`📦 Backing up legacy: ${parentCollection}/${docName}`);
  
  try {
    const docRef = doc(db, parentCollection, docName);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log(`   ✅ Backed up document`);
      return data;
    } else {
      console.log(`   ⚠️  Document not found`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Error backing up ${parentCollection}/${docName}:`, error.message);
    return null;
  }
}

async function backupClientBases() {
  console.log(`📦 Backing up clientBases (with subcollections)`);
  
  try {
    const clientBasesRef = collection(db, 'clientBases');
    const snapshot = await getDocs(clientBasesRef);
    
    const data = {};
    
    for (const clientDoc of snapshot.docs) {
      const clientId = clientDoc.id;
      console.log(`   📂 Backing up clientBase: ${clientId}`);
      
      data[clientId] = {
        exercises: {},
        metadata: {}
      };
      
      // Backup exercises subcollection
      try {
        const exercisesRef = collection(db, 'clientBases', clientId, 'exercises');
        const exercisesSnap = await getDocs(exercisesRef);
        
        exercisesSnap.docs.forEach(doc => {
          data[clientId].exercises[doc.id] = doc.data();
        });
        
        console.log(`      ✅ ${exercisesSnap.size} exercises`);
      } catch (error) {
        console.error(`      ❌ Error backing up exercises:`, error.message);
      }
      
      // Backup metadata subcollection
      try {
        const metadataRef = doc(db, 'clientBases', clientId, 'metadata', 'settings');
        const metadataSnap = await getDoc(metadataRef);
        
        if (metadataSnap.exists()) {
          data[clientId].metadata.settings = metadataSnap.data();
          console.log(`      ✅ metadata`);
        }
      } catch (error) {
        console.error(`      ❌ Error backing up metadata:`, error.message);
      }
    }
    
    console.log(`   ✅ Backed up ${snapshot.size} client bases`);
    return data;
  } catch (error) {
    console.error(`   ❌ Error backing up clientBases:`, error.message);
    return {};
  }
}

async function main() {
  console.log('🚀 Starting Firestore backup...\n');
  
  // Создаем папку для backup с датой и временем
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = join(__dirname, '..', 'backups', `backup-${timestamp}`);
  
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }
  
  console.log(`📁 Backup directory: ${backupDir}\n`);
  
  const allData = {
    timestamp: new Date().toISOString(),
    collections: {},
    legacy: {}
  };
  
  // Backup обычных коллекций
  for (const collectionName of COLLECTIONS) {
    if (collectionName === 'clientBases') {
      allData.collections[collectionName] = await backupClientBases();
    } else {
      allData.collections[collectionName] = await backupCollection(collectionName);
    }
  }
  
  // Backup legacy коллекций (Ustim)
  for (const [parentCollection, docs] of Object.entries(LEGACY_COLLECTIONS)) {
    allData.legacy[parentCollection] = {};
    
    for (const docName of docs) {
      const data = await backupLegacyCollection(parentCollection, docName);
      if (data) {
        allData.legacy[parentCollection][docName] = data;
      }
    }
  }
  
  // Сохраняем в файл
  const backupFile = join(backupDir, 'firestore-backup.json');
  writeFileSync(backupFile, JSON.stringify(allData, null, 2), 'utf-8');
  
  console.log('\n✅ Backup completed successfully!');
  console.log(`📄 Backup file: ${backupFile}`);
  
  // Статистика
  console.log('\n📊 Backup statistics:');
  for (const [collectionName, data] of Object.entries(allData.collections)) {
    const count = Object.keys(data).length;
    console.log(`   ${collectionName}: ${count} documents`);
  }
  
  for (const [parentCollection, docs] of Object.entries(allData.legacy)) {
    console.log(`   ${parentCollection}:`);
    for (const [docName, data] of Object.entries(docs)) {
      if (data) {
        const count = typeof data === 'object' ? Object.keys(data).length : 1;
        console.log(`      ${docName}: ${count} items`);
      }
    }
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Backup failed:', error);
  process.exit(1);
});
