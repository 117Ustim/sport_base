import { Fragment } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';

export default function TemporaryDrawer({ openDrawer, toggleDrawer, children }) {
  return (
    <div>
      {['right'].map((anchor) => (
        <Fragment key={anchor}>
          <Drawer
            anchor={anchor}
            open={openDrawer[anchor]}
            onClose={toggleDrawer(anchor, false)}
          >
            <Box
              sx={{ width: 'auto' }}
              role='presentation'
            >
              {children}
              <Divider />
            </Box>
          </Drawer>
        </Fragment>
      ))}
    </div>
  );
}
