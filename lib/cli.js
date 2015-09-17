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
		
		var tmpRunning = path.join(__dirname, 'running.log');
		try {
			var data = fs.readFileSync(tmpRunning, 'utf-8').split('\n');
			process.kill(data[0]);
			fs.unlinkSync(tmpRunning);
		} catch(e) {}
		
		//再次kill进程，确保kill掉
		stop(config.running, function () {
			var errorFile = path.join(__dirname, 'error.log')
			if (fs.existsSync(errorFile)) {
				fs.unlinkSync(errorFile);
			}
			
			child = execCmd(config.main, options, {
				detached: true,
				stdio: ['ignore', 'ignore', fs.openSync(errorFile, 'a+')]
			});
			
			var pInfo = child.pid 
			+ '\n' + JSON.stringify(options || {})
			+ '\n' + JSON.stringify(config);
			fs.writeFileSync(tmpRunning,  pInfo);
			
			var startTime = Date.now();
			(function execCallback() {
				var error;
				try {
					error = fs.readFileSync(errorFile, {encoding: 'utf8'});
				} catch(e) {}
				
				if (error) {
					try {
						console.log(error);
						process.kill(child.pid);
					} catch(e) {}
					return;
				}
				
				if (Date.now() - startTime < 2000) {
					
					return setTimeout(execCallback, 200);
				}
				
				child.unref();
				callback && callback();
				fs.writeFileSync(running,  pInfo);
				fs.unlinkSync(tmpRunning);
			})();
		});		
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
		if (data.command) {
			cmd = data.command.trim().split(/\s+/g);
			args.unshift.apply(args, cmd.slice(1));
			cmd = cmd[0];
		}
		
		delete data.command;
		args.push('--data');
		args.push(encodeURIComponent(JSON.stringify(data)));
	}
	
	return cp.spawn(cmd || 'node', args, options);
}

