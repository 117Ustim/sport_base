// Тесты для констант
import { EMPTY_CLIENT, EMPTY_EXERCISES, NUMBER_TIMES, BASIC_URL } from '../../constants';

describe('Constants', () => {
  describe('EMPTY_CLIENT', () => {
    it('should have all required fields', () => {
      expect(EMPTY_CLIENT).toHaveProperty('name');
      expect(EMPTY_CLIENT).toHaveProperty('surname');
      expect(EMPTY_CLIENT).toHaveProperty('phone');
      expect(EMPTY_CLIENT).toHaveProperty('sex');
      expect(EMPTY_CLIENT).toHaveProperty('gym');
      expect(EMPTY_CLIENT).toHaveProperty('gymId');
      expect(EMPTY_CLIENT).toHaveProperty('price');
      expect(EMPTY_CLIENT).toHaveProperty('capacity');
      expect(EMPTY_CLIENT).toHaveProperty('attented');
    });

    it('should have default price of 250', () => {
      expect(EMPTY_CLIENT.price).toBe(250);
    });

    it('should have capacity and attented as 0', () => {
      expect(EMPTY_CLIENT.capacity).toBe(0);
      expect(EMPTY_CLIENT.attented).toBe(0);
    });
  });

  describe('EMPTY_EXERCISES', () => {
    it('should have all required fields', () => {
      expect(EMPTY_EXERCISES).toHaveProperty('id');
      expect(EMPTY_EXERCISES).toHaveProperty('name');
      expect(EMPTY_EXERCISES).toHaveProperty('clientId');
      expect(EMPTY_EXERCISES).toHaveProperty('categoryId');
      expect(EMPTY_EXERCISES).toHaveProperty('sex');
    });
  });

  describe('NUMBER_TIMES', () => {
    it('should be 15', () => {
      expect(NUMBER_TIMES).toBe(15);
    });
  });

  describe('BASIC_URL', () => {
    it('should be defined', () => {
      expect(BASIC_URL).toBeDefined();
      expect(typeof BASIC_URL).toBe('string');
    });
  });
});
