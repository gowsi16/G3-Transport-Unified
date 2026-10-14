import React from 'react';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaTruck, FaBuilding, FaFileInvoiceDollar } from 'react-icons/fa';
import InputField from '../common/InputField';

const ContactPage = ({ showNotification }) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        showNotification('Message sent successfully! We will get back to you soon.', 'success');
        e.target.reset();
    };

    const contactInfo = [
        { icon: <FaBuilding className="text-green-600" />, title: 'Company Name', value: 'G3 Transport' },
        { icon: <FaFileInvoiceDollar className="text-green-600" />, title: 'GST No', value: '33CGJPB4116R1ZA' },
        { icon: <FaMapMarkerAlt className="text-green-600" />, title: 'Address', value: '3/93, Kalaignar Street, Vellalagundam, Vazhapady Taluk, Salem – 63611' },
        { icon: <FaPhone className="text-green-600" />, title: 'Mobile', value: '9488289991, 9080942982' },
        { icon: <FaEnvelope className="text-green-600" />, title: 'Email', value: 'gthreetransport@gmail.com, gowsilan16@gmail.com' },
        { icon: <FaTruck className="text-green-600" />, title: 'Fleet', value: '2 Lorries (TN77, TN28)' },
    ];

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Contact Us</h1>
            
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Company Information */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                        <FaBuilding className="mr-2 text-green-600" />
                        Company Information
                    </h2>
                    <div className="space-y-5">
                        {contactInfo.map((item, index) => (
                            <div key={index} className="flex">
                                <div className="flex-shrink-0 mt-1">
                                    {item.icon}
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-sm font-medium text-gray-500">{item.title}</h3>
                                    <p className="mt-1 text-gray-700">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8">
                        <h3 className="text-lg font-medium text-gray-800 mb-4">Business Hours</h3>
                        <ul className="space-y-2 text-gray-700">
                            <li className="flex justify-between">
                                <span>Monday - Saturday</span>
                                <span>8:00 AM - 8:00 PM</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Sunday</span>
                                <span>Emergency Only</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Send us a Message</h2>
                    <p className="text-gray-600 mb-6">Have a question or need support? Fill out the form below and we'll get back to you as soon as possible.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Full Name" name="name" required />
                            <InputField label="Email Address" name="email" type="email" required />
                        </div>
                        <InputField label="Phone Number" name="phone" type="tel" />
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Message</label>
                            <textarea 
                                name="message" 
                                rows="5" 
                                required 
                                className="w-full py-2 px-4 bg-green-700 text-white hover:bg-green-800 transition-colors focus:border-green-500 focus:ring-green-500"
                                placeholder="How can we help you?"
                            ></textarea>
                        </div>
                        <div className="text-right">
                            <button 
                                type="submit" 
                                className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                            >
                                Send Message
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
