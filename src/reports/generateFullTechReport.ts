import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import PdfTable from 'voilab-pdf-table';
import { logoFile, fileStartDate, fileEndDate } from '../config';
import { columns } from '../columnsAndTypes';
import { apiTower, apiStatistics, apiPerformance, apiSmStatistics } from '../cnMaestroTypes';
import { graph } from '../charting';
import { getMetric } from '../cnMaestroMetricTools';
import { perfToTableData } from '../perfToTableData';
import { isCongested } from '../congestion';
import { fileDateTag } from '../config';
import { addPdfHeading } from "../pdfFunctions";
import { formatNumber } from '../myFunctions';

export async function generateFullTechReport(allApPerformance: Map<string, apiPerformance[]>, allApProductTypes: Map<string, string[]>, allApStatistics: Map<string, apiStatistics[]>, towers: apiTower[], allSmStatistics: Map<string, apiSmStatistics[]>, allSmPackages) {
    let pdfSVGMargin: number = 35;
    let pdfSVGloc: Array<Number> = [40, 290, 550];

    let doc = new PDFDocument({
        margin: 10,
        info: {
            Title: "cnMaestro AP Full Report",
            Author: "Automated Report"
        }
    });

    let congestionValue = 90; // 90% usage or more is congested
    
    const writer = require('fs').createWriteStream(`${fileDateTag} - cnMaestro Tech Report.pdf`);
    doc.font('DaxOT.ttf');
    doc.pipe(writer);

    // Front page
    doc.image(logoFile, (doc.page.width / 2) - 88, (doc.page.height / 3) - 100);
    doc.fontSize('32').text("Canopy Full Performance Report", 0, 0.4 * (doc.page.height - doc.heightOfString("Canopy Full Performance Report", { width: doc.page.width, align: 'center' })), { width: doc.page.width, align: 'center' });
    doc.fontSize('12').text(`${fileStartDate} - ${fileEndDate}`, { width: doc.page.width, align: 'center' });

    // Setup table for usage on table pages
    let table = new PdfTable(doc, { bottomMargin: 20 });
    table.addColumns(columns);

    // Downlink Congestion Page
    doc = addPdfHeading("Downlink Congestion Overview", "Sectors with over 20% of downlink hours congested", doc, true);
    let congestDL = perfToTableData(new Map([...allApPerformance].filter(([k, v]) => isCongested(getMetric(v, "dl_frame_utilization"), congestionValue, 0.2))), allApStatistics, allApProductTypes);
    table.addBody(congestDL.filter((a) => a.congestDL > 20).sort((a, b) => (a.congestDL - b.congestDL)).reverse());

    // Uplink Congestion page
    doc = addPdfHeading("Uplink Congestion Overview", "Sectors with over 20% of uplink hours congested", doc, true);
    let congestUL = perfToTableData(new Map([...allApPerformance].filter(([k, v]) => isCongested(getMetric(v, "ul_frame_utilization"), congestionValue, 0.2))), allApStatistics, allApProductTypes);
    table.addBody(congestUL.filter((a) => a.congestUL > 20).sort((a, b) => (a.congestUL - b.congestUL)).reverse());
    let svgs = {};

    // Generate SVGs for Available Towers->APs
    towers.forEach(tower => {
        svgs[tower.name] = [];
        let thisTowerAps: Map<string, apiPerformance[]> = new Map([...allApPerformance].filter(([k, v]) => v[0].tower == tower.name && v[0].radio));
        thisTowerAps.forEach((ap: apiPerformance[]) => svgs[tower.name].push(graph(ap, allApStatistics.get(tower.name), allApProductTypes, 90, 0.2)));
    });

    // SVG Pages
    let svgPosition: number = 0;
    let thisSVGPosition: number = 0;
    for (let svgTower in svgs) {
        // Loop through towers
        for (let svg in svgs[svgTower]) {
            // Loop through svg's for this tower
            if (svgPosition == 0) {

                let totalValue = allSmStatistics.get(svgTower)
                    .reduce((agg, sm) => {
                        // If EIP for some reason isn't returning a value we need to skip that one (just count it as 0$)
                        return (allSmPackages[sm.mac]) ? Number(allSmPackages[sm.mac].amount) + agg : agg
                    }, 0)
                                    // New Tower (So make a table frontpage)
                console.log(`New Tower Page: ${svgTower}`)
                doc.addPage()
                doc.image(logoFile, (doc.page.width / 2) - 88, (doc.page.height / 3) - 100)
                doc.fontSize('32')
                doc.text(svgTower, 0, 0.4 * (doc.page.height - doc.heightOfString(svgTower, { width: doc.page.width, align: 'center' })), { width: doc.page.width, align: 'center' })
                doc.text(" ")
                doc.fontSize('12')
                doc.text(`Total Revenue: $${formatNumber(totalValue.toFixed(2))}/month`, { align: 'center' })
                doc.text(" ")
                doc.fontSize('8')
                let towerPanels = perfToTableData(new Map([...allApPerformance].filter(([k, v]) => v[0].tower == svgTower)), allApStatistics, allApProductTypes);
                table.addBody(towerPanels)
            }
            if (svgPosition % 3 == 0) {
                // New page but not a first page.
                console.log(`New SVG Page`);
                doc.addPage();
                doc.fillColor('lightgrey');
                doc.fontSize('18');
                doc.text(svgTower, 20, 15);
                doc.text(fileStartDate, 500, 15);
                thisSVGPosition = 0;
            }
            console.log(`Adding SVG: ${svgTower} - ${svg} - ${pdfSVGloc[thisSVGPosition]}`);
            SVGtoPDF(doc, svgs[svgTower][svg], pdfSVGMargin, pdfSVGloc[thisSVGPosition]);
            svgPosition += 1;
            thisSVGPosition += 1;
        }
        svgPosition = 0;
    }
    doc.end();
}
