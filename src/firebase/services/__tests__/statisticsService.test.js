// Тесты для statisticsService
import { statisticsService } from '../statisticsService';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  where: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../config', () => ({
  db: {},
}));

describe('statisticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDailyStats', () => {
    it('should get daily stats for gym', async () => {
      const mockStats = {
        id: '2024-01-01',
        exists: () => true,
        data: () => ({
          date: '2024-01-01',
          gymId: 'gym1',
          trainedTotal: 10,
          trainedTotalCost: 2500,
        }),
      };

      doc.mockReturnValue('stats-ref');
      getDoc.mockResolvedValue(mockStats);

      const result = await statisticsService.getDailyStats('gym1', '2024-01-01');

      expect(doc).toHaveBeenCalledWith({}, 'statistics', 'gym1', 'daily', '2024-01-01');
      expect(result.date).toBe('2024-01-01');
      expect(result.trainedTotal).toBe(10);
    });

    it('should return null if stats not found', async () => {
      const mockStats = {
        exists: () => false,
      };

      doc.mockReturnValue('stats-ref');
      getDoc.mockResolvedValue(mockStats);

      const result = await statisticsService.getDailyStats('gym1', '2024-01-01');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('stats-ref');
      getDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(statisticsService.getDailyStats('gym1', '2024-01-01')).rejects.toThrow('Firestore error');
    });
  });

  describe('getStatsForPeriod', () => {
    it('should get stats for period', async () => {
      const mockDocs = [
        {
          id: '2024-01-01',
          data: () => ({
            date: '2024-01-01',
            trainedTotal: 10,
          }),
        },
        {
          id: '2024-01-02',
          data: () => ({
            date: '2024-01-02',
            trainedTotal: 15,
          }),
        },
      ];

      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockDocs });

      const result = await statisticsService.getStatsForPeriod('gym1', '2024-01-01', '2024-01-02');

      expect(where).toHaveBeenCalledWith('date', '>=', '2024-01-01');
      expect(where).toHaveBeenCalledWith('date', '<=', '2024-01-02');
      expect(orderBy).toHaveBeenCalledWith('date', 'asc');
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no stats', async () => {
      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await statisticsService.getStatsForPeriod('gym1', '2024-01-01', '2024-01-02');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(statisticsService.getStatsForPeriod('gym1', '2024-01-01', '2024-01-02')).rejects.toThrow('Firestore error');
    });
  });

  describe('getRecentStats', () => {
    it('should get recent stats in chronological order', async () => {
      const mockDocs = [
        {
          id: '2024-01-03',
          data: () => ({ date: '2024-01-03' }),
        },
        {
          id: '2024-01-02',
          data: () => ({ date: '2024-01-02' }),
        },
        {
          id: '2024-01-01',
          data: () => ({ date: '2024-01-01' }),
        },
      ];

      collection.mockReturnValue('daily-ref');
      orderBy.mockReturnValue('orderBy-constraint');
      limit.mockReturnValue('limit-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockDocs });

      const result = await statisticsService.getRecentStats('gym1', 30);

      expect(orderBy).toHaveBeenCalledWith('date', 'desc');
      expect(limit).toHaveBeenCalledWith(30);
      // Should be reversed to chronological order
      expect(result[0].date).toBe('2024-01-01');
      expect(result[2].date).toBe('2024-01-03');
    });

    it('should use default limit of 30 days', async () => {
      collection.mockReturnValue('daily-ref');
      orderBy.mockReturnValue('orderBy-constraint');
      limit.mockReturnValue('limit-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      await statisticsService.getRecentStats('gym1');

      expect(limit).toHaveBeenCalledWith(30);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('daily-ref');
      orderBy.mockReturnValue('orderBy-constraint');
      limit.mockReturnValue('limit-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(statisticsService.getRecentStats('gym1')).rejects.toThrow('Firestore error');
    });
  });

  describe('getCurrentMonthStats', () => {
    it('should get current month stats', async () => {
      const mockDocs = [
        {
          id: '2024-01-01',
          data: () => ({ date: '2024-01-01' }),
        },
      ];

      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockDocs });

      const result = await statisticsService.getCurrentMonthStats('gym1');

      expect(result).toHaveLength(1);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(statisticsService.getCurrentMonthStats('gym1')).rejects.toThrow('Firestore error');
    });
  });

  describe('getAggregatedStats', () => {
    it('should aggregate stats for period', async () => {
      const mockDocs = [
        {
          id: '2024-01-01',
          data: () => ({
            date: '2024-01-01',
            trainedTotal: 10,
            trainedTotalCost: 2500,
            trainedPersonal: 5,
            trainedOther: 5,
          }),
        },
        {
          id: '2024-01-02',
          data: () => ({
            date: '2024-01-02',
            trainedTotal: 15,
            trainedTotalCost: 3000,
            trainedPersonal: 8,
            trainedOther: 7,
          }),
        },
      ];

      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockDocs });

      const result = await statisticsService.getAggregatedStats('gym1', '2024-01-01', '2024-01-02');

      expect(result.totalDays).toBe(2);
      expect(result.totalClients).toBe(25);
      expect(result.totalRevenue).toBe(5500);
      expect(result.totalPersonal).toBe(13);
      expect(result.totalOther).toBe(12);
      expect(result.averageClientsPerDay).toBe(13);
      expect(result.averageRevenuePerDay).toBe(2750);
    });

    it('should return zero stats if no data', async () => {
      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await statisticsService.getAggregatedStats('gym1', '2024-01-01', '2024-01-02');

      expect(result.totalDays).toBe(0);
      expect(result.totalClients).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(statisticsService.getAggregatedStats('gym1', '2024-01-01', '2024-01-02')).rejects.toThrow('Firestore error');
    });
  });

  describe('getAllGymsStatsForDay', () => {
    it('should get stats for all gyms', async () => {
      const mockGyms = [
        {
          id: 'gym1',
          data: () => ({ name: 'Зал 1' }),
        },
        {
          id: 'gym2',
          data: () => ({ name: 'Зал 2' }),
        },
      ];

      const mockStats = {
        exists: () => true,
        data: () => ({
          trainedTotal: 10,
        }),
      };

      collection.mockReturnValue('gyms-ref');
      getDocs.mockResolvedValue({ docs: mockGyms });
      doc.mockReturnValue('stats-ref');
      getDoc.mockResolvedValue(mockStats);

      const result = await statisticsService.getAllGymsStatsForDay('2024-01-01');

      expect(result).toHaveLength(2);
    });

    it('should include empty stats for gyms without data', async () => {
      const mockGyms = [
        {
          id: 'gym1',
          data: () => ({ name: 'Зал 1' }),
        },
      ];

      const mockStats = {
        exists: () => false,
      };

      collection.mockReturnValue('gyms-ref');
      getDocs.mockResolvedValue({ docs: mockGyms });
      doc.mockReturnValue('stats-ref');
      getDoc.mockResolvedValue(mockStats);

      const result = await statisticsService.getAllGymsStatsForDay('2024-01-01');

      expect(result[0].trainedTotal).toBe(0);
      expect(result[0].gymName).toBe('Зал 1');
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('gyms-ref');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(statisticsService.getAllGymsStatsForDay('2024-01-01')).rejects.toThrow('Firestore error');
    });
  });

  describe('getTopClients', () => {
    it('should get top clients by visits', async () => {
      const mockDocs = [
        {
          id: '2024-01-01',
          data: () => ({
            clients: [
              { clientId: 'c1', name: 'Клієнт 1', cost: 250 },
              { clientId: 'c2', name: 'Клієнт 2', cost: 300 },
            ],
          }),
        },
        {
          id: '2024-01-02',
          data: () => ({
            clients: [
              { clientId: 'c1', name: 'Клієнт 1', cost: 250 },
            ],
          }),
        },
      ];

      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockDocs });

      const result = await statisticsService.getTopClients('gym1', '2024-01-01', '2024-01-02', 10);

      expect(result).toHaveLength(2);
      // Client 1 should be first (2 visits)
      expect(result[0].clientId).toBe('c1');
      expect(result[0].visits).toBe(2);
      expect(result[0].totalCost).toBe(500);
      // Client 2 should be second (1 visit)
      expect(result[1].clientId).toBe('c2');
      expect(result[1].visits).toBe(1);
    });

    it('should limit to topN clients', async () => {
      const mockDocs = [
        {
          id: '2024-01-01',
          data: () => ({
            clients: [
              { clientId: 'c1', name: 'Клієнт 1', cost: 250 },
              { clientId: 'c2', name: 'Клієнт 2', cost: 300 },
              { clientId: 'c3', name: 'Клієнт 3', cost: 200 },
            ],
          }),
        },
      ];

      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockDocs });

      const result = await statisticsService.getTopClients('gym1', '2024-01-01', '2024-01-02', 2);

      expect(result).toHaveLength(2);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('daily-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(statisticsService.getTopClients('gym1', '2024-01-01', '2024-01-02')).rejects.toThrow('Firestore error');
    });
  });
});
