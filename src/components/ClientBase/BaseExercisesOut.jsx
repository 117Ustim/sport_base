import styles from './ClientBase.module.scss';

export default function BaseExercisesOut(props) {
  return (
    <tr>
      <td>{props.data.name}</td>
      {props.columns.map((column) => (
        <td className={styles.numCol} key={column.id}>
          <input
            type="text"
            className={styles.numInput}
            value={props.data.data[column.id] || ''}
            onChange={(e) => {
              props.saveBase(e.target.value, props.data.exercise_id, column.id);
            }}
          />
        </td>
      ))}
    </tr>
  );
}
