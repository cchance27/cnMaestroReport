let moment = require('moment')

class Configuration {
	company = "TBD"
	brandColor1 = "#00cc00"
	brandColor2 = "#cc0000"
	logoFile = "c:/logo.jpg"	
	days = 1

	// Mail Config
	enableMail = false
	mailTransport = {
		host: "mail.mailserver.com",
		port: 587,
		secure: false,
		auth: {
			user: "username",
			pass: "password"
		},
		tls: {
			rejectUnauthorized: false
		}
	}
	toEmailAddress = [
		"Last, First <lfirst@something.com>", 
	]
	fromEmail = "noreply@somewhere.com"

	// cnMastro Config
	clientid = 'client-id'
	client_secret = 'client-secret'
	baseURL = 'https://cnmaestro.somewhere.com/api/v1'

	// EngageIP Config
	eipUsername = "eipusername"
    eipPassword = "eippassword"
	eipWsdlUrl = "http://engageIP.somewhere.com/Adminportal/webservice.asmx"



	// Below this should normally not need to be adjusted 

	// Report Config
	color = ["#a1bcce", "#c67377"]
	color2 = ["#2573a7", "#823034", "#000000", "#ff0000"]
	pdfStyles = {
        header: { fontSize: 14, bold: true },
        subHeader: { fontSize: 10, bold: false },
        frontHeader: { fontSize: 24, bold: true },
        frontDate: { fontSize: 12 },
		pageHeader: { fontSize: 22, bold: true, color: 'darkgrey' },
		pageDate: { fontSize: 24, font: 'DaxOTLight' },
        table: {
            margin: [0, 5, 0, 15]
        },
        tableHeader: {
            bold: true,
            fontSize: 8,
            color: 'black'
        },
        tableCell: {
            bold: false,
            fontSize: 8,
            color: 'black'
        }
    }
    pdfFonts = {
        Roboto: {
            normal: 'node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf',
            bold: 'node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf',
            italics: 'node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf',
            bolditalics: 'node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf'
		},
		DaxOT: {
			normal: 'fonts/DaxOT.ttf',
			bold: 'fonts/DaxOT-Bold.ttf',
			italics: 'fonts/DaxOT.ttf',
			bolditalics: 'fonts/DaxOT-Bold.ttf'
		},
		DaxOTLight: {
			normal: 'fonts/DaxOT-Light.ttf',
			bold: 'fonts/DaxOT-Bold.ttf',
			italics: 'fonts/DaxOT-Light.ttf',
			bolditalics: 'fonts/DaxOT-Bold.ttf'
		},
		DaxOTMedium: {
			normal: 'fonts/DaxOT-Medium.ttf',
			bold: 'fonts/DaxOT-Bold.ttf',
			italics: 'fonts/DaxOT-Medium.ttf',
			bolditalics: 'fonts/DaxOT-Bold.ttf'
		}
    }
	
	// Debug Config
	debug = false
	debugAmount = 2
}

const config = new Configuration()

const end = moment().startOf('d') // End beginning of today
const start = moment().subtract(config.days, 'd').startOf('d') // Start 1 day ago at beginning of day
const reportHours = moment.duration(end.diff(start)).asHours()

// Some dates we use throughout the app in various formats
export const fileStartDate = start.format("YYYY-MM-DD")
export const fileEndDate = end.format("YYYY-MM-DD")
export const startTime = start.toISOString()
export const endTime = end.toISOString()

// Tag single day runs as the start date, tag multi day as start_end
export const fileDateTag = reportHours <= 24  ? fileStartDate : `${fileStartDate}_${fileEndDate}`

export const company = config.company
export const brandColor1 = config.brandColor1
export const brandColor2 = config.brandColor2
export const mailTransport = config.mailTransport
export const eipUsername = config.eipUsername
export const eipPassword = config.eipPassword
export const eipWsdlUrl = config.eipWsdlUrl
export const enableMail = config.enableMail
export const toEmailAddress = config.toEmailAddress
export const days = config.days
export const clientid = config.clientid
export const client_secret = config.client_secret
export const baseURL = config.baseURL
export const color = config.color
export const color2 = config.color2
export const logoFile = config.logoFile
export const fromEmail = config.fromEmail
export const debug = config.debug
export const debugAmount = config.debugAmount
export const pdfFonts = config.pdfFonts
export const pdfStyles = config.pdfStyles