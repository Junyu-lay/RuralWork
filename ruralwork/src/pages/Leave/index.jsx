import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, Form, Input, DatePicker, Select, InputNumber, Button, Table, Tag, Space, message } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { createLeaveRequest, getLeaveRequests } from '../../services/databaseService';
import './styles.css';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const leaveTypeOptions = [
  { value: 'personal', label: '私假' },
  { value: 'sick', label: '病假' },
  { value: 'annual', label: '年假' },
  { value: 'other', label: '其他' }
];

const statusTag = (status) => {
  const map = { pending: { color: 'gold', text: '待审批' }, approved: { color: 'green', text: '已批准' }, rejected: { color: 'red', text: '已驳回' } };
  const cfg = map[status] || map.pending;
  return <Tag color={cfg.color}>{cfg.text}</Tag>;
};

const LeavePage = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);

  const columns = useMemo(() => [
    { title: '请假类型', dataIndex: 'leave_type', key: 'leave_type', width: 110, render: (v) => leaveTypeOptions.find(o => o.value === v)?.label || v },
    { title: '开始时间', dataIndex: 'start_date', key: 'start_date', width: 160, render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '结束时间', dataIndex: 'end_date', key: 'end_date', width: 160, render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '天数', dataIndex: 'days_count', key: 'days_count', width: 80 },
    { title: '事由', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: statusTag },
    { title: '提交时间', dataIndex: 'created_at', key: 'created_at', width: 160, render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm') }
  ], []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await getLeaveRequests(user.id);
      if (error) {
        message.error('加载记录失败');
        return;
      }
      setRecords(data || []);
    } catch (e) {
      console.error(e);
      message.error('加载记录失败');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { if (user?.id) loadData(); }, [user?.id, loadData]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const [start, end] = values.time_range || [];
      // 对齐数据库字段名：start_date, end_date
      const payload = {
        user_id: user.id,
        leave_type: values.leave_type,
        ...(start ? { start_date: start.toISOString() } : {}),
        ...(end ? { end_date: end.toISOString() } : {}),
        days_count: values.days_count || (start && end ? Math.max(1, end.diff(start, 'day', true)) : 1),
        reason: values.reason || '',
        status: 'pending',
      };

      const { error } = await createLeaveRequest(payload);
      if (error) {
        message.error('提交失败：' + error);
        return;
      }
      message.success('已提交请假申请');
      form.resetFields();
      loadData();
    } catch (e) {
      console.error(e);
      message.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="leave-page">
      <Card title="提交请假申请" className="admin-card" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ days_count: 1 }}>
          <Form.Item name="leave_type" label="请假类型" rules={[{ required: true, message: '请选择请假类型' }]}>
            <Select options={leaveTypeOptions} placeholder="请选择" allowClear />
          </Form.Item>

          <Form.Item name="time_range" label="请假时间" rules={[{ required: true, message: '请选择时间范围' }]}>
            <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="days_count" label="天数" rules={[{ required: true, message: '请输入请假天数' }]}>
            <InputNumber min={1} max={30} style={{ width: 160 }} />
          </Form.Item>

          <Form.Item name="reason" label="请假事由">
            <TextArea rows={3} placeholder="可填写请假原因" />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>提交申请</Button>
            <Button onClick={() => form.resetFields()}>重置</Button>
          </Space>
        </Form>
      </Card>

      <Card title="我的请假记录" className="admin-card">
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default LeavePage;


