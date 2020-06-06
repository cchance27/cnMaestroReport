import { clientid, client_secret, baseURL, startTime, endTime }  from './config'
import { apiTower, apiStatistics, apiPerformance, apiSmStatistics } from './cnMaestroTypes'
import { loginCNMaestro } from './myFunctions'
import { getAllApStatistics, getAllApPerformance, getAllApProductTypes, getAllTowers, getAllSmStatistics } from './cnMaestroApiCalls'
import { createFullTechReport } from './reports/createFullTechReport'
import { createHighLevelReport } from './reports/createHighLevelReport'
import { getAllSmEipPackages } from './engageipApiCalls'
import { sendEmailReport } from './mail'
import { deleteOldCache } from './caching'

async function main() {
    // Cleanup Old Cache Files
    deleteOldCache()

    // Grab an accessToken for use with cnMaestro
    const accessToken: string = await loginCNMaestro(clientid, client_secret, baseURL)

    // Grab our towers
    const towers: Array<apiTower> = await getAllTowers(accessToken)

    // Grab all of our towers APs Statitics (which includes all kinds of ap info)
    const allApStatistics: Map<string, apiStatistics[]> = await getAllApStatistics(towers, accessToken)
    
    // Grab all clientSM Statistics
    const allSmStatistics: Map<string, apiSmStatistics[]> = await getAllSmStatistics(towers, accessToken)

    // Grab EIP subscriber packages for the cnMaestro SMs, Returns ESN: {package: string, sku: string, amount: number}
    const allSmPackages = await getAllSmEipPackages(allSmStatistics)

    // Fetch all the AP Performance data for our time period
    const allApPerformance: Map<string, apiPerformance[]> = await getAllApPerformance(allApStatistics, accessToken, startTime, endTime)

    // Fetch all the AP Product types
    const allApProductTypes: Map<string, string[]> = await getAllApProductTypes(allApStatistics, accessToken)

    // Store our various reports as attachments
    let attachments: string[] = []

    // Generate a technical report
    attachments.push(await createFullTechReport(allApPerformance, allApProductTypes, allApStatistics, towers,allSmStatistics))

    // Generate High Level report with Financials
    attachments.push(await createHighLevelReport(allApPerformance, allApProductTypes, allApStatistics, towers,allSmStatistics, allSmPackages))

    // Send email with the report
    await sendEmailReport(attachments)
}

//TODO: report should have a nice overview of stats with perhaps mini charts, subscribers, efficiency, perhaps show the worst ones "points of concern this week"
main()