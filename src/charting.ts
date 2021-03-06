import { getReadableThroughput, stringSort } from './myFunctions'
import { JSDOM } from 'jsdom'
import { color, color2 } from './config'
import * as d3 from 'd3'
import { apiPerformance, apiStatistics } from './cnMaestroTypes'
import { getMetric, metricEntry } from './cnMaestroMetricTools'
import { perfToBpHz } from './bitsPerHz'
import { calcCongestion } from './congestion'
import { schemeCategory10 } from 'd3'
import { isNumber } from 'util'

let moment = require('moment');

export function insertLinebreaks() {
    var el = d3.select(this)
    var words = d3.select(this).text().split(' ')

    el.text('')

    for (var i = 0; i < words.length; i++) {
        var tspan = el.append('tspan').text(words[i])
        if (i > 0)
            tspan.attr('x', 0).attr('dy', '10')
    }
}

 // Used for the stackedChartData type to get the unique column keys
 export function getNonNameNonTotalKeys(data) {
    let keys = []
    data.forEach(twr => {
        Object.keys(twr).forEach(k => {
            if (keys.indexOf(k) === -1 && k != 'name' && k != 'total') { keys.push(k) }
        })
    })
    return keys
}

// [{name: string, total: number , ...Columns...: number}
export function stackedBarChart(data: Array<{}>, widthVar: number, heightVar: number, valueDollars: boolean = true, marginLeft: number = 100, sortFieldName: string = "total", endBarTotal: boolean = true, leftAxisTotal: boolean = false, showLegend: boolean = true, showPercent: boolean = true) {
    console.log(`New StackedBar Chart`)    

    const format = valueDollars ? d3.format("($,.0f") : d3.format(",")
    const margin = {top: 0, right: 50, bottom: 15, left: marginLeft},
    width = widthVar - margin.left - margin.right,
    height = heightVar - margin.top - margin.bottom

    const window = d3.select((new JSDOM(`<html><head></head><body></body></html>`)).window.document)
    let svg = window.select('body').append('div').attr('class', 'container')
        .append("svg").attr("width", widthVar).attr("height", heightVar).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    
    if (data.length == 0) { 
        svg.append("g").text("No Data Available").attr("font-family", "sans-serif").attr("font-size", 8).attr("fill", "red").attr("font-weight", "normal")
        return window.select('.container').html().toString()
    } // No data was given to us
    
    let overallTotal: number = data.reduce((acc: number, cur: any) => { return acc + cur.total}, 0)

    // Sort by number if its a number in the requested field otherwise do a string sort
    data.sort((a, b) => isNumber(data[0][sortFieldName]) ? b[sortFieldName] - a[sortFieldName] : stringSort(a[sortFieldName], b[sortFieldName]))
    
    let y = d3.scaleBand().rangeRound([0, height]).paddingInner(0.2).align(0.2).domain(data.map((d: any) => d.name))
    let x = d3.scaleLinear().rangeRound([0, width]).domain([0, Number(d3.max(data, d => (d as any).total))]).nice()
    let keys = getNonNameNonTotalKeys(data)
    let z = d3.scaleOrdinal(schemeCategory10).domain(keys)

    svg.append("g").selectAll("g")
        .data(d3.stack().keys(keys)(data))
        .enter().append("g")
        .attr("fill", d => z(d.key))
        .selectAll("rect").data(d => d).enter()
        .append("rect")
            .attr("y", d => y((d as any).data.name)).attr("x", d => x(d[0]))			   
            .attr("width", d => x(d[1]) - x(d[0])).attr("height", y.bandwidth())

    let thisPct = (thisTotal: number, overall: number): string => {
        return `(${((thisTotal/overall)*100).toFixed(0)}%)`
    }

    if(endBarTotal) {
        // Totals on end of bar
        svg.append("g").selectAll("text")
            .data(data).enter().append("text")
            .text((d: any, _) => `${format(d.total)} ${showPercent ? thisPct(d.total, overallTotal) : "" }`)
            .attr("y", (d: any, _) => y(d.name) + y.bandwidth()/2 + 3)
            .attr("x", (d: any, _) =>  x(d.total) + 5)
            .attr("font-family", "sans-serif").attr("font-size", 8).attr("fill", "#000").attr("font-weight", "normal")
    }

    if(leftAxisTotal) {
        // Totals below name
        svg.append("g").selectAll("text")
            .data(data).enter().append("text")
            .text((d: any, _) => format(d.total))
            .attr("y", (d: any, _) => y(d.name) + y.bandwidth()/2 + 12).attr("x", -9)
            .attr("font-family", "sans-serif").attr("font-size", 8).attr("fill", "#000").attr("font-weight", "normal").attr("text-anchor", "end")
    }
    // Left Axis
    svg.append("g").attr("class", "axis")
        .attr("transform", "translate(0,0)")
        .call(d3.axisLeft(y).tickSizeOuter(0).tickSizeInner(6)).attr("font-family", "sans-serif")
        .attr("font-family", "sans-serif").attr("font-size", 8).attr("fill", "#000").attr("font-weight", "normal")							

    // Bottom Axis
    svg.append("g").attr("class", "axis")
        .attr("transform", "translate(0,"+height+")")				
        .call(d3.axisBottom(x).tickFormat(v => format(v)).tickSizeOuter(0).ticks(5))
        .attr("font-family", "sans-serif").attr("font-size", 8).attr("fill", "#000").attr("font-weight", "normal")	

    if (showLegend) {
        // Legend
        let legend = svg.append("g")
            .attr("font-family", "sans-serif").attr("font-size", 8).attr("text-anchor", "end")
            .selectAll("g").data(keys.slice().reverse()).enter()
                .append("g")
                .attr("transform", (_, i) => "translate(0," + ((height-(keys.length*16  )) + (i * 15)) + ")")
        
        legend.append("rect").attr("x", width - 9).attr("width", 10).attr("height", 10).attr("fill", z)
        legend.append("text").attr("x", width - 12).attr("y", 4.5).attr("dy", "0.32em").attr("font-size", 8).text(d => (d as any))
    }
    return window.select('.container').html().toString()
}

export function gauge(value: number, radius: number, title: string, max: number = 100, startColor: string = "red", endColor: string = "green") {
    const margin = 8 
    const config = {
      minAngle: -90,
      maxAngle: 90,
      innerTickCounterclockSpin: 0,
      innerTickNumber: 10,
      outerTickRingOffset: 25,
      outerTickCounterclockSpin: 5,
      outerTickBorderLength: 30,
      gaugeThickness: 10
    }

    const chartRadius = radius - (margin*2)

    const scale = d3.scaleLinear().domain([0, max]).range([0, 1]);
    const innerTicks = scale.ticks(config.innerTickNumber).map((tick) => ({ value: tick, label: tick }))
    const percentToDeg = (percent) => percent * 180 / 100

    const window = d3.select((new JSDOM(`<html><head></head><body></body></html>`)).window.document)
    let svg = window.select('body').append('div').attr('class', 'container').append('svg').attr('width', radius*2).attr('height', radius)
    
    // Gradient
    const gradient = svg.append("defs")
        .append("linearGradient").attr("id", "gradient").attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%")
        .attr("spreadMethod", "pad").attr("gradientUnits" , "objectBoundingBox")
    gradient.append("stop").attr("offset", "0%").attr("stop-color", startColor).attr("stop-opacity", 1).attr("offset", "10%")
    gradient.append("stop").attr("offset", "100%").attr("stop-color", endColor).attr("stop-opacity", 1)
    
    // Add layer for the panel
    const chart = svg.append('g').attr('transform', `translate(${chartRadius+margin}, ${chartRadius+margin})`);

    // Gauge Arc
    const arc = d3.arc().innerRadius(chartRadius).outerRadius(chartRadius - config.gaugeThickness).startAngle(-90 * (Math.PI/180)).endAngle(90 * (Math.PI/180))
    chart.append('path').attr('class', "arc").style("fill", "url(#gradient)").attr("d", arc);

    // Needle
    chart.append('circle').attr('class', 'needle-center').attr('cx', 0).attr('cy', 0).attr('r', Math.ceil(chartRadius/25));
    chart.append('line').attr('class', 'needle').style("stroke", "black").style("stroke-width", Math.ceil(chartRadius/35)).attr("x1", 0).attr("y1", 0).attr("x2", -(chartRadius + margin/2)).attr("y2", 0).attr("transform", () => `rotate(${percentToDeg(value)})`);   
    
    // Number ticks inside the gauge
    const innerTicksGroup = chart.append('g').attr('class','inner-ticks');
    innerTicksGroup.selectAll('text')
        .data(innerTicks)
        .enter()
            .append('text').attr('class', 'tick')
            .attr('font-size', Math.ceil(chartRadius/13)).attr('font-family', 'sans-serif').attr('text-anchor', 'middle')
            .attr('transform', (d) => {
                let newAngle = config.minAngle + (scale(d.value) * 180);
                return `rotate(${newAngle}) translate(0, ${-(chartRadius - config.gaugeThickness*2)})`;
            }).text((d) => d.label);

    chart.append('g').append('text').attr('class', 'title')
        .attr('x', 0).attr('y', -(chartRadius/4))
        .text(title).attr('font-family', 'sans-serif').attr('font-size', Math.ceil(chartRadius/9)).attr('text-anchor', 'middle')

    chart.append('g').append('text').attr('class', 'title')
        .attr('x', 0).attr('y', -(chartRadius/4) - Math.ceil(chartRadius/9))
        .text(`${value.toFixed(1)}%`).attr('font-family', 'sans-serif').attr('font-size', Math.ceil(chartRadius/6)).attr('text-anchor', 'middle')

    
    return window.select('.container').html().toString()
}

export function donutChart(data: {name: string, value: number}[], diameter: number, valueDollars: boolean = true, pieChart: boolean = false) {
    console.log(`New Donut Chart`)
    data = data.sort((a, b) => b.value - a.value)

    const format = valueDollars ? d3.format("$,") : d3.format(",")
    const color = d3.scaleOrdinal(d3.schemeCategory10)
    const window = d3.select((new JSDOM(`<html><head></head><body></body></html>`)).window.document)
    const radius = diameter/2
    const innerRadius = pieChart ? 0 : radius * 0.4
    const textRadius = (radius-innerRadius)/2

    let svg = window.select('body').append('div').attr('class', 'container').append("svg").attr("width", diameter).attr("height", diameter)
    let g = svg.append("g").attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");
    let pie = d3.pie().sort(null).value(d => (d as any).value);
    
    let path = d3.arc().outerRadius(radius).innerRadius(innerRadius)
    let label = d3.arc().outerRadius(textRadius).innerRadius(textRadius)

    let total = data.reduce((agg, cur) => agg + cur.value, 0)
    let thisPct = (thisTotal: number, overall: number): string => {
        return `(${((thisTotal/overall)*100).toFixed(0)}%)`
    }

    let arc = g.selectAll(".arc")
        .data(pie((data as any))).enter()
        .append("g").attr("class", "arc")

    arc.append("path")
        .attr("d", path as any)
        .attr("fill", d => color((d as any).data.name))

    arc.append("text")
        .attr("transform", d => "translate(" + label.centroid((d as any)) + ")")
        .style("font-size", 8).attr("dy", "-10px").style("text-anchor", "middle").attr("font-family", "sans-serif").attr("font-weight", "bold")	
        .text(d => (d as any).data.name)
    
    arc.append("text")
        .attr("transform", d => "translate(" + label.centroid((d as any)) + ")")
        .style("font-size", 8).attr("dy", "0px").style("text-anchor", "middle").attr("font-family", "sans-serif").attr("font-weight", "normal")	
        .text(d => `${format((d as any).data.value)}`)

    arc.append("text")
        .attr("transform", d => "translate(" + label.centroid((d as any)) + ")")
        .style("font-size", 8).attr("dy", "10px").style("text-anchor", "middle").attr("font-family", "sans-serif").attr("font-weight", "normal")	
        .text(d => `${thisPct(d.value, total)}`)
        
    return window.select('.container').html().toString()
}


export function bubbleChart(inputData, diameter: number, valueDollars: boolean = true) {
    console.log(`New Bubble Chart`)
    const format = valueDollars ? d3.format("$,") : d3.format(",")
    const color = d3.scaleOrdinal(d3.schemeCategory10)
    const window = d3.select((new JSDOM(`<html><head></head><body></body></html>`)).window.document)

    let bubble = d3.pack().size([diameter, diameter]).padding(1.5)
    let svg = window.select('body').append('div').attr('class', 'container').append("svg").attr("width", diameter).attr("height", diameter).attr("class", "bubble")

    let data = {"children" : inputData}

    let root = d3.hierarchy(data).sum(d => (d as any).value).sort((a, b) => b.value - a.value)

    bubble(root)

    var node = svg.selectAll(".node")
      .data(root.children).enter().append("g").attr("class", "node")
      .attr("transform", d => "translate(" + (d as any).x + "," + (d as any).y + ")")

    //node.append("title").text(d => (d as any).data.className + ": " + format(d.value))
    node.append("circle").attr("r", d => (d as any).r).style("fill", d => color((d as any).data.packageName))
    node.append("text").style("font-size", 12).attr('font-family', 'Calibri').attr("dy", "-0.3em").style("text-anchor", "middle").text(d => (d as any).data.packageName)
    node.append("text").style("font-size", 12).attr('font-family', 'Calibri').attr("dy", "1.2em").style("text-anchor", "middle").text(d => format((d as any).data.value))

    return window.select('.container').html().toString()
}

export function availChart(apPerfs: apiPerformance[], metricName: string, metricTrigger: number, header: boolean, width: number) {
    console.log(`New Availability Chart: ${apPerfs[0].name} - ${metricName}`)

    let yOffset = 70 // height of our date header
    const blockHeight = 10 // size of our blocks
    const nameWidth = 100 // how much space we give for our AP name

    const dataset = apPerfs.map(p => [Number(moment.parseZone(p.timestamp).format('X')), p.radio[metricName] >= metricTrigger ? 1 : 0])

    const window = d3.select((new JSDOM(`<html><head></head><body></body></html>`)).window.document)
    const scale = d3.scaleTime().domain(d3.extent(dataset, d => d[0])).range([0, width - nameWidth])

    if (!header) { yOffset = 0 }
    let svg = window.select('body').append('div').attr('class', 'container').append("svg").attr('font-family', 'Calibri')
    .attr("width", `${width}px`).attr("height", `${yOffset + blockHeight}px`)

    // Draw our rectangles for the time usage
    svg.append("g")
        .selectAll(".rects")
        .data(dataset).enter()
        .append("rect")
        .attr("y", yOffset)
        .attr("x", d => scale(d[0]) + nameWidth) 
        .attr("height", blockHeight)
        .attr("width", (d, i) => (dataset[i + 1]) ? scale(dataset[i + 1][0]) - scale(d[0]) : 0)
        .attr("fill", d => d[1] ? "red" : "lightgreen")
        .style("stroke", "black")
        .style("stroke-width", "1px");

    // Add the name of this sector to the left
    svg.append("g").append("text")
        .attr("y", yOffset + blockHeight)
        .attr("fill", "#000")
        .style("font-size", 10)
        .text(apPerfs[0].name)

    // Should this graph have a timeline on top
    if (header) {
        svg.append("g")
            .attr("transform", `translate(${nameWidth}, ${yOffset})`)
            .call(d3.axisTop(scale)
                .tickPadding(5)
                .tickSize(5)
                .tickSizeOuter(0)
                .tickFormat((d: number) => moment.unix(d).format("MM/DD HH:mm")))
            .selectAll("text")
            .attr("fill", "#000")
            .attr("transform", "translate(-10, 0) rotate(35)")
            .attr("text-anchor", "end")
    }

    
    return window.select('.container').html().toString()
}

export function graph(apPerfs: apiPerformance[], apStats: apiStatistics[], allApProductTypes: Map<string, string[]>, congestionValue: number, pctConsideredCongested: number): string {
    const window = d3.select((new JSDOM(`<html><head></head><body></body></html>`)).window.document)
    const fullWidth = 550, fullHeight = 220, 
        margin = { top: 40, right: 40, bottom: 60, left: 75 }, 
        width = fullWidth - margin.left - margin.right, 
        height = fullHeight - margin.top - margin.bottom
    let minDate: number = 999999999999999, maxDate: number = 0, max: number = 0, max2: number = 0
    
    console.log(`Creating SVG: ${apPerfs[0].name}`)
    
    // Find the max of the various axis (and min for date)
    let metricNames = Object.keys(apPerfs[0].radio)
    metricNames.forEach((metric) => {

        // Skip the kbit metrics for data usage
        if (metric.indexOf("kbit") == -1) {         
            let thisMetric = getMetric(apPerfs, metric)
            // Check this metric if it's the largest value
            // UL Throughput and DL Throughput get put on axix 0
            if ((Number(d3.max(thisMetric, (d) => d.value)) > max) && metric.indexOf("throughput") > -1) {
                max = Number(d3.max(thisMetric, (d) => d.value ));
            }

            // Check this metric if its the largest value 
            // All other metrics go on the right
            if ((Number(d3.max(thisMetric, (d) => d.value)) > max2) && metric.indexOf("throughput") == -1) {
                max2 = Number(d3.max(thisMetric, (d) => d.value));
            }
            
            // Find the minimum and maximum timestamps across all metrics
            if (Number(d3.min(thisMetric, (d) => d.timestamp)) < minDate) {
                minDate = Number(d3.min(thisMetric, (d) => d.timestamp));
            }
            if (Number(d3.max(thisMetric, (d) =>  d.timestamp)) > maxDate) {
                maxDate = Number(d3.max(thisMetric, (d) => d.timestamp));
            }
        }
    })

    max2 = max2 < 100 ? max2 = 100 : max2 // If subs are under 100 at least have it cover 100%
    
    let y = d3.scaleLinear().rangeRound([height, 0]).nice().domain([0, max]) // Throughput scale
    let y2 = d3.scaleLinear().rangeRound([height, 0]).nice().domain([0, max2]) // Sub scale
    let x = d3.scaleTime().rangeRound([0, width]).nice().domain([minDate, maxDate]) // Date Scale

    // Legend1 = Throughputs and Not Usage
    let legendvals = d3.set(['dl_throughput', 'ul_throughput']).values()
    let legendOrdinal = d3.scaleOrdinal().domain(legendvals).range(color)
 
    // Legend2 = Everything else except Usage
    let legendvals1 = d3.set(['dl_frame_utilization', 'ul_frame_utilization', 'connected_sms', 'sm_drops']).values()
    let legendOrdinal1 = d3.scaleOrdinal().domain(legendvals1).range(color);
    
    let svg = window.select('body').append('div').attr('class', 'container').append('svg').attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('width', fullWidth).attr('height', fullHeight).attr('font-family', 'Calibri')

    // Text Headers for axis and heading
    let svgHeaders = svg.append('g');
    svgHeaders.append("text").text(`${apPerfs[0].name} (${allApProductTypes.get(apPerfs[0].name)})`)
        .attr("transform", `translate(${fullWidth / 2}, 0)`).attr("dy", "1.2em").attr("text-anchor", "middle").style("font-size", "10px");

    svgHeaders.append("text").text("Bandwidth")
        .attr("transform", `translate(10, ${height / 2}) rotate(-90)`).attr("fill", "#000").attr("text-anchor", "middle").style("font-size", "8px");

    svgHeaders.append("text").text("Utilization / Efficiency / Subscribers")
        .attr("transform", `translate(${fullWidth}, ${height / 2}) rotate(-90)`).attr("dy", "-0.5em").attr("fill", "#000").attr("text-anchor", "middle").style("font-size", 8);

    let dlu = getMetric(apPerfs, "dl_frame_utilization")
    let ulu = getMetric(apPerfs, "ul_frame_utilization")
    let dls = getMetric(apPerfs, "dl_throughput")
    let uls = getMetric(apPerfs, "ul_throughput")

    let dlsm = d3.max(dls, (d) => d.value) || 0
    let ulsm = d3.max(uls, (d) => d.value) || 0

    let subs = getMetric(apPerfs, "sm_count", false)
    let subDrops = getMetric(apPerfs, "sm_drops", false)
    let subsm = d3.max(subs, (d) => d.value) || 0
    let subDropm = d3.max(subDrops, (d) => d.value) || 0

    let dlbph = perfToBpHz(apPerfs, apStats.filter((s) => s.name == apPerfs[0].name)[0], true)
    let ulbph = perfToBpHz(apPerfs, apStats.filter((s) => s.name == apPerfs[0].name)[0], false)
    let dlbphAvg = d3.mean(dlbph, (d) => d.value) || 0
    let ulbphAvg = d3.mean(ulbph, (d) => d.value) || 0

    let bottomDetails = svgHeaders.append('g')
    let uluColor = "black", dluColor = "black"

    let uluCongestion = calcCongestion(apPerfs, "ul_frame_utilization", congestionValue)
    if (uluCongestion > pctConsideredCongested) { uluColor = "#a00b0b"; } else if (uluCongestion > 0) { uluColor = "#ce7a0c"; }
    let dluCongestion = calcCongestion(apPerfs, "dl_frame_utilization", congestionValue)
    if (dluCongestion > pctConsideredCongested) { dluColor = "#a00b0b"; } else if (dluCongestion > 0) { dluColor = "#ce7a0c"; }

    bottomDetails.append("text")
        .text(`DL Maximum: ${getReadableThroughput(dlsm * 1024)}`)
        .attr("transform", `translate(30, ${fullHeight - 4})`).attr('y', '-1.4em').attr("fill", "#000").attr("text-anchor", "start").style("font-size", 8)
    bottomDetails.append("text")
        .text(`UL Maximum: ${getReadableThroughput(ulsm * 1024)}`)
        .attr("transform", `translate(30, ${fullHeight - 4})`).attr("fill", "#000").attr("text-anchor", "start").style("font-size", 8)
    bottomDetails.append("text")
        .text(`DL Efficiency (avg): ${dlbphAvg.toFixed(0)}bit/hz`)
        .attr("transform", `translate(${(fullWidth / 4) * 1 + 30}, ${fullHeight - 4})`).attr('y', '-1.4em').attr("fill", "#000").attr("text-anchor", "start").style("font-size", 8)
    bottomDetails.append("text")
        .text(`UL Efficiency (avg): ${ulbphAvg.toFixed(0)}bit/hz`)
        .attr("transform", `translate(${(fullWidth / 4) * 1 + 30}, ${fullHeight - 4})`).attr("fill", "#000").attr("text-anchor", "start").style("font-size", 8)
    bottomDetails.append("text")
        .text(`DL Congestion (Hrs): ${(dluCongestion).toFixed(2)}%`)
        .attr("transform", `translate(${(fullWidth / 4) * 2 + 30}, ${fullHeight - 4})`).attr('y', '-1.4em').attr("fill", dluColor).attr("text-anchor", "start").style("font-size", 8);
    bottomDetails.append("text")
        .text(`UL Congestion (Hrs): ${(uluCongestion).toFixed(2)}%`)
        .attr("transform", `translate(${(fullWidth / 4) * 2 + 30}, ${fullHeight - 4})`).attr("fill", uluColor).attr("text-anchor", "start").style("font-size", 8);
    bottomDetails.append("text")
        .text(`Subscribers (max): ${(subsm)}`)
        .attr("transform", `translate(${(fullWidth / 4) * 3 + 30}, ${fullHeight - 4})`).attr('y', '-1.4em').attr("fill", "#000").attr("text-anchor", "start").style("font-size", 8);
    bottomDetails.append("text")
        .text(`Session Drops (max): ${(subDropm)}`)
        .attr("transform", `translate(${(fullWidth / 4) * 3 + 30}, ${fullHeight - 4})`).attr("fill", "#000").attr("text-anchor", "start").style("font-size", 8);

    let svgGraphArea = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
    let dataPlots = svgGraphArea.append('g');

    // Draw lines and areas to the map
    let line = d3.line<metricEntry>().x((d) => { return x(d.timestamp); }).y((d) => { return y2(d.value); });
    let area = d3.area<metricEntry>().x((d) => { return x(d.timestamp); }).y1((d) => { return y(d.value); }).y0(height);
     
    let i: number = 0, i2: number = 0;
    [dls, uls].forEach((metric) => {
        dataPlots.selectAll(`.area${i}`)
            .data([metric])
            .enter().append("path")
            .attr('fill', color[i])
            .attr('fill-opacity', '0.6')
            .attr("d", area);
        i++
    });

    [dlu, ulu, subs, subDrops].forEach((metric) => {
        dataPlots.selectAll(`.line${i}`)
            .data([metric])
            .enter().append("path")
            .attr("stroke", color2[i2])
            .attr("stroke-width", 1.5)
            .attr("fill", "none")
            .attr("d", line);
        i2++
    });

    // Begin Axis construction
    let axis = svgGraphArea.append('g').attr("id", "axis").attr("class", "axis");

    // Bottom Axis
    axis.append('g').attr("id", "main_x").attr("class", "x_axis").attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(8).tickPadding(2).tickSize(5).tickSizeOuter(0).tickFormat((d: number) => moment.unix(d).format("MM/DD h:mma")))
        .attr("fill", "#000").attr("font-size", 8)

    // Left Axis
    axis.append('g').attr("id", "y2").attr("class", "y_axis").attr("transform", `translate(0, 0)`)
        .call(d3.axisLeft(y).ticks(7).tickSize(5).tickSizeOuter(0).tickFormat((d: number) => getReadableThroughput(d * 1024)))
        .attr("fill", "#000").attr("font-size", 8)

    // Right Axis
    axis.append('g').attr("id", "y2").attr("class", "y_axis").attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(y2).ticks(4).tickSize(5).tickSizeOuter(0))
        .attr("fill", "#000").attr("font-size", 8)

    // Generate the legends
    let svgLegend = svgGraphArea.append('g');

    // Left Legend
    let svgLegendEntryLeft = svgLegend.selectAll('.legend').data(legendOrdinal.domain()).enter().append('g')
        .attr("transform", (_, i) => { return "translate(10, " + (height - 10 - (i * 11)) + ")"; }) // container
    svgLegendEntryLeft.append('rect').attr('x', -5).attr('y', -4).attr('width', 80).attr('height', 10).style('fill', 'lightgrey').attr('fill-opacity', '0.6') //bg
    svgLegendEntryLeft.append('rect').attr("x", 0).attr("y", -2).attr("width", 6).attr("height", 6)
        .style("fill", (_, i) => color[i]).style("stroke-width", 1).style("stroke", "black") //block
    svgLegendEntryLeft.append('text').attr('transform', "translate(10, 5)").text((d, _) => d).style("text-anchor", "start").style("font-size", 8) // text
    
    // Right Legend
    let svgLegendEntryRight = svgLegend.selectAll('.legend').data(legendOrdinal1.domain()).enter().append('g')
        .attr("transform", (_, i) => "translate(" + (width - 14) + ", " + (height - 10 - (i * 11)) + ")") // container
    svgLegendEntryRight.append('rect').attr('x', -90).attr('y', -4).attr('width', 100).attr('height', 10).style('fill', 'lightgrey').attr('fill-opacity', '0.6') //bg
    svgLegendEntryRight.append('rect').attr("x", -5).attr("y", -2).attr("width", 6).attr("height", 6)
        .style("fill", (_, i) => color2[i]).style("stroke-width", 1).style("stroke", "black") //block
    svgLegendEntryRight.append('text').attr('transform', "translate(-10, 5)").text((d, _) => d).style("text-anchor", "end").style("font-size", 8) // text

    svg.selectAll('#main_x g text').each(insertLinebreaks)

    return window.select('.container').html().toString()
}
