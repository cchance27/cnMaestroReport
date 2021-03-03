import { apiStatistics, apiPerformance } from '../cnMaestroTypes'
import { perfToTable } from '../perfToTableData'
import * as fs from 'fs'
import { fileDateTag} from '../timeFunctions'
import * as Excel from 'exceljs'
import { Bandwidth } from '../prometheusApiCalls'

export async function createPanelExcelWorkbook(allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>, allApStatistics: Map<string, apiStatistics[]>, allApBandwidths: Map<string, Bandwidth>, reportDir: string = "reports") {
    if (!fs.existsSync(reportDir)) { fs.mkdirSync(reportDir) }
//
    let standardPerfTable = perfToTable(allApPerformance, allApStatistics, allApProductTypes, allApBandwidths)
//
    const workbook = new Excel.Workbook()
    workbook.creator = 'cnMaestro Automated Report'
    
    const sheet = workbook.addWorksheet('Canopy450 Panels')

    let columns = []
    Object.keys(standardPerfTable[0]).forEach((k) => { columns.push({ header: k, key: k }) })
    sheet.columns = columns
//
    Array.from(standardPerfTable.values())
        .map((sector) => {
            Object.keys(sector).forEach((item: any) => {
                sector[item] = sector[item].value
            })
           sheet.addRow(sector)
        })
//
    let filename = `${reportDir}/${fileDateTag()} - cnMaestro Sectors.xlsx`
    await workbook.xlsx.writeFile(filename)
    return filename
}
