var	util = require('util');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var cp = require('child_process');
var os = require('os');
var BOOTSTRAP_PATH = path.join(__dirname, 'bootstrap.js');
var homedir = typeof os.homedir == 'function' ? os.homedir() : 
	process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'];
var DATA_DIR = path.join(homedir, '.startingAppData');
fse.ensureDirSync(DATA_DIR);

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
	execCmd(main, options, {
		stdio: [ 0, 1, 2 ]
	});
	callback && callback();
}

exports.run = run;

function start(main, options, callback) {
	var config = readConfig(main);
	
	isRunning(config.pid, function (isrunning) {
		if (isrunning) {
			return callback && callback(true);
		}
		
		isRunning(config._pid, function (isrunning) {
			if (isrunning) {
				return callback && callback(true);
			}
			
			var errorFile = path.join(DATA_DIR, 'error.' + encodeURIComponent(main));
			if (fs.existsSync(errorFile)) {
				fs.unlinkSync(errorFile);
			}
			
			child = execCmd(main, options, {
				detached: true,
				stdio: ['ignore', 'ignore', fs.openSync(errorFile, 'a+')]
			});
			
			config._pid = child.pid;
			config.main = main;
			writeConfig(main, config);
			
			var startTime = Date.now();
			(function execCallback() {
				var error;
				try {
					error = fs.readFileSync(errorFile, {encoding: 'utf8'});
				} catch(e) {}
				
				if (error) {
					console.log(error);
					try {
						process.kill(child.pid);
						delete config._pid;
					} catch(e) {}
					return;
				}
				
				if (Date.now() - startTime < 3000) {
					
					return setTimeout(execCallback, 600);
				}
				
				delete config._pid;
				config.pid = child.pid;
				config.options = options;
				writeConfig(main, config);
				child.unref();
				callback && callback();
			})();
		});
	});
}

exports.start = start;

function restart(main, options, callback) {
	stop(main, function (isrunning, _main, opts) {
		setTimeout(function () {
			start(main, util._extend(opts, options), callback);
		}, 1000);
	});
}

exports.restart = restart;

function stop(main, callback) {
	var config = readConfig(main);
	var pid = config.pid;
	var _pid = config._pid;
	var main = config.main;
	
	isRunning(pid, function (isrunning) {
		try {
			pid && process.kill(pid);
			removeConfig(main);
		} catch (err) {
			isrunning = isrunning && err;
		}
		
		if (isrunning) {
			callback && callback(isrunning, main, config.options || {});
		} else {
			isRunning(_pid, function (isrunning) {
				try {
					_pid && process.kill(_pid);
					removeConfig(main);
				} catch (err) {
					isrunning = isrunning && err;
				}
				callback && callback(isrunning, main, config.options || {});
			});
		}
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

function readConfig(main) {
	var running = path.join(DATA_DIR, encodeURIComponent(main));
	try {
		return fse.readJsonSync(running);
	} catch(e) {}
	
	return {};
}

function writeConfig(main, config) {
	var running = path.join(DATA_DIR, encodeURIComponent(main));
	fse.outputJsonSync(running, config || {});
}

function removeConfig(main) {
	var running = path.join(DATA_DIR, encodeURIComponent(main));
	fs.existsSync(running) && fse.removeSync(running);
}

