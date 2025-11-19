
import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import { AppContextType, Page, User, Presentation } from './types';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';

// Create a context for the entire application.
export const AppContext = createContext<AppContextType>({} as AppContextType);

const API_URL = 'http://localhost:8000/api';

// The main application component.
const App: React.FC = () => {
    // State management for the application.
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [page, setPage] = useState<Page>(Page.Login);
    const [user, setUser] = useState<User | null>(null);
    const [presentations, setPresentations] = useState<Presentation[]>([]);
    const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);

    // Fetch presentations when user logs in
    useEffect(() => {
        if (user) {
            fetch(`${API_URL}/presentations/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setPresentations(data);
                    }
                })
                .catch(err => console.error("Failed to fetch presentations", err));
        } else {
            setPresentations([]);
        }
    }, [user]);

    // Navigation logic.
    const navigateTo = useCallback((newPage: Page) => {
        // Reset current presentation when leaving the editor.
        if (newPage !== Page.Editor) {
            setCurrentPresentation(null);
        }
        // Redirect to dashboard if logged in and trying to access auth pages.
        if (user && (newPage === Page.Login || newPage === Page.SignUp)) {
            setPage(Page.Dashboard);
            return;
        }
        // Redirect to login if not logged in and trying to access protected pages.
        if (!user && (newPage === Page.Dashboard || newPage === Page.Home || newPage === Page.Editor)) {
            setPage(Page.Login);
            return;
        }
        setPage(newPage);
    }, [user]);
    
    // Login handler.
    const login = useCallback((loggedInUser: User) => {
        setUser(loggedInUser);
        // On login, navigate to the dashboard.
        navigateTo(Page.Dashboard);
    }, [navigateTo]);

    // Logout handler.
    const logout = useCallback(() => {
        setUser(null);
        setCurrentPresentation(null);
        setPresentations([]);
        // On logout, navigate to the login page.
        navigateTo(Page.Login);
    }, [navigateTo]);

    // Add a new presentation.
    const addPresentation = useCallback(async (presentationData: Omit<Presentation, 'id' | 'userId'>) => {
        if (!user) return;
        
        try {
            const response = await fetch(`${API_URL}/presentations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...presentationData, userId: user.id })
            });
            
            if (response.ok) {
                const newPresentation = await response.json();
                setPresentations(prev => [...prev, newPresentation]);
                setCurrentPresentation(newPresentation);
                navigateTo(Page.Editor);
            } else {
                console.error("Failed to save new presentation");
            }
        } catch (e) {
            console.error("Network error adding presentation", e);
        }
    }, [user, navigateTo]);
    
    // Update an existing presentation.
    const updatePresentation = useCallback(async (updatedPresentation: Presentation) => {
        // Optimistic update locally
        setPresentations(prev => prev.map(p => p.id === updatedPresentation.id ? updatedPresentation : p));
        if (currentPresentation?.id === updatedPresentation.id) {
            setCurrentPresentation(updatedPresentation);
        }

        // Persist to DB
        try {
            // Remove the 'id' field from the body if it conflicts with Pydantic model expecting strict fields, 
            // but our backend handles it. We send the whole object.
            await fetch(`${API_URL}/presentations/${updatedPresentation.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPresentation)
            });
        } catch (e) {
            console.error("Failed to persist presentation update", e);
        }

    }, [currentPresentation]);

    // Set the current presentation to be viewed/edited.
    const setCurrentPresentationById = useCallback((id: string | null) => {
        if (!id) {
            setCurrentPresentation(null);
            navigateTo(Page.Dashboard);
            return;
        }
        const presentation = presentations.find(p => p.id === id);
        if (presentation) {
            setCurrentPresentation(presentation);
            navigateTo(Page.Editor);
        }
    }, [presentations, navigateTo]);

    // Render the current page based on the state.
    const renderPage = () => {
        // If no user, show login/signup pages.
        if (!user) {
            switch (page) {
                case Page.SignUp:
                    return <SignUpPage />;
                default:
                    return <LoginPage />;
            }
        }
        // If user is logged in, show protected pages.
        switch (page) {
            case Page.Home:
                return <HomePage />;
            case Page.Dashboard:
                return <DashboardPage />;
            case Page.Editor:
                return currentPresentation ? <EditorPage /> : <DashboardPage />;
            default:
                return <DashboardPage />;
        }
    };

    // Memoize the context value to prevent unnecessary re-renders.
    const contextValue = useMemo(() => ({
        page,
        user,
        presentations,
        currentPresentation,
        navigateTo,
        login,
        logout,
        addPresentation,
        updatePresentation,
        setCurrentPresentationById,
        apiKeyError,
        setApiKeyError,
    }), [page, user, presentations, currentPresentation, navigateTo, login, logout, addPresentation, updatePresentation, setCurrentPresentationById, apiKeyError]);
    
    return (
        <AppContext.Provider value={contextValue}>
            {renderPage()}
        </AppContext.Provider>
    );
};

export default App;
