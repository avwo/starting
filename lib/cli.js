var util = require('util');
var comUtil = require('./util');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra2');
var cp = require('child_process');
var os = require('os');
var BOOTSTRAP_PATH = path.join(__dirname, 'bootstrap.js');

//默认设置为`~`，防止Linux在开机启动时Node无法获取homedir
var TIMEOUT = 1200;
var defaultDir;
var dataDir;

function getHomeDir() {
  return (typeof os.homedir == 'function' ? os.homedir() : process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME']) || '~';
}

function getDataDir() {
  if (!dataDir) {
    var homedir = process.env.STARTING_DATA_DIR || getHomeDir();
    dataDir = path.join(homedir, '.startingAppData');
    fse.ensureDirSync(dataDir);
  }
  return dataDir;
}

exports.getDefaultDir = function() {
  defaultDir = defaultDir || path.join(getHomeDir(), '.startingAppData');
  return defaultDir;
};

/* eslint-disable no-console */
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
    stdio: [ 0, 1, 2]
  });
  var execCallback = function() {
    timer && callback(null, options);
    timer = null;
  };
  var timer = setTimeout(execCallback, TIMEOUT);
  var handleExit = function() {
    clearTimeout(timer);
    timer = null;
  };
  child.on('exit', handleExit);
  child.on('close', handleExit);
}

exports.run = run;

function start(main, options, callback, version, isRestart) {
  var config = readConfig(main);
  if (config && !isRestart && config.version != version) {
    return restart(main, options, callback, version);
  }
  callback = callback || noop;
  isRunning(config.pid, function (isrunning) {
    if (isrunning) {
      return callback(true, config.options || {});
    }

    isRunning(config._pid, function (isrunning) {
      if (isrunning) {
        return callback(true, config.options || {});
      }

      var errorFile = path.join(getDataDir(), 'error.' + encodeURIComponent(main));
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
      config.version = version;
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
          callback(null, options);
          console.error(error);
          try {
            fs.unlinkSync(errorFile);
          } catch(e) {}
          return;
        }

        if (Date.now() - startTime < TIMEOUT) {
          return setTimeout(execCallback, 200);
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

function restart(main, options, callback, version) {
  stop(main, function (_, _main, opts) {
    setTimeout(function () {
      if (!options.clearPreOptions) {
        var noGlobalPlugins = opts.noGlobalPlugins;
        options = util._extend(opts, options);
        options.noGlobalPlugins = noGlobalPlugins || options.noGlobalPlugins;
      }
      start(main, options, callback, version, true);
    }, 300);
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

function getRunningPath(main, dataDir) {
  var index = getHashIndex(main);
  main = encodeURIComponent(index == -1 ? '#' : main.substring(index));
  return path.join(dataDir || getDataDir(), main);
}


function execCmd(main, data, options) {
  var lastIndex = getHashIndex(main);
  if (lastIndex != -1) {
    main = main.substring(0, lastIndex);
  }
  var args = [BOOTSTRAP_PATH, 'run', main];
  if (data.inspectBrk) {
    args.unshift('--inspect-brk' + (data.inspectBrk === true ? '' : '=' + data.inspectBrk));
  } else if (data.inspect) {
    args.unshift('--inspect' + (data.inspect === true ? '' : '=' + data.inspect));
  }
  var execPath = process.env.STARTING_EXEC_PATH;
  var version = comUtil.getVersion(execPath);
  if (version) {
    var flag = comUtil.getMaxSemiSpaceFlag(version);
    flag && args.unshift(flag + '=64');
    version = version.substring(1).split('.');
    var supportTlsMinV1 = version[0] > 11;
    var supportMaxHeaderSize = (version[0] == 10 && version[1] >= 15) || (version[0] == 11 && version[1] > 5) || version[0] > 11;
    var maxHeaderSize = data.__maxHttpHeaderSize;
    supportMaxHeaderSize && args.unshift('--max-http-header-size=' + (maxHeaderSize > 0 ? maxHeaderSize : 256000));
    supportTlsMinV1 && args.unshift('--tls-min-v1.0');
  }
  if (data) {
    args.push('--data');
    args.push(encodeURIComponent(JSON.stringify(data)));
  }

  return cp.spawn(execPath || 'node', args, options);
}

function readConfig(main, dataDir) {
  try {
    return fse.readJsonSync(getRunningPath(main, dataDir));
  } catch(e) {}

  var running = path.join(dataDir || getDataDir(), encodeURIComponent(main));
  try {
    return fse.readJsonSync(running);
  } catch(e) {}

  return {};
}

exports.readConfig = readConfig;

function writeConfig(main, config) {
  fse.outputJsonSync(getRunningPath(main), config || {});
}

function removeConfig(main, dataDir) {
  var running = getRunningPath(main, dataDir);
  fs.existsSync(running) && fse.removeSync(running);
  running = path.join(dataDir || getDataDir(), encodeURIComponent(main));
  fs.existsSync(running) && fse.removeSync(running);
}

exports.removeConfig = removeConfig;

function noop() {}
