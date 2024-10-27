import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';

export default function TemporaryDrawer(props) {
 
  return (
    <div>
      {['right'].map((anchor) => (
        <React.Fragment key={anchor}>
          <Drawer
            anchor={anchor}
           open={props.openDrawer[anchor]}
            onClose={props.toggleDrawer(anchor, false)}
            >
            <Box
              sx={{
                width:'auto' ,
              }}
              role='presentation'
              // onClick={props.toggleDrawer(anchor, false)}
              // onKeyDown={props.toggleDrawer(anchor, false)}
              >
              {props.children}
              <Divider />
            </Box>
          </Drawer>
        </React.Fragment>
      ))}
    </div>
  );
}
