module.exports = {
    sleep: function (milliseconds) {
        return new Promise(res => {
            setTimeout(res, milliseconds)
        });
    },
    FREE_RANDOM_ALBUM: '655c3a9a-ef36-4203-bc29-2833cbc3759d'
}