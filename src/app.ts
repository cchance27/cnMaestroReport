import * as d3 from 'd3'
import * as fs from 'fs'
import PDFDocument from 'pdfkit'
import SVGtoPDF from 'svg-to-pdfkit'
import PdfTable from 'voilab-pdf-table'
import { smtpHost, smtpPort, sendMail, toEmailAddress, days, clientid, client_secret, baseURL, logoFile, fromEmail, debug } from './config'
import { AP, metric, metricEntry, apEntry, columns } from './classes'
import { loginCNMaestro, getCNMapi, generateHTMLTable } from './myFunctions'
import { graph } from './graph'

let moment = require('moment');

const mailer = require('sendmail')({ smtpHost: smtpHost, smtpPort: smtpPort })

let overallStats = []
let svgs = {}
const end = Math.round((new Date()).getTime() / 1000)
const start = end - (days * (24 * 3600))
const startTime = new Date(start * 1000).toISOString()
const endTime = new Date(end * 1000).toISOString()
const fileStartDate = moment(new Date(startTime)).format("YYYY-MM-DD")
const fileEndDate = moment(new Date(endTime)).format("YYYY-MM-DD")

const filename = `${fileStartDate}_${fileEndDate} cnMaestroReport.pdf`
const filename450 = `${fileStartDate}_${fileEndDate} Canopy 450-450i Report.pdf`
const cachefile = `${fileStartDate}_${fileEndDate}_cache.json`

const writer = require('fs').createWriteStream(filename)
const writer450 = fs.createWriteStream(filename450)
writer.on('finish', () => sendEmail())

function stringSort(a, b) {
    var x = a.name.toLowerCase();
    var y = b.name.toLowerCase();
    if (x < y) { return -1 }
    if (x > y) { return 1 }
    return 0
}

async function main() {
    if(!fs.existsSync(cachefile)) {
        const accessToken = await loginCNMaestro(clientid, client_secret, baseURL)

        if (accessToken) {
            let towers = await getCNMapi(baseURL, `/networks/default/towers?fields=id,name`, accessToken)
            towers = towers.sort(stringSort)

            for (let tower of towers) {
                console.log(`Tower Grab: ${tower['id']}`)
                let APs: any = await getCNMapi(baseURL, `/devices/statistics?mode=ap&tower=${tower['id'].split(' ').join('+')}&fields=name,mac,radio.channel_width,radio.tdd_ratio`, accessToken)
                APs.sort(stringSort)

                let apResults: Array<AP> = await grabTowerAPs(APs, startTime, endTime, accessToken, tower['name'])
                svgs[tower['id']] = [] // Initialize the SVG array for this tower
                for (let i = 0; i < apResults.length; i++) {
                    // For each AP generate the SVG and add it to the SVG array
                    console.log(`Generate SVG: ${apResults[i].name}`)
                    svgs[tower['id']].push(await graph(apResults[i]))
                }
                if(debug) { break; }// BREAK AFTER FIRST AP FOR TESTING
            }

            console.log(`Caching: ${cachefile}`)
            let cache = {svgs: svgs, overallStats: overallStats}
            fs.writeFileSync(cachefile, JSON.stringify(cache), 'utf8')
        } else {
            throw "Access Token Failure";
        }
    } else {
        // We have a cache file for today.
        console.log(`Cache Restored: ${cachefile}`)
        let loadedCache = JSON.parse(fs.readFileSync(cachefile, 'utf8'))
        overallStats = loadedCache.overallStats
        svgs = loadedCache.svgs
    }

    //await generateReport()
    await generate450Report()
}

function sendEmail() {

    if (sendMail) {
        var html=`<h2>Weekly Report attached.</h2>`
        html += `
        ${generateHTMLTable(overallStats, "Top 10 Downlink Congestion", 10, true, "congestDL", 0)}
        <br\>
        ${generateHTMLTable(overallStats, "Top 10 Uplink Congestion", 10, true, "congestUL", 0)}
        <br\>
        ${generateHTMLTable(overallStats, "Top 10 Highest Downlink Throughput", 10, true, "DLmax", 0)}
        <br\>
        ${generateHTMLTable(overallStats, "Top 10 Subscriber Sessions", 10, true, "sessions", 0)}
        <br\>
        `

        mailer({
            from: fromEmail,
            to: toEmailAddress,
            subject: `Canopy 450 Report (${fileStartDate} - ${fileEndDate})`,
            html: html,
            attachments: [{ filename: filename, path: filename }]
        }, function (err, reply) {
            console.log(err && err.stack);
            console.dir(reply);
        })
    }
}

function generate450Report() {
    return new Promise((resolve, reject) => {
        try {
            let pdfSVGMargin: number = 35
            let doc = new PDFDocument({
                margin: 10,
                info: {
                    Title: "Canopy 450/450i AP Report",
                    Author: "Automated Report"
                }
            })
            doc.pipe(writer450)
            doc.image(logoFile, (doc.page.width / 2) - 88, (doc.page.height / 3) - 100)

            doc.font('DaxOT.ttf')
            doc.fontSize('32').text("Canopy450 Performance Report", 0, 0.4 * (doc.page.height - doc.heightOfString("Canopy450 Performance Report", { width: doc.page.width, align: 'center' })), { width: doc.page.width, align: 'center' })
            doc.fontSize('12').text(`${fileStartDate} - ${fileEndDate}`, { width: doc.page.width, align: 'center' })

            let filtered = overallStats.filter((f) => {
                return (f.congestDL > 10 || f.congestUL > 10) && (f.type == '450i' || f.type == '450')
            })
            
            filtered.forEach(sector => {
                console.log(sector)
            });

            resolve();
        } catch (err) {
            console.log(err)
            reject()
        }
    })
}

function generateReport() {
    return new Promise((resolve, reject) => {
        try {
            let pdfSVGMargin: number = 35
            let pdfSVGloc: Array<Number> = [40, 290, 550]
            let doc = new PDFDocument({
                margin: 10,
                info: {
                    Title: "cnMaestro AP Full Report",
                    Author: "Automated Report"
                }
            })
            doc.pipe(writer)
            doc.image(logoFile, (doc.page.width / 2) - 88, (doc.page.height / 3) - 100)

            doc.font('DaxOT.ttf')
            doc.fontSize('32').text("Canopy Full Performance Report", 0, 0.4 * (doc.page.height - doc.heightOfString("Canopy Full Performance Report", { width: doc.page.width, align: 'center' })), { width: doc.page.width, align: 'center' })
            doc.fontSize('12').text(`${fileStartDate} - ${fileEndDate}`, { width: doc.page.width, align: 'center' })

            let table = new PdfTable(doc, { bottomMargin: 20 })
            table.addColumns(columns)

            doc.addPage()
            doc.fontSize('16').fillColor('black').text("Downlink Congestion Overview")
            doc.fontSize('14').fillColor('black').text("Sectors with over 10% of downlink hours congested")
            doc.fontSize('10')
            let filtered = overallStats.filter((f) => { return f.congestDL > 10 })
            table.addBody(filtered.sort((a, b) => {return (a.congestDL - b.congestDL)}).reverse())
            
            doc.addPage()
            doc.fontSize('16').fillColor('black').text("Uplink Congestion Overview")
            doc.fontSize('14').fillColor('black').text("Sectors with over 10% of uplink hours congested")
            doc.fontSize('10')
            let filtered1 = overallStats.filter((f) => { return f.congestUL > 10 })
            table.addBody(filtered1.sort((a, b) => {return (a.congestUL - b.congestUL)}).reverse())

            let svgPosition: number = 0
            let thisSVGPosition: number = 0
            for (let svgTower in svgs) {
                // Loop through towers
                for (let svg in svgs[svgTower]) {
                    // Loop through svg's for this tower
                    if (svgPosition == 0) {
                        // New Tower (So make a table frontpage)
                        console.log(`New Tower Page: ${svgTower}`)
                        doc.addPage()                            
                        doc.image(logoFile, (doc.page.width / 2) - 88, (doc.page.height / 3) - 100)
                        doc.fontSize('32')
                        doc.text(svgTower, 0, 0.4 * (doc.page.height - doc.heightOfString(svgTower, { width: doc.page.width, align: 'center' })), { width: doc.page.width, align: 'center' });
                        doc.text(" ")
                        doc.fontSize('10')

                        table.addBody(overallStats.filter((d) => { return d.tower == svgTower }))
                    }

                    if (svgPosition % 3 == 0) {
                        // New page but not a first page.
                        console.log(`New SVG Page`)
                        doc.addPage()
                        doc.fillColor('lightgrey')
                        doc.fontSize('18')
                        doc.text(svgTower, 20, 15)
                        doc.text(fileEndDate, 500, 15)
                        thisSVGPosition = 0
                    }
                    
                    console.log(`Adding SVG: ${svgTower} - ${svg} - ${pdfSVGloc[thisSVGPosition]}` )
                    SVGtoPDF(doc, svgs[svgTower][svg], pdfSVGMargin, pdfSVGloc[thisSVGPosition])
                    svgPosition += 1
                    thisSVGPosition += 1
                }
                svgPosition = 0
            }

            doc.end()
            resolve(true)
        } catch (err) {
            console.log(err)
            reject(false)
        }
    })
}

function grabTowerAPs(APs: Array<apEntry>, startTime: string, endTime: string, accessToken: string, tower: string): Promise<Array<AP>> {
    return new Promise(async (resolve, reject) => {
        try {
            let apResults: Array<AP> = []
            for (let i = 0; i <= APs.length - 1; i++) {
                // Loop through each AP
                //TODO: Refactor all of this now that they redid the API and do proper timestamps we don't need to do the tricks we used to do.

                console.log(`Grabbing AP: ${APs[i].mac}`)
                let dayResults: any = await getCNMapi(baseURL, `/devices/${APs[i].mac}/performance?start_time=${startTime}&stop_time=${endTime}`, accessToken)
                let product: any = ((await getCNMapi(baseURL, `/devices/${APs[i].mac}?fields=product`, accessToken))[0] as any).product
                let valueDL: Array<metricEntry> = []
                let valueUL: Array<metricEntry> = []
                let valueFRUL: Array<metricEntry> = []
                let valueFRDL: Array<metricEntry> = []
                let bphDL: Array<metricEntry> = []
                let bphUL: Array<metricEntry> = []
                let sessions: Array<metricEntry> = []
                let sessionDrops: Array<metricEntry> = []

                let APhz: number = Number(APs[i].radio.channel_width.split(" ")[0]) * 1000
                let DLframe: number = Number(APs[i].radio.tdd_ratio.split("/")[0]) / 100
                let DLhz: number = APhz * DLframe
                let ULhz: number = APhz * (1 - DLframe)

                dayResults.forEach((day) => {
                    if (day.radio != null) {
                        let timeStamp = Number(Date.parse(day.timestamp)) / 1000
                        valueDL.push({ 'timestamp': timeStamp, 'data': day.radio.dl_throughput })
                        valueUL.push({ 'timestamp': timeStamp, 'data': day.radio.ul_throughput })
                        valueFRDL.push({ 'timestamp': timeStamp, 'data': day.radio.dl_frame_utilization })
                        valueFRUL.push({ 'timestamp': timeStamp, 'data': day.radio.ul_frame_utilization })
                        let bphDLclean = ((day.radio.dl_throughput / (day.radio.dl_frame_utilization / 100)) / DLhz) != Infinity ? ((day.radio.dl_throughput / (day.radio.dl_frame_utilization / 100)) / DLhz) : 0
                        let bphULclean = ((day.radio.ul_throughput / (day.radio.ul_frame_utilization / 100)) / ULhz) != Infinity ? ((day.radio.ul_throughput / (day.radio.ul_frame_utilization / 100)) / ULhz) : 0
                        bphDL.push({ 'timestamp': timeStamp, 'data': bphDLclean })
                        bphUL.push({ 'timestamp': timeStamp, 'data': bphULclean })
                        sessions.push({ 'timestamp': timeStamp, 'data': day.sm_count })
                        sessionDrops.push({ 'timestamp': timeStamp, 'data': day.sm_drops })
                    } else {
                        console.warn("Timestamp failed to return a radio: " + day.timeStamp);
                    }
                })

                //TODO: Look into grabbing 450m vs 450 and grabbing the other efficiency graphs when they add support for 450m MU-MIMO

                let metrics: metric[] = []
                metrics.push({ "name": "DL Throughput", "values": valueDL, "axis": 0, "congestion": 0 })
                metrics.push({ "name": "UL Throughput", "values": valueUL, "axis": 0, "congestion": 0 })
                metrics.push({ "name": "DL Utilization", "values": valueFRDL, "axis": 1, "congestion": congestion(valueFRDL, 90) })
                metrics.push({ "name": "UL Utilization", "values": valueFRUL, "axis": 1, "congestion": congestion(valueFRUL, 90) })
                metrics.push({ "name": "DL Efficiency", "values": bphDL, "axis": 1, "congestion": 0 })
                metrics.push({ "name": "UL Efficiency", "values": bphUL, "axis": 1, "congestion": 0 })
                metrics.push({ "name": "Subscribers", "values": sessions, "axis": 1, "congestion": 0 })
                metrics.push({ "name": "Session Drops", "values": sessionDrops, "axis": 1, "congestion": 0 })

                apResults.push({
                    "name": APs[i].name,
                    "mac": APs[i].mac,
                    "type": product,
                    "metrics": metrics
                })

                overallStats.push({
                    "tower": tower,
                    "type" : product.split(' ')[1],
                    "name": APs[i].name,
                    "bphDLmax": d3.max(bphDL, (d) => { return d.data }),
                    "bphDLmean": d3.mean(bphDL, (d) => { return d.data }),
                    "bphULmax": d3.max(bphUL, (d) => { return d.data }),
                    "bphULmean": d3.mean(bphUL, (d) => { return d.data }),
                    "DLmax": d3.max(valueDL, (d) => { return d.data * 1024 }),
                    "ULmax": d3.max(valueUL, (d) => { return d.data * 1024 }),
                    "meanUtilDL": d3.mean(valueFRDL, (d) => { return d.data }),
                    "meanUtilUL": d3.mean(valueFRUL, (d) => { return d.data }),
                    "congestDL": congestion(valueFRDL, 90) * 100,
                    "congestUL": congestion(valueFRUL, 90) * 100,
                    "sessions": d3.max(sessions, (d) => { return d.data }) || 0
                })
            }
            resolve(apResults)
        } catch (err) {
            console.log(require('util').inspect(err))
            reject(err.message)
        }
    })
}

function congestion(metric: metricEntry[], saturationValue: number): number {
    if (metric.length == 0) {
        return 0
    }
    return Number((metric.filter((d) => { return d.data >= saturationValue }).length / metric.length))
}

//TODO: report should have a nice overview of stats with perhaps mini charts, subscribers, efficiency, perhaps show the worst ones "points of concern this week"

main()