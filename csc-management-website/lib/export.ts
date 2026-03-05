'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ExportPdfOptions {
    title: string
    subtitle?: string
    columns: { header: string; key: string }[]
    data: Record<string, any>[]
    filename?: string
    orientation?: 'portrait' | 'landscape'
}

export function exportToPdf({ title, subtitle, columns, data, filename, orientation = 'portrait' }: ExportPdfOptions) {
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15

    // ============ HEADER ============
    // Red accent bar
    doc.setFillColor(220, 38, 38) // #dc2626
    doc.rect(0, 0, pageWidth, 3, 'F')

    // Logo area
    doc.setFillColor(153, 27, 27) // #991b1b
    doc.roundedRect(margin, 10, 12, 12, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('CSC', margin + 6, 17.5, { align: 'center' })

    // Organization name
    doc.setTextColor(153, 27, 27)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Community Support Center', margin + 16, 15)
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Telkom University', margin + 16, 20)

    // Date on right
    const now = new Date()
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(dateStr, pageWidth - margin, 15, { align: 'right' })
    doc.text(`Dicetak: ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, 20, { align: 'right' })

    // Separator line
    doc.setDrawColor(220, 38, 38)
    doc.setLineWidth(0.5)
    doc.line(margin, 26, pageWidth - margin, 26)

    // ============ DOCUMENT TITLE ============
    doc.setTextColor(26, 15, 15)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin, 35)

    if (subtitle) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(92, 68, 68)
        doc.text(subtitle, margin, 41)
    }

    // Summary info
    const summaryY = subtitle ? 48 : 43
    doc.setFillColor(250, 248, 248)
    doc.roundedRect(margin, summaryY - 4, pageWidth - margin * 2, 10, 1.5, 1.5, 'F')
    doc.setFontSize(8)
    doc.setTextColor(92, 68, 68)
    doc.text(`Total Data: ${data.length}`, margin + 4, summaryY + 2)
    doc.text(`Tanggal: ${dateStr}`, pageWidth / 2, summaryY + 2, { align: 'center' })

    // ============ TABLE ============
    const tableHeaders = columns.map(c => c.header)
    const tableData = data.map(row => columns.map(c => {
        const val = row[c.key]
        if (val === null || val === undefined) return '-'
        if (typeof val === 'number') return val.toLocaleString('id-ID')
        return String(val)
    }))

    autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: summaryY + 10,
        margin: { left: margin, right: margin },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            textColor: [26, 15, 15],
            lineColor: [232, 218, 218],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [153, 27, 27],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
        },
        alternateRowStyles: {
            fillColor: [250, 248, 248],
        },
        didDrawPage: (hookData) => {
            // Footer on each page
            const pageHeight = doc.internal.pageSize.getHeight()
            doc.setDrawColor(220, 38, 38)
            doc.setLineWidth(0.3)
            doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)
            doc.setFontSize(7)
            doc.setTextColor(156, 136, 136)
            doc.text('Community Support Center Document — Telkom University', margin, pageHeight - 7)
            doc.text(`Halaman ${hookData.pageNumber}`, pageWidth - margin, pageHeight - 7, { align: 'right' })
        },
    })

    // Save
    const fname = filename || `CSC_${title.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`
    doc.save(fname)
}

// CSV Export utility
export function exportToCsv(columns: { header: string; key: string }[], data: Record<string, any>[], filename: string) {
    const headers = columns.map(c => c.header)
    const rows = data.map(row => columns.map(c => {
        const val = row[c.key]
        if (val === null || val === undefined) return ''
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str
    }))

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
}
