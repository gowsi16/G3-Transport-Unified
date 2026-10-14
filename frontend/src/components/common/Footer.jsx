import React from 'react';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-primary-800 text-white py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Company Info */}
                    <div>
                        <h3 className="text-xl font-bold text-white mb-3">G3 Transport</h3>
                        <p className="text-primary-100 text-sm mb-3">
                            Complete transport automation system for efficient logistics management.
                        </p>
                        <div className="flex space-x-3">
                            <a 
                                href="https://facebook.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-primary-700"
                            >
                                <Facebook size={16} />
                            </a>
                            <a 
                                href="https://twitter.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-primary-700"
                            >
                                <Twitter size={16} />
                            </a>
                            <a 
                                href="https://instagram.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-primary-700"
                            >
                                <Instagram size={16} />
                            </a>
                            <a 
                                href="https://linkedin.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-primary-700"
                            >
                                <Linkedin size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Contact Us</h4>
                        <div className="space-y-2">
                            <div className="flex items-start text-primary-100">
                                <MapPin size={16} className="mr-2 mt-0.5 text-secondary-400 flex-shrink-0" />
                                <span className="text-sm">
                                    3/93, Kalaignar Street, Vellalagundam,<br />
                                    Vazhapady Taluk, Salem – 636111
                                </span>
                            </div>
                            <div className="flex items-center text-primary-100 hover:text-white transition-colors">
                                <Phone size={16} className="mr-2 text-secondary-400" />
                                <div className="text-sm">
                                    <a href="tel:+919488289991" className="hover:underline">9488289991</a>
                                    <span className="mx-1">•</span>
                                    <a href="tel:+919080942982" className="hover:underline">9080942982</a>
                                </div>
                            </div>
                            <div className="flex items-center text-primary-100 hover:text-white transition-colors">
                                <Mail size={16} className="mr-2 text-secondary-400" />
                                <div className="text-sm">
                                    <a href="mailto:gthreetransport@gmail.com" className="hover:underline block">
                                        gthreetransport@gmail.com
                                    </a>
                                    <a href="mailto:gowsilan16@gmail.com" className="hover:underline block">
                                        gowsilan16@gmail.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Quick Links</h4>
                        <div className="space-y-1">
                            <a href="#" className="block text-primary-100 hover:text-white transition-colors hover:underline text-sm">
                                About Us
                            </a>
                            <a href="#" className="block text-primary-100 hover:text-white transition-colors hover:underline text-sm">
                                Services
                            </a>
                            <a href="#" className="block text-primary-100 hover:text-white transition-colors hover:underline text-sm">
                                Privacy Policy
                            </a>
                            <a href="#" className="block text-primary-100 hover:text-white transition-colors hover:underline text-sm">
                                Support
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-primary-700 mt-4 pt-4 text-center">
                    <p className="text-primary-200 text-xs">
                        © 2024 G3 Transport Management. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;