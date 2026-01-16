// import "./listAddClients.scss";
import { useNavigate } from 'react-router';
import { clientsService } from '../../firebase/services';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';

export default function ListAddClients({openDrawer,search}) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const [serverContacts, setServerContacts] = useState([]);
  const [page, setPage] = useState(
    params.get('page') ? Number(params.get('page')) : 1
  );
  const [pageQty, setPageQty] = useState(0);
  const [limit, setLimit] = useState(params.get('limit') ?? 10);

  const onButtonBackHome = () => {
    navigate("/");
  };

  const onButtonPlanClient = (id, surname, name) => {
    navigate(`/plan_client/${id}/${surname} ${name}`);
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
      clientsService.getAll(searchParams).then((response) => {
        setServerContacts(response.data);
        setPageQty(Math.ceil(response.total / limit));
      });
    }
    
  }, [openDrawer, params, page, limit, search]);

  return (
    <div className='list-add-clients'>
      <div className='block-top-button'></div>

      <div className='clientList'>
        <div className='features'>
          <div className='fieldset'>
            {serverContacts.filter(contact => contact.data !== null).map((contact, index) => (
              <div key={contact.id} className='feature'>
                <div className='feature-content'>
                  <div className='index'>
                    <span>{index + 1}</span>
                  </div>

                  <div className='surname'>
                    <strong>{contact.data?.surname || ''}</strong>
                    <span>{contact.data?.name || ''}</span>
                  </div>

                  <div className='gym'>
                    <span>{contact.data?.gym || 'Не вказано'}</span>
                  </div>
                  
                  <button
                    className='buttonPlan'
                    onClick={() =>
                      onButtonPlanClient(
                        contact.id,
                        contact.data?.surname || '',
                        contact.data?.name || ''
                      )
                    }>
                    План
                  </button>
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
      </div>
    </div>
  );
}
