#! /usr/bin/env node

var program = require('commander');
var path = require('path');
var cli = require('../lib/cli');
var config = require('../package.json');
var name = config.name;

program
	.version(config.version)
	.usage('<command> [options]');

program
	.command('run <path>')
	.description('Start a front service')
	.action(function (main) {
		bingo = true;
		cli.run(path.resolve(main), getConfig(), function() {
			console.log('[i] Press [Ctrl+C] to stop ' + name + '...');
		});
	});

program
	.command('start <path>')
	.description('Start a background service')
	.action(function (main) {
		bingo = true;
		cli.start(getConfig(path.resolve(main)), getConfig(), function(alreadyInRunning) {
			console.log('[!] ' + name + ( alreadyInRunning ? ' is running.' : ' started.'));
		});
	});

program
	.command('stop')
	.description('Stop current background service')
	.action(function () {
		bingo = true;
		cli.stop(program.running, function(err) {
			if (err === true) {
				console.log('[i] ' + name + ' killed.');
			} else if (err) {
					err.code === 'EPERM' ? console.log('[!] Cannot kill ' + name + ' owned by root.\n' +
						'    Try to run command with `sudo`.')
					: console.log('[!] %s', err.message);
			} else {
				console.log('[!] No running ' + name + '.');
			}
		});
	});

program
	.command('restart <path>')
	.description('Restart current background service')
	.action(function (main) {
		bingo = true;
		cli.restart(getConfig(path.resolve(main)), function(err) {
			console.log('[!] ' + name + ' started.');
		});
	});

program
	.command('help')
	.description('Display help information')
	.action(function () {
		bingo = true;
		program.help();
	});

program
	.option('-m, --main [path]', 'main file path', String, undefined)
	.option('-c, --command <command>', 'command parameters ("node --harmony")', String, undefined)
	.option('-l, --log [pth]', 'log', String, undefined)
	.option('-r, --running [path]', 'running config file', String, undefined)
	.parse(process.argv);

function getConfig(main) {
	
	return main ? {
		main: main,
		name: name,
		version: config.version,
		log: program.log,
		running: program.running
	} : {command: program.command};
}


