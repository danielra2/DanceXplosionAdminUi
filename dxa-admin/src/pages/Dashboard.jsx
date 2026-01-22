import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StudentsView from './StudentsView';
import ClassesView from './ClassesView';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const [activeTab, setActiveTab] = useState('students');
    const navigate = useNavigate();

    const logout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex' }}>
            {/* Sidebar */}
            <div style={{ width: '250px', backgroundColor: 'var(--c-primary)', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ color: 'var(--c-secondary)', marginBottom: '40px' }}>DXA Admin</h2>
                
                <button 
                    onClick={() => setActiveTab('students')}
                    style={{ 
                        background: activeTab === 'students' ? 'var(--c-secondary)' : 'transparent', 
                        color: 'white', padding: '15px', border: 'none', textAlign: 'left', marginBottom: '10px' 
                    }}
                >
                    👨‍🎓 Studenți
                </button>
                
                <button 
                    onClick={() => setActiveTab('classes')}
                    style={{ 
                        background: activeTab === 'classes' ? 'var(--c-secondary)' : 'transparent', 
                        color: 'white', padding: '15px', border: 'none', textAlign: 'left' 
                    }}
                >
                    💃 Cursuri
                </button>

                <button onClick={logout} style={{ marginTop: 'auto', background: 'transparent', border: '1px solid var(--c-danger)', color: 'var(--c-danger)', padding: '10px' }}>
                    Deconectare
                </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                {activeTab === 'students' ? <StudentsView /> : <ClassesView />}
            </div>
        </div>
    );
}

export default Dashboard;