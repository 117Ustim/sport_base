

const init = {
   contactArray: JSON.parse(localStorage.getItem("contacts") ?? "[]"),
};

export default function rootReducer(state = init, action) {

  if (action.type === "ADD_CONTACTS") {
    const temp = [...state.contactArray, action.payload];
    return {
      contactArray: temp,
    };
  }

  if (action.type === "CONTACTS_DELETE") {
    const temp = state.contactArray.filter(
      (contact) => contact.id !== action.payload
    );
    return {
      contactArray: temp,
    };
  }

  if (action.type === "CONTACTS_EDIT") {
    const temp = state.contactArray.findIndex((el) => el.id === action.payload.id);
    const updatedContacts = [...state.contactArray]; 
   
    if (temp !== -1) {     
      updatedContacts.splice(temp, 1, action.payload);
    }

    return {
      contactArray: updatedContacts,
    };
  }
  return state;
}
