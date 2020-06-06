import { fromEmail, toEmailAddress, fileDateTag, mailTransport, enableMail } from "./config";
import { getReadableThroughput } from "./myFunctions";
import * as nodemailer from 'nodemailer'

export async function sendEmail(attachments: string[], content: string, title: string) {
    var html=`<h2>Weekly Report attached.</h2>`
    html += content
    let transporter = nodemailer.createTransport(mailTransport, { from: fromEmail })

    let message = {
        to: toEmailAddress,
        from: fromEmail,
        subject: `cnMaesto Report 📊 (${fileDateTag})`,
        text: content,
        html: html,
        attachments: attachments.map(f => ({ filename: f, path: f, cid: f }))
    }

    let resp = await transporter.sendMail(message)
    console.log('Message sent successfully!')
    transporter.close();
}

export async function sendEmailReport(attachments) {
    if (enableMail) {
        let content = `Please find attached the Automated Report generated from cnMaestro API Data.`

        console.log(`Sending E-Mail Report: ${toEmailAddress.join(", ")}...`)
        return await sendEmail(attachments, content, `CnMaestro Report (${fileDateTag})`)
    } else {
        console.log(`Mail Disabled in Configuration`)
    }
}

// Not used yet but was used before for generating some tables for the email previously maybe in the future when refactored to be generic
export const generateHTMLTable = function (data, title: string, topN: number, maxTop: boolean, field: string, minValue: number): string {
    let filtered = data.filter((f) => { return f[field] > minValue })
    filtered = filtered.sort((a, b) => { return (a[field] - b[field]) })
    if (maxTop) { filtered = filtered.reverse() }
    filtered = filtered.slice(0, topN)

    let html = `
        <b>${title}</b>
        <table border='1|1' style='text-align:center; font-family:calibri'>
        <tr>
            <td>Sector</td>
            <td>SMs</td>
            <td>Type</td>
            <td>Downlink<br/>(Max)</td>
            <td>Uplink<br/>(Max)</td>
            <td>DL Utilization<br/>(Mean)</td>
            <td>UL Utilization<br/>(Mean)</td>
            <td>DL Bits/Hz<br/>(Max/Mean)</td>
            <td>UL Bits/Hz<br/>(Max/Mean)</td>
            <td>DL Congestion<br/>(Hour %)</td>
            <td>UL Congestion<br/>(Hour %)</td>
        </tr>
        `
    for (let i = 0; i < filtered.length; i++) {
        html += `
            <tr>
                <td>${filtered[i].name}</td>
                <td>${Number(filtered[i].sessions).toFixed(0)}</td>
                <td>${filtered[i].type}</td>
                <td>${getReadableThroughput(filtered[i].DLmax)}</td>
                <td>${getReadableThroughput(filtered[i].ULmax)}</td>
                <td>${Number(filtered[i].meanUtilDL).toFixed(1)}%</td>
                <td>${Number(filtered[i].meanUtilUL).toFixed(1)}%</td>
                <td>${Number(filtered[i].bphDLmax).toFixed(0)}/${Number(filtered[i].bphDLmean).toFixed(0)}</td>
                <td>${Number(filtered[i].bphULmax).toFixed(0)}/${Number(filtered[i].bphULmean).toFixed(0)}</td>
                <td>${Number(filtered[i].congestDL).toFixed(0)}%</td>
                <td>${Number(filtered[i].congestUL).toFixed(0)}%</td>
            </tr>
            `
    }
    html += `</table>`
    return html
}