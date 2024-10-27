import { useState } from "react";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import TextField from '@mui/material/TextField';
import './basicModal.scss';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #9e9d9d',
  borderRadius: '5px',
  boxShadow: 24,
  p: 4,
};

export default function BasicModal(props) {
  const [text, setText] = useState({ name: "", description: "" });

  const onChange = (e) => {
    const { name, value } = e.target;
    setText({ ...text, [name]: value });
  };

  const onAddClick = async () => {
    await props.onAdd(text);
    setText({ name: "", description: "" });
  };

  return (
    <div>
      <Modal
        open={props.open}
        aria-labelledby="keep-mounted-modal-title"
        aria-describedby="keep-mounted-modal-description"
      >
        <Box sx={style}>
          <Typography variant="h6" component="h2">
            {props.header}
          </Typography>
          <div>
            <TextField
              label="Название Тренировки"
              value={text.name}
              name="name"
              onChange={onChange}
            ></TextField>
            <TextField
              label="Примечание"
              name="description"
              value={text.description}
              onChange={onChange}
            ></TextField>
          </div>
          <div>
            <Button onClick={onAddClick}>Add</Button>
            <Button onClick={props.onCancel}>Cancel</Button>
          </div>
        </Box>
      </Modal>
    </div>
  );
}










// export default function BasicModal(props) {


//   const [open, setOpen] = useState(false);
//   const handleOpen = () => setOpen(true);
//   const handleClose = () => setOpen(false);


//   const [modalText, setModalText] = useState({ name: '', notes: '' });

//   const onChange = (e) => {
//     const { name, value } = e.target;
//     setModalText({ ...modalText, [name]: value });
//   };

//   const dataModalText = () => {
//   props.onAdd(modalText);
//   setModalText({ name: '', notes: '' });
//   setOpen(false);
//   };
//   return (
//     <div>
//       <Button
//         className='button_open_modal'
//         variant='contained'
//         size='small'
//         onClick={handleOpen}>
//         Добавить новый план
//       </Button>
//       <Modal
//         open={open}
//         onClose={handleClose}
//         aria-labelledby='modal-modal-title'
//         aria-describedby='modal-modal-description'>
//         <Box sx={style}>
//           <Typography
//             className='text_modal'
//             id='modal-modal-title'
//             variant='h6'
//             component='h2'>
//             <TextField
//               id='standard-basic'
//               label='Название'
//               variant='standard'
//               name='name'
//               value={modalText.name}
//               onChange={onChange}
//             />
//             <TextField
//               id='standard-basic'
//               label='Примечание'
//               variant='standard'
//               name='notes'
//               value={modalText.notes}
//               onChange={onChange}
//             />
//           </Typography>
//           <Button className='button_modal_add' variant='contained' size='small'onClick={dataModalText}>
//             Ввод
//           </Button>
//         </Box>
//       </Modal>
//     </div>
//   );
// }
