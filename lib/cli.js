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
	
	execCmd(main, options, {
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
	
	var running = config.running || '.running';
	var pid;
	try {
		pid = fs.readFileSync(running, 'utf-8').split('\n')[0];
	} catch(e) {}

	isRunning(pid, function (isruning) {
		if (isruning) {
			return callback && callback(true);
		}

		
		child = execCmd(config.main, options, {
			detached: true,
			stdio: ['ignore', 'ignore', 2]
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
	if (typeof running == 'function') {
		var tmp = running;
		running = callback;
		callback = tmp;
	}
	
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

function execCmd(main, data, options) {
	var args = [BOOTSTRAP_PATH, 'run', main];
	var cmd;
	
	if (data) {
		if (data.custom) {
			cmd = data.custom.trim().split(/\s+/g);
			args.unshift.apply(args, cmd.slice(1));
			cmd = cmd[0];
		}
		
		delete data.custom;
		args.push('--data');
		args.push(encodeURIComponent(JSON.stringify(data)));
	}
	
	return cp.spawn(cmd || 'node', args, options);
}

