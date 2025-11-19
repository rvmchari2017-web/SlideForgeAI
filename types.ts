
// Defines the pages available in the application for navigation.
export enum Page {
    Login,
    SignUp,
    Home,
    Dashboard,
    Editor,
}

// Represents a user of the application.
export interface User {
    id: string;
    fullName: string;
    email: string;
}

// Defines the structure of a single slide within a presentation.
export interface Slide {
    id: string;
    title: string;
    content: string[]; // An array of bullet points.
    /**
     * Can be a Base64 data URI, an external URL, a solid hex color (e.g., '#FFFFFF'),
     * or a CSS linear-gradient string (e.g., 'linear-gradient(to right, #ff7e5f, #feb47b)').
     */
    backgroundImage: string;
    backgroundImageSearchQuery: string; // The query used to find the image.
    
    // Visual effects
    animation?: 'none' | 'fade' | 'slide' | 'zoom';
    
    // Optional styling for slide text elements.
    titleStyle?: {
        color?: string;
        fontFamily?: string;
        fontWeight?: string; // 'normal', 'bold', '600', etc.
        fontStyle?: string; // 'normal', 'italic'
        fontSize?: string; // e.g., '24px'
    };
    contentStyle?: {
        color?: string;
        fontFamily?: string;
        fontWeight?: string;
        fontStyle?: string;
        fontSize?: string; // e.g., '14px'
    };
}

// Defines the structure for a presentation theme.
export interface Theme {
    name: string;
    tags: string[];
    colors: {
        background: string;
        text: string;
        primary: string;
    };
    fonts: {
        title: string;
        body: string;
    };
}

// Represents a presentation created by a user.
export interface Presentation {
    id:string;
    userId: string;
    topic: string;
    slides: Slide[];
    theme: Theme;
    // Optional branding elements
    subTitle?: string;
    companyLogo?: string;
    companyWebsite?: string;
}

// Defines the shape of the global application context.
export interface AppContextType {
    page: Page;
    user: User | null;
    presentations: Presentation[];
    currentPresentation: Presentation | null;
    navigateTo: (page: Page) => void;
    login: (user: User) => void;
    logout: () => void;
    addPresentation: (presentationData: Omit<Presentation, 'id' | 'userId'>) => void;
    updatePresentation: (updatedPresentation: Presentation) => void;
    setCurrentPresentationById: (id: string | null) => void;
    apiKeyError: string | null;
    setApiKeyError: (message: string | null) => void;
}
