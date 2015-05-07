var program = require('../lib');
var command = new program.Command();
var path = require('path');
var config = require('../package.json');

command
	.version(config.version)
	.usage('<command> [options]');

command
	.command('run <path>')
	.description('Start a front service')
	.action(function (path) {
		bingo = true;
		exec(path, 'run');
	});

command
	.command('start <path>')
	.description('Start a background service')
	.action(function (path) {
		bingo = true;
		exec(path, 'start');
	});

command
	.command('stop <path>')
	.description('Stop current background service')
	.action(function (path) {
		bingo = true;
		exec(path, 'stop');
	});

command
	.command('restart <path>')
	.description('Restart current background service')
	.action(function (path) {
		bingo = true;
		exec(path, 'restart');
	});

command
	.command('help')
	.description('Display help information')
	.action(function () {
		bingo = true;
		command.help();
	});

command
	.option('-m, --main [path]', 'main file path', String, undefined)
	.option('-n, --modname [name]', 'name', String, undefined)
	.option('-v, --version [version]', 'version', String, undefined)
	.option('-l, --log [pth]', 'log', String, undefined)
	.option('-r, --running [path]', 'running config file', String, undefined)
	.parse(process.argv);

function exec(path, cmdName) {
	var name = command.modname || config.name;

	program.setConfig({
		main: path,
		name: name,
		version: command.version,
		log: command.log,
		running: command.running,
		runCallback: function() {
			console.log('[i] Press [Ctrl+C] to stop ' + name + '...');
		},
		startCallback: function(alreadyInRunning) {
			console.log('[!] ' + name + ( alreadyInRunning ? ' is running.' : ' started.'));
		},
		restartCallback: function() {
			console.log('[!] ' + name + ' started.');
		},
		stopCallback: function(err) {
			if (err === true) {
				console.log('[i] ' + name + ' killed.');
			} else if (err) {
					err.code === 'EPERM' ? console.log('[!] Cannot kill ' + name + ' owned by root.\n' +
						'    Try to run command with `sudo`.')
					: console.log('[!] %s', err.message);
			} else {
				console.log('[!] No running ' + name + '.');
			}
		}
	});

	program
		.parse(['node', name, cmdName]);
}
