import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";




export default function BaseExercisesOut(props) {
 
  //  console.log(props,'props')
  return(
<TableRow
                
                 
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {props.data.name}
                  </TableCell>
                  {Array.from(Object.keys(props.data.data)).map((key) => (
                    <TableCell align="center" key={key + "c"}>
                      <TextField
                        className="num"
                        size="small"
                        variant="standard"
                         value={props.data.data[key]}
                        
                         onChange={(e) => {
                        
                            props.saveBase(
                               e.target.value,props.data.exercise_id,key 
                              );
                              

                        }}
                      />
                    </TableCell>
                  ))}
                </TableRow>

  )
}