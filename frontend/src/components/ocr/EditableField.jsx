import React from 'react';

const EditableField = ({ label, name, value, isEditing, onChange }) => (
    <div>
        <p className="text-sm text-gray-500">{label}</p>
        {isEditing ? (
            <input 
                type="text" 
                name={name} 
                value={value} 
                onChange={(e) => onChange(e)} 
                className="font-semibold bg-white border-b w-full p-1" 
            />
        ) : (
            <p className="font-semibold">{value}</p>
        )}
    </div>
);

export default EditableField;
