import * as React from 'react';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/ControlPoint';

import { useState, useEffect } from 'react';

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

export default function BasicTabs(props) {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <div className='basicTabs-blockButtons'>
          <button className='addWeeks_basicTabs' onClick={props.onAddClick}>
            <AddIcon /> Недiля
          </button>
        </div>

        <Tabs
          value={value}
          onChange={handleChange}
          aria-label='basic tabs example'>
          {props.tabs?.map((tab) => {
            return <Tab key={tab.id} label={tab.name} {...a11yProps(tab.id)} />;
          })}
        </Tabs>
      </Box>
      {props.tabs?.map((tab, index) => {
        return (
          <CustomTabPanel key={tab.id + index} value={value} index={index}>
            {React.cloneElement(props.children, tab)}
          </CustomTabPanel>
        );
      })}
    </Box>
  );
}
