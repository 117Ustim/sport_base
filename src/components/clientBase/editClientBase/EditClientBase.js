import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesService, exercisesService } from '../../../firebase/services';
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

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    categoriesService.getAll().then((data) => {
      setCategories(data);
    });

    exercisesService.getAll().then((data) => {
      setExercises(data);
    });
   
}, []);


  const buttonAddExercises = () => {
    // Валідація: перевіряємо, чи заповнені обов'язкові поля
    if (!exercise.categoryId || !exercise.name) {
      alert('Будь ласка, заповніть всі поля: Категорія та Вправа');
      return;
    }

    const exerciseData = {
      categoryId: exercise.categoryId,
      name: exercise.name
    };

    // Если есть clientId - добавляем его
    if (params.id) {
      exerciseData.clientId = params.id;
    }

    exercisesService.create(exerciseData).then(() => {
      exercisesService.getAll().then((data) => {
        setExercises(data);
        setExercise({}); 
      });
    }).catch((error) => {
      console.error('Помилка додавання вправи:', error);
      alert('Помилка додавання вправи. Спробуйте ще раз.');
    });
  };
  
  const onChange = (event) => {
    const { name, value } = event.target;

    // Для поля "name" (Вправа) робимо першу букву великою, решту маленькими
    if (name === 'name' && value) {
      const formattedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      setExercise({ ...exercise, [name]: formattedValue });
    } else {
      setExercise({ ...exercise, [name]: value });
    }
  };

  const deleteExercise = (id) => {
    exercisesService.delete(id).then(() => {
      setExercises(exercises.filter((exercise) => exercise.id !== id));
    });
  };

  // Простіший Drag and Drop через mouse events
  const handleMouseDown = (index, categoryId) => {
    setDraggedIndex(index);
    setCurrentCategory(categoryId);
    setIsDragging(true);
    console.log('Mouse down:', index, categoryId);
  };

  const handleMouseEnter = (index, categoryId) => {
    if (isDragging && currentCategory === categoryId && draggedIndex !== null && draggedIndex !== index) {
      console.log('Mouse enter:', index);
      
      // Отримуємо вправи тільки для поточної категорії
      const categoryExercises = exercises.filter(ex => ex.categoryId === categoryId);
      const otherExercises = exercises.filter(ex => ex.categoryId !== categoryId);
      
      // Переміщуємо вправу
      const draggedExercise = categoryExercises[draggedIndex];
      const newCategoryExercises = [...categoryExercises];
      newCategoryExercises.splice(draggedIndex, 1);
      newCategoryExercises.splice(index, 0, draggedExercise);
      
      console.log('Reordering:', newCategoryExercises.map(e => e.name));
      
      // Об'єднуємо з іншими категоріями
      setExercises([...otherExercises, ...newCategoryExercises]);
      
      // Оновлюємо індекс перетягуваного елемента
      setDraggedIndex(index);
    }
  };

  const handleMouseUp = () => {
    console.log('Mouse up');
    setDraggedIndex(null);
    setDraggedOverIndex(null);
    setCurrentCategory(null);
    setIsDragging(false);
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
                  .map((exercise, index) => (
                    <div
                      key={exercise.id}
                      onMouseDown={() => handleMouseDown(index, category.id)}
                      onMouseEnter={() => handleMouseEnter(index, category.id)}
                      onMouseUp={handleMouseUp}
                      className={`draggable-exercise`}
                      style={{
                        opacity: draggedIndex === index && currentCategory === category.id ? 0.5 : 1,
                        cursor: 'move',
                        transition: 'opacity 0.2s',
                        userSelect: 'none',
                        backgroundColor: draggedIndex === index && currentCategory === category.id ? '#e3f2fd' : 'transparent'
                      }}
                    >
                      <EditClientBaseOut
                        exercise={exercise}
                        deleteExercise={deleteExercise}
                      />
                    </div>
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
