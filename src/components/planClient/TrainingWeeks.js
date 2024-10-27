import ExerciseContent from '../traning/ExerciseContent';
import BasicTabs from '../tabs/BasicTabs';
import React, { useEffect, useState } from 'react';
import { BASIC_URL } from '../../constants';
import { useParams } from 'react-router-dom';
import axios from 'axios';



const TrainingWeeks = (props) => {
  const params = useParams();
  const [tabs, setTabs] = useState([]);

  useEffect(() => {
    axios
      .get(`${BASIC_URL}/training-weeks/${params.trainingId}`)
      .then((resp) => {
        setTabs(resp.data);
      });
  }, [params]);

  const addWeek = () => {
    axios
      .post(`${BASIC_URL}/training-weeks`, {
        name: tabs.length + 1,
        clientId: params.trainingId,
      })
      .then((resp) => {
        setTabs([...tabs, resp.data]);
      });
  };

  return (
    <BasicTabs tabs={tabs} onAddClick={addWeek}>
      <ExerciseContent />
    </BasicTabs>
  );
};

export default TrainingWeeks;
