// FIX: Removed invalid file header that was causing a syntax error.
import { Theme } from '../types';

// Defines a rich, expanded list of themes for presentations.
export const themes: Theme[] = [
    { 
        name: 'Default',
        tags: ['simple', 'clean', 'light'],
        colors: { background: '#FFFFFF', text: '#000000', primary: '#3B82F6' },
        fonts: { title: 'Helvetica, Arial, sans-serif', body: 'Helvetica, Arial, sans-serif' }
    },
    {
        name: 'Corporate Blue',
        tags: ['professional', 'corporate', 'business', 'light'],
        colors: { background: '#F3F4F6', text: '#1F2937', primary: '#2563EB' },
        fonts: { title: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", body: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }
    },
    {
        name: 'Modern Dark',
        tags: ['dark', 'tech', 'modern', 'bold'],
        colors: { background: '#111827', text: '#F9FAFB', primary: '#4F46E5' },
        fonts: { title: "'Inter', sans-serif", body: "'Inter', sans-serif" }
    },
    {
        name: 'Creative',
        tags: ['warm', 'creative', 'artistic', 'light'],
        colors: { background: '#FFFBEB', text: '#374151', primary: '#D97706' },
        fonts: { title: "'Playfair Display', serif", body: "'Lora', serif" }
    },
    {
        name: 'Minimalist',
        tags: ['minimal', 'clean', 'simple', 'light'],
        colors: { background: '#FFFFFF', text: '#4B5563', primary: '#1F2937' },
        fonts: { title: "'Lato', sans-serif", body: "'Lato', sans-serif" }
    },
    {
        name: 'Tech Startup',
        tags: ['tech', 'startup', 'dark', 'vibrant'],
        colors: { background: '#0D1117', text: '#C9D1D9', primary: '#58A6FF' },
        fonts: { title: "'Roboto Mono', monospace", body: "'Roboto Mono', monospace" }
    },
    {
        name: 'Bold & Bright',
        tags: ['bold', 'vibrant', 'creative', 'colorful'],
        colors: { background: '#FDF2F8', text: '#500724', primary: '#DB2777' },
        fonts: { title: "'Poppins', sans-serif", body: "'Poppins', sans-serif" }
    },
    {
        name: 'Nature',
        tags: ['nature', 'calm', 'organic', 'light', 'green'],
        colors: { background: '#F0FDF4', text: '#14532D', primary: '#16A34A' },
        fonts: { title: "'Merriweather', serif", body: "'Merriweather', serif" }
    },
];