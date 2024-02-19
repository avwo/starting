
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
    try {
      process.umask('002');
      process.setgid(parseInt(process.env['SUDO_GID'] || process.getgid(), 10));
    } catch (e) {}
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

exports.getMaxSemiSpaceFlag = function getMaxSemiSpaceFlag(version) {
  var major = parseInt(version.substring(1, version.indexOf('.')), 10);
  if (major < 6) {
    return;
  }
  return major > 9 ? '--max-semi-space-size' : '--max_semi_space_size';
};
