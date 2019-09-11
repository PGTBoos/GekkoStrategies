// VmaPredict2.js By Peter Boos  CC BY    2019
// source of this (and maybe updated) code : https://github.com/PGTBoos/GekkoStrategies
//
// This code is easy to adapt and alter please play with it,
// You can improve the code or play with the settings
// Adding new rules (in the main at check if).
// I used a bit fancy naming in the static variables.
// In the code they have a prefix of Swing thus they becomme this.SwingBullsEye
// your free to use and alter this code, trading though is what you do at your own risk 
// If you got something good tweeked or altered share it on the gekko forums.
// https://forum.gekko.wizb.it

// version 5 includes a way to prevent quick multiple stoploss actions. 
// and some new market out trade rules that didnt work out so well

var strat = {
    Gotcoins: false,
    BoughtAt: 0,
    MaxPeekClose: 0,
    MinPeekClose: 0,
    CandleCounter: 0,
    PreviousStrategy: '',
    PreviousCandle: '',
    CurrentCandle: '',
    CandleHistory: '',
    CandleDelay: 20,
    ThreeCandleTrend: '',
    Beartrend: false,
    BearProffit: 0,
    BullProffit: 0,

    SwingMagica: 0,
    SwingMediumOut: 0,
    SwingShortSight: 0,
    SwingMaxPeekPred: 0,
    SwingBullsEye: 0,

    //https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
    color: {
        Reset: '\x1b[0m',
        Bright: '\x1b[1m',
        Default: '\x1b[2m',
        Underscore: '\x1b[4m',
        Reverse: '\x1b[7m',
        Black: '\x1b[30m',
        Red: '\x1b[31m',
        Green: '\x1b[32m',
        Yellow: '\x1b[33m',
        Blue: '\x1b[34m',
        Magenta: '\x1b[35m',
        Cyan: '\x1b[36m',
        White: '\x1b[37m',

        BgBlack: "\x1b[40m",
        BgRed: "\x1b[41m",
        BgGreen: "\x1b[42m",
        BgYellow: "\x1b[43m",
        BgBlue: "\x1b[44m",
        BgMagenta: "\x1b[45m",
        BgCyan: "\x1b[46m",
        BgWhite: "\x1b[47m",

    },

    firstword: function (sentence)   //helper function for getting name of past used strategies
    {
        return sentence => String.split(' ')[0]
    },

    ShortDate: function (date) {
        var monthNames = [
            "Jan", "Feb", "Mar",
            "Apr", "May", "Jun", "Jul",
            "Aug", "Sep", "Oct",
            "Nov", "Dec"
        ];
        var day = date.getDate();
        var monthIndex = date.getMonth();
        var year = date.getFullYear();//.toString().substr(-2);    
        return monthNames[monthIndex] + ' ' + day + ' ' + year;
    },

    init: function () {
        this.SwingMagica = this.settings.Swings.Magica;
        this.SwingMediumOut = this.settings.Swings.MediumOut;
        this.SwingShortSight = this.settings.Swings.ShortSight;
        this.SwingMaxPeekPred = this.settings.Swings.MaxPeekPred;
        this.SwingBullsEye = this.settings.Swings.SwingBullsEye;
        // getting the toml variables in
        console.clear();
        console.log('Sarting VmaPredict math..');
        console.log(this.settings);

        // timeseriesforcasting uses advanced statistics to estimate a likly next candle in current trend
        // by itself its not enough though, has some of the same problems as moving averages, but it works differently
        this.addTulipIndicator('timeseriesforcastLong', 'tsf', { optInTimePeriod: this.settings.ForcastTrend.Long });
        this.addTulipIndicator('timeseriesforcastMedium', 'tsf', { optInTimePeriod: this.settings.ForcastTrend.Medium });
        this.addTulipIndicator('timeseriesforcastShort', 'tsf', { optInTimePeriod: this.settings.ForcastTrend.Short });
        //Simple moving average of a series using different time frames, ea average over a period
        this.addTulipIndicator('maMedium', 'sma', { optInTimePeriod: this.settings.PeriodAverage.Medium });
        this.addTulipIndicator('maShort', 'sma', { optInTimePeriod: this.settings.PeriodAverage.Short });
        this.addTulipIndicator('maLong', 'sma', { optInTimePeriod: this.settings.PeriodAverage.Long });
        //a slightly more advanced average that weights by volume of trades
        this.addTulipIndicator('vmaMedium', 'vwma', { optInTimePeriod: this.settings.VolumePeriodAverage.Medium });
        this.addTulipIndicator('vmaShort', 'vwma', { optInTimePeriod: this.settings.VolumePeriodAverage.Short });
        this.addTulipIndicator('vmaLong', 'vwma', { optInTimePeriod: this.settings.VolumePeriodAverage.Long });
        //vertical horizontal filter is a line indicator, (sadly) its always possitive though
        //it tells something about rise and fall speed votality of market, race conditions etc. 
        this.addTulipIndicator('verticalhorizontalfilter', 'vhf', { optInTimePeriod: 31 });

    },

    update: function (candle) {
        this.PreviousCandle = this.CurrentCandle;
        this.CurrentCandle = candle;
        this.CandleCounter++;
        if (candle.close > this.MaxPeekClose) { this.MaxPeekClose = candle.close };
        if (candle.close < this.MinPeekClose) { this.MinPeekClose = candle.close };
        if (this.tulipIndicators.maShort.result.result < this.tulipIndicators.maMedium.result.result) this.Beartrend = true; else this.Beartrend = false;

        // store the last 10 candles in CandleHistory for future development.
        this.CandleHistory.push(candle);
        if (this.CandleHistory.length > 10) {
            this.CandleHistory.shift();
        }

        //logic gtom my candlestickTrader
        this.ThreeCandleTrend = '';
        if (this.CandleHistory[0].close <= this.CandleHistory[1].close && this.CandleHistory[1].close <= this.CandleHistory[2].close) this.ThreeCandleTrend = 'Up';
        if (this.CandleHistory[2].close <= this.CandleHistory[1].close && this.CandleHistory[1].close <= this.CandleHistory[0].close) this.ThreeCandleTrend = 'Down';


    },

    check: function (candle) {
        let ind = this.tulipIndicators,
            predictLong = ind.timeseriesforcastLong.result.result,
            predictMedium = ind.timeseriesforcastMedium.result.result,
            predictShort = ind.timeseriesforcastShort.result.result,
            maShort = ind.maShort.result.result,
            maMedium = ind.maMedium.result.result,
            maLong = ind.maLong.result.result,
            vmaShort = ind.vmaShort.result.result,
            vmaMedium = ind.vmaMedium.result.result,
            vmaLong = ind.vmaLong.result.result,
            vhf = ind.verticalhorizontalfilter.result.result;


        
        // idea from anon.e.mous, nocrash waits after stoploss till market is moving upwards
        // this should stop repeating of MaxpeekPred stoploss falls (i hope)
        // Original plan was based on 2 candles i use 3 however.
        // The halting of buyin trade only ocures after MaxpeekPred (my stoploss variant) was triggered
        var nocrash = true;
        if (this.PreviousStrategy === 'MaxpeekPred') {
            nocrash = false;
            if (this.ThreeCandleTrend === 'Up') nocrash = true;
        }


        if (!this.Gotcoins) {
            if (nocrash && vmaMedium > maMedium && maShort < maMedium && predictShort > maShort) { this.long('Uptopica buy     ', this.color.White) }
            else if (nocrash && candle.close + this.SwingMagica < predictMedium) { this.long('Magica   buy     ', this.color.White) }
            // else if(mashort >predictShort+){}
        }
        else {                               // > predicmedium
            if (vmaMedium < maMedium && maShort > maMedium + this.SwingMediumOut) { this.short('MediumOut   sell ', this.color.Magenta) }
            else if (maShort + this.SwingShortSight < predictShort && this.CurrentCandle.close < this.PreviousCandle.close) { this.short('ShortSight  sell ', this.color.Cyan) }
            //  10 minutes half a day = 72 CandleCounters, aiming for a gain ratio) // no improvement observed
            //  else if (this.CandleCounter>12 && (((predictMedium- this.BoughtAt)/(this.CandleCounter)) >  10))                                   { this.short('SlopeOut    sell ',this.color.Green)}

            //  trying to get out of weak markets, but wasnt working that well either.
            //  else if ( this.CandleCounter>12 && vhf<0.64 && this.BoughtAt+300 <this.CurrentCandle.close && vmaShort<maShort&&predictShort>maMedium)     { this.short('Bored       sell ',this.color.Blue)}
            else if (this.MaxPeekClose > predictMedium + this.SwingMaxPeekPred && this.CurrentCandle.close < this.PreviousCandle.close) { this.short('MaxpeekPred sell ', this.color.Yellow) }
            else if (this.BoughtAt + this.SwingBullsEye < candle.close) this.short('BullsEye    sell ', this.color.Blue);

        };
    },



    short: function (msg, kleur = this.color.Default) {

        if (this.Gotcoins) {
            var profit = this.CurrentCandle.close - this.BoughtAt;
            var prof = ''
            if (profit > 0) prof = ' ' + this.color.Green + String(profit.toFixed(2));
            if (profit < 0) prof = '' + this.color.Red + String(profit.toFixed(2));
            var trend = '';
            if (this.Beartrend) {
                this.BearProffit = this.BearProffit + profit;
                trend = this.color.Red + 'Bear ';
            }
            else {
                this.BullProffit = this.BullProffit + profit; // see at the end remarks.
                trend = this.color.Green + 'Bull ';
            }
            console.log(trend + kleur + msg + prof);

            this.PreviousStrategy = this.firstword(msg);
            this.CandleCounter = 0;
            this.Gotcoins = false;
            this.advice('short');

        }
    },

    long: function (msg, kleur = this.color.Default) {

        if (!this.Gotcoins) {

            this.Gotcoins = true;
            var trend = ''; if (this.Beartrend) trend = this.color.BgRed + this.color.Black + 'Bear '; else trend = this.color.BgGreen + this.color.Black + 'Bull ';
            console.log(trend + this.color.BgBlack + kleur + msg + '         ' + this.CurrentCandle.start.format('YYYY MMM DD hh:mm') + this.color.Green + ' after position ' + this.CurrentCandle.close);

            this.CandleCounter = 0;
            this.PreviousStrategy = this.firstword(msg);
            this.BoughtAt = this.CurrentCandle.close;
            this.MaxPeekClose = this.CurrentCandle.close;
            this.MinPeekClose = this.CurrentCandle.close;
            this.advice('long');
        }




    },
    end: function () {
        console.log('Bear profit', this.BearProffit, 'Bull proffit', this.BullProffit);
    }

};

module.exports = strat; 