
import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
 import BasicList from "../list/BasicList";
import BasicModal from "../modal/BasicModal";
import axios from "axios";



const trainigUrl = "http://localhost:9000/client-trainings";

export default function PlanClient() {
  const navigate = useNavigate();
  // const location = useLocation();
  const params = useParams();
  
  const [weeks, setWeeks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);


  useEffect(() => {
    axios.get(`${trainigUrl}/${params.id}`).then((resp) => {
      setWeeks(resp.data);
    });
   
  }, [params.id]);

  

  const onButtonBack = () => {
    navigate('/');
  };
  const onButtonBase = () => {
    navigate(`/client_base/${params.id}`);
  };

  const onButtonAddTraining = async (text) => {
    const { data } = await axios.post(
      "http://localhost:9000/client-trainings",
      {
        ...text,
        clientId: params.id,
      },
    );
    setWeeks([...weeks, data]);
    setIsModalOpen(false);
  };

  return (
    <div className="planClient">
      <BasicModal
        header="Добавить тренировку"
        onAdd={onButtonAddTraining}
        onCancel={() => setIsModalOpen(false)}
        open={isModalOpen}
      />
      <div className="block-button_planClient">
        <button className="buttonBack_planClient" onClick={onButtonBack}>
          {params.name}
        </button>

        <button
          className="button-addExercises_planClient"
        
          onClick={() => setIsModalOpen(true)}
        >
          Добавить тренировки
        </button>

        <button
          className="buttonBase_planClient"        
          onClick={onButtonBase}
        >
          База
        </button>
      </div>

      <div className="base-trainings-page">
        <div className="tranings-list">
          <BasicList
            items={weeks}
            onCLick={(trainingId) => {
              navigate(
                `/plan_client/${params.id}/${params.name}/${trainingId}`,
              );
            }}
          />
        </div>
        <div className="tranings-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}





















// import "./planClient.scss";
// import Button from "@mui/material/Button";
// import { useNavigate } from "react-router";
// import { useState,useEffect } from "react";
//  import axios from "axios";
// import { useParams } from "react-router-dom";
// import LabTabs from '../tabs/LabTabs';
// import Modal from '../modal/BasicModal';
// import ListTraining from '../list/ListTraining';
// import TemporaryDrawer from "../drawer/TemporaryDrawer";




// export default function PlanClient(props) {
//   const navigate = useNavigate();
//   const params = useParams();


//   const onButtonBack = () => {
//     navigate('/');
//   };
//   const onButtonBase = () => {
//     navigate(`/client_base/${params.id}`);
//   };
 

//   const [textModal, setTextModal] = useState([]);
  
//   const onButtonAddTraining = (text) => {
// setTextModal([
//   ...textModal,{primaryText:text.name,secondaryText:text.notes} 
// ]);

//      navigate(`/add_training/${params.id}`);
//   };




//   return (
//     <div className='planClient'>
//       <div className='back_Client_list'>
//         <Button
//           variant='contained'
//           size='small'
//           onClick={onButtonBack}
//         >
//           {params.name}
//         </Button>
//       </div>
    
     
//       <Button
//          className='button_addExercises'
//         variant='contained'
//         size='small'
//         onClick={onButtonAddTraining}
//       >
//         Добавить тренировку
//       </Button>
      
//       <div className='button_base'>
//         <Button
//           variant='contained'
//           size='small'
//           onClick={onButtonBase}
//         >
//           База
//         </Button>
//       </div>
//       <ListTraining textModal={textModal}/>
//       <Modal onAdd={onButtonAddTraining}/>
//       <LabTabs/>
      
//     </div>
//   );
// }
