// 用户角色常量
export const USER_ROLES = {
  ADMIN: 'admin',
  TOWN_STAFF: 'town_staff',
  STATION_STAFF: 'station_staff',
  WORK_TEAM: 'work_team'
};

// 角色显示名称
export const ROLE_NAMES = {
  [USER_ROLES.ADMIN]: '系统管理员',
  [USER_ROLES.TOWN_STAFF]: '镇干部',
  [USER_ROLES.STATION_STAFF]: '站所工作人员',
  [USER_ROLES.WORK_TEAM]: '包村工作队'
};

// 功能模块路径
export const ROUTES = {
  LOGIN: '/login',
  WELCOME: '/welcome',
  DASHBOARD: '/dashboard',
  VOTING: '/voting',
  EVALUATION: '/evaluation',
  LEAVE: '/leave',
  TEAM_EVALUATION: '/team-evaluation',
  ADMIN: '/admin'
};

// 功能权限映射
export const FEATURE_PERMISSIONS = {
  [ROUTES.VOTING]: [
    USER_ROLES.ADMIN, 
    USER_ROLES.TOWN_STAFF, 
    USER_ROLES.STATION_STAFF, 
    USER_ROLES.WORK_TEAM
  ],
  [ROUTES.EVALUATION]: [
    USER_ROLES.ADMIN, 
    USER_ROLES.TOWN_STAFF, 
    USER_ROLES.STATION_STAFF, 
    USER_ROLES.WORK_TEAM
  ],
  [ROUTES.LEAVE]: [
    USER_ROLES.ADMIN, 
    USER_ROLES.TOWN_STAFF, 
    USER_ROLES.STATION_STAFF, 
    USER_ROLES.WORK_TEAM
  ],
  [ROUTES.TEAM_EVALUATION]: [
    USER_ROLES.ADMIN, 
    USER_ROLES.STATION_STAFF
  ],
  [ROUTES.ADMIN]: [
    USER_ROLES.ADMIN
  ]
};

// 系统配置
export const SYSTEM_CONFIG = {
  APP_NAME: '童坊镇政务管理系统',
  VERSION: '1.0.0',
  AUTHOR: '童坊镇政府',
  DESCRIPTION: '高效、透明、便民的数字化政务平台'
};

// 消息提示配置
export const MESSAGE_CONFIG = {
  SUCCESS_DURATION: 3,
  ERROR_DURATION: 5,
  WARNING_DURATION: 4
};

// 表单验证规则
export const VALIDATION_RULES = {
  PHONE: {
    required: true,
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入有效的手机号码'
  },
  PASSWORD: {
    required: true,
    min: 6,
    message: '密码至少6位字符'
  },
  REQUIRED: {
    required: true,
    message: '此字段为必填项'
  }
};

// 分页配置
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: ['10', '20', '50', '100'],
  SHOW_SIZE_CHANGER: true,
  SHOW_QUICK_JUMPER: true,
  SHOW_TOTAL: (total, range) => `共 ${total} 条记录，显示第 ${range[0]}-${range[1]} 条`
};

// 主题色彩配置
export const THEME_COLORS = {
  PRIMARY: '#1890ff',
  SUCCESS: '#52c41a',
  WARNING: '#faad14',
  ERROR: '#ff4d4f',
  INFO: '#1890ff'
};

// 文件上传配置
export const UPLOAD_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.pdf']
};
