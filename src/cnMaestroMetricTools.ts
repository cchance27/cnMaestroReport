import { apiPerformance } from './cnMaestroTypes'
import { metricEntry } from './columnsAndTypes'
import * as d3 from 'd3';

let moment = require('moment')

export function getMetric(perf: apiPerformance[], metric: string, radio: boolean = true): Array<metricEntry> {
    return perf.map((p: apiPerformance) => {
        if (radio) {
            if (p.radio && Object.keys(p.radio).indexOf(metric) >= 0) {
                // If the Radio exists and the Metric in the radio exists
                return {timestamp: moment.parseZone(p.timestamp).format('X'), value: p.radio[metric]}
            } else { 
                // This metric is missing the radio attribute or the actual metric in the radio somehow, so return 0
                return {timestamp: moment.parseZone(p.timestamp).format('X'), value: 0 }
            }
        } else {
            if (p && Object.keys(p).indexOf(metric) >= 0) {
                // We don't have this metric or somehow the performance doesn't exist?
                return {timestamp: moment.parseZone(p.timestamp).format('X'), value: p[metric]}
            } else {
                // We don't have this metric return 0
                return {timestamp: moment.parseZone(p.timestamp).format('X'), value: 0}
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