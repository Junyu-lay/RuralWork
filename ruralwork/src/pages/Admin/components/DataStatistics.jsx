import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  DatePicker,
  message,
  Statistic,
  Table,
  Space,
  Divider,
  Progress,
  Tag
} from 'antd';

import {
  DownloadOutlined,
  BarChartOutlined,
  UserOutlined,
  TeamOutlined,
  FileExcelOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { getData } from '../../../services/databaseService';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const DataStatistics = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [statisticsData, setStatisticsData] = useState({
    users: {
      total: 0,
      byRole: {},
      recent: 0
    },
    votes: {
      total: 0,
      active: 0,
      completed: 0,
      participationRate: 0
    },
    evaluations: {
      total: 0,
      completed: 0,
      averageScores: {},
      topPerformers: [],
      allUserScores: [],
      departmentStats: [],
      dimensionStats: [],
      scoreDistribution: [],
      monthlyTrend: []
    },
    leaves: {
      total: 0,
      pending: 0,
      approved: 0,
      totalDays: 0,
      byType: {}
    },
    attendance: {
      userScores: [],
      averageScore: 0,
      topScorers: [],
      lowScorers: []
    }
  });

  useEffect(() => {
    loadStatistics();
  }, [dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // 加载统计数据
  const loadStatistics = async () => {
    setLoading(true);
    try {
      // 日期范围暂时未使用，但保留用于后续功能扩展
      // const startDate = dateRange[0].format('YYYY-MM-DD');
      // const endDate = dateRange[1].format('YYYY-MM-DD');

      // 并行加载所有数据
      const [
        usersResult,
        votesResult,
        evaluationsResult,
        leavesResult,
        voteRecordsResult
      ] = await Promise.all([
        getData('users'),
        getData('votes'),
        getData('evaluations', {
          filters: { is_completed: true }
        }),
        getData('leave_requests'),
        getData('vote_records')
      ]);

      // 处理用户数据
      const users = usersResult.data || [];
      const usersByRole = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      
      const recentUsers = users.filter(user => 
        dayjs(user.created_at).isAfter(dayjs().subtract(7, 'day'))
      ).length;

      // 处理投票数据
      const votes = votesResult.data || [];
      const activeVotes = votes.filter(vote => vote.status === 'active').length;
      const completedVotes = votes.filter(vote => vote.status === 'completed').length;
      
      // 计算参与率
      const voteRecords = voteRecordsResult.data || [];
      const totalPossibleParticipation = votes.length * users.length;
      const actualParticipation = voteRecords.length;
      const participationRate = totalPossibleParticipation > 0 
        ? (actualParticipation / totalPossibleParticipation * 100).toFixed(1)
        : 0;

      // 处理评价数据
      const evaluations = evaluationsResult.data || [];
      const completedEvaluations = evaluations.filter(e => e.is_completed);
      const userMap = new Map(users.map(user => [user.id, user]));

      const averageScores = {
        de: (completedEvaluations.reduce((sum, evaluation) => sum + (evaluation.score_de || 0), 0) / completedEvaluations.length || 0).toFixed(1),
        neng: (completedEvaluations.reduce((sum, evaluation) => sum + (evaluation.score_neng || 0), 0) / completedEvaluations.length || 0).toFixed(1),
        qin: (completedEvaluations.reduce((sum, evaluation) => sum + (evaluation.score_qin || 0), 0) / completedEvaluations.length || 0).toFixed(1),
        ji: (completedEvaluations.reduce((sum, evaluation) => sum + (evaluation.score_ji || 0), 0) / completedEvaluations.length || 0).toFixed(1),
        lian: (completedEvaluations.reduce((sum, evaluation) => sum + (evaluation.score_lian || 0), 0) / completedEvaluations.length || 0).toFixed(1)
      };

      // 生成维度统计数据（用于雷达图）
      const dimensionStats = [
        { dimension: '德', score: parseFloat(averageScores.de), fullScore: 20 },
        { dimension: '能', score: parseFloat(averageScores.neng), fullScore: 20 },
        { dimension: '勤', score: parseFloat(averageScores.qin), fullScore: 20 },
        { dimension: '技', score: parseFloat(averageScores.ji), fullScore: 20 },
        { dimension: '廉', score: parseFloat(averageScores.lian), fullScore: 20 }
      ];

      // 计算个人得分排名
      const userScores = completedEvaluations.reduce((acc, evaluation) => {
        const user = userMap.get(evaluation.evaluatee_id);
        if (!user || user.role === 'admin') return acc;
        
        if (!acc[evaluation.evaluatee_id]) {
          acc[evaluation.evaluatee_id] = { 
            user,
            totalScore: 0, 
            count: 0 
          };
        }
        acc[evaluation.evaluatee_id].totalScore += evaluation.total_score || 0;
        acc[evaluation.evaluatee_id].count += 1;
        return acc;
      }, {});

      const topPerformers = Object.entries(userScores)
        .map(([userId, data]) => ({
          name: data.user.name,
          department: data.user.department,
          score: (data.totalScore / data.count).toFixed(1),
          evaluationCount: data.count
        }))
        .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
        .slice(0, 10);

      // 计算所有用户的详细评分（包括各个维度分数）
      const allUserEvaluations = completedEvaluations.reduce((acc, evaluation) => {
        const user = userMap.get(evaluation.evaluatee_id);
        if (!user || user.role === 'admin') return acc;
        
        if (!acc[evaluation.evaluatee_id]) {
          acc[evaluation.evaluatee_id] = { 
            user,
            scores: {
              de: [],
              neng: [],
              qin: [],
              ji: [],
              lian: [],
              total: []
            },
            count: 0
          };
        }
        
        acc[evaluation.evaluatee_id].scores.de.push(evaluation.score_de || 0);
        acc[evaluation.evaluatee_id].scores.neng.push(evaluation.score_neng || 0);
        acc[evaluation.evaluatee_id].scores.qin.push(evaluation.score_qin || 0);
        acc[evaluation.evaluatee_id].scores.ji.push(evaluation.score_ji || 0);
        acc[evaluation.evaluatee_id].scores.lian.push(evaluation.score_lian || 0);
        acc[evaluation.evaluatee_id].scores.total.push(evaluation.total_score || 0);
        acc[evaluation.evaluatee_id].count += 1;
        
        return acc;
      }, {});

      const allUserScores = Object.entries(allUserEvaluations)
        .map(([userId, data]) => {
          const avgScores = {
            de: (data.scores.de.reduce((sum, score) => sum + score, 0) / data.count).toFixed(1),
            neng: (data.scores.neng.reduce((sum, score) => sum + score, 0) / data.count).toFixed(1),
            qin: (data.scores.qin.reduce((sum, score) => sum + score, 0) / data.count).toFixed(1),
            ji: (data.scores.ji.reduce((sum, score) => sum + score, 0) / data.count).toFixed(1),
            lian: (data.scores.lian.reduce((sum, score) => sum + score, 0) / data.count).toFixed(1),
            total: (data.scores.total.reduce((sum, score) => sum + score, 0) / data.count).toFixed(1)
          };
          
          return {
            id: userId,
            name: data.user.name,
            department: data.user.department,
            position: data.user.position,
            phone: data.user.phone,
            evaluationCount: data.count,
            averageScores: avgScores,
            totalAverage: parseFloat(avgScores.total)
          };
        })
        .sort((a, b) => b.totalAverage - a.totalAverage);

      // 计算部门统计（用于柱状图）
      const departmentStats = {};
      completedEvaluations.forEach(evaluation => {
        const user = userMap.get(evaluation.evaluatee_id);
        if (!user || user.role === 'admin') return;
        
        const dept = user.department;
        if (!departmentStats[dept]) {
          departmentStats[dept] = {
            department: dept,
            totalScore: 0,
            count: 0,
            userCount: new Set()
          };
        }
        
        departmentStats[dept].totalScore += evaluation.total_score || 0;
        departmentStats[dept].count += 1;
        departmentStats[dept].userCount.add(user.id);
      });

      const departmentStatsArray = Object.values(departmentStats).map(dept => ({
        department: dept.department,
        averageScore: dept.count > 0 ? parseFloat((dept.totalScore / dept.count).toFixed(1)) : 0,
        userCount: dept.userCount.size,
        evaluationCount: dept.count
      })).sort((a, b) => b.averageScore - a.averageScore);

      // 计算分数分布（用于饼图）
      const scoreDistribution = [
        { range: '90-100分', count: 0 },
        { range: '80-89分', count: 0 },
        { range: '70-79分', count: 0 },
        { range: '60-69分', count: 0 },
        { range: '60分以下', count: 0 }
      ];

      completedEvaluations.forEach(evaluation => {
        const score = evaluation.total_score || 0;
        if (score >= 90) scoreDistribution[0].count++;
        else if (score >= 80) scoreDistribution[1].count++;
        else if (score >= 70) scoreDistribution[2].count++;
        else if (score >= 60) scoreDistribution[3].count++;
        else scoreDistribution[4].count++;
      });

      // 处理请假数据
      const leaves = leavesResult.data || [];
      const pendingLeaves = leaves.filter(leave => leave.status === 'pending').length;
      const approvedLeaves = leaves.filter(leave => leave.status === 'approved').length;
      const totalLeaveDays = leaves
        .filter(leave => leave.status === 'approved')
        .reduce((sum, leave) => sum + (leave.days_count || 0), 0);
      
      const leavesByType = leaves.reduce((acc, leave) => {
        acc[leave.leave_type] = (acc[leave.leave_type] || 0) + 1;
        return acc;
      }, {});

      // 处理考勤数据
      const userScoresWithLeave = users
        .filter(user => user.role !== 'admin') // 排除管理员
        .map(user => {
          const userLeaves = leaves.filter(leave => 
            leave.user_id === user.id && 
            leave.status === 'approved' && 
            leave.leave_type === 'personal'
          );
          const totalDeduction = userLeaves.reduce((sum, leave) => sum + (leave.days_count || 0), 0);
          const currentScore = user.total_score || 100;
          
          return {
            id: user.id,
            name: user.name,
            department: user.department,
            position: user.position,
            phone: user.phone,
            currentScore,
            totalDeduction,
            personalLeaveCount: userLeaves.length,
            personalLeaveDays: totalDeduction,
            scorePercent: Math.round((currentScore / 100) * 100)
          };
        })
        .sort((a, b) => b.currentScore - a.currentScore);

      const averageAttendanceScore = userScoresWithLeave.length > 0
        ? (userScoresWithLeave.reduce((sum, user) => sum + user.currentScore, 0) / userScoresWithLeave.length).toFixed(1)
        : 100;

      const topScorers = userScoresWithLeave.slice(0, 5);
      const lowScorers = userScoresWithLeave.filter(user => user.currentScore < 95).slice(-5);

      setStatisticsData({
        users: {
          total: users.length,
          byRole: usersByRole,
          recent: recentUsers
        },
        votes: {
          total: votes.length,
          active: activeVotes,
          completed: completedVotes,
          participationRate: parseFloat(participationRate)
        },
        evaluations: {
          total: evaluations.length,
          completed: completedEvaluations.length,
          averageScores,
          topPerformers,
          allUserScores,
          departmentStats: departmentStatsArray,
          dimensionStats,
          scoreDistribution,
          monthlyTrend: [] // 可以根据需要添加月度趋势数据
        },
        leaves: {
          total: leaves.length,
          pending: pendingLeaves,
          approved: approvedLeaves,
          totalDays: totalLeaveDays,
          byType: leavesByType
        },
        attendance: {
          userScores: userScoresWithLeave,
          averageScore: parseFloat(averageAttendanceScore),
          topScorers,
          lowScorers
        }
      });

    } catch (error) {
      console.error('加载统计数据错误:', error);
      message.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出数据
  const exportData = (type) => {
    try {
      let data, filename;
      
      switch (type) {
        case 'users':
          data = statisticsData.users;
          filename = `用户统计_${dayjs().format('YYYY-MM-DD')}.json`;
          break;
        case 'evaluations':
          data = statisticsData.evaluations;
          filename = `评价统计_${dayjs().format('YYYY-MM-DD')}.json`;
          break;
        case 'votes':
          data = statisticsData.votes;
          filename = `投票统计_${dayjs().format('YYYY-MM-DD')}.json`;
          break;
        case 'attendance':
          data = statisticsData.attendance;
          filename = `考勤统计_${dayjs().format('YYYY-MM-DD')}.json`;
          break;
        default:
          data = statisticsData;
          filename = `全部统计_${dayjs().format('YYYY-MM-DD')}.json`;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success('数据导出成功');
    } catch (error) {
      console.error('导出数据错误:', error);
      message.error('导出数据失败');
    }
  };

  // 角色名称映射
  const roleNames = {
    admin: '管理员',
    town_staff: '镇干部',
    station_staff: '站所人员',
    work_team: '工作队'
  };





  return (
    <div className="data-statistics">
      {/* 时间范围选择 */}
      <Card className="admin-card" style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <span>统计时间范围：</span>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
              />
              <Button 
                type="primary" 
                icon={<BarChartOutlined />}
                onClick={loadStatistics}
                loading={loading}
              >
                刷新统计
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<DownloadOutlined />}
                onClick={() => exportData('all')}
              >
                导出全部
              </Button>
              <Button 
                icon={<FileExcelOutlined />}
                onClick={() => exportData('evaluations')}
              >
                导出评价数据
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 用户统计 */}
      <Card title="用户统计" className="admin-card">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="总用户数"
              value={statisticsData.users.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="近7天新增"
              value={statisticsData.users.recent}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          {Object.entries(statisticsData.users.byRole).map(([role, count]) => (
            <Col xs={12} sm={6} key={role}>
              <Statistic
                title={roleNames[role] || role}
                value={count}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
          ))}
        </Row>
        <Divider />
        <Button 
          icon={<DownloadOutlined />}
          onClick={() => exportData('users')}
        >
          导出用户统计
        </Button>
      </Card>

      {/* 投票统计 */}
      <Card title="投票统计" className="admin-card">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="总投票数"
              value={statisticsData.votes.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="进行中"
              value={statisticsData.votes.active}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="已完成"
              value={statisticsData.votes.completed}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="参与率"
              value={statisticsData.votes.participationRate}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>
        <Divider />
        <Button 
          icon={<DownloadOutlined />}
          onClick={() => exportData('votes')}
        >
          导出投票统计
        </Button>
      </Card>

      {/* 年度互评统计 */}
      <Card title="年度互评统计" className="admin-card">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4>所有用户评分详情</h4>
          <Button 
            icon={<DownloadOutlined />}
            onClick={() => exportData('evaluations')}
          >
            导出评价统计
          </Button>
        </div>
        
        <Table
          columns={[
            {
              title: '排名',
              key: 'rank',
              width: 70,
              fixed: 'left',
              render: (_, __, index) => (
                <span style={{ 
                  fontWeight: 600,
                  color: index < 3 ? '#f5222d' : index < 10 ? '#fa8c16' : '#666'
                }}>
                  {index + 1}
                </span>
              )
            },
            {
              title: '姓名',
              dataIndex: 'name',
              key: 'name',
              width: 100,
              fixed: 'left'
            },
            {
              title: '部门',
              dataIndex: 'department',
              key: 'department',
              width: 120
            },
            {
              title: '职位',
              dataIndex: 'position',
              key: 'position',
              width: 120
            },
            {
              title: '总平均分',
              dataIndex: 'totalAverage',
              key: 'totalAverage',
              width: 120,
              render: (score) => (
                <span style={{ 
                  fontSize: 16, 
                  fontWeight: 600,
                  color: score >= 90 ? '#52c41a' : score >= 80 ? '#1890ff' : score >= 70 ? '#faad14' : '#ff4d4f'
                }}>
                  {score}
                </span>
              ),
              sorter: (a, b) => a.totalAverage - b.totalAverage,
              defaultSortOrder: 'descend'
            },
            {
              title: '德 (20分)',
              key: 'de',
              width: 100,
              render: (_, record) => (
                <span style={{ color: '#ff4d4f' }}>
                  {record.averageScores.de}
                </span>
              ),
              sorter: (a, b) => parseFloat(a.averageScores.de) - parseFloat(b.averageScores.de)
            },
            {
              title: '能 (20分)',
              key: 'neng',
              width: 100,
              render: (_, record) => (
                <span style={{ color: '#52c41a' }}>
                  {record.averageScores.neng}
                </span>
              ),
              sorter: (a, b) => parseFloat(a.averageScores.neng) - parseFloat(b.averageScores.neng)
            },
            {
              title: '勤 (20分)',
              key: 'qin',
              width: 100,
              render: (_, record) => (
                <span style={{ color: '#1890ff' }}>
                  {record.averageScores.qin}
                </span>
              ),
              sorter: (a, b) => parseFloat(a.averageScores.qin) - parseFloat(b.averageScores.qin)
            },
            {
              title: '技 (20分)',
              key: 'ji',
              width: 100,
              render: (_, record) => (
                <span style={{ color: '#722ed1' }}>
                  {record.averageScores.ji}
                </span>
              ),
              sorter: (a, b) => parseFloat(a.averageScores.ji) - parseFloat(b.averageScores.ji)
            },
            {
              title: '廉 (20分)',
              key: 'lian',
              width: 100,
              render: (_, record) => (
                <span style={{ color: '#faad14' }}>
                  {record.averageScores.lian}
                </span>
              ),
              sorter: (a, b) => parseFloat(a.averageScores.lian) - parseFloat(b.averageScores.lian)
            },
            {
              title: '评价次数',
              dataIndex: 'evaluationCount',
              key: 'evaluationCount',
              width: 100,
              render: (count) => (
                <Tag color={count >= 5 ? 'green' : count >= 3 ? 'blue' : 'orange'}>
                  {count}次
                </Tag>
              ),
              sorter: (a, b) => a.evaluationCount - b.evaluationCount
            },
            {
              title: '联系方式',
              dataIndex: 'phone',
              key: 'phone',
              width: 130
            }
          ]}
          dataSource={statisticsData.evaluations.allUserScores}
          rowKey="id"
          pagination={{
            total: statisticsData.evaluations.allUserScores.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 人`
          }}
          scroll={{ x: 1200 }}
          size="small"
          summary={(pageData) => {
            const totalUsers = pageData.length;
            if (totalUsers === 0) return null;
            
            const avgTotal = (pageData.reduce((sum, record) => sum + record.totalAverage, 0) / totalUsers).toFixed(1);
            const avgDe = (pageData.reduce((sum, record) => sum + parseFloat(record.averageScores.de), 0) / totalUsers).toFixed(1);
            const avgNeng = (pageData.reduce((sum, record) => sum + parseFloat(record.averageScores.neng), 0) / totalUsers).toFixed(1);
            const avgQin = (pageData.reduce((sum, record) => sum + parseFloat(record.averageScores.qin), 0) / totalUsers).toFixed(1);
            const avgJi = (pageData.reduce((sum, record) => sum + parseFloat(record.averageScores.ji), 0) / totalUsers).toFixed(1);
            const avgLian = (pageData.reduce((sum, record) => sum + parseFloat(record.averageScores.lian), 0) / totalUsers).toFixed(1);
            
            return (
              <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                <Table.Summary.Cell index={0}>
                  <span style={{ fontWeight: 600 }}>平均值</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>-</Table.Summary.Cell>
                <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                <Table.Summary.Cell index={3}>-</Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <span style={{ fontWeight: 600, color: '#1890ff' }}>{avgTotal}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  <span style={{ color: '#ff4d4f' }}>{avgDe}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6}>
                  <span style={{ color: '#52c41a' }}>{avgNeng}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7}>
                  <span style={{ color: '#1890ff' }}>{avgQin}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8}>
                  <span style={{ color: '#722ed1' }}>{avgJi}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9}>
                  <span style={{ color: '#faad14' }}>{avgLian}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={10}>-</Table.Summary.Cell>
                <Table.Summary.Cell index={11}>-</Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>



      {/* 考勤得分统计 */}
      <Card title="考勤得分统计" className="admin-card">
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Statistic
              title="平均得分"
              value={statisticsData.attendance.averageScore}
              suffix="分"
              precision={1}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="满分人数"
              value={statisticsData.attendance.userScores.filter(user => user.currentScore === 100).length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="被扣分人数"
              value={statisticsData.attendance.userScores.filter(user => user.currentScore < 100).length}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="总扣分天数"
              value={statisticsData.attendance.userScores.reduce((sum, user) => sum + user.totalDeduction, 0)}
              suffix="天"
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>

        <Divider />
        
        {/* 详细得分表格 */}
        <h4>员工考勤得分详情</h4>
        <Table
          columns={[
            {
              title: '姓名',
              dataIndex: 'name',
              key: 'name',
              width: 100,
              fixed: 'left'
            },
            {
              title: '部门',
              dataIndex: 'department',
              key: 'department',
              width: 120
            },
            {
              title: '职位',
              dataIndex: 'position',
              key: 'position',
              width: 120
            },
            {
              title: '当前得分',
              dataIndex: 'currentScore',
              key: 'currentScore',
              width: 120,
              render: (score) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ 
                    fontSize: 16, 
                    fontWeight: 600,
                    color: score === 100 ? '#52c41a' : score >= 95 ? '#1890ff' : score >= 90 ? '#faad14' : '#ff4d4f'
                  }}>
                    {score}
                  </span>
                  <Progress 
                    percent={score} 
                    size="small" 
                    showInfo={false}
                    strokeColor={score === 100 ? '#52c41a' : score >= 95 ? '#1890ff' : score >= 90 ? '#faad14' : '#ff4d4f'}
                    style={{ width: 60 }}
                  />
                </div>
              ),
              sorter: (a, b) => a.currentScore - b.currentScore,
              defaultSortOrder: 'descend'
            },
            {
              title: '私假次数',
              dataIndex: 'personalLeaveCount',
              key: 'personalLeaveCount',
              width: 100,
              render: (count) => count > 0 ? (
                <Tag color="orange">{count}次</Tag>
              ) : (
                <Tag color="green">0次</Tag>
              )
            },
            {
              title: '扣分天数',
              dataIndex: 'personalLeaveDays',
              key: 'personalLeaveDays',
              width: 100,
              render: (days) => days > 0 ? (
                <span style={{ color: '#ff4d4f' }}>
                  <MinusCircleOutlined /> {days}天
                </span>
              ) : (
                <span style={{ color: '#52c41a' }}>0天</span>
              )
            },
            {
              title: '联系方式',
              dataIndex: 'phone',
              key: 'phone',
              width: 130
            }
          ]}
          dataSource={statisticsData.attendance.userScores}
          rowKey="id"
          pagination={{
            total: statisticsData.attendance.userScores.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 人`
          }}
          scroll={{ x: 800 }}
          size="small"
        />
        
        <Divider />
        <Button 
          icon={<DownloadOutlined />}
          onClick={() => exportData('attendance')}
        >
          导出考勤统计
        </Button>
      </Card>
    </div>
  );
};

export default DataStatistics;
