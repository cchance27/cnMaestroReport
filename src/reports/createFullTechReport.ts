import PDFDocument from 'pdfkit'
import SVGtoPDF from 'svg-to-pdfkit'
import PdfTable from 'voilab-pdf-table'
import { logoFile, fileStartDate, fileEndDate } from '../config'
import { columns } from '../columnsAndTypes'
import { apiTower, apiStatistics, apiPerformance, apiSmStatistics } from '../cnMaestroTypes'
import { graph } from '../charting'
import { getMetric } from '../cnMaestroMetricTools'
import { perfToTableData } from '../perfToTableData'
import { isCongested } from '../congestion'
import { fileDateTag } from '../config'
import { addPdfHeading, genTable } from "../pdfFunctions"
import * as fs from 'fs'
var pdfMake = require('pdfmake')

export async function createFullTechReport(allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>, allApStatistics: Map<string, apiStatistics[]>, towers: apiTower[], allSmStatistics: Map<string, apiSmStatistics[]>) {
    let highchartSvg = `<g id="layer1">
    <text
       id="text12"
       y="89.202377"
       x="46.869045"
       style="font-style:normal;font-weight:normal;font-size:10.5833px;line-height:1.25;font-family:sans-serif;fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.264583"
       xml:space="preserve"><tspan
         style="stroke-width:0.264583"
         y="89.202377"
         x="46.869045"
         id="tspan10">hi</tspan></text>
    </g>`

    let pdfStyles = {
        header: { fontSize: 16, bold: true },
        subHeader: { fontSize: 12, bold: false, italics: true },
        frontHeader: { fontSize: 24, bold: true },
        frontDate: { fontSize: 12, italics: true },
        table: {
            margin: [0, 5, 0, 30]
        },
        tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'black'
        },
        tableCell: {
            bold: false,
            fontSize: 8,
            color: 'black'
        }
    }

    
    let congestionValue = 90 // 90% usage or more is congested

    let standardPerfTable = perfToTableData(allApPerformance, allApStatistics, allApProductTypes)


    let dlFrameCongestion = perfToTableData(
        new Map([...allApPerformance].filter(([k, v]) => isCongested(getMetric(v, "dl_frame_utilization"), congestionValue, 0.2))), 
        allApStatistics, allApProductTypes)

    let ulFrameCongestion = perfToTableData(
            new Map([...allApPerformance].filter(([k, v]) => isCongested(getMetric(v, "ul_frame_utilization"), congestionValue, 0.2))),
            allApStatistics, allApProductTypes)
    /*
    "Downlink Low bits/Hz (450m)", "450m bits/Hz reported as below 5 bits/hz"
    standardPerfTable.filter((a) => a.bphDLavg < 4 && a.type == '450m').sort((a, b) => (a.bphDLavg - b.bphDLavg)).reverse()

   "Uplink Congestion Overview (450/450i)", "Sectors with over 20% of uplink hours congested"
    
    filteredPerfTable.filter((a) => a.congestUL > 20 && a.type != '450m').sort((a, b) => (a.congestUL - b.congestUL)).reverse())

    doc = addPdfHeading("Uplink Low bits/Hz (450m)", "450m bits/Hz reported as below 3 bits/hz"
    standardPerfTable.filter((a) => a.bphULavg < 2 && a.type == '450m').sort((a, b) => (a.bphULavg - b.bphULavg)).reverse()
*/

    let docDefinition = {
    	content: [
            { image: logoFile, alignment: 'center', margin: [0,200,0,50] },
            { text: 'cnMaestro Full Performance Report', style: "frontHeader", alignment: 'center' },
            { text: `${fileStartDate} - ${fileEndDate}`, style: "frontDate", alignment: 'center', pageBreak: 'after'},

            // 450i Overview Page
            { text: "Downlink Congestion Overview (450/450i)", style: 'header' },
            { text: "Sectors with over 20% of downlink hours congested", style: 'subHeader'},
            genTable(dlFrameCongestion.filter((a) => a.congestDL > 20 && a.type != '450m').sort((a, b) => (a.congestDL - b.congestDL)).reverse()),

            { text: "Uplink Congestion Overview (450/450i)", style: 'header' },
            { text: "Sectors with over 20% of uplink hours congested", style: 'subHeader'},
            genTable(ulFrameCongestion.filter((a) => a.congestUL > 20 && a.type != '450m').sort((a, b) => (a.congestDL - b.congestDL)).reverse()), 

//gensvgpages




            /*genTable(f),
            {
                text: 'lightHorizontalLines:', fontSize: 14, bold: true, margin: [0, 20, 0, 8]
            },
    		{
    			svg: highchartSvg,
    			fit: [100, 100],
    		},*/
        ], 
        styles: pdfStyles,
        pageMargins: [ 20, 20, 20, 20 ],
    }

    let fonts = {
        Roboto: {
            normal: 'node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf',
            bold: 'node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf',
            italics: 'node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf',
            bolditalics: 'node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf'
        }
    }

    let printer = new pdfMake(fonts);
    const file = `${fileDateTag} - New cnMaestro Tech Report.pdf`
    let pdfDoc = printer.createPdfKitDocument(docDefinition)
    await pdfDoc.pipe(fs.createWriteStream(file))
    pdfDoc.end()  
    return file
}