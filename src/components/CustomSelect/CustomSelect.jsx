import { useState, useRef, useEffect } from 'react';
import styles from './CustomSelect.module.scss';

const CustomSelect = ({ name, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue, gymId) => {
    const event = {
      target: {
        name,
        value: optionValue,
        gymId
      }
    };
    onChange(event);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={styles.customSelect} ref={selectRef}>
      <div 
        className={`${styles.selectButton} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.selectedValue}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          className={`${styles.arrow} ${isOpen ? styles.rotated : ''}`}
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 20 20"
        >
          <path 
            stroke="#495057" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="1.5" 
            d="m6 8 4 4 4-4"
          />
        </svg>
      </div>
      
      {isOpen && (
        <div className={styles.dropdown}>
          {options.map((option, index) => (
            <div
              key={index}
              className={styles.option}
              onClick={() => handleSelect(option.value, option.gymId)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;