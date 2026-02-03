/**
 * СКРИПТ ДЛЯ ВОССТАНОВЛЕНИЯ ДАННЫХ ИЗ BACKUP
 * 
 * ВНИМАНИЕ: Используй только если что-то пошло не так!
 * 
 * Как запустить:
 * node scripts/restore-firestore.js backups/backup-YYYY-MM-DD/firestore-backup.json
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection } = require('firebase/firestore');
const { readFileSync } = require('fs');

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

async function restoreCollection(collectionName, data) {
  console.log(`📦 Restoring collection: ${collectionName}`);
  
  let count = 0;
  for (const [docId, docData] of Object.entries(data)) {
    try {
      await setDoc(doc(db, collectionName, docId), docData);
      count++;
    } catch (error) {
      console.error(`   ❌ Error restoring ${docId}:`, error.message);
    }
  }
  
  console.log(`   ✅ Restored ${count} documents`);
}

async function restoreLegacyCollection(parentCollection, docName, data) {
  console.log(`📦 Restoring legacy: ${parentCollection}/${docName}`);
  
  try {
    await setDoc(doc(db, parentCollection, docName), data);
    console.log(`   ✅ Restored`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }
}

async function restoreClientBases(data) {
  console.log(`📦 Restoring clientBases (with subcollections)`);
  
  for (const [clientId, clientData] of Object.entries(data)) {
    console.log(`   📂 Restoring clientBase: ${clientId}`);
    
    // Restore exercises
    if (clientData.exercises) {
      for (const [exerciseId, exerciseData] of Object.entries(clientData.exercises)) {
        try {
          await setDoc(
            doc(db, 'clientBases', clientId, 'exercises', exerciseId),
            exerciseData
          );
        } catch (error) {
          console.error(`      ❌ Error restoring exercise ${exerciseId}:`, error.message);
        }
      }
      console.log(`      ✅ ${Object.keys(clientData.exercises).length} exercises`);
    }
    
    // Restore metadata
    if (clientData.metadata && clientData.metadata.settings) {
      try {
        await setDoc(
          doc(db, 'clientBases', clientId, 'metadata', 'settings'),
          clientData.metadata.settings
        );
        console.log(`      ✅ metadata`);
      } catch (error) {
        console.error(`      ❌ Error restoring metadata:`, error.message);
      }
    }
  }
  
  console.log(`   ✅ Restored ${Object.keys(data).length} client bases`);
}

async function main() {
  const backupFile = process.argv[2];
  
  if (!backupFile) {
    console.error('❌ Please provide backup file path');
    console.error('Usage: node scripts/restore-firestore.js backups/backup-YYYY-MM-DD/firestore-backup.json');
    process.exit(1);
  }
  
  console.log('🚀 Starting Firestore restore...\n');
  console.log(`📄 Backup file: ${backupFile}\n`);
  
  // Читаем backup файл
  const backupData = JSON.parse(readFileSync(backupFile, 'utf-8'));
  
  console.log(`📅 Backup timestamp: ${backupData.timestamp}\n`);
  
  // Подтверждение
  console.log('⚠️  WARNING: This will overwrite existing data!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Restore коллекций
  for (const [collectionName, data] of Object.entries(backupData.collections)) {
    if (collectionName === 'clientBases') {
      await restoreClientBases(data);
    } else {
      await restoreCollection(collectionName, data);
    }
  }
  
  // Restore legacy коллекций
  for (const [parentCollection, docs] of Object.entries(backupData.legacy)) {
    for (const [docName, data] of Object.entries(docs)) {
      if (data) {
        await restoreLegacyCollection(parentCollection, docName, data);
      }
    }
  }
  
  console.log('\n✅ Restore completed successfully!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Restore failed:', error);
  process.exit(1);
});
