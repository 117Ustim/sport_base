import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
// import "./editClientBase.scss";
import EditClientBaseOut from './EditClientBaseOut';
import { EMPTY_EXERCISES } from '../../../constants';
import { Typography } from '@mui/material';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Box from '@mui/material/Box';

export default function EditClientBase() {
  const params = useParams();

  const navigate = useNavigate();

  const onButtonBackClient = () => {
    navigate(-1);
  };


  const [categories, setCategories] = useState([]);

  const [exercise, setExercise] = useState({});

  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:9000/categories').then((response) => {
      // console.log(response);
      setCategories(response.data);
    });

    axios.get('http://localhost:9000/exercises').then((response) => {
      setExercises(response.data);
    });
   
}, []);


  const buttonAddExercises = () => {
   
  
      axios
    .post(`http://localhost:9000/exercises`, {
      ...exercise,
      clientId: params.id,
    })
    .then((response) => {
      axios.get('http://localhost:9000/exercises').then((response) => {
      setExercises(response.data);
      setExercise({}); 
    });
    });
 
  };
  
  const onChange = (event) => {
    const { name, value } = event.target;

    setExercise({ ...exercise, [name]: value });
  };

  const deleteExercise = (id) => {
    axios.delete(`http://localhost:9000/exercises/${id}`).then(() => {
      setExercises(exercises.filter((exercise) => exercise.id !== id));
    });
  };
  return (
    <>
    {/* <div className='editClientBase '> */}
       
       <div className='editClientBase_buttonBack'>
         <button
           className='red'
           type='button'
           onClick={() => onButtonBackClient()}>
           <i className='icon ion-md-lock'></i>Назад
         </button>
       </div>
     {/* </div> */}

     
    <div className='_container'>
      

      <div className='block-category'>
        <div className='editClientBase_category'>
          <select
            name='categoryId'
            value={exercise?.categoryId || ''}
            onChange={onChange}>
            <option className='select'>Категорiя</option>
            {categories.map((c) => {
              return (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              );
            })}
          </select>
        </div>

        <div className='editClientBase_exercise'>
          <input
            name='name'
            placeholder='Вправа'
            value={exercise?.name || ''}
            onChange={onChange}
          />
        </div>

        <div className='editClientBase_sex'>
          <select name='sex' onChange={onChange} value={exercise?.sex || ''}>
            <option value={''} defaultValue={''}>
              Стать
            </option>
            <option value={'Чоловiча'}>Чоловiча</option>
            <option value={'Жiноча'}>Жiноча</option>
          </select>
        </div>

        <div className='editClientBase_button'>
          <button
            className='red'
            type='button'
            onClick={() => buttonAddExercises(exercises)}>
            <i className='icon ion-md-lock'></i>Додати
          </button>
        </div>
      </div>

      
      <div className='block_output-category-exercises'>
        <div className='column_category'>
          {categories?.map((category) => {
            return (
              <div className='text_category' key={category.id}>
                <h4>Категория {category.name} </h4>
<div className="block-text-exercises">
                {exercises

                  .filter((exercise) => exercise.categoryId === category.id)
                  .map((exercise) => (
                    <EditClientBaseOut
                      exercise={exercise}
                      deleteExercise={deleteExercise}
                      key={exercise.id}
                    />
                  ))}
</div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}
