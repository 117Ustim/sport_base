import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { db } from '../config';

/**
 * Сервис для работы со статистикой
 * 
 * Структура:
 * statistics/
 *   {gymId}/
 *     daily/
 *       {date}/
 *         date: "2026-01-27"
 *         gymId: "gym1"
 *         gymName: "Колизей"
 *         trainedTotal: 10
 *         trainedTotalCost: 2500
 *         trainedPersonal: 5
 *         trainedOther: 5
 *         clients: [...]
 *         calculatedAt: timestamp
 */

export const statisticsService = {
  /**
   * Получить статистику за конкретный день для зала
   * @param {string} gymId - ID зала
   * @param {string} date - Дата в формате YYYY-MM-DD
   */
  async getDailyStats(gymId, date) {
    try {
      const statsRef = doc(db, 'statistics', gymId, 'daily', date);
      const snapshot = await getDoc(statsRef);
      
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting daily stats:', error);
      throw error;
    }
  },

  /**
   * Получить статистику за период для зала
   * @param {string} gymId - ID зала
   * @param {string} startDate - Начальная дата YYYY-MM-DD
   * @param {string} endDate - Конечная дата YYYY-MM-DD
   */
  async getStatsForPeriod(gymId, startDate, endDate) {
    try {
      const dailyRef = collection(db, 'statistics', gymId, 'daily');
      const q = query(
        dailyRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      
      const snapshot = await getDocs(q);
      
      const stats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return stats;
    } catch (error) {
      console.error('Error getting stats for period:', error);
      throw error;
    }
  },

  /**
   * Получить последние N дней статистики для зала
   * @param {string} gymId - ID зала
   * @param {number} days - Количество дней (по умолчанию 30)
   */
  async getRecentStats(gymId, days = 30) {
    try {
      const dailyRef = collection(db, 'statistics', gymId, 'daily');
      const q = query(
        dailyRef,
        orderBy('date', 'desc'),
        limit(days)
      );
      
      const snapshot = await getDocs(q);
      
      const stats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Возвращаем в хронологическом порядке (от старых к новым)
      return stats.reverse();
    } catch (error) {
      console.error('Error getting recent stats:', error);
      throw error;
    }
  },

  /**
   * Получить статистику за текущий месяц для зала
   * @param {string} gymId - ID зала
   */
  async getCurrentMonthStats(gymId) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      
      return await this.getStatsForPeriod(gymId, startDate, endDate);
    } catch (error) {
      console.error('Error getting current month stats:', error);
      throw error;
    }
  },

  /**
   * Получить агрегированную статистику за период
   * @param {string} gymId - ID зала
   * @param {string} startDate - Начальная дата YYYY-MM-DD
   * @param {string} endDate - Конечная дата YYYY-MM-DD
   */
  async getAggregatedStats(gymId, startDate, endDate) {
    try {
      const stats = await this.getStatsForPeriod(gymId, startDate, endDate);
      
      if (stats.length === 0) {
        return {
          totalDays: 0,
          totalClients: 0,
          totalRevenue: 0,
          totalPersonal: 0,
          totalOther: 0,
          averageClientsPerDay: 0,
          averageRevenuePerDay: 0
        };
      }
      
      const aggregated = stats.reduce((acc, day) => {
        acc.totalClients += day.trainedTotal || 0;
        acc.totalRevenue += day.trainedTotalCost || 0;
        acc.totalPersonal += day.trainedPersonal || 0;
        acc.totalOther += day.trainedOther || 0;
        return acc;
      }, {
        totalDays: stats.length,
        totalClients: 0,
        totalRevenue: 0,
        totalPersonal: 0,
        totalOther: 0
      });
      
      aggregated.averageClientsPerDay = Math.round(aggregated.totalClients / aggregated.totalDays);
      aggregated.averageRevenuePerDay = Math.round(aggregated.totalRevenue / aggregated.totalDays);
      
      return aggregated;
    } catch (error) {
      console.error('Error getting aggregated stats:', error);
      throw error;
    }
  },

  /**
   * Получить статистику по всем залам за день
   * @param {string} date - Дата в формате YYYY-MM-DD
   */
  async getAllGymsStatsForDay(date) {
    try {
      // Получаем все залы
      const gymsRef = collection(db, 'gyms');
      const gymsSnapshot = await getDocs(gymsRef);
      
      const allStats = [];
      
      // Для каждого зала получаем статистику
      for (const gymDoc of gymsSnapshot.docs) {
        const gymId = gymDoc.id;
        const stats = await this.getDailyStats(gymId, date);
        
        if (stats) {
          allStats.push(stats);
        } else {
          // Если статистики нет, добавляем пустую запись
          allStats.push({
            gymId,
            gymName: gymDoc.data().name,
            date,
            trainedTotal: 0,
            trainedTotalCost: 0,
            trainedPersonal: 0,
            trainedOther: 0,
            clients: []
          });
        }
      }
      
      return allStats;
    } catch (error) {
      console.error('Error getting all gyms stats:', error);
      throw error;
    }
  },

  /**
   * Получить топ клиентов по посещаемости за период
   * @param {string} gymId - ID зала
   * @param {string} startDate - Начальная дата YYYY-MM-DD
   * @param {string} endDate - Конечная дата YYYY-MM-DD
   * @param {number} topN - Количество топ клиентов (по умолчанию 10)
   */
  async getTopClients(gymId, startDate, endDate, topN = 10) {
    try {
      const stats = await this.getStatsForPeriod(gymId, startDate, endDate);
      
      // Собираем всех клиентов
      const clientsMap = new Map();
      
      stats.forEach(day => {
        if (day.clients && Array.isArray(day.clients)) {
          day.clients.forEach(client => {
            const existing = clientsMap.get(client.clientId) || {
              clientId: client.clientId,
              name: client.name,
              visits: 0,
              totalCost: 0
            };
            
            existing.visits += 1;
            existing.totalCost += client.cost || 0;
            
            clientsMap.set(client.clientId, existing);
          });
        }
      });
      
      // Сортируем по количеству посещений
      const topClients = Array.from(clientsMap.values())
        .sort((a, b) => b.visits - a.visits)
        .slice(0, topN);
      
      return topClients;
    } catch (error) {
      console.error('Error getting top clients:', error);
      throw error;
    }
  }
};
