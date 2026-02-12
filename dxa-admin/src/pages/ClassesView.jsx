import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ClassesView.css';

function ClassesView() {
    const [classes, setClasses] = useState([]);
    const [selectedOccurrence, setSelectedOccurrence] = useState(null);
    const [attendanceList, setAttendanceList] = useState([]); 
    
    // --- NAVIGARE SĂPTĂMÂNALĂ ---
    const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newClass, setNewClass] = useState({ 
        title: '', description: '', location: 'Sala Mare - 1', scheduleEntries: [{ day: 'Luni', time: '18:00' }] 
    });

    const DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
    const HALLS = ["Sala Mare - 1", "Sala Mare - 2", "Sala Mică"];

    // 1. Fetch Template Cursuri (Orarul General)
    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
        } catch (error) {
            console.error("Eroare la incarcarea cursurilor");
        }
    };

    useEffect(() => { fetchClasses(); }, []);

    // 2. Fetch Prezență pentru o Dată Specifică (LOGICĂ FILTRARE PER CURS)
    const fetchAttendance = async (classId, dateStr) => {
        try {
            const res = await api.get(`/attendance/class/${classId}?date=${dateStr}`);
            const classDate = new Date(dateStr);
            classDate.setHours(0, 0, 0, 0);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Filtrează studenții să apară DOAR dacă sunt în perioada de înscriere ACTIVĂ pentru acest curs
            const filteredStudents = (res.data.students || []).filter(student => {
                // Verifică dacă există dată de expirare specifică pentru acest curs
                if (!student.expirationDate) {
                    return false;
                }
                
                const expirationDate = new Date(student.expirationDate);
                expirationDate.setHours(23, 59, 59, 999);
                
                // 1. Studentul nu apare dacă cursul este după data lui de expirare
                if (classDate > expirationDate) {
                    return false;
                }
                
                // 2. Verifică data înscrierii pentru a nu apărea în trecut
                if (student.enrollmentDate) {
                    const enrollmentDate = new Date(student.enrollmentDate);
                    enrollmentDate.setHours(0, 0, 0, 0);
                    return classDate >= enrollmentDate && classDate <= expirationDate;
                }
                
                // FALLBACK: Dacă nu avem enrollmentDate, nu îl lăsăm să apară în trecut față de AZI
                return classDate >= today && classDate <= expirationDate;
            });
            
            setAttendanceList(filteredStudents);
        } catch (error) {
            console.error("Eroare la incarcarea prezenței:", error);
            setAttendanceList([]);
        }
    };

    const handleClassClick = (cls, entry) => {
        setSelectedOccurrence({ cls, day: entry.day, time: entry.time });
        const dayIndex = DAYS.indexOf(entry.day); 
        if (dayIndex !== -1) {
            const specificDate = addDays(currentWeekStart, dayIndex);
            const formattedDate = formatDateISO(specificDate);
            fetchAttendance(cls.id, formattedDate); 
        }
    };

    // 4. Toggle Prezență
    const handleToggleParticipation = async (studentId, currentStatus) => {
        if (!selectedOccurrence) return;

        const dayIndex = DAYS.indexOf(selectedOccurrence.day);
        const specificDate = formatDateISO(addDays(currentWeekStart, dayIndex));

        const payload = {
            studentId: studentId,
            classId: selectedOccurrence.cls.id,
            date: specificDate,
            present: !currentStatus
        };

        try {
            await api.post('/attendance', payload);
            setAttendanceList(prev => prev.map(s => 
                s.studentId === studentId ? { ...s, participated: !currentStatus } : s
            ));
        } catch (error) {
            alert("Eroare la actualizare.");
        }
    };

    // --- NAVIGARE DATE ---
    const goToPrevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
    const goToNextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
    const goToCurrentWeek = () => setCurrentWeekStart(getMonday(new Date()));

    // --- Helpers Utilitare ---
    function getMonday(d) {
        d = new Date(d);
        var day = d.getDay(),
            diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    function addDays(date, days) {
        var result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    function formatDateISO(date) {
        return date.toISOString().split('T')[0];
    }

    function formatDateEU(date) {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function parseScheduleEntries(schedule) {
        if (!schedule) return [];
        return schedule
            .split(';')
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => {
                const day = DAYS.find(d => part.startsWith(d));
                if (!day) return null;
                const time = part.replace(day, '').trim();
                return { day, time };
            })
            .filter(Boolean);
    }

    function buildScheduleString(entries) {
        return entries
            .map(entry => `${entry.day} ${entry.time}`.trim())
            .join('; ');
    }

    const handleCreate = async () => {
        const fullSchedule = buildScheduleString(newClass.scheduleEntries);
        try {
            await api.post('/admin/classes', {
                title: newClass.title,
                description: newClass.description,
                location: newClass.location,
                schedule: fullSchedule
            });
            setIsAddModalOpen(false);
            fetchClasses();
            alert("Curs adăugat!");
        } catch (error) { alert("Eroare la creare!"); }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Ștergi cursul?")) return;
        try { await api.delete(`/admin/classes/${id}`); setSelectedOccurrence(null); fetchClasses(); } 
        catch (e) { alert("Eroare la ștergere."); }
    };

    const addScheduleEntry = () => {
        setNewClass(prev => ({
            ...prev,
            scheduleEntries: [...prev.scheduleEntries, { day: 'Luni', time: '18:00' }]
        }));
    };

    const updateScheduleEntry = (index, field, value) => {
        setNewClass(prev => ({
            ...prev,
            scheduleEntries: prev.scheduleEntries.map((entry, i) =>
                i === index ? { ...entry, [field]: value } : entry
            )
        }));
    };

    const removeScheduleEntry = (index) => {
        setNewClass(prev => ({
            ...prev,
            scheduleEntries: prev.scheduleEntries.filter((_, i) => i !== index)
        }));
    };

    const weekEnd = addDays(currentWeekStart, 6);

    return (
        <div className="schedule-section">
            
            {/* HEADER NAVIGARE SĂPTĂMÂNĂ */}
            <div className="classes-header" style={{ marginBottom: '30px', display:'flex', flexDirection:'column', alignItems:'center' }}>
                <h1 style={{margin:0, color:'var(--c-primary)', marginBottom:'15px'}}>Prezență & Orar</h1>
                
                <div className="classes-week-nav" style={{ display: 'flex', alignItems: 'center', gap: '15px', background:'white', padding:'10px 20px', borderRadius:'50px', boxShadow:'0 2px 10px rgba(0,0,0,0.1)' }}>
                    <button className="btn" onClick={goToPrevWeek} style={{color: 'black'}}>&lt;</button>
                    <div style={{textAlign:'center'}}>
                        <span style={{display:'block', fontSize:'0.8rem', color:'#888', fontWeight:'bold'}}>SĂPTĂMÂNA</span>
                        <span style={{fontSize:'1.1rem', fontWeight:'bold', color:'var(--c-secondary)'}}>
                            {formatDateEU(currentWeekStart)} - {formatDateEU(weekEnd)}
                        </span>
                    </div>
                    <button className="btn" onClick={goToNextWeek} style={{color: 'black'}}>&gt;</button>
                    <button className="btn btn-primary" style={{fontSize:'0.8rem', marginLeft:'10px'}} onClick={goToCurrentWeek}>Azi</button>
                </div>

                <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setIsAddModalOpen(true)}>
                    + Adaugă Curs în Orar
                </button>
            </div>

            {/* TABELE ORAR - DESIGN ORIGINAL */}
            {HALLS.map(hall => (
                <div key={hall} className="hall-container">
                    <h3 className="hall-header">{hall}</h3>
                    <div className="schedule-table-container">
                        {DAYS.map((day, index) => {
                            const currentDayDate = addDays(currentWeekStart, index);
                            return (
                                <div key={day} className="day-column">
                                    <h4 className="day-title">
                                        {day} <br/>
                                        <span style={{fontSize:'0.8rem', fontWeight:'normal', opacity:0.8}}>
                                            {formatDateEU(currentDayDate)}
                                        </span>
                                    </h4>
                                    <div className="class-list">
                                        {classes
                                            .filter(c => c.location === hall)
                                            .flatMap(cls => (
                                                parseScheduleEntries(cls.schedule)
                                                    .filter(entry => entry.day === day)
                                                    .map(entry => ({ cls, entry }))
                                            ))
                                            .sort((a, b) => a.entry.time.localeCompare(b.entry.time))
                                            .map(({ cls, entry }) => (
                                                <div key={`${cls.id}-${entry.day}-${entry.time}`} className="class-card" onClick={() => handleClassClick(cls, entry)}>
                                                    <span className="class-time">{entry.time}</span>
                                                    <p className="class-name">{cls.title}</p>
                                                    <div style={{fontSize:'0.7rem', color:'#999'}}>Click pentru Prezență</div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* MODAL PREZENȚĂ - DESIGN ORIGINAL CU DATE INDIVIDUALE */}
            {selectedOccurrence && (
                <div className="modal-overlay" onClick={() => setSelectedOccurrence(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setSelectedOccurrence(null)}>&times;</button>
                        
                        <h2 style={{color:'var(--c-secondary)', marginBottom:'5px'}}>{selectedOccurrence.cls.title}</h2>
                        <p style={{fontWeight:'bold', color:'#666', marginBottom:'20px'}}>
                            Data: {formatDateEU(addDays(currentWeekStart, DAYS.indexOf(selectedOccurrence.day)))}
                            {selectedOccurrence.time ? ` • Ora ${selectedOccurrence.time}` : ''}
                        </p>

                        <div style={{background:'#f9f9f9', padding:'15px', borderRadius:'8px', maxHeight:'400px', overflowY:'auto'}}>
                            {attendanceList.length > 0 ? (
                                attendanceList.map(student => (
                                    <div key={student.studentId} style={{ 
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                        padding: '10px', borderBottom: '1px solid #eee', background:'white', marginBottom:'5px', borderRadius:'4px'
                                    }}>
                                        <div>
                                            <span style={{fontWeight:'500'}}>{student.fullName}</span>
                                            {/* AFISARE DATA EXPIRARE INDIVIDUALĂ SUB NUME */}
                                            {student.expirationDate && (
                                                <div style={{fontSize:'0.7rem', color: new Date(student.expirationDate) < new Date() ? '#e74c3c' : '#888'}}>
                                                    Expiră la: {formatDateEU(student.expirationDate)}
                                                </div>
                                            )}
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap:'8px' }}>
                                            <span style={{ fontSize: '0.85rem', color: student.participated ? '#2ecc71' : '#ccc', fontWeight:'bold' }}>
                                                {student.participated ? 'PREZENT' : 'ABSENT'}
                                            </span>
                                            <input 
                                                type="checkbox" 
                                                checked={student.participated} 
                                                onChange={() => handleToggleParticipation(student.studentId, student.participated)}
                                                style={{ width: '20px', height: '20px', cursor:'pointer', accentColor:'#2ecc71' }}
                                            />
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <p style={{textAlign:'center', color:'#999'}}>Nu sunt studenți înscriși activi pentru această dată.</p>
                            )}
                        </div>
                        
                        <div style={{marginTop:'20px', textAlign:'right'}}>
                             <button className="btn btn-danger" style={{fontSize:'0.8rem'}} onClick={() => handleDelete(selectedOccurrence.cls.id)}>
                                Șterge Cursul din Orar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ADĂUGARE */}
            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{maxWidth:'500px'}}>
                        <h2 style={{marginBottom:'20px'}}>Adaugă Curs</h2>
                        <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                            <input className="input-field" placeholder="Nume Curs" value={newClass.title} onChange={e => setNewClass({...newClass, title: e.target.value})} />
                            <input className="input-field" placeholder="Nivel" value={newClass.description} onChange={e => setNewClass({...newClass, description: e.target.value})} />
                            <select className="input-field" value={newClass.location} onChange={e => setNewClass({...newClass, location: e.target.value})}>
                                {HALLS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            {newClass.scheduleEntries.map((entry, index) => (
                                <div key={`${entry.day}-${index}`} style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                    <select
                                        className="input-field"
                                        value={entry.day}
                                        onChange={e => updateScheduleEntry(index, 'day', e.target.value)}
                                    >
                                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <input
                                        type="time"
                                        className="input-field"
                                        value={entry.time}
                                        onChange={e => updateScheduleEntry(index, 'time', e.target.value)}
                                    />
                                    {newClass.scheduleEntries.length > 1 && (
                                        <button className="btn btn-danger" style={{padding:'6px 10px'}} onClick={() => removeScheduleEntry(index)}>
                                            X
                                        </button>
                                    )}
                                </div>
                            ))}
                            <div style={{textAlign:'left'}}>
                                <button className="btn" onClick={addScheduleEntry}>+ Adaugă zi</button>
                            </div>
                            <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                                <button className="btn btn-danger" onClick={() => setIsAddModalOpen(false)}>Anulează</button>
                                <button className="btn btn-primary" onClick={handleCreate}>Salvează</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClassesView;