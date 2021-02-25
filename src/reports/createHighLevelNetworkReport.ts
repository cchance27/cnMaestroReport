import { logoFile, brandColor1 } from '../config'
import { apiSmStatistics, apiStatistics } from '../cnMaestroTypes'
import { stackedBarChart, gauge, donutChart } from '../charting'
import { generateAndSavePDF, stylizedHeading, averageLQI, towerValues, packageValues, packageSubscribers, totalSmValue, smCountByFrequency, apCountByFrequency, towerSmCount, towerArpuValues } from "../pdfFunctions"
import { eipPackage, getReadableDataSize } from '../myFunctions'
import * as d3 from 'd3'
import * as fs from 'fs'
import { fileStartDate, fileDateTag, formattedStartDateTime, formattedEndDateTime } from '../timeFunctions'
import { Bandwidth } from '../prometheusApiCalls'

function ownerCountsAndValues(allSmPackages: {[esn: string]: eipPackage}) {
    let ownersCount: {[owner:string]: number} = {}
    let ownersValue: {[owner:string]: number} = {}
    Object.values(allSmPackages).forEach((pkg: eipPackage) => {
        if (ownersCount[pkg.owner]) {
            ownersCount[pkg.owner] += 1
            ownersValue[pkg.owner] += pkg.amount
        } else {
            ownersCount[pkg.owner] = 1
            ownersValue[pkg.owner] = pkg.amount
        }
    })

    return [ownersCount, ownersValue]
} 

function smBusResCountsAndValues (allSmPackages: {[esn: string]: eipPackage}) {
    let busResCount: {[type:string]: number} = {"Business": 0, "Residential": 0}
    let busResValue: {[type:string]: number} = {"Business": 0, "Residential": 0}
    Object.values(allSmPackages).forEach((pkg: eipPackage) => {
        if (pkg.isBusiness) {
            busResCount["Business"] += 1
            busResValue["Business"] += Number(pkg.amount)
        } else {
            busResCount["Residential"] += 1
            busResValue["Residential"] += Number(pkg.amount)
        }
    })
    return [busResCount, busResValue]
}

function ownerPageGenerator(ownerName: string, allSmPackages: {[esn: string]: eipPackage}, allSmStatistics: Map<string, apiSmStatistics[]>) {
    let formatDollar = d3.format("$,")
    let ownerSmPackages: {[esn: string]: eipPackage} = {}
    Object.keys(allSmPackages).filter(esn => allSmPackages[esn].owner === ownerName).forEach(esn => ownerSmPackages[esn] = allSmPackages[esn])
    let ownerSmStatistics: Map<string, apiSmStatistics[]> = new Map<string, apiSmStatistics[]>()
    allSmStatistics.forEach((v, k) => ownerSmStatistics.set(k, v.filter(stat => ownerSmPackages[stat.mac])))
    let pVals = packageValues(ownerSmPackages)
    let subVals = packageSubscribers(ownerSmPackages)
    let [busResCount, busResValue] = smBusResCountsAndValues(ownerSmPackages)

    let ownerLQI = averageLQI(ownerSmStatistics)
    let ownerPage = [
    {
        columns: [
            { text: stylizedHeading(`${ownerName} Overview`, 24), alignment: 'left', width: '*' },
            { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right', width: 150 }
        ], pageBreak: 'before', margin: [0, 0, 0, 15]
    },
    {
        columns: [
            {
                stack: [{ text: `Revenue`, style: 'header', alignment: 'center' },
                { text: 'This Owners Online SM Revenue', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                { text: `${formatDollar(totalSmValue(ownerSmPackages))}/month`, style: 'subheader', alignment: 'center' },
                { text: " " },
                { text: 'ARPU', style: 'header', alignment: 'center' },
                { text: 'This Owners ARPU, this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                { text: d3.format("($,.0f")((totalSmValue(ownerSmPackages) / Object.keys(ownerSmPackages).length)), style: 'subheader', alignment: 'center' },
                ], width: "auto"
            },
            {
                stack: [{ text: `Subscribers`, style: 'header', alignment: 'center' },
                { text: 'This owners Online SMs', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                { text: Object.keys(ownerSmPackages).length, style: 'subheader', alignment: 'center' },
                ], width: "*"
            },
            {
                stack: [{ text: `${ownerName} Subscriber Health`, style: 'header', alignment: 'center' },
                { text: 'This Owners Average SM Link Quality Index', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                { columns: [{ svg: gauge(ownerLQI.downlink, 80, "Downlink LQI", 100), alignment: 'center' }, { svg: gauge(ownerLQI.uplink, 80, "Uplink LQI", 100), alignment: 'center' }] }
                ], width: 'auto'
            }
        ]
    }, 
    {
        columns: [
            { 
                stack: [{ text: 'SMs by Account Type', style: 'header', alignment: 'center' },
                        { text: 'Based on this owners SMs', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                        { svg: donutChart(Object.keys(busResCount).map(o => { return { name: o, value: busResCount[o] }}), 160, false, true), alignment: 'center' }]
            },
            { 
                stack: [{ text: 'Value by Account Type', style: 'header', alignment: 'center' },
                        { text: 'Based on this owners SMs', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] }, 
                        { svg: donutChart(Object.keys(busResValue).map(o => { return { name: o, value: busResValue[o] }}), 160, true, true), alignment: 'center' }]
            }
        ], margin: [0, 15, 0, 0]
    },
    { text: 'PMP monthly revenue by Package', alignment: 'center', style: "header", margin: [0, 15, 0, 0] },
    { text: 'Revenue by package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
    { svg: stackedBarChart(pVals, 580, pVals.length * 12 + 15, true, 230, "total", true, false, false) },
    { text: 'PMP subscribers per Package', alignment: 'center', style: "header", margin: [0, 15, 0, 0] },
    { text: 'Subscribers per package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
    { svg: stackedBarChart(subVals, 580, subVals.length * 12 + 15, false, 230, "total", true, false, false) },
]

    return ownerPage
}

export async function createHighLevelNetworkReport(allSmStatistics: Map<string, apiSmStatistics[]>, allSmPackages: {[esn: string]: eipPackage}, allApStatistics: Map<string, apiStatistics[]>, panelBWs: Map<string, Bandwidth>, reportDir: string = "reports") {
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir)
    }

    let avgLQI = averageLQI(allSmStatistics)
    let tVals = towerValues(allSmStatistics, allSmPackages)
    let tSMVals = towerSmCount(allSmStatistics)
    let tARPUVals = towerArpuValues(allSmStatistics, allSmPackages)
    let pVals = packageValues(allSmPackages)
    let subVals = packageSubscribers(allSmPackages)
    let formatDollar = d3.format("$,")

    let networkDlUsage: number = 0;
    let networkUlUsage: number = 0;

    for(let [_, bw] of panelBWs.entries()) {
        networkDlUsage += bw.DL
        networkUlUsage += bw.UL
    }

    let [ownersCount, ownersValue] = ownerCountsAndValues(allSmPackages)
    let [busResCount, busResValue] = smBusResCountsAndValues(allSmPackages)

    let ownersPages = Object.keys(ownersCount).map(owner => ownerPageGenerator(owner, allSmPackages, allSmStatistics))

    let docDefinition: any = {
        content: [
            { image: logoFile, alignment: 'center', margin: [0, 200, 0, 50] },
            { text: stylizedHeading('cnMaestro Network Overview', 32), alignment: 'center' },
            { text: `${formattedStartDateTime()} - ${formattedEndDateTime()}`, style: "frontDate", alignment: 'center' },
            // Network Overview
            {
                columns: [
                    { text: stylizedHeading('Network Overview', 24), alignment: 'left' },
                    { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }
                ], pageBreak: 'before', margin: [0, 0, 0, 15]
            },
            {
                columns: [
                    {
                        stack: [
                        {
                            columns: [
                                {
                                    stack: [
                                        { text: 'Revenue', style: 'header', alignment: 'center' },
                                        { text: 'Network wide, for this reports period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                                        { text: `${formatDollar(totalSmValue(allSmPackages))}/m`, style: 'subheader', alignment: 'center' },
                                    ], width: 95
                                },
                                {
                                    stack: [
                                        { text: 'Subscribers', style: 'header', alignment: 'center' },
                                        { text: 'Network wide, for this reports period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                                        { text: d3.format(",")(Object.keys(allSmPackages).length), style: 'subheader', alignment: 'center' },
                                    ], width: 95
                                },
                                {
                                    stack: [
                                        { text: 'ARPU', style: 'header', alignment: 'center' },
                                        { text: 'Network wide, for this reports period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                                        { text: d3.format("($,.0f")((totalSmValue(allSmPackages) / Object.keys(allSmPackages).length)), style: 'subheader', alignment: 'center' },
                                    ], width: 95
                                }
                            ]
                        },
                        {
                            text : " " 
                        },
                        {
                            columns: [ 
                                {
                                    stack: [
                                        { text: 'Total Download', style: 'header', alignment: 'center' },
                                        { text: 'DL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                                        { text: `${getReadableDataSize(networkDlUsage, 2)}`, style: 'subheader', alignment: 'center' } 
                                    ]
                                },
                                {
                                    stack: [
                                        { text: 'Total Upload', style: 'header', alignment: 'center' },
                                        { text: 'UL data during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                                        { text: `${getReadableDataSize(networkUlUsage, 2)}`, style: 'subheader', alignment: 'center' } // 
                                    ]
                                }
                            ]
                        }
                        ], width: 285
                    },
                    {
                        stack: [
                            { text: 'Network Subscriber Health', style: 'header', alignment: 'center' },
                            { text: 'Networkwide Average SM Link Quality Index', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                            { columns: [{ svg: gauge(avgLQI.downlink, 70, "Downlink LQI", 100), alignment: 'center' }, { svg: gauge(avgLQI.uplink, 70, "Uplink LQI", 100), alignment: 'center' }] }
                        ], width: '*'
                    }
                ]
            }, // BIG CHART
            { text: 'PMP Monthly revenue by Tower', alignment: 'center', style: "header", margin: [0, 15, 0, 0] },
            { text: 'Revenue by tower based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
            { svg: stackedBarChart(tVals, 580, tVals.length * 12 + 15, true, 100, "total", true, false, false, true)},
            
             // Network Overview
             {
                columns: [
                    { text: stylizedHeading('Network Overview', 24), alignment: 'left' },
                    { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }
                ], pageBreak: 'before', margin: [0, 0, 0, 15]
            }, 
            // BIG CHART
            { text: 'PMP Current ARPU by Tower', alignment: 'center', style: "header", margin: [0, 15, 0, 0] },
            { text: 'Estimated ARPU by tower based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
            { svg: stackedBarChart(tARPUVals, 580, tARPUVals.length * 12 + 15, true, 100, "total", true, false, false, false)},
            
            // Network Overview
            {
                columns: [
                    { text: stylizedHeading('Network Overview', 24), alignment: 'left' },
                    { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }
                ], pageBreak: 'before', margin: [0, 0, 0, 15]
            },
            , // BIG CHART
            { text: 'PMP SMs by Tower', alignment: 'center', style: "header", margin: [0, 15, 0, 0] },
            { text: 'Online SMs during this period by tower', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
            { svg: stackedBarChart(tSMVals, 580, tSMVals.length * 12 + 15, false, 100, "total", true, false, false, false)},

            // Comparisons
            {
                columns: [
                    { text: stylizedHeading('Network Comparisons', 24), alignment: 'left' },
                    { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }
                ], pageBreak: 'before', margin: [0, 0, 0, 15]
            },
            {
                columns: [
                    { 
                        stack: [{ text: 'SMs by Location', style: 'header', alignment: 'center' },
                                { text: 'Determined by EIP Owner', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                                { svg: donutChart(Object.keys(ownersCount).map(o => { return { name: o, value: ownersCount[o] }}), 160, false, true), alignment: 'center', margin: [0, 0, 0, 15] }]
                    },
                    { 
                        stack: [{ text: 'Value by Location', style: 'header', alignment: 'center' },
                                { text: 'Determined by EIP Owner', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] }, 
                                { svg: donutChart(Object.keys(ownersValue).map(o => { return { name: o, value: ownersValue[o] }}), 160, true, true), alignment: 'center', margin: [0, 0, 0, 15] }]
                    }
                ]
            },
            {
                columns: [
                    { 
                        stack: [{ text: 'SMs by Account Type', style: 'header', alignment: 'center' },
                                { text: 'Current SMs by Business and Residential', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                                { svg: donutChart(Object.keys(busResCount).map(o => { return { name: o, value: busResCount[o] }}), 160, false, true), alignment: 'center' }]
                    },
                    { 
                        stack: [{ text: 'Value by Account Type', style: 'header', alignment: 'center' },
                                { text: 'Current Value by Business and Residential', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] }, 
                                { svg: donutChart(Object.keys(busResValue).map(o => { return { name: o, value: busResValue[o] }}), 160, true, true), alignment: 'center' }]
                    }
                ]
            },
            {
                columns: [
                    { stack: [{ text: 'SMs by Frequency', style: 'header', alignment: 'center' },
                              { text: 'Based on this Tower', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                              { svg: donutChart(smCountByFrequency(allApStatistics), 160, false, true), alignment: 'center' }]
                    },
                    { stack: [{ text: 'APs by Frequency', style: 'header', alignment: 'center' },
                              { text: 'Based on this Tower', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
                              { svg: donutChart(apCountByFrequency(allApStatistics), 160, false, true), alignment: 'center' }]
                     },
                ], margin: [0, 15, 0, 0]
            },

            // Package overview page
            {
                columns: [
                    { text: stylizedHeading('Network Packages', 24), alignment: 'left' },
                    { text: fileStartDate(), style: 'pageDate', color: brandColor1, alignment: 'right' }
                ], pageBreak: 'before', margin: [0, 0, 0, 15]
            },
            { text: 'PMP monthly revenue by Package', alignment: 'center', style: "header", margin: [0, 15, 0, 0] },
            { text: 'Revenue by package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
            { svg: stackedBarChart(pVals, 580, pVals.length * 12 + 15, true, 230, "total", true, false, false) },
            { text: 'PMP subscribers per Package', alignment: 'center', style: "header", margin: [0, 15, 0, 0] },
            { text: 'Subscribers per package based on Online SMs during this period', fontSize: '8', alignment: 'center', margin: [0, 0, 0, 5] },
            { svg: stackedBarChart(subVals, 580, subVals.length * 12 + 15, false, 230, "total", true, false, false) },
            ...ownersPages
        ],
        defaultStyle: {
            font: 'DaxOT'
        }
    }
    return await generateAndSavePDF(docDefinition, `${reportDir}/${fileDateTag()} - High Level Network Report.pdf`)
}
