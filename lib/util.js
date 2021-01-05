
var cp = require('child_process');

exports.parseJSON = function parseJSON(data, decode) {
  if (data) {
    try {
      data = JSON.parse(decode ? decodeURIComponent(data) : data);
    } catch(e) {
      data = null;
    }
  }

  return data || {};
};

exports.setSudoGid = function setSudoGid() {
  if (process.setgid && process.getgid) {
    process.umask('002');
    process.setgid(parseInt(process.env['SUDO_GID'] || process.getgid(), 10));
  }
};

exports.getVersion = function getVersion(execPath) {
  if (!execPath) {
    return process.version;
  }
  if (typeof cp.spawnSync === 'function') {
    try {
      if (/v\d+\.\d+\.\d+/.test(String(cp.spawnSync(execPath, ['-v']).output))) {
        return RegExp['$&'];
      }
    } catch (e) {}
  }
};

exports.getMaxSemiSpaceFlag = function getMaxSemiSpaceFlag(execPath) {
  if (typeof cp.spawnSync !== 'function') {
    return;
  }
  try {
    var v8Options = String(cp.spawnSync(execPath || 'node', ['--v8-options']).output);
    if (v8Options.indexOf('--max-semi-space-size') !== -1) {
      return '--max-semi-space-size';
    }
    if (v8Options.indexOf('--max_semi_space_size') !== -1) {
      return '--max_semi_space_size';
    }
  } catch (e) {}
};
