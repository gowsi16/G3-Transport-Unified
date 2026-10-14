import React from 'react';

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div 
      className={`bg-gray-200 rounded animate-pulse ${className}`}
      {...props}
    />
  );
};

export default Skeleton;
