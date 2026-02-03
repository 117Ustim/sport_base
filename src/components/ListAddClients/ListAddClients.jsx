import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';
import { clientsService } from '../../firebase/services';
import styles from './ListAddClients.module.scss';

export default function ListAddClients({ openDrawer, search, refreshTrigger }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [serverContacts, setServerContacts] = useState([]);
  const [page, setPage] = useState(1);
  const [pageQty, setPageQty] = useState(0);
  const [limit] = useState(10);

  const onButtonPlanClient = (id, surname, name) => {
    navigate(`/plan_client/${id}/${surname} ${name}`);
  };

  useEffect(() => {
    const gym = search.gym;
    const sex = search.sex;
    
    const searchParams = { page: page - 1, limit: limit };
    
    if (gym) {
      searchParams.gym = gym;
    }
    if (sex) {
      searchParams.sex = sex;
    }

    console.log('Search params being sent to clientsService:', searchParams);
    console.log('Original search object:', search);
 
    if (!openDrawer.right) {
      clientsService.getAll(searchParams).then((response) => {
        console.log('Response from clientsService:', response);
        setServerContacts(response.data);
        setPageQty(Math.ceil(response.total / limit));
      });
    }
  }, [openDrawer, page, limit, search, refreshTrigger]); // Добавили refreshTrigger
  
  useEffect(() => {
    setPage(1);
  }, [search.gym, search.sex]);

  return (
    <div className={styles.listAddClients}>
      <div className={styles.clientList}>
        <div className={styles.features}>
          <div className={styles.fieldset}>
            {serverContacts
              .filter(contact => contact.data !== null)
              .map((contact, index) => (
                <div key={contact.id} className={styles.feature}>
                  <div className={styles.featureContent}>
                    <div className={styles.index}>
                      <span>{(page - 1) * limit + index + 1}</span>
                    </div>

                    <div className={styles.surname}>
                      <strong>{contact.data?.surname || ''}</strong>
                      <span>{contact.data?.name || ''}</span>
                    </div>

                    <div className={styles.gym}>
                      <span>{contact.data?.gym || t('common.notSpecified')}</span>
                    </div>
                    
                    <button
                      className={styles.buttonPlan}
                      onClick={() =>
                        onButtonPlanClient(
                          contact.id,
                          contact.data?.surname || '',
                          contact.data?.name || ''
                        )
                      }>
                      {t('common.plan')}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <Stack spacing={2}>
          {!!pageQty && pageQty > 1 && (
            <Pagination
              size='small'
              count={pageQty}
              page={page}
              onChange={(_, num) => {
                setPage(num);
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
