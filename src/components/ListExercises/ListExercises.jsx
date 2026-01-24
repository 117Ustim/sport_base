import { useEffect, useState } from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Date from '../DatePicker';
import styles from './ListExercises.module.scss';

export default function ListExercises({
  exercises,
  categories,
  buttonAddExercises,
  day,
  setDay,
}) {
  const [showEx, setShowEx] = useState(true);
  const [checkedExercises, setCheckedExercises] = useState([]);

  useEffect(() => {
    const shows = day !== '';
    if (shows) {
      setShowEx(!showEx);
    }
  }, [day]);

  useEffect(() => {
    setCheckedExercises(exercises);
  }, [exercises]);

  const handleChange = (id) => {
    const index = checkedExercises.findIndex(e => e.id === id);
    const checkbox = { ...checkedExercises[index] };
    const temp = [...checkedExercises];
    checkbox.checked = !checkbox.checked;
    temp.splice(index, 1, checkbox);
    setCheckedExercises([...temp]);
  };

  return (
    <div className={styles.listExercises}>
      <List>
        <div className={styles.buttonAdd}>
          <button onClick={() => buttonAddExercises(day, checkedExercises.filter(e => e.checked))}>
            Додати
          </button>
        </div>
        <Date setDay={setDay} />

        {categories.map((category) => {
          return (
            <ListItem
              className={styles.blockPosition}
              key={category.id}
              disablePadding>
              <div className={styles.dataList}>
                <ListItemText primary={category.name} />

                {checkedExercises
                  .filter((exercise) => exercise.categoryId === category.id)
                  .map((exercise) => (
                    <div key={exercise.id}>
                      <FormControlLabel
                        label={exercise.name}
                        control={
                          <Checkbox
                            disabled={showEx}
                            onChange={() => {
                              handleChange(exercise.id);
                            }}
                          />
                        }
                      />
                    </div>
                  ))}
              </div>
            </ListItem>
          );
        })}
      </List>
    </div>
  );
}
