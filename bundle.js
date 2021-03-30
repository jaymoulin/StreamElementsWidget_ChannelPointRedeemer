(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{"./reward":2,"./tools":3}],2:[function(require,module,exports){
const GoogleTTS = require('./tts')
const sleep = require('./tools').sleep

class Reward {
    constructor(settings) {
        this.settings = settings;
        this.container = document.getElementById("points-notification-container");
        this.image = document.getElementById("points-notification-image");
        this.title = document.getElementById("points-notification-title");
        this.message = document.getElementById("points-notification-message");
        this.showPrices = '';
        this.audioPrices = '';
        this.ttsPrices = '';
        this.notifications = [];

        this.init()
            .initDisplay()
    }

    _replaceAll(text, find, replaceWith) {
        let re = new RegExp(find, "g");
        return text.replace(re, replaceWith);
    }
    
    init() {
        this.message.setAttribute("style", `font-size: ${this.settings.textSize};${this.settings.textStyle}`);
        this.title.setAttribute("style", `color: ${this.settings.titleColor};font-size: ${this.settings.titleSize};`);
        this.image.setAttribute("style", `height: ${this.settings.imageHeight};${this.settings.imageStyle}`);
        
        if (this.settings.showPrices) {
            let items = this.settings.showPrices.split(",");
            for (let item of items) {
                this.showPrices.push(parseInt(item));
            }
        }

        if (this.settings.audioPrices) {
            let items = this.settings.audioPrices.split(",");
            for (let item of items) {
                this.audioPrices.push(parseInt(item));
            }
        }

        if (this.settings.ttsPrices) {
            let items = this.settings.ttsPrices.split(",");
            for (let item of items) {
                this.ttsPrices.push(parseInt(item));
            }
        }
        return this;
    }

    /**
     * Daemon to display reward
     * @returns {Promise<void>}
     */
    async initDisplay() {
        while (true) {
            if (this.notifications.length > 0) {
                let currentNotification = this.notifications.pop();
                console.log("Notification showing", currentNotification);
                if (this.showPrices.length !== 0 && this.showPrices.indexOf(currentNotification.price) === -1)
                    return;
                console.log("Price check passed");
                this.image.setAttribute("src", currentNotification.image);
                this.title.innerText = this._replaceAll(this.settings.title, "{user}", currentNotification.user);
                this.title.innerText = this._replaceAll(this.title.innerText, "{reward}", currentNotification.title);
                this.title.innerText = this._replaceAll(this.title.innerText, "{price}", currentNotification.price);
                this.message.innerText = currentNotification.text || "";
                this.container.setAttribute("class", "");
                if (this.settings.audioUrl && (this.audioPrices.length === 0 || this.audioPrices.indexOf(currentNotification.price) !== -1)) {
                    console.log("Playing audio", this.settings.audioUrl);
                    try {
                        let audio = new Audio();
                        audio.src = this.settings.audioUrl;
                        audio.volume = this.settings.audioVolume ? parseFloat(this.settings.audioVolume) : 1;
                        await audio.play();
                        await new Promise((res) => {
                            audio.onended = res;
                            audio.onerror = (e) => {
                                console.log(e);
                                res()
                            };
                        });
                    } catch (e) {
                        console.log("Audio playback error:", e);
                    }
                }
                if (currentNotification.text && this.settings.tts && (this.ttsPrices.length === 0 || this.ttsPrices.indexOf(currentNotification.price) !== -1)) {
                    console.log("Playing TTS");
                    try {
                        await GoogleTTS.textToSpeech(currentNotification.text, this.settings.ttsLang ? this.settings.ttsLang : "en");
                        console.log("TTS ended");
                    } catch (e) {
                        console.log("TTS error:", e)
                    }
                }
                await sleep(parseInt(this.settings.showTime ? this.settings.showTime : 7500));
                this.container.setAttribute("class", "hide");
                console.log("Notification ended");
            }
            await sleep(1000);
        }
    }

    canHandle(message) {
        console.log(this.settings.ignored);
        console.log(message['data']['redemption']['reward']['id']);
        return (
            message &&
            message.type &&
            message.type === 'reward-redeemed' &&
            message['data'] &&
            message['data']['redemption'] &&
            message['data']['redemption']['user'] &&
            message['data']['redemption']['user']['display_name'] &&
            message['data']['redemption']['reward'] &&
            message['data']['redemption']['reward']['id'] &&
            !this.settings.ignored.includes(message['data']['redemption']['reward']['id']) // do not handle a specific reward
        )
    }

    handle(message) {
        let reward = message.data['redemption']['reward'];
        let imageUrl = undefined;
        let image = reward.image;
        let defaultImage = reward['default_image'];

        if (image) {
            if (image['url_4x']) {
                imageUrl = image['url_4x'];
            } else if (image['url_2x']) {
                imageUrl = image['url_2x'];
            } else if (image['url_1x']) {
                imageUrl = image['url_1x'];
            }
        } else if (defaultImage) {
            if (defaultImage['url_4x']) {
                imageUrl = defaultImage['url_4x'];
            } else if (defaultImage['url_2x']) {
                imageUrl = defaultImage['url_2x'];
            } else if (defaultImage['url_1x']) {
                imageUrl = defaultImage['url_1x'];
            }
        } else {
            imageUrl = this.settings.defaultImage ? this.settings.defaultImage : "https://static-cdn.jtvnw.net/custom-reward-images/default-4.png"
        }
        let notification = {
            image: imageUrl,
            title: reward.title,
            price: reward['cost'],
            user: message.data['redemption']['user']['display_name'],
            text: message.data['redemption']['user_input'],
        };
        console.log("Notification queued", notification);
        this.notifications.push(notification);
    }
}

module.exports = Reward
},{"./tools":3,"./tts":4}],3:[function(require,module,exports){
module.exports = {
    sleep: function (milliseconds) {
        return new Promise(res => {
            setTimeout(res, milliseconds)
        });
    },
    FREE_RANDOM_ALBUM: '655c3a9a-ef36-4203-bc29-2833cbc3759d'
}
},{}],4:[function(require,module,exports){
const TTS = {
    async playAudios(audioUrls) {
        let audios = [];
        for (let url of audioUrls) {
            audios.push(new Audio(url));
        }
        for (let audio of audios) {
            await new Promise((resolve, reject) => {
                audio.onerror = reject;
                audio.onended = resolve;
                audio.play();
            });
            audio.remove();
        }
    },
    splitSentence(text) {
        let words = text.split(" ");
        let result = [];
        let current = "";
        let i = 0;
        while (words.length > -1) {
            let word = words[0];
            if (!word) {
                result.push(current);
                current = "";
                break;
            }
            if (current.length + word.length <= 199) {
                current += word + " ";
                words.shift();
            } else if (current.length > 0) {
                result.push(current);
                current = "";
            } else {
                current = word.substring(0, 198);
                result.push(current);
                current = "";
                words.shift();
                words.unshift(word.substring(198, word.length - 1));
            }
        }
        return result;
    },
    async textToSpeech(text, language) {
        let parts = this.splitSentence(text);
        let urls = [];
        for (let part of parts) {
            urls.push(this.getTTSUrl(part, language));
        }
        await this.playAudios(urls)
    },
    getTTSUrl(text, language) {
        return `https://translate.google.com/translate_tts?ie=UTF-8&total=1&idx=0&textlen=${text.length}&client=tw-ob&q=${text}&tl=${language}`
    }
}

module.exports = TTS

},{}]},{},[1]);
