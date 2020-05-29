import { apiPerformance } from './cnMaestroTypes'
import { metricEntry } from './columnsAndTypes'
import * as d3 from 'd3';

let moment = require('moment')

export function getMetric(perf: apiPerformance[], metric: string, radio: boolean = true): Array<metricEntry> {
    return perf.map((p: apiPerformance) => {
        if (radio) {
            if (p.radio && Object.keys(p.radio).indexOf(metric) >= 0) {
                return {timestamp: moment.parseZone(p.timestamp).format('X'), value: p.radio[metric]}
            }
        } else {
            if (p && Object.keys(p).indexOf(metric) >= 0) {
                return {timestamp: moment.parseZone(p.timestamp).format('X'), value: p[metric]}
            }
        }
    });
}

export function maxMetricValue(perf: apiPerformance[], metric: string, radio: boolean = true) {
    return d3.max(getMetric(perf, metric, radio).map(d => d.value))
} 

export function meanMetricValue(perf: apiPerformance[], metric: string, radio: boolean = true) {
    return d3.mean(getMetric(perf, metric, radio).map(d => d.value))
} 