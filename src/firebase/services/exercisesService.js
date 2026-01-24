import { BaseService } from './baseService';
import { where } from 'firebase/firestore';

class ExercisesService extends BaseService {
  constructor() {
    super('exercises');
  }

  // Получить упражнения по полу
  async getBySex(sex) {
    try {
      return await this.query([where('sex', '==', sex)]);
    } catch (error) {
      console.error('Error getting exercises by sex:', error);
      throw error;
    }
  }

  // Переопределяем create для специфичной логики
  async create(exerciseData) {
    try {
      const dataToSave = {
        name: exerciseData.name,
        categoryId: exerciseData.categoryId
      };

      // Добавляем clientId только если он есть
      if (exerciseData.clientId) {
        dataToSave.clientId = exerciseData.clientId;
      }

      // Добавляем order если он есть
      if (exerciseData.order !== undefined) {
        dataToSave.order = exerciseData.order;
      }

      const id = await super.create(dataToSave);
      return { id, ...exerciseData };
    } catch (error) {
      console.error('Error creating exercise:', error);
      throw error;
    }
  }

  // Обновить порядок упражнений
  async updateOrder(exercises) {
    try {
      // Обновляем порядок для каждого упражнения
      const updatePromises = exercises.map((exercise, index) => {
        return super.update(exercise.id, { order: index });
      });
      
      await Promise.all(updatePromises);
      console.log('Exercise order updated successfully');
    } catch (error) {
      console.error('Error updating exercise order:', error);
      throw error;
    }
  }

  // Получить все упражнения с сортировкой по порядку
  async getAll() {
    try {
      const exercises = await super.getAll();
      // Сортируем по полю order, если оно есть
      return exercises.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999999;
        const orderB = b.order !== undefined ? b.order : 999999;
        return orderA - orderB;
      });
    } catch (error) {
      console.error('Error getting exercises:', error);
      throw error;
    }
  }
}

export const exercisesService = new ExercisesService();
