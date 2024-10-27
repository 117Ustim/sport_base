import React, { useState } from 'react';
import axios from 'axios';
const SearchComponent = ( {data }) => {console.log(data,'fffff')

 
  

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

    // console.log(searchTerm,'nnnnn')

  const handleSearchChange = (event) => {
    const searchTerm = event.target.value;
    setSearchTerm(searchTerm);

    // Выполняем поиск в данных
    const filteredResults = [data].filter(item =>
      item.includes(searchTerm)
    );

     setSearchResults(filteredResults);
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Введите текст для поиска..."
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <ul>
        {searchResults.map((item, index) => (
           <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default SearchComponent;






