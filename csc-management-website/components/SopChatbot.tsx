'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, User, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getStoredUser } from '@/lib/auth'

export default function SopChatbot({ sop, onClose }: { sop: any, onClose: () => void }) {
    const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
        { role: 'assistant', content: `Halo! Saya AI Assistant untuk SOP **${sop.title}**. Apa yang ingin Anda tanyakan mengenai panduan ini?` }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [faqs, setFaqs] = useState<any[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const loadLogs = async () => {
            const user = getStoredUser()
            if (!user) return
            
            const { data } = await supabase.from('sop_chatbot_logs')
                .select('*')
                .eq('sop_id', sop.id)
                .eq('member_id', user.id)
                .order('created_at', { ascending: true })
            
            if (data && data.length > 0) {
                const loadedMsgs: {role: 'user' | 'assistant', content: string}[] = []
                data.forEach(log => {
                    loadedMsgs.push({ role: 'user', content: log.query })
                    loadedMsgs.push({ role: 'assistant', content: log.response })
                })
                setMessages([
                    { role: 'assistant', content: `Halo! Saya AI Assistant untuk SOP **${sop.title}**. Apa yang ingin Anda tanyakan mengenai panduan ini?` },
                    ...loadedMsgs
                ])
            }
            
            // Load custom FAQs
            const { data: faqData } = await supabase.from('ai_faqs').select('*')
            if (faqData) setFaqs(faqData)
        }
        loadLogs()
    }, [sop.id, sop.title])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Simple simulated RAG (Retrieval-Augmented Generation) based on SOP content + General App Knowledge + Custom FAQs
    const generateResponse = (query: string) => {
        const lowerQuery = query.toLowerCase()
        
        // 1. Check Custom FAQs first
        if (faqs.length > 0) {
            const matchedFaq = faqs.find(f => {
                const qLower = f.question.toLowerCase()
                if (lowerQuery.length > 5 && qLower.includes(lowerQuery)) return true
                if (lowerQuery.includes(qLower)) return true
                
                // Fallback: Check if > 60% of keywords in FAQ question exist in user query
                const faqWords = qLower.split(/[\s,.-]+/).filter((w: string) => w.length > 3)
                if (faqWords.length === 0) return false
                const matchCount = faqWords.filter((w: string) => lowerQuery.includes(w)).length
                return (matchCount / faqWords.length) > 0.6
            })
            if (matchedFaq) {
                return matchedFaq.answer
            }
        }

        const sopContentStr = (sop.content || '').toString()
        
        // General knowledge about the CSC Management application
        const generalKnowledge = `
Aplikasi CSC Management adalah sistem manajemen organisasi komprehensif.
Sistem ini memiliki beberapa modul utama:
1. Modul Keuangan (Finance): Mengelola Uang Kas, Denda keterlambatan bayar kas, Pengajuan Reimbursement, dan Transaksi Pemasukan/Pengeluaran.
2. Modul SDM (Human Resources): Mengelola Data Anggota, Rekap Kehadiran (Presensi), dan Organigram.
3. Modul Marketing: Mengelola Content Planner dengan tampilan List dan Kalender, jadwal post, dan PIC konten.
4. Modul Operasional (Operating): Mengelola Order Monitoring (pesanan), SOP Guide (panduan standar), dan Chatbot AI.
5. Dasbor Utama: Menampilkan Overview organisasi dan informasi personal pengguna ("My Finance", "My Reimbursement").
Pengguna dapat mengimpor data via CSV dan mengekspor laporan ke bentuk PDF maupun CSV.
Setiap anggota memiliki peran atau jabatan (Role-Based Access Control) yang menentukan fitur apa saja yang bisa mereka kelola (Edit/Hapus) dan yang hanya bisa dilihat.
        `.trim()

        const combinedKnowledge = `${generalKnowledge}\n\n${sopContentStr}`
        
        const sentences = combinedKnowledge.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 5)
        
        const stopwords = ['yang', 'dari', 'dan', 'di', 'ke', 'untuk', 'dengan', 'ini', 'itu', 'adalah', 'pada', 'apa', 'bagaimana', 'kenapa', 'mengapa', 'siapa', 'kapan', 'dimana', 'sih', 'dong', 'tolong', 'jelaskan', 'beritahu', 'kasih', 'tau', 'tahu', 'cara']
        const keywords = lowerQuery.split(/[\s,.-]+/).filter((w: string) => w.length > 2 && !stopwords.includes(w))
        
        let matches: string[] = []
        
        if (keywords.length > 0) {
            matches = sentences.filter((s: string) => {
                const lowerS = s.toLowerCase()
                return keywords.some((k: string) => lowerS.includes(k))
            }).sort((a, b) => {
                const scoreA = keywords.filter((k: string) => a.toLowerCase().includes(k)).length
                const scoreB = keywords.filter((k: string) => b.toLowerCase().includes(k)).length
                return scoreB - scoreA // higher score first
            })
        }

        if (matches.length > 0) {
            // Take top 2 matched sentences to keep it concise
            const responseText = matches.slice(0, 2).map((m: string) => m.trim() + '.').join('\n\n')
            return `Ini informasi yang saya temukan untuk Anda:\n\n${responseText}`
        } else {
            // Fallback for general questions or no exact matches
            const sopSummary = sopContentStr.trim() ? sopContentStr.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 10).slice(0, 2).join('. ') + '.' : 'Tidak ada teks detail SOP.'
            if (keywords.length === 0) {
                return `Aplikasi CSC Management memiliki fitur untuk mengelola Keuangan, SDM, Marketing, dan Operasional.\n\nTerkait dokumen SOP "${sop.title}" ini, berikut ringkasannya:\n${sopSummary}\n\nAda hal spesifik yang ingin Anda tanyakan terkait aplikasi atau dokumen ini?`
            } else {
                return `Maaf, saya tidak menemukan informasi persis mengenai "${keywords.join(', ')}" di SOP ini maupun di panduan umum aplikasi. Anda dapat bertanya tentang fitur Keuangan, SDM, Marketing, Operasional, atau detail lainnya!`
            }
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMsg = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setIsTyping(true)

        // Simulate network delay and AI processing
        setTimeout(async () => {
            const aiResponse = generateResponse(userMsg)
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
            setIsTyping(false)

            // Log to database
            const user = getStoredUser()
            if (user) {
                const { error } = await supabase.from('sop_chatbot_logs').insert({
                    sop_id: sop.id,
                    member_id: user.id,
                    query: userMsg,
                    response: aiResponse
                })
                if (error) console.error("Error logging chat:", error)
            }
        }, 1200)
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div 
                className="modal-content" 
                onClick={e => e.stopPropagation()} 
                style={{ 
                    maxWidth: 500, 
                    height: '80vh', 
                    maxHeight: 700, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: 16
                }}
            >
                {/* Chatbot Header */}
                <div style={{ 
                    background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-800) 100%)',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                            width: 36, height: 36, borderRadius: '50%', 
                            background: 'rgba(255,255,255,0.2)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                            <Sparkles size={18} color="white" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>SOP AI Assistant</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Tanya apa saja seputar SOP ini</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ 
                            background: 'transparent', border: 'none', color: 'white', 
                            cursor: 'pointer', opacity: 0.8, padding: 4 
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Chatbot Messages */}
                <div style={{ 
                    flex: 1, 
                    padding: '1.5rem', 
                    overflowY: 'auto',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{ 
                            display: 'flex', 
                            gap: 12,
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                            maxWidth: '85%'
                        }}>
                            <div style={{ 
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                background: msg.role === 'user' ? 'var(--color-surface-secondary)' : 'var(--color-brand-100)',
                                color: msg.role === 'user' ? 'var(--color-text-secondary)' : 'var(--color-brand-600)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <div style={{ 
                                background: msg.role === 'user' ? 'var(--color-brand-600)' : 'white',
                                color: msg.role === 'user' ? 'white' : 'var(--color-text-primary)',
                                padding: '0.75rem 1rem',
                                borderRadius: 12,
                                borderTopLeftRadius: msg.role === 'assistant' ? 0 : 12,
                                borderTopRightRadius: msg.role === 'user' ? 0 : 12,
                                fontSize: '0.875rem',
                                lineHeight: 1.5,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                        <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-start' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-brand-100)', color: 'var(--color-brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={14} />
                            </div>
                            <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: 12, borderTopLeftRadius: 0, fontSize: '0.875rem', color: '#94a3b8', display: 'flex', gap: 4, alignItems: 'center' }}>
                                <div className="typing-dot" style={{ width: 4, height: 4, background: '#cbd5e1', borderRadius: '50%', animation: 'typing 1.4s infinite ease-in-out' }}></div>
                                <div className="typing-dot" style={{ width: 4, height: 4, background: '#cbd5e1', borderRadius: '50%', animation: 'typing 1.4s infinite ease-in-out 0.2s' }}></div>
                                <div className="typing-dot" style={{ width: 4, height: 4, background: '#cbd5e1', borderRadius: '50%', animation: 'typing 1.4s infinite ease-in-out 0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chatbot Input */}
                <div style={{ 
                    padding: '1rem', 
                    background: 'white', 
                    borderTop: '1px solid var(--color-border-primary)',
                    display: 'flex',
                    gap: '0.5rem'
                }}>
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Ketik pertanyaan Anda..."
                        style={{ 
                            flex: 1, 
                            padding: '0.75rem 1rem', 
                            borderRadius: 99, 
                            border: '1px solid var(--color-border-primary)',
                            outline: 'none',
                            fontSize: '0.875rem'
                        }}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        style={{ 
                            width: 42, height: 42, borderRadius: '50%', 
                            background: input.trim() && !isTyping ? 'var(--color-brand-600)' : 'var(--color-surface-tertiary)',
                            color: input.trim() && !isTyping ? 'white' : 'var(--color-text-tertiary)',
                            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
            
            <style>{`
                @keyframes typing {
                    0%, 100% { transform: translateY(0); opacity: 0.5; }
                    50% { transform: translateY(-3px); opacity: 1; }
                }
            `}</style>
        </div>
    )
}
