# cnMaestroReport
![Docker Image CI](https://github.com/cchance27/cnMaestroReport/workflows/Docker%20Image%20CI/badge.svg)

Generates and emails a PDF report to administrators, overviewing all cnMaestro Sectors across the network with throughput and utilization.

To get started make sure you create your own config.toml (executed directory) with your own settings, an example is available in config.toml.example (rename and edit)

To get things running just...
*   Copy and configure config.toml
*   npm run build:dist
*   npm run start:dist 

Some computers might need some build tools to build dependencies... (need to test if this is still true since migration to pdfmake)
choco install -y python2 gtk-runtime microsoft-build-tools libjpeg-turbo

Chances are you won't be able to use the EngageIP functions, as it requires a pretty custom version of EngageIP and webservice.

I'll be looking into offering a interface to build your own section to replace the engageipApiCalls.ts that currently does the lookups for client package costs in third party API/systems.
