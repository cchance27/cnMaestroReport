import PDFDocument from 'pdfkit';

export function addPdfHeading(header: string, subheader: string, doc: PDFDocument, newPage: boolean = false): PDFDocument {
    if (newPage) {
        doc.addPage();
    }
    doc.fontSize('16').fillColor('black').text(header);
    doc.fontSize('14').fillColor('black').text(subheader);
    doc.fontSize('8');
    return doc;
}
