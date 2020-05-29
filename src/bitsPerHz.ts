import { apiPerformance, apiStatistics } from './cnMaestroTypes';
import { metricEntry } from './columnsAndTypes';
let moment = require('moment')

// Calculate a instance of apiPerformance's Bits/Hz
function calcBpHz(perf: apiPerformance, stats: apiStatistics, downlink: boolean) {
    let hz: number = Number(stats.radio.channel_width.split(" ")[0]) * 1000;
    let DLframe: number = Number(stats.radio.tdd_ratio.split("/")[0]) / 100;
    
    const portionHz = downlink ? hz * DLframe : hz * (1 - DLframe);
    const throughput = downlink ? perf.radio.dl_throughput : perf.radio.ul_throughput;
    const utilization = downlink ? perf.radio.dl_frame_utilization : perf.radio.ul_frame_utilization;

    return ((throughput / (utilization / 100)) / portionHz) != Infinity ? ((throughput / (utilization / 100)) / portionHz) : 0;
}

// Convert an array of Bits/Hz to a Metric Array of Bits/hz
export function perfToBpHz(perf: apiPerformance[], stats: apiStatistics, downlink: boolean) {
    let metricResults: metricEntry[] = [];

    for (let i = 0; i < perf.length; i++) {
        metricResults.push({
            timestamp: moment(perf[i].timestamp),
            value: calcBpHz(perf[i], stats, downlink)
        });
    }
    return metricResults;
}