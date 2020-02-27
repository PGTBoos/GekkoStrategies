// VmaPredict6, feel free to share alter, but post your findings at:
//       https://forum.gekko.wizb.it/thread-58001.html
// On that threat you find how this works its explained There
// I heavily depend on others testing this code to improve it, and tell about it in the forum.
// There are so many options that i cannot test all combinations.
// this file came from : 


//vma Predict 6B   (not yet 7),  values on percentages
//i only included to set based upon malong (shich now used as wll) (makes more sense to me then on ma medium or mashort)
//this.Toml.Magica  
//this.Toml.MediumOut  
//this.Toml.ShortSight  

var strat;
var config = require('../core/util.js').getConfig();


strat = {
    Gotcoins: false,        // To decide when to buy.
    BoughtAt: 0,            // candle.close (price of the crypto coin) since last trade
    MaxPeekClose: 0,        // higest value since last buy
    MinPeekClose: 0,        // lowest value since last trade
    DayStop: false,         // holds trading till the next day.
    CandleCounter: 0,       // counts candles resets on trade buy/sell actions
    PreviousStrategy: '',   // contains last used strategy name
    PreviousCandle: '',     // to store previous candle data between functions (candle history goes has more past candles.)
    PreviousResult: 0,      // last result
    CurrentCandle: '',      // to store current candle data between functions
    CandleHistory: [],      // keep track of last 10 candles

    ThreeCandleTrend: '',       //trend of last 3 candles
    HistoricStickPattern: [],   //keep track of last 10 known usefull patterns

    Beartrend: false,       // indicates Beartrend

    Profit: '',              // store profit stats

    After: '',               // to remember settings of last trade

    Toml: '',               // storage of toml values

    //Color is an array to hold color formating for console output
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
        //BG for background collor
        BgBlack: "\x1b[40m",
        BgRed: "\x1b[41m",
        BgGreen: "\x1b[42m",
        BgYellow: "\x1b[43m",
        BgBlue: "\x1b[44m",
        BgMagenta: "\x1b[45m",
        BgCyan: "\x1b[46m",
        BgWhite: "\x1b[47m",

    },

    //helper function for getting name of past used strategies
    firstword: function (sentence) {
        var result = sentence.split(' ');
        return result[0]
    },

    //helper function for getting a date time string
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

    //helper function for day of date
    DayNRCandle: function (date) { },

    //Helper function days since trade
    DaysSinceTrade: function(date) { },   //todo


    //helper function for waiting till buy only if its the lowest of a series
    LowestOfN(){},


    // to initialize this strategy
    init: function () {
        console.log(config.VmapPredict7);
        var requiredHistory = config.tradingAdvisor.historySize;
        var setCandleSize = config.tradingAdvisor.candleSize;
        console.log("candleSize: " + setCandleSize + ", history: " + requiredHistory);

        var initthisprofit = 
        {   Bear: 0, 
            Bull: 0, 
            Last: 0, 
            Day: 0, 
            Date: '-',
            DayConsoleWarning: true };

        this.Profit = initthisprofit;

        var initthisafter = { strategie: '?', lasttreeup: false, seenhammer: false, proceed: true, ConsoleWarning: true };
        this.After = initthisafter;
        
        //define a varile to store y name the toml variables, its nicer to refer to later this way.
        var initthistoml =          //temp struct as name holder
        {   MedmiumOut: 0,
            ShortSight: 0,
            DownHill: 0,
            BullsEye: 0,
            DayStop: -1000,
            HighShot: 0,
            RSIShort: 0,
            RSIWait: 0,
            Magica: 0,
            MediumOut: 0,
            DownHillStop: 0
        };
        this.Toml = initthistoml; 
        this.Toml.Magica        = this.settings.Swings.Magica;
        this.Toml.MediumOut     = this.settings.Swings.MediumOut;
        this.Toml.ShortSight    = this.settings.Swings.ShortSight;
        this.Toml.DownHill      = this.settings.Swings.DownHill;
        this.Toml.DownHillStop  = this.settings.Swings.DownHillStop;
        this.Toml.BullsEye      = this.settings.Swings.BullsEye;
        this.Toml.DayStop       = -Math.abs(this.settings.Swings.DayStop) ; //loss is negative
        this.Toml.HighShot      = this.settings.Swings.HighShot;
        this.Toml.RSIShort      = this.settings.RSISafety.RSIShort;
        this.Toml.RSIWait       = this.settings.RSISafety.RSIWait; 
   

        console.log('Sarting VmaPredict math..');

        // timeseriesforcasting uses advanced statistics to estimate a likly next candle in current trend
        // by itself its not enough though, it has some of the same problems as moving averages, but it works differently
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
        this.addTulipIndicator('RSIsafety','rsi', { optInTimePeriod: this.settings.RSISafety.RSIcandles }); 

        this.addTulipIndicator('verticalhorizontalfilter', 'vhf', { optInTimePeriod: 31 });

        this.addTulipIndicator('longregression','linreg',{optInTimePeriod:72}); //3*24 = 
        
        
        
        // console.log(this.Toml);
        console.log(this.settings);
    },

    // calculations done before we do the check function (ea setting of extra variables)
    update: function (candle) {
        var datetimestop = String(candle.start.format('YYYY MMM DD'));

        //reset day profit
        if (this.Profit.Date !== datetimestop) {
            this.Profit.Date = datetimestop;
            this.Profit.Day = 0;
            this.DayStop = false;
            this.Profit.DayConsoleWarning = true
        }

        if (this.Profit.Day < this.Toml.DayStop && 
            this.Profit.DayConsoleWarning == true 
         //   this.Profit.Day !== 0     //bug this line shouldnt be needed there is abug somewhere ?.
            ) {
            this.DayStop = true;
            this.Profit.DayConsoleWarning = false;
            this.Profit.Day = 0;
            var daystopmsg = this.color.BgCyan + this.color.Black + this.Profit.Date + '  ***  Enough for Today there is to much negativity here  ***' + this.color.BgBlack + this.color.White;
            console.log(daystopmsg);
            console.log(this.Profit);
        }



        this.PreviousCandle = this.CurrentCandle;
        this.CurrentCandle = candle;
        this.CandleCounter++;
        if (candle.close > this.MaxPeekClose) { this.MaxPeekClose = candle.close };
        if (candle.close < this.MinPeekClose) { this.MinPeekClose = candle.close };
        if (this.tulipIndicators.maShort.result.result < this.tulipIndicators.maMedium.result.result) this.Beartrend = true; else this.Beartrend = false;

        // store the last 10 candles in CandleHistory, handy for future development.
        this.CandleHistory.push(candle);
        if (this.CandleHistory.length > 10) {
            this.CandleHistory.shift();
        }
        else { // i dont like it but it needs initialization outside of the init: function
            this.CandleHistory.push(candle);
            this.CandleHistory.push(candle);
            this.CandleHistory.push(candle);
        }

        // note there is a #region addon for visual studio code !
        /* #region CandleStick logic */

        //here i kept the logic equal to my candlestickTrader
        this.ThreeCandleTrend = '';
        if (this.CandleHistory[0].close <= this.CandleHistory[1].close && this.CandleHistory[1].close <= this.CandleHistory[2].close) this.ThreeCandleTrend = 'Up';
        if (this.CandleHistory[2].close <= this.CandleHistory[1].close && this.CandleHistory[1].close <= this.CandleHistory[0].close) this.ThreeCandleTrend = 'Down';

        //in fact lets include some usufull pattern
        var Pattern = {
            candelLength: 0,
            upperShadow: 0,
            lowerShadow: 0,
            open: candle.open,     //put in standard values as well.
            close: candle.close,
            high: candle.high,
            low: candle.low,
            name: 'proceed',

        };

        if (candle.close > candle.open) {
            // open candle
            Pattern.candleLength = candle.close - candle.open;
            Pattern.upperShadow = candle.high - candle.close;
            Pattern.lowerShadow = candle.open - candle.low;
        } else {
            // close candle
            Pattern.candleLength = candle.open - candle.close;
            Pattern.upperShadow = candle.high - candle.open;
            Pattern.lowerShadow = candle.close - candle.low;
        };


        if (this.ThreeCandleTrend === 'Up' && Pattern.candleLength < Pattern.lowerShadow * 0.5) Pattern.name = 'Hangman'; //enter bear market
        if (this.ThreeCandleTrend === 'Down' && Pattern.candleLength < Pattern.lowerShadow * 0.5) Pattern.name = 'Hammer';//enter bull market
        if (this.ThreeCandleTrend === 'Up' && Pattern.candleLength < Pattern.upperShadow * 0.5) Pattern.name = 'ShootingStar'; //might enter bear market or change

        this.HistoricStickPattern.push(Pattern);
        if (this.HistoricStickPattern.length > 10) 
            { this.HistoricStickPattern.shift(); }
        else 
            { for (i = 0; i < 9; i++) 
                { this.HistoricStickPattern.push(Pattern); } 
            }; // not ideal repeating values but not sure how to do it otherwise 
               // while still keeping it at 10 elements
               // so future code can refer to nth element without crash if it wasnt there.

        /* #endregion CandleStick logic*/


        //advanced continouation strat 
        if (this.After.strategy === 'DownHill ' & this.Profit.Last < 0) {
            if (this.After.ConsoleWarning) {
                this.After.proceed = false;
                var text = this.color.BgRed + this.color.Black + '****************** Wait for a better market after last losses. ' + this.color.BgBlack + this.color.White;
                console.log(text);
                this.After.ConsoleWarning = false;
            }
            //   if (this.ThreeCandleTrend === 'Up') this.After.lasttreeup = true;
            //   if (this.After.lasttreeup && this.CandleHistory[0].name === 'Hammer') this.After.seenhammer = true;

            //   if
            //  if  (this.ThreeCandleTrend) {
            if (Pattern.name === 'Hammer') {
                this.After.seenhammer = false;
                this.After.lasttreeup = false;
                this.After.proceed = true;
                this.After.ConsoleWarning = true;
                this.After.strategy = 'proceed';
            }
        }
    },

    //This is the main check function here trading logic is executed.
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
            rsiSafety = ind.RSIsafety.result.result,
            vhf = ind.verticalhorizontalfilter.result.result;

            lreg = ind.longregression.result.result;
            adjust =1;

        if( this.CurrentCandle.close <lreg*1.05)adjust=.02;
            

        if (this.settings.Swings.UseFractions) {
            this.Toml.Magica = this.settings.Swings.Magica * maLong;
            this.Toml.MediumOut = this.settings.Swings.MediumOut * maLong;
            this.Toml.ShortSight = this.settings.Swings.ShortSight * maLong* adjust;
            this.Toml.HighShot = this.settings.Swings.HighShot * maLong;
        } else {
            this.Toml.Magica = this.settings.Swings.Magica;
            this.Toml.MediumOut = this.settings.Swings.MediumOut;
            this.Toml.ShortSight = this.settings.Swings.ShortSight;
            this.Toml.HighShot = this.settings.Swings.HighShot;
        }
        var rsiWAit ;
        if (rsiSafety>this.Toml.RSIWait*100)rsiWait=true; else rsiWait=false; 

        //Mainly Utopica is sensitive to RSI misstakes

     //  if (this.Toml.maLong *0.1 > this.Toml.DownHill )this.Toml.Downhill = this.Toml.maLong*0.1; else this.Toml.DownHill = this.settings.DownHillStop;


        

        if (!this.Gotcoins) {
            if (!rsiWait && !this.DayStop && this.After.proceed && vmaMedium > maMedium 
                && maShort  < maMedium && predictShort < maShort ) 
                { this.long('Uptopica buy      ', this.color.White) }

            else if (!rsiWait &&!this.DayStop && candle.close + this.Toml.Magica < predictMedium) 
            { this.long('Magica   buy      ', this.color.White) }
            // else if(mashort >predictShort+){}
        }
        else {                               // > predicmedium
            if (vmaMedium < maMedium && maShort > maMedium + this.Toml.MediumOut && this.BoughtAt < this.CurrentCandle.close) { this.short('MediumOut    sell ', this.color.Magenta) }
            else if (maShort + this.Toml.ShortSight < predictShort && 
                this.CurrentCandle.close < this.PreviousCandle.close) 
                { this.short('ShortSight   sell ', this.color.Cyan) }

            //  trying to get out of weak markets, but wasnt working that well either.
            //  else if ( this.CandleCounter>12 && vhf<0.64 && this.BoughtAt+300 <this.CurrentCandle.close && vmaShort<maShort&&predictShort>maMedium)     { this.short('Bored       sell ',this.color.Blue)}
            else if (this.MaxPeekClose > predictMedium + this.Toml.DownHill && 
                this.CurrentCandle.close < this.PreviousCandle.close) 
                {this.short('DownHill     sell ', this.color.Yellow); if(this.Toml.DownHillStop)this.DayStop=true;}
            else if (this.BoughtAt + this.Toml.BullsEye < candle.close) this.short('BullsEye     sell ', this.color.Blue);
            else if ((this.CandleHistory[0].close + this.CandleHistory[1].close) - ((this.CandleHistory[2].close + this.CandleHistory[3].close + this.CandleHistory[4].close) * 2 / 3) > this.Toml.HighShot && this.BoughtAt < this.CurrentCandle.close && this.CandleCounter > 5) { this.short('HighShot     sell ', this.color.White) }
           
            //have a minimal profit of 2% as well. (cover trading costs)
            else if ((rsiSafety>this.Toml.RSIShort*100 && this.BoughtAt *1.02< this.CurrentCandle.close )) { this.short('RSI exit     sell ', this.color.Cyan) }
            
            // Get some more action if there is a long period of no trades. (sideway markets maybe)
            //  else if (candle.trades>7000 && this.CurrentCandle.close>this.BoughtAt )this.short('Follow     sell ', this.color.White)    ;
        };
    },



    //trader term to sell
    short: function (msg, kleur = this.color.Default) {

        if (this.Gotcoins) {
            var profit = this.CurrentCandle.close - this.BoughtAt;
            var prof = ''
            if (profit > 0) prof = ' ' + this.color.Green + String(profit.toFixed(2)).padStart(6, ' ');
            if (profit < 0) prof = '' + this.color.Red + String(profit.toFixed(2)).padStart(6, ' ');
            var trend = '';
            if (this.Beartrend) {
                this.Profit.Bear = this.Profit.Bear + profit;
                trend = this.color.Red + 'Bear ';
            }
            else {
                this.Profit.Bull = this.Profit.Bull + profit; // see at the end remarks.
                trend = this.color.Green + 'Bull ';
            }





            console.log(trend + kleur + msg + prof + '  ' + this.color.BgRed + this.color.White + this.CurrentCandle.start.format('YYYY MMM DD hh:mm')+this.color.BgBlack);


            this.Profit.Day = this.Profit.Day + profit;
            this.PreviousStrategy = this.firstword(msg); // may not be altered
            this.After.strategy = this.firstword(msg); // may be altered in after trading decisions.
            this.Profit.Last = profit;

            this.CandleCounter = 0;
            this.Gotcoins = false;
            this.advice('short');


        }
    },

    // trader term to buy
    long: function (msg, kleur = this.color.Default) {

        if (!this.Gotcoins) {

            this.Gotcoins = true;
            var trend = ''; if (this.Beartrend) trend = this.color.BgRed + this.color.Black + 'Bear '; else trend = this.color.BgGreen + this.color.Black + 'Bull ';
            console.log(trend + this.color.BgBlack + kleur + msg + '         ' +this.color.BgWhite + this.color.Green+ this.CurrentCandle.start.format('YYYY MMM DD hh:mm') + this.color.BgBlack + this.color.Green + ' after position ' + this.CurrentCandle.close);

            this.CandleCounter = 0;
            this.PreviousStrategy = String(this.firstword(msg)); // may not be altered
            this.After.strategie = String(this.firstword(msg));  // may be altered in after trading decisions.

            this.BoughtAt = this.CurrentCandle.close;
            this.MaxPeekClose = this.CurrentCandle.close;
            this.MinPeekClose = this.CurrentCandle.close;
            this.advice('long');
        }




    },


    end: function () {
        console.log('Bear profit', this.Profit.Bear, 'Bull proffit', this.Profit.Bull);
    }

};

module.exports = strat; 