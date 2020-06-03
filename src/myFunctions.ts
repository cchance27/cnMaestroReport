import fetch from 'node-fetch'

export const stringSort = function (a: string, b: string) {
    if (a==null) {return -1}
    if (b==null) {return 1}
    var x = a.toLowerCase();
    var y = b.toLowerCase();
    if (x < y) { return -1 }
    if (x > y) { return 1 }
    return 0
}

export const EncodeXMLEscapeChars = function (input: string) {
    return input.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&apos;');
};

export const formatNumber = function (num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}

export const getContent = function (url: string) {
    // return new pending promise
    return new Promise((resolve, reject) => {
        // select http or https module, depending on reqested url
        const lib = url.startsWith('https') ? require('https') : require('http');
        const request = lib.get(url, (response: any) => {
            // handle http errors
            if (response.statusCode < 200 || response.statusCode > 299) {
                reject(new Error('Failed to load page, status code: ' + response.statusCode));
            }
            // temporary data holder
            const body: any = [];
            // on every content chunk, push it to the data array
            response.on('data', (chunk: any) => body.push(chunk));
            // we are done, resolve promise with those joined chunks
            response.on('end', () => resolve(body.join('')));
        });
        // handle connection errors of the request
        request.on('error', (err: Error) => reject(err))
    })
};

export const getReadableFileSizeString = function (fileSizeInBytes: number, fixedDigits: number = 0) {
    if (!fileSizeInBytes) return "0 bps"
    var i = -1;
    var byteUnits = [' kbps', ' mbps', ' gbps', ' tbps', 'pbps', 'ebps', 'zbps', 'ybps'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(fixedDigits) + byteUnits[i];
};


export const loginCNMaestro = async function (clientid: string, client_secret: string, baseURL: string) {
    let body = `grant_type=client_credentials`
    let encodedAuth = Buffer.from(`${clientid}:${client_secret}`).toString('base64')
    require('https').globalAgent.options.rejectUnauthorized = false

    let login = await fetch(`${baseURL}/access/token`, {
        method: "post",
        headers: {
            'Authorization': `Basic ${encodedAuth}`, 'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    })
    let resp = await login.json()
    return resp.access_token
}

export async function getCNMapi(baseURL: string, apiPath: string, accessToken: string, getAll: boolean = true) {
    let firstUrl = (baseURL + apiPath)
    let response = await fetch(firstUrl, {
        method: "get",
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    })

    let res = await response.json();
    let values: Array<{}> = res.data

    let offset = 0 // Manually using an offset as had issues with API always returning paging.offset = 0
    //console.log(`First: ${firstUrl} Limit: ${res.paging.limit} Offset: ${offset} Total: ${res.paging.total}`)

    // Check if we need to get more
    if (getAll && (((res.paging.limit + offset) < res.paging.total))) {
        let offsetText = "?offset="
        if (apiPath.includes("?")) { offsetText = "&offset=" }
        
        while (((res.paging.limit + offset) < res.paging.total)) {
            offset+=res.paging.limit
            let pagedUrl = (baseURL + apiPath + offsetText + offset)
            response = await fetch(pagedUrl, {
                method: "get",
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                }
            })
            res = await response.json()
            values = values.concat(res.data)
            //console.log(`Paged: ${pagedUrl} Limit: ${res.paging.limit} Offset: ${offset} Total: ${res.paging.total}`)
        }
    }

    return values
}
