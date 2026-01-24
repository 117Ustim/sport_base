import { useState } from 'react';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/ControlPoint';
import styles from './BasicTabs.module.scss';

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}>
      {value === index && (
        <Box sx={{ p: 3 }}>
          <>{children}</>
        </Box>
      )}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function BasicTabs({ tabs, onAddClick, children }) {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <div className={styles.blockButtons}>
          <button className={styles.addWeeks} onClick={onAddClick}>
            <AddIcon /> Недiля
          </button>
        </div>

        <Tabs
          value={value}
          onChange={handleChange}
          aria-label='basic tabs example'>
          {tabs?.map((tab) => {
            return <Tab key={tab.id} label={tab.name} {...a11yProps(tab.id)} />;
          })}
        </Tabs>
      </Box>
      {tabs?.map((tab, index) => {
        return (
          <CustomTabPanel key={tab.id + index} value={value} index={index}>
            {children && typeof children.type === 'function' 
              ? children.type({ ...children.props, ...tab })
              : children}
          </CustomTabPanel>
        );
      })}
    </Box>
  );
}
