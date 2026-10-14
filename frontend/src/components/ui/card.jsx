import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ 
  children, 
  className = '', 
  hover = false, 
  padding = 'p-6',
  ...props 
}) => {
  const baseClasses = 'bg-white shadow-md rounded-2xl';
  const hoverClasses = hover ? 'hover:shadow-lg transition-shadow duration-200' : '';
  const cardClasses = `${baseClasses} ${padding} ${hoverClasses} ${className}`;

  const CardComponent = hover ? motion.div : 'div';
  const motionProps = hover ? {
    whileHover: { y: -2 },
    transition: { duration: 0.2 }
  } : {};

  return (
    <CardComponent
      className={cardClasses}
      {...motionProps}
      {...props}
    >
      {children}
    </CardComponent>
  );
};

export default Card;
