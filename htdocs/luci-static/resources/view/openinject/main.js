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

var callRCInit = rpc.declare({
	object: 'rc',
	method: 'init',
	params: [ 'name', 'action' ]
});

function updateStatusBadge(status) {
	var el = document.getElementById('oi_status_box');
	if (!el) return;
	var oi = status.openinject ? '<b style="color:green">RUNNING</b>' : '<b style="color:red">STOPPED</b>';
	var mi = status.mihomo ? '<b style="color:green">RUNNING</b>' : '<b style="color:red">STOPPED</b>';
	var tun = status.tun ? '<b style="color:green">UP</b>' : '<b style="color:red">DOWN</b>';
	el.innerHTML = 'openinject: ' + oi + ' | mihomo: ' + mi + ' | TUN Meta: ' + tun;
}

return view.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(callGetStatus(), {}),
			uci.load('openinject')
		]);
	},

	render: function(data) {
		var status = data[0] || {};
		var m, s, o;

		m = new form.Map('openinject', _('OpenInject'), _('Injector payload HTTP Custom (SSH) + core TUN. Semua client WiFi otomatis terowong.'));

		// Status Section
		s = m.section(form.NamedSection, 'status', 'status', _('Status'));
		s.anonymous = true;

		o = s.option(form.DummyValue, '_status', _('Status Layanan'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			var oi = status.openinject ? '<b style="color:green">RUNNING</b>' : '<b style="color:red">STOPPED</b>';
			var mi = status.mihomo ? '<b style="color:green">RUNNING</b>' : '<b style="color:red">STOPPED</b>';
			var tun = status.tun ? '<b style="color:green">UP</b>' : '<b style="color:red">DOWN</b>';
			return '<span id="oi_status_box">openinject: ' + oi + ' | mihomo: ' + mi + ' | TUN Meta: ' + tun + '</span>';
		};

		poll.add(function() {
			return L.resolveDefault(callGetStatus(), {}).then(function(res) {
				updateStatusBadge(res);
			});
		}, 3);

		// Tombol Aksi Manual
		o = s.option(form.Button, '_restart', _('Restart / Terapkan Manual'));
		o.inputtitle = _('Restart Service');
		o.inputstyle = 'apply';
		o.onclick = function() {
			return callRCInit('openinject', 'restart').then(function() {
				window.setTimeout(function() { location.reload(); }, 1500);
			});
		};

		// Config Section
		s = m.section(form.NamedSection, 'config', 'openinject', _('Pengaturan'));
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
