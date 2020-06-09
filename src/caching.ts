import { baseURL, fileDateTag } from './config'
import { stringSort } from './myFunctions'
import * as fs from 'fs'
import { findEsnInPackages, getEipApiToObject } from './engageipApiCalls'
import { apiSmStatistics } from './cnMaestroTypes'
import { getCNMapi } from './cnMaestroApiCalls'
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

    let cacheFile = dateBasedCache ? `${cacheDir}/${fileDateTag} - ${objectName}.cache` : `${cacheDir}/${objectName}.cache`
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

    let cacheFile = `${cacheDir}/${fileDateTag} - ${objectName}-eip-cache.json`

    if (fs.existsSync(cacheFile)) {
        console.log(`Cache Restored: ${cacheFile}`)
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    }
    else {
        let eipStyleMac = sm.mac.split(":").join("-")
        console.log(`Fetching Fresh EIP: ${objectName}`)

        // Get which user this MAC belongs to.
        let result = await getEipApiToObject('GetUserNameFromServiceProfile', {"profileName": "User Name", "profilevalue": eipStyleMac})
        if (result) {
            // Grabs all the client+package+service info since theirs no way to get specific package for an profileAnswer via API
            result = await getEipApiToObject('GetUserPackageServiceAttributeProfileQuestionList', {"username": result[0].Name[0]})

            let result0 = result[0].ViewUserPackageServiceProfile[0].UserPackages[0].ViewUserPackageWithServices
            let thePackage = findEsnInPackages(result0, eipStyleMac)
            let values = {
                package: thePackage.Package[0],
                sku: thePackage.SKU[0],
                amount: Number(thePackage.Amount[0])
            } 

            fs.writeFileSync(cacheFile, JSON.stringify(values), 'utf8')
            console.log(`Cache Created: ${cacheFile}`)
            return values
        } else {
            console.log(`EIP Missing: ${sm.mac}`)
        }
    }
}