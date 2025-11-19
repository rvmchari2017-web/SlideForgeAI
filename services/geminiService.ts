
// This service now acts as the API Client Bridge to the Python Backend.
// The GoogleGenAI SDK has been moved to the backend.

const API_URL = 'http://localhost:8000/api';

// Custom error class
export class ApiKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiKeyError';
    }
}

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error: ${response.statusText}`);
    }
    return response.json();
};

/**
 * Generates presentation content via Python Backend
 */
export const generatePresentationContent = async (promptInstruction: string, slideCount: number): Promise<any[]> => {
    try {
        const data = await handleResponse(await fetch(`${API_URL}/generate/presentation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptInstruction, slide_count: slideCount })
        }));
        return data; // Expecting Array of slides
    } catch (error) {
        console.error("Error in generatePresentationContent:", error);
        throw error;
    }
};

/**
 * Generates a single image query via backend (using logic on server or simple text gen)
 */
export const generateSingleImageQuery = async (slideTopic: string): Promise<string> => {
    // We can reuse the refine endpoint for simple text generation tasks
    try {
        const data = await handleResponse(await fetch(`${API_URL}/generate/refine-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                content: slideTopic, 
                instruction: "Generate a single, concise, 2-3 word search query for a high-quality stock photo representing this topic. Return ONLY the query." 
            })
        }));
        return data.content?.trim() || "";
    } catch (error) {
        console.error("Error generating query:", error);
        return "";
    }
};

/**
 * Generates an image from prompt via Python Backend (Imagen)
 */
export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    try {
        const data = await handleResponse(await fetch(`${API_URL}/generate/image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        }));
        return data.image_data || "";
    } catch (error) {
        console.error("Error generating image:", error);
        return "";
    }
};

/**
 * Generates multiple images via Python Backend
 */
export const generateMultipleImages = async (prompt: string): Promise<string[]> => {
    try {
        const data = await handleResponse(await fetch(`${API_URL}/generate/multiple-images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        }));
        return data.images || [];
    } catch (error) {
        console.error("Error generating multiple images:", error);
        return [];
    }
};

/**
 * Finds a web image via Python Backend (Google Search)
 */
export const findWebImage = async (query: string): Promise<string> => {
    try {
        const data = await handleResponse(await fetch(`${API_URL}/search/image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: query })
        }));
        return data.url || "";
    } catch (error) {
        console.error("Error finding web image:", error);
        return "";
    }
};

/**
 * Search multiple web images
 */
export const searchWebImages = async (query: string): Promise<string[]> => {
    try {
        const data = await handleResponse(await fetch(`${API_URL}/search/images-list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: query })
        }));
        // Ensure we return strings
        return Array.isArray(data.urls) ? data.urls.filter((u: any) => typeof u === 'string') : [];
    } catch (error) {
        console.error("Error searching web images:", error);
        return [];
    }
};

/**
 * Generate bullet points
 */
export const generateSlideContentPoints = async (presentationTopic: string, slideTitle: string): Promise<string[]> => {
    try {
        const instruction = `Generate 3-4 concise bullet points for a slide titled "${slideTitle}" for a presentation about "${presentationTopic}". Return only the bullet points starting with a hyphen.`;
        const data = await handleResponse(await fetch(`${API_URL}/generate/refine-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: "", instruction })
        }));
        
        const text = data.content || "";
        return text.split('\n').filter((line: string) => line.trim().length > 0 && line.trim().startsWith('-'));
    } catch (error) {
        console.error("Error generating points:", error);
        return [];
    }
};

/**
 * Improve content
 */
export const generateSlideContentImprovement = async (currentContent: string, instruction: string): Promise<string> => {
    try {
        const data = await handleResponse(await fetch(`${API_URL}/generate/refine-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: currentContent, instruction })
        }));
        return data.content || "";
    } catch (error) {
        console.error("Error improving content:", error);
        return currentContent;
    }
};
