// source https://github.com/PGTBoos/GekkoStrategies
//
// Candlesticks as seen on  ==>  https://www.youtube.com/watch?v=9NkvdaTIUe4
// Peter Boos I fixed original code and also made it trade  11-0-2019 
// Share alike free provide some credit if used, and share if improved.
// Share on Gekko forums, and pm me there
// Currently i spend less time on this one
// So sadly you will have to read the code to understand it and watch that youtube.
// I hope others can continou on this one and my thoughts about it, the reason i'm sharing.

//! the logic works now after my FIX, it actually never worked before that
//! which is a bit amazing since the buggy code recieved lots of kudo's on youtube.
//! i have informed the author of the original code allready about the problem.

// oringal comment of the code
// ?  You need to set the support and resistance
// ?  level so this strat knows where these candles
// ?  are in relation to these levels.
// >> i (peter boos) am unfamiliar with that currently
// >> please Explain in the gekko forums of this strategy.


// Althoug it trades now my concerns though are: 
//
//! THE ACTIONS UPON CANDLE STICK PATTERNS SHOULD BE MORE ADVANCED
// >> Reason point is Candle's can be added over time frames 
// >> (ea candle1+candle2+candle3 =  candlewith3times the time range)
// >> The thing in here is that if you do that with some candles they becomme different type of candles
// >> ea A big one up and big one down when added might result in a Hammer..
// >> currently the code does lack such checking while it seams quite essential to me.

// >> Another concern i have about it, is that candles (when you understand adding) are essentially results of timeframes
// >> Its hard to emulate but i wonder the effect then of shifting time.. maybe something to emulate in blender 3d or so
// >> but it seams to me that candle patterns are heavily constructed views, they alone are not enough, more is needed. 


// required nodeJS npm libraries if you got errors then you need to install them.

var log = require('../core/log');
var config = require('../core/util.js').getConfig();
var fs = require('fs');




// this strategy creates log files, for Excel, or openOffice Calc. (optimzed for Calcs candle stick charts)

var CVCandleLogger = {
  linebreaktype: '',
  CandleNr: 0,
  firstrun: true,
  stratname: '',
  filename: '',
  // one could log additional commma seperated info (like math results or buy sell info, using extralog)
  update: function (candle, extralog = '', stratname = '') {
    this.CandleNr++;

    if (this.filename === '') {
      //base it upon creation time if no filename was givven
      var today = new Date();
      var dd = String(today.getDate()).padStart(2, '0');
      var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = today.getFullYear();
      var hh = String(today.getHours()).padStart(2, '0');
      var mm = String(today.getMinutes()).padStart(2, '0');
      today = yyyy + '-' + mm + '-' + dd + ' ' + hh + mm;
      this.filename = stratname + ' log ' + today + '.log';
    }

    if (this.firstrun) {
      var isWin = process.platform === 'win32';
      if (isWin) this.linebreaktype = '\r\n';
      else this.linebreaktype = '\n';

      fs.access(this.filename, err => {
        if (!err) {
          console.log('previous log file name existed, deleting it');
          //	fs.unlink(this.filename);
        }
        console.log('New candle data log :', this.filename);
      });
      this.firstrun = false;
    }
    var moment = String(candle.start);
    var timestamp = moment.substring(0, moment.lastIndexOf(' GMT'));

    var logline =
      this.CandleNr +
      ',' +
      timestamp +
      ',' +
      candle.open +
      ',' +
      candle.close +
      ',' +
      candle.high +
      ',' +
      candle.low +
      ',' +
      candle.vwp +
      ',' +
      candle.volume +
      ',' +
      candle.trades;
    if (extralog !== '') logline = logline + ',' + extralog;
    logline = logline + this.linebreaktype;
    fs.appendFile(this.filename, logline, function (err) {
      if (err) throw err;
    });
  },

  writeheader: function (extralog = '', stratname = '') {
    if (this.filename === '') {
      //base it upon creation time if no filename was givven
      var today = new Date();
      var dd = String(today.getDate()).padStart(2, '0');
      var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = today.getFullYear();
      var hh = String(today.getHours()).padStart(2, '0');
      var mm = String(today.getMinutes()).padStart(2, '0');
      today = yyyy + '-' + mm + '-' + dd + ' ' + hh + mm;
      this.filename = stratname + ' log ' + today + '.log';
    }
    if (this.firstrun) {
      fs.access(this.filename, err => {
        if (!err) {
          console.log('previous log file name existed, deleting it');
          fs.unlink(this.filename);
        }
        console.log('New candle data log :', this.filename);
      });
      this.firstrun = false;
    }

    logline =
      'CandleNr, date,time, open ,close, high ,low,vwp ,volume , trades';
    if (extralog !== '') logline = logline + ',' + extralog;
    fs.appendFile(this.filename, logline, function (err) {
      if (err) throw err;
    });
  },
};

var largestCandle = {
  open: 0.0,
  close: 0.0,
  length: 0.0,
};

var candleLength = 0;
var upperShadow = 0;
var lowerShadow = 0;
var lastThreeTrend = '';
var message = '';
//var gotCoins = false;
var candles = [];


var strat = {
  boughtAt: 0,
  candleCurrent: 0,
  maxSinceBought: 0,
  gotCoins: false,


  // Prepare everything our method needs
  init: function () {
    this.input = 'candle';
    this.requiredHistory = 100;
    this.resistance = 3000; //config.candlesticks.resistance;
    this.support = 1000; // config.candlesticks.support;
  },

  // What happens on every new candle?
  update: function (candle) {
    this.candleCurrent = candle.close;
    // check if candle is open or close
    if (candle.close > candle.open) {
      // open candle
      candleLength = candle.close - candle.open;
      upperShadow = candle.high - candle.close;
      lowerShadow = candle.open - candle.low;
    } else {
      // close candle
      candleLength = candle.open - candle.close;
      upperShadow = candle.high - candle.open;
      lowerShadow = candle.close - candle.low;
    }

    //! Disabled
    // Store current candle as largest if candle length greater than largest candle
    /*  if (candleLength > largestCandle.length) {
        largestCandle.open = candle.open;
        largestCandle.close = candle.close;
        largestCandle.length = candleLength;
      }
  */
   //! I disabled above original math as it would favor the largest candle ever.
   //! Instead I use a nearing function here.
   //! Which adjusts based upon the larger candles (can shrink and expand over time)
   //! Its a very basic function this can be done in other ways as well.
    if (candleLength > largestCandle.length * 0.75) {
      largestCandle.open = (largestCandle.open * 3 + candle.open) / 4;
      largestCandle.close = (largestCandle.close * 3 + candle.close) / 4;
      largestCandle.length = (largestCandle.length * 3 + candleLength) / 4;
    }

    candles.push(candle);

    if (candles.length > 10) {
      candles.shift();
    }
  },



  //Trading functions
  GoShort: function (msg, forced = false) {
    if (this.gotCoins) {
      if (forced) {
        console.log(msg);
        this.advice('short');
        this.gotCoins = false;
        this.boughtAt = 0;
      } else if (this.boughtAt + 25 < this.candleCurrent) {
        console.log(msg);
        this.advice('short');
        this.gotCoins = false;
        this.boughtAt = 0;
      }

    }
  },

  GoLong: function (msg) {
    if (!this.gotCoins) {
      console.log(msg);
      this.advice('long');
      this.gotCoins = true;
      this.boughtAt = this.candleCurrent;
      this.maxSinceBought = this.boughtAt;
    }
  },



  //Adding Candles by Peter noy yet used but made in regards to my comments on top. (to sum X candles )
  SumCandles: function (candles, start, length) {
    var sum =
    {
      start: 0,
      stop: 0,
      high: 0,
      low: 0,
      volume: 0,
      trades: 0
    };
    sum.high = candles[start].high;
    sum.low = candles[start].low;
    sum.start = candles[start].open;
    sum.stop = candles[start + length].close;

    for (i = start; i < length; i++) {
      if (candles[i].high > sum.high) sum.high = candles[i].high;
      if (candles[i].low < sum.low) sum.low = candles[i].low;
      sum.volume = sum.volume + candles[i].volume;
      sum.trades = sum.trades + candles[i].trades;
    }
    return sum;
  },



  // how we act on patterns (to group candle code appart from main check: function), trading is done inside
  CandleStickPattern: function () {

    if (candleLength < largestCandle.length * 0.25) {
      lastThreeTrend = 'varies';

      if (candles[0].close <= candles[1].close && candles[1].close <= candles[2].close) { lastThreeTrend = 'up'; }
      if (candles[2].close <= candles[7].close && candles[1].close <= candles[0].close) { lastThreeTrend = 'down'; }

      if (candleLength < upperShadow * 1.5 && candleLength < lowerShadow * 1.5) { message = message + 'High Wave Candle spotted'; } //beter not trade market is uncertain
      else if (candleLength < largestCandle.length * 0.02) {
        if (lowerShadow > candleLength * 5 && upperShadow < candleLength) {
          message = message + 'Dragonfly Doji spotted';
          this.GoLong(message);
        } else if (upperShadow > candleLength * 5 && lowerShadow < candleLength) {
          message = message + 'Tombstone Doji spotted';
          this.GoShort(message);
        } else {
          message = message + 'Doji spotted';
        }
      } else if (candleLength < lowerShadow * 0.5) {
        // lower shadow 2x or larger than body
        if (lastThreeTrend == 'up') {
          message = message + 'Hangman spotted';
          //  this.GoShort(message);
        }

        if (lastThreeTrend == 'down') {
          message = message + 'Hammer spotted';
          //     this.GoLong(message);
        } else if (candleLength < upperShadow * 0.5 && lastThreeTrend == 'up') {
          message = message + 'Shooting Star spotted';
          //   this.GoShort(message);  ==> to often fired !!!

        } else {

          message = message + 'Spinning Top spotted';
          //  this.GoLong(message);

        }
      }
    }
  },


  //Main trading function
  check: function (candle) {
    message = '';

    // console.log(this.SumCandles(candles,0,2))  //shold work not implementd in any logic yet


    candle.close + ' ';
 

    this.CandleStickPattern(); //calling the CandleStickPatern logic
    if (this.gotCoins) {
      if (this.candleCurrent > this.maxSinceBought) this.maxSinceBought = this.candleCurrent;

      var c = math.sqrt(this.maxSinceBought) / math.log10(this.maxSinceBought);

      //  if (this.candleCurrent<this.maxSinceBought*c)this.GoShort('defensive move',true);

      if (this.candleCurrent < this.maxSinceBought - c) this.GoShort('defensive move', true);
    }


    // Long Day Candle - 90% of the largest candle or greater
    if (candleLength >= largestCandle.length * 0.9) {
      if (
        upperShadow < candleLength * 0.01 &&
        lowerShadow < candleLength * 0.01
      ) {
        message = message + 'Marubozu Candle spotted';
      } else {
        message = message + 'Long Day Candle spotted';
      }
    }

    //Disabled code below, not sure about what it does, it made debuging reasoning to complex (might be needed see comments on top)
    /*
        // Report if candles are within 10% range of resistance or support,
        // indicating a strong signal
        if (candle.close * 0.9 < this.support) {
          message = message + '\nCandle within 10% range of support';
        }
        if (candle.close * 1.1 > this.resistance) {
          message = message + '\nCandle within 10% range of resistance';
        }
    */
    //! console.log(message); // notice i supress here
    message = '';
  }
};


module.exports = strat;






/*****************************************************************************************************************************
/* Original code which contains a bug, kept in here mainly so i can revert code and compare original code quickly if required.

// Candlesticks
//
// This strategy will send out a message
// if the previous candle matches a spinning
// top, a high wave, a doji, a long day candle,
// a hangman, a shooting star or a hammer.

// You need to set the support and resistance
// level so this strat knows where these candles
// are in relation to these levels.

var log = require('../core/log');
var config = require('../core/util.js').getConfig();

// Let's create our own strat
var strat = {};

var largestCandle = {
  open: 0.0,
  close: 0.0,
  length: 0.0
}

var candleLength = 0;
var upperShadow = 0;
var lowerShadow = 0;
var lastThreeTrend = '';
var message = '';

var candles = [];
var CandleLog = [];
// Prepare everything our method needs
strat.init = function () {
  this.input = 'candle';
  this.requiredHistory = 100;
  // this.resistance = 3000;//config.candlesticks.resistance;
  // this.support =1000;// config.candlesticks.support;
  console.clear();
  var legenda =
    ' High Wave candle - Spinning Top with extra long upper and lower shadows \n' +
    ' Doji             - Open and close almost the same price \n' +
    ' Dragonfly Doji   - Doji with extremely long lower shadow, very strong bullish signal if at support level \n' +
    ' Tombstone Doji   - Doji with extremely long upper shadow \n' +
    ' Marubozu Candle  - buy or sell continous in current direction. (no higher or lower inbetween the candle) \n' +
    ' Combinations of candles : \n' +
    ' * Previous 3 candles are open candles, and ..\n' +
    '     Hangman       -  current candle is a spinning top with lower shadow 2x or greater than body \n' +
    '     Shooting star -  current candle is a spinning top with upper shadow 2x or greater than body \n' +
    ' * Previous 3 candles are close candles, and ..\n' +
    '      Hammer         - current candle is a spinning top with lower shadow 2x or greater than body';
  console.log(legenda);
}

// What happens on every new candle?
strat.update = function (candle) {
  // check if candle is open or close
  if (candle.close > candle.open) { // open candle
    candleLength = candle.close - candle.open;
    upperShadow = candle.high - candle.close;
    lowerShadow = candle.open - candle.low;

  } else {                          // close candle
    candleLength = candle.open - candle.close;
    upperShadow = candle.high - candle.open;
    lowerShadow = candle.close - candle.low;
  }

  // Store current candle as largest if candle length greater than largest candle
  if (candleLength > largestCandle.length) {
    largestCandle.open = candle.open;
    largestCandle.close = candle.close;
    largestCandle.length = candleLength;
  }

  candles.push(candle);

  if (candles.length > 10) {
    candles.shift();
  }

}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function (candle) {

  message = '';//candle.close + ' ';

  var cmsg = ''
  for (c = 0; c < candles.length; c++) { cmsg = cmsg + candles[c].close.toFixed(2) + ' '; }
  console.log(cmsg);

  lastThreeTrend = "##";
  // Spinning Top - 1/4 the size of the largest candle
  if (candleLength < largestCandle.length * 0.25) {
    lastThreeTrend = '??'

    // something is wrong here its never asigned up or down  !!!
    if (candles[6].close <= candles[7].close && candles[7].close <= candles[8]) { lastThreeTrend = 'up'; var c = 5 / 0; }
    if (candles[8].close <= candles[7].close && candles[7].close <= candles[6]) { lastThreeTrend = 'down'; var c = 6 / 0; }

    if (candleLength < upperShadow * 1.5 && candleLength < lowerShadow * 1.5) { message = message + 'High Wave Candle'; }
    else if (candleLength < largestCandle.length * 0.02)
    {
      if (lowerShadow > candleLength * 5 && upperShadow < candleLength) { message = message + 'Dragonfly Doji'; }
      else if (upperShadow > candleLength * 5 && lowerShadow < candleLength) {message = message + 'Tombstone Doji'; }
      else { message = message + 'Doji'; }
    }
    else if (candleLength < lowerShadow * 0.5)
    { // lower shadow 2x or larger than body
      if (lastThreeTrend == 'up') {   message = message + 'Hangman'; }
      if (lastThreeTrend == 'down') { message = message + 'Hammer';  }
    }
    else if (candleLength < upperShadow * 0.5 && lastThreeTrend == 'up') { message = message + 'Shooting Star';}
    else { message = message + 'Spinning Top'; }


    // Long Day Candle - 90% of the largest candle or greater
    if (candleLength >= largestCandle.length * 0.9) {
      if (upperShadow < candleLength * 0.01 && lowerShadow < candleLength * 0.01) {message = message + 'Marubozu Candle';}
       else {message = message + 'Long Day Candle';}
    }

    CandleLog.push(lastThreeTrend + ' ' + message);
    if (CandleLog.length > 3) { CandleLog.shift(); }
    console.log(CandleLog);



    /*
    // Report if candles are within 10% range of resistance or support,
    // indicating a strong signal
    if (candle.close * 0.9 < this.support) {
      message = message + '\nCandle within 10% range of support';
    }
    if (candle.close * 1.1 > this.resistance) {
      message = message + '\nCandle within 10% range of resistance';
    }
    */
//console.log(message);
//log.info(message);
//message = '';

// }

// module.exports = strat;
