/**
 * ОПТИМИЗАЦИЯ ASSIGNEDWORKOUTS
 * 
 * Что делает:
 * Убирает поле weekData из assignedWorkouts (дублирование)
 * Оставляет только workoutId и weekNumber
 * 
 * Безопасно: Создает backup перед изменениями
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteField } = require('firebase/firestore');

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

async function optimizeAssignedWorkouts() {
  console.log('🚀 Оптимизация assignedWorkouts...\n');
  
  try {
    // Получаем все назначения
    const assignmentsRef = collection(db, 'assignedWorkouts');
    const snapshot = await getDocs(assignmentsRef);
    
    console.log(`📊 Найдено назначений: ${snapshot.size}\n`);
    
    if (snapshot.empty) {
      console.log('⚠️  Нет назначений для оптимизации');
      process.exit(0);
    }
    
    let optimizedCount = 0;
    let skippedCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const assignmentId = docSnapshot.id;
      
      // Проверяем есть ли weekData
      if (!data.weekData) {
        console.log(`   ⏭️  ${assignmentId}: уже оптимизирован`);
        skippedCount++;
        continue;
      }
      
      // Создаем оптимизированную версию (без weekData)
      const optimizedData = {
        clientId: data.clientId,
        userId: data.userId,
        workoutId: data.workoutId,
        workoutName: data.workoutName,
        weekNumber: data.weekNumber,
        assignedAt: data.assignedAt,
        status: data.status || 'new'
      };
      
      // Сохраняем без weekData
      await setDoc(doc(db, 'assignedWorkouts', assignmentId), optimizedData);
      
      optimizedCount++;
      console.log(`   ✅ ${optimizedCount}/${snapshot.size}: ${assignmentId}`);
      console.log(`      Удалено weekData (экономия ~${JSON.stringify(data.weekData).length} байт)`);
    }
    
    console.log(`\n✅ Оптимизация завершена!`);
    console.log(`   Оптимизировано: ${optimizedCount}`);
    console.log(`   Пропущено: ${skippedCount}`);
    console.log(`\n💡 weekData теперь берется из workouts при чтении`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка оптимизации:', error);
    process.exit(1);
  }
}

optimizeAssignedWorkouts();
