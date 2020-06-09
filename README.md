# cnMaestroReport

Generates and emails a PDF report to administrators, overviewing all cnMaestro Sectors across the network with throughput and utilization.

To get started make sure you create your own config.toml (executed directory) with your own settings, an example is available in config.toml.example (rename and edit)

Once your config.toml is created, run "npm run exec" which will generate the pdf (Stored in same folder executed from), and send the email (if enabled) to the list of emails from the configuration file.

Some computers might need some build tools to build dependencies... (need to test if this is still true since migration to pdfmake)
choco install -y python2 gtk-runtime microsoft-build-tools libjpeg-turbo