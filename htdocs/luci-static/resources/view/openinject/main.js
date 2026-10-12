'use strict';
'require rpc';
'require uci';
'require view';
'require form';
'require poll';

var callGetStatus = rpc.declare({
	object: 'luci-openinject',
	method: 'getStatus',
	params: []
});

var callGetLogs = rpc.declare({
	object: 'luci-openinject',
	method: 'getLogs',
	params: []
});

var callRCInit = rpc.declare({
	object: 'rc',
	method: 'init',
	params: [ 'name', 'action' ]
});

function renderBadge(label, val) {
	var isUp = !!val;
	var color = isUp ? '#28a745' : '#dc3545';
	var text = isUp ? (label === 'TUN Meta' ? 'UP' : 'RUNNING') : (label === 'TUN Meta' ? 'DOWN' : 'STOPPED');
	return '<span>' + label + ': <b style="color:' + color + '">' + text + '</b></span>';
}

function updateStatusDom(status) {
	var el = document.getElementById('oi_status_badge_container');
	if (!el) return;
	el.innerHTML = [
		renderBadge('openinject', status.openinject),
		renderBadge('mihomo', status.mihomo),
		renderBadge('TUN Meta', status.tun)
	].join(' &nbsp;|&nbsp; ');
}

function escapeHtml(text) {
	var div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function updateLogDom(logs) {
	var el = document.getElementById('oi_log_container');
	if (!el) return;
	var lines = (logs || '').split('\n');
	var html = lines.map(function(line) {
		var cls = 'oi-log-line';
		if (/error|gagal|fail/i.test(line)) cls += ' oi-log-error';
		else if (/SSH node|pool|grown|shrunk/i.test(line)) cls += ' oi-log-pool';
		else if (/koneksi/.test(line)) cls += ' oi-log-conn';
		return '<div class="' + cls + '">' + escapeHtml(line) + '</div>';
	}).join('');
	el.innerHTML = html;
	el.scrollTop = el.scrollHeight;
}

return view.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(callGetStatus(), {}),
			L.resolveDefault(callGetLogs(), {}),
			uci.load('openinject')
		]);
	},

	render: function(data) {
		var status = data[0] || {};
		var logs = (data[1] || {}).logs || '';
		var m, s, o;

		m = new form.Map('openinject', _('OpenInject'), _('Injector payload HTTP Custom (SSH) + core TUN. Semua client WiFi otomatis terowong.'));

		// Status Section
		s = m.section(form.NamedSection, 'status', 'status', _('Status Layanan'));
		s.anonymous = true;

		o = s.option(form.DummyValue, '_status_dummy', _('Status'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			var initialHtml = [
				renderBadge('openinject', status.openinject),
				renderBadge('mihomo', status.mihomo),
				renderBadge('TUN Meta', status.tun)
			].join(' &nbsp;|&nbsp; ');
			return '<div id="oi_status_badge_container" style="font-size:14px; padding:4px 0;">' + initialHtml + '</div>';
		};

		poll.add(function() {
			return L.resolveDefault(callGetStatus(), {}).then(function(res) {
				updateStatusDom(res);
			});
		}, 3);

		o = s.option(form.Button, '_restart', _('Kontrol Layanan'));
		o.inputtitle = _('Restart / Terapkan Sekarang');
		o.inputstyle = 'apply';
		o.onclick = function() {
			return callRCInit('openinject', 'restart').then(function() {
				window.setTimeout(function() { location.reload(); }, 1500);
			});
		};

		// Config Section
		s = m.section(form.NamedSection, 'config', 'main', _('Pengaturan'));
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Aktifkan tunnel'));
		o.rmempty = false;
		o.default = '1';

		o = s.option(form.Value, 'proxy', _('Proxy (host:port)'));
		o.rmempty = false;
		o.placeholder = '104.17.3.81:8080';

		o = s.option(form.DummyValue, '_proxy_note');
		o.rawhtml = true;
		o.cfgvalue = function() {
			return _('<small>Kolom "proxy" ala HTTP Custom: bug host operator (IP/Domain + Port).</small>');
		};

		o = s.option(form.Value, 'ssh_field', _('SSH (host:port@user:pass)'));
		o.rmempty = false;
		o.placeholder = 'id2.maha-stores.web.id:111@username:password';

		o = s.option(form.DummyValue, '_ssh_note');
		o.rawhtml = true;
		o.cfgvalue = function() {
			return _('<small>Server SSH tujuan + kredensial akun.</small>');
		};

		o = s.option(form.TextValue, 'payload', _('Payload HTTP'));
		o.rows = 5;
		o.placeholder = 'GET / HTTP/1.1[crlf]Host: id2.maha-stores.web.id[crlf]Upgrade: websocket[crlf]Connection: Upgrade[crlf][crlf]';

		o = s.option(form.Flag, 'dns_hijack', _('Hijack DNS client (fake-IP via TUN)'));
		o.default = '1';

		// Log Section
		s = m.section(form.NamedSection, 'logs', 'logs', _('Log Real-time'));
		s.anonymous = true;

		o = s.option(form.DummyValue, '_logs_dummy', _('Log Aktivitas'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			var style = '<style>' +
				'#oi_log_container { max-height: 400px; overflow-y: auto; background: #1a1a1a; color: #e0e0e0; ' +
				'font-family: monospace; font-size: 12px; padding: 8px; border-radius: 4px; border: 1px solid #333; }' +
				'.oi-log-line { padding: 1px 0; white-space: pre-wrap; word-break: break-all; }' +
				'.oi-log-error { color: #ff6b6b; }' +
				'.oi-log-pool { color: #4ec9b0; }' +
				'.oi-log-conn { color: #888; }' +
				'</style>';
			return style + '<div id="oi_log_container">' + escapeHtml(logs).split('\n').map(function(l) {
				return '<div class="oi-log-line">' + l + '</div>';
			}).join('') + '</div>';
		};

		poll.add(function() {
			return L.resolveDefault(callGetLogs(), {}).then(function(res) {
				updateLogDom(res.logs);
			});
		}, 2);

		return m.render();
	},

	handleSaveApply: function(ev, mode) {
		return this.handleSave(ev).finally(function() {
			return callRCInit('openinject', 'restart').then(function() {
				window.setTimeout(function() { location.reload(); }, 2000);
			});
		});
	}
});