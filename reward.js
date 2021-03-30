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
            this.settings.ignored.indexOf(message['data']['redemption']['reward']['id']) === -1 // do not handle a specific reward
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