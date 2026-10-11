include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-openinject
PKG_VERSION:=0.1.0
PKG_RELEASE:=1

LUCI_TITLE:=OpenInject - SSH payload injector with TUN core
LUCI_DEPENDS:=+openinject +mihomo +luci-base
LUCI_PKGARCH:=all

define Package/$(PKG_NAME)/conffiles
/etc/config/openinject
/etc/mihomo-openinject.yaml
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
