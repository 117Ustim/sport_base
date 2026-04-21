const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

const BATCH_LIMIT = 450;
const HISTORY_DEDUP_WINDOW_MS = 5 * 60 * 1000;

function toFiniteNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  const match = String(value).trim().match(/-?\d+(?:[.,]\d+)?/);
  if (!match) {
    return null;
  }

  const normalized = match[0].replace(",", ".");
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toStoredWeight(rawValue) {
  const parsed = toFiniteNumber(rawValue);
  return parsed === null ? 0 : parsed;
}

function toSignature({ reps, previousWeight, newWeight }) {
  return `${reps}|${previousWeight}|${newWeight}`;
}

function toDateValue(rawTimestamp) {
  if (!rawTimestamp) {
    return 0;
  }

  const parsed = Date.parse(rawTimestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getRepsByColumnId(clientId) {
  const repsByColumnId = new Map();

  const metadataSnap = await db
    .collection("clientBases")
    .doc(clientId)
    .collection("metadata")
    .doc("settings")
    .get();

  if (!metadataSnap.exists) {
    return repsByColumnId;
  }

  const metadata = metadataSnap.data() || {};
  const columns = Array.isArray(metadata.columns) ? metadata.columns : [];

  columns.forEach((column) => {
    const columnId = String(column.id ?? "");
    if (!columnId) {
      return;
    }

    const targetReps = Number.parseInt(column.targetReps, 10);
    const namedReps = Number.parseInt(column.name, 10);

    if (Number.isFinite(targetReps) && targetReps > 0) {
      repsByColumnId.set(columnId, targetReps);
      return;
    }

    if (Number.isFinite(namedReps) && namedReps > 0) {
      repsByColumnId.set(columnId, namedReps);
    }
  });

  return repsByColumnId;
}

function resolveReps(columnId, repsByColumnId) {
  const key = String(columnId);

  if (repsByColumnId.has(key)) {
    return repsByColumnId.get(key);
  }

  // Fallback для дефолтных колонок (id: 0 -> reps: 1)
  const numericId = Number.parseInt(key, 10);
  if (Number.isFinite(numericId) && numericId >= 0) {
    return numericId + 1;
  }

  return 0;
}

function sanitizeIdPart(value) {
  return String(value).replace(/[^A-Za-z0-9_-]/g, "_");
}

exports.captureClientBaseWeightHistory = onDocumentWritten(
  "clientBases/{clientId}/exercises/{exerciseId}",
  async (event) => {
    try {
      const beforeSnap = event.data.before;
      const afterSnap = event.data.after;

      if (!afterSnap.exists) {
        return;
      }

      const { clientId, exerciseId } = event.params;
      const beforeData = beforeSnap.exists ? (beforeSnap.data() || {}) : {};
      const afterData = afterSnap.data() || {};
      const beforeWeights = beforeData.data && typeof beforeData.data === "object" ? beforeData.data : {};
      const afterWeights = afterData.data && typeof afterData.data === "object" ? afterData.data : {};

      const columnIds = new Set([...Object.keys(beforeWeights), ...Object.keys(afterWeights)]);
      if (columnIds.size === 0) {
        return;
      }

      const repsByColumnId = await getRepsByColumnId(clientId);
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      const exerciseName = afterData.name || beforeData.name || "";
      const categoryId = afterData.categoryId || beforeData.categoryId || null;

      const recentHistorySnapshot = await db
        .collection("exerciseHistory")
        .where("clientId", "==", clientId)
        .where("exerciseId", "==", String(exerciseId))
        .orderBy("timestamp", "desc")
        .limit(30)
        .get();

      const recentSignatures = new Set();
      recentHistorySnapshot.forEach((docSnapshot) => {
        const history = docSnapshot.data() || {};
        const historyTimestampMs = toDateValue(history.timestamp || history.trainingDate);
        if (!historyTimestampMs || nowMs - historyTimestampMs > HISTORY_DEDUP_WINDOW_MS) {
          return;
        }

        recentSignatures.add(
          toSignature({
            reps: Number(history.reps) || 0,
            previousWeight: toStoredWeight(history.previousWeight),
            newWeight: toStoredWeight(history.newWeight),
          })
        );
      });

      const entries = [];
      columnIds.forEach((columnId) => {
        const previousWeight = toStoredWeight(beforeWeights[columnId]);
        const newWeight = toStoredWeight(afterWeights[columnId]);

        if (previousWeight === newWeight) {
          return;
        }

        const reps = resolveReps(columnId, repsByColumnId);
        if (!Number.isFinite(reps) || reps <= 0) {
          return;
        }

        const entry = {
          clientId,
          exerciseId: String(exerciseId),
          exerciseName,
          sets: 0,
          reps,
          previousWeight,
          newWeight,
          previousReps: reps,
          newReps: reps,
          weightChange: newWeight - previousWeight,
          repsChange: 0,
          timestamp: nowIso,
          trainingDate: nowIso,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          source: "server-client-base-trigger",
          sourceColumnId: String(columnId),
          sourceEventId: event.id,
        };

        if (categoryId) {
          entry.categoryId = categoryId;
        }

        const signature = toSignature(entry);
        if (recentSignatures.has(signature)) {
          return;
        }

        recentSignatures.add(signature);
        entries.push(entry);
      });

      if (entries.length === 0) {
        return;
      }

      const batch = db.batch();
      entries.forEach((entry) => {
        const historyId = [
          "cb",
          sanitizeIdPart(event.id),
          sanitizeIdPart(entry.sourceColumnId),
        ].join("_");

        const historyRef = db.collection("exerciseHistory").doc(historyId);
        batch.set(historyRef, entry, { merge: true });
      });

      await batch.commit();

      logger.info("exerciseHistory captured from clientBases update", {
        clientId,
        exerciseId,
        entries: entries.length,
      });
    } catch (error) {
      logger.error("captureClientBaseWeightHistory failed", {
        error: error.message,
        eventId: event.id,
        params: event.params,
      });
      throw error;
    }
  }
);

function requireAuth(request) {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Требуется авторизация");
  }
  return auth;
}

async function requireAdmin(auth) {
  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Доступ запрещен: только для администраторов");
  }
}

async function commitDeleteBatches(refs) {
  let deletedCount = 0;
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const chunk = refs.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deletedCount += chunk.length;
  }
  return deletedCount;
}

async function commitSetBatches(items) {
  let updatedCount = 0;
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const chunk = items.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    chunk.forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
    updatedCount += chunk.length;
  }
  return updatedCount;
}

// ============================================
// ФУНКЦИЯ 1: Создание клиента
// ============================================
exports.createClient = onCall(async (request) => {
  const { profile, userId } = request.data;
  const auth = requireAuth(request);
  await requireAdmin(auth);

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
    throw new HttpsError("internal", `Ошибка создания клиента: ${error.message}`);
  }
});

// ============================================
// ФУНКЦИЯ 2: Каскадное удаление клиента
// ============================================
exports.deleteClient = onCall(async (request) => {
  const { clientId } = request.data;
  const auth = requireAuth(request);
  await requireAdmin(auth);

  try {
    const deleteRefs = [];
    deleteRefs.push(db.collection("clients").doc(clientId));

    const assignedWorkouts = await db.collection("assignedWorkouts")
      .where("clientId", "==", clientId)
      .get();
    assignedWorkouts.forEach(doc => deleteRefs.push(doc.ref));

    const workouts = await db.collection("workouts")
      .where("clientId", "==", clientId)
      .get();
    workouts.forEach(doc => deleteRefs.push(doc.ref));

    const history = await db.collection("workoutHistory")
      .where("clientId", "==", clientId)
      .get();
    history.forEach(doc => deleteRefs.push(doc.ref));

    const deletedCount = await commitDeleteBatches(deleteRefs);

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
    throw new HttpsError("internal", `Ошибка удаления клиента: ${error.message}`);
  }
});

// ============================================
// ФУНКЦИЯ 3: Назначение тренировки
// ============================================
exports.assignWorkout = onCall(async (request) => {
  const { clientId, userId, workoutId, workoutName, weekNumber } = request.data;
  const auth = requireAuth(request);
  await requireAdmin(auth);

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
    throw new HttpsError("internal", `Ошибка назначения тренировки: ${error.message}`);
  }
});

// ============================================
// ФУНКЦИЯ 4: Оптимизация assignedWorkouts (убрать weekData)
// ============================================
exports.optimizeAssignedWorkouts = onCall(async (request) => {
  const auth = requireAuth(request);
  await requireAdmin(auth);

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

    let skippedCount = 0;
    const updates = [];

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

      updates.push({ ref: doc.ref, data: optimizedData });
    });

    const optimizedCount = await commitSetBatches(updates);

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
    throw new HttpsError("internal", `Ошибка оптимизации: ${error.message}`);
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
