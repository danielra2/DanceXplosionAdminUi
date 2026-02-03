import React, { useState, useEffect } from 'react';
import api from '../services/api';

function StudentsView() {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    
    // --- STATE-URI MODALE DE BAZĂ ---
    const [selectedStudent, setSelectedStudent] = useState(null); // Pt înscriere curs
    const [selectedClassId, setSelectedClassId] = useState('');
    
    // --- STATE CREARE STUDENT ---
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newStudent, setNewStudent] = useState({
        firstName: '', lastName: '', email: '', password: '', phone: '',
        subscriptionExpirationDate: '', nextPaymentAmount: ''
    });

    // --- STATE EDITARE STUDENT ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState({
        id: null,
        firstName: '',
        lastName: '',
        email: '', 
        phone: '',
        subscriptionExpirationDate: '',
        lastPaymentAmount: '',
        nextPaymentAmount: ''
    });

    // --- STATE STATISTICI ---
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [currentStats, setCurrentStats] = useState(null);
    const [statsRange, setStatsRange] = useState('MONTH'); // 'WEEK' sau 'MONTH'
    const [statsStudentName, setStatsStudentName] = useState('');
    const [statsStudentId, setStatsStudentId] = useState(null);

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
        if (!newStudent.firstName || !newStudent.lastName || !newStudent.email || !newStudent.password) {
            alert("Te rog completează câmpurile obligatorii.");
            return;
        }
        const payload = {
            ...newStudent,
            subscriptionExpirationDate: newStudent.subscriptionExpirationDate || null,
            nextPaymentAmount: newStudent.nextPaymentAmount || null
        };

        try {
            await api.post('/users/student', payload);
            alert("Student creat cu succes!");
            setIsCreateModalOpen(false);
            setNewStudent({ firstName: '', lastName: '', email: '', password: '', phone: '', subscriptionExpirationDate: '', nextPaymentAmount: '' });
            fetchData(); 
        } catch (error) {
            const msg = error.response?.data?.error || "Eroare la crearea studentului.";
            alert(msg);
        }
    };

    // 3. Logică Editare Student
    const openEditModal = (student) => {
        setEditingStudent({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phone: student.phone || '',
            subscriptionExpirationDate: student.subscriptionExpirationDate || '',
            lastPaymentAmount: student.lastPaymentAmount || '', // Aici preluăm valoarea curentă
            nextPaymentAmount: student.nextPaymentAmount || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateStudent = async () => {
        try {
            const payload = {
                firstName: editingStudent.firstName,
                lastName: editingStudent.lastName,
                phone: editingStudent.phone,
                subscriptionExpirationDate: editingStudent.subscriptionExpirationDate || null,
                lastPaymentAmount: editingStudent.lastPaymentAmount || null,
                nextPaymentAmount: editingStudent.nextPaymentAmount || null
            };

            await api.put(`/admin/users/${editingStudent.id}`, payload);
            alert("Date student actualizate!");
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Eroare la actualizarea studentului.");
        }
    };

    // 4. Logică Înscriere la Curs
    const handleEnroll = async () => {
        if (!selectedStudent || !selectedClassId) return;
        try {
            await api.post(`/admin/enrollments/student/${selectedStudent.id}/class/${selectedClassId}`);
            alert("Student înscris!");
            setSelectedStudent(null);
            fetchData(); 
        } catch (error) { alert("Eroare: Probabil e deja înscris."); }
    };

    // 5. Logică Dezabonare de la Curs
    const handleUnenroll = async (studentId, classId) => {
        if(!window.confirm("Scoți studentul de la acest curs?")) return;
        try { 
            await api.delete(`/admin/enrollments/student/${studentId}/class/${classId}`); 
            fetchData(); 
        } catch (error) { 
            alert("Eroare la dezabonare."); 
        }
    };

    // 6. Logică Statistici
    const openStatsModal = async (student) => {
        setStatsStudentId(student.id);
        setStatsStudentName(`${student.firstName} ${student.lastName}`);
        setStatsRange('MONTH'); 
        await fetchStats(student.id, 'MONTH');
        setStatsModalOpen(true);
    };

    const fetchStats = async (studentId, range) => {
        try {
            const res = await api.get(`/attendance/student/${studentId}/stats?range=${range}`);
            setCurrentStats(res.data);
        } catch (error) {
            console.error("Eroare la incarcarea statisticilor");
            alert("Nu s-au putut încărca statisticile.");
        }
    };

    const handleRangeChange = async (newRange) => {
        setStatsRange(newRange);
        if (statsStudentId) {
            await fetchStats(statsStudentId, newRange);
        }
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Gestionare Studenți</h1>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    + Adaugă Student Nou
                </button>
            </div>
            
            {/* TABEL STUDENȚI */}
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <thead style={{ backgroundColor: 'var(--c-primary)', color: 'white' }}>
                    <tr>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Nume</th>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Contact</th>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Financiar</th>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Cursuri</th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>Acțiuni</th>
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
                                <div style={{fontSize:'0.8rem'}}>
                                    <span style={{color:'#666'}}>Plătit:</span> <b>{student.lastPaymentAmount || 0} RON</b><br/>
                                    <span style={{color:'#666'}}>De plată:</span> <b style={{color:'#e74c3c'}}>{student.nextPaymentAmount || 0} RON</b>
                                </div>
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
                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                <div style={{display:'flex', gap:'5px', justifyContent:'center', flexWrap:'wrap'}}>
                                    <button className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#8e44ad', color: 'white' }} 
                                            onClick={() => openStatsModal(student)}>
                                        📊 Statistici
                                    </button>
                                    <button className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#3498db', color: 'white' }} 
                                            onClick={() => openEditModal(student)}>
                                        ✏️ Edit
                                    </button>
                                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} 
                                            onClick={() => setSelectedStudent(student)}>
                                        + Înscrie
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* --- MODAL 1: STATISTICI --- */}
            {statsModalOpen && currentStats && (
                <div style={modalStyle}>
                    <div style={{ ...modalContentStyle, maxWidth:'600px' }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                            <h2 style={{ margin: 0, color: 'var(--c-primary)' }}>Prezență: {statsStudentName}</h2>
                            <button style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer'}} onClick={() => setStatsModalOpen(false)}>&times;</button>
                        </div>

                        <div style={{display:'flex', gap:'10px', marginBottom:'20px', background:'#f0f0f0', padding:'5px', borderRadius:'8px', width:'fit-content'}}>
                            <button onClick={() => handleRangeChange('WEEK')} style={{ border:'none', background: statsRange === 'WEEK' ? 'white' : 'transparent', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', boxShadow: statsRange === 'WEEK' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>Săptămână</button>
                            <button onClick={() => handleRangeChange('MONTH')} style={{ border:'none', background: statsRange === 'MONTH' ? 'white' : 'transparent', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', boxShadow: statsRange === 'MONTH' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>Lună</button>
                        </div>

                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'15px', marginBottom:'20px'}}>
                            <div style={statCardStyle}>
                                <div style={{fontSize:'0.8rem', color:'#666'}}>Rată Prezență</div>
                                <div style={{fontSize:'1.8rem', fontWeight:'bold', color: currentStats.attendanceRate >= 50 ? '#2ecc71' : '#e74c3c'}}>
                                    {currentStats.attendanceRate.toFixed(1)}%
                                </div>
                            </div>
                            <div style={statCardStyle}>
                                <div style={{fontSize:'0.8rem', color:'#666'}}>Prezent la</div>
                                <div style={{fontSize:'1.8rem', fontWeight:'bold', color:'var(--c-primary)'}}>
                                    {currentStats.attendedClasses}
                                </div>
                                <div style={{fontSize:'0.8rem', color:'#999'}}>din {currentStats.totalClasses} cursuri</div>
                            </div>
                            <div style={statCardStyle}>
                                <div style={{fontSize:'0.8rem', color:'#666'}}>Absențe</div>
                                <div style={{fontSize:'1.8rem', fontWeight:'bold', color:'#e74c3c'}}>
                                    {currentStats.totalClasses - currentStats.attendedClasses}
                                </div>
                            </div>
                        </div>

                        <h4 style={{marginBottom:'10px', borderBottom:'1px solid #eee', paddingBottom:'5px'}}>Istoric Detaliat</h4>
                        <div style={{maxHeight:'250px', overflowY:'auto', background:'#f9f9f9', borderRadius:'8px', padding:'10px'}}>
                            {currentStats.history && currentStats.history.length > 0 ? (
                                currentStats.history.map((record, index) => (
                                    <div key={index} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', borderBottom:'1px solid #eee', background:'white', marginBottom:'5px', borderRadius:'4px' }}>
                                        <div>
                                            <div style={{fontWeight:'bold', fontSize:'0.9rem'}}>{record.className}</div>
                                            <div style={{fontSize:'0.8rem', color:'#888'}}>{record.date}</div>
                                        </div>
                                        <div style={{ padding:'4px 10px', borderRadius:'15px', fontSize:'0.8rem', fontWeight:'bold', background: record.present ? '#d4edda' : '#f8d7da', color: record.present ? '#155724' : '#721c24' }}>
                                            {record.present ? 'PREZENT' : 'ABSENT'}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p style={{textAlign:'center', color:'#999', fontStyle:'italic'}}>Nicio înregistrare în această perioadă.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: EDITARE STUDENT --- */}
            {isEditModalOpen && (
                <div style={modalStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ marginBottom: '20px', color: 'var(--c-primary)' }}>Editează Student</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div style={{gridColumn: '1 / -1'}}>
                                <label style={{fontSize:'0.8rem', color:'#888'}}>Email (read-only)</label>
                                <input className="input-field" value={editingStudent.email} disabled style={{background:'#f0f0f0', color:'#666'}} />
                            </div>
                            <div>
                                <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Prenume</label>
                                <input className="input-field" value={editingStudent.firstName} onChange={e => setEditingStudent({...editingStudent, firstName: e.target.value})} />
                            </div>
                            <div>
                                <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Nume</label>
                                <input className="input-field" value={editingStudent.lastName} onChange={e => setEditingStudent({...editingStudent, lastName: e.target.value})} />
                            </div>
                            <div style={{gridColumn: '1 / -1'}}>
                                <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Telefon</label>
                                <input className="input-field" value={editingStudent.phone} onChange={e => setEditingStudent({...editingStudent, phone: e.target.value})} />
                            </div>
                            <div>
                                <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Ultima Plată (RON)</label>
                                <input className="input-field" type="number" value={editingStudent.lastPaymentAmount} onChange={e => setEditingStudent({...editingStudent, lastPaymentAmount: e.target.value})} />
                            </div>
                            <div>
                                <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>De Plată (RON)</label>
                                <input className="input-field" type="number" value={editingStudent.nextPaymentAmount} onChange={e => setEditingStudent({...editingStudent, nextPaymentAmount: e.target.value})} />
                            </div>
                            <div style={{gridColumn: '1 / -1'}}>
                                <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Data Expirare Abonament</label>
                                <input className="input-field" type="date" value={editingStudent.subscriptionExpirationDate} onChange={e => setEditingStudent({...editingStudent, subscriptionExpirationDate: e.target.value})} />
                            </div>
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn btn-danger" onClick={() => setIsEditModalOpen(false)}>Anulează</button>
                            <button className="btn btn-primary" onClick={handleUpdateStudent}>Salvează Modificări</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 3: CREARE STUDENT --- */}
            {isCreateModalOpen && (
                <div style={modalStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ marginBottom: '20px' }}>Adaugă Student Nou</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <input className="input-field" placeholder="Prenume *" value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} />
                            <input className="input-field" placeholder="Nume *" value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} />
                            <input className="input-field" placeholder="Email *" type="email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                            <input className="input-field" placeholder="Telefon" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} />
                            <input className="input-field" placeholder="Parolă *" type="password" value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} />
                            
                            <div>
                                <label style={{fontSize:'0.8rem', color:'#666'}}>Expirare Abonament</label>
                                <input className="input-field" type="date" value={newStudent.subscriptionExpirationDate} onChange={e => setNewStudent({...newStudent, subscriptionExpirationDate: e.target.value})} />
                            </div>
                            <input className="input-field" placeholder="De Plată (RON)" type="number" value={newStudent.nextPaymentAmount} onChange={e => setNewStudent({...newStudent, nextPaymentAmount: e.target.value})} />
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn btn-danger" onClick={() => setIsCreateModalOpen(false)}>Anulează</button>
                            <button className="btn btn-primary" onClick={handleCreateStudent}>Salvează</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 4: ÎNSCRIERE CURS --- */}
            {selectedStudent && (
                <div style={modalStyle}>
                    <div style={{ ...modalContentStyle, maxWidth: '400px' }}>
                        <h3>Înscrie pe {selectedStudent.firstName}</h3>
                        <select className="input-field" onChange={(e) => setSelectedClassId(e.target.value)}>
                            <option value="">-- Selectează Curs --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.title} ({c.schedule})</option>)}
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

// --- STILURI ---
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
    boxShadow: '0 5px 20px rgba(0,0,0,0.3)',
    maxHeight: '90vh',
    overflowY: 'auto'
};

const statCardStyle = {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #eee'
};

export default StudentsView;