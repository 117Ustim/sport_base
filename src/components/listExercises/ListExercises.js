import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { useEffect, useState } from 'react';
import Date from './../tabs/date/Date';

export default function ListExercises({
  exercises,
  // setExercises,
  categories,
  arrayPlanExercises,
  setArrayPlanExercises,
  buttonAddExercises,
  moveNameExercise,
  day,
  setDay,
}) {
  const [showEx, setShowEx] = useState(true);
const [checkedExercises,setCheckedExercises] = useState([]);
 

useEffect(() => {
    const shows = day !== '';
    if (shows) {
      setShowEx(!showEx);
     
    }
  }, [day]);

useEffect(()=>{
 console.log(exercises,'55555')
  setCheckedExercises(exercises);
},[]);

  const handleChange = (id) => {
    const index = checkedExercises.findIndex(e=>e.id === id);
    const checkbox = {...checkedExercises[index]};
const temp = [...checkedExercises]
    checkbox.checked = !checkbox.checked;
    temp.splice(index, 1, checkbox);
    setCheckedExercises([...temp]);
    
  };

  return (
    <div className='list-exercises'>
      <List>
        <div className='listExercises_buttonAdd'>
          <button onClick={()=> buttonAddExercises(day,checkedExercises.filter(e=> e.checked))}>Додати</button>
        </div>
        <Date setDay={setDay} />

        {categories.map((category) => {
          return (
            <ListItem
              className='blockPosition'
              key={category.id}
              disablePadding>
              <div className='data-list'>
                <ListItemText primary={category.name} />

                {checkedExercises

                  .filter((exercise) => exercise.categoryId === category.id)
                  .map((exercise, index) => (
                    <div
                      className='exercises'
                      key={exercise.id}
                     
                      // onChange={() => moveNameExercise(exercise)}
                      >
                      <FormControlLabel
                        label={exercise.name}
                        control={
                          <Checkbox
                            disabled={showEx}
                            // checked={exercise.checked}
                            // value={exercise.checked}
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
