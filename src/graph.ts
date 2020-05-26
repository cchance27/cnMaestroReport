import { getReadableFileSizeString } from './myFunctions';
import { JSDOM } from 'jsdom';
import { AP, metricEntry } from './classes';
import { color } from './config';
import * as d3 from 'd3'
let moment = require('moment');

export function insertLinebreaks(d) {
    var el = d3.select(this);
    var words = d3.select(this).text().split(' ');

    el.text('');

    for (var i = 0; i < words.length; i++) {
        var tspan = el.append('tspan').text(words[i]);
        if (i > 0)
            tspan.attr('x', 0).attr('dy', '10');
    }
};


export function graph(ap: AP): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const window = d3.select((new JSDOM(`<html><head></head><body></body></html>`)).window.document);
            const fullWidth = 720;
            const fullHeight = 300;
            const margin = { top: 20, right: 40, bottom: 60, left: 75 }, width = fullWidth - margin.left - margin.right, height = fullHeight - margin.top - margin.bottom;
            let minDate: number = 999999999999999999;
            let maxDate: number = 0;
            let max: number = 0;
            let max2: number = 0;
            
            // Find the max of the various axis (and min for date)
            ap.metrics.forEach((metric) => {
                if ((Number(d3.max(metric.values, (d) => { return d.data; })) > max) && metric.axis == 0) {
                    max = Number(d3.max(metric.values, (d) => { return d.data; }));
                }
                if ((Number(d3.max(metric.values, (d) => { return d.data; })) > max2) && metric.axis == 1) {
                    max2 = Number(d3.max(metric.values, (d) => { return d.data; }));
                }
                if (Number(d3.min(metric.values, (d) => { return d.timestamp; })) < minDate) {
                    minDate = Number(d3.min(metric.values, (d) => { return d.timestamp; }));
                }
                if (Number(d3.max(metric.values, (d) => { return d.timestamp; })) > maxDate) {
                    maxDate = Number(d3.max(metric.values, (d) => { return d.timestamp; }));
                }
            });
            if (max2 < 100) {
                max2 = 100;
            } // If subs are under 100 at least have it cover 100%
            
            let y = d3.scaleLinear().rangeRound([height, 0]).nice().domain([0, max]); // Throughput scale
            let y2 = d3.scaleLinear().rangeRound([height, 0]).nice().domain([0, max2]); // Sub scale
            let x = d3.scaleTime().rangeRound([0, width]).nice().domain([minDate, maxDate]); // Date Scale
            let legendvals = d3.set(ap.metrics.filter((m) => { return (m.axis == 0); }).map((m) => { return m.name; })).values();
            let legendOrdinal = d3.scaleOrdinal().domain(legendvals).range(color);
            let legendvals1 = d3.set(ap.metrics.filter((m) => { return (m.axis == 1); }).map((m) => { return m.name; })).values();
            let legendOrdinal1 = d3.scaleOrdinal().domain(legendvals1).range(color);
            let line = d3.line<metricEntry>().x((d) => { return x(d.timestamp); }).y((d) => { return y2(d.data); });
            let area = d3.area<metricEntry>().x((d) => { return x(d.timestamp); }).y1((d) => { return y(d.data); }).y0(height);
            let svg = window.select('body').append('div').attr('class', 'container')
                .append('svg')
                .attr('xmlns', 'http://www.w3.org/2000/svg')
                .attr('width', fullWidth)
                .attr('height', fullHeight)
                .attr('font-family', 'Calibri');
            let svgHeaders = svg.append('g');
            svgHeaders.append("text")
                .text(`${ap.name} (${ap.type})`)
                .attr("transform", `translate(${fullWidth / 2}, 0)`)
                .attr("dy", "1em")
                .attr("text-anchor", "middle")
                .style("font-size", "16px");
            svgHeaders.append("text")
                .text("Bandwidth")
                .attr("transform", `translate(10, ${height / 2}) rotate(-90)`)
                .attr("fill", "#000")
                .attr("text-anchor", "middle")
                .style("font-size", 12);
            svgHeaders.append("text")
                .text("Utilization / Efficiency / Subscribers")
                .attr("transform", `translate(${fullWidth}, ${height / 2}) rotate(-90)`)
                .attr("dy", "-0.5em")
                .attr("fill", "#000")
                .attr("text-anchor", "middle")
                .style("font-size", 12);
            let dlu = ap.metrics.find((d) => { return (d.name == "DL Utilization"); });
            let ulu = ap.metrics.find((d) => { return (d.name == "UL Utilization"); });
            let dls = ap.metrics.find((d) => { return (d.name == "DL Throughput"); });
            let uls = ap.metrics.find((d) => { return (d.name == "UL Throughput"); });
            let dlsm = d3.max(dls.values, (d) => { return d.data; }) || 0;
            let ulsm = d3.max(uls.values, (d) => { return d.data; }) || 0;
            let subs = ap.metrics.find((d) => { return (d.name == "Subscribers"); });
            let subDrops = ap.metrics.find((d) => { return (d.name == "Session Drops"); });
            let subsm = d3.max(subs.values, (d) => { return d.data; }) || 0;
            let subDropm = d3.max(subDrops.values, (d) => { return d.data; }) || 0;
            let dlbph = ap.metrics.find((d) => { return (d.name == "DL Efficiency"); });
            let ulbph = ap.metrics.find((d) => { return (d.name == "UL Efficiency"); });
            let dlbphAvg = d3.mean(dlbph.values, (d) => { return d.data; }) || 0;
            let ulbphAvg = d3.mean(ulbph.values, (d) => { return d.data; }) || 0;
            let bottomDetails = svgHeaders.append('g');
            let uluColor = "black";
            if (ulu.congestion > 0.2) {
                uluColor = "#a00b0b";
            }
            else if (ulu.congestion > 0) {
                uluColor = "#ce7a0c";
            }
            let dluColor = "black";
            if (dlu.congestion > 0.2) {
                dluColor = "#a00b0b";
            }
            else if (dlu.congestion > 0) {
                dluColor = "#ce7a0c";
            }
            bottomDetails.append("text")
                .text(`DL Maximum: ${getReadableFileSizeString(dlsm * 1024)}`)
                .attr("transform", `translate(30, ${fullHeight - 4})`)
                .attr('y', '-1.4em')
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12);
            bottomDetails.append("text")
                .text(`Uplink Maximum: ${getReadableFileSizeString(ulsm * 1024)}`)
                .attr("transform", `translate(30, ${fullHeight - 4})`)
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12);
            bottomDetails.append("text")
                .text(`DL Efficiency (avg): ${dlbphAvg.toFixed(0)}bit/hz`)
                .attr("transform", `translate(${(fullWidth / 4) * 1 + 30}, ${fullHeight - 4})`)
                .attr('y', '-1.4em')
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12);
            bottomDetails.append("text")
                .text(`UL Efficiency (avg): ${ulbphAvg.toFixed(0)}bit/hz`)
                .attr("transform", `translate(${(fullWidth / 4) * 1 + 30}, ${fullHeight - 4})`)
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12);
            bottomDetails.append("text")
                .text(`DL Congestion (Hrs): ${(dlu.congestion * 100).toFixed(2)}%`)
                .attr("transform", `translate(${(fullWidth / 4) * 2 + 30}, ${fullHeight - 4})`)
                .attr('y', '-1.4em')
                .attr("fill", dluColor)
                .attr("text-anchor", "start")
                .style("font-size", 12);
            bottomDetails.append("text")
                .text(`UL Congestion (Hrs): ${(ulu.congestion * 100).toFixed(2)}%`)
                .attr("transform", `translate(${(fullWidth / 4) * 2 + 30}, ${fullHeight - 4})`)
                .attr("fill", uluColor)
                .attr("text-anchor", "start")
                .style("font-size", 12);
            bottomDetails.append("text")
                .text(`Subscribers (max): ${(subsm)}`)
                .attr("transform", `translate(${(fullWidth / 4) * 3 + 30}, ${fullHeight - 4})`)
                .attr('y', '-1.4em')
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12);
            bottomDetails.append("text")
                .text(`Session Drops (max): ${(subDropm)}`)
                .attr("transform", `translate(${(fullWidth / 4) * 3 + 30}, ${fullHeight - 4})`)
                .attr("fill", "#000")
                .attr("text-anchor", "start")
                .style("font-size", 12);
            let svgGraphArea = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
            let dataPlots = svgGraphArea.append('g');
            let i: number = 0;
            ap.metrics.forEach((metric) => {
                if (metric.axis == 0) {
                    dataPlots.selectAll(`.area${i}`)
                        .data([metric.values])
                        .enter()
                        .append("path")
                        .attr('fill', color[i])
                        .attr("d", area);
                }
                else {
                    dataPlots.selectAll(`.line${i}`)
                        .data([metric.values])
                        .enter()
                        .append("path")
                        .attr("stroke", color[i])
                        .attr("stroke-width", 1.5)
                        .attr("fill", "none")
                        .attr("d", line);
                }
                i += 1;
            });
            let axis = svgGraphArea.append('g')
                .attr("id", "axis")
                .attr("class", "axis");
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
                        return moment(new Date(d * 1000)).format("MM/DD h:mma");
                    }))
                .attr("fill", "#000");
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
                        return getReadableFileSizeString(d * 1024);
                    }))
                .attr("fill", "#000");
            axis.append('g')
                .attr("id", "y2")
                .attr("class", "y_axis")
                .attr("transform", `translate(${width}, 0)`)
                .call(d3
                    .axisRight(y2)
                    .ticks(4)
                    .tickSize(5)
                    .tickSizeOuter(0))
                .attr("fill", "#000");
            let svgLegend = svgGraphArea.append('g');
            let svgLegendEntryLeft = svgLegend.selectAll('.legend')
                .data(legendOrdinal.domain())
                .enter()
                .append('g')
                .attr("transform", (d, i) => { return "translate(10, " + (height - 30 - (i * 14)) + ")"; });
            svgLegendEntryLeft.append('rect')
                .attr('x', -5).attr('y', -5)
                .attr('width', 90)
                .attr('height', 14)
                .style('fill', 'white')
                .attr('fill-opacity', '0.6');
            svgLegendEntryLeft.append('rect')
                .attr("x", 0).attr("y", -2)
                .attr("width", 8)
                .attr("height", 8)
                .style("fill", (d, i) => { return color[i]; })
                .style("stroke-width", 1)
                .style("stroke", "black");
            svgLegendEntryLeft.append('text')
                .attr('transform', "translate(14, 5)")
                .text((d, i) => { return d; })
                .style("text-anchor", "start")
                .style("font-size", 10);
            let svgLegendEntryRight = svgLegend.selectAll('.legend')
                .data(legendOrdinal1.domain())
                .enter()
                .append('g')
                .attr("transform", (d, i) => { return "translate(" + (width - 14) + ", " + (height - 30 - (i * 14)) + ")"; });
            svgLegendEntryRight.append('rect')
                .attr('x', -80).attr('y', -5)
                .attr('width', 90)
                .attr('height', 14)
                .style('fill', 'white')
                .attr('fill-opacity', '0.6');
            svgLegendEntryRight.append('rect')
                .attr("x", -5).attr("y", -2)
                .attr("width", 8)
                .attr("height", 8)
                .style("fill", (d, i) => { return color[i + legendvals.length]; })
                .style("stroke-width", 1)
                .style("stroke", "black");
            svgLegendEntryRight.append('text')
                .attr('transform', "translate(-14, 5)")
                .text((d, i) => { return d; })
                .style("text-anchor", "end")
                .style("font-size", 10);
            svg.selectAll('#main_x g text').each(insertLinebreaks);
            resolve(window.select('.container').html().toString());
        }
        catch (err) {
            console.log(err.message);
            reject(err.message);
        }
    });
}
