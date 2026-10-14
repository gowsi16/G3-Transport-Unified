import React, { useEffect } from 'react';

const Notification = ({ message, type, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) return null;

    const getTypeClasses = () => {
        switch (type) {
            case 'success':
                return 'bg-green-100 border-green-400 text-green-700';
            case 'error':
                return 'bg-red-100 border-red-400 text-red-700';
            case 'warning':
                return 'bg-yellow-100 border-yellow-400 text-yellow-700';
            default:
                return 'bg-blue-100 border-blue-400 text-blue-700';
        }
    };

    return (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded border ${getTypeClasses()} shadow-lg`}>
            <div className="flex items-center justify-between">
                <span>{message}</span>
                <button
                    onClick={onClose}
                    className="ml-4 text-lg font-bold hover:opacity-70"
                >
                    ×
                </button>
            </div>
        </div>
    );
};

export default Notification;