import { logoFile, fileStartDate, fileEndDate, brandColor1, brandColor2 } from '../config'
import { apiTower, apiStatistics, apiPerformance, apiSmStatistics } from '../cnMaestroTypes'
import { donutChart, stackedBarChart, getNonNameNonTotalKeys, gauge } from '../charting'
import { perfToTable } from '../perfToTableData'
import * as d3 from 'd3'
import { fileDateTag } from '../config'
import { genPdfTableDDContent, generateAndSavePDF, stylizedHeading } from "../pdfFunctions"
import { getReadableDataSize } from '../myFunctions'

function apTypeCounts(allApProductTypes: Map<string, string[]>) {
    let apTypeCount = {}
    for (const [key, value] of allApProductTypes) {
        // TODO: There is an issue as allApProductType isnt a array it's a string for value
        if (!apTypeCount[(value as any)]) { apTypeCount[(value as any)] = 0 }
        apTypeCount[(value as any)] += 1
    }
    let apTypeArray: {name: string, value: string}[] = Object.keys(apTypeCount).map((k, i) => { return {name: k, value: apTypeCount[k]} })
    return apTypeArray
}

// This doesn't work as it doesn't show the actual model type only that it's a pmp... maybe it's a Performance
function smTypeCounts(allSmStatistics: Map<string, apiSmStatistics[]>) {
    let smTypeCount = {}
    for (const [key, value] of allSmStatistics) {
        value.forEach(sm => {
            if (!smTypeCount[sm.type]) { smTypeCount[sm.type] = 0 }
            smTypeCount[sm.type] += 1
        })
    }
    let smTypeArray: {name: string, value: string}[] = Object.keys(smTypeCount).map((k, i) => { return {name: k, value: smTypeCount[k]} })
    return smTypeArray
}

function totalSmValue(allSmPackages) {
    // Sum up all SM Package amounts, skip the ones that are undefined as those are SM's that we couldn't find packages for.
    return Object.keys(allSmPackages)
        .reduce((agg, v) => { 
            return allSmPackages[v] === undefined ? agg : agg + allSmPackages[v].amount
        }, 0)
}

function towerValues(allSmStatistics, allSmPackages) {
    let towerPackages = []
    // [{Name: string, total: number , ...Columns...: number}

    for (const [towerName, sms] of allSmStatistics) {
        let totalSmVal = sms.reduce((agg, v: apiSmStatistics) => allSmPackages[v.mac] === undefined ? agg : agg + allSmPackages[v.mac].amount, 0)
        towerPackages.push({name: towerName, total: totalSmVal, "SM Package Value": totalSmVal})
    }
    return towerPackages
}

function packageValues(allSmPackages) {
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

function packageSubscribers(allSmPackages) {
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
function dtoApMacToNames(allApStatistics: Map<string, apiStatistics[]>) {
    // loop through each AP and check its first statistic to grab it's mac and name and build the new object for mac lookups of names
    return [...allApStatistics].reduce((result, [k, v]) => { v.forEach(ap => result[ap.mac] = ap.name); return result }, {})
}

function dtoTowerValuesToStackedChartData(data) {
    let results = [] // [{name: string, total: number , ...Columns...: number}
    Object.keys(data).forEach(dataName => {
        // Push our values for use in stachedBarChart
        results.push({ name: dataName, ...data[dataName] })
    })
    return results
}

function panelsOfTowerValues(thisTowerApSms: Map<string, apiSmStatistics[]>, allSmPackages, towerNames, stacked: boolean = true) {
    let APs = {}
    thisTowerApSms.forEach((sms: apiSmStatistics[], site: string) => {
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
                console.log(`Missing Package for SM: ${sm.mac}`)
            }
        })
    }) 

   return APs
}

function packagesOfTowerValue(thisTowerApSms: Map<string, apiSmStatistics[]>, allSmPackages, towerNames, stacked: boolean = true) {
    let packages = {}
    thisTowerApSms.forEach((sms: apiSmStatistics[], site: string) => {
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

function averageLQI(allSmStatistics, towerName: string = "") {
    let ul_lqi: number = 0
    let dl_lqi: number = 0
    let lqi_cnt: number = 0

    for (const [tower, sms] of allSmStatistics) {
        if (towerName == "" || tower == towerName) {
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

function apTotalDataUsage(allApPerformance: Map<string, apiPerformance[]>) {
    let dataUsage = {}
    for (const [AP, hours] of allApPerformance) {
        // TODO: fix for missing hours sometimes radio might be mising for the last or first hour
        let usageTotal = {download: 0, upload: 0}
        let lastTotal = {download: 0, upload: 0}
        hours.forEach(h => {
            if (h.radio) {
                if (h.radio.dl_kbits > lastTotal.download) {
                    // DL Increased since previous hour
                    usageTotal.download = usageTotal.download + (h.radio.dl_kbits - lastTotal.download) // add the difference to the total
                } else {
                    // DL Decrased so its a wrapped value
                    usageTotal.download = usageTotal.download + h.radio.dl_kbits
                }
                lastTotal.download = h.radio.dl_kbits

                if (h.radio.ul_kbits > lastTotal.upload) {
                    // UL Increased since previous hour
                    usageTotal.upload = usageTotal.upload + (h.radio.ul_kbits - lastTotal.upload) // add the difference to the total
                } else {
                    // UL Decrased so its a wrapped value
                    usageTotal.upload = usageTotal.upload + h.radio.ul_kbits
                }
                lastTotal.upload = h.radio.ul_kbits
            }
        })
        usageTotal.download = usageTotal.download * 1024 //we use bits throughout the app not kbit so convert to bits
        usageTotal.upload = usageTotal.upload * 1024 //we use bits throughout the app not kbit so convert to bits

        dataUsage[AP] = usageTotal // Save tower to output
    }

    return dataUsage
}

export async function createHighLevelReport(allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>, allApStatistics: Map<string, apiStatistics[]>, towers: apiTower[], allSmStatistics: Map<string, apiSmStatistics[]>, allSmPackages: {}) {
    //let standardApPerfTable = perfToTable(allApPerformance, allApStatistics, allApProductTypes)
    let towerNames = dtoApMacToNames(allApStatistics)
    let avgLQI = averageLQI(allSmStatistics)
    let tVals = towerValues(allSmStatistics, allSmPackages)
    let pVals = packageValues(allSmPackages)
    let subVals = packageSubscribers(allSmPackages)
    let dataUsage = apTotalDataUsage(allApPerformance)

    let formatDollar = d3.format("$,")

    let networkDlUsage = Object.keys(dataUsage).reduce((agg, apName) => agg + dataUsage[apName].download, 0)
    let networkUlUsage = Object.keys(dataUsage).reduce((agg, apName) => agg + dataUsage[apName].upload, 0)

    let docDefinition: any = {
    	content: [
            { image: logoFile, alignment: 'center', margin: [0,200,0,50] },
            { text: stylizedHeading('cnMaestro Financial', 40), alignment: 'center' },
            { text: `${fileStartDate} - ${fileEndDate}`, style: "frontDate", alignment: 'center'},
            
            //{ svg: donutChart(apTypeCounts(allApProductTypes), 180, false), width: 'auto'},

            // Network Overview
            { columns: [
                { text: stylizedHeading('Network Overview', 24), alignment: 'left' }, 
                { text: fileStartDate, style: 'pageDate', color: brandColor1, alignment: 'right' }], pageBreak: 'before', margin: [0,0,0,15] },
            { columns: [ 
                { stack: [ { text: 'Total SM Revenue', style: 'header', alignment: 'center' }, 
                           { text: 'Online SM Revenue this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
                           { text: `${formatDollar(totalSmValue(allSmPackages))}/month`, style: 'subheader', alignment: 'center' },
                           { text: ' ' },
                           { text: 'Total Download', style: 'header', alignment: 'center'},
                           { text: 'DL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
                           { text: `${getReadableDataSize(networkDlUsage, 2)}`, style: 'subheader', alignment: 'center'}
                        ], width: "auto" },
                { stack: [ { text: 'Total Subscribers', style: 'header', alignment: 'center' }, 
                
                           { text: 'Online SMs this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
                           { text: Object.keys(allSmPackages).length, style: 'subheader', alignment: 'center' }, 
                           { text: ' ' },
                           { text: 'Total Upload', style: 'header', alignment: 'center'},
                           { text: 'UL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
                           { text: `${getReadableDataSize(networkUlUsage, 2)}`, style: 'subheader', alignment: 'center'}
                        ], width: "*" },

                { stack: [ { text: 'Network Subscriber Health', style: 'header', alignment: 'center' },
                           { text: 'Networkwide Average SM Link Quality Index', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
                           { columns: [{ svg: gauge(avgLQI.downlink, 80, "Downlink LQI", 100), alignment: 'center' }, { svg: gauge(avgLQI.uplink, 80, "Uplink LQI", 100), alignment: 'center' }] }
                        ], width: 'auto'
            } ]},
            { text: 'PMP monthly revenue by Tower', alignment: 'center', style: "header", margin: [0,15,0,0]},
            { text: 'Revenue by tower based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
            { svg: stackedBarChart(tVals, 600, tVals.length * 12 + 15, true, 100, "total", true, false, false)},
            
            // Package overview page
            { columns: [
                { text: stylizedHeading('Package Overview', 24), alignment: 'left' }, 
                { text: fileStartDate, style: 'pageDate', color: brandColor1, alignment: 'right' }], pageBreak: 'before', margin: [0,0,0,15] },

            { text: 'PMP monthly revenue by Package', alignment: 'center', style: "header", margin: [0,15,0,0] },
            { text: 'Revenue by package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
            { svg: stackedBarChart(pVals, 600, pVals.length * 12 + 15, true, 180, "total", true, false, false) },

            { text: 'PMP subscribers per Package', alignment: 'center', style: "header", margin: [0,15,0,0] },
            { text: 'Subscribers per package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
            { svg: stackedBarChart(subVals, 600, subVals.length * 12 + 15, false, 180, "total", true, false, false) },
        ], 
        defaultStyle: {
            font: 'DaxOT'
        }
    }   

    // Each tower dashboard
    towers.forEach(tower => {
        console.log(`Generating Tower Page: ${tower.name}`)
        let thisTowerApSms: Map<string, apiSmStatistics[]> = new Map([...allSmStatistics].filter(([k, v]) => v.length > 0 && v[0].tower == tower.name)) // Only this towers SMs
        let thisTowerApPerformance = new Map([...allApPerformance].filter(([k, v]) => v[0].tower == tower.name))
        let thisTowerApPerfTable = genPdfTableDDContent(perfToTable(thisTowerApPerformance, allApStatistics, allApProductTypes))
        let thisTowerAps: string[] = Array.from(thisTowerApPerformance.keys())

        let panelRevenue = dtoTowerValuesToStackedChartData(panelsOfTowerValues(thisTowerApSms, allSmPackages, towerNames, false))
        let panelRevenueKeyCount = getNonNameNonTotalKeys(panelRevenue).length
        let panelRevenueChartHeightCount: number = (panelRevenue.length > panelRevenueKeyCount ) ? panelRevenue.length : panelRevenueKeyCount

        let packageRevenue = dtoTowerValuesToStackedChartData(packagesOfTowerValue(thisTowerApSms, allSmPackages, towerNames, false))
        let packageRevenueKeyCount = getNonNameNonTotalKeys(packageRevenue).length  
        let packageRevenueChartHeightCount: number = (packageRevenue.length > packageRevenueKeyCount ) ? packageRevenue.length : packageRevenueKeyCount
        
        let towerLQI = averageLQI(allSmStatistics, tower.name)

        let towerRevenue = tVals.filter(v => v.name === tower.name)[0].total
        let towerSMs = thisTowerApSms.size === 0 ? 0 : thisTowerApSms.get(tower.name).length
        let towerSectorsDlUsage = thisTowerAps.reduce((agg, apName) => agg + dataUsage[apName].download, 0)
        let towerSectorsUlUsage = thisTowerAps.reduce((agg, apName) => agg + dataUsage[apName].upload, 0)

        docDefinition.content.push(
            { columns: [
                { text: stylizedHeading(tower.name, 24), alignment: 'left' },
                { text: fileStartDate, style: 'pageDate', color: brandColor1, alignment: 'right' }
            ], pageBreak: 'before', margin: [0,0,0,30] },

            { columns: [ 
                { stack:[   { text: 'Tower Revenue', style: 'header', alignment: 'center'}, 
                            { text: 'Online SM Revenue this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
                            { text: `${formatDollar(towerRevenue)}/month`, style: 'subheader', alignment: 'center' }, 
                            { text: ' ' },
                            { text: 'Total Download', style: 'header', alignment: 'center'},
                            { text: 'DL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
                            { text: `${getReadableDataSize(towerSectorsDlUsage, 2)}`, style: 'subheader', alignment: 'center'}
                        ], width: 'auto' },     
                { stack:[   { text: 'Tower SMs', style: 'header', alignment: 'center'}, 
                            { text: 'Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
                            { text: towerSMs, style: 'subheader', alignment: 'center' },
                            { text: ' ' },
                            { text: 'Total Upload', style: 'header', alignment: 'center'},
                            { text: 'UL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
                            { text: `${getReadableDataSize(towerSectorsUlUsage, 2)}`, style: 'subheader', alignment: 'center'}
                        ], width: '*' }, 

                { stack:[   { text: `Subscriber Health`, style: 'header', alignment: 'center' }, 
                            { text: 'Average SM Link Quality Index this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
                            { columns: [{ svg: gauge(towerLQI.downlink, 80, "Downlink LQI", 100, 'red', 'green'), alignment: 'center' }, { svg: gauge(towerLQI.uplink, 80, "Uplink LQI", 100), alignment: 'center' }] }
                        ], width: 'auto' } 
            ] },
            { text: 'Package Monthly Revenue', alignment: 'center', style: "header", margin: [0,15,0,0]},
            { text: 'Revenue by package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
            { svg: stackedBarChart(packageRevenue, 590, packageRevenueChartHeightCount * 12 + 15, true, 120, "total", true, false, false) },
            
            { text: 'Panel Monthly Revenue', alignment: 'center', style: "header", margin: [0,15,0,0]},
            { text: 'Revenue by panel based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
            { svg: stackedBarChart(panelRevenue, 590, panelRevenueChartHeightCount * 12 + 15, true, 70, "name", true, false, false) },

            { text: 'Panel Statistics', alignment: 'center', style: "header", margin: [0,15,0,0]},
            { text: 'General statistics for site panels during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5]},
            thisTowerApPerfTable
        )
    })

    return await generateAndSavePDF(docDefinition, `${fileDateTag} - cnMaestro High Level Report.pdf`)
}

