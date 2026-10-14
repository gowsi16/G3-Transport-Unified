import React, { useState, useRef } from 'react';
import { Download, Printer, MapPin, Calendar, User, Truck, Phone, Mail, Building } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Card, AnalyticsCard } from '../ui';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const InvoicesPage = ({ trips, showNotification }) => {
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [isCustomerCopy, setIsCustomerCopy] = useState(false);
    const invoiceRef = useRef();

    const handleTripSelect = (tripId) => setSelectedTrip(trips.find(t => t.id === tripId));
    
    const downloadPDF = () => {
        const input = invoiceRef.current;
        if (!input) { 
            showNotification('Invoice not ready. Please try again.', 'info'); 
            return; 
        }
        
        // Configure html2canvas for better quality
        const options = {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: input.scrollWidth,
            height: input.scrollHeight,
            scrollX: 0,
            scrollY: 0
        };
        
        html2canvas(input, options).then(canvas => {
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Calculate dimensions to fit A4 properly
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasAspectRatio = canvas.height / canvas.width;
            const pdfAspectRatio = pdfHeight / pdfWidth;
            
            let imgWidth = pdfWidth;
            let imgHeight = pdfWidth * canvasAspectRatio;
            
            // If image is taller than A4, scale it down
            if (imgHeight > pdfHeight) {
                imgHeight = pdfHeight;
                imgWidth = pdfHeight / canvasAspectRatio;
            }
            
            // Center the image on the page
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;
            
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            const fileName = isCustomerCopy ? `customer-invoice-${selectedTrip.id}.pdf` : `internal-invoice-${selectedTrip.id}.pdf`;
            pdf.save(fileName);
            showNotification(`${isCustomerCopy ? 'Customer' : 'Internal'} invoice downloaded as PDF!`, 'success');
        }).catch(error => {
            console.error('PDF generation error:', error);
            showNotification('Failed to generate PDF. Please try again.', 'error');
        });
    };

    const printInvoice = () => {
        const input = invoiceRef.current;
        if (!input) { 
            showNotification('Invoice not ready. Please try again.', 'info'); 
            return; 
        }
        html2canvas(input, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`<html><body><img src="${imgData}" style="width:100%;"></body></html>`);
            printWindow.document.close();
            printWindow.print();
        }).catch(error => {
            console.error('Print generation error:', error);
            showNotification('Failed to prepare print. Please try again.', 'error');
        });
    };

    const G3Logo = () => (
        <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-2xl shadow-md flex items-center justify-center">
                <div className="text-white font-bold text-2xl tracking-wider">G3</div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-400 rounded-full flex items-center justify-center">
                <Truck size={12} className="text-white" />
            </div>
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto p-4 sm:p-6 lg:p-8"
        >
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Invoice Generator</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 h-fit">
                    <h2 className="font-semibold mb-2">Select a Trip to Generate Bill</h2>
                    <select 
                        onChange={(e) => handleTripSelect(e.target.value)} 
                        className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    >
                        <option>-- Choose a trip --</option>
                        {trips.map(trip => (
                            <option key={trip.id} value={trip.id}>{trip.id}: {trip.vehicle_no}</option>
                        ))}
                    </select>
                    
                    {selectedTrip && (
                        <div className="mt-6">
                            {/* Invoice Type Toggle */}
                            <div className="mb-6">
                                <h3 className="font-semibold mb-3 text-gray-700">Invoice Type</h3>
                                <div className="flex bg-gray-100 rounded-xl p-1">
                                    <button
                                        onClick={() => setIsCustomerCopy(false)}
                                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                                            !isCustomerCopy 
                                                ? 'bg-secondary-600 text-white shadow-sm' 
                                                : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                    >
                                        Internal Copy
                                    </button>
                                    <button
                                        onClick={() => setIsCustomerCopy(true)}
                                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                                            isCustomerCopy 
                                                ? 'bg-primary-600 text-white shadow-sm' 
                                                : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                    >
                                        Customer Copy
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {isCustomerCopy ? 'Hides profit and internal expense details' : 'Shows complete financial breakdown'}
                                </p>
                            </div>
                            
                            <div className="flex space-x-4">
                                <Button variant="primary" onClick={downloadPDF} className="flex-1 flex items-center justify-center gap-2">
                                    <Download size={16} /> PDF
                                </Button>
                                <Button variant="outline" onClick={printInvoice} className="flex-1 flex items-center justify-center gap-2">
                                    <Printer size={16} /> Print
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
                <div className="lg:col-span-2">
                    <Card className="shadow-2xl border-0 overflow-hidden p-0">
                        {!selectedTrip ? (
                            <div className="text-center py-20 text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                                <Building size={48} className="mx-auto mb-4 text-gray-400" />
                                <p className="text-lg font-medium">Select a trip to preview the professional invoice</p>
                                <p className="text-sm mt-2">Choose from the dropdown to generate a detailed bill</p>
                            </div>
                        ) : (
                            <div ref={invoiceRef} className="relative">
                                {/* Professional Header */}
                                <div className="bg-white border-b-2 border-gray-800 p-8">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-6">
                                            <G3Logo />
                                            <div>
                                                <h1 className="text-3xl font-bold tracking-wide text-gray-800">G3 TRANSPORT</h1>
                                                <p className="text-gray-600 mt-1 flex items-center gap-2">
                                                    <MapPin size={14} />
                                                    3/93, Kalaignar Street, Vellalagundam, Vazhapady Taluk, Salem – 636111
                                                </p>
                                                <div className="flex gap-4 mt-2 text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <Phone size={12} />
                                                        9488289991
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Building size={12} />
                                                        GSTIN: 33CGJPB4116R1ZA
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="border-2 border-gray-800 p-4">
                                                <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-800">
                                                    {isCustomerCopy ? 'CUSTOMER INVOICE' : 'INVOICE'}
                                                </h2>
                                                <p className="text-gray-600 text-sm mt-1">
                                                    {isCustomerCopy ? 'Customer Copy' : 'Internal Copy'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Invoice details section */}
                                <div className="p-8 bg-white">
                                    {/* Trip Information Cards */}
                                    <div className="grid grid-cols-2 gap-6 mb-8">
                                        <div className="bg-gray-50 p-6 border border-gray-300">
                                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-400 pb-2">
                                                <Calendar className="text-gray-600" size={18} />
                                                Trip Details
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Bill No:</span>
                                                    <span className="font-bold text-gray-800">{selectedTrip.id}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Date:</span>
                                                    <span className="font-semibold text-gray-800">{selectedTrip.date}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Route:</span>
                                                    <span className="font-semibold text-right text-gray-800">{selectedTrip.from_city} → {selectedTrip.to_city}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-6 border border-gray-300">
                                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-400 pb-2">
                                                <Truck className="text-gray-600" size={18} />
                                                Vehicle & Driver
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Vehicle No:</span>
                                                    <span className="font-bold text-gray-800">{selectedTrip.vehicle_no}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Driver:</span>
                                                    <span className="font-semibold flex items-center gap-1 text-gray-800">
                                                        <User size={14} />
                                                        {selectedTrip.driverName || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                
                                    {/* Professional Financial Table */}
                                    <div className="bg-white border-2 border-gray-800 overflow-hidden">
                                        <div className="bg-gray-800 px-6 py-4 border-b">
                                            <h3 className="font-bold text-white text-lg">Financial Breakdown</h3>
                                        </div>
                                        
                                        {/* Income Section */}
                                        <div className="p-6">
                                            <div className="mb-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-4 h-4 bg-gray-800"></div>
                                                    <h4 className="font-bold text-gray-800 text-lg">Revenue & Income</h4>
                                                </div>
                                                <div className="bg-gray-50 p-4 border border-gray-300">
                                                    {selectedTrip.incomeItems && selectedTrip.incomeItems.map((item, i) => (
                                                        <div key={`inc-${i}`} className="flex justify-between items-center py-2 border-b border-gray-300 last:border-b-0">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-6 h-6 bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{i+1}</span>
                                                                <span className="font-medium text-gray-800">{item.description}</span>
                                                            </div>
                                                            <span className="font-bold text-gray-800 text-lg">₹{item.amount.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Expenses Section - Only show for internal copy */}
                                            {!isCustomerCopy && (
                                                <div className="mb-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-4 h-4 bg-gray-600"></div>
                                                        <h4 className="font-bold text-gray-800 text-lg">Expenses & Costs</h4>
                                                    </div>
                                                    <div className="bg-gray-100 p-4 border border-gray-300">
                                                        {selectedTrip.expenseItems && selectedTrip.expenseItems.map((item, i) => (
                                                            <div key={`exp-${i}`} className="flex justify-between items-center py-2 border-b border-gray-300 last:border-b-0">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="w-6 h-6 bg-gray-600 text-white flex items-center justify-center text-xs font-bold">{i+1}</span>
                                                                    <span className="font-medium text-gray-800">{item.description}</span>
                                                                </div>
                                                                <span className="font-bold text-gray-800 text-lg">₹{item.amount.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Professional Summary Section */}
                                    <div className="mt-8 bg-white p-6 border-2 border-gray-800">
                                        <h3 className="font-bold text-gray-800 text-lg mb-6 text-center border-b-2 border-gray-800 pb-2">
                                            {isCustomerCopy ? 'Service Summary' : 'Financial Summary'}
                                        </h3>
                                        {isCustomerCopy ? (
                                            /* Customer Copy - Only show revenue */
                                            <div className="flex justify-center">
                                                <div className="text-center">
                                                    <div className="bg-gray-200 p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border-2 border-gray-800">
                                                        <span className="text-3xl">₹</span>
                                                    </div>
                                                    <p className="text-lg text-gray-600 mb-2">Total Service Charge</p>
                                                    <p className="text-3xl font-bold text-gray-800">₹{selectedTrip.revenue.toLocaleString()}</p>
                                                    <p className="text-sm text-gray-500 mt-2">Transport Service Fee</p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Internal Copy - Show all financial details */
                                            <div className="grid grid-cols-3 gap-6">
                                                <div className="text-center">
                                                    <div className="bg-gray-200 p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center border-2 border-gray-800">
                                                        <span className="text-2xl font-bold">₹</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                                                    <p className="text-xl font-bold text-gray-800">₹{selectedTrip.revenue.toLocaleString()}</p>
                                                </div>
                                                
                                                <div className="text-center">
                                                    <div className="bg-gray-200 p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center border-2 border-gray-800">
                                                        <span className="text-2xl font-bold">-</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                                                    <p className="text-xl font-bold text-gray-800">₹{selectedTrip.total_expense.toLocaleString()}</p>
                                                </div>
                                                
                                                <div className="text-center">
                                                    <div className="bg-gray-200 p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center border-2 border-gray-800">
                                                        <span className="text-2xl font-bold">{selectedTrip.profit >= 0 ? '+' : '-'}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-1">Net Profit</p>
                                                    <p className="text-2xl font-bold text-gray-800">
                                                        ₹{selectedTrip.profit.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Professional Footer */}
                                    <div className="mt-12 pt-8 border-t-2 border-gray-800">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-gray-800">
                                                    <Truck size={20} />
                                                    <p className="font-bold text-lg">Thank You for Your Business!</p>
                                                </div>
                                                <p className="text-sm text-gray-600">We appreciate your trust in G3 Transport Services</p>
                                                <div className="flex gap-4 text-xs text-gray-500 mt-4">
                                                    <span className="flex items-center gap-1">
                                                        <Phone size={10} />
                                                        24/7 Support
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Mail size={10} />
                                                        Quick Response
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="text-center">
                                                <div className="w-48 border-b-2 border-gray-800 h-16 mb-2 flex items-end justify-center pb-2">
                                                    <span className="text-gray-600 text-xs font-semibold">Authorized Signature</span>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-800">Authorized Signatory</p>
                                                <p className="text-xs text-gray-600 mt-1">G3 Transport Management</p>
                                            </div>
                                        </div>
                                        
                                        {/* Professional Footer */}
                                        <div className="text-center mt-8 pt-4 border-t border-gray-400">
                                            <p className="text-xs text-gray-500 font-medium">
                                                Generated by G3 Transport Management System • {new Date().toLocaleDateString()} • Invoice #{selectedTrip.id}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </motion.div>
    );
};

export default InvoicesPage;
