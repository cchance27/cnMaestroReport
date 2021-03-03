import { pdfFonts, pdfStyles, company, brandColor1, brandColor2 } from "./config";
import * as fs from 'fs'
import { apiStatistics, apiSmStatistics } from "./cnMaestroTypes";
import { Bandwidth } from "./prometheusApiCalls";
const pdfMake = require('pdfmake')

interface table {
    style: string
    table: tableLayout
    layout: string
}

interface tableLayout {
    headerRows: number
    body: any // [[value,value,value]]
}

export function genPdfTableDDContent(data: {}[], highlightFieldName: string = ""): table {
    let headers: {}[] = []
    let widths: any = []

    if (data.length == 0) { return null }

    let headTop = [{}, {}, {}, {},
        {text: 'Download', colSpan: 5, alignment: 'center', fillColor: '#c0d6e4'}, {}, {}, {}, {}, 
        {text: 'Upload', colSpan: 5, alignment: 'center'}, {}, {}, {}, {}]

    Object.keys(data[0]).forEach((k, i) => {
        headers.push(
            { 
                text: k.replace("Download ", "").replace("Upload ", ""), 
                style: 'tableHeader', 
                alignment: (i == 0 ? 'left' : 'center'), 
                fillColor: ((i >= 4 && i < 9) ? '#c0d6e4' : (i >= 9) ? "#dce7ef" :'white')
            })

            if (i == 4 || i == 9) { // Column 4 and 9 are the throughput column
                widths.push(40)
            } else if (i == 6 || i == 11) {
                widths.push(25)
            } else {
                widths.push('auto')
            }
    })
    
    let result = {
        style: 'table',
        width: 560,
        table: {
            widths: widths,
            headerRows: 2,
            body: [headTop, headers]
        }, 
        layout: 'lightHorizontalLines'
    }

    data.forEach(row => result.table.body.push(Object.keys(row).map((k, i) => {
        let fillColor = ((i >= 4 && i < 9) ? '#c0d6e4' : 'white')
        fillColor = highlightFieldName == k ? "yellow" : fillColor

        return ({ 
            text: row[k].formatted, 
            style: "tableCell", 
            alignment: (i == 0 ? 'left' : 'center'), 
            fillColor: fillColor ,
            color: row[k].alerted ? 'red' : 'black'
        }) // alight first item left rest center
    })))
    return result
}

export function stylizedHeading(section: string, size: number) {
    return [
            { text: company, font: 'DaxOTMedium', fontSize: size, color: brandColor1}, 
            { text: ' | ', font: 'DaxOTLight', fontSize: size, color: brandColor1 }, 
            { text: section, font: 'DaxOTLight', fontSize: size, color: brandColor2} 
    ]
}

export async function generateAndSavePDF(docDefinition: any, filename: string){
    // Setup Fonts
    let printer = new pdfMake(pdfFonts)

    // Setup styles and margins
    docDefinition['styles'] = pdfStyles
    docDefinition['pageMargins'] = [ 20, 20, 20, 20 ]

    // Create document
    let pdfDoc = printer.createPdfKitDocument(docDefinition)

    // Save to file
    await pdfDoc.pipe(fs.createWriteStream(filename))
    pdfDoc.end()  

    // Return filename if successful
    return filename
}

export function totalSmValue(allSmPackages) {
    // Sum up all SM Package amounts, skip the ones that are undefined as those are SM's that we couldn't find packages for.
    return Object.keys(allSmPackages)
        .reduce((agg, v) => { 
            return !allSmPackages[v] ? agg : agg + allSmPackages[v].amount
        }, 0)
}

export function towerValues(allSmStatistics: Map<string, apiSmStatistics[]>, allSmPackages) {
    // Each tower's value of connected SMs during this period total'd
    let towerPackages = []
    // [{Name: string, total: number , ...Columns...: number}

    for (const [towerName, sms] of allSmStatistics) {
        let totalSmVal = sms.reduce((agg, v: apiSmStatistics) => !allSmPackages[v.mac] ? agg : agg + allSmPackages[v.mac].amount, 0)
        towerPackages.push({name: towerName, total: totalSmVal, "SM Package Value": totalSmVal})
    }
    return towerPackages
}

export function towerArpuValues(allSmStatistics: Map<string, apiSmStatistics[]>, allSmPackages) {
    // Each towers ARPU based on connected SMs package value total divided by how many connected SMs
    let towerARPU = []
    // [{Name: string, total: number , ...Columns...: number}

    for (const [towerName, sms] of allSmStatistics) {
        let totalSmVal = sms.reduce((agg, v: apiSmStatistics) => !allSmPackages[v.mac] ? agg : agg + allSmPackages[v.mac].amount, 0)
        if (towerName == "Fire Department") {
            let t = sms.length;
            t=t;
        }
        towerARPU.push({name: towerName, total: (totalSmVal / sms.length), "SM ARPU": (totalSmVal / sms.length)})
    }
    return towerARPU
}

export function towerSmCount(allSmStatistics: Map<string, apiSmStatistics[]>) {
    // How many SMs per Tower

    let towerSMs = []
    // [{Name: string, total: number , ...Columns...: number}

    for (const [towerName, sms] of allSmStatistics) {
        towerSMs.push({name: towerName, total: sms.length, "SMs": sms.length})
    }
    return towerSMs
}

export function packageValues(allSmPackages) {
    let packages = {}
    // [{Name: string, total: number , ...Columns...: number}

    Object.keys(allSmPackages).forEach(esn => {
        let pack = allSmPackages[esn]
        if (pack) {
            packages[pack.sku] = packages[pack.sku] === undefined ? pack.amount : packages[pack.sku] + pack.amount
        }
    })

    return Object.keys(packages).map(packName => ({name: packName, total: packages[packName], "Package Total Revenue": packages[packName]}))
}

export function packageSubscribers(allSmPackages) {
    let packages = {}
    // [{Name: string, total: number , ...Columns...: number}

    Object.keys(allSmPackages).forEach(esn => {
        let pack = allSmPackages[esn]
        if (pack) {
            packages[pack.sku] = packages[pack.sku] === undefined ? 1 : packages[pack.sku] + 1
        }
    })

    return Object.keys(packages).map(packName => ({name: packName, total: packages[packName], "Package Subscribers": packages[packName]}))
}

// MAC -> NAME object creation from apStatistics
export function dtoApMacToNames(allApStatistics: Map<string, apiStatistics[]>) {
    // loop through each AP and check its first statistic to grab it's mac and name and build the new object for mac lookups of names
    return [...allApStatistics].reduce((result, [_, v]) => { v.forEach(ap => result[ap.mac] = ap.name); return result }, {})
}

export function dtoTowerValuesToStackedChartData(data) {
    let results = [] // [{name: string, total: number , ...Columns...: number}
    Object.keys(data).forEach(dataName => {
        // Push our values for use in stachedBarChart
        results.push({ name: dataName, ...data[dataName] })
    })
    return results
}

export function busResCountAndValues(towerSms, allSmPackages) {
    let resCount = 0, resValue = 0
    let busCount = 0, busValue = 0
    let total = 0, found = 0
    if (towerSms) {
        total = towerSms.length
        towerSms.forEach(sm => {
            if (allSmPackages[sm.mac]) {
                found += 1
                if (allSmPackages[sm.mac].isBusiness) {
                    busCount += 1
                    busValue += allSmPackages[sm.mac].amount
                } else {
                    resCount += 1
                    resValue += allSmPackages[sm.mac].amount
                }
            }
        })
    }
    let busResCounts = [{ name: 'Business', total: busCount, SMs: busCount }, { name: 'Residential', total: resCount, SMs: resCount }]
    let busResValues = [{ name: 'Business', total: busValue, Value: busValue }, { name: 'Residential', total: resValue, Value: resValue }]
    if (found < total) {
        busResCounts.push({ name: 'Unknown', total: total-found, SMs: total-found })
    }
    return [busResCounts, busResValues]
}

export function panelsOfTowerValues(thisTowerApSms: Map<string, apiSmStatistics[]>, allSmPackages, towerNames, stacked: boolean = true) {
    let APs = {}
    thisTowerApSms.forEach((sms: apiSmStatistics[], _) => {
        sms.forEach(sm => {
            let apName = towerNames[sm.ap_mac]
            let smPackage = allSmPackages[sm.mac]

            if (APs[apName] === undefined) { APs[apName] = {} } // AP Output object missing, create it
            
            if (smPackage) { // We got this SMs package from EIP
                APs[apName].total === undefined ? APs[apName].total = smPackage.amount : APs[apName].total = APs[apName].total + smPackage.amount

                // If it is new set it to this amount, otherwise add this package to the existing total
                if (stacked) {
                    APs[apName][smPackage.sku] = (APs[apName][smPackage.sku] === undefined) ? smPackage.amount : APs[apName][smPackage.sku] + smPackage.amount
                } else {
                    APs[apName].Value = APs[apName].total
                }
                    // Keep track of total revenue for this panel
            } else {
                // Edge Case: Customers on this AP didn't have SMs found so we need at least to fill out the total/value
                if (APs[apName].total === undefined) {
                    APs[apName].total = 0
                    APs[apName].Value = 0
                }
                console.log(`Missing Package for SM: ${sm.mac}`)
            }
        })
    }) 

   return APs
}

export function packagesOfTowerValue(thisTowerApSms: Map<string, apiSmStatistics[]>, allSmPackages, towerNames, stacked: boolean = true) {
    let packages = {}
    thisTowerApSms.forEach((sms: apiSmStatistics[], _) => {
        sms.forEach(sm => {
            let apName = towerNames[sm.ap_mac]
            let smPackage = allSmPackages[sm.mac]

            if (smPackage) { // We got this SMs package from EIP
                // Initalize the package we have if it doesn't exist.
                if (packages[smPackage.sku] === undefined) { packages[smPackage.sku] = {} } // AP Output object missing, create it

                // Keep track of total revenue for this panel
                packages[smPackage.sku].total === undefined ? packages[smPackage.sku].total = smPackage.amount : packages[smPackage.sku].total = packages[smPackage.sku].total + smPackage.amount

                if (stacked) {
                    // If it is new set it to this amount, otherwise add this package to the existing total
                    packages[smPackage.sku][apName] = (packages[smPackage.sku][apName] === undefined) ? smPackage.amount : packages[smPackage.sku][apName] + smPackage.amount
                } else {
                    packages[smPackage.sku].Value = packages[smPackage.sku].total
                }
            } else {
                console.log(`Missing Package for SM: ${sm.mac}`)
            }
        })
    }) 

   return packages
}

export function averageLQI(allSmStatistics: Map<string, apiSmStatistics[]>, towerName: string = "") {
    let ul_lqi: number = 0
    let dl_lqi: number = 0
    let lqi_cnt: number = 0

    for (const [tower, sms] of allSmStatistics) {
        if (towerName === "" || tower === towerName) {
            sms.forEach(sm => {
                ul_lqi += sm.radio.ul_lqi
                dl_lqi += sm.radio.dl_lqi
                lqi_cnt += 1
            })
        }
    }

    ul_lqi = ul_lqi / lqi_cnt
    dl_lqi = dl_lqi / lqi_cnt
    
    return {downlink: dl_lqi, uplink: ul_lqi}
}

// Total our prometheus data, without tower gives total for entire network, with tower + allApStatistics provided gives a specific towers usage
// We need to provide allAPstatistics so we can find which AP IP addresses are in the specitic tower/ap
export function apPrometheusDataTotal(apBandwidths: Map<string, Bandwidth>, towerName: string = "", allApStatistics: Map<string, apiStatistics[]> = new Map()): Bandwidth {
    let totalDlUsage: number = 0
    let totalUlUsage: number = 0

    if (towerName != "") {
        let thisTowerAps = []
        for(let [_, aps] of allApStatistics.entries()) {
            aps.forEach(ap => 
                {
                   if(ap.tower == towerName) { thisTowerAps.push(ap.ip) }
                }
            )
        }
        totalDlUsage = thisTowerAps.reduce((agg, apIP) => agg + apBandwidths.get(apIP).DL, 0)
        totalUlUsage = thisTowerAps.reduce((agg, apIP) => agg + apBandwidths.get(apIP).UL, 0)
        
    } else {
        for(let [_, thisBw] of apBandwidths.entries()) {
           totalDlUsage += thisBw.DL
           totalUlUsage += thisBw.UL
        }
    }
    return {DL: totalDlUsage, UL: totalUlUsage}
}
// Check how many subscribers are on panels that are 5ghz vs 3ghz
export function smCountByFrequency(allApStatistics: Map<string, apiStatistics[]>) {
    let r5ghz = 0, r3ghz = 0;
    allApStatistics.forEach((v, _) => v.forEach(sector => {
    if (sector.connected_sms > 0 && sector.radio.frequency > 0) { 
       if (sector.radio.frequency > 4000) {r5ghz+=sector.connected_sms} else {r3ghz+=sector.connected_sms}
    }
    }));

    return [{ name: "3 Ghz", value: r3ghz}, {name: "5 Ghz", value: r5ghz}]
}

// Check how many subscribers are on panels that are 5ghz vs 3ghz
export function apCountByFrequency(allApStatistics: Map<string, apiStatistics[]>) {
    let r5ghz = 0, r3ghz = 0;
    allApStatistics.forEach((v, _) => v.forEach(sector => {
    if (sector.connected_sms > 0 && sector.radio.frequency > 0) { 
       if (sector.radio.frequency > 4000) {r5ghz++} else {r3ghz++}
    }
    }));

    return [{ name: "3 Ghz", value: r3ghz}, {name: "5 Ghz", value: r5ghz}]
}