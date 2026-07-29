import { SystemUser } from '../types';
import { MENU_STRUCTURE, PERMISSION_MAP } from '../components/quan-tri-he-thong/quan-ly-nhom-nguoi-dung/GroupConstants';

/**
 * Tập hợp tất cả các menu key (bao gồm cả parent và leaf) từ MENU_STRUCTURE.
 */
const ALL_MENU_KEYS = new Set<string>();
const collectMenuKeys = (nodes: any[]) => {
  nodes.forEach(n => {
    ALL_MENU_KEYS.add(n.key);
    if (n.children) collectMenuKeys(n.children);
  });
};
collectMenuKeys(MENU_STRUCTURE);

/**
 * Kiểm tra quyền truy cập menu cho một user.
 * 
 * Logic mới (menu-first):
 * 1. Dashboard / no-access: luôn cho phép.
 * 2. Admin hoặc nhóm GRP_ADMIN: cho phép tất cả.
 * 3. Với menu key:
 *    - Ưu tiên kiểm tra xem user CÓ CHÍNH menu key đó trong permissions hay không.
 *    - Nếu key là parent node, kiểm tra xem có BẤT KỲ descendant key nào
 *      trong permissions không (để parent hiện khi child được chọn).
 *    - KHÔNG dùng PERMISSION_MAP làm fallback nữa — vì menu keys đã được
 *      seed vào bảng permissions, nên chỉ cần kiểm tra trực tiếp.
 */
export const checkUserPermission = (currentUser: SystemUser | null, key: string) => {
  if (key === 'dashboard' || key === 'no-access') return true;
  
  // Admin bypass
  if (currentUser?.role === 'admin') return true;
  if (currentUser?.groups?.some(g => g.code === 'GRP_ADMIN')) return true;
  if (!currentUser?.groups || currentUser.groups.length === 0) return false;

  // Thu thập toàn bộ permissions từ tất cả các nhóm
  const userPerms = new Set<string>();
  currentUser.groups.forEach(g => {
    if (Array.isArray(g.permissions)) {
      g.permissions.forEach(p => userPerms.add(p));
    }
  });

  if (userPerms.size === 0) return false;

  // Nếu key là một menu key, dùng logic menu-only
  if (ALL_MENU_KEYS.has(key)) {
    // Kiểm tra trực tiếp: user có chính key này
    if (userPerms.has(key)) return true;

    // Kiểm tra descendant: nếu bất kỳ con/cháu nào trong cây menu
    // có key nằm trong permissions, parent node cũng nên hiện
    const findNode = (nodes: any[], targetKey: string): any | null => {
      for (const n of nodes) {
        if (n.key === targetKey) return n;
        if (n.children) {
          const found = findNode(n.children, targetKey);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(MENU_STRUCTURE, key);
    if (node && node.children) {
      const hasDescendantPermission = (n: any): boolean => {
        if (userPerms.has(n.key)) return true;
        if (n.children) {
          return n.children.some((child: any) => hasDescendantPermission(child));
        }
        return false;
      };
      if (hasDescendantPermission(node)) return true;
    }

    // Nếu menu key không có trong permissions → KHÔNG cho hiển thị
    // (Không fallback qua PERMISSION_MAP nữa)
    return false;
  }

  // Nếu key KHÔNG phải menu key (ví dụ: functional permission code)
  // → kiểm tra trực tiếp
  if (userPerms.has(key)) return true;

  return Array.from(userPerms).some(vp =>
    vp === '*' ||
    (vp.endsWith('.*') && key.startsWith(vp.replace('.*', '')))
  );
};

/**
 * Kiểm tra xem user có một quyền hành động cụ thể không 
 * (ví dụ: 'questions.approve', 'matrices.manage')
 */
export const hasActionPermission = (currentUser: SystemUser | null, requiredPerm: string): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  if (currentUser.groups?.some(g => g.code === 'GRP_ADMIN')) return true;
  if (!currentUser.groups || currentUser.groups.length === 0) return false;

  const userPerms = new Set<string>();
  currentUser.groups.forEach(g => {
    if (Array.isArray(g.permissions)) {
      g.permissions.forEach(p => userPerms.add(p));
    }
  });

  if (userPerms.has(requiredPerm)) return true;

  return Array.from(userPerms).some(p => {
    if (p === '*') return true;
    if (p.endsWith('.*')) {
      const prefix = p.replace('.*', '');
      return requiredPerm.startsWith(prefix);
    }
    return false;
  });
};

/**
 * Kiểm tra xem user có BẤT KỲ quyền nào trong danh sách truyền vào không
 */
export const hasAnyPermission = (currentUser: SystemUser | null, requiredPerms: string[]): boolean => {
  return requiredPerms.some(perm => hasActionPermission(currentUser, perm));
};
