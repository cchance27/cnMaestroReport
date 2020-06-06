import { apiPerformance, apiStatistics } from './cnMaestroTypes';
import { calcCongestion } from "./congestion";
import { perfToBpHz } from './bitsPerHz';
import { maxMetricValue, meanMetricValue } from './cnMaestroMetricTools';
import { getReadableThroughput } from './myFunctions';

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

// PerfTable with better names to avoid having to rewrite them for the PDF Table
export function perfToTable(data: Map<string, apiPerformance[]>, stat: Map<string, apiStatistics[]>, allApProductTypes) {
    return Array.from(data.values())
        .map((perf: apiPerformance[]) => {
            // BPH calculations
            let bphDLvalues = perfToBpHz(perf, stat.get(perf[0].tower).filter((ap) => ap.name == perf[0].name)[0], true).map(v => v.value)
            let bphULvalues = perfToBpHz(perf, stat.get(perf[0].tower).filter((ap) => ap.name == perf[0].name)[0], false).map(v => v.value)
            let bphDLtotal = 0, bphULtotal = 0
            bphDLvalues.forEach(v => bphDLtotal += v)
            bphULvalues.forEach(v => bphULtotal += v)
            
            let name = perf[0].name
            let sms = maxMetricValue(perf, "sm_count", false)
            let type = allApProductTypes.get(perf[0].name).replace("PMP ", "")

            let dlmax = maxMetricValue(perf, "dl_throughput") * 1024
            let ulmax = maxMetricValue(perf, "ul_throughput") * 1024
            let dlumean = meanMetricValue(perf, "dl_frame_utilization")
            let ulumean = meanMetricValue(perf, "ul_frame_utilization")
            let dlmaxbph = Math.max(...bphDLvalues)
            let ulmaxbph = Math.max(...bphULvalues)
            let dlavgbph = isNaN(bphDLtotal / bphDLvalues.length) || undefined || null ? 0 : (bphDLtotal / bphDLvalues.length) 
            let ulavgbph = isNaN(bphULtotal / bphULvalues.length) || undefined || null ? 0 : (bphULtotal / bphULvalues.length)
            let dlbusyhr = calcCongestion(perf, "dl_frame_utilization", 90)
            let ulbusyhr = calcCongestion(perf, "ul_frame_utilization", 90)

            return ({
                "Name": { value: name, formatted: name },
                "SMs": { value: sms, formatted: sms },
                "Type": { value: type, formatted: type },

                "Download Throughput (Max)": { value: dlmax, formatted: getReadableThroughput(dlmax, 0) },
                "Download Usage (Mean)": { value: dlumean, formatted: `${dlumean.toFixed(1)}%`, alerted: type != '450m' && dlumean > 70 },
                "Download b/Hz (Max)": { value: dlmaxbph, formatted: dlmaxbph.toFixed(0), alerted: type == '450m' && dlmaxbph <= 5},
                "Download b/Hz (Avg)": { value: dlavgbph, formatted: dlavgbph.toFixed(0), alerted: type == '450m' && dlavgbph <= 5 },
                "Download Busy Hours": { value: dlbusyhr, formatted: `${dlbusyhr.toFixed(0)}%`, alerted: type != '450m' && dlbusyhr >= 20},

                "Upload Throughput (Max)": { value: ulmax, formatted: getReadableThroughput(ulmax, 0) },
                "Upload Usage (Mean)": { value: ulumean, formatted: `${ulumean.toFixed(1)}%`, alerted: type != '450m' && ulumean > 70 },
                "Upload b/Hz (Max)": { value: ulmaxbph, formatted: ulmaxbph.toFixed(0), alerted: type == '450m' && ulmaxbph <= 2},
                "Upload b/Hz (Avg)": { value: ulavgbph, formatted: ulavgbph.toFixed(0), alerted: type == '450m' && ulavgbph <= 2 },
                "Upload Busy Hours": { value: ulbusyhr, formatted: `${ulbusyhr.toFixed(0)}%`, alerted: type != '450m' && ulbusyhr >= 20 },
            })
        })
}
