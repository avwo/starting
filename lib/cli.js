var	util = require('util');
var path = require('path');
var fs = require('fs');
var cp = require('child_process');
var parseJSON = require('./util').parseJSON;
var BOOTSTRAP_PATH = path.join(__dirname, 'bootstrap.js');

function isRunning(pid, callback) {
	
	pid ? cp.exec(util.format(process.platform === 'win32' ? 
			'tasklist /fi "PID eq %s" | findstr /i "node.exe"'
			: 'ps -f -p %s | grep "node"', pid), 
			function (err, stdout, stderr) {
				callback(!err && !!stdout.toString().trim());
			}) 
			: callback(false);
}

exports.isRunning = isRunning;

function run(main, options, callback) {
	if (typeof options == 'function') {
		var tmp = options;
		options = callback;
		callback = tmp;
	}
	cp.spawn('node', addArgs([BOOTSTRAP_PATH, 'run', main], options), {
		stdio: [ 0, 1, 2 ]
	});
	
	callback && callback();
}

exports.run = run;

function start(config, options, callback) {
	if (typeof options == 'function') {
		var tmp = options;
		options = callback;
		callback = tmp;
	}
	
	if (typeof config == 'string') {
		config = {main: config};
	}
	var now = new Date();
	var log = config.log || util.format('log/' 
			+ 'starting-%s-%s-%s.log',
			now.getFullYear(), now.getMonth() + 1, now.getDate());
	var running = config.running || '.running';
	
	var pid;
	try {
		pid = fs.readFileSync(running, 'utf-8').split('\n')[0];
	} catch(e) {}

	isRunning(pid, function (isruning) {
		if (isruning) {
			return callback && callback(true);
		}

		!fs.existsSync('log') && fs.mkdirSync('log');
		
		child = cp.spawn('node', addArgs([BOOTSTRAP_PATH, 'run', config.main], options), {
			detached: true,
			stdio: ['ignore', 'ignore', fs.openSync(log, 'a+')]
		});

		fs.writeFileSync(running,  child.pid 
				+ '\n' + JSON.stringify(options || {})
				+ '\n' + JSON.stringify(config));
		child.unref();

		callback && callback();
	
	});
}

exports.start = start;

function restart(config, options, callback) {
	if (typeof options == 'function') {
		var tmp = options;
		options = callback;
		callback = tmp;
	}
	
	stop(config.running, function (isrunning, conf, opts) {
		setTimeout(function () {
			start(util._extend(conf, config), util._extend(opts, options), callback);
		}, 1000);
	});
}

exports.restart = restart;

function stop(running, callback) {
	var data, pid, config, options;
	running = running || '.running';
	try {
		data = fs.readFileSync(running, 'utf-8').split('\n');
		pid = data[0];
		options = parseJSON(data[1]);
		config = parseJSON(data[2]);
	} catch(e) {}
	
	isRunning(pid, function (isruning) {
		if (isruning) {
			try {
				process.kill(pid);
				fs.unlinkSync(running);
			} catch (err) {
				isruning = err;
			}
		}

		callback && callback(isruning, config || {}, options || {});
	});
}

exports.stop = stop;

function addArgs(args, options) {
	if (options) {
		args.push('--data');
		args.push(encodeURIComponent(JSON.stringify(options)));
	}
	
	return args;
}

