import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { clientBaseService, categoriesService, trainingWeeksService } from "../../firebase/services";
import styles from "./AddTraining.module.scss";

export default function AddTraining() {
  const navigate = useNavigate();
  const params = useParams();

  const [trainingName, setTrainingName] = useState("");
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [numberSteps, setNumberSteps] = useState("");
  const [numberTimes, setNumberTimes] = useState("");
  const [trainingExercises, setTrainingExercises] = useState([]);

  useEffect(() => {
    clientBaseService.getByClientId(params.id)
      .then((data) => {
        setExercises(data);
      });
    categoriesService.getAll().then((data) => {
      setCategories(data);
    });
  }, [params.id]);

  const onButtonBack = () => {
    navigate(-1);
  };

  const onSelectExercise = (exercise) => {
    setSelectedExercise(exercise);
    setNumberSteps("");
    setNumberTimes("");
  };

  const onAddExerciseToTraining = () => {
    if (!selectedExercise || !numberSteps || !numberTimes) {
      alert("Заполните все поля");
      return;
    }

    const newExercise = {
      id: `${Date.now()}-${Math.random()}`,
      name: selectedExercise.name,
      exercise_id: selectedExercise.exercise_id,
      numberSteps,
      numberTimes,
    };

    setTrainingExercises([...trainingExercises, newExercise]);
    setSelectedExercise(null);
    setNumberSteps("");
    setNumberTimes("");
  };

  const onRemoveExercise = (id) => {
    setTrainingExercises(trainingExercises.filter(ex => ex.id !== id));
  };

  const onSaveTraining = () => {
    if (!trainingName.trim()) {
      alert("Введите название тренировки");
      return;
    }
    if (trainingExercises.length === 0) {
      alert("Добавьте хотя бы одно упражнение");
      return;
    }

    trainingWeeksService.create({
      name: trainingName,
      clientId: params.id,
      exercises: trainingExercises,
    });

    navigate(-1);
  };

  return (
    <div className={styles.addTraining}>
      <div className={styles.header}>
        <Button
          variant='contained'
          size='small'
          onClick={onButtonBack}
        >
          Назад
        </Button>

        <TextField
          label='Название тренировки'
          value={trainingName}
          onChange={(e) => setTrainingName(e.target.value)}
          size='small'
          sx={{ width: 300, ml: 2 }}
        />

        <Button
          variant='contained'
          color='success'
          size='small'
          onClick={onSaveTraining}
          sx={{ ml: 2 }}
        >
          Сохранить тренировку
        </Button>
      </div>

      <div className={styles.content}>
        <div className={styles.trainingExercisesList}>
          <h3>Упражнения тренировки: {trainingName || "Без названия"}</h3>
          {trainingExercises.length === 0 ? (
            <p>Добавьте упражнения из списка справа</p>
          ) : (
            <ul>
              {trainingExercises.map((exercise, index) => (
                <li key={exercise.id}>
                  <span>
                    {index + 1}. {exercise.name} - {exercise.numberSteps} x {exercise.numberTimes}
                  </span>
                  <Button
                    size='small'
                    color='error'
                    onClick={() => onRemoveExercise(exercise.id)}
                  >
                    Удалить
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.exerciseSelector}>
          {selectedExercise && (
            <div className={styles.selectedExercisePanel}>
              <h4>Выбрано: {selectedExercise.name}</h4>
              
              <div className={styles.inputBoxes}>
                <FormControl sx={{ m: 1, minWidth: 110 }}>
                  <InputLabel>Подходы</InputLabel>
                  <Select
                    value={numberSteps}
                    onChange={(e) => setNumberSteps(e.target.value)}
                    label='Подходы'
                    size='small'
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(num => (
                      <MenuItem key={num} value={num}>{num}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ m: 1, minWidth: 110 }}>
                  <InputLabel>Разы</InputLabel>
                  <Select
                    value={numberTimes}
                    onChange={(e) => setNumberTimes(e.target.value)}
                    label='Разы'
                    size='small'
                  >
                    {Array.from(Array(20).keys()).map((idx) => (
                      <MenuItem key={idx} value={idx + 1}>
                        {idx + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant='contained'
                  size='small'
                  onClick={onAddExerciseToTraining}
                  sx={{ m: 1 }}
                >
                  Добавить
                </Button>
              </div>
            </div>
          )}

          <div className={styles.categoriesExercises}>
            {categories?.map((category) => (
              <div className={styles.columnExercises} key={category.id}>
                <h4>{category.name}</h4>
                <div className={styles.nameExercise}>
                  {exercises
                    .filter((exercise) => exercise.category_id === category.id)
                    .map((exercise) => (
                      <h5
                        key={exercise.exercise_id}
                        onClick={() => onSelectExercise(exercise)}
                        className={selectedExercise?.exercise_id === exercise.exercise_id ? styles.selected : ''}
                      >
                        {exercise.name}
                      </h5>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
