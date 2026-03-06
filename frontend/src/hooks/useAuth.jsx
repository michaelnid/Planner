import { useState, useEffect, createContext, useContext } from 'react';
import { login as apiLogin, logout as apiLogout, getMe, setAccessToken, setLogoutHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const handleLogout = () => {
        setAccessToken(null);
        setUser(null);
    };

    useEffect(() => {
        setLogoutHandler(handleLogout);
        // Try to restore session via refresh token cookie
        getMe()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const login = async (username, password) => {
        const data = await apiLogin(username, password);
        setAccessToken(data.access_token);
        const me = await getMe();
        setUser(me);
        return me;
    };

    const logout = async () => {
        await apiLogout();
        handleLogout();
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
