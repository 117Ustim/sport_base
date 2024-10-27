// import "./listAddClients.scss";
import axios from 'axios';
import { useNavigate } from 'react-router';
//  import { useSelector, useDispatch } from "react-redux";
import Button from '@mui/material/Button';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import ButtonEditDelete from './../buttonEditDelete/ButtonEditDelete';
import TemporaryDrawer from './../drawer/TemporaryDrawer';
import ClientData from '../clientData/ClientData';

export default function ListAddClients({openDrawer,search}) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

 
  const[contactId,setContactId]= useState();
  const [serverContacts, setServerContacts] = useState([]);
  const [page, setPage] = useState(
    params.get('page') ? Number(params.get('page')) : 1
  );
  const [pageQty, setPageQty] = useState(0);
  const [limit, setLimit] = useState(params.get('limit') ?? 10);

  const onButtonBackHome = () => {
    navigate("/");
  };
  
  
  const [openDrawer2, setOpenDrawer2] = useState({ right: false });
  
  const toggleDrawer2 = (anchor, open) => (event) => {
   
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      setOpenDrawer2({ ...openDrawer2, [anchor]: false });
    } else {
      setOpenDrawer2({ ...openDrawer2, [anchor]: open });
    }
  };





  const onButtonExercises = () => {
    navigate(`/edit_client_base/${params.id}`);
  };

  const onButtonPlanClient = (id, surname, name) => {
    navigate(`/plan_client/${id}/${surname} ${name}`);
  };

  const onDeleteContactClient = (id) => {
   
    axios.delete(`http://localhost:9000/clients/${id}`).then(() => {
      setServerContacts(serverContacts.filter((client) => client.id !== id));
    });
  };

  const onEditContactClient = (id) => {
        navigate(`/client_data/${id}`);
  
  };

  useEffect(() => {
    const gym = search.gym;
    const searchParams = { page:search.page - 1,limit:search.limit };
    if (gym) {
      searchParams.gym = gym;
    }
    const sex = search.sex;
    if (sex) {
      searchParams.sex = sex;
    
    }
 
    if(!openDrawer.right){
      axios
      .get('http://localhost:9000/clients', { params: { ...searchParams } })
      .then((response) => {
        setServerContacts(response.data.data);
        setPageQty(Math.ceil(response.data.total / limit));
        
      });
    }
    
  }, [openDrawer,openDrawer2,params, page, limit,search]);

  return (
    <div className='list-add-clients'>
      <div className='block-top-button'></div>

      <div className='clientList'>
        <div className='features'>
          <div className='fieldset'>
            {serverContacts.map((contact, index) => (
              <div key={contact.id} className='feature'>
                <div className='feature-content'>
                  <div className='index'>
                    <span>{index + 1}</span>
                  </div>

                  <div className='surname'>
                    <strong>{contact.data.surname}</strong>
                    <span>{contact.data.name}</span>
                  </div>

                  <div className='gym'>
                    <span>* {contact.data.gym} *</span>
                  </div>
                  <button
                    className='buttonPlan'
                    onClick={() =>
                      onButtonPlanClient(
                        contact.id,
                        contact.data.surname,
                        contact.data.name
                      )
                    }>
                    План
                  </button>
                
                  <ButtonEditDelete
                    onDeleteContactClient={onDeleteContactClient}
                     onEditContactClient={onEditContactClient}
                    contact={contact}
                    toggleDrawer={(e)=> {
                      setContactId(contact.id)
                      toggleDrawer2('right', true)(e)}}
                   
                  />
                 
                </div>
              </div>

              
            ))}
            
          </div>
        </div>
      

        <Stack spacing={2}>
          {!!pageQty && (
            <Pagination
              size='small'
              count={pageQty}
              page={page}
              onChange={(_, num) => {
                setPage(num);

                params.set('page', num);
                setParams([...params.entries()]);
              }}
              variant='outlined'
              shape='rounded'
            />
          )}
        </Stack>

        <TemporaryDrawer openDrawer={openDrawer2} toggleDrawer={toggleDrawer2}>
       <ClientData contactId={contactId}/>
    
      </TemporaryDrawer>


      </div>
    </div>
  );
}
