import Exercise from "./Exercise";
import axios from "axios";
import React, { useEffect, useState } from "react";
import TemporaryDrawer from '../drawer/TemporaryDrawer';
import ListExercises from '../listExercises/ListExercises';
import AddIcon from "@mui/icons-material/ControlPoint";


const ExerciseContent = (props) => {
// console.log(props.day,'day')
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openDrawer, setOpenDrawer] = useState({ right: false });
  // const [planExercises, setPlanExercises] = useState({});
  // const [arrayPlanExercises, setArrayPlanExercises] = useState([]);
  const [addExercisesDay,setAddExercisesDay] = useState([]);
  const [day, setDay] = useState('');
  //  console.log(arrayPlanExercises,'kkkk')
  //  console.log(exercises,'ex')
  const[addExercises,setAddExercises]=useState([])

    console.log(addExercisesDay,'add')

  useEffect(() => {
  
     

      axios.get('http://localhost:9000/categories').then((response) => {
        console.log(response.data);
        setCategories(response.data);
      });
  
      axios.get('http://localhost:9000/exercises').then((response) => {
        setExercises(response.data);
        //  console.log(response.data, 'data');
      });
  }, []);

  const toggleDrawer = (anchor, open) => (event) => {
  
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      setOpenDrawer({ ...openDrawer, [anchor]: false });
    }else {
     setOpenDrawer({ ...openDrawer, [anchor]: open }); 
    }

    
  };
  // const moveNameExercise = (e) => {
  //   const temp = {
  //     ...planExercises,
  //     planExercises: e.name,
  //     id: e.id + 1,
     
  //   };

  //   setArrayPlanExercises([...arrayPlanExercises, temp]);
   
  // };

  const buttonAddExercises = (day,checkedExercises)=> {
    console.log(day,checkedExercises,'33333')
    setAddExercisesDay([...addExercisesDay,{day,checkedExercises}]);
   
   
    };
 
  return (
    <>
     <button
             className="basicTabs-addExercises"
               onClick={(e) => toggleDrawer('right', true)(e)}
              >
                
               <AddIcon /> Вправа
            </button>
            <div className='drawer'>
              <TemporaryDrawer
                openDrawer={openDrawer}
                toggleDrawer={toggleDrawer}>
                <ListExercises
                  day={day}
                  setDay={setDay}
                  categories={categories}
                  exercises={exercises}
                  // moveNameExercise={moveNameExercise}
                  // arrayPlanExercises={arrayPlanExercises}
                  // setArrayPlanExercises={setArrayPlanExercises}
                  buttonAddExercises={buttonAddExercises}
                  // setExercises={setExercises}
                 
                />
              </TemporaryDrawer>  
              </div> 
      {addExercisesDay?.map((w) => {
        
        return (
          <>
          
          <div key={w.checkedExercises.id }className="traning-container">
            
            <div className="traning">
              <div className="traning-date">
               
                <div  className="traning-day">{w.day}</div>
              
              </div>
              <div>
             
                {w.checkedExercises.map((ex) => {
                
                   return <Exercise  name={ex.name}times={ex.times} />;
               
                   
                })}
              </div>
            </div>
          </div>
          </>
     
        );
      })}
    </>
  );
};

export default ExerciseContent;