# cnMaestroReport

Generates and emails a PDF report to administrators, overviewing all cnMaestro Sectors across the network with throughput and utilization.

To get started make sure you create your own src/config.ts with your own settings, an example is available in example.config.ts (rename and edit)

Once your config.ts is created, run "npm run exec" which will generate the pdf (Stored in same folder executed from), and send the email (if enabled) to the list of emails from the configuration file.

Some computers might need some build tools to build dependencies... 
choco install -y python2 gtk-runtime microsoft-build-tools libjpeg-turbo