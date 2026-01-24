import { BaseService } from './baseService';
import { where } from 'firebase/firestore';

class TrainingsService extends BaseService {
  constructor() {
    super('trainings');
  }

  // Получить тренировки клиента
  async getByClientId(clientId) {
    try {
      return await this.query([where('clientId', '==', clientId)]);
    } catch (error) {
      console.error('Error getting trainings:', error);
      throw error;
    }
  }

  // Переопределяем create для специфичной логики
  async create(trainingData) {
    try {
      const id = await super.create({
        name: trainingData.name,
        description: trainingData.description,
        clientId: trainingData.clientId
      });
      return { 
        id, 
        ...trainingData 
      };
    } catch (error) {
      console.error('Error creating training:', error);
      throw error;
    }
  }
}

export const trainingsService = new TrainingsService();
