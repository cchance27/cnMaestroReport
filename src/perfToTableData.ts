import { apiPerformance, apiStatistics } from './cnMaestroTypes';
import { calcCongestion } from "./congestion";
import { perfToBpHz } from './bitsPerHz';
import { maxMetricValue, meanMetricValue } from './cnMaestroMetricTools';

export function perfToTableData(data: Map<string, apiPerformance[]>, stat: Map<string, apiStatistics[]>, allApProductTypes) {
    return Array.from(data.values())
        .map((perf: apiPerformance[]) => {
            // BPH calculations
            let bphDLvalues = perfToBpHz(perf, stat.get(perf[0].tower).filter((ap) => ap.name == perf[0].name)[0], true).map(v => v.value)
            let bphULvalues = perfToBpHz(perf, stat.get(perf[0].tower).filter((ap) => ap.name == perf[0].name)[0], false).map(v => v.value)
            let bphDLtotal = 0, bphULtotal = 0
            bphDLvalues.forEach(v => bphDLtotal += v)
            bphULvalues.forEach(v => bphULtotal += v)
            
            return ({
                name: perf[0].name,
                sessions: maxMetricValue(perf, "sm_count", false),
                type: allApProductTypes.get(perf[0].name).replace("PMP ", ""),
                DLmax: maxMetricValue(perf, "dl_throughput") * 1024,
                ULmax: maxMetricValue(perf, "ul_throughput") * 1024,
                meanUtilDL: meanMetricValue(perf, "dl_frame_utilization"),
                meanUtilUL: meanMetricValue(perf, "ul_frame_utilization"),
                bphDLmax: Math.max(...bphDLvalues),
                bphULmax: Math.max(...bphULvalues),
                bphDLavg: bphDLtotal / bphDLvalues.length,
                bphULavg:  bphULtotal / bphULvalues.length,
                congestUL: calcCongestion(perf, "ul_frame_utilization", 90),
                congestDL: calcCongestion(perf, "dl_frame_utilization", 90)
            });
        });
}
