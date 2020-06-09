const moment = require('moment')
import toml from 'toml'
import * as fs from 'fs'

class Configuration {	
	// General report items (days of report length)
	report: {
		days: number
		schedule: string | null
		deleteAfterEmail: boolean
	}

	// Branding details for report
	branding: {
		logo: string
		company: string
		color1: string
		color2: string
	}

	// Mail Config
	mail: {
		enable: boolean
		transport: {
			host: string
			port: number
			secure: boolean
			auth: {
				user: string
				pass: string
			}
			tls: {
				rejectUnauthorized: boolean
			}
		}
		to: string[]
		from: string
	}	

	// cnMastro Config
	cnmaestro: {
		client_id: string
		client_secret: string
		base_url: string
	}

	// EngageIP Config
	engageip: {
		enable: string
		username: string
    	password: string
		wsdlUrl: string
	}

	constructor() {
		let configFile = `config.toml`
		if (fs.existsSync(configFile)) {
			let confData = fs.readFileSync(configFile, 'utf8')
			let parsed = toml.parse(confData) as Configuration

			// Quickly load from TOML, no validation currently.
			this.report = parsed.report
			this.engageip = parsed.engageip
			this.cnmaestro = parsed.cnmaestro
			this.mail = parsed.mail
			this.branding = parsed.branding
		} else {
			throw 'Configuration (config.toml) not found!'
		}
	}




	// Below this should normally not need to be adjusted 

	// Below are not currently read from configuration file yet.
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
const start = moment().subtract(config.report.days, 'd').startOf('d') // Start 1 day ago at beginning of day
const reportHours = moment.duration(end.diff(start)).asHours()

// Some dates we use throughout the app in various formats
export const fileStartDate = start.format("YYYY-MM-DD")
export const fileEndDate = end.format("YYYY-MM-DD")
export const startTime = start.toISOString()
export const endTime = end.toISOString()

// Tag single day runs as the start date, tag multi day as start_end
export const fileDateTag = reportHours <= 24  ? fileStartDate : `${fileStartDate}_${fileEndDate}`

export const days = config.report.days
export const schedule = config.report.schedule
export const deleteAfterEmail = config.report.deleteAfterEmail

export const logoFile = config.branding.logo
export const company = config.branding.company
export const brandColor1 = config.branding.color1
export const brandColor2 = config.branding.color2

export const enableEip = config.engageip.enable
export const eipUsername = config.engageip.username
export const eipPassword = config.engageip.password
export const eipWsdlUrl = config.engageip.wsdlUrl

export const enableMail = config.mail.enable
export const toEmailAddress = config.mail.to
export const mailTransport = config.mail.transport
export const fromEmail = config.mail.from

export const clientid = config.cnmaestro.client_id
export const client_secret = config.cnmaestro.client_secret
export const baseURL = config.cnmaestro.base_url

export const color = config.color
export const color2 = config.color2
export const debug = config.debug
export const debugAmount = config.debugAmount
export const pdfFonts = config.pdfFonts
export const pdfStyles = config.pdfStyles