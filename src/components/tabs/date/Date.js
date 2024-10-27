import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import TextField from '@mui/material/TextField';
// import Stack from "@mui/material/Stack";
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import FormControl from '@mui/material/FormControl';
import { useState } from 'react';
import ExerciseContent from '../../traning/ExerciseContent';
import ListExercises from './../../listExercises/ListExercises';

export default function Date({setDay}) {
  const [value, setValue] = useState(null);
 
  // console.log(day,'day1')
  const handleChange = (newValue) => {
    setDay(dayjs(newValue).locale('ru').format('DD.MM.YYYY'));
   setValue(newValue);
  };

  return (
    <div className='data'>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <FormControl sx={{ m: 1, minWidth: 150 }}>
          <MobileDatePicker
            label='Дата'
            // inputFormat='DD/MM/YYYY'
            value={value}
            onChange={handleChange}
          
            // renderInput={(params) => <TextField {...params} />}
          />
        </FormControl>
     
      </LocalizationProvider>
      
    </div>
  );
}
