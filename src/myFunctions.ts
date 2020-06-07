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

export const getReadableThroughput = function (fileSizeInBytes: number, fixedDigits: number = 0) {
    if (!fileSizeInBytes) return "0 bps"
    var i = -1;
    var byteUnits = [' kbps', ' mbps', ' gbps', ' tbps', 'pbps', 'ebps', 'zbps', 'ybps'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(fixedDigits) + byteUnits[i];
}

export const getReadableDataSize = function (bytes: number, fixedDigits: number = 0) {
    if (!bytes) return "0 bps"
    var i = -1;
    var byteUnits = [' KB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        bytes = bytes / 1024;
        i++;
    } while (bytes > 1024);

    return Math.max(bytes, 0.1).toFixed(fixedDigits) + byteUnits[i];
}