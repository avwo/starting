var program = require('../lib');
var path = require('path');
var name = 'test';

program.setConfig({
	main: path.join(__dirname, 'test.js'),
	log: path.resolve('../../error.log'),
	running: function(options) {
		return options.running && path.resolve(options.running) 
		|| path.resolve('../../.test-running');
	},
	name: name,
	version: '0.1.0',
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
	.option('-r, --running [path]', 'running file', String, undefined)
	.option('-n, --username [username]', 'login username', String, undefined)
	.option('-w, --password [password]', 'login password', String, undefined)
	.option('-p, --port [port]', 'port', parseInt, undefined)
	.option('-b, --bootstrap [script path]', 'automatic startup script path', String, undefined)
	.option('-f, --config [config file path]', 'startup config file path', String, undefined)
	.parse(process.argv);
