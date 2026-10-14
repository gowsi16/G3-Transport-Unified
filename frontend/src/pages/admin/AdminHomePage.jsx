import React from 'react';
import { FaTruck, FaUserTie, FaMoneyBillWave, FaChartLine, FaRupeeSign, FaExchangeAlt } from 'react-icons/fa';
import { useDashboardData } from '../../hooks/useDashboardData';
import { formatCurrency } from '../../utils/format';
import { Skeleton } from '../../components/ui/Skeleton';

const QuickStatsCard = ({ icon, title, value, change, isPositive, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white p-6 border border-green-200 shadow-md">
        <div className="flex items-center">
          <Skeleton className="w-12 h-12 bg-green-100" />
          <div className="ml-4 flex-1">
            <Skeleton className="h-4 w-24 mb-2 bg-green-100" />
            <Skeleton className="h-8 w-32 mb-1 bg-green-100" />
            <Skeleton className="h-3 w-20 bg-green-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 border border-green-200 shadow-md hover:shadow-lg transition-shadow duration-300 h-full">
      <div className="flex items-center">
        <div className="p-3 bg-green-100 text-green-700">
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-green-800">
            {title.includes('Profit') || title.includes('Income') || title.includes('Expense') 
              ? formatCurrency(value) 
              : value}
          </p>
          {change !== undefined && (
            <p className={`text-sm ${isPositive ? 'text-green-700' : 'text-red-600'} flex items-center`}>
              {isPositive ? '↑' : '↓'} {Math.abs(change)}% from last month
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const HomePage = ({ trips = [] }) => {
  // Calculate stats directly from trips data
  const calculateStats = (tripsData) => {
    if (!tripsData || tripsData.length === 0) {
      return {
        activeDrivers: 0,
        activeLorries: 0,
        monthlyProfit: 0,
        monthlyTrips: 0,
        totalIncome: 0,
        totalExpenses: 0
      };
    }

    const totalTrips = tripsData.length;
    const totalIncome = tripsData.reduce((sum, trip) => sum + (trip.revenue || 0), 0);
    const totalExpenses = tripsData.reduce((sum, trip) => sum + (trip.total_expense || 0), 0);
    const totalProfit = totalIncome - totalExpenses;
    
    // Count active drivers
    const activeDrivers = new Set(
      tripsData
        .map(trip => trip.driverName)
        .filter(name => name)
    ).size;

    // Count active lorries
    const activeLorries = new Set(
      tripsData
        .map(trip => trip.vehicle_no)
        .filter(vehicle => vehicle)
    ).size;

    return {
      activeDrivers,
      activeLorries,
      monthlyProfit: totalProfit,
      monthlyTrips: totalTrips,
      totalIncome,
      totalExpenses
    };
  };

  const stats = calculateStats(trips);
  const loading = false;
  const error = null;
  
  // Mock data for percentage changes (in a real app, this would come from your API)
  const changes = {};

  return (
    <div className="w-full">
      <header className="bg-green-700 text-white text-center py-20 px-4">
        <h1 className="text-5xl font-extrabold">Efficient, Reliable, Automated</h1>
        <p className="mt-4 text-xl max-w-3xl mx-auto">
          Welcome to G3 Transport, the future of logistics management. Our platform transforms complex trip data into actionable insights, 
          automating everything from OCR data entry to financial analysis.
        </p>
      </header>

      {/* Quick Stats Section */}
      <section className="py-12 bg-green-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Quick Overview</h2>
          
          {error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickStatsCard 
              icon={<FaUserTie size={24} />} 
              title="Active Drivers" 
              value={stats.activeDrivers}
              change={changes.activeDrivers}
              isPositive={changes.activeDrivers >= 0}
              loading={loading}
            />
            <QuickStatsCard 
              icon={<FaTruck size={24} />} 
              title="Active Lorries" 
              value={stats.activeLorries}
              change={changes.activeLorries}
              isPositive={changes.activeLorries >= 0}
              loading={loading}
            />
            <QuickStatsCard 
              icon={<FaChartLine size={24} />} 
              title="Monthly Trips" 
              value={stats.monthlyTrips}
              change={changes.monthlyTrips}
              isPositive={changes.monthlyTrips >= 0}
              loading={loading}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <QuickStatsCard 
              icon={<FaMoneyBillWave size={24} />} 
              title="Monthly Profit" 
              value={stats.monthlyProfit}
              change={changes.monthlyProfit}
              isPositive={stats.monthlyProfit >= 0}
              loading={loading}
            />
            <QuickStatsCard 
              icon={<FaExchangeAlt size={24} />} 
              title="Monthly Income" 
              value={stats.totalIncome}
              change={changes.totalIncome}
              isPositive={changes.totalIncome >= 0}
              loading={loading}
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">About G3 Transport</h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-600">
              G3 Transport was founded with a single mission: to simplify the complexities of the transport industry through technology. 
              We understand the challenges of manual record-keeping, invoice generation, and business analysis. Our all-in-one solution 
              leverages cutting-edge OCR and data analytics to provide a seamless, end-to-end transport automation system that saves you 
              time, reduces errors, and boosts your bottom line.
            </p>
          </div>
        </div>
      </section>
    </div>
    );
};

export default HomePage;
