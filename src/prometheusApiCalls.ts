import fetch from 'node-fetch'
import { getCachedPromBandwidth } from './caching';
import { apiStatistics } from './cnMaestroTypes';
import { days, promUrl } from './config';
import { getReadableDataSize } from './myFunctions';

export class Bandwidth {
    DL: number
    UL: number
}

export async function getAllPromPanelBandwidths(towerStats: Map<string, apiStatistics[]>): Promise<Map<string, Bandwidth>> {
    console.log(`Fetching Bandwidth Data via Prometheus`)
    let output: Map<string, {DL: number, UL: number}> = new Map
    let missingData: string[] = []

    for(let tower of towerStats) {
        for(let ap of tower[1]) {
            let bandwidth = await getCachedPromBandwidth(ap.ip)
            if (bandwidth.DL == -1 || bandwidth.UL == -1) { 
                missingData.push(ap.ip)
            }
            output.set(ap.ip, bandwidth)
        }
    }
    console.log("Prometheus is missing data for the following APs...")
    missingData.forEach(ip => console.log(` - ${ip}`))
    return output;
}

//https://prometheus.caribserve.net/api/v1/query?query=increase(ifHCInOctets%7Binstance%3D%22172.16.10.232%22%2C%20ifIndex%3D%221%22%7D%5B608400s%5D)&time=1604351732.32&_=1604351546592
export async function getPromPanelBandwidth(ipAddress: string): Promise<Bandwidth> {
    let queryDL = encodeURIComponent(`increase(ifHCInOctets{instance="${ipAddress}", ifIndex="1"}[${days}d])`)
    let queryUL = encodeURIComponent(`increase(ifHCOutOctets{instance="${ipAddress}", ifIndex="1"}[${days}d])`)
    
    try {
        let responseDL = await fetch(`${promUrl}/api/v1/query?query=${queryDL}`, {
            method: 'GET'
        })
        let responseUL = await fetch(`${promUrl}/api/v1/query?query=${queryUL}`, {
            method: 'GET'
        })
        let DLjson = await responseDL.json();
        let ULjson = await responseUL.json();
        
        if (DLjson.data.result.length == 0 || ULjson.data.result.length == 0) {
            throw new Error("No Results Returned")
        }
        
        let result =   {
            DL: Number(DLjson.data.result[0].value[1]),
            UL: Number(ULjson.data.result[0].value[1])
        };

        console.log(`Prometheus Result (${ipAddress}): ${getReadableDataSize(result.DL)}/${getReadableDataSize(result.UL)}`)
        return result
    } catch(e) {
        console.log(`Prometheus Bandwidth Failed: ${ipAddress} (${e.message})`)
        return {
            DL: -1,
            UL: -1
        }
    }
}
