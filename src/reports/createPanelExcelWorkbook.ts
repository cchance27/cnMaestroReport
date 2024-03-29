import { apiStatistics, apiPerformance } from '../cnMaestroTypes'
import { perfToTable } from '../perfToTableData'
import * as fs from 'fs'
import { fileDateTag} from '../timeFunctions'
import * as Excel from 'exceljs'

export async function createPanelExcelWorkbook(allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>, allApStatistics: Map<string, apiStatistics[]>, reportDir: string = "reports") {
    if (!fs.existsSync(reportDir)) { fs.mkdirSync(reportDir) }
//
    let standardPerfTable = perfToTable(allApPerformance, allApStatistics, allApProductTypes)
//
    const workbook = new Excel.Workbook()
    workbook.creator = 'cnMaestro Automated Report'
    
    const sheet = workbook.addWorksheet('Canopy450 Panels')

    let columns = []
    if (Object.keys(standardPerfTable).length > 0) {
        Object.keys(standardPerfTable[0]).forEach((k) => { columns.push({ header: k, key: k }) })
        
        sheet.columns = columns 
        Array.from(standardPerfTable.values())
            .map((sector) => {
                Object.keys(sector).forEach((item: any) => {
                    sector[item] = sector[item].value
                })
               sheet.addRow(sector)
            })
    }
    let filename = `${reportDir}/${fileDateTag()} - cnMaestro Sectors.xlsx`
    await workbook.xlsx.writeFile(filename)
    return filename
}
