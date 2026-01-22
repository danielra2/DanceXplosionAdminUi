import React, { useState, useEffect } from 'react';
import api from '../services/api';

function ClassesView() {
    const [classes, setClasses] = useState([]);
    const [newClass, setNewClass] = useState({ title: '', description: '', schedule: '', location: '' });

    // Fetch Classes
    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
        } catch (error) {
            console.error("Eroare la incarcarea cursurilor");
        }
    };

    useEffect(() => { fetchClasses(); }, []);

    // Create Class
    const handleCreate = async () => {
        try {
            await api.post('/admin/classes', newClass);
            setNewClass({ title: '', description: '', schedule: '', location: '' });
            fetchClasses(); // Refresh list
            alert("Curs creat cu succes!");
        } catch (error) {
            alert("Eroare la crearea cursului!");
        }
    };

    // Delete Class
    const handleDelete = async (id) => {
        if(!window.confirm("Sigur vrei să ștergi acest curs?")) return;
        try {
            await api.delete(`/admin/classes/${id}`);
            fetchClasses();
        } catch (error) {
            alert("Nu s-a putut șterge cursul.");
        }
    };

    return (
        <div>
            <h1>Gestionare Cursuri</h1>
            
            {/* Formular Adaugare */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
                <h3>Adaugă Curs Nou</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input className="input-field" placeholder="Titlu (ex: Salsa)" value={newClass.title} onChange={e => setNewClass({...newClass, title: e.target.value})} />
                    <input className="input-field" placeholder="Program (ex: Luni 19:00)" value={newClass.schedule} onChange={e => setNewClass({...newClass, schedule: e.target.value})} />
                    <input className="input-field" placeholder="Locatie" value={newClass.location} onChange={e => setNewClass({...newClass, location: e.target.value})} />
                    <input className="input-field" placeholder="Descriere scurta" value={newClass.description} onChange={e => setNewClass({...newClass, description: e.target.value})} />
                </div>
                <button className="btn btn-primary" onClick={handleCreate}>Salvează Curs</button>
            </div>

            {/* Lista Cursuri */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {classes.map(cls => (
                    <div key={cls.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', borderLeft: '5px solid var(--c-secondary)' }}>
                        <h3>{cls.title}</h3>
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>📅 {cls.schedule}</p>
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>📍 {cls.location}</p>
                        <p>{cls.description}</p>
                        <button className="btn btn-danger" style={{ marginTop: '10px', fontSize: '0.8rem', padding: '5px 10px' }} onClick={() => handleDelete(cls.id)}>
                            Șterge
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ClassesView;