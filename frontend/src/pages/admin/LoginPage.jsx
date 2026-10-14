import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import InputField from '../common/InputField';
import { AlertTriangle } from 'lucide-react';

const LoginPage = ({ showNotification }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const success = await login(username, password);
        if (!success) {
            setError('Invalid credentials or unauthorized access.');
            showNotification('Invalid credentials or unauthorized access.', 'error');
        } else {
            showNotification('Admin login successful! Welcome to G3 Transport.', 'success');
        }
    };

    return (
        <div className="min-h-screen bg-green-700 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg border-t-4 border-red-500">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-green-800">G3 Transport</h1>
                    <p className="mt-2 text-gray-600 font-medium">Administrator Login</p>
                    
                    <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md text-left flex items-start">
                        <AlertTriangle className="text-red-500 w-5 h-5 mr-3 mt-0.5" />
                        <p className="text-sm text-red-700">
                            This portal is restricted to authorized administrators only.
                        </p>
                    </div>
                </div>
                
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <InputField 
                        label="Admin Username" 
                        name="username" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        placeholder="e.g. admin.g3" 
                        required 
                    />
                    <InputField 
                        label="Password" 
                        name="password" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                        required 
                    />
                    {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
                    <button 
                        type="submit" 
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-bold text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 rounded-lg shadow-md transition-all"
                    >
                        Secure Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
