import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { collection, getDocs, doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../firebase/config';

/**
 * Компонент для миграции workouts.weeks → subcollection
 * 
 * Что делает:
 * 1. Показывает информацию о текущей структуре
 * 2. Позволяет запустить миграцию одной кнопкой
 * 3. Показывает прогресс в реальном времени
 * 4. Логирует все операции
 */
const MigrateWorkouts = () => {
  const [status, setStatus] = useState('idle'); // idle, analyzing, migrating, completed, error
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0
  });

  // Добавить лог
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  // Анализ текущей структуры
  const analyzeWorkouts = async () => {
    setStatus('analyzing');
    setLogs([]);
    addLog('Начало анализа тренировок...', 'info');

    try {
      const workoutsRef = collection(db, 'workouts');
      const snapshot = await getDocs(workoutsRef);

      addLog(`Найдено тренировок: ${snapshot.size}`, 'success');

      let needMigration = 0;
      let alreadyMigrated = 0;
      let noWeeks = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.weeks && Array.isArray(data.weeks)) {
          needMigration++;
        } else if (data.totalWeeks) {
          alreadyMigrated++;
        } else {
          noWeeks++;
        }
      });

      addLog(`Требуют миграции: ${needMigration}`, needMigration > 0 ? 'warning' : 'success');
      addLog(`Уже мигрированы: ${alreadyMigrated}`, 'info');
      addLog(`Без недель: ${noWeeks}`, 'info');

      setStats({
        total: snapshot.size,
        needMigration,
        alreadyMigrated,
        noWeeks
      });

      setStatus('idle');
    } catch (error) {
      addLog(`Ошибка анализа: ${error.message}`, 'error');
      setStatus('error');
    }
  };

  // Мигрировать одну тренировку
  const migrateWorkout = async (workoutId, workoutData) => {
    addLog(`Миграция: ${workoutData.name} (${workoutId})`, 'info');

    // Проверяем есть ли weeks
    if (!workoutData.weeks || !Array.isArray(workoutData.weeks)) {
      addLog(`  ⚠️ Нет массива weeks, пропускаем`, 'warning');
      return { success: false, reason: 'no_weeks' };
    }

    const weeks = workoutData.weeks;
    addLog(`  📅 Недель: ${weeks.length}`, 'info');

    try {
      // 1. Создаем subcollection для каждой недели
      for (const week of weeks) {
        const weekNumber = week.weekNumber;
        const weekRef = doc(db, 'workouts', workoutId, 'weeks', String(weekNumber));

        const weekData = {
          weekNumber: week.weekNumber,
          days: week.days || {},
          dates: week.dates || {}
        };

        await setDoc(weekRef, weekData);
        addLog(`    ✅ Неделя ${weekNumber} сохранена`, 'success');
      }

      // 2. Обновляем основной документ
      const workoutRef = doc(db, 'workouts', workoutId);
      await updateDoc(workoutRef, {
        totalWeeks: weeks.length,
        weeks: deleteField(), // Удаляем старое поле
        migratedAt: new Date().toISOString()
      });

      addLog(`  ✅ Документ обновлен (weeks удален, totalWeeks=${weeks.length})`, 'success');

      return { success: true, weeksCount: weeks.length };
    } catch (error) {
      addLog(`  ❌ Ошибка: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  };

  // Запустить миграцию
  const startMigration = async () => {
    setStatus('migrating');
    setProgress(0);
    setLogs([]);
    addLog('🚀 Начало миграции workouts → subcollections', 'info');

    try {
      // Получаем все тренировки
      const workoutsRef = collection(db, 'workouts');
      const snapshot = await getDocs(workoutsRef);

      addLog(`Загружено тренировок: ${snapshot.size}`, 'info');

      const results = {
        total: snapshot.size,
        migrated: 0,
        skipped: 0,
        failed: 0
      };

      // Мигрируем каждую тренировку
      for (let i = 0; i < snapshot.docs.length; i++) {
        const docSnapshot = snapshot.docs[i];
        const workoutId = docSnapshot.id;
        const workoutData = docSnapshot.data();

        const result = await migrateWorkout(workoutId, workoutData);

        if (result.success) {
          results.migrated++;
        } else if (result.reason === 'no_weeks') {
          results.skipped++;
        } else {
          results.failed++;
        }

        // Обновляем прогресс
        const progressPercent = ((i + 1) / snapshot.docs.length) * 100;
        setProgress(progressPercent);
        setStats(results);
      }

      // Итоги
      addLog('', 'info');
      addLog('📊 ИТОГИ МИГРАЦИИ:', 'info');
      addLog(`  Всего: ${results.total}`, 'info');
      addLog(`  Мигрировано: ${results.migrated}`, 'success');
      addLog(`  Пропущено: ${results.skipped}`, 'warning');
      addLog(`  Ошибок: ${results.failed}`, results.failed > 0 ? 'error' : 'info');

      setStatus('completed');
    } catch (error) {
      addLog(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'error');
      setStatus('error');
    }
  };

  // Цвет для типа лога
  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'success.main';
      case 'error': return 'error.main';
      case 'warning': return 'warning.main';
      default: return 'text.primary';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Миграция Workouts → Subcollections
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Что делает эта миграция:</strong>
        </Typography>
        <Typography variant="body2" component="div">
          • Разбивает массив <code>weeks</code> на отдельные документы в subcollection<br />
          • Каждая неделя становится отдельным документом: <code>workouts/{'{id}'}/weeks/{'{weekNumber}'}</code><br />
          • Добавляет поле <code>totalWeeks</code> в основной документ<br />
          • Удаляет старое поле <code>weeks</code> из основного документа
        </Typography>
      </Alert>

      {/* Статистика */}
      {stats.total > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Статистика
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`Всего: ${stats.total}`} color="default" />
              {stats.needMigration > 0 && (
                <Chip label={`Требуют миграции: ${stats.needMigration}`} color="warning" />
              )}
              {stats.alreadyMigrated > 0 && (
                <Chip label={`Уже мигрированы: ${stats.alreadyMigrated}`} color="success" />
              )}
              {stats.migrated > 0 && (
                <Chip label={`Мигрировано: ${stats.migrated}`} color="success" />
              )}
              {stats.skipped > 0 && (
                <Chip label={`Пропущено: ${stats.skipped}`} color="default" />
              )}
              {stats.failed > 0 && (
                <Chip label={`Ошибок: ${stats.failed}`} color="error" />
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Кнопки управления */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={analyzeWorkouts}
          disabled={status === 'analyzing' || status === 'migrating'}
          startIcon={<InfoIcon />}
        >
          Анализировать
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={startMigration}
          disabled={status === 'analyzing' || status === 'migrating' || stats.needMigration === 0}
          startIcon={<PlayIcon />}
        >
          Запустить миграцию
        </Button>
      </Box>

      {/* Прогресс */}
      {status === 'migrating' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Прогресс: {Math.round(progress)}%
          </Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}

      {/* Статус */}
      {status === 'completed' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          ✅ Миграция завершена успешно!
        </Alert>
      )}

      {status === 'error' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          ❌ Произошла ошибка при миграции. Проверьте логи ниже.
        </Alert>
      )}

      {/* Логи */}
      {logs.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Логи миграции
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
              {logs.map((log, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{
                          fontFamily: 'monospace',
                          color: getLogColor(log.type)
                        }}
                      >
                        [{log.timestamp}] {log.message}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MigrateWorkouts;
