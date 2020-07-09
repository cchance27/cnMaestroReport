import { logoFile, brandColor1 } from '../config'
import { apiPerformance, apiSmStatistics } from '../cnMaestroTypes'
import { stackedBarChart, gauge } from '../charting'
import { generateAndSavePDF, stylizedHeading, averageLQI, towerValues, packageValues, packageSubscribers, apTotalDataUsage, totalSmValue } from "../pdfFunctions"
import { getReadableDataSize } from '../myFunctions'
import * as d3 from 'd3'
import * as fs from 'fs'
import { fileStartDate, fileDateTag, formattedStartDateTime, formattedEndDateTime } from '../timeFunctions'

export async function createHighLevelNetworkReport(allApPerformance: Map<string, apiPerformance[]>, allSmStatistics: Map<string, apiSmStatistics[]>, allSmPackages: {}, reportDir: string = "reports") {
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir)
    }

    let avgLQI = averageLQI(allSmStatistics)
    let tVals = towerValues(allSmStatistics, allSmPackages)
    let pVals = packageValues(allSmPackages)
    let subVals = packageSubscribers(allSmPackages)
    let dataUsage = apTotalDataUsage(allApPerformance)
    let formatDollar = d3.format("$,")
    let networkDlUsage = Object.keys(dataUsage).reduce((agg, apName) => agg + (dataUsage[apName].download || 0), 0)
    let networkUlUsage = Object.keys(dataUsage).reduce((agg, apName) => agg + (dataUsage[apName].upload || 0), 0)
    
    let docDefinition: any = {
        content: [
            { image: logoFile, alignment: 'center', margin: [0, 200, 0, 50] },
            { text: stylizedHeading('cnMaestro Network Overview', 32), alignment: 'center' },
            { text: `${formattedStartDateTime()} - ${formattedEndDateTime()}`, style: "frontDate", alignment: 'center' },
            // Network Overview
            {
                columns: [
                    { text: stylizedHeading('Network Overview', 24), alignment: 'left' },
                    { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }
                ], pageBreak: 'before', margin: [0, 0, 0, 15]
            },
            {
                columns: [
                    {
                        stack: [{ text: 'Total SM Revenue', style: 'header', alignment: 'center' },
                        { text: 'Online SM Revenue this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                        { text: `${formatDollar(totalSmValue(allSmPackages))}/month`, style: 'subheader', alignment: 'center' },
                        { text: ' ' },
                        { text: 'Total Download', style: 'header', alignment: 'center' },
                        { text: 'DL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                        { text: `${getReadableDataSize(networkDlUsage, 2)}`, style: 'subheader', alignment: 'center' }
                        ], width: "auto"
                    },
                    {
                        stack: [{ text: 'Total Subscribers', style: 'header', alignment: 'center' },
                        { text: 'Online SMs this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                        { text: Object.keys(allSmPackages).length, style: 'subheader', alignment: 'center' },
                        { text: ' ' },
                        { text: 'Total Upload', style: 'header', alignment: 'center' },
                        { text: 'UL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                        { text: `${getReadableDataSize(networkUlUsage, 2)}`, style: 'subheader', alignment: 'center' }
                        ], width: "*"
                    },
                    {
                        stack: [{ text: 'Network Subscriber Health', style: 'header', alignment: 'center' },
                        { text: 'Networkwide Average SM Link Quality Index', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                        { columns: [{ svg: gauge(avgLQI.downlink, 80, "Downlink LQI", 100), alignment: 'center' }, { svg: gauge(avgLQI.uplink, 80, "Uplink LQI", 100), alignment: 'center' }] }
                        ], width: 'auto'
                    }
                ]
            },
            { text: 'PMP monthly revenue by Tower', alignment: 'center', style: "header", margin: [0, 15, 0, 0] },
            { text: 'Revenue by tower based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
            { svg: stackedBarChart(tVals, 600, tVals.length * 12 + 15, true, 100, "total", true, false, false) },
            // Package overview page
            {
                columns: [
                    { text: stylizedHeading('Package Overview', 24), alignment: 'left' },
                    { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }
                ], pageBreak: 'before', margin: [0, 0, 0, 15]
            },
            { text: 'PMP monthly revenue by Package', alignment: 'center', style: "header", margin: [0, 15, 0, 0] },
            { text: 'Revenue by package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
            { svg: stackedBarChart(pVals, 600, pVals.length * 12 + 15, true, 230, "total", true, false, false) },
            { text: 'PMP subscribers per Package', alignment: 'center', style: "header", margin: [0, 15, 0, 0] },
            { text: 'Subscribers per package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
            { svg: stackedBarChart(subVals, 600, subVals.length * 12 + 15, false, 230, "total", true, false, false) },
        ],
        defaultStyle: {
            font: 'DaxOT'
        }
    }
    return await generateAndSavePDF(docDefinition, `${reportDir}/${fileDateTag()} - High Level Network Report.pdf`)
}
