import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { logoFile, fileDateTag, fileStartDate, fileEndDate } from '../config';
import { apiPerformance } from '../cnMaestroTypes';
import { availChart } from '../charting';
import { getMetric } from '../cnMaestroMetricTools';
import { isCongested } from '../congestion';
import { addPdfHeading } from "../pdfFunctions";

export async function generateLiteReport(allApPerformance: Map<string, apiPerformance[]>) {
    let pdfSVGMargin: number = 35;
    let doc = new PDFDocument({
        margin: 10,
        info: {
            Title: "Canopy 450/450i AP Report",
            Author: "Automated Report"
        }
    });

    const writer = require('fs').createWriteStream(`${fileDateTag} - Lite Report.pdf`);
    doc.pipe(writer)
    doc.font('DaxOT.ttf')

    // Title page
    doc.image(logoFile, (doc.page.width / 2) - 88, (doc.page.height / 3) - 100);
    doc.fontSize('32').text("Canopy450 Performance Report", 0, 0.4 * (doc.page.height - doc.heightOfString("Canopy450 Performance Report", { width: doc.page.width, align: 'center' })), { width: doc.page.width, align: 'center' })
    doc.fontSize('12').text(`${fileStartDate} - ${fileEndDate}`, { width: doc.page.width, align: 'center' })
    
    let congestionValue = 90 // 90% usage or more is congested in a time period
    let pctForCongestion = 20 // 20% of time periods being congested means this sectors considered congested.

    doc = addPdfHeading("Downlink Congestion", `Utilization > ${congestionValue}% for over ${pctForCongestion}% of Report Period`, doc, true);
    doc = congestedAPAvailabilityTable(doc, allApPerformance, congestionValue, "dl_frame_utilization", pctForCongestion, pdfSVGMargin) // Generate our SVG table of Availability

    doc = addPdfHeading("Uplink Congestion", `Utilization > ${congestionValue}% for over ${pctForCongestion}% of Report Period`, doc, true);
    doc = congestedAPAvailabilityTable(doc, allApPerformance, congestionValue, "ul_frame_utilization", pctForCongestion, pdfSVGMargin) // Generate our SVG table of Availability

    doc.end();
}

// Generate a table of the availability Charts
function congestedAPAvailabilityTable(doc, allApPerformance: Map<string, apiPerformance[]>, congestionValue: number, metric: string, pctConsideredCongested: number, pdfSVGMargin: number) {
    let congestedAps = new Map([...allApPerformance].filter(([k, v]) => isCongested(getMetric(v, metric), congestionValue, pctConsideredCongested/100)))

    let capIndex = 0
    congestedAps.forEach(cAP => {
        let chart = availChart(cAP, metric, congestionValue, capIndex == 0, doc.page.width - 100)
        SVGtoPDF(doc, chart, pdfSVGMargin, (capIndex == 0 ? 40 : 110 + (15 * capIndex)), { assumePt: "false" })
        capIndex++;
    })

    return doc
}