var log = require('../core/log');
var config = require('../core/util.js').getConfig();
var fs = require('fs');

// Unfinshed 
// The used math has at some moments high gains but not always 
// This code isnt ready yet.
// Doesnt make use of a toml for now all values internal testing the math.
// By Peter Boos


// worked great 30 min candle polinex 11 month chart  74% above market  (extreme high)
// so this math has potentiall, however misses a lot chances too
// profit was unstable in other testdata  (must not be test data dependable so much)

var strat = {
    Gotcoins: false,
    BoughtAt: 0,
    MaxPeekClose: 0,
    MinPeekClose: 0,
    Tick: 0,
    CurrentCandle: '',
    CandleDelay: 20,
    Beartrend: false,

    //https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
    color: {
        Reset: '\x1b[0m',
        Bright: '\x1b[1m',
        Default: '\x1b[2m',
        Underscore: '\x1b[4m',
        Reverse: '\x1b[7m',
        Red: '\x1b[31m',
        Green: '\x1b[32m',
        Yellow: '\x1b[33m',
        Blue: '\x1b[34m',
        Magenta: '\x1b[35m',
        Cyan: '\x1b[36m',
        White: '\x1b[37m',
        //  Orange : '\x1b[214m' //  https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
    },


    init: function () {

        this.addTulipIndicator('timeseriesforcast', 'tsf', { optInTimePeriod: 24 }); // this.settings.SMA_long });
        this.addTulipIndicator('mafast', 'sma', { optInTimePeriod: 7 });
        this.addTulipIndicator('maslow', 'sma', { optInTimePeriod: 51 });
    },

    update: function (candle) {
        this.CurrentCandle = candle;
        if (candle.close > candle.open);
        if (this.tulipIndicators.mafast.result.result < this.tulipIndicators.maslow.result.result) this.Beartrend = true; else this.Beartrend = false;

    },

    check: function (candle) {

        this.Tick++
        let ind = this.tulipIndicators,
            predict = ind.timeseriesforcast.result.result,
            movingAverage = ind.mafast.result.result;
        //	maFast = ind.maFast.result.result,
        //	rsi,
        //	adx = ind.ADX.result.result;


        if (this.Gotcoins) {


            if (candle.close > this.MaxPeekClose) this.MaxPeekClose = candle.close;
            if (candle.close < this.MinPeekClose) this.MinPeekClose = candle.close;

            if (predict > this.BoughtAt * 1.35) { this.short('predict', this.color.Magenta); }
            else if (predict > movingAverage * 1.10) { this.short('profit', this.color.Cyan); }
            else if (candle.close < this.MaxPeekClose * 0.80) { this.short('Peektrend', this.color.Red); }
            //else if ((candle.close-this.BoughtAt)/this.Tick > 4/3){this.short('profit',this.color.White);}
            else if (this.CurrentCandle.close > predict * 1.07 && candle.close > this.BoughtAt * 1.02) { this.short('profit', this.color.White); }

        }
        else {
            if (this.CurrentCandle.close < predict * 0.96 && this.Tick > this.CandleDelay) this.long('long', this.color.Green);
        }

    },

    short: function (msg, kleur = this.color.Default) {

        if (this.Gotcoins) {
            var profit = this.CurrentCandle.close - this.BoughtAt;
            var prof = ''
            if (profit > 0) prof = ' ' + this.color.Green + String(profit.toFixed(2));
            if (profit < 0) prof = '' + this.color.Red + String(profit.toFixed(2));
            var trend = ''; if (this.Beartrend) trend = this.color.Yellow + 'Bear '; else trend = this.color.Cyan + 'Bull ';

            console.log(trend + kleur + msg + prof);
            this.Gotcoins = false;
            this.advice('short');
            this.Tick = 0;
        }
    },

    long: function (msg, kleur = this.color.Default) {

        if (!this.Gotcoins) {
            var trend = ''; if (this.Beartrend) trend = this.color.Yellow + 'Bear '; else trend = this.color.Cyan + 'Bull ';
            console.log(trend + kleur + msg);
            this.Gotcoins = true;
            this.Tick = 0;
            this.BoughtAt = this.CurrentCandle.close;
            this.MaxPeekClose = this.CurrentCandle.close;
            this.MinPeekClose = this.CurrentCandle.close;
            this.advice('long');
        }
    }
};

module.exports = strat;