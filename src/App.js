import Home from "./components/home/Home";
import ClientData from "./components/clientData/ClientData";
import ListAddClients from "./components/listAddClients/ListAddClients";
import { Route, Routes } from "react-router";
import PlanClient from "./components/planClient/PlanClient";
import ClientBase from "./components/clientBase/ClientBase";
import EditClientBase from "./components/clientBase/editClientBase/EditClientBase";
import AddTraining from "./components/addTraining/AddTraining";

import TrainingWeeks from './components/planClient/TrainingWeeks';



export default function App() {
  return (
    <div className='app'>
      <Routes>
        <Route
          path='/'
          element={<Home />}
        />
        <Route
          path='/edit_client_base'
          element={<EditClientBase />}
        />
        <Route
          path='/list_add_clients'
          element={<ListAddClients />}
        />
    
      <Route
          path='/client_data/:id'
          element={<ClientData />}
        />
        <Route
          path='/plan_client/:id/:name'
          element={<PlanClient />}
        />
        <Route
          path='/client_base/:id'
          element={<ClientBase />}
        />
        <Route path="/plan_client/:id/:name/" element={<PlanClient />}>
          <Route path=":trainingId" element={<TrainingWeeks />} />
        </Route>
       <Route
          path='/add_training/:id'
          element={<AddTraining/>}
        />
      
      </Routes>
     
    </div>
   
   
  );
}
