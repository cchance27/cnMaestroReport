# cnMaestroReport
![Docker Build](https://github.com/cchance27/cnMaestroReport/workflows/Docker%20Build/badge.svg) ![Docker Automation](https://img.shields.io/docker/automated/phantam/cnmaestro-report)

Generates and emails a PDF report to administrators, overviewing all cnMaestro Sectors across the network with throughput and utilization.

To get started make sure you create your own config.toml (executed directory) with your own settings, an example is available in config.toml.example (rename and edit)

To get things running just...
*   Copy and configure config.toml
*   npm run build:dist
*   npm run start:dist 

Some computers might need some build tools to build dependencies... (need to test if this is still true since migration to pdfmake)
*   choco install -y python2 gtk-runtime microsoft-build-tools libjpeg-turbo

Chances are you won't be able to use the EngageIP functions, as it requires a pretty custom version of EngageIP and webservice. However if you would like to try get in contact with your Logisense Support to have a Custom Report added that we will utilize for calls via the Webservice.

> SELECT u.[Name] AS ClientName, pa.Value AS Answer, srv.[Name] AS Service, srv.BaseFee AS Value, upkg.NextBillDate as ExpDate FROM dbo.ServiceAttributeProfileQuestion sapq with (nolock) INNER JOIN dbo.ProfileQuestion pq with (nolock) ON sapq.ProfileQuestionID = pq.ID INNER JOIN dbo.ProfileAnswer pa with (nolock) ON pq.ID = pa.ProfileQuestionID INNER JOIN dbo.Service srv with (nolock) ON sapq.ServiceID = srv.ID INNER JOIN dbo.UserService usrv with (nolock) ON srv.ID = usrv.ServiceID INNER JOIN dbo.UserServiceAttributeProfileAnswer usapa with (nolock) ON sapq.ID = usapa.ServiceAttributeProfileQuestionID AND pa.ID = usapa.ProfileAnswerID AND usrv.ID = usapa.UserServiceID INNER JOIN dbo.UserPackage upkg with (nolock) ON usrv.UserPackageID = upkg.ID INNER JOIN dbo.[User] u with (nolock) ON u.ID = usrv.UserID WHERE pa.Value like 'xx-xx-xx-xx-xx-xx'

Eventually I may add an interface for integration with different billing API's but in reality it's not that complex to replace/fork.