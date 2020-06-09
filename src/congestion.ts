import { apiPerformance } from './cnMaestroTypes'
import { getMetric, metricEntry } from './cnMaestroMetricTools'

export function calcCongestion(perf: apiPerformance[], field: string, saturation: number) {
    let metric = getMetric(perf, field);
    let congested = metric.filter(m => m.value > saturation).length;
    let total = metric.length;
    return (congested / total) * 100;
}

export function isCongested(metric: Array<metricEntry>, saturationValue: number, pctConsideredCongested: number): boolean{
    if (metric.length == 0) {
        return false;
    }
    
    return Number((metric.filter((d) => d && d.value >= saturationValue).length / metric.length)) > pctConsideredCongested;
}
