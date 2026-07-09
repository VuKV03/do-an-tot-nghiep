import React from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  GlobalOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

interface AppSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  activeMenuKey: string;
  setActiveMenuKey: (key: string) => void;
  menuItems: any[];
}

export default function AppSidebar({
  collapsed,
  setCollapsed,
  activeMenuKey,
  setActiveMenuKey,
  menuItems,
}: AppSidebarProps) {
  return (
    <Sider
      id="app-left-navigation-sider"
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={275}
      collapsedWidth={80}
      theme="dark"
      className="shadow-xl sticky top-0 left-0 h-screen overflow-y-auto"
      style={{ backgroundColor: '#0f172a' }}
    >
      {/* Brand system Logo / Area */}
      <div className={`h-16 flex items-center border-b border-white/[0.08] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`} id="sidebar-brand-box">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <GlobalOutlined className="text-white text-base animate-pulse" />
              </div>
              <div className="flex flex-col select-none overflow-hidden text-ellipsis whitespace-nowrap">
                <strong className="text-white text-xs font-black tracking-widest uppercase">PM QUẢN LÝ NHCH</strong>
                <span className="text-[9px] text-blue-200 uppercase font-semibold">Tài nguyên Quốc gia</span>
              </div>
            </div>
            <Button
              type="text"
              icon={<MenuFoldOutlined style={{ color: '#ffffff', fontSize: '20px' }} />}
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: '#ffffff' }}
            />
          </>
        ) : (
          <Button
            type="text"
            icon={<MenuUnfoldOutlined style={{ color: '#ffffff', fontSize: '20px' }} />}
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: '#ffffff' }}
          />
        )}
      </div>

      {/* Sidebar menu representation */}
      <Menu
        id="sidebar-navigation-menu"
        theme="dark"
        mode="inline"
        selectedKeys={[activeMenuKey]}
        style={{ backgroundColor: '#0f172a', borderRight: 0, padding: '12px 0' }}
        items={menuItems}
        onClick={({ key }) => setActiveMenuKey(key)}
        // tự động mở các menu này khi user đã login
        // defaultOpenKeys={['xay-dung-de', 'quan-ly-nhch', "quan-tri-danh-muc"]}
        className="font-medium text-xs text-slate-100"
      />
    </Sider>
  );
}
