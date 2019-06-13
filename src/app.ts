import { getReadableFileSizeString, loginCNMaestro, getCNMapi, generateHTMLTable } from './myFunctions'
import * as d3 from 'd3'
import { JSDOM } from 'jsdom'
import { AP, metric, metricEntry, apEntry, columns } from './classes'
import PDFDocument from 'pdfkit'
import SVGtoPDF from 'svg-to-pdfkit'
import PdfTable from 'voilab-pdf-table'
import {smtpHost, smtpPort, sendMail, toEmailAddress, days, clientid, client_secret, baseURL, color, logoFile, fromEmail} from './config'
let moment = require('moment');

const mailer = require('sendmail')({ smtpHost: smtpHost, smtpPort: smtpPort })

let overallStats = []
let svgs = {}
const end = Math.round((new Date()).getTime() / 1000)
const start = end - (days * (24 * 3600))
let startTime = new Date(start * 1000).toISOString()
let endTime = new Date(end * 1000).toISOString()
let filename = `cnMaestroReport ${moment(new Date(startTime)).format("YYYY-MM-DD")}.pdf`;;

const writer = require('fs').createWriteStream(filename)
writer.on('finish', () => sendEmail())

function stringSort(a, b) {
    var x = a.name.toLowerCase();
    var y = b.name.toLowerCase();
    if (x < y) { return -1 }
    if (x > y) { return 1 }
    return 0
}

async function main() {
    const accessToken = await loginCNMaestro(clientid, client_secret, baseURL)

    if (accessToken) {
        let towers = await getCNMapi(baseURL, `/networks/default/towers?fields=id,name`, accessToken)
        towers = towers.sort(stringSort)

        for (let tower of towers) {
            console.log(`Tower Grab: ${tower['id']}`)
            let APs: any = await getCNMapi(baseURL, `/devices/statistics?mode=ap&tower=${tower['id'].split(' ').join('+')}&fields=name,mac,radio.channel_width,radio.tdd_ratio`, accessToken)
            APs.sort(stringSort)
            
            let apResults: Array<AP> = await grabTowerAPs(APs, startTime, endTime, accessToken, tower['name'])
            svgs[tower['id']] = []
            for (let i = 0; i < apResults.length; i++) {
                console.log(`Generate SVG: ${apResults[i].name}`)
                svgs[tower['id']].push(await graph(apResults[i]))
                let svgTest = svgs[tower['id']][i];
            }
            //break; // BREAK AFTER FIRST AP FOR TESTING
        }

        await generateReport()
    }
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
            subject: `Canopy 450 Report (${moment(new Date(startTime)).format("MM/DD/YYYY")} - ${moment(new Date(endTime)).format("MM/DD/YYYY")})`,
            html: html,
            attachments: [{ filename: filename, path: filename }]
        }, function (err, reply) {
            console.log(err && err.stack);
            console.dir(reply);
        })
    }
}

function generateReport() {
    return new Promise((resolve, reject) => {
        try {
            let pdfSVGMargin: number = 35
            let pdfSVGloc: Array<Number> = [40, 290, 550]
            let doc = new PDFDocument({
                margin: 10,
                info: {
                    Title: "Canopy450 AP Report",
                    Author: "Chris Chance"
                }
            })
            doc.pipe(writer)
            doc.image(logoFile, (doc.page.width / 2) - 88, (doc.page.height / 3) - 100)
            //SVGtoPDF(doc, utslogo, (doc.page.width / 2) - 88, (doc.page.height / 3) - 100)
            doc.font('DaxOT.ttf')
            doc.fontSize('32').text("Canopy450 Weekly Performance Report", 0, 0.4 * (doc.page.height - doc.heightOfString("Canopy450 Weekly Performance Report", { width: doc.page.width, align: 'center' })), { width: doc.page.width, align: 'center' })
            doc.fontSize('12').text(`${moment(new Date(startTime)).format("MM/DD/YYYY")} - ${moment(new Date(endTime)).format("MM/DD/YYYY")}`, { width: doc.page.width, align: 'center' })

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
                for (let svg in svgs[svgTower]) {
                    if (svgPosition == 0 || svgPosition % 3 == 0) {
                        if (svgPosition == 0) {
                            // New Tower (So make a table frontpage)
                            console.log(`New Tower Page: ${svgTower}`)
                            doc.addPage()
                            //SVGtoPDF(doc, utslogo , (doc.page.width / 2) - 88, (doc.page.height / 3) - 100)
                            doc.image('utslogo.PNG', (doc.page.width / 2) - 88, (doc.page.height / 3) - 100)
                            doc.fontSize('32')
                            doc.text(svgTower, 0, 0.4 * (doc.page.height - doc.heightOfString(svgTower, { width: doc.page.width, align: 'center' })), { width: doc.page.width, align: 'center' });
                            doc.text(" ")
                            doc.fontSize('10')

                            table.addBody(overallStats.filter((d) => { return d.tower == svgTower }))
                        }
                        // New page but not a first page
                        console.log(`New SVG Page`)
                        doc.addPage()
                        doc.fillColor('lightgrey')
                        doc.fontSize('18')
                        doc.text(svgTower, 20, 15)
                        doc.text(moment(new Date()).format("MM/DD/YYYY"), 500, 15)
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
            reject(false)
        }
    })
}

function grabTowerAPs(APs: Array<apEntry>, startTime: string, endTime: string, accessToken: string, tower: string): Promise<Array<AP>> {
    return new Promise(async (resolve, reject) => {
        try {
            let apResults: Array<AP> = []
            for (let i = 0; i <= APs.length - 1; i++) {
                //TODO: Refactor all of this now that they redid the API and do proper timestamps we don't need to do the tricks we used to do.

                console.log(`Grabbing AP: ${APs[i].mac}`)
                let dayResults: any = await getCNMapi(baseURL, `/devices/${APs[i].mac}/performance?start_time=${startTime}&stop_time=${endTime}&fields=timestamp,radio.dl_throughput,radio.ul_throughput,radio.dl_frame_utilization,radio.ul_frame_utilization,sm_count,sm_drops`, accessToken)
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
                let DLframe: number = .8 //Number(APs[i].radio.tdd_ratio.split("/")[0]) / 100 // TODO: sending CC instead of frame suddenly
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

function insertLinebreaks(d) {
    var el = d3.select(this);
    var words = d3.select(this).text().split(' ');

    el.text('');

    for (var i = 0; i < words.length; i++) {
        var tspan = el.append('tspan').text(words[i]);
        if (i > 0)
            tspan.attr('x', 0).attr('dy', '10');
    }
};

function graph(ap: AP): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const window = d3.select((new JSDOM(`<html><head></head><body></body></html>`)).window.document)

            const fullWidth = 720
            const fullHeight = 300
            const margin = { top: 20, right: 40, bottom: 60, left: 75 },
                width = fullWidth - margin.left - margin.right,
                height = fullHeight - margin.top - margin.bottom

            let minDate: number = 999999999999999999
            let maxDate: number = 0
            let max: number = 0
            let max2: number = 0

            // Find the max of the various axis (and min for date)
            ap.metrics.forEach((metric) => {
                if ((Number(d3.max(metric.values, (d) => { return d.data })) > max) && metric.axis == 0) { max = Number(d3.max(metric.values, (d) => { return d.data })) }
                if ((Number(d3.max(metric.values, (d) => { return d.data })) > max2) && metric.axis == 1) { max2 = Number(d3.max(metric.values, (d) => { return d.data })) }
                if (Number(d3.min(metric.values, (d) => { return d.timestamp })) < minDate) { minDate = Number(d3.min(metric.values, (d) => { return d.timestamp })) }
                if (Number(d3.max(metric.values, (d) => { return d.timestamp })) > maxDate) { maxDate = Number(d3.max(metric.values, (d) => { return d.timestamp })) }
            })

            if (max2 < 100) { max2 = 100 } // If subs are under 100 at least have it cover 100%

            let y = d3.scaleLinear().rangeRound([height, 0]).nice().domain([0, max]) // Throughput scale
            let y2 = d3.scaleLinear().rangeRound([height, 0]).nice().domain([0, max2]) // Sub scale
            let x = d3.scaleTime().rangeRound([0, width]).nice().domain([minDate, maxDate]) // Date Scale

            let legendvals = d3.set(ap.metrics.filter((m) => { return (m.axis == 0) }).map((m) => { return m.name })).values()
            let legendOrdinal = d3.scaleOrdinal().domain(legendvals).range(color)

            let legendvals1 = d3.set(ap.metrics.filter((m) => { return (m.axis == 1) }).map((m) => { return m.name })).values()
            let legendOrdinal1 = d3.scaleOrdinal().domain(legendvals1).range(color)

            let line = d3.line<metricEntry>().x((d) => { return x(d.timestamp) }).y((d) => { return y2(d.data) })
            let area = d3.area<metricEntry>().x((d) => { return x(d.timestamp) }).y1((d) => { return y(d.data) }).y0(height)

            let svg = window.select('body').append('div').attr('class', 'container')
                .append('svg')
                .attr('xmlns', 'http://www.w3.org/2000/svg')
                .attr('width', fullWidth)
                .attr('height', fullHeight)
                .attr('font-family', 'Calibri')

            let svgHeaders = svg.append('g')
            svgHeaders.append("text")
                .text(`${ap.name} (${ap.type})`)
                .attr("transform", `translate(${fullWidth / 2}, 0)`)
                .attr("dy", "1em")
                .attr("text-anchor", "middle")
                .style("font-size", "16px")

            svgHeaders.append("text")
                .text("Bandwidth")
                .attr("transform", `translate(10, ${height / 2}) rotate(-90)`)
                .attr("fill", "#000")
                .attr("text-anchor", "middle")
                .style("font-size", 12)

            svgHeaders.append("text")
                .text("Utilization / Efficiency / Subscribers")
                .attr("transform", `translate(${fullWidth}, ${height / 2}) rotate(-90)`)
                .attr("dy", "-0.5em")
                .attr("fill", "#000")
                .attr("text-anchor", "middle")
                .style("font-size", 12)

            let dlu = ap.metrics.find((d) => { return (d.name == "DL Utilization") })
            let ulu = ap.metrics.find((d) => { return (d.name == "UL Utilization") })

            let dls = ap.metrics.find((d) => { return (d.name == "DL Throughput") })
            let uls = ap.metrics.find((d) => { return (d.name == "UL Throughput") })
            let dlsm = d3.max(dls.values, (d) => { return d.data }) || 0
            let ulsm = d3.max(uls.values, (d) => { return d.data }) || 0

            let subs = ap.metrics.find((d) => { return (d.name == "Subscribers") })
            let subDrops = ap.metrics.find((d) => { return (d.name == "Session Drops") })
            let subsm = d3.max(subs.values, (d) => { return d.data }) || 0
            let subDropm = d3.max(subDrops.values, (d) => { return d.data }) || 0

            let dlbph = ap.metrics.find((d) => { return (d.name == "DL Efficiency") })
            let ulbph = ap.metrics.find((d) => { return (d.name == "UL Efficiency") })
            let dlbphAvg = d3.mean(dlbph.values, (d) => { return d.data }) || 0
            let ulbphAvg = d3.mean(ulbph.values, (d) => { return d.data }) || 0

            let bottomDetails = svgHeaders.append('g')
            let uluColor = "black"
            if (ulu.congestion > 0.2) { uluColor = "#a00b0b" } else if (ulu.congestion > 0) { uluColor = "#ce7a0c" }
            let dluColor = "black"
            if (dlu.congestion > 0.2) { dluColor = "#a00b0b" } else if (dlu.congestion > 0) { dluColor = "#ce7a0c" }

            bottomDetails.append("text")
                .text(`DL Maximum: ${getReadableFileSizeString(dlsm * 1024)}`)
                .attr("transform", `translate(30, ${fullHeight - 4})`)
                .attr('y', '-1.4em')
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12)

            bottomDetails.append("text")
                .text(`Uplink Maximum: ${getReadableFileSizeString(ulsm * 1024)}`)
                .attr("transform", `translate(30, ${fullHeight - 4})`)
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12)

            bottomDetails.append("text")
                .text(`DL Efficiency (avg): ${dlbphAvg.toFixed(0)}bit/hz`)
                .attr("transform", `translate(${(fullWidth / 4) * 1 + 30}, ${fullHeight - 4})`)
                .attr('y', '-1.4em')
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12)

            bottomDetails.append("text")
                .text(`UL Efficiency (avg): ${ulbphAvg.toFixed(0)}bit/hz`)
                .attr("transform", `translate(${(fullWidth / 4) * 1 + 30}, ${fullHeight - 4})`)
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12)

            bottomDetails.append("text")
                .text(`DL Congestion (Hrs): ${(dlu.congestion * 100).toFixed(2)}%`)
                .attr("transform", `translate(${(fullWidth / 4) * 2 + 30}, ${fullHeight - 4})`)
                .attr('y', '-1.4em')
                .attr("fill", dluColor)
                .attr("text-anchor", "start")
                .style("font-size", 12)

            bottomDetails.append("text")
                .text(`UL Congestion (Hrs): ${(ulu.congestion * 100).toFixed(2)}%`)
                .attr("transform", `translate(${(fullWidth / 4) * 2 + 30}, ${fullHeight - 4})`)
                .attr("fill", uluColor)
                .attr("text-anchor", "start")
                .style("font-size", 12)

            bottomDetails.append("text")
                .text(`Subscribers (max): ${(subsm)}`)
                .attr("transform", `translate(${(fullWidth / 4) * 3 + 30}, ${fullHeight - 4})`)
                .attr('y', '-1.4em')
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12)

            bottomDetails.append("text")
                .text(`Session Drops (max): ${(subDropm)}`)
                .attr("transform", `translate(${(fullWidth / 4) * 3 + 30}, ${fullHeight - 4})`)
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12)


            let svgGraphArea = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

            let dataPlots = svgGraphArea.append('g')
            let i: number = 0
            ap.metrics.forEach((metric) => {
                if (metric.axis == 0) {
                    dataPlots.selectAll(`.area${i}`)
                        .data([metric.values])
                        .enter()
                        .append("path")
                        .attr('fill', color[i])
                        .attr("d", area)
                } else {
                    dataPlots.selectAll(`.line${i}`)
                        .data([metric.values])
                        .enter()
                        .append("path")
                        .attr("stroke", color[i])
                        .attr("stroke-width", 1.5)
                        .attr("fill", "none")
                        .attr("d", line)
                }
                i += 1
            })

            let axis = svgGraphArea.append('g')
                .attr("id", "axis")
                .attr("class", "axis")

            axis.append('g')
                .attr("id", "main_x")
                .attr("class", "x_axis")
                .attr("transform", `translate(0, ${height})`)
                .call(d3
                    .axisBottom(x)
                    .tickPadding(2)
                    .tickSize(5)
                    .tickSizeOuter(0)
                    .tickFormat((d: number) => {
                        return moment(new Date(d * 1000)).format("MM/DD h:mma")
                    }))
                .attr("fill", "#000")
                

            axis.append('g')
                .attr("id", "y2")
                .attr("class", "y_axis")
                .attr("transform", `translate(0, 0)`)
                .call(d3
                    .axisLeft(y)
                    .ticks(7)
                    .tickSize(5)
                    .tickSizeOuter(0)
                    .tickFormat((d: number) => {
                        return getReadableFileSizeString(d * 1024)
                    }))
                .attr("fill", "#000")
                

            axis.append('g')
                .attr("id", "y2")
                .attr("class", "y_axis")
                .attr("transform", `translate(${width}, 0)`)
                .call(d3
                    .axisRight(y2)
                    .ticks(4)
                    .tickSize(5)
                    .tickSizeOuter(0))
                .attr("fill", "#000")
                

            let svgLegend = svgGraphArea.append('g')
            let svgLegendEntryLeft = svgLegend.selectAll('.legend')
                .data(legendOrdinal.domain())
                .enter()
                .append('g')
                .attr("transform", (d, i) => { return "translate(10, " + (height - 30 - (i * 14)) + ")" })

            svgLegendEntryLeft.append('rect')
                .attr('x', -5).attr('y', -5)
                .attr('width', 90)
                .attr('height', 14)
                .style('fill', 'white')
                .attr('fill-opacity', '0.6')

            svgLegendEntryLeft.append('rect')
                .attr("x", 0).attr("y", -2)
                .attr("width", 8)
                .attr("height", 8)
                .style("fill", (d, i) => { return color[i] })
                .style("stroke-width", 1)
                .style("stroke", "black")

            svgLegendEntryLeft.append('text')
                .attr('transform', "translate(14, 5)")
                .text((d, i) => { return d })
                .style("text-anchor", "start")
                .style("font-size", 10)

            let svgLegendEntryRight = svgLegend.selectAll('.legend')
                .data(legendOrdinal1.domain())
                .enter()
                .append('g')
                .attr("transform", (d, i) => { return "translate(" + (width - 14) + ", " + (height - 30 - (i * 14)) + ")" })

            svgLegendEntryRight.append('rect')
                .attr('x', -80).attr('y', -5)
                .attr('width', 90)
                .attr('height', 14)
                .style('fill', 'white')
                .attr('fill-opacity', '0.6')

            svgLegendEntryRight.append('rect')
                .attr("x", -5).attr("y", -2)
                .attr("width", 8)
                .attr("height", 8)
                .style("fill", (d, i) => { return color[i + legendvals.length] })
                .style("stroke-width", 1)
                .style("stroke", "black")

            svgLegendEntryRight.append('text')
                .attr('transform', "translate(-14, 5)")
                .text((d, i) => { return d })
                .style("text-anchor", "end")
                .style("font-size", 10)

            svg.selectAll('#main_x g text').each(insertLinebreaks);
            
            resolve(window.select('.container').html().toString());
        } catch (err) {
            console.log(err.message)
            reject(err.message)
        }
    })
}

main()