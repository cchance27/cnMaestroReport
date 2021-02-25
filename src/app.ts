import { enableEip, schedule, deleteAfterEmail, enableProm }  from './config'
import { apiTower, apiStatistics, apiPerformance, apiSmStatistics } from './cnMaestroTypes'
import { getAllApStatistics, getAllApPerformance, getAllApProductTypes, getAllTowers, getAllSmStatistics, /* getAllSmPerformance */ } from './cnMaestroApiCalls'
import { createFullTechReport } from './reports/createFullTechReport'
import { createHighLevelNetworkReport } from './reports/createHighLevelNetworkReport'
import { createHighLevelSiteReport } from './reports/createHighLevelSiteReport'
import { getAllSmEipPackages } from './engageipApiCalls'
import { sendEmailReport } from './mail'
import { deleteOldCache, deleteOldPdfs, deleteOldXls } from './caching'
import { createPanelExcelWorkbook } from './reports/createPanelExcelWorkbook'
import { Bandwidth, getAllPromPanelBandwidths } from './prometheusApiCalls'

async function main() {
    // Cleanup Old Cache Files
    deleteOldCache()
    
    // Grab our towers
    const towers: Array<apiTower> = await getAllTowers()

    // Grab all of our towers APs Statitics (which includes all kinds of ap info)
    const allApStatistics: Map<string, apiStatistics[]> = await getAllApStatistics(towers)
    
    // Grab all clientSM Statistics
    const allSmStatistics: Map<string, apiSmStatistics[]> = await getAllSmStatistics(towers)

    // Fetch all the AP Performance data for our time period
    const allApPerformance: Map<string, apiPerformance[]> = await getAllApPerformance(allApStatistics)

    // Fetch all the SM Performance data for our time period: DISABLED AS A LOT OF API CALLS AN NOT REALLY USEFUL AT MOMENT
    //const allSmPerformance: Map<string, apiPerformance[]> = await getAllSmPerformance(allSmStatistics)

    // Fetch all the AP Product types
    const allApProductTypes: Map<string, string[]> = await getAllApProductTypes(allApStatistics)

    // Store our various reports as attachments
    let attachments: string[] = []

    // Generate a technical report
    attachments.push(await createFullTechReport(allApPerformance, allApProductTypes, allApStatistics, towers))

    // Generate a Excel Sector report: WIP
    await createPanelExcelWorkbook(allApPerformance, allApProductTypes, allApStatistics)
    
    let allPanelBandwidth: Map<string, Bandwidth> = new Map
    if (enableProm) {
        allPanelBandwidth = await getAllPromPanelBandwidths(allApStatistics);
    }

    let notices = "";
    // If EngageIP support is enabled we can generate a package details report and fetch package infromation from EIP.
    if (enableEip) { 
        // Grab engageip package information for each clients package
        const allSmPackages = await getAllSmEipPackages(allSmStatistics) 

        // Generate High Level report with Financials
        attachments.push(await createHighLevelNetworkReport(allSmStatistics, allSmPackages.packages, allApStatistics, allPanelBandwidth))
        
        // Generate High Level report with Financials
        attachments.push(await createHighLevelSiteReport(allApPerformance, allApProductTypes, allApStatistics, towers, allSmStatistics, allSmPackages.packages, allPanelBandwidth))

        if (allSmPackages.double.length > 0) {
            notices += "<h3>EngageIP Duplicate ESNs</h3>"
            notices += "<i>Clients might not be getting correct package, please have commercial check for incorrectly cancelled packages.</i><br/>"
            notices += '<hr style="border: 0; height: 1px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));" />'
            allSmPackages.double.forEach(mac => notices += `${mac}<br />`)
            notices += "<br />"
        }

        if (allSmPackages.missing.length > 0) {
            notices += "<h3>EngageIP Missing ESNs</h3>"
            notices += "<i>Possibly disconnected recently and pending re-auth -OR- ESN in engage-ip has spaces after/before it, and should be reset to clean up..</i><br/>"
            notices += '<hr style="border: 0; height: 1px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));" />'
            allSmPackages.missing.forEach(mac => notices += `${mac}<br />`)

        }
    }

    // Send email with the report
    await sendEmailReport(attachments, notices)

    // Optionally cleanup old PDF files from reports directory
    if (deleteAfterEmail) {
        deleteOldPdfs()
        deleteOldXls()
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