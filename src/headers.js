const getHeaders = (token) => ({
    "authority": "api.foruai.io",
    "accept": "*/*",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-US,en;q=0.9",
    "authorization": `Bearer ${token}`,
    "origin": "https://foruai.io",
    "referer": "https://foruai.io/",
    "sec-ch-ua": '"Not)A;Brand";v="99", "Microsoft Edge";v="127", "Chromium";v="127", "Microsoft Edge WebView2";v="127"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "user-agent": `Mozilla/5.0 (${['Windows NT 10.0', 'Macintosh', 'Linux'][Math.floor(Math.random() * 3)]}; ${Math.random() > 0.5 ? 'Win64; x64' : ''}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * (100 - 90 + 1) + 90)}.0.0.0 Safari/537.36`,
    "x-foru-apikey": "foru-private-aec4199767b805b22ce88a2399ea7730d998e5caff336fda19acb897cd9d47e2",
    "x-foru-signature": "b24a5b3915ebcaf0b7e5a742f3db9e58436470ad4f2247337698cadca26fdbe5",
    "x-foru-timestamp": "1726940005897",
});

module.exports = { getHeaders };