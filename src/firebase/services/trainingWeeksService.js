import { BaseService } from './baseService';
import { where } from 'firebase/firestore';

class TrainingWeeksService extends BaseService {
  constructor() {
    super('trainingWeeks');
  }

  // Получить недели тренировки
  async getByTrainingId(trainingId) {
    try {
      return await this.query([where('trainingId', '==', trainingId)]);
    } catch (error) {
      console.error('Error getting training weeks:', error);
      throw error;
    }
  }

  // Переопределяем create для специфичной логики
  async create(weekData) {
    try {
      const id = await super.create({
        name: weekData.name,
        trainingId: weekData.clientId // в оригинале clientId это trainingId
      });
      return { 
        id, 
        ...weekData 
      };
    } catch (error) {
      console.error('Error creating training week:', error);
      throw error;
    }
  }
}

export const trainingWeeksService = new TrainingWeeksService();
