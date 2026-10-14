import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export const useDashboardData = () => {
    const [dashboardData, setDashboardData] = useState({
        stats: {},
        loading: true,
        error: null
    });
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const trips = await api.getTrips();
                
                // Calculate stats
                const totalTrips = trips.length;
                const totalIncome = trips.reduce((sum, trip) => sum + (trip.revenue || 0), 0);
                const totalExpenses = trips.reduce((sum, trip) => sum + (trip.total_expense || 0), 0);
                const totalProfit = totalIncome - totalExpenses;
                
                // Count active drivers (assuming driver is active if they have trips in the last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const activeDrivers = new Set(
                    trips
                        .filter(trip => new Date(trip.date) > thirtyDaysAgo)
                        .map(trip => trip.driverName)
                ).size;

                // Count active lorries (assuming lorry is active if used in the last 30 days)
                const activeLorries = new Set(
                    trips
                        .filter(trip => new Date(trip.date) > thirtyDaysAgo)
                        .map(trip => trip.vehicle_number)
                ).size;

                setDashboardData({
                    stats: {
                        activeDrivers,
                        activeLorries,
                        monthlyProfit: totalProfit,
                        monthlyTrips: totalTrips,
                        totalIncome,
                        totalExpenses
                    },
                    loading: false,
                    error: null
                });
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                setDashboardData(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Failed to load dashboard data'
                }));
            }
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    return dashboardData;
};
