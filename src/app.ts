import { startTime, endTime, enableEip, schedule, deleteAfterEmail }  from './config'
import { apiTower, apiStatistics, apiPerformance, apiSmStatistics } from './cnMaestroTypes'
import { getAllApStatistics, getAllApPerformance, getAllApProductTypes, getAllTowers, getAllSmStatistics } from './cnMaestroApiCalls'
import { createFullTechReport } from './reports/createFullTechReport'
import { createHighLevelNetworkReport } from './reports/createHighLevelNetworkReport'
import { createHighLevelSiteReport } from './reports/createHighLevelSiteReport'
import { getAllSmEipPackages } from './engageipApiCalls'
import { sendEmailReport } from './mail'
import { deleteOldCache, deleteOldPdfs } from './caching'

async function main() {
    console.log(`cnMaestro Report Generator v(${require('root-require')('package.json').version})`)

    // Cleanup Old Cache Files
    deleteOldCache()

    // Grab our towers
    const towers: Array<apiTower> = await getAllTowers()

    // Grab all of our towers APs Statitics (which includes all kinds of ap info)
    const allApStatistics: Map<string, apiStatistics[]> = await getAllApStatistics(towers)
    
    // Grab all clientSM Statistics
    const allSmStatistics: Map<string, apiSmStatistics[]> = await getAllSmStatistics(towers)

    // Fetch all the AP Performance data for our time period
    const allApPerformance: Map<string, apiPerformance[]> = await getAllApPerformance(allApStatistics, startTime, endTime)

    // Fetch all the AP Product types
    const allApProductTypes: Map<string, string[]> = await getAllApProductTypes(allApStatistics)

    // Store our various reports as attachments
    let attachments: string[] = []

    // Generate a technical report
    attachments.push(await createFullTechReport(allApPerformance, allApProductTypes, allApStatistics, towers))

    // If EngageIP support is enabled we can generate a package details report and fetch package infromation from EIP.
    if (enableEip) { 
        // Grab engageip package information for each clients package
        const allSmPackages = await getAllSmEipPackages(allSmStatistics) 

        // Generate High Level report with Financials
        attachments.push(await createHighLevelNetworkReport(allApPerformance, allSmStatistics, allSmPackages))
        
        // Generate High Level report with Financials
        attachments.push(await createHighLevelSiteReport(allApPerformance, allApProductTypes, allApStatistics, towers,allSmStatistics, allSmPackages))
    }

    // Send email with the report
    await sendEmailReport(attachments)

    // Optionally cleanup old PDF files from reports directory
    if (deleteAfterEmail) {
        deleteOldPdfs()
    }    

    // Alert the next run
    if (schedule || schedule != "") {
        console.log(`Next run scheduled: ${schedule}`)
    }
}

// If we have a schedule set, use schedule, if we don't run the report once.
if (schedule || schedule != "") {
    console.log(`Scheduling Run: ${schedule}...`)
    require('node-cron').schedule(schedule, () =>  {
        console.log('Scheduled Run...')
        main()
    }) 
} else {
    console.log('Single Run...')
    main()
}