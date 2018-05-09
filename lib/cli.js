var util = require('util');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra2');
var cp = require('child_process');
var os = require('os');
var BOOTSTRAP_PATH = path.join(__dirname, 'bootstrap.js');
//默认设置为`~`，防止Linux在开机启动时Node无法获取homedir
var homedir = (typeof os.homedir == 'function' ? os.homedir() : 
process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME']) || '~';
var DATA_DIR = path.join(homedir, '.startingAppData');
fse.ensureDirSync(DATA_DIR);

function isRunning(pid, callback) {

  pid ? cp.exec(util.format(process.platform === 'win32' ? 
    'tasklist /fi "PID eq %s" | findstr /i "node.exe"'
    : 'ps -f -p %s | grep "node"', pid), 
    function (err, stdout, stderr) {
      callback(!err && !!stdout.toString().trim());
    }) : callback(false);
}

exports.isRunning = isRunning;

function run(main, options, callback) {
  options.debugMode = true;
  callback = callback || noop;
  var child = execCmd(main, options, {
    stdio: [ 0, 1, 'pipe']
  });
  var timer;
  var delay = function(stop) {
    clearTimeout(timer);
    if (!stop) {
      timer = setTimeout(function() {
        callback(null, options);
      }, 1000);
    }
  };
  var err = '';

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', function(data) {
    delay();
    err += data;
  });
  child.stderr.on('end', function(data) {
    delay(true);
    callback(err || 'Error: unknown', options);
  });
  delay();
}

exports.run = run;

function start(main, options, callback) {
  var config = readConfig(main);
  callback = callback || noop;
  isRunning(config.pid, function (isrunning) {
    if (isrunning) {
      return callback(true, config.options || {});
    }

    isRunning(config._pid, function (isrunning) {
      if (isrunning) {
        return callback(true, config.options || {});
      }

      var errorFile = path.join(DATA_DIR, 'error.' + encodeURIComponent(main));
      try {
        if (fs.existsSync(errorFile)) {
          fs.unlinkSync(errorFile);
        }
      } catch(e) {
        return callback(e, options);
      }

      var child = execCmd(main, options, {
        detached: true,
        stdio: ['ignore', 'ignore', fs.openSync(errorFile, 'a+')]
      });

      config._pid = child.pid;
      config.main = main;
      try {
        writeConfig(main, config);
      } catch(e) {
        return callback(e, options);
      }

      var startTime = Date.now();
      (function execCallback() {
        var error;
        try {
          error = fs.readFileSync(errorFile, {encoding: 'utf8'});
        } catch(e) {}

        if (error) {
          callback(error, options);
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
        callback(null, options);
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
  main = config.main;
  callback = callback || noop;
  isRunning(pid, function (isrunning) {
    try {
      pid && process.kill(pid);
      removeConfig(main);
    } catch (err) {
      isrunning = isrunning && err;
    }

    if (isrunning) {
      callback(isrunning, main, config.options || {});
    } else {
      isRunning(_pid, function (isrunning) {
        try {
          _pid && process.kill(_pid);
          removeConfig(main);
        } catch (err) {
          isrunning = isrunning && err;
        }
        callback(isrunning, main, config.options || {});
      });
    }
  });
}

exports.stop = stop;

function getHashIndex(main) {
  var lastIndex = main.length - 1;
  if (main[lastIndex] == '#') {
    lastIndex = main.lastIndexOf('#', lastIndex - 1);
  } else {
    lastIndex = -1;
  }
  return lastIndex;
}

function getRunningPath(main) {
  var index = getHashIndex(main);
  main = encodeURIComponent(index == -1 ? '#' : main.substring(index));
  return path.join(DATA_DIR, main);
}

function execCmd(main, data, options) {
  var lastIndex = getHashIndex(main);
  if (lastIndex != -1) {
    main = main.substring(0, lastIndex);
  }
  var args = [BOOTSTRAP_PATH, 'run', main];
  var cmd;

  if (data) {
    args.push('--data');
    args.push(encodeURIComponent(JSON.stringify(data)));
  }

  return cp.spawn(cmd || 'node', args, options);
}

function readConfig(main) {
  try {
    return fse.readJsonSync(getRunningPath(main));
  } catch(e) {}

  var running = path.join(DATA_DIR, encodeURIComponent(main));
  try {
    return fse.readJsonSync(running);
  } catch(e) {}

  return {};
}

function writeConfig(main, config) {
  fse.outputJsonSync(getRunningPath(main), config || {});
}

function removeConfig(main) {
  var running = getRunningPath(main);
  fs.existsSync(running) && fse.removeSync(running);
  running = path.join(DATA_DIR, encodeURIComponent(main));
  fs.existsSync(running) && fse.removeSync(running);
}

function noop() {}

