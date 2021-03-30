const Reward = require('./reward')
const sleep = require('./tools').sleep

let textSize = '{textSize}',
    textStyle = '{textStyle}',
    showTime = '{showTime}',
    imageHeight = '{imageHeight}',
    imageStyle = '',
    titleColor = '{titleColor}',
    titleSize = '{titleSize}',
    title = '{title}',
    audioUrl = '{audioUrl}',
    tts = true,
    ttsLang = 'fr',
    showPrices = false, //comma separated values or false
    audioPrices = false, //comma separated values or false
    ttsPrices = false, //comma separated values or false
    botChannelName = false,
    highlightTitle = false,
    highlightPrice = false,
    audioVolume = 1, // value between 0 and 1
    defaultImage = false, // url for default displayed image on reward
    ignoredRedeem1 = '{ignoredRedeem1}',
    ignoredRedeem2 = '{ignoredRedeem2}',
    ignoredRedeem3 = '{ignoredRedeem3}',
    ignoredRedeem4 = '{ignoredRedeem4}',
    ignoredRedeem5 = '{ignoredRedeem5}',
    ignoredRedeem6 = '{ignoredRedeem6}',
    ignoredRedeem7 = '{ignoredRedeem7}',
    ignoredRedeem8 = '{ignoredRedeem8}',
    ignoredRedeem9 = '{ignoredRedeem9}',
    ignoredRedeem10 = '{ignoredRedeem10}';

let SETTINGS = {
    textSize: textSize + 'px',
    textStyle: 'color:' + textStyle,
    showTime: showTime,
    imageHeight: imageHeight + 'px',
    imageStyle: imageStyle,
    titleColor: titleColor,
    titleSize: titleSize + 'px',
    title: title,
    audioUrl: audioUrl,
    tts: tts,
    ttsLang: ttsLang,
    showPrices: showPrices,
    audioPrices: audioPrices,
    ttsPrices: ttsPrices,
    botChannelName: botChannelName,
    highlightTitle: highlightTitle,
    highlightPrice: highlightPrice,
    audioVolume: audioVolume,
    defaultImage: defaultImage,
    ignored: [
        ignoredRedeem1,
        ignoredRedeem2,
        ignoredRedeem3,
        ignoredRedeem4,
        ignoredRedeem5,
        ignoredRedeem6,
        ignoredRedeem7,
        ignoredRedeem8,
        ignoredRedeem9,
        ignoredRedeem10
    ],
};

window.addEventListener('onWidgetLoad', function (obj) {
    const CHANNEL_ID = obj.detail.channel.providerId
    const loadedModules = [
        new Reward(SETTINGS),
    ]

    let ws = undefined;
    let pong = false;
    let interval = false;

    function connect() {
        ws = new WebSocket("wss://pubsub-edge.twitch.tv");
        listen();
    }

    function disconnect() {
        if (interval) {
            clearInterval(interval);
            interval = false;
        }
        ws.close();
    }

    function listen() {
        ws.onmessage = (a) => {
            let o = JSON.parse(a.data);
            switch (o.type) {
                case "PING":
                    ws.send(JSON.stringify({
                        "type": "PONG"
                    }));
                    break;
                case "PONG":
                    pong = true;
                    break;
                case "RECONNECT":
                    disconnect();
                    connect();
                    break;
                case "MESSAGE":
                    switch (o.data['topic']) {
                        case `community-points-channel-v1.${CHANNEL_ID}`:
                            let msg = JSON.parse(o.data.message);
                            console.log(msg);
                            loadedModules.forEach(module => module.canHandle(msg) && module.handle(msg))
                            break;
                    }
                    break;
            }
        }
        ws.onopen = () => {
            ws.send(JSON.stringify({
                "type": "LISTEN",
                "nonce": "pepega",
                "data": {"topics": ["community-points-channel-v1." + CHANNEL_ID], "auth_token": ""}
            }));
            interval = setInterval(async () => {
                ws.send(JSON.stringify({
                    "type": "PING"
                }));
                await sleep(5000);
                if (pong) {
                    pong = false;
                    return
                }
                pong = false;
                disconnect();
                connect();
            }, 5 * 60 * 1000)
        }
    }

    connect();
})
