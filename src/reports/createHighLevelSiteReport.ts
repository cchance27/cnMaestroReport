import { logoFile, brandColor1, eurusd } from '../config'
import { apiTower, apiStatistics, apiPerformance, apiSmStatistics } from '../cnMaestroTypes'
import { stackedBarChart, getNonNameNonTotalKeys, gauge } from '../charting'
import { perfToTable } from '../perfToTableData'
import { genPdfTableDDContent, generateAndSavePDF, stylizedHeading, dtoApMacToNames, averageLQI, towerValues, panelsOfTowerValues, dtoTowerValuesToStackedChartData, packagesOfTowerValue, busResCountAndValues, apPrometheusDataTotal } from "../pdfFunctions"
import { eipPackage, getReadableDataSize } from '../myFunctions'
import * as d3 from 'd3'
import * as fs from 'fs'
import { fileStartDate, fileDateTag, formattedStartDateTime, formattedEndDateTime } from '../timeFunctions'
import { Bandwidth } from '../prometheusApiCalls'

export async function createHighLevelSiteReport(allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>, allApStatistics: Map<string, apiStatistics[]>, towers: apiTower[], allSmStatistics: Map<string, apiSmStatistics[]>, allSmPackages: {[esn: string]: eipPackage}, allApBandwidths: Map<string, Bandwidth>, reportDir: string = "reports") {
    if (!fs.existsSync(reportDir)) { fs.mkdirSync(reportDir) }

    let towerNames = dtoApMacToNames(allApStatistics)
    let tVals = towerValues(allSmStatistics, allSmPackages)
    let formatDollar = d3.format("$,")

    Object.keys(allSmPackages).forEach(esn => {
        // Convert French EUR to USD
        if (allSmPackages[esn].owner.startsWith("FR"))
            allSmPackages[esn].amount *= eurusd
    });

    let docDefinition: any = {
        content: [
            { image: logoFile, alignment: 'center', margin: [0, 200, 0, 50] },
            { text: stylizedHeading('cnMaestro Site Overview', 32), alignment: 'center' },
            { text: `${formattedStartDateTime()} - ${formattedEndDateTime()}`, style: "frontDate", alignment: 'center' },
        ],
        defaultStyle: {
            font: 'DaxOT'
        }
    }

    // Each tower dashboard
    towers.forEach(tower => {
        console.log(`Generating Tower Page: ${tower.name}`)
        let thisTowerApSms: Map<string, apiSmStatistics[]> = new Map([...allSmStatistics].filter(([_, v]) => v.length > 0 && v[0].tower == tower.name)) // Only this towers SMs
        let thisTowerApPerformance = new Map([...allApPerformance].filter(([_, v]) => v.length > 0 && v[0].tower == tower.name))
        let thisTowerApPerfTable = genPdfTableDDContent(perfToTable(thisTowerApPerformance, allApStatistics, allApProductTypes))
        let panelRevenue = dtoTowerValuesToStackedChartData(panelsOfTowerValues(thisTowerApSms, allSmPackages, towerNames, false))
        let panelRevenueKeyCount = getNonNameNonTotalKeys(panelRevenue).length
        let panelRevenueChartHeightCount: number = (panelRevenue.length > panelRevenueKeyCount) ? panelRevenue.length : panelRevenueKeyCount
        let packageRevenue = dtoTowerValuesToStackedChartData(packagesOfTowerValue(thisTowerApSms, allSmPackages, towerNames, false))
        let packageRevenueKeyCount = getNonNameNonTotalKeys(packageRevenue).length
        let packageRevenueChartHeightCount: number = (packageRevenue.length > packageRevenueKeyCount) ? packageRevenue.length : packageRevenueKeyCount
        let towerLQI = averageLQI(allSmStatistics, tower.name)
        let towerRevenue = tVals.filter(v => v.name === tower.name)[0].total
        let towerSMs = thisTowerApSms.size === 0 ? 0 : thisTowerApSms.get(tower.name).length
        
        // Grab this towers panels IPs so we can lookup their usage from prometheus
        let thisTowerUsageTotal = apPrometheusDataTotal(allApBandwidths, tower.name, allApStatistics)
         
        let [busResCounts, busResValues] = busResCountAndValues(thisTowerApSms.get(tower.name), allSmPackages)

        docDefinition.content.push({
            columns: [
                { text: stylizedHeading(tower.name, 24), alignment: 'left' },
                { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }
            ], pageBreak: 'before', margin: [0, 0, 0, 30]
        }, {
            columns: [
                {
                    stack: [{ text: 'Tower Revenue', style: 'header', alignment: 'center' },
                    { text: 'Online SM Revenue this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                    { text: `${formatDollar(towerRevenue)}/month`, style: 'subheader', alignment: 'center' },
                    { text: ' ' },
                    { text: 'Total Download', style: 'header', alignment: 'center' },
                    { text: 'DL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                    { text: `${getReadableDataSize(thisTowerUsageTotal.DL, 2, 1000)}`, style: 'subheader', alignment: 'center' }
                    ], width: 'auto'
                },
                {
                    stack: [{ text: 'Tower SMs', style: 'header', alignment: 'center' },
                    { text: 'Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                    { text: towerSMs, style: 'subheader', alignment: 'center' },
                    { text: ' ' },
                    { text: 'Total Upload', style: 'header', alignment: 'center' },
                    { text: 'UL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                    { text: `${getReadableDataSize(thisTowerUsageTotal.UL, 2, 1000)}`, style: 'subheader', alignment: 'center' }
                    ], width: '*'
                },
                {
                    stack: [{ text: `Subscriber Health`, style: 'header', alignment: 'center' },
                    { text: 'Average SM Link Quality Index this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                    { columns: [{ svg: gauge(towerLQI.downlink, 80, "Downlink LQI", 100, 'red', 'green'), alignment: 'center' }, { svg: gauge(towerLQI.uplink, 80, "Uplink LQI", 100), alignment: 'center' }] }
                    ], width: 'auto'
                }
            ]
        },
        { columns: [
            { stack: [
                { text: 'Subscribers by Type', alignment: 'center', style: "header", margin: [0, 15, 0, 0] }, 
                { text: 'SMs by Subscriber Types', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                { svg: stackedBarChart(busResCounts, 275, busResCounts.length * 12 + 15, false, 55, "name", true, false, false) }, 
            ] },
            { stack: [
                { text: 'Subscribers by Value', alignment: 'center', style: "header", margin: [0, 15, 0, 0] }, 
                { text: 'Revenue by Subscriber Types', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                { svg: stackedBarChart(busResValues, 275, busResValues.length * 12 + 15, true, 55, "name", true, false, false) }, 
            ]}
        ]},
        { text: 'Package Monthly Revenue', alignment: 'center', style: "header", margin: [0, 15, 0, 0] }, 
        { text: 'Revenue by package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
        { svg: stackedBarChart(packageRevenue, 580, packageRevenueChartHeightCount * 12 + 15, true, 230, "total", true, false, false) }, 
        { text: 'Panel Monthly Revenue', alignment: 'center', style: "header", margin: [0, 15, 0, 0] }, 
        { text: 'Revenue by panel based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
        { svg: stackedBarChart(panelRevenue, 580, panelRevenueChartHeightCount * 12 + 15, true, 70, "name", true, false, false) }, 

        { text: 'Panel Statistics', alignment: 'center', style: "header", margin: [0, 15, 0, 0] }, 
        { text: 'General statistics for site panels during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] }, 
        thisTowerApPerfTable)
    })
    return await generateAndSavePDF(docDefinition, `${reportDir}/${fileDateTag()} - High Level Site Report.pdf`)
}
