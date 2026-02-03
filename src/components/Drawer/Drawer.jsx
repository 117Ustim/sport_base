import { Fragment } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';

export default function TemporaryDrawer({ openDrawer, toggleDrawer, children }) {
  return (
    <div>
      {['right'].map((anchor) => (
        <Fragment key={anchor}>
          <Drawer
            anchor={anchor}
            open={openDrawer[anchor]}
            onClose={toggleDrawer(anchor, false)}
            PaperProps={{
              sx: {
                backgroundColor: 'transparent',
                boxShadow: 'none',
                overflow: 'visible'
              }
            }}
          >
            <Box
              sx={{ 
                width: 'auto',
                backgroundColor: 'transparent',
                padding: '20px'
              }}
              role='presentation'
            >
              {children}
            </Box>
          </Drawer>
        </Fragment>
      ))}
    </div>
  );
}
