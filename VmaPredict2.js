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




var strat = {
    // those variables are available to all functions and adressed with this. like this.Tick
    Gotcoins: false,
    BoughtAt: 0,
    MaxPeekClose: 0,
    MinPeekClose: 0,
    Tick: 0,
    CurrentCandle: '',
    CandleDelay: 20,
    Beartrend: false,
    LongBearTrend:false,
    BearProffit: 0,
    BullProffit: 0,

    SwingMagica :0,
    SwingMediumOut:0,
    SwingShortSight:0,
    SwingMaxPeekPred:0,
    SwingBullsEye:0,

    //Color array is only used for visual console logging.
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

        BgBlack : "\x1b[40m",
        BgRed : "\x1b[41m",
        BgGreen : "\x1b[42m",
        BgYellow : "\x1b[43m",
        BgBlue : "\x1b[44m",
        BgMagenta : "\x1b[45m",
        BgCyan : "\x1b[46m",
        BgWhite : "\x1b[47m",
        
    },

    //Startup setting initial variables reading the setttings from the Toml file
    init: function () {
        this.SwingMagica      =  this.settings.Swings.Magica; 
        this.SwingMediumOut   =  this.settings.Swings.MediumOut;
        this.SwingShortSight  =  this.settings.Swings.ShortSight;
        this.SwingMaxPeekPred =  this.settings.Swings.MaxPeekPred;
        this.SwingBullsEye    =  this.settings.Swings.SwingBullsEye;
        // getting the toml variables in

     
     
        this.addTulipIndicator('timeseriesforcastLong', 'tsf',  { optInTimePeriod: this.settings.ForcastTrend.Long }); // statiscal forcasting });
        this.addTulipIndicator('timeseriesforcastMedium', 'tsf',{ optInTimePeriod: this.settings.ForcastTrend.Medium });
        this.addTulipIndicator('timeseriesforcastShort', 'tsf', { optInTimePeriod: this.settings.ForcastTrend.Short });
        this.addTulipIndicator('maMedium', 'sma',               { optInTimePeriod: this.settings.PeriodAverage.Medium });    //averages over period
        this.addTulipIndicator('maShort', 'sma',                { optInTimePeriod: this.settings.PeriodAverage.Short });
        this.addTulipIndicator('maLong', 'sma',                 { optInTimePeriod: this.settings.PeriodAverage.Long });
        this.addTulipIndicator('vmaMedium', 'vwma',             { optInTimePeriod: this.settings.VolumePeriodAverage.Medium });  //trade volume weighted averages
        this.addTulipIndicator('vmaShort', 'vwma',              { optInTimePeriod: this.settings.VolumePeriodAverage.Short });
        this.addTulipIndicator('vmaLong', 'vwma',               { optInTimePeriod: this.settings.VolumePeriodAverage.Long });
       
        console.log(this.settings);
     
    },

    // update triggers before check (here i set peeks and set this.Beartrends)
    update: function (candle) {
        this.CurrentCandle = candle;
        if (candle.close > this.MaxPeekClose){this.MaxPeekClose=candle.close};
        if (candle.close < this.MinPeekClose){this.MinPeekClose=candle.close};
        if (this.tulipIndicators.maShort.result.result < this.tulipIndicators.maMedium.result.result) this.Beartrend = true; else this.Beartrend = false;
        if (this.tulipIndicators.maMedium.result.result < this.tulipIndicators.maLong.result.result) this.LongBeartrend = true; else this.LongBeartrend = false;
    },

    check: function (candle) {
        // reading out the tulip indicators and set those in local variables of the check function
        
        let ind = this.tulipIndicators,
            predictLong = ind.timeseriesforcastLong.result.result,
            predictMedium = ind.timeseriesforcastMedium.result.result,
            predictShort = ind.timeseriesforcastShort.result.result,     //Time Series Forecast short 
            maShort = ind.maShort.result.result,
            maMedium = ind.maMedium.result.result,
            maLong = ind.maLong.result.result,                           //Moving Average Long
            vmaShort = ind.vmaShort.result.result,
            vmaMedium = ind.vmaMedium.result.result,
            vmaLong = ind.vmaLong.result.result;                         //Volume moving Average Long

        // here the trading happens


        if (!this.Gotcoins) { //decide a buy moment
            if (vmaMedium > maMedium && maShort < maMedium && maLong<predictMedium) {   this.long('Uptopica     ', this.color.Green); }
            else if(candle.close+this.SwingMagica <predictMedium &&maMedium<maLong){    this.long('Magica       ', this.color.White);}
   
        }
        else {                //decide a sell moment
            if (vmaMedium < maMedium && maShort > maMedium+this.SwingMediumOut) {       this.short('MediumOut    ', this.color.Magenta); }
            else if(maShort +this.SwingShortSight <predictShort ) {                     this.short('ShortSight   ', this.color.Yellow);}
  
           else if (this.BoughtAt+this.SwingBullsEye <candle.close)                     this.short('BullsEye     ',this.color.Blue);
       
           else if(this.MaxPeekClose >predictMedium+this.SwingMaxPeekPred) {            this.short('MaxpeekPred  ',this.color.Cyan);};
        };
       
        // if you want to log variables you can do use console.log 
        //console.log(candle.close,predictLong, predictMedium, predictShort);
  
 
    },




// At the moment of going Short or Long some internal variables change.
// For example this.Gotcoins changes
// Also in regard to colors a background other then black is a buy
// Bear market moments are red, bull markets (when market goes upwards) are green.


short: function (msg, kleur = this.color.Default) {

    if (this.Gotcoins) {
        var profit = this.CurrentCandle.close - this.BoughtAt;
        var prof = ''
        if (profit > 0) prof = ' ' + this.color.Green + String(profit.toFixed(2));
        if (profit < 0) prof = '' + this.color.Red + String(profit.toFixed(2));
        var trend = '';
        if (this.Beartrend) {
            this.BearProffit = this.BearProffit + profit;
            trend = this.color.Green + 'Bear ';
        }
        else {
            this.BullProffit = this.BullProffit + profit; // see at the end remarks.
            trend = this.color.Red + 'Bull ';
        }
        console.log(trend + kleur + msg + prof);

        this.Gotcoins = false;
        this.advice('short');

    }
},

long: function (msg, kleur = this.color.Default) {

    if (!this.Gotcoins) {

        this.Gotcoins = true;
        var trend = ''; if (this.Beartrend) trend = this.color.BgGreen+ this.color.Black + 'Bear '; else trend =  this.color.BgRed+ this.color.Black + 'Bull ';
        
        console.log(trend + this.color.BgBlack+kleur + msg);

        this.BoughtAt = this.CurrentCandle.close;
        this.MaxPeekClose = this.CurrentCandle.close;
        this.MinPeekClose = this.CurrentCandle.close;
        this.advice('long');
    }



},
end: function () {

    // this is not a real profit but handy for checking math against bull and bear markets.
    // this could be extended for example to show the gains per triggered rule
    // I might create something alike that later
    console.log('Bear profit', this.BearProffit, 'Bull proffit', this.BullProffit);
}

};

module.exports = strat;