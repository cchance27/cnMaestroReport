import { getCachedCnMaestro } from "./caching"
import { apiStatistics, apiPerformance, apiTower, apiSmStatistics } from "./cnMaestroTypes"
import { debug, debugAmount, clientid, client_secret } from "./config"
import fetch from 'node-fetch'
import { startTime, endTime } from "./timeFunctions"
const sleep = require('sleep-promise');


export async function getAllTowers() {
    return getCachedCnMaestro('towers', '/networks/default/towers')
}

export async function getAllApStatistics(towers: Array<apiTower>) {
    let apStatistics: Map<string, apiStatistics[]> = new Map<string, apiStatistics[]>()

    await Promise.all(
        towers.map(async tower => {
            let stats = await getCachedCnMaestro(`${tower.name}`, `/devices/statistics?network=default&mode=ap&tower=${tower.id.split(' ').join('+')}`)
            apStatistics.set(tower.name, stats)
        })
    )
    
    return apStatistics
}

export async function getAllSmStatistics(towers: Array<apiTower>) {
    let smStatistics: Map<string, apiSmStatistics[]> = new Map<string, apiSmStatistics[]>()

    await Promise.all(
        towers.map(async tower => {
            let stats = await getCachedCnMaestro(`${tower.name}-subs`, `/devices/statistics?network=default&mode=sm&tower=${tower.id.split(' ').join('+')}`)
            
            stats = stats.filter((val: apiSmStatistics) => val.status == "online") // Let's only return the online SMs
            smStatistics.set(tower.name, stats)
        })
    )
    
    return smStatistics
}

export async function getAllApPerformance(towerApStatistics: Map<string, apiStatistics[]>) {
    let apPerformance: Map<string, apiPerformance[]> = new Map<string, apiPerformance[]>()
    let start = startTime()
    let end = endTime()

    for(let tower of towerApStatistics)  {
         await Promise.all(
            tower[1].map(async apStat => {
                let perf = await getCachedCnMaestro(`${apStat.mac}-performance`, `/devices/${apStat.mac}/performance?start_time=${start}&stop_time=${end}`)
                apPerformance.set(apStat.name, perf)
            })
        )
        if (debug && apPerformance.keys.length == debugAmount) { break; } // Only grab debugAmount of towers
     }

     return apPerformance
}

export async function getAllSmPerformance(smStatistics: Map<string, apiSmStatistics[]>) {
    let smPerformance: Map<string, any> = new Map<string, apiSmStatistics[]>()

    for(let tower of smStatistics)  {
         await Promise.all(
            tower[1].map(async apStat => {
                let perf = await getCachedCnMaestro(`${apStat.mac}-performance`, `/devices/${apStat.mac}/performance?start_time=${startTime()}&stop_time=${endTime()}`)
                smPerformance.set(apStat.name, perf)
            })
        )
        if (debug && smPerformance.keys.length == debugAmount) { break; } // Only grab debugAmount of towers
     }

     return smPerformance
}

export async function getAllApProductTypes(towerApStatistics: Map<string, apiStatistics[]>) {
    let apProduct: Map<string, string[]> = new Map<string, string[]>()

    for(let tower of towerApStatistics) {
        await Promise.all(
            tower[1].map(async apStat => {
                let product = await getCachedCnMaestro(`${apStat.mac}-product`, `/devices/${apStat.mac}?fields=product`, false) // We don't need to refresh this as the mac->productType dont change
                apProduct.set(apStat.name, product[0].product)
            })
        )      
    }

    return apProduct
}


let accessToken = ""

async function getApiJSON(baseURL, apiPath) {
    let firstUrl = (baseURL + apiPath)
    let response = await fetch(firstUrl, {
        method: "get",
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    })

    // Handle API Limit
    var headers = response.headers.entries();
    var remaining = 0
    var resetIn = 0
    let header = headers.next()
    while (!header.done){
      //console.log(header.value);
      if (header.value[0] == "ratelimit-remaining") {
        remaining = Number(header.value[1])
      }
      if (header.value[0] == "ratelimit-reset") {
        resetIn = Number(header.value[1]) + 1
      }
      header = headers.next();
    }

    var result = await response.json();
    
    if (remaining < 300) {
        console.log(`Running low on API Limit ${remaining}, Waiting ${resetIn}s`)
        await sleep(resetIn * 1000)
    } else {
        console.log(`Remaining API Limit: ${remaining}`)
    }

    return result
}

export const loginCNMaestro = async function (clientid: string, client_secret: string, baseURL: string) {
    console.log('Logging into cnMaestro')
    let body = `grant_type=client_credentials`
    let encodedAuth = Buffer.from(`${clientid}:${client_secret}`).toString('base64')
    require('https').globalAgent.options.rejectUnauthorized = false

    let login = await fetch(`${baseURL}/access/token`, {
        method: "post",
        headers: {
            'Authorization': `Basic ${encodedAuth}`, 'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    })
    try {
       let resp = await login.json()
       return resp.access_token
    } catch(er) {
        console.log("Error Getting CnMaestro Login:" + er)
        throw er;
    }
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export async function getCNMapi(baseURL: string, apiPath: string, getAll: boolean = true) {
    let retries = 0
    do {
        // Grab an accessToken if we don't have one yet.
        if (accessToken === "") { 
            accessToken = await loginCNMaestro(clientid, client_secret, baseURL) 
        }

        // Get JSON response from API
        let res = await getApiJSON(baseURL, apiPath)

        // If our API token expired, request a new ones
        if (res.error == "invalid_client") { 
            accessToken = await loginCNMaestro(clientid, client_secret, baseURL) // refresh accessToken
            res = await getApiJSON(baseURL, apiPath) // retry our fetch with the new accessToken
        }

        if (res.error) { throw `Authentication to cnMaestro failed! : ${res.error}`}

        let values: Array<{}> = res.data // Pull our our data results as that's what we'll be working with
        let offset = 0 // Manually using an offset as had issues with API always returning paging.offset = 0
        
        
        if (res.message == "Rate limit exceeded" && retries < 10)
        {
            let delayTime = res.headers["ratelimit-reset"] ?? 15 
            console.log(`Rate Limit Exceeded, Waiting ${delayTime}s to retry.`)
            retries++
            await delay((delayTime + 1) * 1000)
            continue
        } else if (res.message == "Rate limit exceeded") {
            // We shouldn't hit this but is an escape hatch
            throw "Rate Limit Exceeded more than 5 times"
        } else {
            // Check if we need to get more
            if (getAll && (((res.paging.limit + offset) < res.paging.total))) {
                let offsetText = "?offset="
                if (apiPath.includes("?")) { offsetText = "&offset=" }

                while (((res.paging.limit + offset) < res.paging.total)) {
                    offset+=res.paging.limit

                    // Get JSON response from API for the next page of results
                    res = await getApiJSON(baseURL, apiPath + offsetText + offset)

                    // Add our new values to the existing battles.
                    values = values.concat(res.data)
                }
            } 

            return values
        }
    } while (retries < 10)

    throw "We weren't able to get a result due to Retries"
}
