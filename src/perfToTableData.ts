import { apiPerformance, apiStatistics } from './cnMaestroTypes';
import { calcCongestion } from "./congestion";
import { perfToBpHz } from './bitsPerHz';
import { maxMetricValue, meanMetricValue } from './cnMaestroMetricTools';
import { getReadableThroughput } from './myFunctions';

// PerfTable with better names to avoid having to rewrite them for the PDF Table
export function perfToTable(data: Map<string, apiPerformance[]>, stat: Map<string, apiStatistics[]>, allApProductTypes) {
    let result = Array.from(data.values())
        .map((perf: apiPerformance[]) => {
            if (perf.length === 0) return null // Edge case where we have a Device with no performance data

            // BPH calculations
            let bphDLvalues = perfToBpHz(perf, stat.get(perf[0].tower).filter((ap) => ap.name == perf[0].name)[0], true).map(v => v.value)
            let bphULvalues = perfToBpHz(perf, stat.get(perf[0].tower).filter((ap) => ap.name == perf[0].name)[0], false).map(v => v.value)
            let bphDLtotal = 0, bphULtotal = 0
            bphDLvalues.forEach(v => bphDLtotal += v)
            bphULvalues.forEach(v => bphULtotal += v)
            
            let name = perf[0].name
            let type = allApProductTypes.get(perf[0].name).replace("PMP ", "")

            let dlmax = maxMetricValue(perf, "dl_throughput") * 1024
            let ulmax = maxMetricValue(perf, "ul_throughput") * 1024
        
            let dlprovisioned = 0;
            let ulprovisioned = 0;
            let thisPerf = stat.get(perf[0].tower).filter(x => x.name === perf[0].name)[0];
            
            if (thisPerf.downlinkRates != undefined)
                dlprovisioned = stat.get(perf[0].tower).filter(x => x.name === perf[0].name)[0].downlinkRates.reduce((total, current) => total + current, 0) * 1024;
            
            if (thisPerf.uplinkRates != undefined)
                ulprovisioned = stat.get(perf[0].tower).filter(x => x.name === perf[0].name)[0].uplinkRates.reduce((total, current) => total + current, 0) * 1024;

            let sms = thisPerf.downlinkRates?.length ?? maxMetricValue(perf, "sm_count", false)

            let dlumean = meanMetricValue(perf, "dl_frame_utilization")
            let ulumean = meanMetricValue(perf, "ul_frame_utilization")
            //let dlmaxbph = Math.max(...bphDLvalues)
            //let ulmaxbph = Math.max(...bphULvalues)
            let dlavgbph = isNaN(bphDLtotal / bphDLvalues.length) || undefined || null ? 0 : (bphDLtotal / bphDLvalues.length) 
            let ulavgbph = isNaN(bphULtotal / bphULvalues.length) || undefined || null ? 0 : (bphULtotal / bphULvalues.length)
            let dlbusyhr = calcCongestion(perf, "dl_frame_utilization", 90)
            let ulbusyhr = calcCongestion(perf, "ul_frame_utilization", 90)

            // Usage
            //let ip = stat.get(perf[0].tower).filter((ap) => ap.name == perf[0].name)[0].ip
            //let bwUsageTotals = apBandwidths.get(ip)

            // Band
            let frequency = stat.get(perf[0].tower).filter((ap) => ap.name == perf[0].name)[0].radio.frequency
            if (frequency > 0) { 
                frequency = frequency > 5000 ? 5 : 3
            }

            return ({
                "Name": { value: name, formatted: name.replace("SXM", "") },
                "SMs": { value: sms, formatted: sms },
                "Type": { value: type, formatted: type },
                "Band": { value: frequency, formatted: frequency },

                "Download (Max)": { value: dlmax, formatted: getReadableThroughput(dlmax, 0) },
                "Download Provision": { value: dlprovisioned, formatted: getReadableThroughput(dlprovisioned, 0)},
                "Download Frame (Avg)": { value: dlumean, formatted: `${dlumean.toFixed(1)}%`, alerted: type != '450m' && dlumean > 70 },
                //"Download Usage (Total)": {value: bwUsageTotals.DL, formatted: getReadableDataSize(bwUsageTotals.DL, 0, 1000)},
                //"Download b/Hz (Max)": { value: dlmaxbph, formatted: dlmaxbph.toFixed(0), alerted: type == '450m' && dlmaxbph <= 5},
                "Download b/Hz (Avg)": { value: dlavgbph, formatted: dlavgbph.toFixed(0), alerted: type == '450m' && dlavgbph <= 5 },
                "Download Busy Hours": { value: dlbusyhr, formatted: `${dlbusyhr.toFixed(0)}%`, alerted: type != '450m' && dlbusyhr >= 20},

                "Upload (Max)": { value: ulmax, formatted: getReadableThroughput(ulmax, 0) },
                "Upload Provision": { value: ulprovisioned, formatted: getReadableThroughput(ulprovisioned, 0)},
                "Upload Frame (Avg)": { value: ulumean, formatted: `${ulumean.toFixed(1)}%`, alerted: type != '450m' && ulumean > 70 },
                //"Upload Usage (Total)": {value: bwUsageTotals.UL, formatted: getReadableDataSize(bwUsageTotals.UL, 0, 1000)},
                //"Upload b/Hz (Max)": { value: ulmaxbph, formatted: ulmaxbph.toFixed(0), alerted: type == '450m' && ulmaxbph <= 2},
                "Upload b/Hz (Avg)": { value: ulavgbph, formatted: ulavgbph.toFixed(0), alerted: type == '450m' && ulavgbph <= 2 },
                "Upload Busy Hours": { value: ulbusyhr, formatted: `${ulbusyhr.toFixed(0)}%`, alerted: type != '450m' && ulbusyhr >= 20 },
            })
        })
        
        return result.filter(x => x !== null) // Edge case cleanup for missing performance
}

// PerfTable with better names to avoid having to rewrite them for the PDF Table
export function perfToOversubTable(data: Map<string, apiPerformance[]>, stat: Map<string, apiStatistics[]>, allApProductTypes) {
    let result = Array.from(data.values())
        .map((perf: apiPerformance[]) => {
            if (perf.length === 0 || perf === undefined) return null // Edge case where we have a Device with no performance data)
            let name = perf[0].name
            let type = allApProductTypes.get(perf[0].name).replace("PMP ", "")
       
            let dlprovisioned = 0;
            let ulprovisioned = 0;
            let thisStats = stat.get(perf[0].tower).filter(x => x.name === perf[0].name);
            let thisStat = thisStats[0];
            
            if (thisStat.downlinkRates != undefined)
                dlprovisioned = thisStat.downlinkRates.reduce((total, current) => total + current, 0) * 1024;
            
            if (thisStat.uplinkRates != undefined)
                ulprovisioned = thisStat.uplinkRates.reduce((total, current) => total + current, 0) * 1024;

            //let sms = thisStat.downlinkRates?.length ?? maxMetricValue(perf, "sm_count", false)

            // Band
            //let frequency = stat.get(perf[0].tower).filter((ap) => ap.name == perf[0].name)[0].radio.frequency
            //if (frequency > 0) { 
            //    frequency = frequency > 5000 ? 5 : 3
            //}
            //if (name == "SXMMDR450-02")
            //    console.log(name)

            for(let i of perf)
            {
                if (i.radio != undefined && i.radio.dl_frame_utilization == 0)
                    i.radio.dl_frame_utilization += 0.01          
                if (i.radio != undefined && i.radio.ul_frame_utilization == 0)
                    i.radio.ul_frame_utilization += 0.01            
            }
            let qam256MaxDL = (type == "450m" ? 250 : 100) * 1024 * 1024;
            let qam256MaxUL = (type == "450m" ?  50 : 20) * 1024 * 1024;
            let perfWithRadio = perf.filter(x => x.radio != undefined)
            let sortedDlTput = perfWithRadio.sort((a: apiPerformance, b: apiPerformance) => {return b.radio.dl_throughput - a.radio.dl_throughput})
            let sortedUlTput = perfWithRadio.sort((a: apiPerformance, b: apiPerformance) => {return b.radio.ul_throughput - a.radio.ul_throughput})
            let safeDlProvisioned = dlprovisioned > 0 ? dlprovisioned : 1
            let safeUlProvisioned = ulprovisioned > 0 ? ulprovisioned : 1
            let safeDlMax = sortedDlTput[0] == undefined || sortedDlTput[0].radio == undefined ? [0, 0] : [sortedDlTput[0].radio.dl_throughput * 1024, sortedDlTput[0].radio.dl_frame_utilization]
            let safeUlMax = sortedUlTput[0] == undefined || sortedUlTput[0].radio == undefined ? [0, 0] : [sortedUlTput[0].radio.ul_throughput * 1024, sortedUlTput[0].radio.ul_frame_utilization]
            //console.log(sortedDlTput[0].radio.dl_throughput, sortedDlTput[0].radio.dl_frame_utilization, sortedDlTput[0].radio.dl_frame_utilization /100, sortedDlTput[0].radio.dl_throughput / (sortedDlTput[0].radio.dl_frame_utilization / 100) * 1024)
            let x = {
                "Name": { value: name, formatted: name.replace("SXM", "") },
                "Type": { value: type, formatted: type },
                "Download Provision Total": { value: dlprovisioned, formatted: getReadableThroughput(dlprovisioned, 0)},
                "Download Est. Max @256QAM": { value: qam256MaxDL, formatted: getReadableThroughput(qam256MaxDL, 0)},
                "Download Max Mbps (Frame%)": { value: safeDlMax[0], formatted: `${getReadableThroughput(safeDlMax[0], 0)}\n(${Math.ceil(safeDlMax[1])}%)`},
                "Download Oversub @256QAM": { value: safeDlProvisioned/qam256MaxDL, formatted: Math.ceil(safeDlProvisioned/qam256MaxDL) + ":1"},
                "Upload Provision Total": { value: ulprovisioned, formatted: getReadableThroughput(ulprovisioned, 0)},
                "Upload Est. Max @256QAM": { value: qam256MaxUL, formatted: getReadableThroughput(qam256MaxUL, 0)},
                "Upload Max Mbps (Frame%)": { value: safeUlMax[0], formatted: `${getReadableThroughput(safeUlMax[0], 0)} (${Math.ceil(safeUlMax[1])}%)`},
                "Upload Oversub @256QAM": { value: safeUlProvisioned/qam256MaxUL, formatted: Math.ceil(safeUlProvisioned/qam256MaxUL) + ":1"},
            }
            return x;
        })
        return result.filter(x => x !== null) // Edge case cleanup for missing performance
}
