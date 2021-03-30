const Reward = require('./reward')
const sleep = require('./tools').sleep

let textSize = 35,
    textStyle = 'color:white;',
    showTime = 7500,
    imageHeight = 250,
    imageStyle = '',
    titleColor = 'purple',
    titleSize = 50,
    titleStyle = 'font-family = fantasy;',
    title = '{user} claque {price} lolicoins pour {reward}', //{user} for user / {price} for price / {reward} for reward
    audioUrl = 'https = //www.myinstants.com/media/sounds/asus-yamete-kudasai-mp3cut_HkI6gb8.mp3',
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
    ignoredRedeem1 = '',
    ignoredRedeem2 = '',
    ignoredRedeem3 = '',
    ignoredRedeem4 = '',
    ignoredRedeem5 = '',
    ignoredRedeem6 = '',
    ignoredRedeem7 = '',
    ignoredRedeem8 = '',
    ignoredRedeem9 = '',
    ignoredRedeem10 = '';

const SETTINGS = {
    textSize: textSize + 'px',
    textStyle: textStyle,
    showTime: showTime,
    imageHeight: imageHeight + 'px',
    imageStyle: imageStyle,
    titleColor: titleColor,
    titleSize: titleSize + 'px',
    titleStyle: titleStyle,
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
