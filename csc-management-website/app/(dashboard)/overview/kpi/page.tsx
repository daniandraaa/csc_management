'use client'

import { useState } from 'react'
import KPIContent from './kpi-content'
import EvaluationsContent from './evaluations-content'
import { BarChart3, ClipboardCheck } from 'lucide-react'

export default function OverviewKPIMainPage() {
    const [activeTab, setActiveTab] = useState<'kpi' | 'evaluasi'>('kpi')

    return (
        <div>
            <div className="page-container">
                <h1 className="page-title">KPI & Evaluasi Program Anda</h1>
                <p className="page-subtitle">Indikator Kinerja Utama dan Evaluasi untuk program kerja yang Anda ikuti</p>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border-primary)', paddingBottom: '1rem' }}>
                    <button 
                        className={`btn ${activeTab === 'kpi' ? 'btn-primary' : 'btn-ghost'}`} 
                        onClick={() => setActiveTab('kpi')} 
                        style={{ borderRadius: 8, padding: '0.625rem 1.25rem' }}
                    >
                        <BarChart3 size={16} /> <span style={{ marginLeft: 8 }}>KPI Program</span>
                    </button>
                    <button 
                        className={`btn ${activeTab === 'evaluasi' ? 'btn-primary' : 'btn-ghost'}`} 
                        onClick={() => setActiveTab('evaluasi')} 
                        style={{ borderRadius: 8, padding: '0.625rem 1.25rem' }}
                    >
                        <ClipboardCheck size={16} /> <span style={{ marginLeft: 8 }}>Evaluasi Program</span>
                    </button>
                </div>

                <div style={{ margin: '0 -2rem' }}>
                    {activeTab === 'kpi' && <KPIContent />}
                    {activeTab === 'evaluasi' && <EvaluationsContent />}
                </div>
            </div>
        </div>
    )
}
