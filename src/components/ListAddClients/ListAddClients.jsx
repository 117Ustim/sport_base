import { useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clientsService } from '../../firebase/services';
import styles from './ListAddClients.module.scss';

export default function ListAddClients({ openDrawer, search, refreshTrigger }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [serverContacts, setServerContacts] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const onButtonPlanClient = (id, surname, name) => {
    navigate(`/plan_client/${id}/${surname} ${name}`);
  };

  useEffect(() => {
    const gym = search.gym;
    const gymId = search.gymId;
    const sex = search.sex;
    
    const searchParams = { limit: 1000 };
    
    if (gymId) {
      searchParams.gymId = gymId;
    } else if (gym) {
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
        setServerContacts(response.data || []);
      });
    }
  }, [openDrawer, search, refreshTrigger]); // Добавили refreshTrigger
  
  useEffect(() => {
    setPage(1);
  }, [search.gym, search.gymId, search.sex]);

  const filteredContacts = useMemo(() => {
    const normalizedContacts = serverContacts.filter(
      (contact) => contact.data !== null && contact.data?.isActive !== false
    );

    return normalizedContacts.sort((a, b) => {
      const aSurname = (a.data?.surname || '').toLowerCase();
      const bSurname = (b.data?.surname || '').toLowerCase();
      return aSurname.localeCompare(bSurname, 'uk');
    });
  }, [serverContacts]);

  const pageQty = Math.ceil(filteredContacts.length / limit);
  const paginatedContacts = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredContacts.slice(start, start + limit);
  }, [filteredContacts, page, limit]);

  useEffect(() => {
    if (pageQty > 0 && page > pageQty) {
      setPage(pageQty);
    }
  }, [pageQty, page]);

  return (
    <div className={styles.listAddClients}>
      <div className={styles.clientList}>
        <div className={styles.features}>
          <div className={styles.fieldset}>
            {paginatedContacts
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

        {filteredContacts.length > limit && pageQty > 1 && (
          <div className={styles.pagination}>
            {Array.from({ length: pageQty }, (_, index) => {
              const pageNumber = index + 1;
              const isActive = pageNumber === page;

              return (
                <button
                  key={pageNumber}
                  type="button"
                  className={`${styles.pageButton} ${isActive ? styles.pageButtonActive : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
