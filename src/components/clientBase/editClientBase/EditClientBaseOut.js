

export default function EditClientBaseOut(props) {


  return(
<>
   

<ul key={props.exercise.id}>
  <div className="block-exercises">
       <li>
         <h5 className="text_exercises">
           {props.exercise.name}
           <button
             className="delete"
            //    variant="contained"
               onClick={() => props.deleteExercise(props.exercise.id)}
           >
             <span>Del</span>
           </button>
         </h5>
       </li>
     </div>  
     </ul>




   
     
 

</>
  )}