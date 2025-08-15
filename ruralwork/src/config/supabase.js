import { createClient } from '@supabase/supabase-js';

// Supabase 配置
// 注意：在生产环境中，这些值应该从环境变量获取
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// 创建 Supabase 客户端（仅用于数据库操作）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库表名常量
export const TABLES = {
  USERS: 'users',
  VOTES: 'votes',
  VOTE_RECORDS: 'vote_records',
  EVALUATIONS: 'evaluations',
  LEAVE_REQUESTS: 'leave_requests',
  TEAM_EVALUATIONS: 'team_evaluations',
  SCORE_RECORDS: 'score_records',
  SYSTEM_LOGS: 'system_logs',
  NOTIFICATIONS: 'notifications'
};

// API 响应状态码
export const API_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

export default supabase;
