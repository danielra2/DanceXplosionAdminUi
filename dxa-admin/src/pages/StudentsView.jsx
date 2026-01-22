import React, { useState, useEffect } from 'react';
import api from '../services/api';

function StudentsView() {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]); // Avem nevoie de lista de cursuri pt dropdown
    const [selectedStudent, setSelectedStudent] = useState(null); // Pt modalul de inscriere
    const [selectedClassId, setSelectedClassId] = useState('');

    const fetchData = async () => {
        const usersRes = await api.get('/users');
        const classesRes = await api.get('/classes');
        // Filtram doar studentii daca endpointul returneaza si admini
        setStudents(usersRes.data.userList || usersRes.data); 
        setClasses(classesRes.data);
    };

    useEffect(() => { fetchData(); }, []);

    // Enroll Logic
    const handleEnroll = async () => {
        if (!selectedStudent || !selectedClassId) return;
        try {
            await api.post(`/admin/enrollments/student/${selectedStudent.id}/class/${selectedClassId}`);
            alert("Student inscris cu succes!");
            setSelectedStudent(null);
            fetchData(); // Refresh pentru a vedea noua clasa in lista
        } catch (error) {
            alert("Eroare: Probabil studentul e deja inscris.");
        }
    };

    // Unenroll Logic
    const handleUnenroll = async (studentId, classId) => {
        if(!window.confirm("Scoti studentul de la acest curs?")) return;
        try {
            await api.delete(`/admin/enrollments/student/${studentId}/class/${classId}`);
            fetchData();
        } catch (error) {
            alert("Eroare la dezabonare.");
        }
    };

    return (
        <div>
            <h1>Gestionare Studenți</h1>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden' }}>
                <thead style={{ backgroundColor: 'var(--c-primary)', color: 'white' }}>
                    <tr>
                        <th style={{ padding: '15px' }}>Nume</th>
                        <th style={{ padding: '15px' }}>Email</th>
                        <th style={{ padding: '15px' }}>Status</th>
                        <th style={{ padding: '15px' }}>Cursuri Înscrise</th>
                        <th style={{ padding: '15px' }}>Acțiuni</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map(student => (
                        <tr key={student.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '15px' }}>{student.firstName} {student.lastName}</td>
                            <td style={{ padding: '15px' }}>{student.email}</td>
                            <td style={{ padding: '15px' }}>
                                <span style={{ 
                                    padding: '5px 10px', borderRadius: '15px', fontSize: '0.8rem',
                                    backgroundColor: student.status === 'Active' ? '#2ecc71' : '#e74c3c', color: 'white' 
                                }}>
                                    {student.status || 'Inactive'}
                                </span>
                            </td>
                            <td style={{ padding: '15px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {student.enrolledClasses && student.enrolledClasses.map(cls => (
                                        <div key={cls.id} style={{ 
                                            background: '#f0f0f0', padding: '5px 10px', borderRadius: '5px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' 
                                        }}>
                                            {cls.title}
                                            <span 
                                                style={{ cursor: 'pointer', color: 'red', fontWeight: 'bold' }}
                                                onClick={() => handleUnenroll(student.id, cls.id)}
                                            >x</span>
                                        </div>
                                    ))}
                                </div>
                            </td>
                            <td style={{ padding: '15px' }}>
                                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '5px 15px' }} onClick={() => setSelectedStudent(student)}>
                                    + Înscrie
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Modal Simplu pentru Inscriere */}
            {selectedStudent && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '10px', minWidth: '300px' }}>
                        <h3>Înscrie pe {selectedStudent.firstName}</h3>
                        <p>Alege cursul:</p>
                        <select 
                            className="input-field" 
                            onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                            <option value="">-- Selectează Curs --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.title} ({c.schedule})</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button className="btn btn-primary" onClick={handleEnroll}>Confirmă</button>
                            <button className="btn btn-danger" onClick={() => setSelectedStudent(null)}>Anulează</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StudentsView;