
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
