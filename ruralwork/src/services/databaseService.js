import { supabase, TABLES } from '../config/supabase';

/**
 * 数据库操作服务
 * 提供对 Supabase 数据库的基本 CRUD 操作
 */

// =====================================================
// 用户相关操作
// =====================================================

/**
 * 根据手机号和密码验证用户登录
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Object} 用户信息或错误
 */
export const loginUser = async (phone, password) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('phone', phone)
      .eq('password_hash', password) // 简单验证，生产环境应使用加密
      .eq('is_active', true)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return { error: '手机号或密码错误' };
    }

    // 记录登录日志
    await logUserAction(data.id, 'login', 'auth', { phone });

    return { data, error: null };
  } catch (error) {
    console.error('登录错误:', error);
    return { data: null, error: error.message || '登录失败' };
  }
};

/**
 * 获取用户信息
 * @param {string} userId - 用户ID
 * @returns {Object} 用户信息
 */
export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', userId)
      .single();

    return { data, error };
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return { data: null, error: error.message };
  }
};

/**
 * 获取所有用户（管理员功能）
 * @returns {Array} 用户列表
 */
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('id, phone, name, role, department, position, is_active, created_at')
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('获取用户列表错误:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 创建新用户（管理员功能）
 * @param {Object} userData - 用户数据
 * @returns {Object} 创建结果
 */
export const createUser = async (userData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .insert([userData])
      .select()
      .single();

    if (!error && data) {
      // 记录创建用户日志
      await logUserAction(userData.created_by || data.id, 'create_user', 'users', { 
        new_user_id: data.id,
        phone: userData.phone,
        name: userData.name,
        role: userData.role
      });
    }

    return { data, error };
  } catch (error) {
    console.error('创建用户错误:', error);
    return { data: null, error: error.message };
  }
};

/**
 * 更新用户信息
 * @param {string} userId - 用户ID
 * @param {Object} updates - 更新数据
 * @returns {Object} 更新结果
 */
export const updateUser = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('更新用户错误:', error);
    return { data: null, error: error.message };
  }
};

// =====================================================
// 投票相关操作
// =====================================================

/**
 * 获取投票列表
 * @param {string} status - 投票状态过滤
 * @returns {Array} 投票列表
 */
export const getVotes = async (status = null) => {
  try {
    let query = supabase
      .from(TABLES.VOTES)
      .select(`
        *,
        created_by_user:created_by(name)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    console.error('获取投票列表错误:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 创建投票
 * @param {Object} voteData - 投票数据
 * @returns {Object} 创建结果
 */
export const createVote = async (voteData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.VOTES)
      .insert([voteData])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('创建投票错误:', error);
    return { data: null, error: error.message };
  }
};

// =====================================================
// 请假相关操作
// =====================================================

/**
 * 获取请假申请列表
 * @param {string} userId - 用户ID（可选，获取特定用户的申请）
 * @returns {Array} 请假申请列表
 */
export const getLeaveRequests = async (userId = null) => {
  try {
    let query = supabase
      .from(TABLES.LEAVE_REQUESTS)
      .select(`
        *,
        user:user_id(name, department),
        approver:approver_id(name)
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    console.error('获取请假申请错误:', error);
    return { data: [], error: error.message };
  }
};

/**
 * 创建请假申请
 * @param {Object} leaveData - 请假数据
 * @returns {Object} 创建结果
 */
export const createLeaveRequest = async (leaveData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
      .insert([leaveData])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('创建请假申请错误:', error);
    return { data: null, error: error.message };
  }
};

// =====================================================
// 系统日志操作
// =====================================================

/**
 * 记录用户操作日志
 * @param {string} userId - 用户ID
 * @param {string} action - 操作类型
 * @param {string} resource - 操作资源
 * @param {Object} metadata - 元数据
 */
export const logUserAction = async (userId, action, resource, metadata = {}) => {
  try {
    await supabase
      .from(TABLES.SYSTEM_LOGS)
      .insert([{
        user_id: userId,
        action,
        resource,
        metadata
      }]);
  } catch (error) {
    console.error('记录日志错误:', error);
    // 日志记录失败不应影响主要功能
  }
};

// =====================================================
// 通用查询操作
// =====================================================

/**
 * 通用的数据获取方法
 * @param {string} table - 表名
 * @param {Object} options - 查询选项
 * @returns {Array} 查询结果
 */
export const getData = async (table, options = {}) => {
  try {
    let query = supabase.from(table).select(options.select || '*');

    // 添加过滤条件
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // 添加排序
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending || false 
      });
    }

    // 添加分页
    if (options.pagination) {
      const { page, pageSize } = options.pagination;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    console.error(`获取${table}数据错误:`, error);
    return { data: [], error: error.message };
  }
};

/**
 * 通用的数据插入方法
 * @param {string} table - 表名
 * @param {Object} data - 插入数据
 * @returns {Object} 插入结果
 */
export const insertData = async (table, data) => {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select()
      .single();

    return { data: result, error };
  } catch (error) {
    console.error(`插入${table}数据错误:`, error);
    return { data: null, error: error.message };
  }
};

/**
 * 通用的数据更新方法
 * @param {string} table - 表名
 * @param {string} id - 记录ID
 * @param {Object} updates - 更新数据
 * @returns {Object} 更新结果
 */
export const updateData = async (table, id, updates) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error(`更新${table}数据错误:`, error);
    return { data: null, error: error.message };
  }
};

/**
 * 通用的数据删除方法
 * @param {string} table - 表名
 * @param {string} id - 记录ID
 * @returns {Object} 删除结果
 */
export const deleteData = async (table, id) => {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    return { error };
  } catch (error) {
    console.error(`删除${table}数据错误:`, error);
    return { error: error.message };
  }
};
