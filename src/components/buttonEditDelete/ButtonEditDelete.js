

export default function ButtonEditDelete({onDeleteContactClient,onEditContactClient,contact,toggleDrawer}) {
return (

<div className='button_block'>
<button
                  className='buttonDel'
                   onClick={(e) => toggleDrawer(e)}
                    //  onClick={() => onEditContactClient(contact.id)}
                >
                  Edit
                </button>
                <button
                  className='buttonDel'
                 
                  onClick={() => onDeleteContactClient(contact.id)}
                >
                  <span>Del</span>
                </button>
                
              </div>

);
}