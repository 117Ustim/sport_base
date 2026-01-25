import styles from './ClientBase.module.scss';

export default function BaseExercisesOut(props) {
  const handleInputChange = (e, exerciseId, columnId) => {
    const value = e.target.value;
    // Разрешаем только цифры и специальные символы !, *
    const regex = /^[0-9!*]*$/;
    
    if (regex.test(value)) {
      props.saveBase(value, exerciseId, columnId);
    }
  };

  return (
    <tr>
      <td>{props.data.name}</td>
      {props.columns.map((column) => (
        <td className={styles.numCol} key={column.id}>
          <input
            type="text"
            className={styles.numInput}
            value={props.data.data[column.id] || ''}
            onChange={(e) => handleInputChange(e, props.data.exercise_id, column.id)}
          />
        </td>
      ))}
    </tr>
  );
}
