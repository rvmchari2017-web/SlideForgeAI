
import React, { useContext, useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { AppContext } from '../App';
import { Page, Slide, Theme, Presentation } from '../types';
import { 
    SparklesIcon, ArrowLeftIcon, TrashIcon, PhotographIcon, PaletteIcon, 
    PlusIcon, WandIcon, XIcon, PaintBrushIcon, VideoCameraIcon, UploadIcon, 
    CheckCircleIcon, ArrowRightIcon, PencilIcon, DownloadIcon
} from '../components/icons';
import { themes } from '../data/themes';
import { 
    generateImageFromPrompt, generateSlideContentPoints, generateSingleImageQuery, 
    ApiKeyError, generateMultipleImages, searchWebImages, generateSlideContentImprovement 
} from '../services/geminiService';
import Toast from '../components/Toast';
import pptxgen from "pptxgenjs";

// --- Undo/Redo Logic ---
type HistoryState<T> = {
    past: T[];
    present: T;
    future: T[];
};

const useHistory = <T,>(initialPresent: T) => {
    const [state, setState] = useState<HistoryState<T>>({
        past: [],
        present: initialPresent,
        future: [],
    });

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;

    const undo = () => {
        if (canUndo) {
            const previous = state.past[state.past.length - 1];
            const newPast = state.past.slice(0, state.past.length - 1);
            setState({
                past: newPast,
                present: previous,
                future: [state.present, ...state.future],
            });
        }
    };

    const redo = () => {
        if (canRedo) {
            const next = state.future[0];
            const newFuture = state.future.slice(1);
            setState({
                past: [...state.past, state.present],
                present: next,
                future: newFuture,
            });
        }
    };

    const set = useCallback((newPresent: T) => {
        setState((prevState) => {
            if (JSON.stringify(prevState.present) === JSON.stringify(newPresent)) return prevState;
            return {
                past: [...prevState.past, prevState.present],
                present: newPresent,
                future: [],
            };
        });
    }, []);

    const reset = (newPresent: T) => {
        setState({ past: [], present: newPresent, future: [] });
    };

    return { state: state.present, set, undo, redo, canUndo, canRedo, reset };
};


// --- Components ---

const Header: React.FC<{ onUndo: () => void, onRedo: () => void, canUndo: boolean, canRedo: boolean, onExport: () => void, isExporting: boolean }> = ({ onUndo, onRedo, canUndo, canRedo, onExport, isExporting }) => {
    const { navigateTo, currentPresentation } = useContext(AppContext);
    return (
        <header className="bg-white shadow-sm p-4 sticky top-0 z-30 flex justify-between items-center">
            <div className="flex items-center space-x-4">
                <button 
                    onClick={() => navigateTo(Page.Dashboard)}
                    className="flex items-center text-gray-600 font-semibold py-2 px-3 rounded-lg hover:bg-gray-100 transition text-sm"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Dashboard
                </button>
                <div className="h-6 border-l border-gray-300"></div>
                <div className="font-semibold text-gray-800 truncate max-w-xs">
                    {currentPresentation?.topic}
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded hover:bg-gray-100 disabled:opacity-30" title="Undo">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                </button>
                <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded hover:bg-gray-100 disabled:opacity-30" title="Redo">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                    </svg>
                </button>
                <div className="h-6 border-l border-gray-300 mx-2"></div>
                
                 <button 
                    onClick={onExport} 
                    disabled={isExporting}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm flex items-center disabled:opacity-50 mr-2"
                >
                    {isExporting ? (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <DownloadIcon className="w-4 h-4 mr-2" />
                    )}
                    Export PPT
                </button>

                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm">Save</button>
            </div>
        </header>
    );
};

const SlideBackground: React.FC<{ 
    slide: Slide, 
    theme: Theme, 
    companyLogo?: string, 
    companyWebsite?: string, 
    isThumbnail?: boolean 
}> = ({ slide, theme, companyLogo, companyWebsite, isThumbnail = false }) => {
    const { backgroundImage, animation } = slide;
    const isColor = backgroundImage.startsWith('#') || backgroundImage.startsWith('linear-gradient');
    const isVideo = backgroundImage.startsWith('data:video') || backgroundImage.endsWith('.mp4') || backgroundImage.endsWith('.webm');
    
    const animationClass = animation === 'fade' ? 'animate-fade-in' :
                           animation === 'slide' ? 'animate-slide-in' :
                           animation === 'zoom' ? 'animate-zoom-in' : '';

    // Inject custom CSS for animations if not present
    useEffect(() => {
        const styleId = 'slide-animations';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
                .animate-slide-in { animation: slideIn 0.5s ease-out forwards; }
                .animate-zoom-in { animation: zoomIn 0.5s ease-out forwards; }
            `;
            document.head.appendChild(style);
        }
    }, []);

    let bgElement;
    if (isColor) {
        bgElement = <div className="w-full h-full absolute inset-0 z-0" style={{ background: backgroundImage }} />;
    } else if (isVideo) {
        bgElement = <video key={backgroundImage} src={backgroundImage} autoPlay loop muted className="w-full h-full object-cover absolute inset-0 z-0" />;
    } else {
        bgElement = <img src={backgroundImage} alt="" className="w-full h-full object-cover absolute inset-0 z-0" />;
    }

    return (
        <div className={`w-full h-full relative overflow-hidden bg-white ${animationClass}`}>
            {bgElement}
            <div className="absolute inset-0 bg-black bg-opacity-20 z-10"></div>
            
            {/* Branding Elements - Only show in main view, not thumbnail */}
            {!isThumbnail && companyLogo && (
                <div className="absolute top-4 left-6 z-30 max-w-[20%] max-h-[15%]">
                    <img 
                        src={companyLogo} 
                        alt="Logo" 
                        className="w-full h-full object-contain drop-shadow-md"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                </div>
            )}
            
            {!isThumbnail && companyWebsite && (
                <div className="absolute bottom-4 right-6 z-30">
                    <span 
                        className="text-sm font-medium opacity-70 drop-shadow-sm"
                        style={{ 
                            color: slide.contentStyle?.color || theme.colors.text,
                            fontFamily: slide.contentStyle?.fontFamily || theme.fonts.body
                        }}
                    >
                        {companyWebsite}
                    </span>
                </div>
            )}

             <div className="relative z-20 p-8 md:p-12 flex flex-col justify-center items-center h-full text-center">
                 <h1 className="mb-4 break-words w-full" 
                    style={{ 
                        fontFamily: slide.titleStyle?.fontFamily || theme.fonts.title, 
                        color: slide.titleStyle?.color || theme.colors.primary,
                        fontWeight: slide.titleStyle?.fontWeight || 'bold',
                        fontStyle: slide.titleStyle?.fontStyle || 'normal',
                        fontSize: slide.titleStyle?.fontSize || '24px', 
                        textShadow: '0px 2px 4px rgba(0,0,0,0.3)'
                    }}
                >
                    {slide.title}
                </h1>
                 <ul className="space-y-2 list-disc pl-5 text-left inline-block max-w-4xl"
                    style={{ 
                        fontFamily: slide.contentStyle?.fontFamily || theme.fonts.body, 
                        color: slide.contentStyle?.color || theme.colors.text,
                        fontWeight: slide.contentStyle?.fontWeight || 'normal',
                        fontStyle: slide.contentStyle?.fontStyle || 'normal',
                        fontSize: slide.contentStyle?.fontSize || '14px',
                        textShadow: '0px 1px 2px rgba(0,0,0,0.3)'
                    }}
                 >
                     {slide.content.map((point, i) => (
                         <li key={i} className="break-words">{point}</li>
                     ))}
                 </ul>
            </div>
        </div>
    );
};

// --- Image Selection Modal ---
interface ImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageSrc: string) => void;
    mode: 'ai' | 'search' | 'upload' | 'url' | null;
    initialQuery?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, onSelect, mode, initialQuery }) => {
    const [query, setQuery] = useState(initialQuery || '');
    const [images, setImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    
    useEffect(() => { setQuery(initialQuery || ''); setImages([]); }, [mode, initialQuery]);

    const handleSearch = async () => {
        if (!query) return;
        setIsLoading(true);
        try {
            let results: string[] = [];
            if (mode === 'ai') {
                const data = await generateMultipleImages(query);
                results = data.map(b64 => `data:image/jpeg;base64,${b64}`);
            } else if (mode === 'search') {
                results = await searchWebImages(query);
            }
            setImages(results);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) onSelect(ev.target.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen || !mode) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden m-4">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg capitalize flex items-center">
                        {mode === 'ai' ? <WandIcon className="w-5 h-5 mr-2"/> : null}
                        {mode === 'search' ? <PhotographIcon className="w-5 h-5 mr-2"/> : null}
                        {mode === 'upload' ? <UploadIcon className="w-5 h-5 mr-2"/> : null}
                        {mode === 'url' ? <ArrowRightIcon className="w-5 h-5 mr-2"/> : null}
                        {mode === 'ai' ? 'Generate with AI' : mode === 'search' ? 'Web Image Search' : mode === 'upload' ? 'Upload Image' : 'Paste URL'}
                    </h3>
                    <button onClick={onClose}><XIcon className="w-6 h-6 text-gray-500 hover:text-gray-700"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-grow">
                    {(mode === 'ai' || mode === 'search') && (
                        <div className="flex gap-2 mb-6">
                            <input 
                                type="text" 
                                value={query} 
                                onChange={e => setQuery(e.target.value)}
                                className="flex-grow border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder={mode === 'ai' ? "Describe the image to generate..." : "Search keywords..."}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                            <button 
                                onClick={handleSearch}
                                disabled={isLoading}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isLoading ? 'Loading...' : 'Search'}
                            </button>
                        </div>
                    )}

                    {mode === 'url' && (
                        <div className="flex flex-col gap-4">
                             <input 
                                type="text" 
                                value={urlInput} 
                                onChange={e => setUrlInput(e.target.value)}
                                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="https://example.com/image.jpg"
                            />
                            <button onClick={() => onSelect(urlInput)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg self-start">Use URL</button>
                        </div>
                    )}

                    {mode === 'upload' && (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl h-64 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer relative">
                            <input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                            <UploadIcon className="w-12 h-12 text-gray-400 mb-2"/>
                            <p className="text-gray-500 font-medium">Drag & Drop or Click to Upload</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {isLoading && Array(4).fill(0).map((_, i) => (
                             <div key={i} className="aspect-video bg-gray-200 animate-pulse rounded-lg"></div>
                        ))}
                        {!isLoading && images.map((src, idx) => (
                            <div key={idx} onClick={() => onSelect(src)} className="aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-indigo-500 relative group">
                                <img src={src} alt="result" className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center">
                                    <PlusIcon className="text-white w-8 h-8 opacity-0 group-hover:opacity-100"/>
                                </div>
                            </div>
                        ))}
                    </div>
                    {!isLoading && images.length === 0 && (mode === 'ai' || mode === 'search') && (
                        <div className="text-center text-gray-400 mt-10">Enter a prompt to see results</div>
                    )}
                </div>
            </div>
        </div>
    );
}


// --- Main Editor Page ---
const EditorPage: React.FC = () => {
    const { currentPresentation, updatePresentation, navigateTo, setApiKeyError } = useContext(AppContext);
    
    // History State
    const { state: presentation, set: setPresentation, undo, redo, canUndo, canRedo, reset } = useHistory<Presentation | null>(currentPresentation);
    
    const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'content' | 'background' | 'image'>('content');
    
    // Image Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'ai' | 'search' | 'upload' | 'url' | null>(null);
    
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [aiContentPrompt, setAiContentPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Custom Gradient State
    const [gradStart, setGradStart] = useState('#3B82F6');
    const [gradEnd, setGradEnd] = useState('#9333EA');
    const [gradAngle, setGradAngle] = useState('to right');

    // Sync initial presentation
    useEffect(() => {
        if (!currentPresentation) {
            navigateTo(Page.Dashboard);
        } else if (!presentation) {
            reset(currentPresentation);
        }
    }, [currentPresentation, navigateTo]);

    // Sync history changes back to global app state (debounce optional but good practice, here direct)
    useEffect(() => {
        if (presentation) {
            updatePresentation(presentation);
        }
    }, [presentation]);

    if (!presentation) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const selectedSlide = presentation.slides[selectedSlideIndex];
    const theme = presentation.theme;

    const updateSlide = (updates: Partial<Slide>) => {
        const newSlides = [...presentation.slides];
        newSlides[selectedSlideIndex] = { ...newSlides[selectedSlideIndex], ...updates };
        setPresentation({ ...presentation, slides: newSlides });
    };

    const updateCustomGradient = (start: string, end: string, angle: string) => {
        setGradStart(start);
        setGradEnd(end);
        setGradAngle(angle);
        updateSlide({ backgroundImage: `linear-gradient(${angle}, ${start}, ${end})` });
    };

    // Handlers
    const handleMoveSlide = (direction: 'up' | 'down') => {
        if (direction === 'up' && selectedSlideIndex > 0) {
            const newSlides = [...presentation.slides];
            [newSlides[selectedSlideIndex], newSlides[selectedSlideIndex - 1]] = [newSlides[selectedSlideIndex - 1], newSlides[selectedSlideIndex]];
            setPresentation({ ...presentation, slides: newSlides });
            setSelectedSlideIndex(selectedSlideIndex - 1);
        } else if (direction === 'down' && selectedSlideIndex < presentation.slides.length - 1) {
            const newSlides = [...presentation.slides];
            [newSlides[selectedSlideIndex], newSlides[selectedSlideIndex + 1]] = [newSlides[selectedSlideIndex + 1], newSlides[selectedSlideIndex]];
            setPresentation({ ...presentation, slides: newSlides });
            setSelectedSlideIndex(selectedSlideIndex + 1);
        }
    };

    const handleDeleteSlide = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (presentation.slides.length <= 1) {
            setToastMessage("Presentation must have at least one slide.");
            return;
        }
        
        const newSlides = presentation.slides.filter((_, i) => i !== index);
        
        let newIndex = selectedSlideIndex;
        if (index === selectedSlideIndex) {
            // If deleting current, move to previous (or 0)
            newIndex = Math.max(0, index - 1);
        } else if (index < selectedSlideIndex) {
            // If deleting one before current, shift index down
            newIndex = selectedSlideIndex - 1;
        }
        
        setPresentation({ ...presentation, slides: newSlides });
        setSelectedSlideIndex(newIndex);
        setToastMessage("Slide deleted.");
    };

    const handleImageSelect = (src: string) => {
        updateSlide({ backgroundImage: src });
        setIsModalOpen(false);
        setToastMessage("Background updated successfully!");
    };

    const openModal = (mode: 'ai' | 'search' | 'upload' | 'url') => {
        setModalMode(mode);
        setIsModalOpen(true);
    };
    
    const handleAiContentRefine = async () => {
        if (!aiContentPrompt) return;
        setIsAiLoading(true);
        try {
            const newContent = await generateSlideContentImprovement(selectedSlide.content.join('\n'), aiContentPrompt);
            const bullets = newContent.split('\n').filter(l => l.trim().length > 0).map(l => l.replace(/^- /, ''));
            updateSlide({ content: bullets });
            setAiContentPrompt('');
            setToastMessage("Content refined!");
        } catch (e) {
            console.error(e);
            setToastMessage("Failed to refine content.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleExport = async () => {
        if (!presentation) return;
        setIsExporting(true);
        try {
            const pres = new pptxgen();
            pres.layout = 'LAYOUT_16x9';
            pres.author = 'SlideForge AI';
            pres.title = presentation.topic;

            presentation.slides.forEach(slide => {
                const pptSlide = pres.addSlide();
                
                // Background
                if (slide.backgroundImage.startsWith('data:') || slide.backgroundImage.startsWith('http')) {
                    pptSlide.background = { path: slide.backgroundImage };
                } else if (slide.backgroundImage.startsWith('#')) {
                    pptSlide.background = { color: slide.backgroundImage.replace('#', '') };
                } else if (slide.backgroundImage.startsWith('linear-gradient')) {
                    // Fallback for gradient - extract first color or default to white
                    const match = slide.backgroundImage.match(/#[0-9a-fA-F]{6}/);
                    if (match) {
                         pptSlide.background = { color: match[0].replace('#', '') };
                    } else {
                         pptSlide.background = { color: 'FFFFFF' };
                    }
                }

                // Branding
                if (presentation.companyLogo) {
                    // Add logo to top-left
                    pptSlide.addImage({ 
                        path: presentation.companyLogo, 
                        x: 0.3, y: 0.3, w: 1.0, h: 0.6 
                    });
                }
                if (presentation.companyWebsite) {
                    // Add website to bottom-right
                    pptSlide.addText(presentation.companyWebsite, {
                        x: 6.8, y: 5.2, w: 3.0, h: 0.3,
                        align: 'right',
                        fontSize: 10,
                        color: '888888'
                    });
                }

                // Title
                const titleFontSize = parseInt(slide.titleStyle?.fontSize?.replace('px', '') || '24');
                const titleColor = slide.titleStyle?.color?.replace('#', '') || '000000';
                const titleFont = slide.titleStyle?.fontFamily?.split(',')[0].replace(/['"]/g, '') || 'Arial';
                
                pptSlide.addText(slide.title, {
                    x: 0.5, y: 0.5, w: '90%', h: 1,
                    fontSize: titleFontSize,
                    fontFace: titleFont,
                    color: titleColor,
                    bold: slide.titleStyle?.fontWeight === 'bold',
                    italic: slide.titleStyle?.fontStyle === 'italic',
                    align: 'center',
                    valign: 'middle'
                });

                // Content
                const contentFontSize = parseInt(slide.contentStyle?.fontSize?.replace('px', '') || '14');
                const contentColor = slide.contentStyle?.color?.replace('#', '') || '333333';
                const contentFont = slide.contentStyle?.fontFamily?.split(',')[0].replace(/['"]/g, '') || 'Arial';

                const bullets = slide.content.map(text => ({
                    text: text,
                    options: {
                        fontSize: contentFontSize,
                        fontFace: contentFont,
                        color: contentColor,
                        bold: slide.contentStyle?.fontWeight === 'bold',
                        italic: slide.contentStyle?.fontStyle === 'italic',
                        breakLine: true
                    }
                }));

                pptSlide.addText(bullets, {
                    x: 0.5, y: 1.8, w: '90%', h: 3.5,
                    align: 'left',
                    valign: 'top',
                    bullet: true
                });
            });

            await pres.writeFile({ fileName: `${presentation.topic.replace(/[^a-z0-9]/gi, '_')}.pptx` });
            setToastMessage("Presentation exported successfully!");
        } catch (error) {
            console.error("Export failed:", error);
            setToastMessage("Failed to export presentation.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
            <Header 
                onUndo={undo} 
                onRedo={redo} 
                canUndo={canUndo} 
                canRedo={canRedo} 
                onExport={handleExport}
                isExporting={isExporting}
            />
            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

            <div className="flex-grow flex flex-row overflow-hidden h-[calc(100vh-64px)]">
                {/* LEFT SIDEBAR: Slide Thumbnails */}
                <div className="w-48 bg-white border-r border-gray-200 flex flex-col shadow-lg z-10">
                    <div className="p-4 font-bold text-gray-700 text-sm uppercase tracking-wider">Slides</div>
                    <div className="flex-grow overflow-y-auto p-2 space-y-3">
                        {presentation.slides.map((slide, idx) => (
                            <div 
                                key={slide.id}
                                onClick={() => setSelectedSlideIndex(idx)}
                                className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 group ${selectedSlideIndex === idx ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent hover:border-gray-300'}`}
                            >
                                <div className="absolute top-1 left-1 bg-gray-800 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full z-10 shadow">
                                    {idx + 1}
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteSlide(e, idx)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-sm"
                                    title="Delete Slide"
                                >
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                                <div className="aspect-video bg-gray-100 rounded overflow-hidden pointer-events-none">
                                    <SlideBackground 
                                        slide={slide} 
                                        theme={theme} 
                                        isThumbnail={true}
                                    />
                                </div>
                            </div>
                        ))}
                        <button 
                            onClick={() => {
                                const newSlide: Slide = {
                                    id: `slide-${Date.now()}`,
                                    title: 'New Slide',
                                    content: ['Click to edit content'],
                                    backgroundImage: '#FFFFFF',
                                    backgroundImageSearchQuery: 'abstract',
                                    animation: 'none'
                                };
                                setPresentation({ ...presentation, slides: [...presentation.slides, newSlide] });
                                setSelectedSlideIndex(presentation.slides.length);
                            }}
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-indigo-500 hover:text-indigo-600 transition flex flex-col items-center justify-center text-sm font-medium"
                        >
                            <PlusIcon className="w-6 h-6 mb-1"/>
                            Add Slide
                        </button>
                    </div>
                </div>

                {/* CENTER: Preview Canvas */}
                <div className="flex-grow bg-gray-100 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                    <div className="w-full max-w-5xl aspect-video bg-white shadow-2xl rounded-lg overflow-hidden ring-1 ring-gray-900/5 transform transition-transform duration-300">
                        <SlideBackground 
                            slide={selectedSlide} 
                            theme={theme} 
                            companyLogo={presentation.companyLogo}
                            companyWebsite={presentation.companyWebsite}
                        />
                    </div>
                    
                    {/* Slide Navigation Buttons */}
                    <div className="mt-6 flex items-center space-x-4 bg-white p-2 rounded-full shadow-lg border border-gray-200">
                         <button 
                            disabled={selectedSlideIndex === 0}
                            onClick={() => setSelectedSlideIndex(i => i - 1)}
                            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 text-gray-600"
                        >
                            <ArrowLeftIcon className="w-6 h-6"/>
                        </button>
                        <span className="text-sm font-semibold text-gray-500 px-2">
                            {selectedSlideIndex + 1} / {presentation.slides.length}
                        </span>
                         <button 
                            disabled={selectedSlideIndex === presentation.slides.length - 1}
                            onClick={() => setSelectedSlideIndex(i => i + 1)}
                            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 text-gray-600"
                        >
                            <ArrowRightIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDEBAR: Editor Tools */}
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        {(['content', 'background', 'image'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 ${activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex-grow overflow-y-auto p-6 space-y-8">
                        
                        {/* CONTENT TAB */}
                        {activeTab === 'content' && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Slide Text</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                                            <input 
                                                value={selectedSlide.title} 
                                                onChange={e => updateSlide({ title: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Body Content</label>
                                            <textarea 
                                                rows={5}
                                                value={selectedSlide.content.join('\n')} 
                                                onChange={e => updateSlide({ content: e.target.value.split('\n') })}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Typography & Style</h3>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                         <select 
                                            value={selectedSlide.titleStyle?.fontFamily || ''} 
                                            onChange={e => updateSlide({ titleStyle: { ...selectedSlide.titleStyle, fontFamily: e.target.value }})}
                                            className="text-sm border p-2 rounded"
                                        >
                                            <option value="">Title Font...</option>
                                            <option value="'Inter', sans-serif">Inter</option>
                                            <option value="'Playfair Display', serif">Playfair</option>
                                            <option value="'Roboto Mono', monospace">Roboto Mono</option>
                                        </select>
                                        <div className="flex border rounded overflow-hidden">
                                            <button 
                                                onClick={() => updateSlide({ titleStyle: { ...selectedSlide.titleStyle, fontWeight: selectedSlide.titleStyle?.fontWeight === 'bold' ? 'normal' : 'bold' }})}
                                                className={`flex-1 flex justify-center items-center hover:bg-gray-100 ${selectedSlide.titleStyle?.fontWeight === 'bold' ? 'bg-gray-200 font-bold' : ''}`}
                                            >B</button>
                                            <button 
                                                onClick={() => updateSlide({ titleStyle: { ...selectedSlide.titleStyle, fontStyle: selectedSlide.titleStyle?.fontStyle === 'italic' ? 'normal' : 'italic' }})}
                                                className={`flex-1 flex justify-center items-center hover:bg-gray-100 italic ${selectedSlide.titleStyle?.fontStyle === 'italic' ? 'bg-gray-200' : ''}`}
                                            >I</button>
                                            <input 
                                                type="color" 
                                                value={selectedSlide.titleStyle?.color || theme.colors.primary}
                                                onChange={e => updateSlide({ titleStyle: { ...selectedSlide.titleStyle, color: e.target.value }})}
                                                className="w-8 h-full p-0 border-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Font Size Controls */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Title Size (px)</label>
                                            <input 
                                                type="number"
                                                min="12"
                                                max="120"
                                                value={parseInt(selectedSlide.titleStyle?.fontSize || '24')} 
                                                onChange={e => updateSlide({ titleStyle: { ...selectedSlide.titleStyle, fontSize: `${e.target.value}px` }})}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Body Size (px)</label>
                                            <input 
                                                type="number"
                                                min="8"
                                                max="60"
                                                value={parseInt(selectedSlide.contentStyle?.fontSize || '14')} 
                                                onChange={e => updateSlide({ contentStyle: { ...selectedSlide.contentStyle, fontSize: `${e.target.value}px` }})}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200 bg-indigo-50 -mx-6 p-6">
                                    <h3 className="text-xs font-bold text-indigo-600 uppercase mb-3 flex items-center"><SparklesIcon className="w-4 h-4 mr-1"/> AI Assistant</h3>
                                    <div className="flex gap-2">
                                        <input 
                                            placeholder="E.g., 'Make it more professional' or 'Summarize'"
                                            className="flex-grow text-sm p-2 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={aiContentPrompt}
                                            onChange={e => setAiContentPrompt(e.target.value)}
                                        />
                                        <button 
                                            onClick={handleAiContentRefine}
                                            disabled={isAiLoading}
                                            className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            <WandIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BACKGROUND TAB */}
                        {activeTab === 'background' && (
                             <div className="space-y-6 animate-fade-in">
                                {/* Solid Color Section */}
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Solid Color</h3>
                                    <div className="flex items-center space-x-2">
                                         <input 
                                            type="color" 
                                            value={selectedSlide.backgroundImage.startsWith('#') ? selectedSlide.backgroundImage : '#ffffff'}
                                            className="w-10 h-10 p-1 rounded border cursor-pointer"
                                            onChange={e => updateSlide({ backgroundImage: e.target.value })}
                                            title="Pick a solid color"
                                        />
                                        <span className="text-sm text-gray-600">Choose a solid background color</span>
                                    </div>
                                </div>

                                {/* Custom Gradient Section */}
                                <div className="pt-4 border-t border-gray-200">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Custom Gradient</h3>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-medium text-gray-500 mb-1">Start Color</label>
                                                <input 
                                                    type="color" 
                                                    value={gradStart} 
                                                    onChange={e => updateCustomGradient(e.target.value, gradEnd, gradAngle)} 
                                                    className="w-full h-8 p-0 border rounded cursor-pointer"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-medium text-gray-500 mb-1">End Color</label>
                                                <input 
                                                    type="color" 
                                                    value={gradEnd} 
                                                    onChange={e => updateCustomGradient(gradStart, e.target.value, gradAngle)} 
                                                    className="w-full h-8 p-0 border rounded cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Direction</label>
                                            <select 
                                                value={gradAngle} 
                                                onChange={e => updateCustomGradient(gradStart, gradEnd, e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="to right">Horizontal →</option>
                                                <option value="to left">Horizontal ←</option>
                                                <option value="to bottom">Vertical ↓</option>
                                                <option value="to top">Vertical ↑</option>
                                                <option value="135deg">Diagonal ↘</option>
                                                <option value="45deg">Diagonal ↗</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Gradient Presets */}
                                <div className="pt-4 border-t border-gray-200">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Gradient Presets</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
                                            'linear-gradient(to top, #30cfd0 0%, #330867 100%)',
                                            'linear-gradient(to right, #43e97b 0%, #38f9d7 100%)',
                                            'linear-gradient(to top, #96fbc4 0%, #f9f586 100%)',
                                            'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
                                            'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
                                            'linear-gradient(to right, #fa709a 0%, #fee140 100%)'
                                        ].map((grad, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => updateSlide({ backgroundImage: grad })}
                                                className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 ring-offset-2 ring-indigo-500 shadow-sm border border-gray-200" 
                                                style={{ background: grad }}
                                                title="Apply Preset"
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Theme</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {themes.map(t => (
                                            <button 
                                                key={t.name}
                                                onClick={() => setPresentation({...presentation, theme: t})}
                                                className={`text-xs p-2 rounded border text-left hover:bg-gray-50 ${theme.name === t.name ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                                            >
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Animation</h3>
                                    <select 
                                        value={selectedSlide.animation || 'none'}
                                        onChange={e => updateSlide({ animation: e.target.value as any })}
                                        className="w-full p-2 border rounded text-sm"
                                    >
                                        <option value="none">None</option>
                                        <option value="fade">Fade In</option>
                                        <option value="slide">Slide Up</option>
                                        <option value="zoom">Zoom In</option>
                                    </select>
                                </div>
                                
                                <div className="pt-4 border-t border-gray-200">
                                     <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Slide Order</h3>
                                     <div className="flex gap-2">
                                         <button onClick={() => handleMoveSlide('up')} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded text-sm font-medium text-gray-700">Move Up</button>
                                         <button onClick={() => handleMoveSlide('down')} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded text-sm font-medium text-gray-700">Move Down</button>
                                     </div>
                                </div>
                             </div>
                        )}

                        {/* IMAGE TAB */}
                        {activeTab === 'image' && (
                            <div className="space-y-4 animate-fade-in h-full flex flex-col">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Change Background Image</h3>
                                <p className="text-xs text-gray-500 mb-4">Select a source to replace the current background.</p>

                                <button 
                                    onClick={() => openModal('ai')}
                                    className="w-full py-4 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition flex items-center"
                                >
                                    <div className="bg-white/20 p-2 rounded-lg mr-4">
                                        <WandIcon className="w-6 h-6 text-white"/>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Generate with AI</div>
                                        <div className="text-xs text-white/80">Create unique art</div>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => openModal('search')}
                                    className="w-full py-4 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:border-indigo-300 hover:bg-gray-50 transition flex items-center"
                                >
                                    <div className="bg-gray-100 p-2 rounded-lg mr-4">
                                        <PhotographIcon className="w-6 h-6 text-indigo-600"/>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Web Search</div>
                                        <div className="text-xs text-gray-500">Find photos online</div>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => openModal('upload')}
                                    className="w-full py-4 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:border-indigo-300 hover:bg-gray-50 transition flex items-center"
                                >
                                    <div className="bg-gray-100 p-2 rounded-lg mr-4">
                                        <UploadIcon className="w-6 h-6 text-indigo-600"/>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Upload File</div>
                                        <div className="text-xs text-gray-500">From your computer</div>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => openModal('url')}
                                    className="w-full py-4 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:border-indigo-300 hover:bg-gray-50 transition flex items-center"
                                >
                                    <div className="bg-gray-100 p-2 rounded-lg mr-4">
                                        <ArrowRightIcon className="w-6 h-6 text-indigo-600"/>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Paste URL</div>
                                        <div className="text-xs text-gray-500">Direct image link</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Modals */}
            <ImageModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                mode={modalMode}
                onSelect={handleImageSelect}
                initialQuery={selectedSlide.backgroundImageSearchQuery}
            />
        </div>
    );
};

export default EditorPage;
