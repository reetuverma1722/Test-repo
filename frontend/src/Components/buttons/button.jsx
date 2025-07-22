import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';

const Button = ({ label, onClick }) => {
  return (
    <button className="button" onClick={onClick}>
      {label}
      <FontAwesomeIcon icon={faCoffee} />
    </button>
  );
};

export default Button;