import React from 'react';
import { motion } from 'framer-motion';

const AnalyticsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  subtitle, 
  trend,
  animated = false,
  className = '',
  children,
  ...props 
}) => {
  const cardClasses = `bg-white shadow-md rounded-2xl p-6 border border-gray-200 ${className}`;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={cardClasses}
      {...props}
    >
      {animated && <div className="bg-white rounded-2xl p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-3 bg-primary-100 rounded-xl">
                <Icon className="text-primary-600" size={24} />
              </div>
            )}
            <h3 className="font-semibold text-gray-800">{title}</h3>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-3xl font-bold text-primary-600">{value}</p>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          {trend && (
            <div className={`text-sm font-medium ${trend > 0 ? 'text-primary-600' : 'text-secondary-600'}`}>
              {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        {children}
      </div>}
      
      {!animated && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="p-3 bg-primary-100 rounded-xl">
                  <Icon className="text-primary-600" size={24} />
                </div>
              )}
              <h3 className="font-semibold text-gray-800">{title}</h3>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            {trend && (
              <div className={`text-sm font-medium ${trend > 0 ? 'text-primary-600' : 'text-secondary-600'}`}>
                {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
              </div>
            )}
          </div>
          
          {children}
        </>
      )}
    </motion.div>
  );
};

export default AnalyticsCard;
