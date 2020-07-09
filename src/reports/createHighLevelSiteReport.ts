import { logoFile, brandColor1 } from '../config'
import { apiTower, apiStatistics, apiPerformance, apiSmStatistics } from '../cnMaestroTypes'
import { stackedBarChart, getNonNameNonTotalKeys, gauge } from '../charting'
import { perfToTable } from '../perfToTableData'
import { genPdfTableDDContent, generateAndSavePDF, stylizedHeading, dtoApMacToNames, averageLQI, towerValues, apTotalDataUsage, panelsOfTowerValues, dtoTowerValuesToStackedChartData, packagesOfTowerValue } from "../pdfFunctions"
import { getReadableDataSize } from '../myFunctions'
import * as d3 from 'd3'
import * as fs from 'fs'
import { fileStartDate, fileDateTag, formattedStartDateTime, formattedEndDateTime } from '../timeFunctions'

export async function createHighLevelSiteReport(allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>, allApStatistics: Map<string, apiStatistics[]>, towers: apiTower[], allSmStatistics: Map<string, apiSmStatistics[]>, allSmPackages: {}, reportDir: string = "reports") {
    if (!fs.existsSync(reportDir)) { fs.mkdirSync(reportDir) }

    let towerNames = dtoApMacToNames(allApStatistics)
    let tVals = towerValues(allSmStatistics, allSmPackages)
    let dataUsage = apTotalDataUsage(allApPerformance)
    let formatDollar = d3.format("$,")

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
        let thisTowerApPerformance = new Map([...allApPerformance].filter(([_, v]) => v[0].tower == tower.name))
        let thisTowerApPerfTable = genPdfTableDDContent(perfToTable(thisTowerApPerformance, allApStatistics, allApProductTypes))
        let thisTowerAps: string[] = Array.from(thisTowerApPerformance.keys())
        let panelRevenue = dtoTowerValuesToStackedChartData(panelsOfTowerValues(thisTowerApSms, allSmPackages, towerNames, false))
        let panelRevenueKeyCount = getNonNameNonTotalKeys(panelRevenue).length
        let panelRevenueChartHeightCount: number = (panelRevenue.length > panelRevenueKeyCount) ? panelRevenue.length : panelRevenueKeyCount
        let packageRevenue = dtoTowerValuesToStackedChartData(packagesOfTowerValue(thisTowerApSms, allSmPackages, towerNames, false))
        let packageRevenueKeyCount = getNonNameNonTotalKeys(packageRevenue).length
        let packageRevenueChartHeightCount: number = (packageRevenue.length > packageRevenueKeyCount) ? packageRevenue.length : packageRevenueKeyCount
        let towerLQI = averageLQI(allSmStatistics, tower.name)
        let towerRevenue = tVals.filter(v => v.name === tower.name)[0].total
        let towerSMs = thisTowerApSms.size === 0 ? 0 : thisTowerApSms.get(tower.name).length
        let towerSectorsDlUsage = thisTowerAps.reduce((agg, apName) => agg + (dataUsage[apName].download || 0), 0)
        let towerSectorsUlUsage = thisTowerAps.reduce((agg, apName) => agg + (dataUsage[apName].upload || 0), 0)

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
                    { text: `${getReadableDataSize(towerSectorsDlUsage, 2)}`, style: 'subheader', alignment: 'center' }
                    ], width: 'auto'
                },
                {
                    stack: [{ text: 'Tower SMs', style: 'header', alignment: 'center' },
                    { text: 'Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                    { text: towerSMs, style: 'subheader', alignment: 'center' },
                    { text: ' ' },
                    { text: 'Total Upload', style: 'header', alignment: 'center' },
                    { text: 'UL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                    { text: `${getReadableDataSize(towerSectorsUlUsage, 2)}`, style: 'subheader', alignment: 'center' }
                    ], width: '*'
                },
                {
                    stack: [{ text: `Subscriber Health`, style: 'header', alignment: 'center' },
                    { text: 'Average SM Link Quality Index this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                    { columns: [{ svg: gauge(towerLQI.downlink, 80, "Downlink LQI", 100, 'red', 'green'), alignment: 'center' }, { svg: gauge(towerLQI.uplink, 80, "Uplink LQI", 100), alignment: 'center' }] }
                    ], width: 'auto'
                }
            ]
        }, { text: 'Package Monthly Revenue', alignment: 'center', style: "header", margin: [0, 15, 0, 0] }, 
           { text: 'Revenue by package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
           { svg: stackedBarChart(packageRevenue, 590, packageRevenueChartHeightCount * 12 + 15, true, 230, "total", true, false, false) }, 
           { text: 'Panel Monthly Revenue', alignment: 'center', style: "header", margin: [0, 15, 0, 0] }, 
           { text: 'Revenue by panel based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
           { svg: stackedBarChart(panelRevenue, 590, panelRevenueChartHeightCount * 12 + 15, true, 70, "name", true, false, false) }, 
           { text: 'Panel Statistics', alignment: 'center', style: "header", margin: [0, 15, 0, 0] }, 
           { text: 'General statistics for site panels during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] }, 
           thisTowerApPerfTable)
    })
    return await generateAndSavePDF(docDefinition, `${reportDir}/${fileDateTag()} - High Level Site Report.pdf`)
}
