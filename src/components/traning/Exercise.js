import "./Exercise.scss";

const Exercise = (props) => {
  return (
    <div className="exercise">
      {/* <h5>{props.day}</h5>  */}
      <h5>{props.name}</h5>
      {/* <p>{props.times?.join(" / ")}</p> */}
    </div>
  );
};

export default Exercise;