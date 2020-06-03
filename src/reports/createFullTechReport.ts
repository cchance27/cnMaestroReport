import PDFDocument from 'pdfkit'
import SVGtoPDF from 'svg-to-pdfkit'
import PdfTable from 'voilab-pdf-table'
import { logoFile, fileStartDate, fileEndDate } from '../config'
import { columns } from '../columnsAndTypes'
import { apiTower, apiStatistics, apiPerformance, apiSmStatistics } from '../cnMaestroTypes'
import { graph } from '../charting'
import { getMetric } from '../cnMaestroMetricTools'
import { perfToTableData, perfToTable } from '../perfToTableData'
import { isCongested } from '../congestion'
import { fileDateTag } from '../config'
import { addPdfHeading, genTable } from "../pdfFunctions"
import * as fs from 'fs'
var pdfMake = require('pdfmake')

export async function createFullTechReport(allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>, allApStatistics: Map<string, apiStatistics[]>, towers: apiTower[], allSmStatistics: Map<string, apiSmStatistics[]>) {
    let pdfStyles = {
        header: { fontSize: 16, bold: true },
        subHeader: { fontSize: 12, bold: false, italics: true },
        frontHeader: { fontSize: 24, bold: true },
        frontDate: { fontSize: 12, italics: true },
        pageHeader: { fontSize: 16, bold: true, color: 'lightgrey' },
        table: {
            margin: [0, 5, 0, 30]
        },
        tableHeader: {
            bold: true,
            fontSize: 8,
            color: 'black'
        },
        tableCell: {
            bold: false,
            fontSize: 8,
            color: 'black'
        }
    }

    let pdfFonts = {
        Roboto: {
            normal: 'node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf',
            bold: 'node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf',
            italics: 'node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf',
            bolditalics: 'node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf'
        }
    }

    
    let congestionValue = 90 // 90% usage or more is congested

    let standardPerfTable = perfToTable(allApPerformance, allApStatistics, allApProductTypes)

    let dlFrameCongestion = perfToTable(
        new Map([...allApPerformance].filter(([k, v]) => isCongested(getMetric(v, "dl_frame_utilization"), congestionValue, 0.2))), 
        allApStatistics, allApProductTypes)

    let ulFrameCongestion = perfToTable(
            new Map([...allApPerformance].filter(([k, v]) => isCongested(getMetric(v, "ul_frame_utilization"), congestionValue, 0.2))),
            allApStatistics, allApProductTypes)

    let docDefinition: any = {
    	content: [
            { image: logoFile, alignment: 'center', margin: [0,200,0,50] },
            { text: 'cnMaestro Full Performance Report', style: "frontHeader", alignment: 'center' },
            { text: `${fileStartDate} - ${fileEndDate}`, style: "frontDate", alignment: 'center'},

            // 450i Overview Page
            { columns: [
                    { text: '450/450i Concern Areas', style: 'pageHeader', alignment: 'left' }, 
                    { text: fileStartDate, style: 'pageHeader', alignment: 'right' }
                ], pageBreak: 'before', margin: [0,0,0,30] },
            { text: "Download Congestion Overview (450/450i)", style: 'header' }, // New Page
            { text: "450/450i sectors with over 20% of downlink hours congested", style: 'subHeader'},
            genTable(dlFrameCongestion.filter((a) => a["Download Busy Hours"].value >= 20 && a.Type.value != '450m').sort((a, b) => (a["Download Busy Hours"].value - b["Download Busy Hours"].value)).reverse()),

            { text: "Upload Congestion Overview (450/450i)", style: 'header' },
            { text: "450/450i sectors with over 20% of uplink hours congested", style: 'subHeader'},
            genTable(ulFrameCongestion.filter((a) => a["Upload Busy Hours"].value >= 20 && a.Type.value != '450m').sort((a, b) => (a["Upload Busy Hours"].value - b["Upload Busy Hours"].value)).reverse()), 

            //450m Overview Page
            { columns: [
                    { text: '450m Concern Areas', style: 'pageHeader', alignment: 'left' }, 
                    { text: fileStartDate, style: 'pageHeader', alignment: 'right' }
                ], pageBreak: 'before', margin: [0,0,0,30] },
            { text: "Download Low Bits/Hz Overview (450m)", style: 'header' }, // New Page
            { text: "450m sectors with Average download bits/hz below 4", style: 'subHeader'},
            genTable(standardPerfTable.filter((a) => a["Download b/Hz (Avg)"].value <= 4 && a.Type.value == '450m').sort((a, b) => (a["Download b/Hz (Avg)"].value - b["Download b/Hz (Avg)"].value)).reverse()),
            
            { text: "Upload Low Bits/Hz Overview (450m)", style: 'header' },
            { text: "450m sectors with Average upload bits/hz below 2", style: 'subHeader'},
            genTable(standardPerfTable.filter((a) => a["Upload b/Hz (Avg)"].value <= 2 && a.Type.value == '450m').sort((a, b) => (a["Upload b/Hz (Avg)"].value - b["Upload b/Hz (Avg)"].value)).reverse()),
            
        ], 
        styles: pdfStyles,
        pageMargins: [ 20, 20, 20, 20 ],
    }

    towers.forEach(tower => {
        // Create our SVGs for this tower
        let towerSvgs = createTowerSvgs(tower, allApStatistics, allApPerformance, allApProductTypes);
        let thisTowerApTable = genTable(perfToTable(new Map([...allApPerformance].filter(([k, v]) => v[0].tower == tower.name)), allApStatistics, allApProductTypes))
        
        // Tower Front Page
        docDefinition.content.push({ image: logoFile, alignment: 'center', margin: [0,200,0,10], pageBreak: 'before' })
        docDefinition.content.push({ text: tower.name, style: "frontHeader", alignment: 'center', margin: [0,0,0,20] })
        docDefinition.content.push(thisTowerApTable)
       
        // Add Header
        docDefinition.content.push({
            columns: [
                { text: tower.name, style: 'pageHeader', alignment: 'left' }, 
                { text: fileStartDate, style: 'pageHeader', alignment: 'right' }
            ], pageBreak: 'before', margin: [0,0,0,30] })

        // Add SVGs
        towerSvgs.forEach(s => docDefinition.content.push({svg: s, width: 550, margin: [0,0,0,30]}))
    })








    let printer = new pdfMake(pdfFonts);
    const file = `${fileDateTag} - cnMaestro Tech Report.pdf`
    let pdfDoc = printer.createPdfKitDocument(docDefinition)
    await pdfDoc.pipe(fs.createWriteStream(file))
    pdfDoc.end()  
    return file
}

function createTowerSvgs(tower: apiTower, allApStatistics: Map<string, apiStatistics[]>, allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>): string[] {
    // Create and return an array of all the SVGs for this tower
    let svgs: string[] = []
    let thisTowerAps: Map<string, apiPerformance[]> = new Map([...allApPerformance].filter(([k, v]) => v[0].tower == tower.name && v[0].radio))
    thisTowerAps.forEach((ap: apiPerformance[]) => svgs.push(graph(ap, allApStatistics.get(tower.name), allApProductTypes, 90, 0.2)))

    return svgs
}

/*
function createSiteSVGPages(allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>, allApStatistics: Map<string, apiStatistics[]>, towers: apiTower[], allSmStatistics: Map<string, apiSmStatistics[]>) {
    // Generate SVGs for Available Towers->APs
    let svgs = createTowerSvgs(towers, allApStatistics, allApPerformance, allApProductTypes)

    let svgPages[]
    // SVG Pages
    let svgPosition: number = 0
    let thisSVGPosition: number = 0
    for (let svgTower in svgs) {
        for (let svg in svgs[svgTower]) {
            // This is a new Tower so we need a new site page with table.
            if (svgPosition == 0) {

                                    // New Tower (So make a table frontpage)
                console.log(`New Tower Page: ${svgTower}`)
                doc.addPage()
                doc.image(logoFile, (doc.page.width / 2) - 88, (doc.page.height / 3) - 100)
                doc.fontSize(32)
                doc.text(svgTower, 0, 0.4 * (doc.page.height - doc.heightOfString(svgTower, { width: doc.page.width, align: 'center' })), { width: doc.page.width, align: 'center' })
                doc.text(" ")
                doc.fontSize(8)
                let towerPanels = perfToTableData(new Map([...allApPerformance].filter(([k, v]) => v[0].tower == svgTower)), allApStatistics, allApProductTypes)
                table.addBody(towerPanels)
            }

            // This is a new page so we need a title at the top
            if (svgPosition % 3 == 0) {
                console.log(`New SVG Page`)
                doc.addPage()
                doc.fillColor('lightgrey')
                doc.fontSize(18)
                doc.text(svgTower, 20, 15)
                doc.text(fileStartDate, 500, 15)
                thisSVGPosition = 0
            }

            // Add SVG
            console.log(`Adding SVG: ${svgTower} - ${svg} - ${pdfSVGloc[thisSVGPosition]}`)
            SVGtoPDF(doc, svgs[svgTower][svg], pdfSVGMargin, pdfSVGloc[thisSVGPosition])
            svgPosition += 1
            thisSVGPosition += 1
        }
        svgPosition = 0
    }
}
*/