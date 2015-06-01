var config = require('../src/config');

config.set("cjx", {"aa": "bbb"});
config.set("cjx:aa", {"test": "lalalal"});
config.del("cjx:aa");
config.save();

// config.set({"cjx": "lalalal"});
// config.del();
// config.save();