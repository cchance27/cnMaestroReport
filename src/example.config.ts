let moment = require('moment')

class Configuration {
	// Mail Config
	enableMail = true
	mailTransport = {
		host: "mail.somedomain.com",
		port: 587,
		secure: false,
		auth: {
			user: "smtp-username",
			pass: "apassword"
		},
		tls: {
			rejectUnauthorized: false
		}
	}
	toEmailAddress = [
		"Last, First <someone@somewhere.com>", 
	]
	fromEmail = "noreply@something.com"

	// cnMastro Config
	clientid = 'from-cnmaestro-dashboard'
	client_secret = 'from-cnmaestro-dashboard'
	baseURL = 'https://onpremcnmaestro.domain.com/api/v1'

	// Report Config
	color = ["#a1bcce", "#c67377"]
	color2 = ["#2573a7", "#823034", "#000000", "#ff0000"]
	logoFile = "c:/users/somepath/cnMaestroReport/logo.jpg"	
	days = 1

	// EngageIP Config
	eipUsername = "owner-username"
    eipPassword = "owner-password"
	eipWsdlUrl = "http://engageip.domain/Adminportal/webservice.asmx"
	
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