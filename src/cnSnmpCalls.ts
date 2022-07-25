import { apiStatistics } from "./cnMaestroTypes";

let snmp = require('net-snmp');

function snmpWalk(ip, community, oid): any {
    let session = new snmp.createSession(ip, community, {version: snmp.Version2c})
    let values = []

    function feedCb (varbinds) {
        for (var i = 0; i < varbinds.length; i++) {
            if (snmp.isVarbindError (varbinds[i]))
                console.error (snmp.varbindError (varbinds[i]));
            else
                values.push(varbinds[i].value);
        }
    }
    
    return new Promise((resolve,reject) => {
        session.subtree(oid, 255, feedCb, (error) => {
            if (error) { 
                reject(error);
            } else { 
                resolve(values);
            }
        });
    });
}

export async function getSmDataRates(allApStatistics: Map<string, apiStatistics[]>) {
    for (let towerAndAps of allApStatistics) {
        for (let ap of towerAndAps[1]) {
            if (ap.status === "online") {
                console.log("SNMP SM Package Rates: " + ap.name)
                ap.uplinkRates = (await snmpWalk(ap.ip, "Canopyro", "1.3.6.1.4.1.161.19.3.1.4.1.38")).filter(x => x > 0 && x != 155000)
                ap.downlinkRates = (await snmpWalk(ap.ip, "Canopyro", "1.3.6.1.4.1.161.19.3.1.4.1.36")).filter(x => x > 0 && x != 155000)
            }
        }
        //return allApStatistics; // return just first tower for debugging.
    }
    return allApStatistics
}
