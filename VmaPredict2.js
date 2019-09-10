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
    LongBearTrend:false,
    BearProffit: 0,
    BullProffit: 0,

    SwingMagica :0,
    SwingMediumOut:0,
    SwingShortSight:0,
    SwingMaxPeekPred:0,
    SwingBullsEye:0,

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


    init: function () {
        this.SwingMagica      =  this.settings.Swings.Magica; 
        this.SwingMediumOut   =  this.settings.Swings.MediumOut;
        this.SwingShortSight  =  this.settings.Swings.ShortSight;
        this.SwingMaxPeekPred =  this.settings.Swings.MaxPeekPred;
        this.SwingBullsEye    =  this.settings.Swings.SwingBullsEye;
        // getting the toml variables in

      console.log(this.settings);
     
        this.addTulipIndicator('timeseriesforcastLong', 'tsf',  { optInTimePeriod: this.settings.ForcastTrend.Long }); // statiscal forcasting });
        this.addTulipIndicator('timeseriesforcastMedium', 'tsf',{ optInTimePeriod: this.settings.ForcastTrend.Medium });
        this.addTulipIndicator('timeseriesforcastShort', 'tsf', { optInTimePeriod: this.settings.ForcastTrend.Short });
        this.addTulipIndicator('maMedium', 'sma',               { optInTimePeriod: this.settings.PeriodAverage.Medium });    //averages over period
        this.addTulipIndicator('maShort', 'sma',                { optInTimePeriod: this.settings.PeriodAverage.Short });
        this.addTulipIndicator('maLong', 'sma',                 { optInTimePeriod: this.settings.PeriodAverage.Long });
        this.addTulipIndicator('vmaMedium', 'vwma',             { optInTimePeriod: this.settings.VolumePeriodAverage.Medium });  //trade volume weighted averages
        this.addTulipIndicator('vmaShort', 'vwma',              { optInTimePeriod: this.settings.VolumePeriodAverage.Short });
        this.addTulipIndicator('vmaLong', 'vwma',               { optInTimePeriod: this.settings.VolumePeriodAverage.Long });

     
    },

    update: function (candle) {
        this.CurrentCandle = candle;
        if (candle.close > this.MaxPeekClose){this.MaxPeekClose=candle.close};
        if (candle.close < this.MinPeekClose){this.MinPeekClose=candle.close};
        if (this.tulipIndicators.maShort.result.result < this.tulipIndicators.maMedium.result.result) this.Beartrend = true; else this.Beartrend = false;
        if (this.tulipIndicators.maMedium.result.result < this.tulipIndicators.maLong.result.result) this.LongBeartrend = true; else this.LongBeartrend = false;
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
            vmaLong = ind.vmaLong.result.result;

            



        if (!this.Gotcoins) {
            if (vmaMedium > maMedium && maShort < maMedium && maLong<predictMedium) {                   this.long('Uptopica     ', this.color.Green); }
            else if(candle.close+this.SwingMagica <predictMedium &&maMedium<maLong){              this.long('Magica       ', this.color.White);}
           // else if(mashort >predictShort+){}
        }
        else {                               // > predicmedium
            if (vmaMedium < maMedium && maShort > maMedium+this.SwingMediumOut) { this.short('MediumOut    ', this.color.Magenta); }
            else if(maShort +this.SwingShortSight <predictShort ) {               this.short('ShortSight   ', this.color.Yellow);}
        //    else if(this.BoughtAt >candle.close+250) {this.short('peekout     ',this.color.Yellow)}
           else if (this.BoughtAt+this.SwingBullsEye <candle.close)                             this.short('BullsEye     ',this.color.Blue);
          // else if (this.LongBeartrend && candle.close >this.BoughtAt*0.1)          this.short('BearsEye     ',this.color.White);
           else if(this.MaxPeekClose >predictMedium+this.SwingMaxPeekPred) {      this.short('MaxpeekPred  ',this.color.Cyan);};
        };
        //console.log(candle.close,predictLong, predictMedium, predictShort);
  
 
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
            trend = this.color.Green + 'Bear ';
        }
        else {
            this.BullProffit = this.BullProffit + profit;
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
    console.log('Bear profit', this.BearProffit, 'Bull proffit', this.BullProffit);
}

};

module.exports = strat;