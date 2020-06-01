import { eipUsername, eipPassword, eipWsdlUrl, debug, debugAmount } from './config'
import { apiSmStatistics } from './cnMaestroTypes'
import { getCachedEipSm } from './caching'
import fetch from 'node-fetch'
import { EncodeXMLEscapeChars } from './myFunctions'
const xml2js = require('xml2js')

export class eipPackage {
    package: string
    sku: string
    amount: number
}

export function findEsnInPackages(ViewUserPackageWithServices: any, ESN: string) {
    // Loop through the very ugly ViewUserPackageWithServices data from the EIP api, 
    // unfortunately theirs no way to get package info from just an ESN directly,
    // so we have to walk the info, to find which package has the profile answer 
    // we're looking for.

    ESN = ESN.toLowerCase()
    let thePackage = ViewUserPackageWithServices.filter(pack => {
        if (pack.UserServiceWithProperties[0] == "") {return false}
        let found = pack.UserServiceWithProperties[0].ViewUserServiceWithProperties.filter(props => {
            if (props.UserProperties == null || props.UserProperties[0] == "") return false // No properties
            let found = props.UserProperties[0].ViewUserProperties.filter(qa => {
                return qa.ProfileAnswer[0].trim().toLowerCase() == ESN
            })
            return found.length > 0
        })
        return found.length > 0
    })
    return thePackage[0]
}

export async function getAllSmEipPackages(allSmStatistics: Map<string, apiSmStatistics[]>): Promise<{package: string, sku: string, amount: number}> {
    let allSmPackageDetails = {}

    let towerCount = 0
    // Loop through all SMs
    for(let tower of allSmStatistics) {
        console.log(`Getting EIP details for Clients on ${tower[0]} [${towerCount+1}/${allSmStatistics.size}]`)

        let smCount = 0
        for(let sm of tower[1]){
            console.log(`Getting EIP Client MAC: ${sm.mac} [${smCount+1}/${tower[1].length}]`)
            allSmPackageDetails[sm.mac] = await getCachedEipSm(sm)
            smCount++
        }

        if (debug && towerCount == debugAmount) { break; } // Break if we got debugAmount of Towers
        towerCount++
    }

    return (allSmPackageDetails as ({package: string, sku: string, amount: number}))

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
    const parser = new xml2js.Parser()
    let objectResponse = await require('util').promisify(parser.parseString.bind(parser))(soapText)

    // soap:Envelope.soap:Body[0].GetUserNameFromServiceProfileResponse[0].GetUserNameFromServiceProfileResult
    return objectResponse["soap:Envelope"]["soap:Body"][0][method+'Response'][0][method+'Result']
}