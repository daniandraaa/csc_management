import React from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkifyProps {
    text: string | null | undefined;
    className?: string;
}

export default function Linkify({ text, className = '' }: LinkifyProps) {
    if (!text) return null;

    // Regex to match URLs
    const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
            {parts.map((part, i) => {
                if (!part) return null;
                
                if (part.match(urlRegex)) {
                    const href = part.startsWith('http') ? part : `https://${part}`;
                    return (
                        <a 
                            key={i} 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#3b82f6', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '2px', wordBreak: 'break-all' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                            <ExternalLink size={12} style={{ flexShrink: 0 }} />
                        </a>
                    );
                }
                
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
}
