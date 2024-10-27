import axios from "axios";
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



export default function ClientBase() {
  const params = useParams();
  const navigate = useNavigate();

 
 const[exercisesArray,setExercisesArray]= useState([]);

useEffect(()=> {
    axios.get(`http://localhost:9000/clients-base/${params.id}`).then((response)=> {
     
         setExercisesArray(response.data);
     console.log(response.data)
         
    });

    },[]);

  const backPlanClient = () => {
    navigate(-1);
  };
  const editExerciseClient = () => {
    navigate(`/edit_base/${params.id}`);
  };

  const createBase = () => {
   axios.post(`http://localhost:9000/clients-base/${params.id}`).then((response)=> {
    
   });
  };
const saveBase = () => {
  axios.patch(`http://localhost:9000/clients-base/${params.id}`,{exercises:exercisesArray}).then((response)=> {
    
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
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table" size="small">
          <TableHead>
            <TableRow>
              <TableCell >Упражнение</TableCell>
           
              {Array.from(Array(NUMBER_TIMES).keys()).map((idx) => (
                <TableCell align="center" className="num" key={idx + "h"}>
                  {idx + 1}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {exercisesArray.map((row) => (
                   <BaseExercisesOut data ={row}saveBase={onChangeBase} key={row.exercise_id}/> 
            
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
