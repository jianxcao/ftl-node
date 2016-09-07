var winston = require('winston');
var logger = new (winston.Logger)({
	transports: [
	  new (winston.transports.Console)({
			levels: winston.config.npm.levels,
			level: process.env.NODE_ENV === 'dev' ? 'debug' : "info",
			stripColors: true,
			colorize: 'all'
		}),
		// new (winston.transports.File)({ filename: 'info.log' })
	]
});
//logger.error('error');
//logger.warn('warn');
//logger.info("test");
//logger.verbose('verbose');
//logger.debug('debug');
//logger.silly('silly');

module.exports = logger;
