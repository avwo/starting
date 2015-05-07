var program = require('../lib');
var path = require('path');
var name = 'test';

program.setConfig({
	main: path.join(__dirname, 'test.js'),
	log: path.resolve('../../error.log'),
	running: path.resolve('../../.test-running'),
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
	.option('-r, --rules [rule file path]', 'rules file', String, undefined)
	.option('-n, --username [username]', 'login username', String, undefined)
	.option('-w, --password [password]', 'login password', String, undefined)
	.option('-p, --port [port]', 'port', parseInt, undefined)
	.option('-m, --plugins [script path or module name]', 'express middlewares(plugins) path (as: xx.js,yy/zz.js)', String, undefined)
	.option('-u, --uipath [script path]', 'web ui plugin path', String, undefined)
	.option('-t, --timneout [ms]', 'request timeout', parseInt, undefined)
	.option('-s, --sockets [number]', 'max sockets', parseInt, undefined)
	.option('-d, --days [number]', 'the maximum days of cache', parseInt, undefined)
	.option('-b, --bootstrap [script path]', 'automatic startup script path', String, undefined)
	.option('-c, --config [config file path]', 'startup config file path', String, undefined)
	.parse(process.argv);
