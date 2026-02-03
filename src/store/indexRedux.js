// ✅ SECURITY FIX: Безопасная загрузка из localStorage с обработкой ошибок
const loadContactsFromStorage = () => {
  try {
    const stored = localStorage.getItem("contacts");
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    // Проверяем что это массив
    if (!Array.isArray(parsed)) {
      console.warn('Invalid contacts data in localStorage, resetting to empty array');
      localStorage.removeItem("contacts");
      return [];
    }
    return parsed;
  } catch (error) {
    console.error('Error parsing contacts from localStorage:', error);
    // Очищаем поврежденные данные
    localStorage.removeItem("contacts");
    return [];
  }
};

const init = {
   contactArray: loadContactsFromStorage(),
};

export default function rootReducer(state = init, action) {

  if (action.type === "ADD_CONTACTS") {
    const temp = [...state.contactArray, action.payload];
    // ✅ Сохраняем в localStorage
    try {
      localStorage.setItem("contacts", JSON.stringify(temp));
    } catch (error) {
      console.error('Error saving contacts to localStorage:', error);
    }
    return {
      contactArray: temp,
    };
  }

  if (action.type === "CONTACTS_DELETE") {
    const temp = state.contactArray.filter(
      (contact) => contact.id !== action.payload
    );
    // ✅ Сохраняем в localStorage
    try {
      localStorage.setItem("contacts", JSON.stringify(temp));
    } catch (error) {
      console.error('Error saving contacts to localStorage:', error);
    }
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

    // ✅ Сохраняем в localStorage
    try {
      localStorage.setItem("contacts", JSON.stringify(updatedContacts));
    } catch (error) {
      console.error('Error saving contacts to localStorage:', error);
    }

    return {
      contactArray: updatedContacts,
    };
  }
  return state;
}
