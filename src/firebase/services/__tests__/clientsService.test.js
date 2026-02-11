// Тесты для clientsService
import { clientsService } from '../clientsService';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { validateClientData, sanitizeClientData } from '../validators';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../config', () => ({
  db: {},
}));

// Mock validators
jest.mock('../validators', () => ({
  validateClientData: jest.fn(() => ({ isValid: true, errors: [] })),
  sanitizeClientData: jest.fn((data) => data),
}));

describe('clientsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset validator mocks to default behavior
    validateClientData.mockReturnValue({ isValid: true, errors: [] });
    sanitizeClientData.mockImplementation((data) => data);
  });

  describe('getAll', () => {
    it('should get all clients without filters', async () => {
      const mockClients = [
        {
          id: '1',
          data: () => ({
            profile: {
              name: 'Іван',
              surname: 'Петренко',
              phone: '+380501234567',
              gymName: 'Зал 1',
              sex: 'Чоловік',
            },
          }),
        },
        {
          id: '2',
          data: () => ({
            profile: {
              name: 'Марія',
              surname: 'Коваленко',
              phone: '+380507654321',
              gymName: 'Зал 2',
              sex: 'Жінка',
            },
          }),
        },
      ];

      collection.mockReturnValue('clients-ref');
      orderBy.mockReturnValue('orderBy-constraint');
      limit.mockReturnValue('limit-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockClients });

      const result = await clientsService.getAll();

      expect(collection).toHaveBeenCalledWith({}, 'clients');
      expect(orderBy).toHaveBeenCalledWith('profile.surname', 'asc');
      expect(limit).toHaveBeenCalledWith(50);
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].data.name).toBe('Іван');
      expect(result.data[1].data.surname).toBe('Коваленко');
    });

    it('should filter clients by gym', async () => {
      const mockClients = [
        {
          id: '1',
          data: () => ({
            profile: {
              name: 'Іван',
              surname: 'Петренко',
              gymName: 'Зал 1',
            },
          }),
        },
      ];

      collection.mockReturnValue('clients-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      limit.mockReturnValue('limit-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockClients });

      const result = await clientsService.getAll({ gym: 'Зал 1' });

      expect(where).toHaveBeenCalledWith('profile.gymName', '==', 'Зал 1');
      expect(result.total).toBe(1);
      expect(result.data[0].data.gym).toBe('Зал 1');
    });

    it('should filter clients by sex', async () => {
      const mockClients = [
        {
          id: '2',
          data: () => ({
            profile: {
              name: 'Марія',
              surname: 'Коваленко',
              sex: 'Жінка',
            },
          }),
        },
      ];

      collection.mockReturnValue('clients-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      limit.mockReturnValue('limit-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockClients });

      const result = await clientsService.getAll({ sex: 'Жінка' });

      expect(where).toHaveBeenCalledWith('profile.sex', '==', 'Жінка');
      expect(result.total).toBe(1);
      expect(result.data[0].data.sex).toBe('Жінка');
    });

    it('should handle custom limit', async () => {
      collection.mockReturnValue('clients-ref');
      orderBy.mockReturnValue('orderBy-constraint');
      limit.mockReturnValue('limit-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      await clientsService.getAll({ limit: 10 });

      expect(limit).toHaveBeenCalledWith(10);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('clients-ref');
      orderBy.mockReturnValue('orderBy-constraint');
      limit.mockReturnValue('limit-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(clientsService.getAll()).rejects.toThrow('Firestore error');
    });
  });

  describe('getById', () => {
    it('should get client by id', async () => {
      const mockClient = {
        exists: () => true,
        data: () => ({
          profile: {
            name: 'Іван',
            surname: 'Петренко',
            phone: '+380501234567',
            gymName: 'Зал 1',
            sex: 'Чоловік',
            price: 300,
          },
        }),
      };

      doc.mockReturnValue('doc-ref');
      getDoc.mockResolvedValue(mockClient);

      const result = await clientsService.getById('123');

      expect(doc).toHaveBeenCalledWith({}, 'clients', '123');
      expect(result.id).toBe('123');
      expect(result.data.name).toBe('Іван');
      expect(result.data.surname).toBe('Петренко');
      expect(result.data.price).toBe(300);
    });

    it('should return null if client not found', async () => {
      const mockClient = {
        exists: () => false,
      };

      doc.mockReturnValue('doc-ref');
      getDoc.mockResolvedValue(mockClient);

      const result = await clientsService.getById('999');

      expect(result).toBeNull();
    });

    it('should handle missing profile data', async () => {
      const mockClient = {
        exists: () => true,
        data: () => ({}),
      };

      doc.mockReturnValue('doc-ref');
      getDoc.mockResolvedValue(mockClient);

      const result = await clientsService.getById('123');

      expect(result.data.name).toBe('');
      expect(result.data.price).toBe(250); // default price
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('doc-ref');
      getDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(clientsService.getById('123')).rejects.toThrow('Firestore error');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    });

    afterEach(() => {
      Date.now.mockRestore();
    });

    it('should create new client with valid data', async () => {
      const clientData = {
        name: 'Іван',
        surname: 'Петренко',
        phone: '+380501234567',
        email: 'ivan@example.com',
        gym: 'Зал 1',
        gymId: 'gym1',
        sex: 'Чоловік',
        address: 'Київ',
        growth: '180',
        weight: '75',
        price: 300,
        userId: 'user123',
      };

      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      const result = await clientsService.create(clientData);

      expect(validateClientData).toHaveBeenCalledWith(clientData);
      expect(sanitizeClientData).toHaveBeenCalledWith(clientData);
      expect(doc).toHaveBeenCalledWith({}, 'clients', '1234567890');
      expect(setDoc).toHaveBeenCalledWith('doc-ref', {
        profile: expect.objectContaining({
          id: '1234567890',
          name: 'Іван',
          surname: 'Петренко',
          phone: '+380501234567',
          email: 'ivan@example.com',
          gymName: 'Зал 1',
          gymId: 'gym1',
          sex: 'Чоловік',
          capacity: 0,
          attented: 0,
          isActive: true,
          special: false,
          excludeFromCount: false,
        }),
      });
      expect(result.id).toBe('1234567890');
    });

    it('should reject invalid data', async () => {
      const invalidData = {
        name: '',
        surname: '',
      };

      validateClientData.mockReturnValue({
        isValid: false,
        errors: ['Ім\'я обов\'язкове', 'Прізвище обов\'язкове'],
      });

      await expect(clientsService.create(invalidData)).rejects.toThrow(
        'Помилка валідації: Ім\'я обов\'язкове, Прізвище обов\'язкове'
      );

      expect(setDoc).not.toHaveBeenCalled();
    });

    it('should sanitize client data', async () => {
      const clientData = {
        name: '<script>alert("xss")</script>',
        surname: 'Петренко',
        phone: '+380501234567',
        gym: 'Зал 1',
        sex: 'Чоловік',
      };

      const sanitizedData = {
        name: 'alert("xss")',
        surname: 'Петренко',
        phone: '+380501234567',
        gym: 'Зал 1',
        sex: 'Чоловік',
      };

      sanitizeClientData.mockReturnValue(sanitizedData);
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      await clientsService.create(clientData);

      expect(sanitizeClientData).toHaveBeenCalledWith(clientData);
      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          profile: expect.objectContaining({
            name: 'alert("xss")',
          }),
        })
      );
    });

    it('should handle errors', async () => {
      const clientData = {
        name: 'Іван',
        surname: 'Петренко',
        phone: '+380501234567',
        gym: 'Зал 1',
        sex: 'Чоловік',
      };

      doc.mockReturnValue('doc-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(clientsService.create(clientData)).rejects.toThrow('Firestore error');
    });
  });

  describe('update', () => {
    it('should update existing client', async () => {
      const clientData = {
        name: 'Іван',
        surname: 'Петренко (оновлено)',
        phone: '+380501234567',
        email: 'ivan.new@example.com',
        gym: 'Зал 2',
        gymId: 'gym2',
        sex: 'Чоловік',
        address: 'Львів',
        growth: '182',
        weight: '78',
      };

      const existingClient = {
        exists: () => true,
        data: () => ({
          profile: {
            id: '123',
            name: 'Іван',
            surname: 'Петренко',
            capacity: 10,
            attented: 5,
          },
        }),
      };

      doc.mockReturnValue('doc-ref');
      getDoc.mockResolvedValue(existingClient);
      setDoc.mockResolvedValue();

      const result = await clientsService.update('123', clientData);

      expect(validateClientData).toHaveBeenCalledWith(clientData);
      expect(sanitizeClientData).toHaveBeenCalledWith(clientData);
      expect(doc).toHaveBeenCalledWith({}, 'clients', '123');
      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        {
          profile: expect.objectContaining({
            name: 'Іван',
            surname: 'Петренко (оновлено)',
            phone: '+380501234567',
            email: 'ivan.new@example.com',
            gymName: 'Зал 2',
            capacity: 10, // preserved
            attented: 5, // preserved
          }),
        },
        { merge: true }
      );
      expect(result.id).toBe('123');
    });

    it('should reject invalid update data', async () => {
      const invalidData = {
        name: '',
        surname: '',
      };

      validateClientData.mockReturnValue({
        isValid: false,
        errors: ['Ім\'я обов\'язкове'],
      });

      await expect(clientsService.update('123', invalidData)).rejects.toThrow(
        'Помилка валідації: Ім\'я обов\'язкове'
      );

      expect(setDoc).not.toHaveBeenCalled();
    });

    it('should handle non-existing client', async () => {
      const clientData = {
        name: 'Іван',
        surname: 'Петренко',
        phone: '+380501234567',
        gym: 'Зал 1',
        sex: 'Чоловік',
      };

      const nonExistingClient = {
        exists: () => false,
      };

      doc.mockReturnValue('doc-ref');
      getDoc.mockResolvedValue(nonExistingClient);
      setDoc.mockResolvedValue();

      await clientsService.update('999', clientData);

      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        {
          profile: expect.objectContaining({
            name: 'Іван',
            surname: 'Петренко',
          }),
        },
        { merge: true }
      );
    });

    it('should handle errors', async () => {
      const clientData = {
        name: 'Іван',
        surname: 'Петренко',
        phone: '+380501234567',
        gym: 'Зал 1',
        sex: 'Чоловік',
      };

      doc.mockReturnValue('doc-ref');
      getDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(clientsService.update('123', clientData)).rejects.toThrow('Firestore error');
    });
  });

  describe('delete', () => {
    let consoleLogSpy;

    beforeEach(() => {
      // Suppress console.log for delete tests
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      // Restore console.log
      if (consoleLogSpy) {
        consoleLogSpy.mockRestore();
      }
    });

    it('should delete client and all related data', async () => {
      const mockClient = {
        exists: () => true,
        data: () => ({
          profile: {
            userId: 'user123',
          },
        }),
      };

      const mockAttendance = {
        size: 2,
        docs: [
          { ref: 'attendance-ref-1' },
          { ref: 'attendance-ref-2' },
        ],
      };

      const mockWorkouts = {
        size: 3,
        docs: [
          { ref: 'workout-ref-1' },
          { ref: 'workout-ref-2' },
          { ref: 'workout-ref-3' },
        ],
      };

      const mockUser = {
        exists: () => true,
      };

      doc.mockReturnValue('doc-ref');
      getDoc
        .mockResolvedValueOnce(mockClient) // client
        .mockResolvedValueOnce({ exists: () => false }) // metadata
        .mockResolvedValueOnce(mockUser); // user

      collection.mockReturnValue('collection-ref');
      getDocs
        .mockResolvedValueOnce(mockAttendance) // attendance
        .mockResolvedValueOnce({ size: 0, docs: [] }) // exercises
        .mockResolvedValueOnce(mockWorkouts) // workouts
        .mockResolvedValueOnce({ size: 0, docs: [] }) // history
        .mockResolvedValueOnce({ size: 0, docs: [] }); // assigned

      query.mockReturnValue('query-result');
      where.mockReturnValue('where-constraint');
      deleteDoc.mockResolvedValue();

      const result = await clientsService.delete('123');

      expect(result).toBe(true);
      expect(deleteDoc).toHaveBeenCalledTimes(6); // 2 attendance + 1 client + 3 workouts
    });

    it('should handle client without userId', async () => {
      const mockClient = {
        exists: () => true,
        data: () => ({
          profile: {},
        }),
      };

      doc.mockReturnValue('doc-ref');
      getDoc.mockResolvedValue(mockClient);
      collection.mockReturnValue('collection-ref');
      getDocs.mockResolvedValue({ size: 0, docs: [] });
      query.mockReturnValue('query-result');
      where.mockReturnValue('where-constraint');
      deleteDoc.mockResolvedValue();

      const result = await clientsService.delete('123');

      expect(result).toBe(true);
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should handle errors during deletion', async () => {
      doc.mockReturnValue('doc-ref');
      getDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(clientsService.delete('123')).rejects.toThrow('Firestore error');
    });

    it('should continue deletion even if subcollections fail', async () => {
      const mockClient = {
        exists: () => true,
        data: () => ({
          profile: {},
        }),
      };

      doc.mockReturnValue('doc-ref');
      getDoc.mockResolvedValue(mockClient);
      collection.mockReturnValue('collection-ref');
      
      // First getDocs fails (attendance), but deletion should continue
      getDocs
        .mockRejectedValueOnce(new Error('Attendance error'))
        .mockResolvedValue({ size: 0, docs: [] });

      query.mockReturnValue('query-result');
      where.mockReturnValue('where-constraint');
      deleteDoc.mockResolvedValue();

      // Suppress console.error for this test since we expect errors
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await clientsService.delete('123');

      expect(result).toBe(true);
      expect(deleteDoc).toHaveBeenCalled(); // Main client should still be deleted
      
      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });
});
