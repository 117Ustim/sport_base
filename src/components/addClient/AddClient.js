export default function AddClient({ contacts, onChange, onAddContactClick }) {
  return (
    <div className='addClient'>
       
      <div className='form-add'>

     
        <div className='add_input'>
          <div className='segment'>
            <h1>Додати клiента</h1>
          </div>
          <input
            placeholder='Призвiще'
            value={contacts.surname}
            onChange={onChange}
            name='surname'
          />
          <input
            placeholder="Iм'я"
            value={contacts.name}
            name='name'
            onChange={onChange}
          />
          <input
            placeholder='Телефон'
            value={+contacts.phone || ''}
            name='phone'
            onChange={onChange}
          />

          <select value={contacts.sex || ''} name='sex' onChange={onChange}>
            <option className='select' value={''} defaultValue={''}>
              Стать
            </option>
            <option value={'Чоловiча'}>Чоловiча</option>
            <option value={'Жiноча'}>Жiноча</option>
          </select>

          <select value={contacts.gym || ''} name='gym' onChange={onChange}>
            <option value={''} defaultValue={''}>
              Зал
            </option>
            <option value={'Аватар'}>Аватар</option>
            <option value={'Галактика'}>Галактiка</option>
          </select>
        </div>
        <div className='add-button'>
          <button onClick={onAddContactClick} className='red' type='button'>
            <i className='icon ion-md-lock'></i>Додати
          </button>
        </div>
      </div>
    </div>
  );
}
