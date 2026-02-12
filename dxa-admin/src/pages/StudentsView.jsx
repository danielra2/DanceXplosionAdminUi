import React, { useState, useEffect } from 'react';
import api from '../services/api';

function StudentsView() {
    // --- STATE DATE ---
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState([]);
    
    // --- STATE FILTRE ---
    const [filters, setFilters] = useState({ search: '', status: '', courseId: '' });
    
    // --- STATE SORTARE ---
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');

    // --- STATE MODAL INFO ---
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('renewal'); 
    const [currentStudent, setCurrentStudent] = useState(null);
    
    // Date Profil
    const [editingData, setEditingData] = useState({}); 
    
    // Statistici
    const [studentStats, setStudentStats] = useState(null);
    
    const DEFAULT_COURSE_PRICE = 200;
    const PAYMENT_HISTORY_KEY = 'paymentHistoryByStudent';

    // Înscriere Curs Nou (ACTUALIZATĂ CU DATE DE PLATĂ)
    const [enrollmentData, setEnrollmentData] = useState({
        classId: '',
        amount: '',
        expirationDate: '',
        enrollmentNote: '',
        discountNote: ''
    });

    // --- STATE REÎNNOIRE ---
    const [renewalData, setRenewalData] = useState({
        amount: '',
        courseExpirations: {}, // { courseId: expirationDate, ... }
        selectedCourseIds: [],
        renewalNote: '',
        discountNote: ''
    });

    // --- STATE CREARE STUDENT ---
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showNewStudentCourses, setShowNewStudentCourses] = useState(false); // Toggle pentru butonul nou
    const [newStudent, setNewStudent] = useState({
        firstName: '', lastName: '', email: '', password: '', phone: '',
        subscriptionExpirationDate: '', 
        lastPaymentAmount: '', 
        lastPaymentComment: '', // Câmp pentru notă reducere
        enrolledClassIds: [],
        enrollmentNote: '',
        discountNote: ''
    });

    // 1. ÎNCĂRCARE DATE
    const fetchData = async () => {
        try {
            const classesRes = await api.get('/classes');
            setClasses(classesRes.data);
        } catch (error) { console.warn("Eroare incarcare cursuri"); }
        await fetchFilteredUsers(); 
    };
    useEffect(() => { fetchData(); }, []);

    const applyLocalFilters = (list) => {
        let filtered = Array.isArray(list) ? [...list] : [];
        if (filters.search) {
            const term = filters.search.trim().toLowerCase();
            filtered = filtered.filter(s =>
                `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(term) ||
                (s.email || '').toLowerCase().includes(term) ||
                (s.phone || '').toLowerCase().includes(term)
            );
        }
        if (filters.status) {
            const status = filters.status.toLowerCase();
            filtered = filtered.filter(s => (s.status || '').toLowerCase() === status);
        }
        if (filters.courseId) {
            const courseId = parseInt(filters.courseId, 10);
            filtered = filtered.filter(s =>
                Array.isArray(s.enrolledClasses) && s.enrolledClasses.some(c => c.id === courseId)
            );
        }
        return filtered;
    };

    const fetchFilteredUsers = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.status) params.append('status', filters.status);
            if (filters.courseId) params.append('courseId', filters.courseId);
            const response = await api.get(`/users?${params.toString()}`);
            const list = response.data.userList || response.data;
            setStudents(applyLocalFilters(list));
        } catch (error) { alert("Nu pot încărca studenții."); }
    };

    const handleResetFilters = () => {
        setFilters({ search: '', status: '', courseId: '' });
        setSortBy(null);
        api.get('/users').then(res => setStudents(res.data.userList || res.data));
    };

    const getSortedStudents = () => {
        let sorted = [...students];
        
        if (sortBy === 'student') {
            sorted.sort((a, b) => {
                const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            });
        } else if (sortBy === 'courses') {
            sorted.sort((a, b) => {
                const getNextExpiration = (student) => {
                    if (!student.enrolledClasses || student.enrolledClasses.length === 0) {
                        return new Date('9999-12-31');
                    }
                    return Math.min(...student.enrolledClasses.map(c => new Date(c.expirationDate || '9999-12-31').getTime()));
                };
                const dateA = getNextExpiration(a);
                const dateB = getNextExpiration(b);
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });
        }
        return sorted;
    };

    const handleHeaderClick = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    // 2. CONFIGURARE MODAL (DESCHIDERE)
    const openInfoModal = (student) => {
        setCurrentStudent(student);
        setPaymentHistory(loadPaymentHistory(student));
        
        setEditingData({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phone: student.phone || '',
            subscriptionExpirationDate: student.subscriptionExpirationDate || '',
            lastPaymentAmount: student.lastPaymentAmount,
            nextPaymentAmount: student.nextPaymentAmount
        });

        const currentExp = student.subscriptionExpirationDate || new Date().toISOString().split('T')[0];
        
        setEnrollmentData({
            classId: '',
            amount: '200',
            expirationDate: currentExp,
            enrollmentNote: '',
            discountNote: ''
        });

        const allEnrolledIds = student.enrolledClasses ? student.enrolledClasses.map(c => c.id) : [];
        const courseNames = student.enrolledClasses ? student.enrolledClasses.map(c => c.title).join(", ") : "";
        
        // Inițializare courseExpirations cu datele actuale
        const courseExpirations = {};
        if (student.enrolledClasses) {
            student.enrolledClasses.forEach(c => {
                courseExpirations[c.id] = c.expirationDate || '';
            });
        }
        
        setRenewalData({
            amount: student.nextPaymentAmount > 0 ? student.nextPaymentAmount : '200',
            courseExpirations: courseExpirations,
            selectedCourseIds: [],
            renewalNote: '',
            discountNote: ''
        });

        setActiveTab('renewal'); 
        setStudentStats(null); 
        setInfoModalOpen(true);
    };

    // 3. LOGICĂ CHECKBOX REÎNNOIRE
    const toggleCourseSelection = (courseId) => {
        setRenewalData(prev => {
            const isSelected = prev.selectedCourseIds.includes(courseId);
            let newSelection = isSelected 
                ? prev.selectedCourseIds.filter(id => id !== courseId)
                : [...prev.selectedCourseIds, courseId];

            const selectedNames = currentStudent.enrolledClasses
                .filter(c => newSelection.includes(c.id))
                .map(c => c.title)
                .join(", ");
            
            return { 
                ...prev, 
                selectedCourseIds: newSelection,
                renewalNote: selectedNames ? `Reînnoire: ${selectedNames}` : ""
            };
        });
    };

    // 4. SUBMIT REÎNNOIRE
    const handleRenewalSubmit = async () => {
        if (!renewalData.amount) {
            alert("⚠️ Te rog introdu SUMA.");
            return;
        }

        if (renewalData.selectedCourseIds.length === 0) {
            alert("⚠️ Te rog selectează cel puțin un curs.");
            return;
        }

        const missingDates = renewalData.selectedCourseIds.filter(id => !renewalData.courseExpirations[id]);
        if (missingDates.length > 0) {
            alert("⚠️ Te rog introdu data de expirare pentru toate cursurile selectate.");
            return;
        }

        try {
            // Reînnoiește fiecare curs separat (păstrează celelalte cursuri neschimbate)
            const renewalPromises = renewalData.selectedCourseIds.map(courseId =>
                api.post(
                    `/admin/enrollments/student/${currentStudent.id}/class/${courseId}?expirationDate=${renewalData.courseExpirations[courseId]}`
                )
            );

            await Promise.all(renewalPromises);

            // Salvează doar metadata de plată (fără să suprascrie alte cursuri)
            const selectedCourses = currentStudent.enrolledClasses
                .filter(c => renewalData.selectedCourseIds.includes(c.id))
                .map(c => ({ id: c.id, title: c.title }));

            const totalPaid = parseAmount(renewalData.amount);
            const courseCount = selectedCourses.length;

            const clearedHistory = paymentHistory.map(entry => ({
                ...entry,
                amountPaid: entry.kind === 'enroll' || entry.kind === 'renewal' ? DEFAULT_COURSE_PRICE : entry.amountPaid,
                discountAmount: 0,
                discountNote: ''
            }));

            const newPayments = selectedCourses.map((course, index) => {
                const isLast = index === courseCount - 1;
                const amountPaid = isLast
                    ? Math.max(0, totalPaid - (courseCount - 1) * DEFAULT_COURSE_PRICE)
                    : DEFAULT_COURSE_PRICE;
                const discountAmount = isLast
                    ? Math.max(0, courseCount * DEFAULT_COURSE_PRICE - totalPaid)
                    : 0;

                const reasonNote = renewalData.renewalNote || `Reînnoire: ${course.title}`;
                const discountNote = isLast ? renewalData.discountNote : '';

                return buildPaymentEntry({
                    kind: 'renewal',
                    courses: [course],
                    amountPaid,
                    discountAmount,
                    reasonNote,
                    discountNote
                });
            });

            const updatedHistory = [...clearedHistory, ...newPayments];
            savePaymentHistory(currentStudent.id, updatedHistory);
            setPaymentHistory(updatedHistory);

            const paymentPayload = {
                lastPaymentAmount: totalPaid,
                lastPaymentComment: renewalData.renewalNote || (selectedCourses.length > 0 ? `Reînnoire: ${selectedCourses.map(c => c.title).join(', ')}` : '')
            };
            await api.put(`/admin/users/${currentStudent.id}`, paymentPayload);

            alert("✅ Reînnoriri procesate!");
            setInfoModalOpen(false);
            fetchFilteredUsers();
        } catch (error) {
            console.error(error);
            alert("Eroare la procesarea reînnoririlor. Verifică datele introduse.");
        }
    };

    // 5. UPDATE PROFIL
    const handleUpdateProfile = async () => {
        try {
            await api.put(`/admin/users/${editingData.id}`, editingData);
            alert("Profil actualizat!");
            fetchFilteredUsers();
        } catch (e) { alert("Eroare la actualizare."); }
    };

    // 6. ÎNSCRIERE CURS NOU 
    const availableClasses = classes.filter(cls => 
        !currentStudent?.enrolledClasses?.some(enrolled => enrolled.id === cls.id)
    );

    const handleEnrollWithPayment = async () => {
        if (!enrollmentData.classId || !enrollmentData.expirationDate) {
            alert("Selectează cursul și data de expirare."); return;
        }
        const expirationDate = enrollmentData.expirationDate;

        try {
            await api.post(`/admin/enrollments/student/${currentStudent.id}/class/${enrollmentData.classId}?expirationDate=${expirationDate}`);
            const selectedClassName = classes.find(c => c.id === parseInt(enrollmentData.classId))?.title;
            const finalEnrollmentNote = enrollmentData.enrollmentNote || `Înscriere student la cursul: ${selectedClassName}`;
            const amountPaid = parseAmount(enrollmentData.amount);
            const discountAmount = Math.max(0, DEFAULT_COURSE_PRICE - amountPaid);

            const existingHistory = loadPaymentHistory(currentStudent);
            const clearedHistory = existingHistory.map(entry => ({
                ...entry,
                amountPaid: entry.kind === 'enroll' || entry.kind === 'renewal' ? DEFAULT_COURSE_PRICE : entry.amountPaid,
                discountAmount: 0,
                discountNote: ''
            }));

            const newPayment = buildPaymentEntry({
                kind: 'enroll',
                courses: selectedClassName ? [{ id: parseInt(enrollmentData.classId), title: selectedClassName }] : [],
                amountPaid,
                discountAmount,
                reasonNote: finalEnrollmentNote,
                discountNote: enrollmentData.discountNote
            });

            const updatedHistory = [...clearedHistory, newPayment];
            savePaymentHistory(currentStudent.id, updatedHistory);
            setPaymentHistory(updatedHistory);

            const paymentPayload = {
                subscriptionExpirationDate: expirationDate,
                lastPaymentAmount: amountPaid,
                lastPaymentComment: finalEnrollmentNote
            };

            await api.put(`/admin/users/${currentStudent.id}`, paymentPayload);

            alert("✅ Student înscris și date de plată salvate!");
            setInfoModalOpen(false);
            fetchFilteredUsers();
        } catch (e) { 
            alert("Eroare la înscriere."); 
        }
    };

    const handleUnenroll = async (classId) => {
        if(confirm("Sigur scoți studentul de la acest curs?")) {
            try {
                await api.delete(`/admin/enrollments/student/${currentStudent.id}/class/${classId}`);
                alert("Dezabonat.");
                setInfoModalOpen(false);
                fetchFilteredUsers();
            } catch (e) { alert("Eroare la dezabonare."); }
        }
    };

    // 7. CREARE STUDENT
    const toggleNewStudentCourse = (courseId) => {
        setNewStudent(prev => {
            const isSelected = prev.enrolledClassIds.includes(courseId);
            const newIds = isSelected 
                ? prev.enrolledClassIds.filter(id => id !== courseId) 
                : [...prev.enrolledClassIds, courseId];
            
            // Auto-generează comentariul cu numele cursurilor selectate
            const selectedCourseNames = classes
                .filter(c => newIds.includes(c.id))
                .map(c => c.title)
                .join(', ');
            
            const autoComment = selectedCourseNames ? `Înscriere student la cursul: ${selectedCourseNames}` : '';
            
            return { 
                ...prev, 
                enrolledClassIds: newIds,
                lastPaymentAmount: newIds.length > 0 ? '200' : '',
                lastPaymentComment: autoComment,
                enrollmentNote: autoComment
            };
        });
    };

    const handleCreateStudent = async () => {
        try { 
            const payload = {
                ...newStudent,
                lastPaymentComment: newStudent.enrollmentNote || newStudent.lastPaymentComment
            };
            const res = await api.post('/users/student', payload); 
            const createdId = res?.data?.id || res?.data?.user?.id;

            if (createdId && newStudent.enrolledClassIds.length > 0) {
                const selectedCourses = classes.filter(c => newStudent.enrolledClassIds.includes(c.id));
                const totalPaid = parseAmount(newStudent.lastPaymentAmount);
                const courseCount = selectedCourses.length;

                const historyEntries = selectedCourses.map((course, index) => {
                    const isLast = index === courseCount - 1;
                    const amountPaid = isLast
                        ? Math.max(0, totalPaid - (courseCount - 1) * DEFAULT_COURSE_PRICE)
                        : DEFAULT_COURSE_PRICE;
                    const discountAmount = isLast
                        ? Math.max(0, courseCount * DEFAULT_COURSE_PRICE - totalPaid)
                        : 0;

                    const reasonNote = newStudent.enrollmentNote || `Înscriere student la cursul: ${course.title}`;
                    const discountNote = isLast ? newStudent.discountNote : '';

                    return buildPaymentEntry({
                        kind: 'enroll',
                        courses: [{ id: course.id, title: course.title }],
                        amountPaid,
                        discountAmount,
                        reasonNote,
                        discountNote
                    });
                });

                savePaymentHistory(createdId, historyEntries);
            }

            alert("Student Creat!"); 
            setIsCreateModalOpen(false); 
            setShowNewStudentCourses(false);
            setNewStudent({
                firstName: '', lastName: '', email: '', password: '', phone: '',
                subscriptionExpirationDate: '', lastPaymentAmount: '', lastPaymentComment: '', enrolledClassIds: [],
                enrollmentNote: '', discountNote: ''
            });
            fetchFilteredUsers(); 
        } catch (e) { alert("Eroare la creare."); }
    };

    // 8. STATISTICI
    const fetchStats = async (studentId, range) => {
        try { 
            const res = await api.get(`/attendance/student/${studentId}/stats?range=${range}`); 
            setStudentStats(res.data); 
        } catch (e) {}
    };

    // FUNCȚIE FORMATARE DATĂ EUROPEAN (dd.mm.yyyy)
    const formatDateEU = (dateString) => {
        if (!dateString) return 'Fără dată';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    // CONVERTIRE YYYY-MM-DD la dd.mm.yyyy
    const formatDateInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    };

    const parseAmount = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const loadPaymentHistory = (student) => {
        if (!student?.id) return [];
        let map = {};
        try {
            map = JSON.parse(localStorage.getItem(PAYMENT_HISTORY_KEY) || '{}');
        } catch (e) {
            map = {};
        }
        const history = Array.isArray(map[student.id]) ? map[student.id] : [];
        if (history.length > 0) return history;

        if (student.lastPaymentAmount || student.lastPaymentComment) {
            const courseTitles = (student.enrolledClasses || []).map(c => ({ id: c.id, title: c.title }));
            return [
                {
                    id: `legacy-${student.id}`,
                    date: new Date().toISOString(),
                    kind: 'legacy',
                    courses: courseTitles.slice(0, 1),
                    amountPaid: parseAmount(student.lastPaymentAmount),
                    discountAmount: 0,
                    reasonNote: student.lastPaymentComment || '',
                    discountNote: ''
                }
            ];
        }

        return [];
    };

    const savePaymentHistory = (studentId, history) => {
        if (!studentId) return;
        let map = {};
        try {
            map = JSON.parse(localStorage.getItem(PAYMENT_HISTORY_KEY) || '{}');
        } catch (e) {
            map = {};
        }
        map[studentId] = history.slice(-50);
        localStorage.setItem(PAYMENT_HISTORY_KEY, JSON.stringify(map));
    };

    const buildPaymentEntry = ({ kind, courses, amountPaid, discountAmount, reasonNote, discountNote }) => ({
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString(),
        kind,
        courses,
        amountPaid,
        discountAmount,
        reasonNote,
        discountNote
    });

    const recentPayments = paymentHistory
        .slice()
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        .slice(0, 3);

    return (
        <div>
            {/* HEADER */}
            <div className="students-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{margin:0, fontFamily:'Georgia', color:'var(--c-primary)'}}>Gestionare Studenți</h1>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>+ Adaugă Student</button>
            </div>
            
            {/* FILTRE */}
            <div className="students-filters" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '25px', alignItems:'flex-end', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' }}>
                <div style={{flex:1, minWidth:'200px'}}><label style={labelStyle}>Nume</label><input className="input-field" placeholder="Căutare..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} style={{margin:0}}/></div>
                <div style={{flex:1, minWidth:'150px'}}><label style={labelStyle}>Status</label><select className="input-field" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} style={{margin:0}}><option value="">Toți</option><option value="Active">Activ</option><option value="Inactive">Inactiv</option></select></div>
                <div style={{flex:1, minWidth:'180px'}}>
                    <label style={labelStyle}>Sortare</label>
                    <select
                        className="input-field"
                        value={sortBy ? `${sortBy}:${sortOrder}` : ''}
                        onChange={e => {
                            const [column, order] = e.target.value.split(':');
                            if (!column) {
                                setSortBy(null);
                                setSortOrder('asc');
                                return;
                            }
                            setSortBy(column);
                            setSortOrder(order || 'asc');
                        }}
                        style={{margin:0}}
                    >
                        <option value="">Fără sortare</option>
                        <option value="student:asc">Nume A-Z</option>
                        <option value="student:desc">Nume Z-A</option>
                        <option value="courses:asc">Expirare apropiată</option>
                        <option value="courses:desc">Expirare îndepărtată</option>
                    </select>
                </div>
                <button className="btn btn-primary" onClick={fetchFilteredUsers}>🔍 Caută</button>
                <button className="btn" style={{background:'#95a5a6', color:'white'}} onClick={handleResetFilters}>Reset</button>
            </div>

            {/* TABEL */}
            <div className="students-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
                    <thead style={{ backgroundColor: 'var(--c-primary)', color: 'white' }}>
                        <tr>
                            <th style={{padding:'15px', textAlign:'left', cursor:'pointer', userSelect:'none'}} onClick={() => handleHeaderClick('student')}>
                                Student {sortBy === 'student' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{padding:'15px', textAlign:'left'}}>Status</th>
                            <th style={{padding:'15px', textAlign:'left', cursor:'pointer', userSelect:'none'}} onClick={() => handleHeaderClick('courses')}>
                                Cursuri {sortBy === 'courses' && (sortOrder === 'asc' ? '↑ (îndepărtat)' : '↓ (apropiat)')}
                            </th>
                            <th style={{padding:'15px', textAlign:'center'}}>Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getSortedStudents().map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td data-label="Student" style={{padding:'15px'}}>
                                    <div style={{fontWeight:'bold', fontSize:'1rem'}}>{s.firstName} {s.lastName}</div>
                                    <div style={{fontSize:'0.8rem', color:'#888'}}>{s.email}</div>
                                    {s.phone && <div style={{fontSize:'0.8rem', color:'#555'}}>📞 {s.phone}</div>}
                                </td>
                                <td data-label="Status" style={{padding:'15px'}}>
                                    <span style={{
                                        padding:'5px 12px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:'bold', textTransform:'uppercase',
                                        backgroundColor: s.status === 'Active' ? '#e8f5e9' : '#ffebee',
                                        color: s.status === 'Active' ? '#2ecc71' : '#e74c3c',
                                        border: `1px solid ${s.status === 'Active' ? '#2ecc71' : '#e74c3c'}`
                                    }}>
                                        {s.status === 'Active' ? 'ACTIV' : 'EXPIRAT'}
                                    </span>
                                </td>

                                <td data-label="Cursuri" style={{padding:'15px'}}>
                                    <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                                        {s.enrolledClasses && s.enrolledClasses.length > 0 ? 
                                            s.enrolledClasses.map(c => (
                                                <div key={c.id} style={{
                                                    background:'#f8f9fa', 
                                                    border: '1px solid #ddd', 
                                                    padding:'4px 8px', 
                                                    borderRadius:'6px',
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}>
                                                    <span style={{fontSize:'0.85rem', fontWeight:'600'}}>{c.title}</span>
                                                    <span style={{fontSize:'0.7rem', color:'#666'}}>
                                                        Exp: {formatDateEU(c.expirationDate)}
                                                    </span>
                                                </div>
                                            ))
                                            : <span style={{color:'#ccc', fontSize:'0.8rem'}}>-</span>
                                        }
                                    </div>
                                </td>
                                <td data-label="Acțiuni" style={{padding:'15px', textAlign:'center'}}>
                                    <button className="btn" style={{background:'#2c3e50', color:'white', fontSize:'0.85rem', padding:'8px 16px'}} onClick={() => openInfoModal(s)}>
                                        📂 Detalii
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL DETALII STUDENT --- */}
            {infoModalOpen && currentStudent && (
                <div style={modalStyle}>
                    <div className="student-modal-content" style={modalContentStyle}>
                        
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', paddingBottom:'15px', borderBottom:'1px solid #eee'}}>
                            <div>
                                <h2 style={{margin:0, color:'var(--c-primary)'}}>{currentStudent.firstName} {currentStudent.lastName}</h2>
                                <span style={{color:'#7f8c8d', fontSize:'0.9rem'}}>Panou Administrator</span>
                            </div>
                            <button onClick={() => setInfoModalOpen(false)} style={{fontSize:'1.5rem', background:'none', border:'none', cursor:'pointer'}}>&times;</button>
                        </div>

                        <div className="student-modal-tabs" style={{display:'flex', gap:'10px', marginBottom:'25px', background:'#f8f9fa', padding:'5px', borderRadius:'8px'}}>
                            <button style={activeTab === 'renewal' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('renewal')}>💳 Reînnoire & Plăți</button>
                            <button style={activeTab === 'enroll' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('enroll')}>📝 Înscrieri Cursuri</button>
                            <button style={activeTab === 'stats' ? activeTabStyle : tabStyle} onClick={() => {setActiveTab('stats'); fetchStats(currentStudent.id, 'MONTH')}}>📊 Prezență</button>
                            <button style={activeTab === 'profile' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('profile')}>👤 Editare Profil</button>
                        </div>

                        {activeTab === 'renewal' && (
                            <div className="student-renewal-grid" style={{display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:'20px'}}>
                                <div style={{background:'#f0f4f8', padding:'15px', borderRadius:'8px', height:'fit-content'}}>
                                    <h4 style={{margin:'0 0 15px 0', color:'#2980b9', borderBottom:'1px solid #dae1e7', paddingBottom:'8px'}}>📜 Istoric Ultimele 3 Plăți</h4>
                                    {recentPayments.length === 0 ? (
                                        <div style={{color:'#7f8c8d', fontSize:'0.9rem'}}>Fără plăți înregistrate.</div>
                                    ) : (
                                        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                                            {recentPayments.map(payment => (
                                                <div key={payment.id} style={{background:'white', border:'1px solid #ddd', padding:'10px', borderRadius:'6px'}}>
                                                    <div style={{display:'flex', justifyContent:'space-between', gap:'10px', marginBottom:'6px'}}>
                                                        <div style={{fontSize:'0.8rem', color:'#7f8c8d'}}>{formatDateEU(payment.date)}</div>
                                                        <div style={{fontSize:'0.8rem', color:'#7f8c8d', textTransform:'uppercase'}}>{payment.kind === 'renewal' ? 'Reînnoire' : 'Înscriere'}</div>
                                                    </div>
                                                    {payment.courses && payment.courses.length > 0 && (
                                                        <div style={{fontSize:'0.85rem', fontWeight:'600', color:'#2c3e50', marginBottom:'6px'}}>
                                                            {payment.courses.map(c => c.title).join(', ')}
                                                        </div>
                                                    )}
                                                    <div style={{fontSize:'0.85rem', color:'#2c3e50'}}>Suma plătită: <strong>{payment.amountPaid} RON</strong></div>
                                                    {payment.discountAmount > 0 && (
                                                        <div style={{fontSize:'0.85rem', color:'#27ae60'}}>Discount: <strong>{payment.discountAmount} RON</strong></div>
                                                    )}
                                                    {payment.reasonNote && (
                                                        <div style={{fontSize:'0.8rem', color:'#34495e', marginTop:'6px'}}>Motiv: {payment.reasonNote}</div>
                                                    )}
                                                    {payment.discountNote && (
                                                        <div style={{fontSize:'0.8rem', color:'#34495e'}}>Motiv reducere: {payment.discountNote}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{border:'1px solid #e0e0e0', padding:'20px', borderRadius:'8px', background:'white'}}>
                                    <h4 style={{margin:'0 0 15px 0', color:'#27ae60'}}>💰 Reînnorire Abonament pe Curs</h4>
                                    <label style={labelStyle}>Selectează Cursuri pentru Reînnorire</label>
                                    <div style={{display:'flex', flexDirection:'column', gap:'12px', marginBottom:'20px', maxHeight:'200px', overflowY:'auto', background:'#fafafa', padding:'12px', borderRadius:'6px', border:'1px solid #eee'}}>
                                        {currentStudent.enrolledClasses?.map(cls => (
                                            <div key={cls.id} style={{background:'white', padding:'12px', borderRadius:'6px', border: renewalData.selectedCourseIds.includes(cls.id) ? '2px solid #27ae60' : '1px solid #ddd'}}>
                                                <label style={{display:'flex', alignItems:'flex-start', gap:'10px', cursor:'pointer', marginBottom:'10px'}}>
                                                    <input type="checkbox" checked={renewalData.selectedCourseIds.includes(cls.id)} onChange={() => toggleCourseSelection(cls.id)} style={{marginTop:'2px'}} />
                                                    <div style={{flex:1}}>
                                                        <div style={{fontWeight:'500', fontSize:'0.95rem'}}>{cls.title}</div>
                                                        {cls.expirationDate && <div style={{fontSize:'0.75rem', color:'#666', marginTop:'2px'}}>Data actuală: {formatDateEU(cls.expirationDate)}</div>}
                                                    </div>
                                                </label>
                                                {renewalData.selectedCourseIds.includes(cls.id) && (
                                                    <div style={{marginLeft:'30px'}}>
                                                        <label style={{...labelStyle, fontSize:'0.8rem', marginBottom:'5px'}}>Expiră La (noua dată)</label>
                                                        <input
                                                            type="date"
                                                            lang="ro-RO"
                                                            className="input-field"
                                                            value={formatDateInput(renewalData.courseExpirations[cls.id])}
                                                            onChange={e => {
                                                                const isoDate = e.target.value;
                                                                setRenewalData({...renewalData, courseExpirations: {...renewalData.courseExpirations, [cls.id]: isoDate}});
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{marginBottom:'15px'}}>
                                        <label style={{...labelStyle, minHeight:'40px', lineHeight:'1.3'}}>Suma (RON)</label>
                                        <input type="number" className="input-field" value={renewalData.amount} onChange={e => setRenewalData({...renewalData, amount: e.target.value})} style={{borderColor:'#27ae60'}} />
                                    </div>
                                    <label style={labelStyle}>Notă / Motiv Reînnoire</label>
                                    <textarea className="input-field" rows="2" value={renewalData.renewalNote} onChange={e => setRenewalData({...renewalData, renewalNote: e.target.value})} style={{fontSize:'0.85rem', resize:'none'}} />
                                    <label style={{...labelStyle, marginTop:'10px'}}>Notă / Motiv Reducere</label>
                                    <textarea className="input-field" rows="2" value={renewalData.discountNote} onChange={e => setRenewalData({...renewalData, discountNote: e.target.value})} style={{fontSize:'0.85rem', resize:'none'}} />
                                    <button onClick={handleRenewalSubmit} className="btn" style={{width:'100%', background:'#27ae60', color:'white', marginTop:'15px'}}>CONFIRMĂ PLATA</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'enroll' && (
                            <div>
                                <h4 style={{marginTop:0, color:'#555'}}>Cursuri Active:</h4>
                                <div style={{display:'flex', flexWrap:'wrap', gap:'10px', marginBottom:'30px'}}>
                                    {currentStudent.enrolledClasses?.length > 0 ? 
                                        currentStudent.enrolledClasses.map(c => (
                                            <div key={c.id} style={{background:'#fff', border:'1px solid #ddd', padding:'8px 12px', borderRadius:'6px', display:'flex', alignItems:'center', gap:'10px', boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>
                                                <strong>{c.title}</strong>
                                                <button onClick={() => handleUnenroll(c.id)} style={{color:'#e74c3c', background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem'}}>&times;</button>
                                            </div>
                                        )) : <p style={{color:'#999'}}>Nicio înscriere activă.</p>
                                    }
                                </div>
                                <div style={{background:'#f8f9fa', padding:'25px', borderRadius:'10px', border:'2px dashed #ddd'}}>
                                    <h4 style={{margin:'0 0 20px 0', color:'var(--c-secondary)', display:'flex', alignItems:'center', gap:'10px'}}>
                                         Înscrie la un Curs Nou & Configurează Plată
                                    </h4>
                                    {availableClasses.length > 0 ? (
                                        <div className="student-enroll-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                                            <div style={{gridColumn:'1 / -1'}}>
                                                <label style={labelStyle}>Alege Cursul</label>
                                                <select className="input-field" value={enrollmentData.classId} onChange={e => {
                                                    const selectedCourse = availableClasses.find(c => c.id === parseInt(e.target.value));
                                                    setEnrollmentData({
                                                        ...enrollmentData, 
                                                        classId: e.target.value,
                                                        enrollmentNote: selectedCourse ? `Înscriere student la cursul: ${selectedCourse.title}` : ''
                                                    });
                                                }}>
                                                    <option value="">-- Selectează Curs --</option>
                                                    {availableClasses.map(c => <option key={c.id} value={c.id}>{c.title} ({c.schedule})</option>)}
                                                </select>
                                            </div>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                <label style={{...labelStyle, minHeight:'40px', lineHeight:'1.3'}}>Suma Achitată (RON)</label>
                                                <input type="number" className="input-field" placeholder="Ex: 150" value={enrollmentData.amount} onChange={e => setEnrollmentData({...enrollmentData, amount: e.target.value})} />
                                            </div>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                <label style={{...labelStyle, minHeight:'40px', lineHeight:'1.3'}}>Valabil Până La</label>
                                                <input
                                                    type="date"
                                                    lang="ro-RO"
                                                    className="input-field"
                                                    value={formatDateInput(enrollmentData.expirationDate)}
                                                    onChange={e => setEnrollmentData({...enrollmentData, expirationDate: e.target.value})}
                                                />
                                            </div>
                                            <div style={{gridColumn:'1 / -1'}}>
                                                <label style={labelStyle}>Motiv Înscriere</label>
                                                <input className="input-field" placeholder="Auto" value={enrollmentData.enrollmentNote} onChange={e => setEnrollmentData({...enrollmentData, enrollmentNote: e.target.value})} />
                                            </div>
                                            <div style={{gridColumn:'1 / -1'}}>
                                                <label style={labelStyle}>Notă / Motiv Reducere</label>
                                                <input className="input-field" placeholder="Opțional" value={enrollmentData.discountNote} onChange={e => setEnrollmentData({...enrollmentData, discountNote: e.target.value})} />
                                            </div>
                                            <div style={{gridColumn:'1 / -1', textAlign:'right'}}>
                                                <button className="btn btn-primary" onClick={handleEnrollWithPayment} style={{padding:'12px 30px', fontSize:'1rem'}}>Finalizează Înscrierea</button>
                                            </div>
                                        </div>
                                    ) : <div style={{textAlign:'center', color:'#27ae60', fontWeight:'bold'}}>Studentul este înscris la toate cursurile!</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'stats' && (
                            <div>
                                <div className="student-stats-filters" style={{display:'flex', gap:'10px', justifyContent:'center', marginBottom:'20px'}}>
                                    <button onClick={() => fetchStats(currentStudent.id, 'WEEK')} style={filterBtn}>Săptămână</button>
                                    <button onClick={() => fetchStats(currentStudent.id, 'MONTH')} style={{...filterBtn, background: 'var(--c-primary)', color:'white'}}>Lună</button>
                                </div>
                                {studentStats ? (
                                    <div>
                                        {/* Summary Section */}
                                        <div style={{background:'#f0f4f8', padding:'20px', borderRadius:'8px', marginBottom:'25px'}}>
                                            <h4 style={{margin:'0 0 15px 0', color:'#2c3e50', borderBottom:'2px solid #ddd', paddingBottom:'10px'}}>📊 Rezumat Prezență</h4>
                                            <div className="student-stats-summary" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                                                <div style={{textAlign:'center'}}>
                                                    <div style={{fontSize:'2.5rem', fontWeight:'bold', color:'#2ecc71', marginBottom:'5px'}}>{studentStats.coursesAttendedThisWeek || 0}</div>
                                                    <p style={{color:'#666', margin:0}}>Cursuri prezente <br/><span style={{fontSize:'0.85rem', color:'#999'}}>această săptămână</span></p>
                                                </div>
                                                <div style={{textAlign:'center'}}>
                                                    <div style={{fontSize:'2.5rem', fontWeight:'bold', color:'#3498db', marginBottom:'5px'}}>{studentStats.coursesAttendedThisMonth || 0}</div>
                                                    <p style={{color:'#666', margin:0}}>Cursuri prezente <br/><span style={{fontSize:'0.85rem', color:'#999'}}>această lună</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Per-Course Details */}
                                        {studentStats.courseDetails && studentStats.courseDetails.length > 0 ? (
                                            <div>
                                                <h4 style={{borderBottom:'2px solid #eee', paddingBottom:'10px', color:'#2c3e50', marginBottom:'15px'}}>📚 Detalii Prezență pe Curs</h4>
                                                <div style={{display:'grid', gap:'15px'}}>
                                                    {studentStats.courseDetails.map((course, idx) => {
                                                        const percentage = course.totalClasses > 0 ? ((course.presentDays / course.totalClasses) * 100).toFixed(0) : 0;
                                                        return (
                                                            <div key={idx} style={{border:'1px solid #e0e0e0', padding:'15px', borderRadius:'8px', background:'#fafafa'}}>
                                                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                                                                    <h5 style={{margin:0, color:'#2c3e50', fontSize:'1rem'}}>{course.courseTitle}</h5>
                                                                    <span style={{fontSize:'1.4rem', fontWeight:'bold', color: percentage >= 70 ? '#2ecc71' : percentage >= 50 ? '#f39c12' : '#e74c3c'}}>{percentage}%</span>
                                                                </div>
                                                                <div style={{display:'flex', gap:'15px', fontSize:'0.9rem', color:'#555', marginBottom:'12px'}}>
                                                                    <div>Prezente: <strong style={{color:'#2ecc71'}}>{course.presentDays}</strong></div>
                                                                    <div>Total: <strong>{course.totalClasses}</strong></div>
                                                                </div>
                                                                {course.attendanceDates && course.attendanceDates.length > 0 && (
                                                                    <div style={{background:'white', padding:'10px', borderRadius:'6px', border:'1px solid #eee'}}>
                                                                        <div style={{fontSize:'0.8rem', fontWeight:'bold', color:'#666', marginBottom:'8px'}}>Zile de prezență:</div>
                                                                        <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                                                                            {course.attendanceDates.map((date, i) => (
                                                                                <span key={i} style={{background:'#e8f5e9', color:'#2ecc71', padding:'4px 10px', borderRadius:'4px', fontSize:'0.8rem', fontWeight:'500'}}>
                                                                                    {formatDateEU(date)}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{textAlign:'center', padding:'20px', color:'#999'}}>
                                                <p>Nu sunt date de prezență disponibile pentru această perioadă.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : <p style={{textAlign:'center', color:'#999'}}>Se încarcă...</p>}
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="student-profile-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                                <div><label style={labelStyle}>Prenume</label><input className="input-field" value={editingData.firstName} onChange={e => setEditingData({...editingData, firstName: e.target.value})} /></div>
                                <div><label style={labelStyle}>Nume</label><input className="input-field" value={editingData.lastName} onChange={e => setEditingData({...editingData, lastName: e.target.value})} /></div>
                                <div style={{gridColumn:'1/-1', textAlign:'right', marginTop:'15px'}}><button className="btn btn-primary" onClick={handleUpdateProfile}>Salvează Modificări</button></div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- MODAL CREARE STUDENT --- */}
            {isCreateModalOpen && (
                <div style={modalStyle}>
                    <div className="student-modal-content" style={{...modalContentStyle, maxWidth:'700px'}}>
                        <h2 style={{marginTop:0, borderBottom:'1px solid #eee', paddingBottom:'10px', color:'var(--c-primary)'}}>Înregistrare Student Nou</h2>
                        <div className="student-create-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'15px'}}>
                            
                            {/* COLOANA 1: DATE PERSONALE */}
                            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                                <h4 style={{margin:'0 0 5px 0', color:'#555'}}>👤 Date Personale</h4>
                                <input className="input-field" placeholder="Prenume" value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} />
                                <input className="input-field" placeholder="Nume" value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} />
                                <input className="input-field" placeholder="Email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                                <input className="input-field" placeholder="Telefon" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} />
                                <input className="input-field" type="password" placeholder="Parola" value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} />
                            </div>

                            {/* COLOANA 2: CURSURI ȘI PLATĂ */}
                            <div style={{display:'flex', flexDirection:'column', gap:'10px', background:'#f8f9fa', padding:'15px', borderRadius:'8px', border:'1px solid #eee'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                                    <h4 style={{margin:0, color:'#27ae60'}}>💃 Cursuri & Plată</h4>
                                    <button 
                                        className="btn" 
                                        style={{background: showNewStudentCourses ? '#ccc' : 'var(--c-secondary)', padding:'5px 12px', fontSize:'0.7rem'}}
                                        onClick={() => setShowNewStudentCourses(!showNewStudentCourses)}
                                    >
                                        {showNewStudentCourses ? "Închide" : "+ Înscrie la curs"}
                                    </button>
                                </div>
                                
                                {showNewStudentCourses ? (
                                    <div style={{maxHeight:'140px', overflowY:'auto', background:'white', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', marginBottom:'10px'}}>
                                        {classes.map(cls => (
                                            <label key={cls.id} style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'5px', fontSize:'0.85rem', cursor:'pointer'}}>
                                                <input type="checkbox" checked={newStudent.enrolledClassIds.includes(cls.id)} onChange={() => toggleNewStudentCourse(cls.id)} />
                                                {cls.title}
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{textAlign:'center', padding:'15px', color:'#999', border:'1px dashed #ccc', borderRadius:'6px', fontSize:'0.8rem', marginBottom:'10px'}}>
                                        {newStudent.enrolledClassIds.length > 0 
                                            ? `Ați selectat ${newStudent.enrolledClassIds.length} cursuri` 
                                            : "Niciun curs selectat încă"}
                                    </div>
                                )}

                                {/* DATELE DE PLATĂ APAR DOAR DACĂ EXISTĂ CEL PUȚIN UN CURS SELECTAT */}
                                {newStudent.enrolledClassIds.length > 0 && (
                                    <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                                        <div className="student-create-payment-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                <label style={{...labelStyle, minHeight:'40px', lineHeight:'1.3'}}>Suma Achitată (RON)</label>
                                                <input className="input-field" type="number" placeholder="0" value={newStudent.lastPaymentAmount} onChange={e => setNewStudent({...newStudent, lastPaymentAmount: e.target.value})} />
                                            </div>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                <label style={{...labelStyle, minHeight:'40px', lineHeight:'1.3'}}>Expiră La</label>
                                                <input
                                                    className="input-field"
                                                    type="date"
                                                    lang="ro-RO"
                                                    value={formatDateInput(newStudent.subscriptionExpirationDate)}
                                                    onChange={e => setNewStudent({...newStudent, subscriptionExpirationDate: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <label style={labelStyle}>Motiv Înscriere</label>
                                        <input className="input-field" placeholder="Auto" value={newStudent.enrollmentNote} onChange={e => setNewStudent({...newStudent, enrollmentNote: e.target.value, lastPaymentComment: e.target.value})} />
                                        <label style={{...labelStyle, marginTop:'10px'}}>Notă / Motiv Reducere</label>
                                        <input className="input-field" placeholder="Ex: Reducere grup" value={newStudent.discountNote} onChange={e => setNewStudent({...newStudent, discountNote: e.target.value})} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{marginTop:'25px', display:'flex', justifyContent:'flex-end', gap:'10px', borderTop:'1px solid #eee', paddingTop:'15px'}}>
                            <button className="btn" style={{background:'#ccc'}} onClick={() => setIsCreateModalOpen(false)}>Anulează</button>
                            <button className="btn btn-primary" onClick={handleCreateStudent}>Creează Student</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// STILURI
const modalStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' };
const modalContentStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };
const tabStyle = { flex:1, padding:'10px', background:'transparent', border:'none', cursor:'pointer', borderBottom:'3px solid transparent', fontWeight:'600', color:'#7f8c8d' };
const activeTabStyle = { ...tabStyle, color:'var(--c-primary)', borderBottom:'3px solid var(--c-primary)', background:'#fff' };
const labelStyle = { display:'block', fontSize:'0.75rem', fontWeight:'bold', color:'#555', marginBottom:'5px', textTransform:'uppercase' };
const filterBtn = { border:'1px solid #ddd', padding:'6px 15px', borderRadius:'20px', cursor:'pointer', fontWeight:'bold', background:'white' };

export default StudentsView;