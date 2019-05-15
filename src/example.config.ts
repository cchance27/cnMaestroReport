class Configuration {
    smtpHost = "yourmail.yourdomain"
    smtpPort = 25
	sendMail = true
	toEmailAddress = ["admin@yourdomain.com", "anotheradmin@yourdomain.com"]
	days = 7
	clientid = 'generate-in-cnmaestro'
	client_secret = 'generate-in-cnmaestro'
	baseURL = 'https://cnmaestro.localdomain/api/v1'
	color = ["#a1bcce", "#c67377", "#449bd6", "#ad4045", "#001dff", "#a01118", "#14ce00", "#d2e2d0"]
	logoFile = "LogoImageToUseInRootFolder.png"
}

const config = new Configuration();

export const smtpHost = config.smtpHost;
export const smtpPort = config.smtpPort;
export const sendMail = config.sendMail;
export const toEmailAddress = config.toEmailAddress;
export const days = config.days;
export const clientid = config.clientid;
export const client_secret = config.client_secret;
export const baseURL = config.baseURL;
export const color = config.color;
export const logoFile = config.logoFile;