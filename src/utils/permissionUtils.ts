import { SystemUser } from '../types';

export const checkUserPermission = (currentUser: SystemUser | null, key: string) => {
  if (key === 'dashboard' || key === 'no-access') return true;
  // Cho phép truy cập toàn bộ nếu role là admin HOẶC user thuộc nhóm GRP_ADMIN
  if (currentUser?.role === 'admin') return true;
  if (currentUser?.groups?.some(g => g.code === 'GRP_ADMIN')) return true;
  if (!currentUser?.groups || currentUser.groups.length === 0) return false;

  const userPerms = new Set<string>();
  currentUser.groups.forEach(g => {
    if (Array.isArray(g.permissions)) {
      g.permissions.forEach(p => userPerms.add(p));
    }
  });

  const permissionMap: Record<string, string[]> = {
    'xay-dung-de': ['matrices.manage', 'matrices.submit', 'matrices.approve', 'exams.manage', 'exams.submit', 'exams.approve'],
    'quan-ly-ma-tran-de': ['matrices.manage', 'matrices.submit', 'matrices.approve'],
    'quan-ly-de-thi-goi-de': ['exams.manage', 'exams.submit', 'exams.approve'],
    'quan-ly-goi-de': ['exams.manage', 'exams.submit', 'exams.approve', 'exams.generate_variants', 'exams.export'],

    'to-chuc-thi': ['exams.generate_variants', 'exams.export', 'exams.test_run'],
    'quan-ly-ky-thi': ['exams.generate_variants', 'exams.export', 'exams.test_run'],
    'quan-ly-thi-sinh': ['exams.generate_variants', 'exams.export', 'exams.test_run'],
    'quan-ly-ket-qua-thi': ['exams.generate_variants', 'exams.export', 'exams.test_run'],

    'quan-ly-nhch': ['topics.manage', 'topics.submit', 'topics.approve', 'questions.manage', 'questions.submit', 'questions.approve'],
    'chu-de-cau-hoi': ['topics.manage', 'topics.submit', 'topics.approve'],
    'ngan-hang-cau-hoi': ['questions.manage', 'questions.submit', 'questions.approve'],
    'thong-ke-nhch': ['questions.manage', 'questions.submit', 'questions.approve', 'topics.manage', 'topics.submit', 'topics.approve'],

    'quan-tri-he-thong': ['system.users', 'system.groups', 'system.policies'],
    'quan-ly-nguoi-dung': ['system.users'],
    'quan-ly-nhom-nguoi-dung': ['system.groups'],
    'chinh-sach-bao-mat': ['system.policies', 'system.users', 'system.groups'],

    'quan-tri-danh-muc': ['system.categories'],
    'danh-muc-mon-hoc': ['system.categories'],
    'danh-muc-khoi-lop': ['system.categories'],
    'cap-do-tu-duy': ['system.categories'],
    'loai-hinh-cau-hoi': ['system.categories'],
    'thanh-phan-nang-luc': ['system.categories'],
    'danh-muc-dot-thi': ['system.categories']
  };

  const requiredPerms = permissionMap[key];
  if (requiredPerms) {
    return requiredPerms.some(p =>
      userPerms.has(p) ||
      Array.from(userPerms).some(vp => vp.endsWith('.*') && p.startsWith(vp.replace('.*', '')))
    );
  }

  return false;
};
