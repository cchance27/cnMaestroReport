import { getCachedCnMaestro } from "./caching"
import { apiStatistics, apiPerformance, apiTower, apiSmStatistics } from "./cnMaestroTypes"
import { debug, debugAmount } from "./config"

export async function getAllTowers(accessToken: string) {
    return getCachedCnMaestro('towers', accessToken, '/networks/default/towers')
}

export async function getAllApStatistics(towers: Array<apiTower>, accessToken: string) {
    let apStatistics: Map<string, apiStatistics[]> = new Map<string, apiStatistics[]>()

    let results = await Promise.all(
        towers.map(async tower => {
            let stats = await getCachedCnMaestro(`${tower.name}`, accessToken, `/devices/statistics?mode=ap&tower=${tower.id.split(' ').join('+')}`)
            apStatistics.set(tower.name, stats)
        })
    )
    
    return apStatistics
}


export async function getAllSmStatistics(towers: Array<apiTower>, accessToken: string) {
    let smStatistics: Map<string, apiSmStatistics[]> = new Map<string, apiSmStatistics[]>()

    let results = await Promise.all(
        towers.map(async tower => {
            let stats = await getCachedCnMaestro(`${tower.name}-subs`, accessToken, `/devices/statistics?mode=sm&tower=${tower.id.split(' ').join('+')}`)
            
            stats = stats.filter((val: apiSmStatistics) => val.status == "online") // Let's only return the online SMs
            smStatistics.set(tower.name, stats)
        })
    )
    
    return smStatistics
}

export async function getAllApPerformance(towerApStatistics: Map<string, apiStatistics[]>, accessToken: string, startTime, endTime) {
    let apPerformance: Map<string, apiPerformance[]> = new Map<string, apiPerformance[]>()

    for(let tower of towerApStatistics)  {
         await Promise.all(
            tower[1].map(async apStat => {
                let perf = await getCachedCnMaestro(`${apStat.mac}-performance`, accessToken, `/devices/${apStat.mac}/performance?start_time=${startTime}&stop_time=${endTime}`)
                apPerformance.set(apStat.name, perf)
            })
        )
        if (debug && apPerformance.keys.length == debugAmount) { break; } // Only grab debugAmount of towers
     }

     return apPerformance
}

export async function getAllApProductTypes(towerApStatistics: Map<string, apiStatistics[]>, accessToken: string) {
    let apProduct: Map<string, string[]> = new Map<string, string[]>()

    for(let tower of towerApStatistics) {
        await Promise.all(
            tower[1].map(async apStat => {
                let product = await getCachedCnMaestro(`${apStat.mac}-product`, accessToken, `/devices/${apStat.mac}?fields=product`, false) // We don't need to refresh this as the mac->productType dont change
                apProduct.set(apStat.name, product[0].product)
            })
        )      
    }

    return apProduct
}