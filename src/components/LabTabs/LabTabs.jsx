import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import Button from '@mui/material/Button';
import { categoriesService, exercisesService } from '../../firebase/services';
import Drawer from '../Drawer';
import DatePicker from '../DatePicker';
import ListExercises from '../ListExercises';
import styles from './LabTabs.module.scss';

export default function LabTabs() {
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [planExercises, setPlanExercises] = useState({});
  const [arrayPlanExercises, setArrayPlanExercises] = useState([]);
  const [openDrawer, setOpenDrawer] = useState({ right: false });
  const [value, setValue] = useState('1');
  const [tab, setTab] = useState([]);

  useEffect(() => {
    categoriesService.getAll().then((data) => {
      setCategories(data);
    });

    exercisesService.getAll().then((data) => {
      setExercises(data);
    });
  }, []);

  const toggleDrawer = (anchor, open) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      setOpenDrawer({ ...openDrawer, [anchor]: false });
    } else {
      setOpenDrawer({ ...openDrawer, [anchor]: open });
    }
  };

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
    <div className={styles.labtabs}>
      <Box sx={{ width: '100%', typography: 'body1' }}>
        <TabContext value={value}>
          <div className={styles.addButtonTab}>
            <Button onClick={addTab} variant='contained' size='small'>
              +
            </Button>

            <Button
              variant='contained'
              size='small'
              onClick={(e) => toggleDrawer('right', true)(e)}>
              + упражнения
            </Button>

            <div className={styles.drawer}>
              <Drawer
                openDrawer={openDrawer}
                toggleDrawer={toggleDrawer}>
                <ListExercises
                  categories={categories}
                  exercises={exercises}
                  moveNameExercise={moveNameExercise}
                />
              </Drawer>
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

          <DatePicker />

          {tab.map((data) => {
            return data?.weeks.map((el) => {
              return (
                <TabPanel key={el.date} value={data.label}>
                  <div className={styles.blockDay}>
                    <div className={styles.date}>
                      <h3>{el.day}</h3>
                      <h5>{el.date}</h5>
                    </div>

                    {el.exercises.map((ex, index) => {
                      return (
                        <div key={index + ex.name} className={styles.exercises}>
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
