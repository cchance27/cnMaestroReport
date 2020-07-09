import { eipUsername, eipPassword, eipWsdlUrl, debug, debugAmount } from './config'
import { apiSmStatistics } from './cnMaestroTypes'
import { getCachedEipSm } from './caching'
import fetch from 'node-fetch'
import { EncodeXMLEscapeChars, eipSMPackageType } from './myFunctions'
const xml2js = require('xml2js')

export class eipPackage {
    package: string
    sku: string
    amount: number
}


export async function getAllSmEipPackages(allSmStatistics: Map<string, apiSmStatistics[]>): Promise<eipSMPackageType> {
    let allSmPackageDetails = {}
    // MAC: {package: string, sku: string, amount: number}
    
    let AllDoubles: Array<string> = []
    let AllMissing: Array<string> = []

    let towerCount = 0
    // Loop through all SMs
    for(let tower of allSmStatistics) {
        console.log(`Getting EIP details for Clients on ${tower[0]} [${towerCount+1}/${allSmStatistics.size}]`)

        let smCount = 0
        for(let sm of tower[1]){
            console.log(`Getting EIP Client MAC: ${sm.mac} [${smCount+1}/${tower[1].length}]`)
            let [status, result] = await getCachedEipSm(sm)
            allSmPackageDetails[sm.mac] = result

            if (status === "Double") { AllDoubles.push(sm.mac) }
            if (status === "Missing") { AllMissing.push(sm.mac) }
            smCount++
        }

        if (debug && towerCount == debugAmount) { break; } // Break if we got debugAmount of Towers
        towerCount++
    }

    return { packages: allSmPackageDetails, double: AllDoubles, missing: AllMissing }

}

export async function getEipApiToObject(method: string, args: {}) {
    let AuthHeader = `<AuthHeader xmlns="Logisense_EngageIP"><Username>${eipUsername}</Username><Password>${eipPassword}</Password></AuthHeader>`
    let argString = Object.keys(args).map(argName => `<${argName}>${EncodeXMLEscapeChars(args[argName])}</${argName}>`).join("")

    let soapResponse = await fetch(eipWsdlUrl, {
        method: 'POST',
        headers: {
          'SOAPAction': `Logisense_EngageIP/${method}`,
          'Content-Type': 'text/xml; charset=utf-8'
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
                <soap:Header>
                    ${AuthHeader}
                </soap:Header>
                <soap:Body>
                    <${method} xmlns="Logisense_EngageIP">
                        ${argString}
                    </${method}>
                </soap:Body>
            </soap:Envelope>`
    })

    const soapText = await soapResponse.text()
    const parser = new xml2js.Parser({explicitArray: false})
    let objectResponse = await require('util').promisify(parser.parseString.bind(parser))(soapText)

    // soap:Envelope.soap:Body[0].GetUserNameFromServiceProfileResponse[0].GetUserNameFromServiceProfileResult
    return objectResponse["soap:Envelope"]["soap:Body"][method+'Response'][method+'Result']
}