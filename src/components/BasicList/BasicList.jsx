import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import classnames from "classnames";
import styles from "./BasicList.module.scss";

export default function BasicList({ items, onCLick }) {
  const [selected, setSelected] = useState({ name: "" });
  const params = useParams();

  useEffect(() => {
    if (params.trainingId) {
      setSelected({
        name: items?.find((i) => i.id === +params.trainingId)?.name,
      });
    }
  }, [items, params]);

  return (
    <Box sx={{ flexGrow: 1, maxWidth: 752 }}>
      <List dense>
        {items?.map((item) => {
          return (
            <ListItem
              key={item.id}
              onClick={() => {
                setSelected(item);
                onCLick(item.id);
              }}
              className={classnames(styles.listItem, {
                [styles.isActive]: selected?.name === item?.name,
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
