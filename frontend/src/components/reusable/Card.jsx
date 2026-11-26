import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
