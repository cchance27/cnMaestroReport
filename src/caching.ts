import { baseURL, eipOwnerId, eipAnswerField, eipReportName } from './config'
import { stringSort } from './myFunctions'
import * as fs from 'fs'
import { getEipApiToObject } from './engageipApiCalls'
import { apiSmStatistics } from './cnMaestroTypes'
import { getCNMapi } from './cnMaestroApiCalls'
import { fileDateTag } from './timeFunctions'
const moment = require('moment')

export function deleteOldCache(cacheDir: string = "cache") {
    // Create cache directory if it doesn't exist, and return because if it didn't exist theirs nothing to remove.
    if (!fs.existsSync(cacheDir)) { fs.mkdirSync(cacheDir); return; }

    // Files are tagged as some date to yesterday, and for single date as yesterday, 
    // so an old file would be one with the day before yesterday in it not yesterday
    let oldDate = moment().subtract(2, 'd').format("YYYY-MM-DD")
    let oldDateFiles = fs.readdirSync(cacheDir).filter(f => f.indexOf(oldDate) > -1)

    if (oldDateFiles.length > 0) {
        console.log(`Removing Old Cache *${oldDate}*`)
    }
    
    oldDateFiles.map(f => fs.unlinkSync(`${cacheDir}/${f}`))
}

export function deleteOldPdfs(reportDir: string = "reports") {
    if (!fs.existsSync(reportDir)) { fs.mkdirSync(reportDir); return; }

    let pdfFiles = fs.readdirSync(reportDir).filter(f => f.indexOf(".pdf") > -1)

    if (pdfFiles.length > 0) {
        console.log(`Removing Old Cache ${reportDir}/*.pdf`)
    }
    
    pdfFiles.map(f => fs.unlinkSync(`${reportDir}/${f}`))
}

export async function getCachedCnMaestro(objectName: string, apiUrl: string, dateBasedCache: boolean = true, cacheDir: string = "cache") {
    // Create cache directory if it doesn't exist
    if (!fs.existsSync(cacheDir)) { fs.mkdirSync(cacheDir) }

    // Cleanup mac addresses for file name
    objectName = objectName.split(":").join('')

    let cacheFile = dateBasedCache ? `${cacheDir}/${fileDateTag()} - ${objectName}.cache` : `${cacheDir}/${objectName}.cache`
    if (fs.existsSync(cacheFile)) {
        console.log(`Cache Restored: ${cacheFile}`)
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    }
    else {
        console.log(`Fetching Fresh cnMaestro: ${objectName}`)
        let values = (await getCNMapi(baseURL, apiUrl))
        values = values.sort((a:any, b:any) => stringSort(a.name, b.name))
        fs.writeFileSync(cacheFile, JSON.stringify(values), 'utf8')
        console.log(`Cache Created: ${cacheFile}`)
        return values
    }
}

export async function getCachedEipSm(sm: apiSmStatistics, cacheDir: string = "cache"): Promise<{package: string, sku: string, amount: number}> {
    // Create cache directory if it doesn't exist
    if (!fs.existsSync(cacheDir)) { fs.mkdirSync(cacheDir) }

    // Cleanup mac addresses for file name
    let objectName = sm.mac.split(":").join('')

    let cacheFile = `${cacheDir}/${fileDateTag()} - ${objectName}-eip-cache.json`

    
    if (fs.existsSync(cacheFile)) {
        let start = (new Date).getTime()
        let fromCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
        let end = (new Date).getTime()

        console.log(`Cache Restored: ${cacheFile}, Cache Benchmark: ${end-start}ms`)
        return fromCache
    }
    else {
        let eipStyleMac = sm.mac.split(":").join("-")

        // Get which user this MAC belongs to and the package based on a customReport from EngageIP utilizing the GetRenderedCustomReport api call.
        let start = (new Date).getTime()
        let result = await getEipApiToObject('GetRenderedCustomReport', { "ownerID": eipOwnerId, "reportName": eipReportName, "filters": `${eipAnswerField}=${eipStyleMac}` })
        let end = (new Date).getTime()

        if (result.Records) {
            if (result.Records.ArrayOfAnyType.length) {
                console.log(`Double EIP Package: ${sm.mac}`)
                return null
            }

            // packageResults array is an array based on Headers data object results.Headers[] 
            // In our report this equates to, ClientName, MacAddress (Answer), Package Name, Amount, Next Expiration
            // TODO: Perhaps do a cleanup to pivot and create a named object with proper headings vs using the array from memory to prevent mistakes
            let packageResults = result.Records.ArrayOfAnyType.anyType
        
            let values = { 
                package: packageResults[2]._,
                sku: packageResults[2]._,
                amount: Number(packageResults[3]._)
            } 

            fs.writeFileSync(cacheFile, JSON.stringify(values), 'utf8')
            console.log(`Cache Created: ${cacheFile}, EIP Benchmark: ${end-start}ms`)
            return values
        } else {
            console.log(`EIP Missing: ${sm.mac}`)
            return null
        }
    }
}