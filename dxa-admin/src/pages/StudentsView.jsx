import React, { useState, useEffect } from 'react';
import api from '../services/api';

function StudentsView() {
    // --- STATE DATE PRINCIPALE ---
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [filters, setFilters] = useState({ search: '', status: '', courseId: '' });
    
    // --- STATE MODALURI ---
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [currentStudent, setCurrentStudent] = useState(null);

    // --- STATE FORMULAR INSCRIERE (Adaugare Nou / Tab Inscriere) ---
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [enrollMonths, setEnrollMonths] = useState(1);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [discountComment, setDiscountComment] = useState('');

    // --- STATE EDITARE PROFIL ---
    const [editingData, setEditingData] = useState({
        id: null, firstName: '', lastName: '', email: '', phone: '',
        subscriptionExpirationDate: '', lastPaymentAmount: 0, nextPaymentAmount: 0
    });

    // --- STATE CREARE STUDENT NOU ---
    const [newStudent, setNewStudent] = useState({
        firstName: '', lastName: '', email: '', password: '', phone: ''
    });

    // --- STATE STATISTICI ---
    const [studentStats, setStudentStats] = useState(null);
    const [statsRange, setStatsRange] = useState('MONTH');

    // 1. Incarcare date
    const fetchData = async () => {
        try {
            const classesRes = await api.get('/classes');
            setClasses(classesRes.data);
            fetchFilteredUsers(); 
        } catch (error) { console.error("Eroare date:", error); }
    };

    useEffect(() => { fetchData(); }, []);

    // Calcul automat pret sugerat cu logica de discount (360/2 cursuri)
    useEffect(() => {
        let basePrice = selectedClasses.length * 200;
        if (selectedClasses.length === 2) basePrice = 360;
        else if (selectedClasses.length > 2) basePrice = selectedClasses.length * 170;
        setPaymentAmount(basePrice * enrollMonths);
    }, [selectedClasses, enrollMonths]);

    const fetchFilteredUsers = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.status) params.append('status', filters.status);
            if (filters.courseId) params.append('courseId', filters.courseId);
            const response = await api.get(`/users?${params.toString()}`);
            setStudents(response.data.userList || response.data);
        } catch (error) { console.error("Eroare filtrare:", error); }
    };

    const handleResetFilters = () => {
        setFilters({ search: '', status: '', courseId: '' });
        api.get('/users').then(res => setStudents(res.data.userList || res.data));
    };

    // 2. Actiuni Modale
    const openInfoModal = (student) => {
        setCurrentStudent(student);
        setEditingData({
            id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email,
            phone: student.phone || '', subscriptionExpirationDate: student.subscriptionExpirationDate || '',
            lastPaymentAmount: student.lastPaymentAmount || 0, nextPaymentAmount: student.nextPaymentAmount || 0
        });
        setActiveTab('profile');
        setStudentStats(null);
        setSelectedClasses([]);
        setInfoModalOpen(true);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'stats' && currentStudent) fetchStats(currentStudent.id, statsRange);
    };

    // Salvare Profil & Urmatoarea Plata
    const handleUpdateStudent = async () => {
        try {
            await api.put(`/admin/users/${editingData.id}`, editingData);
            alert("Profil actualizat!");
            fetchFilteredUsers();
            setInfoModalOpen(false);
        } catch (error) { alert("Eroare la salvare."); }
    };

    // Logica Inscriere Multipla
    const processBulkEnrollment = async (studentId, currentEditingData) => {
        const newExpDate = new Date();
        newExpDate.setMonth(newExpDate.getMonth() + parseInt(enrollMonths));
        const formattedDate = newExpDate.toISOString().split('T')[0];

        for (const classId of selectedClasses) {
            // Trimitem data de expirare ca parametru daca backend-ul a fost ajustat
            await api.post(`/admin/enrollments/student/${studentId}/class/${classId}?expirationDate=${formattedDate}`);
        }

        await api.put(`/admin/users/${studentId}`, {
            ...currentEditingData,
            subscriptionExpirationDate: formattedDate,
            lastPaymentAmount: paymentAmount,
            phone: discountComment ? `${currentEditingData.phone} | NOTA: ${discountComment}` : currentEditingData.phone
        });
    };

    const handleAdminEnroll = async () => {
        if (selectedClasses.length === 0) return alert("Alege un curs!");
        try {
            await processBulkEnrollment(currentStudent.id, editingData);
            alert("Inscriere finalizata!");
            setInfoModalOpen(false);
            fetchFilteredUsers();
        } catch (error) { alert("Eroare la inscriere."); }
    };

    const handleCreateWithEnroll = async () => {
        if (!newStudent.firstName || !newStudent.lastName || !newStudent.email || !newStudent.password) {
            return alert("Completeaza campurile obligatorii!");
        }
        try {
            const res = await api.post('/users/student', newStudent);
            const created = res.data;
            if (selectedClasses.length > 0) {
                await processBulkEnrollment(created.id, { ...created, phone: newStudent.phone });
            }
            alert("Student creat si inscris!");
            setIsCreateModalOpen(false);
            fetchFilteredUsers();
        } catch (error) { alert("Eroare la creare."); }
    };

    const fetchStats = async (studentId, range) => {
        try {
            const res = await api.get(`/attendance/student/${studentId}/stats?range=${range}`);
            setStudentStats(res.data);
        } catch (error) { console.error("Eroare stats"); }
    };

    const handleClassToggle = (id) => {
        setSelectedClasses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div style={{ fontFamily: 'Georgia, serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{margin:0}}>Gestionare Studenți</h1>
                <button className="btn btn-primary" onClick={() => { setSelectedClasses([]); setIsCreateModalOpen(true); }}>+ Adaugă Student Nou</button>
            </div>
            
            {/* Filtre */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                <div style={{flex: 1}}><label style={labelStyle}>Caută nume</label><input className="input-field" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} style={{margin:0}} /></div>
                <div style={{flex: 1}}><label style={labelStyle}>Status</label><select className="input-field" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} style={{margin:0}}><option value="">Toți</option><option value="Active">Activ</option><option value="Inactive">Inactiv</option></select></div>
                <div style={{flex: 1}}><label style={labelStyle}>Curs</label><select className="input-field" value={filters.courseId} onChange={e => setFilters({...filters, courseId: e.target.value})} style={{margin:0}}><option value="">Toate</option>{classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
                <button className="btn btn-primary" onClick={fetchFilteredUsers}>🔍 Caută</button>
                <button className="btn" style={{background:'#95a5a6', color:'white'}} onClick={handleResetFilters}>Reset</button>
            </div>

            {/* Tabel Principal */}
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <thead style={{ backgroundColor: '#1A1A1A', color: 'white' }}>
                    <tr>
                        <th style={thStyle}>Student</th>
                        <th style={thStyle}>Status / Expirare</th>
                        <th style={thStyle}>Ultima Plată</th>
                        <th style={thStyle}>Următoarea Plată</th>
                        <th style={thStyle}>Acțiuni</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map(student => (
                        <tr key={student.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={tdStyle}><strong>{student.firstName} {student.lastName}</strong><br/><small>{student.email}</small></td>
                            <td style={tdStyle}>
                                <span style={{ ...statusBadge, backgroundColor: student.status === 'Active' ? '#2ecc71' : '#e74c3c' }}>{student.status || 'Inactive'}</span>
                                {student.subscriptionExpirationDate && <div style={{fontSize:'0.75rem', marginTop:'5px', color:'#888'}}>Până la: {student.subscriptionExpirationDate}</div>}
                            </td>
                            <td style={tdStyle}><b>{student.lastPaymentAmount || 0} RON</b></td>
                            <td style={tdStyle}><b style={{color: '#e67e22'}}>{student.nextPaymentAmount || 0} RON</b></td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <button className="btn" style={{ background: '#34495e', color: 'white' }} onClick={() => openInfoModal(student)}>ℹ️ Administrare</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* MODAL CREARE + INSCRIERE */}
            {isCreateModalOpen && (
                <div style={modalStyle}>
                    <div style={{ ...modalContentStyle, maxWidth: '900px', padding: '0' }}>
                        <div style={modalHeader}><h2>Adaugă Student Nou</h2><button style={closeBtn} onClick={() => setIsCreateModalOpen(false)}>&times;</button></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', padding: '25px' }}>
                            <div>
                                <h4>1. Date Personale</h4>
                                <input className="input-field" placeholder="Prenume *" onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} />
                                <input className="input-field" placeholder="Nume *" onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} />
                                <input className="input-field" placeholder="Email *" onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                                <input className="input-field" placeholder="Parolă *" type="password" onChange={e => setNewStudent({...newStudent, password: e.target.value})} />
                                <input className="input-field" placeholder="Telefon" onChange={e => setNewStudent({...newStudent, phone: e.target.value})} />
                            </div>
                            <div style={paymentSection}>
                                <h4>2. Înscriere Cursuri</h4>
                                <div style={listContainer}>
                                    {classes.map(c => (
                                        <label key={c.id} style={listItem}>
                                            <input type="checkbox" checked={selectedClasses.includes(c.id)} onChange={() => handleClassToggle(c.id)} />
                                            <div><b>{c.title}</b><br/><small>{c.schedule}</small></div>
                                        </label>
                                    ))}
                                </div>
                                <div style={{marginTop:'15px'}}>
                                    <label style={labelStyle}>Perioadă</label>
                                    <select className="input-field" value={enrollMonths} onChange={e => setEnrollMonths(e.target.value)}>
                                        <option value="1">1 Lună</option><option value="2">2 Luni</option>
                                    </select>
                                    <label style={labelStyle}>Suma de încasat azi (Editabil)</label>
                                    <input type="number" className="input-field" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '15px' }} onClick={handleCreateWithEnroll}>Creează Student</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ADMINISTRARE */}
            {infoModalOpen && currentStudent && (
                <div style={modalStyle}>
                    <div style={{ ...modalContentStyle, maxWidth:'850px', padding:'0' }}>
                        <div style={modalHeader}><h2>{currentStudent.firstName} {currentStudent.lastName}</h2><button style={closeBtn} onClick={() => setInfoModalOpen(false)}>&times;</button></div>
                        <div style={tabContainer}>
                            <button style={activeTab === 'profile' ? activeTabStyle : tabStyle} onClick={() => handleTabChange('profile')}>👤 Profil & Abonamente</button>
                            <button style={activeTab === 'enroll' ? activeTabStyle : tabStyle} onClick={() => handleTabChange('enroll')}>💃 Înscriere & Plată Acum</button>
                            <button style={activeTab === 'stats' ? activeTabStyle : tabStyle} onClick={() => handleTabChange('stats')}>📊 Statistici</button>
                        </div>

                        <div style={{padding:'25px'}}>
                            {activeTab === 'profile' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div><label style={labelStyle}>Prenume</label><input className="input-field" value={editingData.firstName} onChange={e => setEditingData({...editingData, firstName: e.target.value})} /></div>
                                        <div><label style={labelStyle}>Nume</label><input className="input-field" value={editingData.lastName} onChange={e => setEditingData({...editingData, lastName: e.target.value})} /></div>
                                    </div>

                                    <h4>Abonamente active per curs</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {currentStudent.enrolledClasses?.map(cls => (
                                            <div key={cls.id} style={subscriptionItem}>
                                                <div><b>{cls.title}</b><br/><small>{cls.schedule}</small></div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <label style={{ fontSize: '0.7rem', display: 'block' }}>Expiră la:</label>
                                                    <input type="date" className="input-field" style={{width:'auto', margin:0}} 
                                                           value={editingData.subscriptionExpirationDate} 
                                                           onChange={e => setEditingData({...editingData, subscriptionExpirationDate: e.target.value})} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{background: '#fff9f4', padding: '15px', borderRadius: '8px', border: '1px solid #ffeada'}}>
                                        <label style={{...labelStyle, color: '#e67e22'}}>Suma Următoarei Plăți (RON)</label>
                                        <input type="number" className="input-field" value={editingData.nextPaymentAmount} onChange={e => setEditingData({...editingData, nextPaymentAmount: e.target.value})} style={{margin: 0, fontWeight: 'bold', border: '1px solid #e67e22'}} />
                                    </div>
                                    <div style={{textAlign:'right'}}><button className="btn btn-primary" onClick={handleUpdateStudent}>Salvează Modificări</button></div>
                                </div>
                            )}

                            {activeTab === 'enroll' && (
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px'}}>
                                    <div>
                                        <h4>Selectează Cursuri Noi:</h4>
                                        <div style={listContainer}>
                                            {classes.map(c => (
                                                <label key={c.id} style={listItem}>
                                                    <input type="checkbox" checked={selectedClasses.includes(c.id)} onChange={() => handleClassToggle(c.id)} />
                                                    <div><b>{c.title}</b><br/><small>{c.schedule}</small></div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={paymentSection}>
                                        <h4>Detalii Plată Acum</h4>
                                        <label style={labelStyle}>Perioadă</label>
                                        <select className="input-field" value={enrollMonths} onChange={e => setEnrollMonths(e.target.value)}>
                                            <option value="1">1 Lună</option><option value="2">2 Luni</option>
                                        </select>
                                        <label style={labelStyle}>Sumă primită azi</label>
                                        <input type="number" className="input-field" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                                        <textarea className="input-field" placeholder="Motiv discount..." value={discountComment} onChange={e => setDiscountComment(e.target.value)} style={{height:'60px', resize:'none'}} />
                                        <button className="btn btn-primary" style={{width:'100%'}} onClick={handleAdminEnroll}>Confirmă Înscrierea & Plata</button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'stats' && (
                                <div>
                                    <div style={{display:'flex', gap:'10px', marginBottom:'20px', justifyContent:'center'}}>
                                        <button onClick={() => { setStatsRange('WEEK'); fetchStats(currentStudent.id, 'WEEK'); }} style={statsRange === 'WEEK' ? activeFilterBtn : filterBtn}>Săptămână</button>
                                        <button onClick={() => { setStatsRange('MONTH'); fetchStats(currentStudent.id, 'MONTH'); }} style={statsRange === 'MONTH' ? activeFilterBtn : filterBtn}>Lună</button>
                                    </div>
                                    {studentStats ? (
                                        <>
                                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'15px', marginBottom:'20px'}}>
                                                <div style={statCardStyle}><small>Rată</small><div style={{fontSize:'1.5rem', fontWeight:'bold'}}>{studentStats.attendanceRate.toFixed(1)}%</div></div>
                                                <div style={statCardStyle}><small>Prezențe</small><div style={{fontSize:'1.5rem', fontWeight:'bold'}}>{studentStats.attendedClasses}</div></div>
                                                <div style={statCardStyle}><small>Absențe</small><div style={{fontSize:'1.5rem', fontWeight:'bold'}}>{studentStats.totalClasses - studentStats.attendedClasses}</div></div>
                                            </div>
                                            <div style={{maxHeight:'200px', overflowY:'auto', background:'#f9f9f9', padding:'10px', borderRadius:'8px'}}>
                                                {studentStats.history.map((rec, i) => (
                                                    <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'8px', borderBottom:'1px solid #eee'}}>
                                                        <span>{rec.className} ({rec.date})</span>
                                                        <span style={{color: rec.present ? 'green' : 'red', fontWeight:'bold'}}>{rec.present ? 'PREZENT' : 'ABSENT'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : <p style={{textAlign:'center'}}>Se încarcă...</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// STILURI
const modalStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' };
const modalContentStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', boxShadow: '0 5px 20px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' };
const modalHeader = { padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa' };
const closeBtn = { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' };
const tabContainer = { display: 'flex', borderBottom: '1px solid #ddd' };
const tabStyle = { flex:1, padding:'15px', background:'none', border:'none', cursor:'pointer', borderBottom:'3px solid transparent', fontWeight:'bold', color:'#7f8c8d' };
const activeTabStyle = { ...tabStyle, color:'#FF7033', borderBottom:'3px solid #FF7033' };
const labelStyle = { display:'block', fontSize:'0.8rem', fontWeight:'bold', color:'#555', marginBottom:'3px' };
const statusBadge = { padding: '5px 12px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold', color: 'white' };
const thStyle = { padding: '15px', textAlign: 'left' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #eee' };
const listContainer = { border: '1px solid #eee', borderRadius: '8px', maxHeight: '250px', overflowY: 'auto' };
const listItem = { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' };
const paymentSection = { background: '#fcfcfc', padding: '20px', borderRadius: '10px', border: '1px solid #eee' };
const subscriptionItem = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee', marginBottom: '10px' };
const statCardStyle = { background: '#f8f9fa', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #eee' };
const filterBtn = { border: '1px solid #ddd', background: 'white', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer' };
const activeFilterBtn = { ...filterBtn, background: '#1A1A1A', color: 'white' };

export default StudentsView;