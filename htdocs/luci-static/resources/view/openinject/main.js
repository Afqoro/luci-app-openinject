'use strict';
'require rpc';
'require uci';
'require view';
'require form';

var callGetStatus = rpc.declare({
	object: 'luci-openinject',
	method: 'getStatus',
	params: []
});

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

		s = m.section(form.NamedSection, 'config', 'main', _('Status'));
		s.addremove = false;

		o = s.option(form.DummyValue, '_status');
		o.rawhtml = true;
		o.cfgvalue = function() {
			var oi = status.openinject ? '<b style="color:green">RUNNING</b>' : '<b style="color:red">STOPPED</b>';
			var mi = status.mihomo ? '<b style="color:green">RUNNING</b>' : '<b style="color:red">STOPPED</b>';
			var tun = status.tun ? '<b style="color:green">UP</b>' : '<b style="color:red">DOWN</b>';
			return _('openinject: %s<br/>mihomo: %s<br/>TUN Meta: %s').format(oi, mi, tun);
		};

		s = m.section(form.NamedSection, 'config', 'main', _('Pengaturan'));
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Aktifkan tunnel'));
		o.rmempty = false;

		o = s.option(form.Value, 'proxy', _('Proxy (host:port)'));
		o.rmempty = false;
		o.placeholder = 'tdwcontent.telkomsel.com:443';
		o.datatype = 'hostport';

		o = s.option(form.DummyValue, '_proxy_note');
		o.rawhtml = true;
		o.cfgvalue = function() {
			return _('<small>Alamat server yang dihubungi payload (ala kolom proxy HTTP Custom). Akun SSH di belakangnya diisi di bawah.</small>');
		};

		o = s.option(form.Value, 'ssh_user', _('SSH user'));
		o.rmempty = false;

		o = s.option(form.Value, 'ssh_password', _('SSH password'));
		o.password = true;

		o = s.option(form.TextValue, 'payload', _('Payload HTTP'));
		o.rows = 5;
		o.placeholder = 'GET / HTTP/1.1[crlf]Host: [bug_host][crlf][crlf]';

		o = s.option(form.Flag, 'dns_hijack', _('Hijack DNS client (fake-IP via TUN)'));
		o.default = '1';

		return m.render();
	}
});
