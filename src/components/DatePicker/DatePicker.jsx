import { useState } from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import FormControl from '@mui/material/FormControl';
import { ruRU } from '@mui/x-date-pickers/locales';
import styles from './DatePicker.module.scss';

export default function DatePicker({ setDay }) {
  const [value, setValue] = useState(null);

  const handleChange = (newValue) => {
    if (setDay) {
      setDay(dayjs(newValue).locale('ru').format('DD.MM.YYYY'));
    }
    setValue(newValue);
  };

  return (
    <div className={styles.datePicker}>
      <LocalizationProvider 
        dateAdapter={AdapterDayjs} 
        adapterLocale="ru"
        localeText={ruRU.components.MuiLocalizationProvider.defaultProps.localeText}
      >
        <FormControl sx={{ m: 1, minWidth: 150 }}>
          <MobileDatePicker
            label='Дата'
            value={value}
            onChange={handleChange}
            cancelText="Отмена"
            okText="Выбрать"
          />
        </FormControl>
      </LocalizationProvider>
    </div>
  );
}
