// FIX: Removed invalid file header that was causing a syntax error.
import React, { useContext } from 'react';
import { AppContext } from '../App';
import { Page } from '../types';
import { SparklesIcon, LogoutIcon, PlusIcon, EmptyIcon } from '../components/icons';

// A header component for the dashboard and editor views.
const Header: React.FC = () => {
    const { user, logout, navigateTo } = useContext(AppContext);
    return (
        <header className="bg-white shadow-sm p-4">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center text-xl font-bold text-gray-800">
                        <SparklesIcon className="w-6 h-6 text-indigo-500 mr-2" />
                        <span>SlideForge AI</span>
                    </div>
                    <div className="text-gray-500">
                        Welcome, {user?.fullName || 'Guest'}
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => navigateTo(Page.Home)}
                        className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        New Presentation
                    </button>
                    <button 
                        onClick={logout}
                        className="flex items-center text-gray-600 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition"
                    >
                        <LogoutIcon className="w-5 h-5 mr-2" />
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}

// The Dashboard page component.
const DashboardPage: React.FC = () => {
  const { presentations, navigateTo, setCurrentPresentationById } = useContext(AppContext);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Presentations</h1>
          <p className="text-gray-500">Manage and edit your presentations</p>
        </div>

        {presentations.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
            <div className="flex justify-center mb-4">
                <div className="bg-purple-100 text-purple-600 p-4 rounded-full">
                    <EmptyIcon className="w-12 h-12" />
                </div>
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No presentations yet</h2>
            <p className="text-gray-500 mb-6">Create your first AI-powered presentation</p>
            <button
              onClick={() => navigateTo(Page.Home)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-transform transform hover:scale-105 mx-auto"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Presentation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {presentations.map((p) => (
              <div
                key={p.id}
                onClick={() => setCurrentPresentationById(p.id)}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer group transition-all transform hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="h-40 bg-gray-200">
                    <img src={p.slides[0]?.backgroundImage} alt={p.topic} className="w-full h-full object-cover"/>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 truncate group-hover:text-indigo-600">{p.topic}</h3>
                  <p className="text-sm text-gray-500">{p.slides.length} slides</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;