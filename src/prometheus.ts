import { getReadableThroughput } from './myFunctions'
import * as d3 from 'd3'
import { JSDOM } from 'jsdom'

let hoursAgo = 1
let url = 'http://192.168.127.244:9090'
let end = Math.round((new Date()).getTime() / 1000)
let start = end - (hoursAgo * 3600)
let step = '300'
let query = encodeURI('rate(ifOutOctets{ifIndex="1040",instance="172.16.0.107"}[2m])*8')
let query1 = encodeURI('rate(ifInOctets{ifIndex="1040",instance="172.16.0.107"}[2m])*8')


async function main() {
    let line1: any = await getContent(`${url}/api/v1/query_range?query=${query}&start=${start}&end=${end}&step=${step}`)
    let line2: any = await getContent(`${url}/api/v1/query_range?query=${query1}&start=${start}&end=${end}&step=${step}`)
    let values: [[number, number]] = [[0, 0]]

    values.pop()
    for (let vals of JSON.parse(line1).data.result[0].values) {
        let thisDate = new Date(vals[0] * 1000)
        values.push([vals[0], parseFloat(vals[1])])
    }

    var fs = require('fs');

    let outputLocation = 'test.svg';
    const window = d3.select((new JSDOM(`<html><head></head><body></body></html>`)).window.document)

    var margin = { top: 20, right: 20, bottom: 30, left: 50 },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    let x = d3.scaleTime().rangeRound([0, width])
    let y = d3.scaleLinear().rangeRound([height, 0]).nice();

    let area = d3.area()
        .x(function (d) { return x(d[0]) })
        .y0(height)
        .y1(function (d) { return y(d[1]) })

    let svg = window.select('body')
        .append('div').attr('class', 'container') //make a container div to ease the saving process
        .append('svg')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)


    x.domain(d3.extent(values, function (d) { return d[0] }))
    y.domain([0, d3.max(values, function (d) { return d[1] })])

    svg.append("path")
        .data([values])
        .attr('class', 'area')
        .attr('fill', 'steelblue')
        .attr("d", area)


    svg.append("g")
        .attr("transform", "translate(0, " + height + ")")
        .call(d3.axisBottom(x).tickFormat(function (d: number) { return new Date(d * 1000).toLocaleString() }))

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(function (d: number) { return getReadableThroughput(d) }))
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Bandwidth")


    fs.writeFileSync(outputLocation, window.select('.container').html())
}

const getContent = function (url: string) {
    // return new pending promise
    return new Promise((resolve, reject) => {
        // select http or https module, depending on reqested url
        const lib = url.startsWith('https') ? require('https') : require('http');
        const request = lib.get(url, (response: any) => {
            // handle http errors
            if (response.statusCode < 200 || response.statusCode > 299) {
                reject(new Error('Failed to load page, status code: ' + response.statusCode));
            }
            // temporary data holder
            const body: any = [];
            // on every content chunk, push it to the data array
            response.on('data', (chunk: any) => body.push(chunk));
            // we are done, resolve promise with those joined chunks
            response.on('end', () => resolve(body.join('')));
        });
        // handle connection errors of the request
        request.on('error', (err: Error) => reject(err))
    })
};

main()
