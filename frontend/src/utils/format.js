export const formatCurrency = (value) => {
  if (value === undefined || value === null) return '₹0';
  
  // Format number to Indian Rupees
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};
