import * as React from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import "./List.scss";
import classnames from "classnames";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

export default function BasicList(props) {
  const [selected, setSelected] = React.useState({ name: "" });
  const params = useParams();

  useEffect(() => {
    if (params.trainingId) {
      setSelected({
        name: props.items?.find((i) => i.id === +params.trainingId)?.name,
      });
    }
  }, [props, params]);

  return (
    <Box sx={{ flexGrow: 1, maxWidth: 752 }}>
      <List dense>
        {props.items?.map((item) => {
          return (
            <ListItem
            key={item.id}
              onClick={() => {
                setSelected(item);
                props.onCLick(item.id);
              }}
              className={classnames("list-item", {
                "is-active": selected?.name === item?.name,
              })}
            >
              <ListItemText
                primary={item.name}
                secondary={item.description ? item.description : null}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}










// import { useState } from 'react';
// import './listTraining.scss';
// import classNames from 'classnames';

// export default function ListTraining(props) {
//   const [active, setActive] = useState();
//   return (
//     <div className='list-training'>
//       {props.textModal?.map((text, index) => {
//         return (
//           <h5
//             onClick={() => setActive(index)}
//             className={classNames({ active: index === active })}
//             key={index}>
//             {text.primaryText} {text?.secondaryText}
//           </h5>
//         );
//       })}
//     </div>
//   );
// }
