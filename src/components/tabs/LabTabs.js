import axios from 'axios';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import './labTabs.scss';
import Button from '@mui/material/Button';
import TemporaryDrawer from './../drawer/TemporaryDrawer';
import Data from './date/Date';
import ListExercises from './../listExercises/ListExercises';

export default function LabTabs() {
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [planExercises, setPlanExercises] = useState({});
  const [arrayPlanExercises, setArrayPlanExercises] = useState([]);
  const [openDrawer, setOpenDrawer] = useState({ right: false });
  const [value, setValue] = useState('1');
  const [tab, setTab] = useState([]);

  // ------------------------------------------------------------------------------------

  useEffect(() => {
    // axios
    //   .get(`http://localhost:9000/clients-base/${params.id}`)
    //   .then((response) => {console.log(response.data,'rrrr')
    //     setExercises(response.data);
    //   });
    axios.get('http://localhost:9000/categories').then((response) => {
      console.log(response.data);
      setCategories(response.data);
    });

    axios.get('http://localhost:9000/exercises').then((response) => {
      setExercises(response.data);
      // console.log(response.data, 'data');
    });
  }, []);

  //  ----------------------------------DRAWER-------------------------------------------------------

  const toggleDrawer = (anchor, open) => (event) => {
  
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      setOpenDrawer({ ...openDrawer, [anchor]: false });
    }else {
     setOpenDrawer({ ...openDrawer, [anchor]: open }); 
    }

    
  };
// ------------------------------------------------------------------------------

  const moveNameExercise = (e) => {
    const temp = {
      ...planExercises,
      planExercises: e.name,
      id: e.id + 1,
    };
    setArrayPlanExercises([...arrayPlanExercises, temp]);
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const addTab = () => {
    setTab([...tab, { label: tab.length + 1, weeks: [] }]);
  };

  
  return (
    <div className='labtabs'>
      <Box sx={{ width: '100%', typography: 'body1' }}>
        <TabContext value={value}>
          <div className='add-button_tab'>
            <Button onClick={addTab} variant='contained' size='small'>
              +
            </Button>

            <Button
              variant='contained'
              size='small'
              onClick={(e) => toggleDrawer('right', true)(e)}>
              + упражнения
            </Button>

            <div className='drawer'>
              <TemporaryDrawer
                openDrawer={openDrawer}
                toggleDrawer={toggleDrawer}>
                <ListExercises
                  categories={categories}
                  exercises={exercises}
                  moveNameExercise={moveNameExercise}
                />
              </TemporaryDrawer>
            </div>
          </div>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList onChange={handleChange} aria-label='lab API tabs example'>
              {tab?.map((lab) => {
                return (
                  <Tab key={lab.label} label={lab.label} value={lab.label} />
                );
              })}
            </TabList>
          </Box>

          <Data />

          {tab.map((data, index) => {
            return data?.weeks.map((el) => {
              return (
                <TabPanel key={el.date} value={data.label}>
                  <div className='block_day'>
                    <div className='date'>
                      <h3>{el.day}</h3>
                      <h5>{el.date}</h5>
                    </div>

                    {el.exercises.map((ex, index) => {
                      return (
                        <div key={index + ex.name} className='exercises'>
                          <h4>{ex.name}</h4>
                          <h5>{ex.times}</h5>
                        </div>
                      );
                    })}
                  </div>
                </TabPanel>
              );
            });
          })}
        </TabContext>
      </Box>
    </div>
  );
}
