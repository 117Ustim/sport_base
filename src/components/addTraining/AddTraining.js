import "./addTraining.scss";
import { useNavigate } from "react-router";
import { useBeforeUnload, useParams } from "react-router-dom";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { MobileDatePicker } from "@mui/x-date-pickers/MobileDatePicker";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import axios from "axios";
import { useState, useEffect } from "react";

export default function AddTraining() {
  const navigate = useNavigate();
  const params = useParams();

  const [value, setValue] = useState(null);

  const [day, setDay] = useState("");
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  // console.log(categories);
  const [planExercises, setPlanExercises] = useState({});
  //  console.log(planExercises,'hhh')

  // запись упражнения подходов и раз
  const [arrayPlanExercises, setArrayPlanExercises] = useState([]);
  // console.log(arrayPlanExercises, "hhh");

  const onButtonBack = () => {
    navigate(-1);
  };

  const onButtonEnterNumberTimes = () => {};

  // Получение веса из базы
  // const [exercisesArray, setExercisesArray] = useState([]);
  // console.log(exercisesArray, "base");

  useEffect(() => {
    axios
      .get(`http://localhost:9000/clients-base/${params.id}`)
      .then((response) => {console.log(response.data,'data')
        setExercises(response.data);
      });
    axios.get("http://localhost:9000/categories").then((response) => {
      // console.log(response);
      setCategories(response.data);
    });

   
  }, []);

  const handleChange = (newValue) => {
    setDay(dayjs(newValue).locale("ru").format("DD.MM.YYYY"));
    setValue(newValue);
  };

  const moveNameExercise = (e) => {
    const temp = { ...planExercises, planExercises: e.name, id: e.exercise_id + 1 };
    setPlanExercises(temp);
    setArrayPlanExercises([...arrayPlanExercises, temp]);
  };

  const onChange = (event) => {
    
    // console.log(event.target)
    // console.log(planExercises)
    // добавить подходы и разы в planExercises
    // обновить planExercises в arrayPlanExercises
    // console.log(arrayPlanExercises)
  };

  return (
    <>
      <div className='addTraining'>
        <div className='buttonBack'>
          <Button
            variant='contained'
            size='small'
            onClick={onButtonBack}
          >
            Назад
          </Button>
        </div>

        <div className='number'>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <FormControl sx={{ m: 1, minWidth: 150 }}>
              <Stack spacing={3}>
                <MobileDatePicker
                  label='Дата'
                  inputFormat='DD/MM/YYYY'
                  value={value}
                   onChange={handleChange}
                  renderInput={(params) => <TextField {...params}
                   />}
                />
              </Stack>
            </FormControl>
          </LocalizationProvider>
        </div>
        {/* ---------------------------------------------------------LIST_PLAN-------------- */}
        <div className='list_plan'>
          <h2>{day}</h2>
          <div>
            <ul>
              {arrayPlanExercises.map((exercise, index) => (
                <li key={exercise.id}>
                  <h5>
                    {index + 1}.{exercise.planExercises} {exercise.numberSteps}{" "}
                    x {exercise.numberTimes} ( {exercise.weight})
                  </h5>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ------------------------------------------INPUT---------------------------------------------- */}

        <div className='input_boxes'>
          <FormControl sx={{ m: 1, minWidth: 110 }}>
            <InputLabel id='demo-simple-select-autowidth-label'>
              Подходы
            </InputLabel>
            <Select
              defaultValue=''
              labelId='demo-simple-select-autowidth-label'
              id='demo-simple-select-autowidth'
              value={planExercises.numberSteps}
              onChange={onChange}
              name='numberSteps'
              autoWidth
              label='Подходы'
              size='small'
            >
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={4}>4</MenuItem>
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={6}>6</MenuItem>
              <MenuItem value={7}>7</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ m: 1, minWidth: 110 }}>
            <InputLabel id='demo-simple-select-autowidth-label'>
              Разы
            </InputLabel>
            <Select
              defaultValue=''
              labelId='demo-simple-select-autowidth-label'
              id='demo-simple-select-autowidth'
              value={planExercises.numberTimes}
              onChange={onChange}
              name='numberTimes'
              autoWidth
              label='Разы'
              size='small'
            >
              {Array.from(Array(15).keys()).map((idx) => (
                <MenuItem
                  key={idx}
                  value={idx + 1}
                >
                  {idx + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <div className='button_enter_numberTimes'>
            <Button
              variant='contained'
              size='small'
              onClick={onButtonEnterNumberTimes}
            >
              Ввод
            </Button>
          </div>
        </div>

        {/* ---------------------------------------------------------EXERCISES---------------------------------- */}
        <div className='categories_exercises'>
          {categories?.map((category) => {
            return (
              <div
                className='column_exercises'
                key={category.id}
              >
                <h4>Категория {category.name} </h4>

                <div className='name_exercise'>
                  {exercises

                    .filter((exercise) => exercise.category_id === category.id)
                    .map((exercise) => (
                      <h5
                        key={exercise.exercise_id}
                        onClick={() => moveNameExercise(exercise)}
                      >
                        {exercise.name}
                      </h5>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
