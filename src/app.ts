import { smtpHost, smtpPort, clientid, client_secret, baseURL, startTime, endTime } from './config'
import { apiTower, apiStatistics, apiPerformance, apiSmStatistics } from './cnMaestroTypes'
import { loginCNMaestro } from './myFunctions'
import { getAllApStatistics, getAllApPerformance, getAllApProductTypes, getAllTowers, getAllSmStatistics } from './cnMaestroApiCalls'
import { generateFullTechReport } from './reports/generateFullTechReport'
import { generateLiteReport } from './reports/generateLiteReport'
import { getAllSmEipPackages, eipPackage } from './engageipApiCalls'


let moment = require('moment');

const mailer = require('sendmail')({ smtpHost: smtpHost, smtpPort: smtpPort })

//writer.on('finish', () => sendEmail())

async function main() {
    // Grab an accessToken for use with cnMaestro
    const accessToken: string = await loginCNMaestro(clientid, client_secret, baseURL)

    // Grab our towers
    const towers: Array<apiTower> = await getAllTowers(accessToken)

    // Grab all of our towers APs Statitics (which includes all kinds of ap info)
    const allApStatistics: Map<string, apiStatistics[]> = await getAllApStatistics(towers, accessToken)
    
    // Grab all clientSM Statistics
    const allSmStatistics: Map<string, apiSmStatistics[]> = await getAllSmStatistics(towers, accessToken)

    // Grab subscriber packages for the cnMaestro SMs
    const allEipSubInfo = await getAllSmEipPackages(allSmStatistics)

    // Fetch all the AP Performance data for our time period
    const allApPerformance: Map<string, apiPerformance[]> = await getAllApPerformance(allApStatistics, accessToken, startTime, endTime)

    // Fetch all the AP Product types
    const allApProductTypes: Map<string, string[]> = await getAllApProductTypes(allApStatistics, accessToken)

    // Generate a technical report
    await generateFullTechReport(allApPerformance, allApProductTypes, allApStatistics, towers,allSmStatistics, allEipSubInfo)

    // Generate lite report
    //await generateLiteReport(allApPerformance)
}

//TODO: report should have a nice overview of stats with perhaps mini charts, subscribers, efficiency, perhaps show the worst ones "points of concern this week"

main()