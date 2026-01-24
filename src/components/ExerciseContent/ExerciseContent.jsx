import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/ControlPoint";
import { categoriesService, exercisesService } from "../../firebase/services";
import Drawer from '../Drawer';
import ListExercises from '../ListExercises';
import Exercise from '../Exercise';
import styles from './ExerciseContent.module.scss';

const ExerciseContent = () => {
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openDrawer, setOpenDrawer] = useState({ right: false });
  const [addExercisesDay, setAddExercisesDay] = useState([]);
  const [day, setDay] = useState('');

  useEffect(() => {
    categoriesService.getAll().then((data) => {
      setCategories(data);
    });

    exercisesService.getAll().then((data) => {
      setExercises(data);
    });
  }, []);

  const toggleDrawer = (anchor, open) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      setOpenDrawer({ ...openDrawer, [anchor]: false });
    } else {
      setOpenDrawer({ ...openDrawer, [anchor]: open });
    }
  };

  const buttonAddExercises = (day, checkedExercises) => {
    setAddExercisesDay([...addExercisesDay, { day, checkedExercises }]);
  };

  return (
    <>
      <button
        className={styles.addExercisesButton}
        onClick={(e) => toggleDrawer('right', true)(e)}
      >
        <AddIcon /> Вправа
      </button>
      <div className={styles.drawer}>
        <Drawer
          openDrawer={openDrawer}
          toggleDrawer={toggleDrawer}>
          <ListExercises
            day={day}
            setDay={setDay}
            categories={categories}
            exercises={exercises}
            buttonAddExercises={buttonAddExercises}
          />
        </Drawer>
      </div>
      {addExercisesDay?.map((w, index) => {
        return (
          <div key={`${w.day}-${index}`} className={styles.traningContainer}>
            <div className={styles.traning}>
              <div className={styles.traningDate}>
                <div className={styles.traningDay}>{w.day}</div>
              </div>
              <div>
                {w.checkedExercises.map((ex, exIndex) => {
                  return <Exercise key={`${ex.id}-${exIndex}`} name={ex.name} times={ex.times} />;
                })}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default ExerciseContent;
