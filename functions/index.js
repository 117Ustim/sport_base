const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

// ============================================
// ФУНКЦИЯ 1: Создание клиента
// ============================================
exports.createClient = onCall(async (request) => {
  const { profile, userId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new Error("Требуется авторизация");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new Error("Доступ запрещен: только для администраторов");
  }

  try {
    const clientId = Date.now().toString();
    
    await db.collection("clients").doc(clientId).set({
      ...profile,
      userId: userId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`Клиент создан: ${clientId}`, { clientId, adminId: auth.uid });

    return { 
      success: true, 
      clientId,
      message: "Клиент успешно создан"
    };
  } catch (error) {
    logger.error("Ошибка создания клиента:", error);
    throw new Error(`Ошибка создания клиента: ${error.message}`);
  }
});

// ============================================
// ФУНКЦИЯ 2: Каскадное удаление клиента
// ============================================
exports.deleteClient = onCall(async (request) => {
  const { clientId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new Error("Требуется авторизация");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new Error("Доступ запрещен: только для администраторов");
  }

  try {
    const batch = db.batch();
    let deletedCount = 0;

    batch.delete(db.collection("clients").doc(clientId));
    deletedCount++;

    const assignedWorkouts = await db.collection("assignedWorkouts")
      .where("clientId", "==", clientId)
      .get();
    assignedWorkouts.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    const workouts = await db.collection("workouts")
      .where("clientId", "==", clientId)
      .get();
    workouts.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    const history = await db.collection("workoutHistory")
      .where("clientId", "==", clientId)
      .get();
    history.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    logger.info(`Клиент удален каскадно: ${clientId}`, { 
      clientId, 
      deletedCount,
      adminId: auth.uid 
    });

    return { 
      success: true, 
      deletedCount,
      message: `Удалено ${deletedCount} записей`
    };
  } catch (error) {
    logger.error("Ошибка удаления клиента:", error);
    throw new Error(`Ошибка удаления клиента: ${error.message}`);
  }
});

// ============================================
// ФУНКЦИЯ 3: Назначение тренировки
// ============================================
exports.assignWorkout = onCall(async (request) => {
  const { clientId, userId, workoutId, workoutName, weekNumber } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new Error("Требуется авторизация");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new Error("Доступ запрещен: только для администраторов");
  }

  try {
    const assignmentId = `${clientId}_${workoutId}_week${weekNumber}_${Date.now()}`;
    
    await db.collection("assignedWorkouts").doc(assignmentId).set({
      clientId,
      userId,
      workoutId,
      workoutName,
      weekNumber,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "new"
    });

    logger.info(`Тренировка назначена: ${assignmentId}`, { 
      assignmentId,
      clientId,
      workoutId,
      adminId: auth.uid 
    });

    return { 
      success: true, 
      assignmentId,
      message: "Тренировка успешно назначена"
    };
  } catch (error) {
    logger.error("Ошибка назначения тренировки:", error);
    throw new Error(`Ошибка назначения тренировки: ${error.message}`);
  }
});

// ============================================
// ФУНКЦИЯ 4: Оптимизация assignedWorkouts (убрать weekData)
// ============================================
exports.optimizeAssignedWorkouts = onCall(async (request) => {
  const auth = request.auth;

  if (!auth) {
    throw new Error("Требуется авторизация");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new Error("Доступ запрещен: только для администраторов");
  }

  try {
    const assignmentsSnapshot = await db.collection("assignedWorkouts").get();
    
    if (assignmentsSnapshot.empty) {
      return {
        success: true,
        optimizedCount: 0,
        skippedCount: 0,
        message: "Нет назначений для оптимизации"
      };
    }

    let optimizedCount = 0;
    let skippedCount = 0;
    const batch = db.batch();

    assignmentsSnapshot.forEach(doc => {
      const data = doc.data();
      
      if (!data.weekData) {
        skippedCount++;
        return;
      }

      const optimizedData = {
        clientId: data.clientId,
        userId: data.userId,
        workoutId: data.workoutId,
        workoutName: data.workoutName,
        weekNumber: data.weekNumber,
        assignedAt: data.assignedAt,
        status: data.status || "new"
      };

      batch.set(doc.ref, optimizedData);
      optimizedCount++;
    });

    await batch.commit();

    logger.info("assignedWorkouts оптимизированы", { 
      optimizedCount, 
      skippedCount,
      adminId: auth.uid 
    });

    return {
      success: true,
      optimizedCount,
      skippedCount,
      message: `Оптимизировано: ${optimizedCount}, Пропущено: ${skippedCount}`
    };
  } catch (error) {
    logger.error("Ошибка оптимизации assignedWorkouts:", error);
    throw new Error(`Ошибка оптимизации: ${error.message}`);
  }
});

// ============================================
// ФУНКЦИЯ 5: Расчет статистики (автоматически каждый день в 00:30)
// ============================================
exports.calculateStatistics = onSchedule("30 0 * * *", async (event) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    logger.info(`Расчет статистики за ${dateStr}`);

    const gyms = await db.collection("gyms").get();
    let processedGyms = 0;

    for (const gymDoc of gyms.docs) {
      const gymId = gymDoc.id;
      const gymName = gymDoc.data().name;

      const statsRef = db.collection("statistics")
        .doc(gymId)
        .collection("daily")
        .doc(dateStr);

      const existingStats = await statsRef.get();
      if (existingStats.exists) {
        logger.info(`Статистика уже существует: ${gymName} (${dateStr})`);
        continue;
      }

      const attendanceQuery = await db.collectionGroup("attendance")
        .where("gymId", "==", gymId)
        .where("date", "==", dateStr)
        .get();

      const stats = {
        gymId,
        gymName,
        date: dateStr,
        trainedTotal: attendanceQuery.size,
        trainedTotalCost: 0,
        trainedPersonal: 0,
        trainedOther: 0,
        clients: [],
        calculatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      attendanceQuery.forEach(doc => {
        const data = doc.data();
        stats.trainedTotalCost += data.cost || 0;
        
        if (data.type === "personal") {
          stats.trainedPersonal++;
        } else {
          stats.trainedOther++;
        }

        stats.clients.push({
          clientId: data.clientId,
          name: data.clientName,
          cost: data.cost,
          type: data.type
        });
      });

      await statsRef.set(stats);
      processedGyms++;

      logger.info(`Статистика рассчитана: ${gymName} (${dateStr})`, stats);
    }

    return { 
      success: true, 
      date: dateStr,
      processedGyms,
      message: `Статистика рассчитана для ${processedGyms} залов`
    };
  } catch (error) {
    logger.error("Ошибка расчета статистики:", error);
    throw new Error(`Ошибка расчета статистики: ${error.message}`);
  }
});
