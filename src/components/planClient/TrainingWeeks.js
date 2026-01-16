import ExerciseContent from '../traning/ExerciseContent';
import BasicTabs from '../tabs/BasicTabs';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { trainingWeeksService } from '../../firebase/services';

const TrainingWeeks = (props) => {
  const params = useParams();
  const [tabs, setTabs] = useState([]);

  useEffect(() => {
    trainingWeeksService.getByTrainingId(params.trainingId)
      .then((data) => {
        setTabs(data);
      });
  }, [params]);

  const addWeek = () => {
    trainingWeeksService.create({
      name: tabs.length + 1,
      clientId: params.trainingId,
    }).then((data) => {
      setTabs([...tabs, data]);
    });
  };

  return (
    <BasicTabs tabs={tabs} onAddClick={addWeek}>
      <ExerciseContent />
    </BasicTabs>
  );
};

export default TrainingWeeks;
