var program = require('commander');
var cli = require('./cli');
var conf = require('../package.json');
var config;
var bingo = false;

/* eslint no-console: "off" */
program.usage('<command> [options]');

program.setConfig = function(conf) {
  config = conf;
  if (config.execPath) {
    process.env.STARTING_EXEC_PATH = process.env.STARTING_EXEC_PATH || config.execPath;
  }
  return this;
};

program.getConfig = function(name) {
  if (!config) {
    config = {};
  }

  var _config = {};
  var options = getOptions();

  Object.keys(config).forEach(function (name) {
    if (!/Callback$/.test(name) && typeof config[name] == 'function') {
      _config[name] = config[name](options);
    } else {
      _config[name] = config[name];
    }
  });

  return arguments.length > 0 ? _config[name] : _config;
};

program.parse_ = program.parse;

function getMaxHttpHeaderSize(argv) {
  for (var i = 3, len = argv.length; i < len; i++) {
    var name = argv[i];
    if (name === '--max-http-header-size') {
      var size = argv[i + 1];
      argv.splice(i, 1);
      if (size && size[0] !== '-') {
        argv.splice(i + 1, 1);
      }
      return size > 0 ? size : 0;
    }
    if (/^--max-http-header-size=([^\s]+)$/.test(name)) {
      argv.splice(i, 1);
      return RegExp.$1 > 0 ? RegExp.$1 : 0;
    }
  }
  return 0;
}

program.parse = function(argv) {

  if (!program.optionFor('--version')) {
    program
      .version(program.getConfig('version') || conf.version);
  }

  program
    .command('run')
    .description('Start a front service')
    .action(function () {
      bingo = true;
      cli.run(program.getConfig('main'), getOptions(), program.getConfig('runCallback'));
    });

  program
    .command('start')
    .description('Start a background service')
    .action(function () {
      bingo = true;
      cli.start(program.getConfig('main'), getOptions(),
        program.getConfig('startCallback'), program.getConfig('version'));
    });

  program
    .command('stop')
    .description('Stop current background service')
    .action(function () {
      bingo = true;
      cli.stop(program.getConfig('main'), program.getConfig('stopCallback'));
    });

  program
    .command('restart')
    .description('Restart current background service')
    .action(function () {
      bingo = true;
      cli.restart(program.getConfig('main'), getOptions(),
        program.getConfig('restartCallback'), program.getConfig('version'));
    });

  program
    .command('help')
    .description('Display help information')
    .action(function () {
      bingo = true;
      program.help();
    });
  argv = Array.prototype.slice.call(argv || process.argv || []);
  program.__maxHttpHeaderSize = getMaxHttpHeaderSize(argv);
  program.parse_(argv);

  if (!bingo) {
    console.log('Type \'' + (program.getConfig('name') || conf.name) + ' help\' for usage.');
  }

  return program;
};

function getOptions() {
  var options = {
    __maxHttpHeaderSize: program.__maxHttpHeaderSize,
    clearPreOptions: program.prevOptions === false,
    noGlobalPlugins: program.globalPlugins === false
  };
  Object.keys(program).forEach(function(name) {
    if (program.optionFor('--' + name)) {
      options[name] = program[name];
    }
  });

  return options;
}

module.exports = program;
module.exports.cli = require('./cli');
