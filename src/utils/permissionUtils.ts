import { SystemUser } from '../types';

export const checkUserPermission = (currentUser: SystemUser | null, key: string) => {
  if (currentUser?.role === 'admin') return true;
  if (!currentUser?.groups || currentUser.groups.length === 0) return false;
  
  const userPerms = new Set<string>();
  currentUser.groups.forEach(g => {
    if (Array.isArray(g.permissions)) {
      g.permissions.forEach(p => userPerms.add(p));
    }
  });

  const permissionMap: Record<string, string[]> = {
    'xay-dung-de': ['matrix.create', 'matrix.edit', 'matrix.delete', 'matrix.view', 'exams.create', 'exams.view', 'exams.delete', 'exams.edit'],
    'quan-ly-ma-tran-de': ['matrix.create', 'matrix.edit', 'matrix.delete', 'matrix.view'],
    'quan-ly-de-thi-goi-de': ['exams.create', 'exams.view', 'exams.delete', 'exams.edit'],
    
    'quan-ly-nhch': ['questions.view', 'questions.create', 'questions.edit', 'questions.delete', 'questions.approve', 'questions.review'],
    'chu-de-cau-hoi': ['questions.view', 'questions.approve', 'questions.review'],
    'ngan-hang-cau-hoi': ['questions.view', 'questions.create', 'questions.edit', 'questions.delete', 'questions.approve', 'questions.review'],
    'thong-ke-nhch': ['questions.view', 'questions.approve', 'questions.review'],
    
    'quan-tri-he-thong': ['system.users', 'system.groups', 'system.policies'],
    'quan-ly-nguoi-dung': ['system.users'],
    'quan-ly-nhom-nguoi-dung': ['system.groups'],
    'chinh-sach-bao-mat': ['system.policies'],
    
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
