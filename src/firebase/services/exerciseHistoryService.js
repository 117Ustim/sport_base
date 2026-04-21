import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config';
import { clientBaseService } from './clientBaseService';

const COLLECTION_NAME = 'exerciseHistory';
const MAX_REPS = 12;
const MIN_REPS = 1;
const FIRESTORE_BATCH_LIMIT = 450;

const resolveExerciseId = (entry = {}) => {
  const rawId = entry.exerciseId || entry.exercise_id;
  if (rawId === null || rawId === undefined) {
    return '';
  }

  return String(rawId).trim();
};

const normalizeExerciseName = (name) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const toFiniteNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  const match = String(value)
    .trim()
    .match(/-?\d+(?:[.,]\d+)?/);

  if (!match) {
    return null;
  }

  const normalizedNumber = match[0].replace(',', '.');
  const numericValue = Number(normalizedNumber);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const toHistoryTimestamp = (entry = {}) => entry.timestamp || entry.trainingDate || '';

const toSortableTime = (entry = {}) => {
  const parsed = Date.parse(toHistoryTimestamp(entry));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toRepsValue = (entry = {}) => {
  const numericReps = Number.parseInt(entry.reps ?? entry.newReps ?? entry.previousReps, 10);
  if (!Number.isInteger(numericReps)) {
    return null;
  }

  return numericReps >= MIN_REPS && numericReps <= MAX_REPS ? numericReps : null;
};

const isValidPositiveWeight = (weight) => Number.isFinite(weight) && weight > 0;

const toCurrentWeightValue = (entry = {}) => {
  const newWeight = toFiniteNumber(entry.newWeight);
  if (isValidPositiveWeight(newWeight)) {
    return newWeight;
  }

  const previousWeight = toFiniteNumber(entry.previousWeight);
  if (isValidPositiveWeight(previousWeight)) {
    return previousWeight;
  }

  return null;
};

const toBaselineWeightValue = (entry = {}) => {
  const previousWeight = toFiniteNumber(entry.previousWeight);
  if (isValidPositiveWeight(previousWeight)) {
    return previousWeight;
  }

  const newWeight = toFiniteNumber(entry.newWeight);
  if (isValidPositiveWeight(newWeight)) {
    return newWeight;
  }

  return null;
};

const toWeightPoint = (entry = {}, weight) => {
  if (!isValidPositiveWeight(weight)) {
    return null;
  }

  return {
    weight,
    timestamp: toHistoryTimestamp(entry),
    sortableTime: toSortableTime(entry),
  };
};

const appendUniquePoint = (points = [], point) => {
  if (!point) {
    return;
  }

  const lastPoint = points[points.length - 1];
  if (lastPoint && lastPoint.weight === point.weight) {
    return;
  }

  points.push(point);
};

const toTransitionPoints = (entry = {}) => {
  const transitionPoints = [];

  const previousWeight = toFiniteNumber(entry.previousWeight);
  const newWeight = toFiniteNumber(entry.newWeight);

  appendUniquePoint(transitionPoints, toWeightPoint(entry, previousWeight));
  appendUniquePoint(transitionPoints, toWeightPoint(entry, newWeight));

  // Обратная совместимость с legacy записями, где мог быть заполнен только один вес.
  if (transitionPoints.length === 0) {
    appendUniquePoint(transitionPoints, toWeightPoint(entry, toCurrentWeightValue(entry)));
  }

  return transitionPoints;
};

const pickBaselinePoint = (points = []) => {
  if (points.length === 0) {
    return null;
  }
  return points[0];
};

const pickCurrentPoint = (points = []) => {
  if (points.length === 0) {
    return null;
  }

  return points[points.length - 1];
};

const roundTo2 = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return Math.round(value * 100) / 100;
};

const getOneRmEstimate = (weight, reps) => {
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isInteger(reps) || reps < MIN_REPS) {
    return null;
  }

  if (reps <= 8) {
    const denominator = 37 - reps;
    if (denominator <= 0) {
      return null;
    }
    return (weight * 36) / denominator; // Brzycki
  }

  return weight * (1 + reps / 30); // Epley
};

/**
 * Сервис для работы с историей изменений упражнений
 * Сохраняет каждое изменение веса в базе client_base
 */
export const exerciseHistoryService = {
  /**
   * Добавить запись в историю упражнений
   * @param {Object} entry - Данные записи
   * @returns {Promise<string>} ID созданной записи
   */
  async addHistoryEntry(entry) {
    try {
      const historyRef = collection(db, COLLECTION_NAME);
      const exerciseId = resolveExerciseId(entry);

      if (!exerciseId) {
        throw new Error('exerciseId is required for exerciseHistory entry');
      }
      
      // Очищаем от undefined значений
      const cleanEntry = {
        clientId: entry.clientId,
        exerciseId,
        exerciseName: entry.exerciseName,
        sets: entry.sets || 0,
        reps: entry.reps,
        previousWeight: entry.previousWeight,
        newWeight: entry.newWeight,
        previousReps: entry.previousReps || entry.reps,
        newReps: entry.newReps || entry.reps,
        weightChange: entry.weightChange,
        repsChange: entry.repsChange || 0,
        timestamp: entry.timestamp || new Date().toISOString(),
        trainingDate: entry.trainingDate || new Date().toISOString(),
        createdAt: Timestamp.now()
      };
      
      // Добавляем опциональные поля только если они определены
      if (entry.categoryId) {
        cleanEntry.categoryId = entry.categoryId;
      }
      if (entry.workoutId) {
        cleanEntry.workoutId = entry.workoutId;
      }
      if (entry.assignmentId) {
        cleanEntry.assignmentId = entry.assignmentId;
      }
      
      const docRef = await addDoc(historyRef, cleanEntry);
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding exercise history entry:', error);
      throw error;
    }
  },

  /**
   * Получить историю упражнения для клиента
   * @param {string} clientId - ID клиента
   * @param {string} exerciseId - ID упражнения
   * @param {number} limitCount - Лимит записей (по умолчанию 50)
   * @returns {Promise<Array>} Массив записей истории
   */
  async getExerciseHistory(clientId, exerciseId, limitCount = 50) {
    try {
      if (!exerciseId) {
        throw new Error('exerciseId is required for exercise history query');
      }

      const historyRef = collection(db, COLLECTION_NAME);
      const q = query(
        historyRef,
        where('clientId', '==', clientId),
        where('exerciseId', '==', exerciseId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting exercise history:', error);
      throw error;
    }
  },

  /**
   * Получить полную историю упражнения для клиента
   * @param {string} clientId - ID клиента
   * @param {string} exerciseId - ID упражнения
   * @returns {Promise<Array>} Массив всех записей истории
   */
  async getExerciseHistoryAll(clientId, exerciseId) {
    try {
      if (!exerciseId) {
        throw new Error('exerciseId is required for exercise history query');
      }

      const historyRef = collection(db, COLLECTION_NAME);
      const q = query(
        historyRef,
        where('clientId', '==', clientId),
        where('exerciseId', '==', exerciseId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting full exercise history:', error);
      throw error;
    }
  },

  /**
   * Получить всю историю клиента
   * @param {string} clientId - ID клиента
   * @param {string} startDate - Начальная дата (опционально)
   * @param {string} endDate - Конечная дата (опционально)
   * @param {number} limitCount - Лимит записей (по умолчанию 100)
   * @returns {Promise<Array>} Массив записей истории
   */
  async getClientHistory(clientId, startDate = null, endDate = null, limitCount = 100) {
    try {
      const historyRef = collection(db, COLLECTION_NAME);
      const q = query(
        historyRef,
        where('clientId', '==', clientId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      let history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Фильтрация по датам на клиенте
      if (startDate) {
        history = history.filter(entry => entry.trainingDate >= startDate);
      }
      if (endDate) {
        history = history.filter(entry => entry.trainingDate <= endDate);
      }

      return history;
    } catch (error) {
      console.error('Error getting client history:', error);
      throw error;
    }
  },

  /**
   * Получить статистику прогресса по упражнению
   * @param {string} clientId - ID клиента
   * @param {string} exerciseId - ID упражнения
   * @returns {Promise<Object>} Статистика прогресса
   */
  async getExerciseProgress(clientId, exerciseId) {
    try {
      const history = await this.getExerciseHistoryAll(clientId, exerciseId);
      
      if (history.length === 0) {
        return {
          totalChanges: 0,
          totalWeightIncrease: 0,
          averageWeightIncrease: 0,
          firstWeight: 0,
          lastWeight: 0,
          progressPercentage: 0
        };
      }

      const sortedHistory = [...history].sort((a, b) => toSortableTime(a) - toSortableTime(b));
      const totalWeightIncrease = sortedHistory.reduce((sum, entry) => sum + (toFiniteNumber(entry.weightChange) || 0), 0);
      const firstWeight = toBaselineWeightValue(sortedHistory[0]) || 0;
      const lastWeight = toCurrentWeightValue(sortedHistory[sortedHistory.length - 1]) || 0;
      const progressPercentage = firstWeight > 0 
        ? ((lastWeight - firstWeight) / firstWeight) * 100 
        : 0;

      return {
        totalChanges: history.length,
        totalWeightIncrease,
        averageWeightIncrease: totalWeightIncrease / history.length,
        firstWeight,
        lastWeight,
        progressPercentage
      };
    } catch (error) {
      console.error('Error getting exercise progress:', error);
      throw error;
    }
  },

  /**
   * Прогнать backfill exerciseId по существующей истории конкретного клиента
   * @param {string} clientId - ID клиента
   * @returns {Promise<Object>} Результат backfill
   */
  async backfillExerciseIdsForClient(clientId) {
    try {
      if (!clientId) {
        throw new Error('clientId is required for backfill');
      }

      const baseExercises = await clientBaseService.getByClientId(clientId);
      const exerciseIdsByName = new Map();
      const globalExerciseIdsByName = new Map();

      const addExerciseToNameMap = (map, name, exerciseId) => {
        const nameKey = normalizeExerciseName(name);
        if (!nameKey || !exerciseId) {
          return;
        }

        const existingIds = map.get(nameKey) || [];
        if (!existingIds.includes(exerciseId)) {
          existingIds.push(exerciseId);
        }
        map.set(nameKey, existingIds);
      };

      baseExercises.forEach((exercise) => {
        addExerciseToNameMap(exerciseIdsByName, exercise.name, exercise.exercise_id);
      });

      const globalExercisesSnapshot = await getDocs(collection(db, 'exercises'));
      globalExercisesSnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data() || {};
        addExerciseToNameMap(globalExerciseIdsByName, data.name, docSnapshot.id);
      });

      const historyRef = collection(db, COLLECTION_NAME);
      const q = query(
        historyRef,
        where('clientId', '==', clientId),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          clientId,
          totalEntries: 0,
          updatedEntries: 0,
          alreadyFilled: 0,
          unresolvedEntries: 0,
          unresolvedNoName: 0,
          unresolvedAmbiguous: 0
        };
      }

      const entriesToUpdate = [];
      let alreadyFilled = 0;
      let unresolvedEntries = 0;
      let unresolvedNoName = 0;
      let unresolvedAmbiguous = 0;
      let unresolvedNoMatch = 0;
      let updatedByClientBase = 0;
      let updatedByGlobalFallback = 0;

      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (resolveExerciseId(data)) {
          alreadyFilled++;
          return;
        }

        const nameKey = normalizeExerciseName(data.exerciseName);
        if (!nameKey) {
          unresolvedEntries++;
          unresolvedNoName++;
          return;
        }

        const clientMatchedIds = exerciseIdsByName.get(nameKey) || [];
        if (clientMatchedIds.length === 1) {
          entriesToUpdate.push({
            ref: docSnapshot.ref,
            exerciseId: clientMatchedIds[0]
          });
          updatedByClientBase++;
          return;
        }

        const globalMatchedIds = globalExerciseIdsByName.get(nameKey) || [];
        if (globalMatchedIds.length === 1) {
          entriesToUpdate.push({
            ref: docSnapshot.ref,
            exerciseId: globalMatchedIds[0]
          });
          updatedByGlobalFallback++;
          return;
        }

        const hasAmbiguousMatches = clientMatchedIds.length > 1 || globalMatchedIds.length > 1;
        if (hasAmbiguousMatches) {
          unresolvedEntries++;
          unresolvedAmbiguous++;
          return;
        }

        unresolvedEntries++;
        unresolvedNoMatch++;
      });

      for (let index = 0; index < entriesToUpdate.length; index += FIRESTORE_BATCH_LIMIT) {
        const batch = writeBatch(db);
        const currentBatch = entriesToUpdate.slice(index, index + FIRESTORE_BATCH_LIMIT);

        currentBatch.forEach((entry) => {
          batch.update(entry.ref, {
            exerciseId: entry.exerciseId,
            backfilledAt: new Date().toISOString()
          });
        });

        await batch.commit();
      }

      return {
        clientId,
        totalEntries: snapshot.size,
        updatedEntries: entriesToUpdate.length,
        updatedByClientBase,
        updatedByGlobalFallback,
        alreadyFilled,
        unresolvedEntries,
        unresolvedNoName,
        unresolvedAmbiguous,
        unresolvedNoMatch
      };
    } catch (error) {
      console.error('Error backfilling exerciseId for history:', error);
      throw error;
    }
  },

  /**
   * Построить статистику по 1..12 повторениям на основе полной истории
   * @param {string} clientId - ID клиента
   * @param {string} exerciseId - ID упражнения
   * @returns {Promise<Object>} Статистика для карточек и таблицы
   */
  async getExerciseStatsByReps(clientId, exerciseId) {
    try {
      const history = await this.getExerciseHistoryAll(clientId, exerciseId);
      const sortedHistory = [...history].sort((a, b) => toSortableTime(a) - toSortableTime(b));
      const pointsByReps = new Map();

      sortedHistory.forEach((entry) => {
        const reps = toRepsValue(entry);
        if (!reps) {
          return;
        }

        const transitionPoints = toTransitionPoints(entry);
        if (transitionPoints.length === 0) {
          return;
        }

        const repsPoints = pointsByReps.get(reps) || [];
        transitionPoints.forEach((point) => appendUniquePoint(repsPoints, point));
        pointsByReps.set(reps, repsPoints);
      });

      const rows = [];
      for (let reps = MIN_REPS; reps <= MAX_REPS; reps++) {
        const repsPoints = pointsByReps.get(reps) || [];
        const baselinePoint = pickBaselinePoint(repsPoints);
        const currentPoint = pickCurrentPoint(repsPoints);

        if (!baselinePoint || !currentPoint) {
          rows.push({
            reps,
            hasBaseline: false,
            baselineWeight: null,
            currentWeight: null,
            changeKg: null,
            changePercent: null,
            baseline1RM: null,
            current1RM: null,
            oneRmChangeKg: null,
            oneRmChangePercent: null,
            baselineDate: null,
            currentDate: null
          });
          continue;
        }

        const baselineWeight = baselinePoint.weight;
        const currentWeight = currentPoint.weight;
        const changeKg = currentWeight - baselineWeight;
        const changePercent = baselineWeight > 0 ? (changeKg / baselineWeight) * 100 : null;

        const baseline1RM = getOneRmEstimate(baselineWeight, reps);
        const current1RM = getOneRmEstimate(currentWeight, reps);
        const oneRmChangeKg = baseline1RM !== null && current1RM !== null
          ? current1RM - baseline1RM
          : null;
        const oneRmChangePercent = baseline1RM && oneRmChangeKg !== null
          ? (oneRmChangeKg / baseline1RM) * 100
          : null;

        rows.push({
          reps,
          hasBaseline: true,
          baselineWeight: roundTo2(baselineWeight),
          currentWeight: roundTo2(currentWeight),
          changeKg: roundTo2(changeKg),
          changePercent: roundTo2(changePercent),
          baseline1RM: roundTo2(baseline1RM),
          current1RM: roundTo2(current1RM),
          oneRmChangeKg: roundTo2(oneRmChangeKg),
          oneRmChangePercent: roundTo2(oneRmChangePercent),
          baselineDate: baselinePoint.timestamp,
          currentDate: currentPoint.timestamp
        });
      }

      const filledRows = rows.filter(row => row.hasBaseline);
      const rowsWithProgress = filledRows.filter(row => row.changePercent !== null);
      const averageProgressPercent = rowsWithProgress.length > 0
        ? roundTo2(
          rowsWithProgress.reduce((sum, row) => sum + row.changePercent, 0) / rowsWithProgress.length
        )
        : 0;

      return {
        clientId,
        exerciseId,
        totalHistoryEntries: history.length,
        repsWithBaseline: filledRows.length,
        averageProgressPercent,
        rows
      };
    } catch (error) {
      console.error('Error building exercise stats by reps:', error);
      throw error;
    }
  }
};
