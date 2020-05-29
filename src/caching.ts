import { baseURL, fileDateTag } from './config'
import { getCNMapi, stringSort } from './myFunctions'
import * as fs from 'fs'
import { findEsnInPackages, getEipApiToObject } from './engageipApiCalls'
import { apiSmStatistics } from './cnMaestroTypes'

export async function getCachedCnMaestro(objectName: string, accessToken: string, apiUrl: string, cacheDir: string = "cache") {
    // Create cache directory if it doesn't exist
    if (!fs.existsSync(cacheDir)) { fs.mkdirSync(cacheDir) }
    
    // Cleanup mac addresses for file name
    objectName = objectName.split(":").join('')

    let cacheFile = `${cacheDir}/${fileDateTag} - ${objectName}-cache.json`

    if (fs.existsSync(cacheFile)) {
        console.log(`Cache Restored: ${cacheFile}`)
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    }
    else {
        console.log(`Fetching Fresh cnMaestro: ${objectName}`)
        let values = (await getCNMapi(baseURL, apiUrl, accessToken))
        values = values.sort((a:any, b:any) => stringSort(a.name, b.name))
        fs.writeFileSync(cacheFile, JSON.stringify(values), 'utf8')
        console.log(`Cache Created: ${cacheFile}`)
        return values
    }
}

export async function getCachedEipSm(sm: apiSmStatistics, cacheDir: string = "cache") {
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