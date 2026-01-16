import { clientBaseService, categoriesService } from "../../firebase/services";
import "./clientBase.scss";
import BaseExercisesOut from "./BaseExercisesOut";
import {NUMBER_TIMES} from '../../constants';

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';



export default function ClientBase() {
  const params = useParams();
  const navigate = useNavigate();

 
 const[exercisesArray,setExercisesArray]= useState([]);
 const[categories, setCategories] = useState([]);

 const sensors = useSensors(
   useSensor(PointerSensor, {
     activationConstraint: {
       distance: 3, // Зменшуємо до 3px для швидшої реакції
     },
   }),
   useSensor(KeyboardSensor, {
     coordinateGetter: sortableKeyboardCoordinates,
   })
 );

useEffect(()=> {
    // Завантажуємо категорії
    categoriesService.getAll().then((data) => {
      setCategories(data);
    });

    // Завантажуємо вправи клієнта
    clientBaseService.getByClientId(params.id).then((data)=> {
         setExercisesArray(data);
         console.log(data);
    });
    },[]);

  const backPlanClient = () => {
    navigate(-1);
  };
  const editExerciseClient = () => {
    navigate(`/edit_base/${params.id}`);
  };

  const createBase = () => {
    clientBaseService.createBase(params.id).then(() => {
      console.log('Base created');
      // Перезавантажуємо вправи та категорії після створення бази
      categoriesService.getAll().then((data) => {
        setCategories(data);
      });
      clientBaseService.getByClientId(params.id).then((data) => {
        setExercisesArray(data);
        console.log('Exercises loaded:', data);
      });
    }).catch((error) => {
      console.error('Error creating base:', error);
      alert('Помилка створення бази');
    });
  };
const saveBase = () => {
  clientBaseService.updateBase(params.id, exercisesArray).then(() => {
    console.log('Base saved');
  });
};

   const onChangeBase = (value,exerciseId, key) => {
      const oldValue = [...exercisesArray];
      const oldExerciseIndex = oldValue.findIndex((e)=>e.exercise_id === exerciseId);

  
      const temp = oldValue[oldExerciseIndex]
     
       const newValue = {...temp,data:{...temp.data,[key]:value} };
      
      oldValue.splice(oldExerciseIndex, 1, newValue);
      setExercisesArray(oldValue);
   };

  // Drag and Drop для категорій через @dnd-kit
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // Міняємо місцями тільки два елементи
        const newItems = [...items];
        const temp = newItems[oldIndex];
        newItems[oldIndex] = newItems[newIndex];
        newItems[newIndex] = temp;

        return newItems;
      });
    }
  };
  
  
     

       
  
 
    
 
  return (
    <>
      <div className="button_back_edit">
        <div className="button_backPlanClient">
          <Button
            className="back_button"
            variant="contained"
            onClick={() => backPlanClient()}
          >Назад
          </Button>
        </div>

        <div className="saveBase">
          <Button
            className="save_button"
            variant="contained"
            onClick={() => saveBase()}
          > Сохранить
          </Button>
        </div>

        <div className="createBase">
          <Button
            className="save_button"
            variant="contained"
            onClick={() => createBase()}
          > Создать базу
          </Button>
        </div>

        <div className="edit_exerciseClient">
          <Button
            className="edit_button"
            variant="contained"
            onClick={() => editExerciseClient()}
          > Редагування
          </Button>
        </div>
      </div>
      
      {/* Відображаємо таблиці в дві колонки з drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px', 
            width: '100%',
            alignItems: 'start'
          }}>
            {categories.map((category) => (
              <SortableCategory
                key={category.id}
                category={category}
                exercisesArray={exercisesArray}
                onChangeBase={onChangeBase}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}

// Компонент для сортованої категорії
function SortableCategory({ category, exercisesArray, onChangeBase }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: '30px',
    opacity: isDragging ? 0.5 : 1,
    userSelect: 'none',
    border: isDragging ? '2px solid #4a90e2' : '2px solid transparent',
    borderRadius: '8px',
    padding: '5px',
    backgroundColor: isDragging ? '#e3f2fd' : 'transparent',
  };

  const categoryExercises = exercisesArray.filter(
    (exercise) => exercise.category_id === category.id
  );

  if (categoryExercises.length === 0) return null;

  return (
    <div ref={setNodeRef} style={style}>
      <div 
        {...attributes} 
        {...listeners} 
        className="category-drag-handle"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', padding: '10px 0' }}
      >
        <Typography variant="h6" style={{ marginBottom: '10px', marginLeft: '10px' }}>
          {category.name}
        </Typography>
      </div>
      <div>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table" size="small">
            <TableHead>
              <TableRow>
                <TableCell>Упражнение</TableCell>
                {Array.from(Array(NUMBER_TIMES).keys()).map((idx) => (
                  <TableCell align="center" className="num" key={idx + "h"}>
                    {idx + 1}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {categoryExercises.map((row) => (
                <BaseExercisesOut 
                  data={row} 
                  saveBase={onChangeBase} 
                  key={row.exercise_id}
                /> 
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}
