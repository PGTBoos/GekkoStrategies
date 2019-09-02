// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
/*
	RSI Bull and Bear + ADX modifier
	1. Use different RSI-strategies depending on a longer trend
	2. But modify this slighly if shorter BULL/BEAR is detected
	-
	(CC-BY-SA 4.0) Tommie Hansen
	https://creativecommons.org/licenses/by-sa/4.0/
	
	UPDATE:
	3. Add pingPong for sideways market
	
    Rafael Martín.



    UPDATE:
    4. Added trendfollowing stoploss 

    Peter Boos.
    


*/

// req's
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();

// strategy
var strat = {
	
	/* INIT */
	init: function()
	{
        console.log(this.settings)
		// core
		this.name = 'RSI Bull and Bear + ADX + PingPong';
		this.requiredHistory = config.tradingAdvisor.historySize;
		this.resetTrend();
		
		// debug? set to false to disable all logging/messages/stats (improves performance in backtests)
		this.debug = false;
		
		// performance
		config.backtest.batchSize = 1000; // increase performance
		config.silent = true;
		config.debug = false;
		
		// SMA
		this.addTulipIndicator('maSlow', 'sma', { optInTimePeriod: this.settings.SMA_long });
		this.addTulipIndicator('maFast', 'sma', { optInTimePeriod: this.settings.SMA_short });
		
		// RSI
		this.addTulipIndicator('BULL_RSI', 'rsi', { optInTimePeriod: this.settings.BULL_RSI });
		this.addTulipIndicator('BEAR_RSI', 'rsi', { optInTimePeriod: this.settings.BEAR_RSI });
		
		// ADX
		this.addTulipIndicator('ADX', 'adx', { optInTimePeriod: this.settings.ADX })
		
		// MOD (RSI modifiers)
		this.BULL_MOD_high = this.settings.BULL_MOD_high;
		this.BULL_MOD_low = this.settings.BULL_MOD_low;
		this.BEAR_MOD_high = this.settings.BEAR_MOD_high;
		this.BEAR_MOD_low = this.settings.BEAR_MOD_low;
		
		
		// debug stuff
		this.startTime = new Date();
		
		// add min/max if debug
		if( this.debug ){
			this.stat = {
				adx: { min: 1000, max: 0 },
				bear: { min: 1000, max: 0 },
				bull: { min: 1000, max: 0 }
			};
		}
		
		/* MESSAGES */
		
		// message the user about required history
		log.info("====================================");
		log.info('Running', this.name);
		log.info('====================================');
		log.info("Make sure your warmup period matches SMA_long and that Gekko downloads data if needed");
		
		// warn users
		if( this.requiredHistory < this.settings.SMA_long )
		{
			log.warn("*** WARNING *** Your Warmup period is lower then SMA_long. If Gekko does not download data automatically when running LIVE the strategy will default to BEAR-mode until it has enough data.");
		}
		
	}, // init()
	
	
	/* RESET TREND */
	resetTrend: function()
	{
		var trend = {
			duration: 0,
			direction: 'none',
			longPos: false, // this will be false or a price if we already have a long position
			pingPong : {
				gainsPercentage: this.settings.PINGPONG_GAINS_PERCENTAGE // when we want to close the long position?
			}
		};
	
		this.trend = trend;
	},
	
	
	/* get low/high for backtest-period */
	lowHigh: function( val, type )
	{
		let cur;
		if( type == 'bear' ) {
			cur = this.stat.bear;
			if( val < cur.min ) this.stat.bear.min = val; // set new
			else if( val > cur.max ) this.stat.bear.max = val;
		}
		else if( type == 'bull' ) {
			cur = this.stat.bull;
			if( val < cur.min ) this.stat.bull.min = val; // set new
			else if( val > cur.max ) this.stat.bull.max = val;
		}
		else {
			cur = this.stat.adx;
			if( val < cur.min ) this.stat.adx.min = val; // set new
			else if( val > cur.max ) this.stat.adx.max = val;
		}
	},
		
	Gotcoins:false,
	BoughtAt:0,
	MaxPeekClose:0,
	Tick:0,
	CurrentCandle:'',

	update: function (candle) 
	{
		this.CurrentCandle = candle;
	},
	
	/* CHECK */
	check: function(candle)
	{
        this.Tick++;  // one might also do something with Tick it counts candles since bougth
                      // idealy one might think up something perhaps if in a side market for X ticks
                      // and this.boughtAt < candle.close then this.goshort ... or so.
                      // I need more time to investigate trends in long side markets (like bitcoin a year ago)
		if(this.Gotcoins){
			if(candle.close > this.MaxPeekClose)
			{
            //	this.MaxPeekClose=(candle.close*2 +candle.high)/3 ;
           this.MaxPeekClose=( this.settings.closeRatio * candle.close + this.settings.highRatio*candle.high)/(this.settings.closeRatio+this.settings.highRatio)
            }

            if(candle.close< this.MaxPeekClose * this.settings.peekPercentage + this.settings.peekShift)    
		//	if(candle.close < this.MaxPeekClose*0.92+50)   
			{
				console.log('Bought around ', this.BoughtAt.close.toFixed(2)  ,'\n escaped falling trend since', this.MaxPeekClose.toFixed(2), candle)
				this.short();
			}
		}
	else
    {

		// get all indicators
		let ind = this.tulipIndicators,
			maSlow = ind.maSlow.result.result,
			maFast = ind.maFast.result.result,
			rsi,
			adx = ind.ADX.result.result;
		
			
		// BEAR TREND
		if( maFast < maSlow )
		{
			rsi = ind.BEAR_RSI.result.result;
			let rsi_hi = this.settings.BEAR_RSI_high,
				rsi_low = this.settings.BEAR_RSI_low;
			
			// ADX trend strength?
			if( adx > this.settings.ADX_high ) rsi_hi = rsi_hi + this.BEAR_MOD_high;
			else if( adx < this.settings.ADX_low ) rsi_low = rsi_low + this.BEAR_MOD_low;
				
			if( rsi > rsi_hi ) this.short();
			else if( rsi < rsi_low ) this.long();
			//else this.pingPong();
			
			if(this.debug) this.lowHigh( rsi, 'bear' );
		}

		// BULL TREND
		else
		{
			rsi = ind.BULL_RSI.result.result;
			let rsi_hi = this.settings.BULL_RSI_high,
				rsi_low = this.settings.BULL_RSI_low;
			
			// ADX trend strength?
			if( adx > this.settings.ADX_high ) rsi_hi = rsi_hi + this.BULL_MOD_high;		
			else if( adx < this.settings.ADX_low ) rsi_low = rsi_low + this.BULL_MOD_low;
				
			if( rsi > rsi_hi ) this.short();
			else if( rsi < rsi_low )  this.long();
			else this.pingPong();
			
			if(this.debug) this.lowHigh( rsi, 'bull' );
		}
		
		// add adx low/high if debug
		if( this.debug ) this.lowHigh( adx, 'adx');
}
	}, // check()


	/* LONG */
	long: function()
	{
		if( this.trend.direction !== 'up' && !this.Gotcoins ) // new trend? (only act on new trends)
		{
			this.resetTrend();
			this.trend.direction = 'up';
			this.trend.longPos = this.candle.close;
			this.advice('long');

			this.Gotcoins=true; //added 4 lines for trend stoploss
			this.MaxPeekClose=0;
			this.Tick=0;
			this.BoughtAt=this.CurrentCandle;
			
			if( this.debug ) log.info('Going long');
		}
		
		if( this.debug )
		{
			this.trend.duration++;
			log.info('Long since', this.trend.duration, 'candle(s)');
		}
	},	
	
	/* SHORT */
	short: function()
	{
		// new trend? (else do things)
		if( this.trend.direction !== 'down' && this.Gotcoins)
		{
			this.resetTrend();
            this.trend.direction = 'down';
            
			this.trend.longPos = false; //2 lines required for trend stoploss
            this.Gotcoins=false;
            
			this.advice('short');
			if( this.debug ) log.info('Going short');
		}
		
		if( this.debug )
		{
			this.trend.duration++;
			log.info('Short since', this.trend.duration, 'candle(s)');
		}
	},
	
	pingPong: function() {
		
		/**
		* If we currently have a long open position we will check if the price
		* current asset is a higher <gainsPercentage> (trend.long +% gainsPercentage> = currentPrice)
		* and if so we close the position.
		*/

		if (this.trend.longPos) {
			
			/**
			* If we have a long open position but the current trend is bullish then
			* we do nothing and let it keep going up
			*/
			//if (this.trend.direction == 'up') return;
			
			if (this.candle.close < (this.trend.longPos - (this.trend.longPos * (this.trend.pingPong.gainsPercentage / 3) / 100))) this.trend.longPos = this.candle.close; 
						
			/**
			* If we do not have a profit percentage we leave here
			*/
			if (this.candle.close < (this.trend.longPos + (this.trend.longPos * this.trend.pingPong.gainsPercentage / 100) )) return;
			
			/**
			* If we have reached here it means that we have an open long, the current trend is
			* bearish and we have a <gainsPercentage> of earnings, therefore we close the position
			* to collect profits and set the longPos to false.
			*/
			this.trend.longPos = false;
			this.advice('short');
		
		
			/**
			* If we have reached here it means that we do not have any long open positions, therefore
			* We can take the opportunity to open a new position when the time is right.
			*/
		} else {
			
			/**
			* If we are in a downtrend we leave here without doing anything, so we let it continue
			* going down and we only act when the trend changes to bullish.
			*/
			if (this.trend.direction == 'down') return;
			
			/**
			* If we have reached here it means that the necessary requirements to return to
			* open a long position, therefore we execute a long and also save the price of the
			* Current candle to know at what price we have started the long.
			*/
			//if (this.candle.close < (this.trend.longPos - (this.trend.longPos * this.trend.pingPong.gainsPercentage / 100) )) return;

			
			
			this.trend.longPos = this.candle.close;
			this.advice('long');
			
		}
	},
	
	
	/* END backtest */
	end: function()
	{
		let seconds = ((new Date()- this.startTime)/1000),
			minutes = seconds/60,
			str;
			
		minutes < 1 ? str = seconds.toFixed(2) + ' seconds' : str = minutes.toFixed(2) + ' minutes';
		
		log.info('====================================');
		log.info('Finished in ' + str);
		log.info('====================================');
	
		// print stats and messages if debug
		if(this.debug)
		{
			let stat = this.stat;
			log.info('BEAR RSI low/high: ' + stat.bear.min + ' / ' + stat.bear.max);
			log.info('BULL RSI low/high: ' + stat.bull.min + ' / ' + stat.bull.max);
			log.info('ADX min/max: ' + stat.adx.min + ' / ' + stat.adx.max);
		}
		
	}
	
};

module.exports = strat;
