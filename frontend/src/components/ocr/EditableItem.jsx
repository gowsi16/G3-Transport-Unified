import React from 'react';

const EditableItem = ({ item, index, type, isEditing, onChange }) => (
    <div className="flex justify-between items-center text-sm mb-1">
        {isEditing ? (
            <input 
                type="text" 
                name="description" 
                value={item.description} 
                onChange={(e) => onChange(e, type, index)} 
                className="w-2/3 p-1 border-b" 
            />
        ) : (
            <p>{item.description}</p>
        )}
        {isEditing ? (
            <input 
                type="number" 
                name="amount" 
                value={item.amount} 
                onChange={(e) => onChange(e, type, index)} 
                className="w-1/3 p-1 border-b text-right" 
            />
        ) : (
            <p>₹{item.amount.toLocaleString()}</p>
        )}
    </div>
);

export default EditableItem;
