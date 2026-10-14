export const calculateTripMetrics = (trip) => {
    let total_expense;
    if (trip.expenseItems && trip.expenseItems.length > 0) {
        total_expense = trip.expenseItems.reduce((sum, item) => sum + item.amount, 0);
    } else {
        total_expense = (trip.fuel_cost || 0) + (trip.toll_cost || 0) + (trip.driver_wage || 0) + (trip.commission || 0) + (trip.other_expenses || 0);
    }
    const profit = (trip.revenue || 0) - total_expense;
    return { ...trip, total_expense, profit };
};
