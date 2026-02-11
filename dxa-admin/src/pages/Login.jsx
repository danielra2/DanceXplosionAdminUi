import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/login', { email, password });
            // Salvăm token-ul
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', response.data.role);
            
            if(response.data.role === 'ROLE_ADMIN') {
                navigate('/dashboard');
            } else {
                setError("Acces interzis! Doar adminii pot intra aici.");
            }
        } catch (err) {
            setError("Email sau parolă greșită!");
        }
    };

    return (
        <div className="login-page" style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--c-primary)' }}>
            <div className="login-card" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', width: '400px', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--c-secondary)', marginBottom: '20px' }}>DXA Admin</h2>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <form onSubmit={handleLogin}>
                    <input 
                        className="input-field"
                        type="email" 
                        placeholder="Email Admin" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                    />
                    <input 
                        className="input-field"
                        type="password" 
                        placeholder="Parola" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                    />
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                        Autentificare
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;