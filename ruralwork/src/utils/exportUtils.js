import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * 导出年度互评结果为Excel文件
 * @param {Array} evaluationData - 互评数据
 * @param {Array} users - 用户数据
 * @param {string} year - 年度
 */
export const exportEvaluationToExcel = (evaluationData, users, year = new Date().getFullYear()) => {
  try {
    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 1. 个人得分汇总表
    const summaryData = generateSummaryData(evaluationData, users);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, '个人得分汇总');

    // 2. 详细评分记录表
    const detailData = generateDetailData(evaluationData, users);
    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, '详细评分记录');

    // 3. 统计分析表
    const statsData = generateStatsData(evaluationData, users);
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, '统计分析');

    // 4. 部门排名表
    const deptRankingData = generateDepartmentRanking(evaluationData, users);
    const deptRankingSheet = XLSX.utils.json_to_sheet(deptRankingData);
    XLSX.utils.book_append_sheet(workbook, deptRankingSheet, '部门排名');

    // 设置列宽
    setSummaryColumnWidths(summarySheet);
    setDetailColumnWidths(detailSheet);
    setStatsColumnWidths(statsSheet);
    setDeptRankingColumnWidths(deptRankingSheet);

    // 导出文件
    const fileName = `童坊镇${year}年度干部互评结果.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);

    return { success: true, message: '导出成功' };
  } catch (error) {
    console.error('导出Excel失败:', error);
    return { success: false, message: '导出失败: ' + error.message };
  }
};

/**
 * 生成个人得分汇总数据
 */
const generateSummaryData = (evaluationData, users) => {
  const summaryMap = new Map();

  // 初始化用户数据
  users.forEach(user => {
    if (user.role !== 'admin') {
      summaryMap.set(user.id, {
        排名: '',
        姓名: user.name,
        部门: user.department,
        职位: user.position,
        德: 0,
        能: 0,
        勤: 0,
        技: 0,
        廉: 0,
        总分: 0,
        平均分: 0,
        评价人数: 0
      });
    }
  });

  // 统计评分数据
  evaluationData.forEach(evaluation => {
    if (evaluation.is_completed && summaryMap.has(evaluation.evaluatee_id)) {
      const summary = summaryMap.get(evaluation.evaluatee_id);
      summary.德+= evaluation.score_de || 0;
      summary.能+= evaluation.score_neng || 0;
      summary.勤+= evaluation.score_qin || 0;
      summary.技 += evaluation.score_ji || 0;
      summary.廉 += evaluation.score_lian || 0;
      summary.总分 += evaluation.total_score || 0;
      summary.评价人数 += 1;
    }
  });

  // 计算平均分并排序
  const summaryArray = Array.from(summaryMap.values())
    .map(summary => {
      if (summary.评价人数 > 0) {
        summary.德 = (summary.德 / summary.评价人数).toFixed(1);
        summary.能 = (summary.能 / summary.评价人数).toFixed(1);
        summary.勤 = (summary.勤 / summary.评价人数).toFixed(1);
        summary.技 = (summary.技 / summary.评价人数).toFixed(1);
        summary.廉 = (summary.廉 / summary.评价人数).toFixed(1);
        summary.平均分 = (summary.总分 / summary.评价人数).toFixed(1);
      }
      return summary;
    })
    .sort((a, b) => parseFloat(b.平均分) - parseFloat(a.平均分));

  // 添加排名
  summaryArray.forEach((summary, index) => {
    summary.排名 = index + 1;
  });

  return summaryArray;
};

/**
 * 生成详细评分记录数据
 */
const generateDetailData = (evaluationData, users) => {
  const userMap = new Map(users.map(user => [user.id, user]));
  
  return evaluationData
    .filter(evaluation => evaluation.is_completed)
    .map(evaluation => {
      const evaluator = userMap.get(evaluation.evaluator_id);
      const evaluatee = userMap.get(evaluation.evaluatee_id);
      
      return {
        评价人: evaluator?.name || '未知',
        评价人部门: evaluator?.department || '未知',
        被评价人: evaluatee?.name || '未知',
        被评价人部门: evaluatee?.department || '未知',
        德: evaluation.score_de || 0,
        能: evaluation.score_neng || 0,
        勤: evaluation.score_qin || 0,
        技: evaluation.score_ji || 0,
        廉: evaluation.score_lian || 0,
        总分: evaluation.total_score || 0,
        评价意见: evaluation.comment || '',
        评价时间: new Date(evaluation.updated_at).toLocaleString('zh-CN')
      };
    });
};

/**
 * 生成统计分析数据
 */
const generateStatsData = (evaluationData, users) => {
  const completedEvaluations = evaluationData.filter(e => e.is_completed);
  const totalUsers = users.filter(u => u.role !== 'admin').length;
  const totalPossibleEvaluations = totalUsers * (totalUsers - 1);
  
  // 维度统计
  const dimensionStats = {
    德: { sum: 0, count: 0 },
    能: { sum: 0, count: 0 },
    勤: { sum: 0, count: 0 },
    技: { sum: 0, count: 0 },
    廉: { sum: 0, count: 0 }
  };

  completedEvaluations.forEach(evaluation => {
    dimensionStats.德.sum += evaluation.score_de || 0;
    dimensionStats.德.count += 1;
    dimensionStats.能.sum += evaluation.score_neng || 0;
    dimensionStats.能.count += 1;
    dimensionStats.勤.sum += evaluation.score_qin || 0;
    dimensionStats.勤.count += 1;
    dimensionStats.技.sum += evaluation.score_ji || 0;
    dimensionStats.技.count += 1;
    dimensionStats.廉.sum += evaluation.score_lian || 0;
    dimensionStats.廉.count += 1;
  });

  return [
    { 统计项目: '参与人数', 数值: totalUsers, 单位: '人' },
    { 统计项目: '已完成评价', 数值: completedEvaluations.length, 单位: '条' },
    { 统计项目: '总可能评价数', 数值: totalPossibleEvaluations, 单位: '条' },
    { 统计项目: '完成率', 数值: ((completedEvaluations.length / totalPossibleEvaluations) * 100).toFixed(1), 单位: '%' },
    { 统计项目: '德平均分', 数值: (dimensionStats.德.sum / dimensionStats.德.count).toFixed(1), 单位: '分' },
    { 统计项目: '能平均分', 数值: (dimensionStats.能.sum / dimensionStats.能.count).toFixed(1), 单位: '分' },
    { 统计项目: '勤平均分', 数值: (dimensionStats.勤.sum / dimensionStats.勤.count).toFixed(1), 单位: '分' },
    { 统计项目: '技平均分', 数值: (dimensionStats.技.sum / dimensionStats.技.count).toFixed(1), 单位: '分' },
    { 统计项目: '廉平均分', 数值: (dimensionStats.廉.sum / dimensionStats.廉.count).toFixed(1), 单位: '分' }
  ];
};

/**
 * 生成部门排名数据
 */
const generateDepartmentRanking = (evaluationData, users) => {
  const deptMap = new Map();

  // 初始化部门数据
  users.forEach(user => {
    if (user.role !== 'admin' && user.department) {
      if (!deptMap.has(user.department)) {
        deptMap.set(user.department, {
          部门: user.department,
          人数: 0,
          德: 0,
          能: 0,
          勤: 0,
          技: 0,
          廉: 0,
          总分: 0,
          评价次数: 0
        });
      }
      deptMap.get(user.department).人数 += 1;
    }
  });

  // 统计部门评分
  const userDeptMap = new Map(users.map(user => [user.id, user.department]));
  
  evaluationData.forEach(evaluation => {
    if (evaluation.is_completed) {
      const dept = userDeptMap.get(evaluation.evaluatee_id);
      if (dept && deptMap.has(dept)) {
        const deptData = deptMap.get(dept);
        deptData.德 += evaluation.score_de || 0;
        deptData.能 += evaluation.score_neng || 0;
        deptData.勤 += evaluation.score_qin || 0;
        deptData.技 += evaluation.score_ji || 0;
        deptData.廉 += evaluation.score_lian || 0;
        deptData.总分 += evaluation.total_score || 0;
        deptData.评价次数 += 1;
      }
    }
  });

  // 计算部门平均分并排序
  return Array.from(deptMap.values())
    .map(dept => {
      if (dept.评价次数 > 0) {
        dept.德 = (dept.德 / dept.评价次数).toFixed(1);
        dept.能 = (dept.能 / dept.评价次数).toFixed(1);
        dept.勤 = (dept.勤 / dept.评价次数).toFixed(1);
        dept.技 = (dept.技 / dept.评价次数).toFixed(1);
        dept.廉 = (dept.廉 / dept.评价次数).toFixed(1);
        dept.平均分 = (dept.总分 / dept.评价次数).toFixed(1);
      } else {
        dept.平均分 = 0;
      }
      return dept;
    })
    .sort((a, b) => parseFloat(b.平均分) - parseFloat(a.平均分))
    .map((dept, index) => ({
      排名: index + 1,
      ...dept
    }));
};

/**
 * 设置列宽
 */
const setSummaryColumnWidths = (sheet) => {
  sheet['!cols'] = [
    { wch: 6 },  // 排名
    { wch: 12 }, // 姓名
    { wch: 20 }, // 部门
    { wch: 15 }, // 职位
    { wch: 8 },  // 德
    { wch: 8 },  // 能
    { wch: 8 },  // 勤
    { wch: 8 },  // 技
    { wch: 8 },  // 廉
    { wch: 10 }, // 总分
    { wch: 10 }, // 平均分
    { wch: 10 }  // 评价人数
  ];
};

const setDetailColumnWidths = (sheet) => {
  sheet['!cols'] = [
    { wch: 12 }, // 评价人
    { wch: 20 }, // 评价人部门
    { wch: 12 }, // 被评价人
    { wch: 20 }, // 被评价人部门
    { wch: 8 },  // 德
    { wch: 8 },  // 能
    { wch: 8 },  // 勤
    { wch: 8 },  // 技
    { wch: 8 },  // 廉
    { wch: 10 }, // 总分
    { wch: 30 }, // 评价意见
    { wch: 20 }  // 评价时间
  ];
};

const setStatsColumnWidths = (sheet) => {
  sheet['!cols'] = [
    { wch: 20 }, // 统计项目
    { wch: 15 }, // 数值
    { wch: 10 }  // 单位
  ];
};

const setDeptRankingColumnWidths = (sheet) => {
  sheet['!cols'] = [
    { wch: 6 },  // 排名
    { wch: 20 }, // 部门
    { wch: 8 },  // 人数
    { wch: 8 },  // 德
    { wch: 8 },  // 能
    { wch: 8 },  // 勤
    { wch: 8 },  // 技
    { wch: 8 },  // 廉
    { wch: 10 }, // 总分
    { wch: 10 }, // 平均分
    { wch: 10 }  // 评价次数
  ];
};


