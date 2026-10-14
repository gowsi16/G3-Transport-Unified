import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import InputField from '../common/InputField';
import Button from '../ui/Button';
import Card from '../ui/Card';

const TripsPage = ({ trips, onUpdateTrip, onDeleteTrip, onBulkDeleteTrips }) => {
    const [filteredTrips, setFilteredTrips] = useState(trips);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingTrip, setEditingTrip] = useState(null);
    const [selectedTrips, setSelectedTrips] = useState([]);

    useEffect(() => {
        setFilteredTrips(
            trips.filter(trip =>
                trip.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                `${trip.from_city} to ${trip.to_city}`.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
        // Clear selection when filters change (optional, but good UX to avoid invisible selections)
        setSelectedTrips([]);
    }, [searchTerm, trips]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedTrips(filteredTrips.map(t => t.id));
        } else {
            setSelectedTrips([]);
        }
    };

    const handleSelectTrip = (id) => {
        setSelectedTrips(prev => 
            prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        if (selectedTrips.length > 0 && onBulkDeleteTrips) {
            onBulkDeleteTrips(selectedTrips);
            setSelectedTrips([]);
        }
    };

    const handleEdit = (trip) => setEditingTrip({...trip});
    const handleSaveEdit = () => { onUpdateTrip(editingTrip); setEditingTrip(null); };
    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        const isNumericField = ['fuel_cost', 'toll_cost', 'driver_wage', 'commission', 'other_expenses', 'revenue'].includes(name);
        setEditingTrip(prev => ({ ...prev, [name]: isNumericField ? Number(value) : value }));
    };

    const downloadCSV = () => {
        // Define CSV headers
        const headers = [
            'Trip ID',
            'Date',
            'From City',
            'To City',
            'Vehicle No',
            'Driver Name',
            'Revenue',
            'Fuel Cost',
            'Toll Cost',
            'Driver Wage',
            'Commission',
            'Other Expenses',
            'Total Expense',
            'Profit'
        ];

        // Convert trips data to CSV format
        const csvData = filteredTrips.map(trip => [
            trip.id,
            trip.date,
            trip.from_city,
            trip.to_city,
            trip.vehicle_no || '',
            trip.driverName || '',
            trip.revenue,
            trip.fuel_cost || 0,
            trip.toll_cost || 0,
            trip.driver_wage || 0,
            trip.commission || 0,
            trip.other_expenses || 0,
            trip.total_expense,
            trip.profit
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => 
                typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
            ).join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `trips_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto p-4 sm:p-6 lg:p-8"
        >
            <Card className="">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">Trip Records</h1>
                    <div className="flex gap-2">
                        {selectedTrips.length > 0 && (
                            <Button 
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                            >
                                <Trash2 size={18} />
                                Delete Selected ({selectedTrips.length})
                            </Button>
                        )}
                        <Button 
                            onClick={downloadCSV}
                            variant="primary"
                            className="flex items-center gap-2"
                        >
                            <Download size={18} />
                            Download CSV
                        </Button>
                    </div>
                </div>
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search by ID or Route..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full max-w-sm pl-10 p-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" 
                    />
                </div>
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-primary-50">
                            <tr>
                                <th className="px-6 py-4 text-left">
                                    <input 
                                        type="checkbox" 
                                        className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer w-4 h-4"
                                        checked={filteredTrips.length > 0 && selectedTrips.length === filteredTrips.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                {['Trip ID', 'Date', 'Route', 'Total Expense', 'Revenue', 'Profit', 'Actions'].map(header => (
                                    <th key={header} className="px-6 py-4 text-left text-sm font-semibold text-primary-800 uppercase tracking-wider">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTrips.map((trip, index) => (
                                <motion.tr 
                                    key={trip.id} 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className={`hover:bg-primary-50 transition-colors ${selectedTrips.includes(trip.id) ? 'bg-blue-50' : ''}`}
                                >
                                    <td className="px-6 py-4">
                                        <input 
                                            type="checkbox" 
                                            className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer w-4 h-4"
                                            checked={selectedTrips.includes(trip.id)}
                                            onChange={() => handleSelectTrip(trip.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trip.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trip.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trip.from_city} → {trip.to_city}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{trip.total_expense.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{trip.revenue.toLocaleString()}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${trip.profit >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
                                        ₹{trip.profit.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-3">
                                            <button 
                                                onClick={() => handleEdit(trip)} 
                                                className="text-secondary-600 hover:text-secondary-800 p-1 rounded-lg hover:bg-secondary-50 transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => onDeleteTrip(trip.id)} 
                                                className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {editingTrip && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                        >
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Trip: {editingTrip.id}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <InputField label="Date" name="date" type="date" value={editingTrip.date} onChange={handleEditInputChange} />
                               <InputField label="From City" name="from_city" value={editingTrip.from_city} onChange={handleEditInputChange} />
                               <InputField label="To City" name="to_city" value={editingTrip.to_city} onChange={handleEditInputChange} />
                               <InputField label="Revenue" name="revenue" type="number" value={editingTrip.revenue} onChange={handleEditInputChange} />
                               <InputField label="Fuel Cost" name="fuel_cost" type="number" value={editingTrip.fuel_cost} onChange={handleEditInputChange} />
                               <InputField label="Toll Cost" name="toll_cost" type="number" value={editingTrip.toll_cost} onChange={handleEditInputChange} />
                               <InputField label="Driver Wage" name="driver_wage" type="number" value={editingTrip.driver_wage} onChange={handleEditInputChange} />
                               <InputField label="Commission" name="commission" type="number" value={editingTrip.commission} onChange={handleEditInputChange} />
                            </div>
                            <div className="mt-6 flex justify-end space-x-4">
                                <Button 
                                    onClick={() => setEditingTrip(null)} 
                                    variant="ghost"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleSaveEdit} 
                                    variant="primary"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </Card>
        </motion.div>
    );
};

export default TripsPage;
