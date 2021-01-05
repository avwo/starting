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

  program.parse_(argv || process.argv);

  if (!bingo) {
    console.log('Type \'' + (program.getConfig('name') || conf.name) + ' help\' for usage.');
  }

  return program;
};

function getOptions() {
  var options = {
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
