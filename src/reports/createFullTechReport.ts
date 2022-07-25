import { logoFile, brandColor1 } from '../config'
import { apiTower, apiStatistics, apiPerformance } from '../cnMaestroTypes'
import { graph, donutChart } from '../charting'
import { getMetric } from '../cnMaestroMetricTools'
import { perfToOversubTable, perfToTable } from '../perfToTableData'
import { isCongested } from '../congestion'
import { genPdfTableDDContent, genPdfTableOversubContent, generateAndSavePDF, stylizedHeading, smCountByFrequency, apCountByFrequency } from "../pdfFunctions"
import * as fs from 'fs'
import { fileStartDate, fileDateTag, formattedEndDateTime, formattedStartDateTime } from '../timeFunctions'

export async function createFullTechReport(allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>, allApStatistics: Map<string, apiStatistics[]>, towers: apiTower[], reportDir: string = "reports") {
    if (!fs.existsSync(reportDir)) { fs.mkdirSync(reportDir) }
    
    let congestionValue = 90 // 90% usage or more is congested
    
    let standardPerfTable = perfToTable(allApPerformance, allApStatistics, allApProductTypes)
   
    let dlFrameCongestion = perfToTable(
        new Map([...allApPerformance].filter(([_, v]) => isCongested(getMetric(v, "dl_frame_utilization"), congestionValue, 0.25))), 
        allApStatistics, allApProductTypes)

    let anyDlFrameCongestion = perfToTable(
        new Map([...allApPerformance].filter(([_, v]) => isCongested(getMetric(v, "dl_frame_utilization"), congestionValue, 0))), 
        allApStatistics, allApProductTypes)

    let ulFrameCongestion = perfToTable(
        new Map([...allApPerformance].filter(([_, v]) => isCongested(getMetric(v, "ul_frame_utilization"), congestionValue, 0.25))),
        allApStatistics, allApProductTypes)

    let anyUlFrameCongestion = perfToTable(
            new Map([...allApPerformance].filter(([_, v]) => isCongested(getMetric(v, "ul_frame_utilization"), congestionValue, 0))),
            allApStatistics, allApProductTypes)

    let apCount = [...allApPerformance].length
    console.log(`Downlink: Major Congestion ${dlFrameCongestion.length}, Minor Congestion ${anyDlFrameCongestion.length - dlFrameCongestion.length}, No Congestion: ${apCount - anyDlFrameCongestion.length}, Total Sectors: ${apCount}`)
    console.log(`Uplink: Major Congestion ${ulFrameCongestion.length}, Minor Congestion ${anyUlFrameCongestion.length - ulFrameCongestion.length}, No Congestion: ${apCount - anyUlFrameCongestion.length}, Total Sectors: ${apCount}`)

    let oversubPerfTable = perfToOversubTable(allApPerformance, allApStatistics, allApProductTypes)

    let docDefinition: any = {
    	content: [
            { image: logoFile, alignment: 'center', margin: [0,200,0,50] },
            { text: stylizedHeading('cnMaestro Technical', 40), alignment: 'center' },
            { text: `${formattedStartDateTime()} - ${formattedEndDateTime()}`, style: "frontDate", alignment: 'center'},

            //Top 10 Overview Page
            { columns: [
                { text: stylizedHeading('Top 10 Overview', 24), alignment: 'left' }, 
                { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }], pageBreak: 'before', margin: [0,0,0,15] },
            { text: "Top 10 Connected SMs", style: 'header' }, // New Page
            { text: "Panels with the most subscribers", style: 'subHeader'},
            genPdfTableDDContent(standardPerfTable.sort((a, b) => b.SMs.value - a.SMs.value).slice(0, 10), "SMs"),

            { text: "Top 10 Peak Downlink", style: 'header' }, // New Page
            { text: "Panels with the highest downlink throughput", style: 'subHeader'},
            genPdfTableDDContent(standardPerfTable.sort((a, b) => b["Download (Max)"].value - a["Download (Max)"].value).slice(0, 10), "Download (Max)"),

            { text: "Top 10 Peak Upload", style: 'header' }, // New Page
            { text: "Panels with the highest uplink throughput", style: 'subHeader'},
            genPdfTableDDContent(standardPerfTable.sort((a, b) => b["Upload (Max)"].value - a["Upload (Max)"].value).slice(0, 10), "Upload (Max)"),

            //Oversubscription
            { columns: [
                { text: stylizedHeading('Oversubscription Data', 24), alignment: 'left' }, 
                { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }], pageBreak: 'before', margin: [0,0,0,15] },
            { text: "Downlink Oversubscription", style: 'header' }, // New Page
            { text: "Oversubscription based on all SMs @256QAM (2.5 group size for 450m APs)", style: 'subHeader'},
            genPdfTableOversubContent(oversubPerfTable.sort((a, b) => (a["Download Provision Total"].value - b["Download Provision Total"].value)).reverse(), "Download Provision Total"),
            
            { columns: [
                { text: stylizedHeading('Oversubscription Data', 24), alignment: 'left' }, 
                { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }], pageBreak: 'before', margin: [0,0,0,15] },
            { text: "Uplink Oversubscription", style: 'header' }, // New Page
            { text: "Oversubscription based on all SMs @256QAM (2.5 group size for 450m APs)", style: 'subHeader'},
            genPdfTableOversubContent(oversubPerfTable.sort((a, b) => (a['Upload Provision Total'].value - b['Upload Provision Total'].value)).reverse(), "Upload Provision Total"),
            
            // 450i Overview Page
            { columns: [
                { text: stylizedHeading('450/450i Attention', 24), alignment: 'left' }, 
                { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }], pageBreak: 'before', margin: [0,0,0,15] },
            { text: "Download Congestion Overview (450/450i)", style: 'header' }, // New Page
            { text: "450/450i sectors with over 20% of downlink hours congested", style: 'subHeader'},
            genPdfTableDDContent(dlFrameCongestion.filter((a) => a["Download Busy Hours"].value >= 20 && a.Type.value != '450m').sort((a, b) => (a["Download Busy Hours"].value - b["Download Busy Hours"].value)).reverse(), "Download Busy Hours"),

            { text: "Upload Congestion Overview (450/450i)", style: 'header' },
            { text: "450/450i sectors with over 20% of uplink hours congested", style: 'subHeader'},
            genPdfTableDDContent(ulFrameCongestion.filter((a) => a["Upload Busy Hours"].value >= 20 && a.Type.value != '450m').sort((a, b) => (a["Upload Busy Hours"].value - b["Upload Busy Hours"].value)).reverse(), "Upload Busy Hours"), 

            //450m Overview Page
            { columns: [
                { text: stylizedHeading('450m Attention', 24), alignment: 'left' }, 
                { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }], pageBreak: 'before', margin: [0,0,0,15] },
            { text: "Download Low Bits/Hz Overview (450m)", style: 'header' }, // New Page
            { text: "450m sectors with Average download bits/hz below 4", style: 'subHeader'},
            genPdfTableDDContent(standardPerfTable.filter((a) => a["Download b/Hz (Avg)"].value <= 4 && a.Type.value == '450m').sort((a, b) => (a["Download b/Hz (Avg)"].value - b["Download b/Hz (Avg)"].value)).reverse() , "Download b/Hz (Avg)"),
            
            { text: "Upload Low Bits/Hz Overview (450m)", style: 'header' },
            { text: "450m sectors with Average upload bits/hz below 2", style: 'subHeader'},
            genPdfTableDDContent(standardPerfTable.filter((a) => a["Upload b/Hz (Avg)"].value <= 2 && a.Type.value == '450m').sort((a, b) => (a["Upload b/Hz (Avg)"].value - b["Upload b/Hz (Avg)"].value)).reverse(), "Upload b/Hz (Avg)"),
            
            { columns: [
                { text: stylizedHeading('Downlink Congestion', 24), alignment: 'left' }, 
                { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }], pageBreak: 'before', margin: [0,0,0,15] },
            
            { text: "Sectors with Major SU-MIMO Congestion", style: 'header' }, // New Page
            { text: "Any sectors with congestion > 6 hours per day", style: 'subHeader'},
            genPdfTableDDContent(dlFrameCongestion.sort((a, b) => (a["Download Busy Hours"].value - b["Download Busy Hours"].value)).reverse() , "Download Busy Hours"),
            
            { columns: [
                { text: stylizedHeading('Uplink Congestion', 24), alignment: 'left' }, 
                { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }], pageBreak: 'before', margin: [0,0,0,15] },
            
            { text: "Sectors with Major SU-MIMO Congestion", style: 'header' },
            { text: "Any sectors with congestion > 6 hours per day", style: 'subHeader'},
            genPdfTableDDContent(ulFrameCongestion.sort((a, b) => (a["Upload Busy Hours"].value - b["Upload Busy Hours"].value)).reverse(), "Upload Busy Hours")
            
        ], 
        defaultStyle: {
            font: 'DaxOT'
        }
    }

    towers.forEach(tower => {
        // Create our SVGs for this tower
        let towerSvgs = createTowerSvgs(tower, allApStatistics, allApPerformance, allApProductTypes);
        let towersApPerformance = new Map([...allApPerformance].filter(([_, v]) => v.length > 0 && v[0].tower != undefined && v[0].tower == tower.name))
        let towersApStatistics = new Map([...allApStatistics].filter(([_, v]) => v.length > 0 && v[0].tower != undefined && v[0].tower == tower.name))
        let thisTowerApTable = genPdfTableDDContent(perfToTable(towersApPerformance, allApStatistics, allApProductTypes))
        
        // Tower Front Page
        docDefinition.content.push({ image: logoFile, alignment: 'center', margin: [0,200,0,10], pageBreak: 'before' })
        docDefinition.content.push({ text: stylizedHeading(tower.name, 32), alignment: 'center', margin: [0, 0, 0, 20] })
        docDefinition.content.push(thisTowerApTable)
        docDefinition.content.push({
            columns: [
                { stack: [{ text: 'SMs by Frequency', style: 'header', alignment: 'center' },
                          { text: 'Based on this Tower', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                          { svg: donutChart(smCountByFrequency(towersApStatistics), 160, false, true), alignment: 'center' }]
                },
                { stack: [{ text: 'APs by Frequency', style: 'header', alignment: 'center' },
                          { text: 'Based on this Tower', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                          { svg: donutChart(apCountByFrequency(towersApStatistics), 160, false, true), alignment: 'center' }]
                 },
            ], margin: [0, 15, 0, 0]
        })

        // Add Header
        docDefinition.content.push({
            columns: [
                { text: stylizedHeading(tower.name, 24), alignment: 'left' }, 
                { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }], pageBreak: 'before', margin: [0,0,0,15] })

        // Add SVGs
        towerSvgs.forEach(s => docDefinition.content.push({svg: s, width: 550, margin: [0,0,0,30]}))
    })


    return generateAndSavePDF(docDefinition, `${reportDir}/${fileDateTag()} - cnMaestro Tech Report.pdf`)
}

function createTowerSvgs(tower: apiTower, allApStatistics: Map<string, apiStatistics[]>, allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>): string[] {
    // Create and return an array of all the SVGs for this tower
    let svgs: string[] = []
    let thisTowerAps: Map<string, apiPerformance[]> = new Map([...allApPerformance].filter(([_, v]) => v.length > 0 && v[0].tower != undefined && v[0].tower == tower.name && v[0].radio))
    thisTowerAps.forEach((ap: apiPerformance[]) => svgs.push(graph(ap, allApStatistics.get(tower.name), allApProductTypes, 90, 0.2)))

    return svgs
}
