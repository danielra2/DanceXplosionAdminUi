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
            fetchClasses();
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

    // Toggle Participation
    const handleToggleParticipation = async (classId, studentId, currentStatus) => {
        try {
            // Trimitem opusul statusului curent (!currentStatus)
            await api.put(`/admin/enrollments/student/${studentId}/class/${classId}/participation?participated=${!currentStatus}`);
            // Reîncărcăm datele ca să vedem actualizarea
            fetchClasses(); 
        } catch (error) {
            console.error("Eroare la actualizarea prezentei", error);
            alert("Eroare la actualizare.");
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {classes.map(cls => (
                    <div key={cls.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', borderLeft: '5px solid var(--c-secondary)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <h3 style={{margin:0}}>{cls.title}</h3>
                            <button className="btn btn-danger" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => handleDelete(cls.id)}>
                                Șterge Curs
                            </button>
                        </div>
                        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom:'5px' }}>📅 {cls.schedule} | 📍 {cls.location}</p>
                        <p style={{ fontSize: '0.9rem', fontStyle:'italic' }}>{cls.description}</p>
                        
                        <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '15px 0' }} />
                        
                        {/* LISTA STUDENȚI ÎNSCRIȘI */}
                        <h4 style={{fontSize:'0.9rem', color:'var(--c-primary)', marginBottom:'10px'}}>
                            Studenți Înscriși ({cls.students ? cls.students.length : 0})
                        </h4>
                        
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {cls.students && cls.students.length > 0 ? (
                                cls.students.map(student => (
                                    <div key={student.studentId} style={{ 
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                        padding: '8px', borderBottom: '1px solid #f9f9f9', fontSize:'0.9rem' 
                                    }}>
                                        <span>{student.fullName}</span>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap:'5px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={student.participated} 
                                                onChange={() => handleToggleParticipation(cls.id, student.studentId, student.participated)}
                                                style={{ width: '16px', height: '16px', cursor:'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.8rem', color: student.participated ? '#2ecc71' : '#999' }}>
                                                {student.participated ? 'Prezent' : 'Absent'}
                                            </span>
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <p style={{ fontSize: '0.8rem', color: '#ccc', textAlign: 'center' }}>Niciun student înscris.</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ClassesView;