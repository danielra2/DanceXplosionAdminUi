import React, { useState, useEffect } from 'react';
import api from '../services/api';

function StudentsView() {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null); 
    const [selectedClassId, setSelectedClassId] = useState('');
    
    // Stare pentru Modalul de Creare Student
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newStudent, setNewStudent] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        subscriptionExpirationDate: '',
        lastPaymentAmount: '',
        nextPaymentAmount: ''
    });

    // 1. Încărcare Date
    const fetchData = async () => {
        try {
            const usersRes = await api.get('/users');
            const classesRes = await api.get('/classes');
            setStudents(usersRes.data.userList || usersRes.data); 
            setClasses(classesRes.data);
        } catch (error) {
            console.error("Eroare la incarcarea datelor:", error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // 2. Logică Creare Student
    const handleCreateStudent = async () => {
        // Validare simplă
        if (!newStudent.firstName || !newStudent.lastName || !newStudent.email || !newStudent.password) {
            alert("Te rog completează câmpurile obligatorii (Nume, Prenume, Email, Parolă)");
            return;
        }

        // Curățăm datele înainte de trimitere (convertim string gol in null)
        const payload = {
            ...newStudent,
            subscriptionExpirationDate: newStudent.subscriptionExpirationDate || null,
            lastPaymentAmount: newStudent.lastPaymentAmount || null,
            nextPaymentAmount: newStudent.nextPaymentAmount || null
        };

        try {
            // Acum URL-ul din backend (/users/student) se va potrivi cu cel de aici
            await api.post('/users/student', payload);
            alert("Student creat cu succes!");
            setIsCreateModalOpen(false);
            setNewStudent({ 
                firstName: '', lastName: '', email: '', password: '', phone: '', 
                subscriptionExpirationDate: '', lastPaymentAmount: '', nextPaymentAmount: '' 
            });
            fetchData(); 
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || "Eroare la crearea studentului.";
            alert(msg);
        }
    };

    // 3. Logică Înscriere la Curs
    const handleEnroll = async () => {
        if (!selectedStudent || !selectedClassId) return;
        try {
            await api.post(`/admin/enrollments/student/${selectedStudent.id}/class/${selectedClassId}`);
            alert("Student înscris cu succes!");
            setSelectedStudent(null);
            fetchData(); 
        } catch (error) {
            alert("Eroare: Probabil studentul e deja înscris.");
        }
    };

    // 4. Logică Dezabonare
    const handleUnenroll = async (studentId, classId) => {
        if(!window.confirm("Scoți studentul de la acest curs?")) return;
        try {
            await api.delete(`/admin/enrollments/student/${studentId}/class/${classId}`);
            fetchData();
        } catch (error) {
            alert("Eroare la dezabonare.");
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Gestionare Studenți</h1>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    + Adaugă Student Nou
                </button>
            </div>
            
            {/* Tabel Studenți */}
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <thead style={{ backgroundColor: 'var(--c-primary)', color: 'white' }}>
                    <tr>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Nume</th>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Contact</th>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Ultima Plată</th>
                        <th style={{ padding: '15px', textAlign: 'left' }}>De Plată</th>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Cursuri</th>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Acțiuni</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map(student => (
                        <tr key={student.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '15px' }}>
                                <strong>{student.firstName} {student.lastName}</strong>
                            </td>
                            <td style={{ padding: '15px' }}>
                                <div>{student.email}</div>
                                <div style={{ fontSize: '0.85rem', color: '#888' }}>{student.phone}</div>
                            </td>
                            <td style={{ padding: '15px' }}>
                                <span style={{ 
                                    padding: '5px 12px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold',
                                    backgroundColor: student.status === 'Active' ? '#2ecc71' : '#e74c3c', color: 'white' 
                                }}>
                                    {student.status || 'Inactive'}
                                </span>
                                {student.subscriptionExpirationDate && (
                                    <div style={{ fontSize: '0.75rem', marginTop: '5px', color: '#666' }}>
                                        Exp: {student.subscriptionExpirationDate}
                                    </div>
                                )}
                            </td>
                            <td style={{ padding: '15px' }}>
                                <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>
                                    {student.lastPaymentAmount ? `${student.lastPaymentAmount} RON` : '-'}
                                </span>
                            </td>
                            <td style={{ padding: '15px' }}>
                                <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                                    {student.nextPaymentAmount ? `${student.nextPaymentAmount} RON` : '-'}
                                </span>
                            </td>
                            <td style={{ padding: '15px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {student.enrolledClasses && student.enrolledClasses.map(cls => (
                                        <div key={cls.id} style={{ 
                                            background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #ddd'
                                        }}>
                                            {cls.title}
                                            <span 
                                                style={{ cursor: 'pointer', color: '#e74c3c', fontWeight: 'bold', marginLeft: '2px' }}
                                                title="Scoate de la curs"
                                                onClick={() => handleUnenroll(student.id, cls.id)}
                                            >×</span>
                                        </div>
                                    ))}
                                    {(!student.enrolledClasses || student.enrolledClasses.length === 0) && <span style={{color:'#ccc', fontSize:'0.8rem'}}>-</span>}
                                </div>
                            </td>
                            <td style={{ padding: '15px' }}>
                                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => setSelectedStudent(student)}>
                                    Înscrie
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* MODAL 1: ADĂUGARE STUDENT */}
            {isCreateModalOpen && (
                <div style={modalStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ marginBottom: '20px', color: 'var(--c-primary)' }}>Adaugă Student Nou</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <input 
                                className="input-field" placeholder="Prenume *" 
                                value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} 
                            />
                            <input 
                                className="input-field" placeholder="Nume *" 
                                value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} 
                            />
                            <input 
                                className="input-field" placeholder="Email *" type="email"
                                value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} 
                            />
                            <input 
                                className="input-field" placeholder="Telefon" 
                                value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} 
                            />
                            <input 
                                className="input-field" placeholder="Parolă *" type="password"
                                value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} 
                            />
                            
                            <div>
                                <label style={{fontSize:'0.8rem', color:'#666', display:'block', marginBottom:'5px'}}>Expirare Abonament</label>
                                <input 
                                    className="input-field" type="date"
                                    value={newStudent.subscriptionExpirationDate} onChange={e => setNewStudent({...newStudent, subscriptionExpirationDate: e.target.value})} 
                                />
                            </div>

                            <input 
                                className="input-field" placeholder="Platit Luna Trecută (RON)" type="number"
                                value={newStudent.lastPaymentAmount} onChange={e => setNewStudent({...newStudent, lastPaymentAmount: e.target.value})} 
                            />
                            <input 
                                className="input-field" placeholder="De Plată Următoarea (RON)" type="number"
                                value={newStudent.nextPaymentAmount} onChange={e => setNewStudent({...newStudent, nextPaymentAmount: e.target.value})} 
                            />
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn btn-danger" onClick={() => setIsCreateModalOpen(false)}>Anulează</button>
                            <button className="btn btn-primary" onClick={handleCreateStudent}>Salvează Student</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: ÎNSCRIERE CURS */}
            {selectedStudent && (
                <div style={modalStyle}>
                    <div style={{ ...modalContentStyle, maxWidth: '400px' }}>
                        <h3>Înscrie pe {selectedStudent.firstName}</h3>
                        <p style={{marginBottom:'15px', color:'#666'}}>Alege cursul la care vrei să participe:</p>
                        <select 
                            className="input-field" 
                            onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                            <option value="">-- Selectează Curs --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.title} ({c.schedule})</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-danger" onClick={() => setSelectedStudent(null)}>Anulează</button>
                            <button className="btn btn-primary" onClick={handleEnroll}>Confirmă</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Stiluri simple pentru modal
const modalStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000
};

const modalContentStyle = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    boxShadow: '0 5px 20px rgba(0,0,0,0.3)'
};

export default StudentsView;