let moment = require('moment')

class Configuration {
    smtpHost = "yourmail.yourdomain"
    smtpPort = 25
	sendMail = false
	toEmailAddress = ["admin@yourdomain.com", "anotheradmin@yourdomain.com"]
	fromEmail = "noreply@yourdomain.tld"
	days = 7
	clientid = 'generate-in-cnmaestro'
	client_secret = 'generate-in-cnmaestro'
	baseURL = 'https://cnmaestro.localdomain/api/v1'
	color = ["#a1bcce", "#c67377"]
	color2 = ["#2573a7", "#823034", "#000000", "#ff0000"]
	logoFile = "c:/xxx/cnMaestroReport/logo.jpg"
	eipUsername = "owner-username"
    eipPassword = "owner-password"
    eipWsdlUrl = "http://engageip.url/Adminportal/webservice.asmx"
	debug = false
}
const config = new Configuration();

const end = moment().startOf('d'); // End beginning of today
const start = moment().subtract(config.days, 'd').startOf('d') // Start 1 day ago at beginning of day
const reportHours = moment.duration(end.diff(start)).asHours()

// Some dates we use throughout the app in various formats
export const fileStartDate = start.format("YYYY-MM-DD")
export const fileEndDate = end.format("YYYY-MM-DD")
export const startTime = start.toISOString()
export const endTime = end.toISOString()

// Tag single day runs as the start date, tag multi day as start_end
export const fileDateTag = reportHours <= 24  ? fileStartDate : `${fileStartDate}_${fileEndDate}`
export const eipUsername = config.eipUsername
export const eipPassword = config.eipPassword
export const eipWsdlUrl = config.eipWsdlUrl
export const smtpHost = config.smtpHost;
export const smtpPort = config.smtpPort;
export const sendMail = config.sendMail;
export const toEmailAddress = config.toEmailAddress;
export const days = config.days;
export const clientid = config.clientid;
export const client_secret = config.client_secret;
export const baseURL = config.baseURL;
export const color = config.color;
export const color2 = config.color2;
export const logoFile = config.logoFile;
export const fromEmail = config.fromEmail;
export const debug = config.debug;