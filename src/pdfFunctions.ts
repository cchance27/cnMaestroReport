import { pdfFonts, pdfStyles } from "./config";
import * as fs from 'fs'
const pdfMake = require('pdfmake')

interface table {
    style: string
    table: tableLayout
    layout: string
}

interface tableLayout {
    headerRows: number
    body: any // [[value,value,value]]
}

export function genPdfTableDDContent(data: {}[], highlightFieldName: string = ""): table {
    let headers: {}[] = []
    let widths: any = []

    if (data.length == 0) { return null }

    let headTop = [{}, {}, {}, 
        {text: 'Download', colSpan: 5, alignment: 'center', fillColor: '#c0d6e4'}, {}, {}, {}, {}, 
        {text: 'Upload', colSpan: 5, alignment: 'center'}, {}, {}, {}, {}]

    Object.keys(data[0]).forEach((k, i) => {
        headers.push(
            { 
                text: k.replace("Download ", "").replace("Upload", ""), 
                style: 'tableHeader', 
                alignment: (i == 0 ? 'left' : 'center'), 
                fillColor: ((i >= 3 && i < 8) ? '#c0d6e4' : 'white')
            })

        widths.push((i == 3 || i == 8) ? 43 : 'auto') 
    })
    
    let result = {
        style: 'table',
        width: 560,
        table: {
            widths: widths,
            headerRows: 2,
            body: [headTop, headers]
        }, 
        layout: 'lightHorizontalLines'
    }

    data.forEach(row => result.table.body.push(Object.keys(row).map((k, i) => {
        let fillColor = ((i >= 3 && i < 8) ? '#c0d6e4' : 'white')
        fillColor = highlightFieldName == k ? "yellow" : fillColor

        return ({ 
            text: row[k].formatted, 
            style: "tableCell", 
            alignment: (i == 0 ? 'left' : 'center'), 
            fillColor: fillColor ,
            color: row[k].alerted ? 'red' : 'black'
        }) // alight first item left rest center
    })))
    return result
}


export async function generateAndSavePDF(docDefinition: any, filename: string){
    try {
        // Setup Fonts
        let printer = new pdfMake(pdfFonts)

        // Setup styles and margins
        docDefinition['styles'] = pdfStyles
        docDefinition['pageMargins'] = [ 20, 20, 20, 20 ]

        // Create document
        let pdfDoc = printer.createPdfKitDocument(docDefinition)

        // Save to file
        await pdfDoc.pipe(fs.createWriteStream(filename))
        pdfDoc.end()  

        // Return filename if successful
        return filename
    } catch(err) {
        console.error(err)
        // Return null if something fails
        return null
    }
}

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