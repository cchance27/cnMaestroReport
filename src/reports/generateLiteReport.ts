import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { logoFile, fileDateTag, fileStartDate, fileEndDate } from '../config';
import { apiPerformance, apiSmStatistics } from '../cnMaestroTypes';
import { availChart, bubbleChart, donutChart, stackedBarChart } from '../charting';
import { getMetric } from '../cnMaestroMetricTools';
import { isCongested } from '../congestion';
import { addPdfHeading } from "../pdfFunctions";

export async function generateLiteReport(allApPerformance: Map<string, apiPerformance[]>, allSmStatistics: Map<string, apiSmStatistics[]>, allSmPackages: {package: string, sku: string, amount: number}) {
    let pdfSVGMargin: number = 35;
    let doc = new PDFDocument({
        margin: 10,
        info: {
            Title: "Canopy 450/450i AP Report",
            Author: "Automated Report"
        }
    });

    let file = `${fileDateTag} - Lite Report.pdf`
    const writer = require('fs').createWriteStream(file);
    doc.pipe(writer)
    doc.font('DaxOT.ttf')

    // Title page
    doc.image(logoFile, (doc.page.width / 2) - 88, (doc.page.height / 3) - 100);
    doc.fontSize('32').text("Canopy450 Performance Report", 0, 0.4 * (doc.page.height - doc.heightOfString("Canopy450 Performance Report", { width: doc.page.width, align: 'center' })), { width: doc.page.width, align: 'center' })
    doc.fontSize('12').text(`${fileStartDate} - ${fileEndDate}`, { width: doc.page.width, align: 'center' })
    
    let congestionValue = 90 // 90% usage or more is congested in a time period
    let pctForCongestion = 20 // 20% of time periods being congested means this sectors considered congested.

    addPdfHeading("Downlink Congestion", `Utilization > ${congestionValue}% for over ${pctForCongestion}% of Report Period`, doc, true);
    congestedAPAvailabilityTable(doc, allApPerformance, congestionValue, "dl_frame_utilization", pctForCongestion, pdfSVGMargin) // Generate our SVG table of Availability

    addPdfHeading("Uplink Congestion", `Utilization > ${congestionValue}% for over ${pctForCongestion}% of Report Period`, doc, true);
    congestedAPAvailabilityTable(doc, allApPerformance, congestionValue, "ul_frame_utilization", pctForCongestion, pdfSVGMargin) // Generate our SVG table of Availability

    addPdfHeading("Site Valuation", "Monthly Canopy Revenue by EIP Package Cost", doc, true)
    let siteValues = []
    let siteValues2 = []
    allSmStatistics.forEach((sms: apiSmStatistics[], site: string) => {
        // If the sm exists add it to the sm total for this AP, if not don't add anything to total
        let val = sms.reduce((agg, sm) => { return (allSmPackages[sm.mac]) ? Number(allSmPackages[sm.mac].amount) + agg : agg }, 0)
        if (val > 0) {
            // fix this as why pass 2 values we should just pass the same for all charts that can take name/value
            siteValues.push({
                "className": site, 
                "packageName": site,
                "value": val
            })
            siteValues2.push({
                "name": site,
                "value": val
            })
        }
    })
    SVGtoPDF(doc, bubbleChart(siteValues, 780), pdfSVGMargin, 80)
    
    let thisTowerApSms: Map<string, apiSmStatistics[]> = new Map([...allSmStatistics]
        .filter(([k, v]) => v.length > 0 && v[0].tower == 'Atrium')) // Check if this site has APs and if this is one of our APs return it's SMs
    
    // [{Name: number, total: number , ...Columns...: number}
    let APs = {}
    thisTowerApSms.forEach((sms: apiSmStatistics[], site: string) => {
        sms.forEach(sm => {
            if (!APs[sm.ap_mac]) { APs[sm.ap_mac] = {} }
            
            if (allSmPackages[sm.mac]) { 
                if (!APs[sm.ap_mac][allSmPackages[sm.mac]]) { 
                    APs[sm.ap_mac][allSmPackages[sm.mac].package] = 0 
                } 
                APs[sm.ap_mac][allSmPackages[sm.mac].package] += allSmPackages[sm.mac].amount
            }
        })
    })

    let apData = []
    Object.keys(APs).forEach(ap => {
        let totalValue = 0
        Object.keys(APs[ap]).forEach(v => {
            totalValue += APs[ap][v]
        })
        
        apData.push({
            "name": ap, 
               total: totalValue,
               ...APs[ap]
        })
    })

    doc.addPage()
    SVGtoPDF(doc, stackedBarChart(apData, 700, 300), pdfSVGMargin, 80)


    doc.end()
    return file
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