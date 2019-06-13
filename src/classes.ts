import { getReadableFileSizeString } from "./myFunctions";

export class AP {
    name: string
    mac: string
    type: string
    metrics: Array<metric>
}

export class metric {
    name: string
    values: Array<metricEntry>
    axis: number
    congestion: number
}

export class metricEntry {
    timestamp: number
    data: number
}

export class apEntry {
    name: string
    mac: string
    radio: Radio
}

export class Radio {
    channel_width: string
    tdd_ratio: string
}

export const columns = [
    { id: 'name', header: 'Sector', align: 'left', width: 80 },
    {
        id: 'sessions', header: 'SMs', align: 'center', width: 35, cache: false, renderer: function (tb, data, draw) {
            if (draw) {
                if (!data.sessions) data.sessions = 0
                tb.pdf.fillColor('black'); return data.sessions.toFixed(0)
            }
            return ``
        }
    },
    {
        id: 'DLmax', header: 'Downlink\n(max)', align: 'center', width: 60, cache: false, renderer: function (tb, data, draw) {
            if (draw) { tb.pdf.fillColor('black'); return getReadableFileSizeString(data.DLmax) }
            return ``
        }
    },
    {
        id: 'ULmax', header: 'Uplink\n(max)', align: 'center', width: 60, cache: false, renderer: function (tb, data, draw) {
            if (draw) { tb.pdf.fillColor('black'); return getReadableFileSizeString(data.ULmax) }
            return ``
        }
    },
    {
        id: 'meanUtilDL', header: 'DL Utilization\n(mean)', align: 'center', width: 65, cache: false, renderer: function (tb, data, draw) {
            if (draw) {
                if (!data.meanUtilDL) data.meanUtilDL = 0
                tb.pdf.fillColor("#000000")
                return (`${(Number(data.meanUtilDL)).toFixed(1)}%`)
            }
            return ``
        }
    },
    {
        id: 'meanUtilUL', header: 'UL Utilization\n(mean)', align: 'center', width: 65, cache: false, renderer: function (tb, data, draw) {
            if (draw) {
                if (!data.meanUtilUL) data.meanUtilUL = 0
                tb.pdf.fillColor("#000000")
                return (`${(Number(data.meanUtilUL)).toFixed(1)}%`)
            }
            return ``
        }
    },
    {
        id: 'bphDLmax', header: 'DL bits/hz\n(max/avg)', align: 'center', width: 55, cache: false, renderer: function (tb, data, draw) {
            if (draw) {
                if (!data.bphDLmax) data.bphDLmax = 0
                if (!data.bphDLmean) data.bphDLmean = 0
                tb.pdf.fillColor("#000000")
                return (`${Number(data.bphDLmax).toFixed(0)} / ${Number(data.bphDLmean).toFixed(0)}`)
            }
            return ``
        }
    },
    {
        id: 'bphULmax', header: 'UL bits/hz\n(max/avg)', align: 'center', width: 55, cache: false, renderer: function (tb, data, draw) {
            if (draw) {
                if (!data.bphULmax) data.bphULmax = 0
                if (!data.bphULmean) data.bphULmean = 0
                tb.pdf.fillColor("#000000")
                return (`${Number(data.bphULmax).toFixed(0)} / ${Number(data.bphULmean).toFixed(0)}`)
            }
            return ``
        }
    },
    {
        id: 'congestDL', header: 'DL Congest\n(hour %)', align: 'center', width: 60, cache: false, renderer: function (tb, data, draw) {
            if (draw) {
                if (!data.congestDL) data.congestDL = 0
                if (data.congestDL > 20) { tb.pdf.fillColor("#ff0000") } else if (data.congestDL > 0) { tb.pdf.fillColor("#ff9900") } else { tb.pdf.fillColor("#000000") }
                return `${Number(data.congestDL).toFixed(0)}%`
            }
            return ``
        }
    },
    {
        id: 'congestUL', header: 'UL Congest\n(hour %)', align: 'center', width: 60, cache: false, renderer: function (tb, data, draw) {
            if (draw) {
                if (!data.congestUL) data.congestUL = 0
                if (data.congestUL > 20) { tb.pdf.fillColor("#ff0000") } else if (data.congestUL > 0) { tb.pdf.fillColor("#ff9900") } else { tb.pdf.fillColor("#000000") }
                return `${Number(data.congestUL).toFixed(0)}%`
            }
            return ``
        }
    },
    {
        id: 'colorReset', header: '', align: 'center', width: 0, cache: false, renderer: function (tb, data, draw) {
            if (draw) {
                tb.pdf.fillColor("black")
                return ''
            }
            return ``
        }
    },
]