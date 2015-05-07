var program = require('commander');
var cli = require('./cli');
var util = require('./util');
var conf = require('../package.json');
var config;
var bingo = false;

program
	.usage('<command> [options]');

program.setConfig = function(conf) {
	config = conf;
};

program.getConfig = function(name) {
	
	return arguments.length > 0 ? config[name] : config;
};

program.parse_ = program.parse;

program.parse = function(argv) {
	program
		.version((program.getConfig('version') || conf.version));
	
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
			cli.start(program.getConfig(), getOptions(), program.getConfig('startCallback'));
		});

	program
		.command('stop')
		.description('Stop current background service')
		.action(function () {
			bingo = true;
			cli.stop(program.getConfig('running'), getOptions(), program.getConfig('stopCallback'));
		});

	program
		.command('restart')
		.description('Restart current background service')
		.action(function () {
			bingo = true;
			cli.restart(program.getConfig(), getOptions(), program.getConfig('restartCallback'));
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
	var options = {};
	Object.keys(program).forEach(function(name) {
		if (program.optionFor('--' + name)) {
			options[name] = program[name];
		}
	});
	
	return options;
}

module.exports = program;
