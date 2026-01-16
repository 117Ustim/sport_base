import { useState, useEffect } from "react";
import Home from "./components/home/Home";
import ClientData from "./components/clientData/ClientData";
import ListAddClients from "./components/listAddClients/ListAddClients";
import { Route, Routes } from "react-router";
import PlanClient from "./components/planClient/PlanClient";
import ClientBase from "./components/clientBase/ClientBase";
import EditClientBase from "./components/clientBase/editClientBase/EditClientBase";
import AddTraining from "./components/addTraining/AddTraining";
import Settings from "./components/settings/Settings";
import ManageClients from "./components/settings/ManageClients";
import TrainingWeeks from './components/planClient/TrainingWeeks';
import Login from "./components/login/Login";
import { authService } from "./firebase/services";
import { initCategories } from "./firebase/initData";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Подписка на изменение состояния авторизации
    const unsubscribe = authService.onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Инициализируем категории после входа
      if (currentUser) {
        initCategories();
      }
    });

    return () => unsubscribe();
  }, []);

  // Показываем загрузку пока проверяем авторизацию
  if (loading) {
    return <div className="app-loading">Завантаження...</div>;
  }

  // Если не авторизован - показываем страницу входа
  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div className='app'>
      <Routes>
        <Route
          path='/'
          element={<Home />}
        />
        <Route
          path='/settings'
          element={<Settings />}
        />
        <Route
          path='/manage-clients'
          element={<ManageClients />}
        />
        <Route
          path='/edit_client_base'
          element={<EditClientBase />}
        />
        <Route
          path='/edit_client_base/:id'
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
