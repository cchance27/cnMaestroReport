export function addPdfHeading(header: string, subheader: string, doc, newPage: boolean = false) {
    if (newPage) {
        doc.addPage()
    }
    console.log(`Add PDF Heading: ${header}`)
    doc.fontSize('16').fillColor('black').text(header);
    doc.fontSize('14').fillColor('black').text(subheader);
    doc.fontSize('8');
    return doc;
}

interface table {
    style: string
    table: tableLayout
    layout: string
}

interface tableLayout {
    headerRows: number
    body: any // [[value,value,value]]
}

export function genTable(data: {}[]): table {
    let headers: {}[] = []
    Object.keys(data[0]).forEach(k => headers.push({text: k, style: 'tableHeader'}))

    let result = {
        style: 'table',
        table: {
            headerRows: 1,
            body: [headers]
        }, 
        layout: 'lightHorizontalLines'
    }

    data.forEach(r => result.table.body.push(Object.keys(r).map(i => ({ text: r[i], style: "tableCell" }))))
    return result
}