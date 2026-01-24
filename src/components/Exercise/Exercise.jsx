import styles from "./Exercise.module.scss";

const Exercise = ({ name }) => {
  return (
    <div className={styles.exercise}>
      <h5>{name}</h5>
    </div>
  );
};

export default Exercise;
