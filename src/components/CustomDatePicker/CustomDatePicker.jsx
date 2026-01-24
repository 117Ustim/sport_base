import { useState } from 'react';
import styles from './CustomDatePicker.module.scss';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CustomDatePicker({ onDateSelect, onCancel }) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
  };

  const handleConfirm = () => {
    if (selectedDate && onDateSelect) {
      const formattedDate = `${String(selectedDate).padStart(2, '0')}.${String(currentMonth + 1).padStart(2, '0')}.${currentYear}`;
      onDateSelect(formattedDate);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay}></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate === day;
      const isToday = 
        day === today.getDate() && 
        currentMonth === today.getMonth() && 
        currentYear === today.getFullYear();

      days.push(
        <button
          key={day}
          className={`${styles.day} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
          onClick={() => handleDayClick(day)}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className={styles.customDatePicker}>
      <div className={styles.header}>
        <button className={styles.navButton} onClick={handlePrevMonth}>
          ←
        </button>
        <div className={styles.monthYear}>
          {MONTHS[currentMonth]} {currentYear}
        </div>
        <button className={styles.navButton} onClick={handleNextMonth}>
          →
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAYS.map((day) => (
          <div key={day} className={styles.weekday}>
            {day}
          </div>
        ))}
      </div>

      <div className={styles.calendar}>
        {renderCalendar()}
      </div>

      <div className={styles.actions}>
        <button className={styles.cancelButton} onClick={onCancel}>
          Отмена
        </button>
        <button 
          className={styles.confirmButton} 
          onClick={handleConfirm}
          disabled={!selectedDate}
        >
          Выбрать
        </button>
      </div>
    </div>
  );
}
