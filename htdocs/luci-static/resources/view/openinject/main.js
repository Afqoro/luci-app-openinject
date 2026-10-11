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

		o = s.option(form.Value, 'proxy', _('Proxy / bug (host:port)'));
		o.rmempty = false;
		o.placeholder = 'tdwcontent.telkomsel.com:443';
		o.datatype = 'hostport';

		o = s.option(form.DummyValue, '_proxy_note');
		o.rawhtml = true;
		o.cfgvalue = function() {
			return _('<small>Kolom "proxy" ala HTTP Custom: server depan yang dihubungi payload (bug host operator).</small>');
		};

		o = s.option(form.Value, 'ssh_field', _('SSH (host:port@user:pass)'));
		o.rmempty = false;
		o.placeholder = 'd18abc8ldsqq14.cloudfront.net:80@Premium:Premium';

		o = s.option(form.DummyValue, '_ssh_note');
		o.rawhtml = true;
		o.cfgvalue = function() {
			return _('<small>Server SSH tujuan sesungguhnya + kredensial, format sama dengan kolom SSH HTTP Custom.</small>');
		};

		o = s.option(form.TextValue, 'payload', _('Payload HTTP'));
		o.rows = 5;
		o.placeholder = 'GET / HTTP/1.1[crlf]Host: [bug_host][crlf][crlf]';

		o = s.option(form.Flag, 'dns_hijack', _('Hijack DNS client (fake-IP via TUN)'));
		o.default = '1';

		return m.render();
	}
});
