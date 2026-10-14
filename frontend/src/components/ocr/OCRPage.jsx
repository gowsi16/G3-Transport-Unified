import React, { useState, useEffect, useRef } from 'react';
import { Upload, Edit, Save, XCircle } from 'lucide-react';
import InputField from '../common/InputField';
import EditableField from './EditableField';
import EditableItem from './EditableItem';

import { api } from '../../utils/api';

const OCRPage = ({ onSaveTrip, showNotification, currentUser, fetchTrips }) => {
    const [mode, setMode] = useState('excel'); // 'ocr', 'manual' or 'excel'
    const [imagePreview, setImagePreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [billData, setBillData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const originalBillData = useRef(null);
    
    const [manualForm, setManualForm] = useState({
        billNo: '', date: '', vehicleNo: '', driverName: '',
        income1: 0, income2: 0,
        pooja: 0, commission: 0, unloading: 0, police: 0, parking: 0, tarpaulin: 0, batta: 0, toll: 0, fuel: 0, other: 0,
        totalIncome: 0, totalExpenses: 0, remaining: 0
    });

    useEffect(() => {
        const totalIncome = (manualForm.income1 || 0) + (manualForm.income2 || 0);
        const totalExpenses = (manualForm.pooja || 0) + (manualForm.commission || 0) + (manualForm.unloading || 0) + (manualForm.police || 0) + (manualForm.parking || 0) + (manualForm.tarpaulin || 0) + (manualForm.batta || 0) + (manualForm.toll || 0) + (manualForm.fuel || 0) + (manualForm.other || 0);
        const remaining = totalIncome - totalExpenses;
        setManualForm(prev => ({ ...prev, totalIncome, totalExpenses, remaining }));
    }, [manualForm.income1, manualForm.income2, manualForm.pooja, manualForm.commission, manualForm.unloading, manualForm.police, manualForm.parking, manualForm.tarpaulin, manualForm.batta, manualForm.toll, manualForm.fuel, manualForm.other]);

    const mistralOcrSimulation = () => {
        setIsProcessing(true);
        setTimeout(() => {
            const rawText = `G3 TRANSPORT - TRIP EXPENSE BILL\n3/93, Kalaignar Street, Vellalagundam, Vazhapady Taluk, Salem - 636111.\nMobile: 94882 89991\nGST No.: 33CGJPB4116R1ZA\nBill No: 01 Date: 07/03/2025\nVehicle No: TN77AY3006 Driver Name: Murugan\nTrip Details:\nS.NO | Description | Amount(₹)\n1 | Salem - Chennai (சேலம் - சென்னை) | 16000\n2 | Chennai - Salem (சென்னை - சேலம்) | 31700\nTotal Income(மொத்த வருமானம்) | 47700\n3 | Pooja Expense (பூஜை செலவு) | 50\n4 | Salem Commission (சேலம் கமிஷன்) | 900\n5 | Unloading Charges (இறக்கம் கட்டணம்) | 8756\n6 | Police Charge - PC (போலீஸ் செலவு) | 300\n7 | Parking Fee (பார்க்கிங் கட்டணம்) | 850\n8 | Tarpaulin Rent (தார்பாய் வாடகை) | 500\n9 | Driver Batta (டிரைவர் பேட்டா) | 7200\n10 | Toll Charges (டோல் கட்டணம்) |\n11 | Fuel (டீசல்) |\n12 | Other (கூடுதல் செலவு) |\nTotal Expenses | 17956\nAdvance Paid: ₹\nBalance to Settle: ₹`;
            const parsedData = parseBillText(rawText);
            setBillData(parsedData);
            originalBillData.current = JSON.parse(JSON.stringify(parsedData));
            setIsProcessing(false);
            showNotification('OCR processing complete!', 'success');
        }, 2000);
    };

    const parseBillText = (text) => {
        const getVal = (regex, defaultValue = '') => (text.match(regex) || [])[1]?.trim() || defaultValue;
        
        const billNo = getVal(/Bill No:\s*(\S+)/);
        const date = getVal(/Date:\s*(\S+)/);
        const vehicleNo = getVal(/Vehicle No:\s*(\S+)/);
        const driverName = getVal(/Driver Name:\s*(\S+)/);

        const lines = text.split('\n');
        const incomeItems = [];
        const expenseItems = [];
        
        const itemRegex = /^\d+\s*\|\s*(.*?)\s*\|\s*(\d+)/;
        const expenseKeywords = ['pooja', 'commission', 'unloading', 'police', 'parking', 'tarpaulin', 'batta', 'toll', 'fuel', 'other'];

        let inIncomeSection = false;
        for (const line of lines) {
            if (line.toLowerCase().includes('total income')) inIncomeSection = false;
            if (line.toLowerCase().includes('s.no')) { inIncomeSection = true; continue; }
            if (!inIncomeSection) continue;
            
            const match = line.match(itemRegex);
            if(match) {
                const description = match[1].trim();
                const amount = parseInt(match[2], 10);
                if (!expenseKeywords.some(kw => description.toLowerCase().includes(kw))) {
                    incomeItems.push({ description, amount });
                }
            }
        }
        
        let inExpenseSection = false;
        for (const line of lines) {
            if (line.toLowerCase().includes('total income')) { inExpenseSection = true; continue; }
            if (line.toLowerCase().includes('total expenses')) inExpenseSection = false;
            if (!inExpenseSection) continue;

            const match = line.match(itemRegex);
            if(match) {
                const description = match[1].trim();
                const amount = parseInt(match[2], 10);
                expenseItems.push({ description, amount });
            }
        }

        const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
        const totalExpense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
        const remaining = totalIncome - totalExpense;

        return { billNo, date, vehicleNo, driverName, incomeItems, expenseItems, totalIncome, totalExpense, remaining };
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file));
            setBillData(null);
            setIsEditing(false);
            mistralOcrSimulation();
        }
    };

    const handleDataChange = (e, itemType, index) => {
        const { name, value } = e.target;
        setBillData(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData));
            if (itemType === 'income' || itemType === 'expense') {
                const items = itemType === 'income' ? newData.incomeItems : newData.expenseItems;
                items[index] = { ...items[index], [name]: name === 'amount' ? parseInt(value, 10) || 0 : value };
            } else {
                newData[name] = value;
            }
            const totalIncome = newData.incomeItems.reduce((sum, item) => sum + item.amount, 0);
            const totalExpense = newData.expenseItems.reduce((sum, item) => sum + item.amount, 0);
            newData.totalIncome = totalIncome;
            newData.totalExpense = totalExpense;
            newData.remaining = totalIncome - totalExpense;
            return newData;
        });
    };

    const handleCancelEdit = () => {
        setBillData(originalBillData.current);
        setIsEditing(false);
    };
    
    const handleManualFormChange = (e) => {
        const { name, value, type } = e.target;
        setManualForm(prev => ({...prev, [name]: type === 'number' ? parseInt(value, 10) || 0 : value }));
    };

    const handleManualSave = () => {
        const newTrip = {
            id: `MANUAL-${manualForm.billNo || Date.now()}`,
            date: manualForm.date,
            from_city: 'Manual',
            to_city: 'Entry',
            vehicle_no: manualForm.vehicleNo,
            driverName: manualForm.driverName,
            revenue: manualForm.totalIncome,
            incomeItems: [
                { description: 'Trip Income - Salem→Chennai', amount: manualForm.income1 },
                { description: 'Trip Income - Chennai→Salem', amount: manualForm.income2 },
            ].filter(item => item.amount > 0),
            expenseItems: [
                { description: 'Pooja Expense', amount: manualForm.pooja },
                { description: 'Salem Commission', amount: manualForm.commission },
                { description: 'Unloading Charges', amount: manualForm.unloading },
                { description: 'Police Charge', amount: manualForm.police },
                { description: 'Parking Fee', amount: manualForm.parking },
                { description: 'Tarpaulin Rent', amount: manualForm.tarpaulin },
                { description: 'Driver Batta', amount: manualForm.batta },
                { description: 'Toll Charges', amount: manualForm.toll },
                { description: 'Fuel', amount: manualForm.fuel },
                { description: 'Other Expense', amount: manualForm.other },
            ].filter(item => item.amount > 0),
            notes: `Manual entry by ${currentUser.name}.`
        };
        onSaveTrip(newTrip);
        setManualForm({ billNo: '', date: '', vehicleNo: '', driverName: '', income1: 0, income2: 0, pooja: 0, commission: 0, unloading: 0, police: 0, parking: 0, tarpaulin: 0, batta: 0, toll: 0, fuel: 0, other: 0, totalIncome: 0, totalExpenses: 0, remaining: 0 });
    };

    const handleSaveToDatabase = () => {
        if (!billData) return;
        const newTrip = {
            id: `BILL-${billData.billNo}`,
            date: billData.date.split('/').reverse().join('-'),
            from_city: 'Salem',
            to_city: 'Chennai',
            vehicle_no: billData.vehicleNo,
            driverName: billData.driverName,
            revenue: billData.totalIncome,
            incomeItems: billData.incomeItems,
            expenseItems: billData.expenseItems,
            notes: `OCR entry for driver ${billData.driverName}.`
        };
        onSaveTrip(newTrip);
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsProcessing(true);
        try {
            const res = await api.uploadExcel(file);
            showNotification(`Successfully imported ${res.count} trips from Excel!`, 'success');
            if (fetchTrips) fetchTrips(); // Reload trips
        } catch (error) {
            console.error(error);
            showNotification('Failed to upload Excel file.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Bill Processing</h1>
                <div className="flex items-center space-x-2 p-1 bg-gray-200 rounded-lg">
                    <button onClick={() => setMode('excel')} className={`px-4 py-1 rounded-md text-sm font-medium ${mode === 'excel' ? 'bg-white shadow' : 'text-gray-600'}`}>Excel Upload</button>
                    <button onClick={() => setMode('manual')} className={`px-4 py-1 rounded-md text-sm font-medium ${mode === 'manual' ? 'bg-white shadow' : 'text-gray-600'}`}>Manual Entry</button>
                    <button onClick={() => setMode('ocr')} className={`px-4 py-1 rounded-md text-sm font-medium ${mode === 'ocr' ? 'bg-white shadow' : 'text-gray-600'}`}>OCR Processing</button>
                </div>
            </div>

            {mode === 'excel' && (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Bulk Excel Import</h2>
                    <p className="text-gray-600 mb-4">Upload your G3 Calculation Sheet (.xlsx) to bulk import all trips at once.</p>
                    
                    <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-12 text-center max-w-xl mx-auto">
                        <input type="file" id="excel-upload" className="hidden" onChange={handleExcelUpload} accept=".xlsx, .xls" />
                        <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
                            <Upload className="h-16 w-16 text-blue-500 mb-4" />
                            <span className="text-lg font-semibold text-blue-700">Click to Select Excel File</span>
                            <span className="text-sm text-blue-500 mt-2">Only .xlsx or .xls files supported</span>
                        </label>
                    </div>

                    {isProcessing && (
                        <div className="mt-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-600 font-medium">Uploading and processing trips...</p>
                        </div>
                    )}
                </div>
            )}

            {mode === 'ocr' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-xl font-semibold mb-4">1. Upload Handwritten Bill</h2>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <input type="file" id="bill-upload" className="hidden" onChange={handleFileChange} accept="image/jpeg, image/png" />
                            <label htmlFor="bill-upload" className="cursor-pointer">
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600">Click to upload image</p>
                            </label>
                        </div>
                        {isProcessing && (
                            <div className="mt-4 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Analyzing with OCR...</p>
                            </div>
                        )}
                        {imagePreview && !isProcessing && (
                            <div className="mt-4">
                                <h3 className="font-semibold mb-2">Image Preview:</h3>
                                <img src={imagePreview} alt="Bill Preview" className="w-full rounded-lg border" />
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">2. Analyzed Bill Data</h2>
                            {billData && !isEditing && (
                                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 py-1 px-3 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600">
                                    <Edit size={14} /> Edit
                                </button>
                            )}
                            {billData && isEditing && (
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 py-1 px-3 bg-green-500 text-white rounded-md text-sm hover:bg-green-600">
                                        <Save size={14} /> Save
                                    </button>
                                    <button onClick={handleCancelEdit} className="flex items-center gap-2 py-1 px-3 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600">
                                        <XCircle size={14} /> Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                        {!billData ? (
                            <p className="text-gray-500">Upload an image to see the analyzed data.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <EditableField label="Bill No" name="billNo" value={billData.billNo} isEditing={isEditing} onChange={handleDataChange} />
                                    <EditableField label="Date" name="date" value={billData.date} isEditing={isEditing} onChange={handleDataChange} />
                                    <EditableField label="Vehicle No" name="vehicleNo" value={billData.vehicleNo} isEditing={isEditing} onChange={handleDataChange} />
                                    <EditableField label="Driver" name="driverName" value={billData.driverName} isEditing={isEditing} onChange={handleDataChange} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold text-green-700 mb-2">Income</h3>
                                        {billData.incomeItems.map((item, i) => (
                                            <EditableItem key={i} item={item} index={i} type="income" isEditing={isEditing} onChange={handleDataChange} />
                                        ))}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-red-700 mb-2">Expenses</h3>
                                        {billData.expenseItems.map((item, i) => (
                                            <EditableItem key={i} item={item} index={i} type="expense" isEditing={isEditing} onChange={handleDataChange} />
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t pt-4 space-y-2">
                                    <div className="flex justify-between font-bold text-lg">
                                        <p>Total Income</p>
                                        <p className="text-green-600">₹{billData.totalIncome.toLocaleString()}</p>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg">
                                        <p>Total Expenses</p>
                                        <p className="text-red-600">₹{billData.totalExpense.toLocaleString()}</p>
                                    </div>
                                    <div className="flex justify-between font-bold text-xl bg-yellow-100 p-2 rounded">
                                        <p>Remaining Balance</p>
                                        <p>₹{billData.remaining.toLocaleString()}</p>
                                    </div>
                                </div>
                                {!isEditing && (
                                    <div className="flex space-x-4 pt-4">
                                        <button onClick={handleSaveToDatabase} className="w-full py-2 px-4 bg-green-700 text-white hover:bg-green-800 transition-colors">
                                            Save to Database
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {mode === 'manual' && (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Manual Trip Entry</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <InputField label="Bill No" name="billNo" value={manualForm.billNo} onChange={handleManualFormChange} />
                        <InputField label="Date" name="date" type="date" value={manualForm.date} onChange={handleManualFormChange} />
                        <InputField label="Vehicle No" name="vehicleNo" value={manualForm.vehicleNo} onChange={handleManualFormChange} />
                        <InputField label="Driver Name" name="driverName" value={manualForm.driverName} onChange={handleManualFormChange} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div>
                            <h3 className="font-semibold text-lg text-green-700 mb-4">Income</h3>
                            <div className="space-y-4">
                                <InputField label="Trip Income - Salem→Chennai" name="income1" type="number" value={manualForm.income1} onChange={handleManualFormChange} />
                                <InputField label="Trip Income - Chennai→Salem" name="income2" type="number" value={manualForm.income2} onChange={handleManualFormChange} />
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <h3 className="font-semibold text-lg text-red-700 mb-4">Expenses</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField label="Pooja Expense" name="pooja" type="number" value={manualForm.pooja} onChange={handleManualFormChange} />
                                <InputField label="Salem Commission" name="commission" type="number" value={manualForm.commission} onChange={handleManualFormChange} />
                                <InputField label="Unloading Charges" name="unloading" type="number" value={manualForm.unloading} onChange={handleManualFormChange} />
                                <InputField label="Police Charge" name="police" type="number" value={manualForm.police} onChange={handleManualFormChange} />
                                <InputField label="Parking Fee" name="parking" type="number" value={manualForm.parking} onChange={handleManualFormChange} />
                                <InputField label="Tarpaulin Rent" name="tarpaulin" type="number" value={manualForm.tarpaulin} onChange={handleManualFormChange} />
                                <InputField label="Driver Batta" name="batta" type="number" value={manualForm.batta} onChange={handleManualFormChange} />
                                <InputField label="Toll Charges" name="toll" type="number" value={manualForm.toll} onChange={handleManualFormChange} />
                                <InputField label="Fuel" name="fuel" type="number" value={manualForm.fuel} onChange={handleManualFormChange} />
                                <InputField label="Other Expense" name="other" type="number" value={manualForm.other} onChange={handleManualFormChange} />
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 border-t pt-6">
                        <div className="max-w-sm ml-auto space-y-2">
                            <div className="flex justify-between font-bold text-lg">
                                <p>Total Income</p>
                                <p className="text-green-600">₹{manualForm.totalIncome.toLocaleString()}</p>
                            </div>
                            <div className="flex justify-between font-bold text-lg">
                                <p>Total Expenses</p>
                                <p className="text-red-600">₹{manualForm.totalExpenses.toLocaleString()}</p>
                            </div>
                            <div className="flex justify-between font-bold text-xl bg-yellow-100 p-2 rounded">
                                <p>Remaining Balance</p>
                                <p>₹{manualForm.remaining.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="text-right mt-6">
                            <button onClick={handleManualSave} className="py-2 px-6 bg-green-600 text-white rounded-md hover:bg-green-700">
                                Save Manual Trip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OCRPage;
