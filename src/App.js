import { useState, useEffect } from "react";
import Home from "./components/Home";
import ListAddClients from "./components/ListAddClients";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import PlanClient from "./components/PlanClient";
import ClientBase from "./components/ClientBase";
import EditClientBase from "./components/EditClientBase";
import EditClientExercises from "./components/EditClientExercises";
import CreateWorkout from "./components/CreateWorkout";
import WorkoutDetails from "./components/WorkoutDetails";
import Settings from "./components/Settings";
import ManageClients from "./components/Settings/ManageClients";
import Login from "./components/Login";
import MigrateWorkouts from "./components/Migration/MigrateWorkouts";
import { authService } from "./firebase/services";
import { initCategories } from "./firebase/initData";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Подписка на изменение состояния авторизации
    const unsubscribe = authService.onAuthChange(async (currentUser) => {
      if (currentUser) {
        // Главный админ всегда имеет доступ
        if (currentUser.email === 'ustimweb72@gmail.com') {
          await authService.ensureAdminExists(currentUser.uid, currentUser.email);
          setUser(currentUser);
          initCategories();
          setLoading(false);
          return;
        }

        // Проверяем существует ли пользователь в базе данных и его роль
        const isAdmin = await authService.checkUserIsAdmin(currentUser.uid);
        
        if (isAdmin) {
          // Пользователь существует и является админом - разрешаем доступ
          setUser(currentUser);
          initCategories();
        } else {
          // Пользователь не админ или удален из базы - выходим
          if (process.env.NODE_ENV === 'development') {
            console.warn('User is not admin or not found in database');
          }
          await authService.logout();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Показываем загрузку пока проверяем авторизацию
  if (loading) {
    return <div className="app-loading">Завантаження...</div>;
  }

  return (
    <div className='app'>
      <Routes>
        {/* Роут для логина */}
        <Route
          path='/login'
          element={user ? <Navigate to="/" replace /> : <Login onLoginSuccess={() => {}} />}
        />
        
        {/* Защищенные роуты - доступны только авторизованным */}
        <Route
          path='/'
          element={user ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path='/settings'
          element={user ? <Settings /> : <Navigate to="/login" replace />}
        />
        <Route
          path='/manage-clients'
          element={user ? <ManageClients /> : <Navigate to="/login" replace />}
        />
        <Route
          path='/edit_client_base'
          element={user ? <EditClientBase /> : <Navigate to="/login" replace />}
        />
        <Route
          path='/edit_client_base/:id'
          element={user ? <EditClientBase /> : <Navigate to="/login" replace />}
        />
        <Route
          path='/edit_client_exercises/:id'
          element={user ? <EditClientExercises /> : <Navigate to="/login" replace />}
        />
        <Route
          path='/list_add_clients'
          element={user ? <ListAddClients /> : <Navigate to="/login" replace />}
        />
    
        <Route 
          path="/plan_client/:id/:name" 
          element={user ? <PlanClient /> : <Navigate to="/login" replace />}
        />
        <Route
          path='/client_base/:id'
          element={user ? <ClientBase /> : <Navigate to="/login" replace />}
        />
        <Route
          path='/create_workout/:id'
          element={user ? <CreateWorkout/> : <Navigate to="/login" replace />}
        />
        <Route
          path='/edit_workout/:id/:workoutId'
          element={user ? <CreateWorkout/> : <Navigate to="/login" replace />}
        />
        <Route
          path='/workout_details/:clientId/:workoutId'
          element={user ? <WorkoutDetails/> : <Navigate to="/login" replace />}
        />
        <Route
          path='/migrate-workouts'
          element={user ? <MigrateWorkouts/> : <Navigate to="/login" replace />}
        />
      </Routes>
    </div>
  );
}
