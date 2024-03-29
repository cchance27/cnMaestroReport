export type eipPackage = {
    account: string,
    owner: string,
    package: string,
    sku: string,
    amount: number,
    expDate: string,
    isBusiness: boolean
}
export type eipPackageResults = {
    packages: { [esn: string]: eipPackage }, 
    missing: Array<string>, 
    double: Array<string>
}

export enum eipResultEnum {
    Success,
    Double,
    Missing
}
export const stringSort = function (a: string, b: string) {
    if (a==null) {return -1}
    if (b==null) {return 1}
    let x = a.toLowerCase();
    let y = b.toLowerCase();
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
    if (fileSizeInBytes == Infinity)
        return "~ bps";

    var i = -1;
    var byteUnits = [' kbps', ' mbps', ' gbps', ' tbps', 'pbps', 'ebps', 'zbps', 'ybps'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);

    // gigabit+ should really always have atleast 1 digit
    if (fixedDigits == 0 && i > 1)
        fixedDigits += 1

    return Math.max(fileSizeInBytes, 0.1).toFixed(fixedDigits) + byteUnits[i];
}

export const getReadableDataSize = function (bytes: number, fixedDigits: number = 0, divisor: number = 1024) {
    if (!bytes) return "0 bps"
    // divisor is to handle overwriting for octets
    var i = -1;
    var byteUnits = [' KB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        bytes = bytes / divisor;
        i++;
    } while (bytes > divisor);

    return Math.max(bytes, 0.1).toFixed(fixedDigits) + byteUnits[i];
}