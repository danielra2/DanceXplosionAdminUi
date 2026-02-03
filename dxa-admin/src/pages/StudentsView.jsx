import React, { useState, useEffect } from 'react';
import api from '../services/api';

function StudentsView() {
    // --- STATE DATE ---
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    
    // --- STATE FILTRE ---
    const [filters, setFilters] = useState({
        search: '',
        status: '', 
        courseId: ''
    });

    // --- STATE MODAL INFO UNIFICAT (NOU) ---
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'stats', 'enroll'
    
    // Datele studentului selectat pentru vizualizare/editare
    const [currentStudent, setCurrentStudent] = useState(null);
    
    // State pentru editare (formular)
    const [editingData, setEditingData] = useState({
        id: null, firstName: '', lastName: '', email: '', phone: '',
        subscriptionExpirationDate: '', lastPaymentAmount: '', nextPaymentAmount: ''
    });

    // State pentru Statistici
    const [studentStats, setStudentStats] = useState(null);
    const [statsRange, setStatsRange] = useState('MONTH');

    // State pentru Înscriere Nouă (dropdown)
    const [classToEnroll, setClassToEnroll] = useState('');

    // --- STATE CREARE STUDENT (Rămâne separat) ---
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newStudent, setNewStudent] = useState({
        firstName: '', lastName: '', email: '', password: '', phone: '',
        subscriptionExpirationDate: '', nextPaymentAmount: ''
    });

    // 1. Încărcare Date Inițială
    const fetchData = async () => {
        try {
            const classesRes = await api.get('/classes');
            setClasses(classesRes.data);
            fetchFilteredUsers(); 
        } catch (error) {
            console.error("Eroare la incarcarea datelor:", error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // 2. Filtrare
    const fetchFilteredUsers = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.status) params.append('status', filters.status);
            if (filters.courseId) params.append('courseId', filters.courseId);

            const response = await api.get(`/users?${params.toString()}`);
            setStudents(response.data.userList || response.data);
        } catch (error) {
            console.error("Eroare la filtrare:", error);
        }
    };

    const handleResetFilters = () => {
        setFilters({ search: '', status: '', courseId: '' });
        api.get('/users').then(res => setStudents(res.data.userList || res.data));
    };

    // --- 3. LOGICA MODAL INFO UNIFICAT ---

    const openInfoModal = (student) => {
        setCurrentStudent(student);
        
        // Populăm datele pentru tab-ul de Profil/Editare
        setEditingData({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phone: student.phone || '',
            subscriptionExpirationDate: student.subscriptionExpirationDate || '',
            lastPaymentAmount: student.lastPaymentAmount || '',
            nextPaymentAmount: student.nextPaymentAmount || ''
        });

        // Resetăm starea internă
        setActiveTab('profile'); 
        setStudentStats(null); 
        setClassToEnroll('');
        
        setInfoModalOpen(true);
    };

    // Funcție pentru schimbarea tab-urilor (încarcă date la cerere)
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'stats' && currentStudent) {
            fetchStats(currentStudent.id, statsRange);
        }
    };

    // --- ACȚIUNI DIN INTERIORUL MODALULUI ---

    // A. SAVE PROFIL & PLĂȚI
    const handleUpdateStudent = async () => {
        try {
            const payload = {
                firstName: editingData.firstName,
                lastName: editingData.lastName,
                phone: editingData.phone,
                subscriptionExpirationDate: editingData.subscriptionExpirationDate || null,
                lastPaymentAmount: editingData.lastPaymentAmount || null,
                nextPaymentAmount: editingData.nextPaymentAmount || null
            };
            await api.put(`/admin/users/${editingData.id}`, payload);
            alert("Date actualizate cu succes!");
            fetchFilteredUsers(); // Refresh în spate
            // Actualizăm și obiectul curent ca să se vadă modificarea instant
            setCurrentStudent({ ...currentStudent, ...payload });
        } catch (error) {
            alert("Eroare la actualizare.");
        }
    };

    // B. STATISTICI
    const fetchStats = async (studentId, range) => {
        try {
            const res = await api.get(`/attendance/student/${studentId}/stats?range=${range}`);
            setStudentStats(res.data);
        } catch (error) {
            console.error("Eroare statistici");
        }
    };

    // C. ÎNSCRIERI
    const handleEnroll = async () => {
        if (!classToEnroll) return;
        try {
            await api.post(`/admin/enrollments/student/${currentStudent.id}/class/${classToEnroll}`);
            alert("Student înscris!");
            fetchFilteredUsers();
            // Trebuie să reîncărcăm studentul curent pentru a vedea noua înscriere în listă
            // Pentru simplitate, închidem modalul sau facem un refresh local (complex)
            // Aici vom închide modalul pentru a forța refresh-ul listei mari
            setInfoModalOpen(false); 
        } catch (error) { alert("Eroare: Probabil e deja înscris."); }
    };

    const handleUnenroll = async (classId) => {
        if(!window.confirm("Sigur scoți studentul de la curs?")) return;
        try { 
            await api.delete(`/admin/enrollments/student/${currentStudent.id}/class/${classId}`); 
            alert("Student dezabonat.");
            setInfoModalOpen(false); // Închidem pentru refresh
            fetchFilteredUsers(); 
        } catch (error) { alert("Eroare la dezabonare."); }
    };

    // --- 4. CREARE STUDENT (EXTERN) ---
    const handleCreateStudent = async () => {
        if (!newStudent.firstName || !newStudent.lastName || !newStudent.email || !newStudent.password) {
            alert("Completează câmpurile obligatorii."); return;
        }
        try {
            await api.post('/users/student', { ...newStudent, subscriptionExpirationDate: newStudent.subscriptionExpirationDate || null, nextPaymentAmount: newStudent.nextPaymentAmount || null });
            alert("Student creat!");
            setIsCreateModalOpen(false);
            setNewStudent({ firstName: '', lastName: '', email: '', password: '', phone: '', subscriptionExpirationDate: '', nextPaymentAmount: '' });
            fetchFilteredUsers(); 
        } catch (error) {
            alert(error.response?.data?.error || "Eroare la creare.");
        }
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{margin:0}}>Gestionare Studenți</h1>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    + Adaugă Student Nou
                </button>
            </div>
            
            {/* Filtre */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{flex: 1, minWidth: '200px'}}>
                    <label style={{display:'block', fontSize:'0.8rem', fontWeight:'bold', marginBottom:'5px', color:'#666'}}>Caută nume</label>
                    <input className="input-field" placeholder="ex: Popescu..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} style={{margin:0}} />
                </div>
                <div style={{flex: 1, minWidth: '150px'}}>
                    <label style={{display:'block', fontSize:'0.8rem', fontWeight:'bold', marginBottom:'5px', color:'#666'}}>Status</label>
                    <select className="input-field" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} style={{margin:0}}>
                        <option value="">Toți</option>
                        <option value="Active">Activ</option>
                        <option value="Inactive">Inactiv</option>
                    </select>
                </div>
                <div style={{flex: 1, minWidth: '200px'}}>
                    <label style={{display:'block', fontSize:'0.8rem', fontWeight:'bold', marginBottom:'5px', color:'#666'}}>Curs</label>
                    <select className="input-field" value={filters.courseId} onChange={e => setFilters({...filters, courseId: e.target.value})} style={{margin:0}}>
                        <option value="">Toate</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    <button className="btn btn-primary" onClick={fetchFilteredUsers}>🔍 Caută</button>
                    <button className="btn" style={{background:'#95a5a6', color:'white'}} onClick={handleResetFilters}>Reset</button>
                </div>
            </div>

            {/* Tabel Studenți */}
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
                    {students.length > 0 ? (
                        students.map(student => (
                            <tr key={student.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '15px' }}><strong>{student.firstName} {student.lastName}</strong></td>
                                <td style={{ padding: '15px' }}>
                                    <div>{student.email}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#888' }}>{student.phone}</div>
                                </td>
                                <td style={{ padding: '15px' }}>
                                    <span style={{ padding: '5px 12px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: student.status === 'Active' ? '#2ecc71' : '#e74c3c', color: 'white' }}>
                                        {student.status || 'Inactive'}
                                    </span>
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
                                            <div key={cls.id} style={{ background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid #ddd' }}>
                                                {cls.title}
                                            </div>
                                        ))}
                                        {(!student.enrolledClasses || student.enrolledClasses.length === 0) && <span style={{color:'#ccc', fontSize:'0.8rem'}}>-</span>}
                                    </div>
                                </td>
                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                    {/* BUTON UNIC DE INFO */}
                                    <button 
                                        className="btn" 
                                        style={{ fontSize: '0.9rem', padding: '8px 15px', background: '#34495e', color: 'white', display:'flex', alignItems:'center', gap:'5px', margin:'0 auto' }} 
                                        onClick={() => openInfoModal(student)}
                                    >
                                        ℹ️ Info & Acțiuni
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="6" style={{padding:'30px', textAlign:'center', color:'#888'}}>Nu s-au găsit studenți.</td></tr>
                    )}
                </tbody>
            </table>

            {/* --- SUPER MODAL UNIFICAT --- */}
            {infoModalOpen && currentStudent && (
                <div style={modalStyle}>
                    <div style={{ ...modalContentStyle, maxWidth:'700px', padding:'0' }}>
                        
                        {/* Header Modal */}
                        <div style={{padding:'20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8f9fa'}}>
                            <div>
                                <h2 style={{margin:0, color:'var(--c-primary)'}}>{currentStudent.firstName} {currentStudent.lastName}</h2>
                                <span style={{fontSize:'0.8rem', color:'#666'}}>{currentStudent.email}</span>
                            </div>
                            <button style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer'}} onClick={() => setInfoModalOpen(false)}>&times;</button>
                        </div>

                        {/* Navigare Tab-uri */}
                        <div style={{display:'flex', borderBottom:'1px solid #ddd'}}>
                            <button style={activeTab === 'profile' ? activeTabStyle : tabStyle} onClick={() => handleTabChange('profile')}>👤 Profil & Plăți</button>
                            <button style={activeTab === 'stats' ? activeTabStyle : tabStyle} onClick={() => handleTabChange('stats')}>📊 Statistici</button>
                            <button style={activeTab === 'enroll' ? activeTabStyle : tabStyle} onClick={() => handleTabChange('enroll')}>📝 Cursuri</button>
                        </div>

                        {/* Conținut Tab-uri */}
                        <div style={{padding:'25px'}}>
                            
                            {/* TAB 1: PROFIL & EDITARE */}
                            {activeTab === 'profile' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div style={{gridColumn:'1/-1', marginBottom:'10px', fontWeight:'bold', color:'#3498db'}}>Date Contact</div>
                                    <div><label style={labelStyle}>Prenume</label><input className="input-field" value={editingData.firstName} onChange={e => setEditingData({...editingData, firstName: e.target.value})} /></div>
                                    <div><label style={labelStyle}>Nume</label><input className="input-field" value={editingData.lastName} onChange={e => setEditingData({...editingData, lastName: e.target.value})} /></div>
                                    <div style={{gridColumn:'1/-1'}}><label style={labelStyle}>Telefon</label><input className="input-field" value={editingData.phone} onChange={e => setEditingData({...editingData, phone: e.target.value})} /></div>
                                    
                                    <div style={{gridColumn:'1/-1', marginTop:'15px', marginBottom:'10px', fontWeight:'bold', color:'#27ae60'}}>Financiar</div>
                                    <div><label style={labelStyle}>Ultima Plată (RON)</label><input type="number" className="input-field" value={editingData.lastPaymentAmount} onChange={e => setEditingData({...editingData, lastPaymentAmount: e.target.value})} /></div>
                                    <div><label style={labelStyle}>De Plată (RON)</label><input type="number" className="input-field" value={editingData.nextPaymentAmount} onChange={e => setEditingData({...editingData, nextPaymentAmount: e.target.value})} /></div>
                                    <div style={{gridColumn:'1/-1'}}><label style={labelStyle}>Data Expirare Abonament</label><input type="date" className="input-field" value={editingData.subscriptionExpirationDate} onChange={e => setEditingData({...editingData, subscriptionExpirationDate: e.target.value})} /></div>
                                    
                                    <div style={{gridColumn:'1/-1', textAlign:'right', marginTop:'15px'}}>
                                        <button className="btn btn-primary" onClick={handleUpdateStudent}>💾 Salvează Modificări</button>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: STATISTICI */}
                            {activeTab === 'stats' && (
                                <div>
                                    <div style={{display:'flex', gap:'10px', marginBottom:'20px', justifyContent:'center'}}>
                                        <button onClick={() => { setStatsRange('WEEK'); fetchStats(currentStudent.id, 'WEEK'); }} style={statsRange === 'WEEK' ? activeFilterBtn : filterBtn}>Săptămână</button>
                                        <button onClick={() => { setStatsRange('MONTH'); fetchStats(currentStudent.id, 'MONTH'); }} style={statsRange === 'MONTH' ? activeFilterBtn : filterBtn}>Lună</button>
                                    </div>
                                    
                                    {studentStats ? (
                                        <>
                                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'15px', marginBottom:'20px'}}>
                                                <div style={statCardStyle}><div style={{fontSize:'0.8rem', color:'#666'}}>Rată Prezență</div><div style={{fontSize:'1.5rem', fontWeight:'bold', color: studentStats.attendanceRate >= 50 ? '#2ecc71' : '#e74c3c'}}>{studentStats.attendanceRate.toFixed(1)}%</div></div>
                                                <div style={statCardStyle}><div style={{fontSize:'0.8rem', color:'#666'}}>Prezențe</div><div style={{fontSize:'1.5rem', fontWeight:'bold', color:'var(--c-primary)'}}>{studentStats.attendedClasses}</div></div>
                                                <div style={statCardStyle}><div style={{fontSize:'0.8rem', color:'#666'}}>Absențe</div><div style={{fontSize:'1.5rem', fontWeight:'bold', color:'#e74c3c'}}>{studentStats.totalClasses - studentStats.attendedClasses}</div></div>
                                            </div>
                                            <div style={{maxHeight:'200px', overflowY:'auto', background:'#f9f9f9', padding:'10px', borderRadius:'8px'}}>
                                                {studentStats.history.map((rec, i) => (
                                                    <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'8px', borderBottom:'1px solid #eee', fontSize:'0.9rem'}}>
                                                        <span>{rec.className} <small style={{color:'#999'}}>({rec.date})</small></span>
                                                        <span style={{color: rec.present ? 'green' : 'red', fontWeight:'bold'}}>{rec.present ? 'PREZENT' : 'ABSENT'}</span>
                                                    </div>
                                                ))}
                                                {studentStats.history.length === 0 && <div style={{textAlign:'center', color:'#999'}}>Fără date.</div>}
                                            </div>
                                        </>
                                    ) : <p style={{textAlign:'center'}}>Se încarcă...</p>}
                                </div>
                            )}

                            {/* TAB 3: CURSURI & ÎNSCRIERE */}
                            {activeTab === 'enroll' && (
                                <div>
                                    <h4 style={{marginTop:0}}>Cursuri Active</h4>
                                    <div style={{marginBottom:'20px'}}>
                                        {currentStudent.enrolledClasses && currentStudent.enrolledClasses.length > 0 ? (
                                            currentStudent.enrolledClasses.map(cls => (
                                                <div key={cls.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f0f0f0', padding:'10px', marginBottom:'5px', borderRadius:'5px'}}>
                                                    <span>{cls.title}</span>
                                                    <button style={{color:'red', border:'none', background:'none', cursor:'pointer', fontWeight:'bold'}} onClick={() => handleUnenroll(cls.id)}>Dezabonează</button>
                                                </div>
                                            ))
                                        ) : <p style={{color:'#999'}}>Nu este înscris la niciun curs.</p>}
                                    </div>

                                    <div style={{borderTop:'1px solid #eee', paddingTop:'20px'}}>
                                        <h4>Înscriere Nouă</h4>
                                        <div style={{display:'flex', gap:'10px'}}>
                                            <select className="input-field" style={{margin:0}} value={classToEnroll} onChange={e => setClassToEnroll(e.target.value)}>
                                                <option value="">-- Selectează Curs --</option>
                                                {classes.map(c => <option key={c.id} value={c.id}>{c.title} ({c.schedule})</option>)}
                                            </select>
                                            <button className="btn btn-primary" onClick={handleEnroll}>Înscrie</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* Modal Creare Student (Rămâne neschimbat) */}
            {isCreateModalOpen && (
                <div style={modalStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ marginBottom: '20px' }}>Adaugă Student</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <input className="input-field" placeholder="Prenume *" value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} />
                            <input className="input-field" placeholder="Nume *" value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} />
                            <input className="input-field" placeholder="Email *" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                            <input className="input-field" placeholder="Telefon" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} />
                            <input className="input-field" placeholder="Parolă *" type="password" value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} />
                            <div><label style={{fontSize:'0.8rem'}}>Expirare</label><input className="input-field" type="date" value={newStudent.subscriptionExpirationDate} onChange={e => setNewStudent({...newStudent, subscriptionExpirationDate: e.target.value})} /></div>
                            <input className="input-field" placeholder="De Plată (RON)" type="number" value={newStudent.nextPaymentAmount} onChange={e => setNewStudent({...newStudent, nextPaymentAmount: e.target.value})} />
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn btn-danger" onClick={() => setIsCreateModalOpen(false)}>Anulează</button>
                            <button className="btn btn-primary" onClick={handleCreateStudent}>Salvează</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// STILURI CSS-IN-JS
const modalStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '600px', boxShadow: '0 5px 20px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' };
const statCardStyle = { background: '#f8f9fa', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #eee' };

const tabStyle = { flex:1, padding:'15px', background:'none', border:'none', cursor:'pointer', borderBottom:'3px solid transparent', fontWeight:'bold', color:'#7f8c8d' };
const activeTabStyle = { ...tabStyle, color:'var(--c-primary)', borderBottom:'3px solid var(--c-primary)' };
const labelStyle = { display:'block', fontSize:'0.8rem', fontWeight:'bold', color:'#555', marginBottom:'3px' };

const filterBtn = { border:'1px solid #ddd', background:'white', padding:'6px 12px', borderRadius:'20px', cursor:'pointer' };
const activeFilterBtn = { ...filterBtn, background:'var(--c-primary)', color:'white', borderColor:'var(--c-primary)' };

// 1. Încărcare Date Inițială
    const fetchData = async () => {
        // Încărcăm Cursurile (pentru dropdown) - Dacă eșuează, nu e critic pt tabel
        try {
            const classesRes = await api.get('/classes');
            setClasses(classesRes.data);
        } catch (error) {
            console.error("Eroare la incarcarea cursurilor (dar continuăm):", error);
        }

        // Încărcăm Studenții - Asta e critic
        await fetchFilteredUsers(); 
    };

    // 2. Funcția de Filtrare
    const fetchFilteredUsers = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.status) params.append('status', filters.status);
            if (filters.courseId) params.append('courseId', filters.courseId);

            console.log("Cerere Frontend:", `/users?${params.toString()}`); // Debug
            
            const response = await api.get(`/users?${params.toString()}`);
            setStudents(response.data.userList || response.data);
        } catch (error) {
            console.error("Eroare CRITICĂ la incarcarea studenților:", error);
            alert("Nu s-au putut încărca studenții. Verifică Backend-ul.");
        }
    };

export default StudentsView;