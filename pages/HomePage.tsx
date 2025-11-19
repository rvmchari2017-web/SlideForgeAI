import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { Page, Presentation, Slide, Theme } from '../types';
import { generatePresentationContent, generateImageFromPrompt, findWebImage, ApiKeyError } from '../services/geminiService';
import { themes } from '../data/themes';
import { SparklesIcon, LogoutIcon, ArrowLeftIcon, WandIcon, UploadIcon, PencilIcon, PhotographIcon, PaintBrushIcon, VideoCameraIcon } from '../components/icons';

// A header component specific to the home/creation page.
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
                        onClick={() => navigateTo(Page.Dashboard)}
                        className="flex items-center text-gray-600 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition"
                    >
                        <ArrowLeftIcon className="w-5 h-5 mr-2" />
                        Back to Dashboard
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

// The Home page component where users create new presentations.
const HomePage: React.FC = () => {
  const { addPresentation, setApiKeyError } = useContext(AppContext);
  
  // Core Inputs
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState(''); // New mandatory description for AI mode
  
  // Configuration States
  const [creationMode, setCreationMode] = useState<'ai' | 'text' | 'file'>('ai');
  const [backgroundMode, setBackgroundMode] = useState<'ai' | 'search' | 'none'>('ai');
  
  // Content Source States
  const [pastedText, setPastedText] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');

  // Presentation Settings
  const [slideCount, setSlideCount] = useState(7);
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(themes[0]);
  const [themeSearch, setThemeSearch] = useState('');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setFileContent(text);
          setFileName(file.name);
          setError(null);
        };
        reader.readAsText(file);
      } else {
        setError('Please upload a valid .txt file.');
        setFileName('');
        setFileContent('');
      }
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a title for your presentation.');
      return;
    }

    let promptInstruction = '';
    let hasContent = true;

    switch (creationMode) {
      case 'ai':
        if (!description.trim()) {
            setError('Please provide a description for the AI generation.');
            return;
        }
        promptInstruction = `Create a presentation titled: "${topic}".\nDetailed Context/Description: ${description}`;
        break;
      case 'text':
        if (!pastedText.trim()) {
          setError('Please paste the content for your presentation.');
          hasContent = false;
        }
        promptInstruction = `Create a presentation titled "${topic}" by summarizing the following text:\n\n${pastedText}`;
        break;
      case 'file':
        if (!fileContent.trim()) {
           setError('Please upload a file with content.');
           hasContent = false;
        }
        promptInstruction = `Create a presentation titled "${topic}" by summarizing the content from this document:\n\n${fileContent}`;
        break;
    }
    
    if (!hasContent) return;

    setError(null);
    setApiKeyError(null);
    setIsLoading(true);

    try {
      setLoadingMessage('Generating presentation content...');
      const generatedSlidesData = await generatePresentationContent(promptInstruction, slideCount);
      
      setLoadingMessage('Preparing slides and backgrounds...');
      const slides: Slide[] = await Promise.all(
        generatedSlidesData.map(async (slideData, index) => {
          let backgroundImage = selectedTheme.colors.background;
          
          // Handle Background Generation Logic
          if (backgroundMode === 'ai') {
              setLoadingMessage(`Generating AI image for slide ${index + 1}...`);
              const imageBase64 = await generateImageFromPrompt(slideData.backgroundImageSearchQuery);
              if (imageBase64) {
                  backgroundImage = `data:image/jpeg;base64,${imageBase64}`;
              }
          } else if (backgroundMode === 'search') {
              setLoadingMessage(`Searching web image for slide ${index + 1}...`);
              const imageUrl = await findWebImage(slideData.backgroundImageSearchQuery);
              if (imageUrl) {
                  backgroundImage = imageUrl;
              }
          }
          // If backgroundMode is 'none', we stick with the default theme background color set above.

          return {
            id: `slide-${index}-${Date.now()}`,
            title: slideData.title,
            content: slideData.content,
            backgroundImage: backgroundImage,
            backgroundImageSearchQuery: slideData.backgroundImageSearchQuery,
          };
        })
      );
      
      const newPresentation: Omit<Presentation, 'id' | 'userId'> = {
        topic,
        slides,
        theme: selectedTheme,
        companyLogo: companyLogo.trim() || undefined,
        companyWebsite: companyWebsite.trim() || undefined,
      };

      addPresentation(newPresentation);

    } catch (err) {
      console.error(err);
      if (err instanceof ApiKeyError) {
        setError(null);
        setApiKeyError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const filteredThemes = useMemo(() => 
    themes.filter(theme => 
        theme.name.toLowerCase().includes(themeSearch.toLowerCase()) || 
        theme.tags.some(tag => tag.toLowerCase().includes(themeSearch.toLowerCase()))
    ), [themeSearch]);

  const renderCreationMode = () => {
    switch (creationMode) {
      case 'text':
        return (
          <textarea
            rows={5}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your content here. The AI will summarize it and create slides."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            disabled={isLoading}
          />
        );
      case 'file':
        return (
            <div className="w-full">
              <label htmlFor="file-upload" className="w-full flex justify-center items-center px-4 py-6 bg-white text-blue-500 rounded-lg shadow-sm tracking-wide uppercase border border-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white transition">
                <UploadIcon className="w-8 h-8 mr-2"/>
                <span className="text-base leading-normal">{fileName ? `File: ${fileName}` : 'Upload a .txt file'}</span>
                <input id="file-upload" type="file" className="hidden" accept=".txt" onChange={handleFileChange} disabled={isLoading} />
              </label>
            </div>
        );
      case 'ai':
      default:
        return (
          <div>
              <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
                Presentation Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you want the presentation to be about in detail. E.g., 'A pitch deck for a mobile app that helps people track their water intake, focusing on health benefits and market size.'"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                disabled={isLoading}
              />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-8 flex flex-col items-center justify-center text-center">
        <div className="w-full max-w-4xl">
          <div className="inline-flex items-center bg-white py-2 px-4 rounded-full shadow-sm mb-4">
            <SparklesIcon className="w-5 h-5 text-indigo-500 mr-2" />
            <span className="font-semibold text-gray-700">AI Presentation Generator</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            Create a presentation about anything
          </h1>
          <p className="text-gray-500 text-lg mb-6">
            Provide a title, choose your content source, and our AI will do the rest.
          </p>
          
          <div className="bg-white p-8 rounded-2xl shadow-lg text-left">
            <div className="mb-6">
              <label htmlFor="topic" className="block text-gray-700 text-sm font-bold mb-2">
                Presentation Title <span className="text-red-500">*</span>
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., 'The Future of Renewable Energy'"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                disabled={isLoading}
              />
            </div>

            {/* Creation Mode Tabs */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Content Source</label>
              <div className="flex border border-gray-300 rounded-lg p-1 space-x-1 bg-gray-100">
                <button onClick={() => setCreationMode('ai')} className={`w-full py-2 rounded-md font-semibold transition ${creationMode === 'ai' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}>
                    <div className="flex items-center justify-center"><WandIcon className="w-5 h-5 mr-2"/>Generate with AI</div>
                </button>
                 <button onClick={() => setCreationMode('text')} className={`w-full py-2 rounded-md font-semibold transition ${creationMode === 'text' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}>
                    <div className="flex items-center justify-center"><PencilIcon className="w-5 h-5 mr-2"/>From Text</div>
                </button>
                <button onClick={() => setCreationMode('file')} className={`w-full py-2 rounded-md font-semibold transition ${creationMode === 'file' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}>
                    <div className="flex items-center justify-center"><UploadIcon className="w-5 h-5 mr-2"/>From File</div>
                </button>
              </div>
            </div>

            <div className="mb-6 min-h-[50px]">
              {renderCreationMode()}
            </div>

            {/* Background Mode Selection */}
            <div className="mb-6">
                 <label className="block text-gray-700 text-sm font-bold mb-2">Background Images</label>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                        onClick={() => setBackgroundMode('ai')}
                        className={`cursor-pointer p-4 rounded-lg border-2 flex flex-col items-center justify-center transition ${backgroundMode === 'ai' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                    >
                        <WandIcon className={`w-8 h-8 mb-2 ${backgroundMode === 'ai' ? 'text-indigo-600' : 'text-gray-400'}`}/>
                        <div className="flex items-center">
                             <input type="radio" name="bgMode" checked={backgroundMode === 'ai'} onChange={() => setBackgroundMode('ai')} className="mr-2" />
                             <span className={`font-semibold ${backgroundMode === 'ai' ? 'text-indigo-700' : 'text-gray-600'}`}>AI Generation</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">Unique images created by Imagen</p>
                    </div>

                    <div 
                        onClick={() => setBackgroundMode('search')}
                        className={`cursor-pointer p-4 rounded-lg border-2 flex flex-col items-center justify-center transition ${backgroundMode === 'search' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                    >
                        <PhotographIcon className={`w-8 h-8 mb-2 ${backgroundMode === 'search' ? 'text-indigo-600' : 'text-gray-400'}`}/>
                        <div className="flex items-center">
                             <input type="radio" name="bgMode" checked={backgroundMode === 'search'} onChange={() => setBackgroundMode('search')} className="mr-2" />
                             <span className={`font-semibold ${backgroundMode === 'search' ? 'text-indigo-700' : 'text-gray-600'}`}>Google Web Search</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">Images found from the web</p>
                    </div>

                    <div 
                        onClick={() => setBackgroundMode('none')}
                        className={`cursor-pointer p-4 rounded-lg border-2 flex flex-col items-center justify-center transition ${backgroundMode === 'none' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                    >
                        <PaintBrushIcon className={`w-8 h-8 mb-2 ${backgroundMode === 'none' ? 'text-indigo-600' : 'text-gray-400'}`}/>
                         <div className="flex items-center">
                             <input type="radio" name="bgMode" checked={backgroundMode === 'none'} onChange={() => setBackgroundMode('none')} className="mr-2" />
                             <span className={`font-semibold ${backgroundMode === 'none' ? 'text-indigo-700' : 'text-gray-600'}`}>No Image</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">Use theme colors only</p>
                    </div>
                 </div>
            </div>

            <div className="mb-6">
              <label htmlFor="slideCount" className="block text-gray-700 text-sm font-bold mb-2">
                Number of Slides ({slideCount})
              </label>
              <input
                id="slideCount"
                type="range"
                min="3"
                max="12"
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
              />
            </div>

            <div className="border-t border-gray-200 my-6"></div>

            <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Details (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                 <div>
                    <label htmlFor="companyWebsite" className="block text-gray-700 text-sm font-bold mb-2">Company Website</label>
                    <input id="companyWebsite" type="text" value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="e.g., www.example.com" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" disabled={isLoading}/>
                </div>
                <div>
                    <label htmlFor="companyLogo" className="block text-gray-700 text-sm font-bold mb-2">Company Logo URL</label>
                    <input id="companyLogo" type="text" value={companyLogo} onChange={e => setCompanyLogo(e.target.value)} placeholder="e.g., https://example.com/logo.png" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" disabled={isLoading}/>
                </div>
            </div>
            
            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
            
            <button
              onClick={handleGenerate}
              disabled={isLoading || (creationMode === 'ai' && !description.trim())}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {loadingMessage || 'Generating...'}
                </>
              ) : (
                <>
                  <WandIcon className="w-5 h-5 mr-2" />
                  Generate Presentation
                </>
              )}
            </button>
          </div>

          <div className="w-full mt-8 text-left">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Select a Theme</h3>
              <input 
                  type="text" 
                  value={themeSearch}
                  onChange={e => setThemeSearch(e.target.value)}
                  placeholder="Search themes (e.g., dark, corporate)..."
                  className="w-full px-4 py-3 mb-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {filteredThemes.map(theme => (
                      <div key={theme.name} onClick={() => setSelectedTheme(theme)}
                           className={`p-4 rounded-lg cursor-pointer border-2 transition ${selectedTheme.name === theme.name ? 'border-indigo-500 shadow-md' : 'border-gray-200 hover:border-gray-400'}`}>
                          <div className="flex space-x-2 mb-2">
                              <div className="w-1/3 h-8 rounded" style={{ backgroundColor: theme.colors.primary }}></div>
                              <div className="w-1/3 h-8 rounded" style={{ backgroundColor: theme.colors.text }}></div>
                              <div className="w-1/3 h-8 rounded" style={{ backgroundColor: theme.colors.background, border: '1px solid #ddd' }}></div>
                          </div>
                          <p className="font-semibold text-center text-gray-700">{theme.name}</p>
                      </div>
                  ))}
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;