import React, { useState, useMemo } from 'react';
import {
  Card,
  Input,
  Select,
  Button,
  Table,
  Space,
  Modal,
  Form,
  DatePicker,
  Row,
  Col,
  Tooltip,
  Typography,
  Tag,
  Divider
} from 'antd';
import dayjs from 'dayjs';
import {
  QuestionCircleOutlined,
  EyeOutlined,
  PrinterOutlined,
  BarChartOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface ExamResultRow {
  key: string;
  stt: string;
  monThi?: string;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  slThiSinh: number;
  vang: number;
  nop: number;
  hinhThuc?: string;
  thoiGian: number;
  trangThai?: string;
  type?: 'main' | 'sub' | 'detail';
  children?: ExamResultRow[];
}

export default function QuanLyKetQuaThi() {
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isChartModalVisible, setIsChartModalVisible] = useState(false);

  const [data, setData] = useState<ExamResultRow[]>([]);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Search filter states
  const [searchSession, setSearchSession] = useState('all');
  const [searchStatus, setSearchStatus] = useState('all');
  const [searchDateRange, setSearchDateRange] = useState<[any, any] | null>(null);

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, resultsRes, candidatesRes] = await Promise.all([
        fetch('http://localhost:8005/api/exam/admin/sessions'),
        fetch('http://localhost:8005/api/exam/admin/results'),
        fetch('http://localhost:8005/api/exam/admin/candidates')
      ]);

      const sessions = await sessionsRes.json();
      const results = await resultsRes.json();
      const candidates = await candidatesRes.json();

      setAllResults(results);

      const formatted: ExamResultRow[] = sessions.map((session: any, index: number) => {
        const sessionCandidates = candidates.filter((c: any) => c.session_id === session.id);
        const sessionResults = results.filter((r: any) => r.session_id === session.id);

        const slThiSinh = sessionCandidates.length;
        const nop = sessionResults.length;
        const vang = Math.max(0, slThiSinh - nop);

        return {
          key: session.id,
          stt: (index + 1).toString(),
          monThi: session.name, // Using session name as 'Môn thi' for simplicity
          ngayBatDau: new Date(session.start_time).toLocaleString('vi-VN'),
          ngayKetThuc: new Date(session.end_time).toLocaleString('vi-VN'),
          slThiSinh,
          vang,
          nop,
          hinhThuc: 'Trắc nghiệm', // Default
          thoiGian: session.duration_minutes,
          trangThai: session.status === 'active' ? 'Đang diễn ra' : 'Đã duyệt',
          type: 'main',
          children: []
        };
      });

      setData(formatted);

      // Auto-select first session if none is selected for chart modal
      if (formatted.length > 0 && !selectedSessionId) {
        // Keep null, don't auto-select
      }
    } catch (error) {
      console.error(error);
      // fallback to empty
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status?: string) => {
    if (!status) return null;
    if (status === 'Đang diễn ra') return <Tag color="success" className="px-3 py-1 rounded-md bg-green-50 text-green-600 border-green-200">Đang diễn ra</Tag>;
    if (status === 'Đã duyệt') return <Tag className="px-3 py-1 rounded-md bg-white text-green-600 border-green-300">Đã duyệt</Tag>;
    if (status === 'Tạo mới') return <Tag className="px-3 py-1 rounded-md bg-rose-50 text-rose-500 border-rose-200">Tạo mới</Tag>;
    return <Tag>{status}</Tag>;
  };

  const columns: ColumnsType<ExamResultRow> = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 80, align: 'center' },
    { title: 'Môn thi', dataIndex: 'monThi', key: 'monThi' },
    { title: 'Ngày bắt đầu', dataIndex: 'ngayBatDau', key: 'ngayBatDau' },
    { title: 'Ngày kết thúc', dataIndex: 'ngayKetThuc', key: 'ngayKetThuc' },
    { title: 'SL thí sinh', dataIndex: 'slThiSinh', key: 'slThiSinh', align: 'center' },
    { title: 'SL thí sinh vắng thi', dataIndex: 'vang', key: 'vang', align: 'center' },
    { title: 'SL thí sinh nộp bài', dataIndex: 'nop', key: 'nop', align: 'center' },
    { title: 'Hình thức thi', dataIndex: 'hinhThuc', key: 'hinhThuc' },
    { title: 'Thời gian làm bài (phút)', dataIndex: 'thoiGian', key: 'thoiGian', align: 'center' },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      align: 'center',
      render: (text) => renderStatus(text)
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (record.type === 'main') {
          return (
            <Space size="small">
              <Button
                type="text"
                icon={<BarChartOutlined className="text-blue-600" />}
                className="bg-blue-50 border border-blue-100 hover:bg-blue-100 p-0 w-8 h-8 flex items-center justify-center rounded"
                onClick={() => {
                  setSelectedSessionId(record.key);
                  setIsChartModalVisible(true);
                }}
              />
              <Button
                type="text"
                icon={<DownloadOutlined className="text-blue-600" />}
                className="bg-blue-50 border border-blue-100 hover:bg-blue-100 p-0 w-8 h-8 flex items-center justify-center rounded"
              />
            </Space>
          );
        } else {
          return (
            <Space size="small">
              <Button
                type="text"
                icon={<EyeOutlined className="text-blue-600" />}
                className="bg-blue-50 border border-blue-100 hover:bg-blue-100 p-0 w-8 h-8 flex items-center justify-center rounded"
                onClick={() => setIsDetailModalVisible(true)}
              />
              <Button
                type="text"
                icon={<PrinterOutlined className="text-slate-600" />}
                className="bg-slate-50 border border-slate-200 hover:bg-slate-100 p-0 w-8 h-8 flex items-center justify-center rounded"
              />
            </Space>
          );
        }
      },
    },
  ];

  const detailColumns = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 60, align: 'center' as const },
    { title: 'Mã điểm thi', dataIndex: 'maDiemThi', key: 'maDiemThi' },
    { title: 'Phòng thi', dataIndex: 'phongThi', key: 'phongThi' },
    { title: 'Họ và tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Ngày sinh', dataIndex: 'dob', key: 'dob' },
    { title: 'SBD', dataIndex: 'sbd', key: 'sbd' },
    { title: 'Mã đề', dataIndex: 'maDe', key: 'maDe', align: 'center' as const },
    { title: 'Điểm tổng', dataIndex: 'diemTong', key: 'diemTong', align: 'center' as const, render: (text: string) => <strong>{text}</strong> },
    { title: 'Thời gian làm bài (mm:ss)', dataIndex: 'thoiGian', key: 'thoiGian', align: 'center' as const },
    { title: 'Câu 1 (Điểm)', dataIndex: 'c1d', key: 'c1d', align: 'center' as const },
    { title: 'Câu 1 (Thời gian)', dataIndex: 'c1t', key: 'c1t', align: 'center' as const },
    { title: 'Câu 2 (Điểm)', dataIndex: 'c2d', key: 'c2d', align: 'center' as const },
    { title: 'Câu 2 (Thời gian)', dataIndex: 'c2t', key: 'c2t', align: 'center' as const },
    { title: 'Câu 3 (Điểm)', dataIndex: 'c3d', key: 'c3d', align: 'center' as const },
    { title: 'Câu 3 (Thời gian)', dataIndex: 'c3t', key: 'c3t', align: 'center' as const },
  ];

  const detailData = [
    { key: '1', stt: 1, maDiemThi: '06334', phongThi: 'P205-A1', fullName: 'Nguyễn Văn An', dob: '20/11/2005', sbd: '01000001', maDe: '0101', diemTong: '6,5', thoiGian: '6,5', c1d: '0,5', c1t: '01:00', c2d: '0,5', c2t: '01:00', c3d: '0,5', c3t: '01:00' },
    { key: '2', stt: 2, maDiemThi: '06334', phongThi: 'P205-A1', fullName: 'Nguyễn Văn An', dob: '20/11/2005', sbd: '01000002', maDe: '0102', diemTong: '8,5', thoiGian: '8,5', c1d: '0,5', c1t: '00:20', c2d: '0,5', c2t: '00:20', c3d: '0,5', c3t: '00:20' },
    { key: '3', stt: 3, maDiemThi: '06334', phongThi: 'P205-A1', fullName: 'Nguyễn Văn An', dob: '20/11/2005', sbd: '01000003', maDe: '0103', diemTong: '10', thoiGian: '10', c1d: '0', c1t: '01:00', c2d: '0', c2t: '01:00', c3d: '0', c3t: '01:00' },
    { key: '4', stt: 4, maDiemThi: '06334', phongThi: 'P205-A1', fullName: 'Nguyễn Văn An', dob: '20/11/2005', sbd: '01000004', maDe: '0104', diemTong: '9', thoiGian: '9', c1d: '0,5', c1t: '01:00', c2d: '0,5', c2t: '01:00', c3d: '0,5', c3t: '01:00' },
    { key: '5', stt: 5, maDiemThi: '06334', phongThi: 'P205-A2', fullName: 'Nguyễn Văn Anh', dob: '20/11/2005', sbd: '01000005', maDe: '0105', diemTong: '7,75', thoiGian: '7,75', c1d: '0,5', c1t: '01:00', c2d: '0,5', c2t: '01:00', c3d: '0,5', c3t: '01:00' },
  ];

  const selectedResults = allResults.filter(r => r.session_id === selectedSessionId);
  const chartData = [
    { range: '[0-0.5]', value: 0 },
    { range: '(0.5-1]', value: 0 },
    { range: '(1-1.5]', value: 0 },
    { range: '(1.5-2]', value: 0 },
    { range: '(2-2.5]', value: 0 },
    { range: '(2.5-3]', value: 0 },
    { range: '(3-3.5]', value: 0 },
    { range: '(3.5-4]', value: 0 },
    { range: '(4-4.5]', value: 0 },
    { range: '(4.5-5]', value: 0 },
    { range: '(5-5.5]', value: 0 },
    { range: '(5.5-6]', value: 0 },
    { range: '(6-6.5]', value: 0 },
    { range: '(6.5-7]', value: 0 },
    { range: '(7-7.5]', value: 0 },
    { range: '(7.5-8]', value: 0 },
    { range: '(8-8.5]', value: 0 },
    { range: '(8.5-9]', value: 0 },
    { range: '(9-9.5]', value: 0 },
    { range: '(9.5-10]', value: 0 },
  ];

  selectedResults.forEach(r => {
    const score = r.score;
    if (score === null || score === undefined) return;
    if (score <= 0.5) chartData[0].value += 1;
    else if (score <= 1.0) chartData[1].value += 1;
    else if (score <= 1.5) chartData[2].value += 1;
    else if (score <= 2.0) chartData[3].value += 1;
    else if (score <= 2.5) chartData[4].value += 1;
    else if (score <= 3.0) chartData[5].value += 1;
    else if (score <= 3.5) chartData[6].value += 1;
    else if (score <= 4.0) chartData[7].value += 1;
    else if (score <= 4.5) chartData[8].value += 1;
    else if (score <= 5.0) chartData[9].value += 1;
    else if (score <= 5.5) chartData[10].value += 1;
    else if (score <= 6.0) chartData[11].value += 1;
    else if (score <= 6.5) chartData[12].value += 1;
    else if (score <= 7.0) chartData[13].value += 1;
    else if (score <= 7.5) chartData[14].value += 1;
    else if (score <= 8.0) chartData[15].value += 1;
    else if (score <= 8.5) chartData[16].value += 1;
    else if (score <= 9.0) chartData[17].value += 1;
    else if (score <= 9.5) chartData[18].value += 1;
    else chartData[19].value += 1;
  });

  const sortedScores = selectedResults.map(r => r.score || 0).sort((a, b) => a - b);
  let median = 0;
  if (sortedScores.length > 0) {
    const mid = Math.floor(sortedScores.length / 2);
    median = sortedScores.length % 2 !== 0 ? sortedScores[mid] : (sortedScores[mid - 1] + sortedScores[mid]) / 2;
  }

  let mode = 0;
  const counts: Record<number, number> = {};
  let maxCount = 0;
  sortedScores.forEach(s => {
    counts[s] = (counts[s] || 0) + 1;
    if (counts[s] > maxCount) {
      maxCount = counts[s];
      mode = s;
    }
  });

  const stats = {
    total: selectedResults.length,
    average: selectedResults.length > 0 ? (selectedResults.reduce((acc, r) => acc + (r.score || 0), 0) / selectedResults.length).toFixed(2) : '0',
    median: median.toFixed(2),
    mode: mode,
    score10: selectedResults.filter(r => r.score === 10).length,
    score0: selectedResults.filter(r => r.score === 0).length,
  };

  const selectedSession = data.find(d => d.key === selectedSessionId);
  const sessionName = selectedSession ? selectedSession.monThi : '';

  const filteredData = useMemo(() => {
    return data.filter(d => {
      // Filter by session name
      const sessionMatch = searchSession === 'all' || d.key === searchSession;

      // Filter by status
      const statusMatch = searchStatus === 'all' || d.trangThai === searchStatus;

      // Filter by date range
      let dateMatch = true;
      if (searchDateRange && searchDateRange[0] && searchDateRange[1]) {
        const startFilter = searchDateRange[0].startOf('day');
        const endFilter = searchDateRange[1].endOf('day');
        if (d.ngayBatDau) {
          // Parse the localized date string back
          const sessionDate = dayjs(d.ngayBatDau, 'HH:mm:ss DD/MM/YYYY');
          if (sessionDate.isValid()) {
            dateMatch = (sessionDate.isAfter(startFilter) || sessionDate.isSame(startFilter, 'day')) &&
              (sessionDate.isBefore(endFilter) || sessionDate.isSame(endFilter, 'day'));
          }
        } else {
          dateMatch = false;
        }
      }

      return sessionMatch && statusMatch && dateMatch;
    });
  }, [data, searchSession, searchStatus, searchDateRange]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Card title={<span className="text-blue-800 font-semibold">Tìm kiếm thông tin</span>} className="shadow-sm rounded-xl">
        <Row gutter={24} align="bottom">
          <Col span={8}>
            <div className="mb-1 text-slate-600 font-medium">Kỳ thi</div>
            <Select
              className="w-full"
              placeholder="Chọn kỳ thi"
              value={searchSession}
              onChange={setSearchSession}
            >
              <Select.Option value="all">Tất cả</Select.Option>
              {data.map(d => (
                <Select.Option key={d.key} value={d.key}>{d.monThi}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <div className="mb-1 text-slate-600 font-medium">Trạng thái</div>
            <Select
              className="w-full"
              placeholder="Tất cả"
              value={searchStatus}
              onChange={setSearchStatus}
            >
              <Select.Option value="all">Tất cả</Select.Option>
              <Select.Option value="Đang diễn ra">Đang diễn ra</Select.Option>
              <Select.Option value="Đã duyệt">Đã duyệt</Select.Option>
              <Select.Option value="Tạo mới">Tạo mới</Select.Option>
            </Select>
          </Col>
          <Col span={8}>
            <div className="mb-1 text-slate-600 font-medium">Ngày thi</div>
            <RangePicker
              className="w-full"
              placeholder={['Từ ngày', 'Đến ngày']}
              format="DD/MM/YYYY"
              value={searchDateRange}
              onChange={(dates) => setSearchDateRange(dates as [any, any] | null)}
            />
          </Col>
          <Col span={24} className="text-center mt-6">
            <Space>
              <Button type="primary" className="bg-[#1d4ed8] px-8 rounded-lg shadow-sm font-medium hover:bg-blue-700">
                Tìm kiếm
              </Button>
              <Button
                className="px-6 rounded-lg font-medium"
                onClick={() => {
                  setSearchSession('all');
                  setSearchStatus('all');
                  setSearchDateRange(null);
                }}
              >
                Đặt lại
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        title={<span className="text-blue-800 font-semibold">Kết quả tìm kiếm</span>}
        className="shadow-sm rounded-xl"
      >
        <Table
          columns={columns}
          dataSource={filteredData}
          rowSelection={{ type: 'checkbox' }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
          }}
          className="overflow-hidden rounded-xl border border-slate-200"
          rowClassName={(record) => record.type === 'detail' ? 'bg-slate-50 text-slate-600' : 'hover:bg-slate-50 transition-colors'}
          expandable={{
            defaultExpandAllRows: true,
          }}
        />
      </Card>

      {/* Modal Xem chi tiết kết quả thi */}
      <Modal
        title={<span className="text-blue-800 font-semibold">Xem chi tiết kết quả thi</span>}
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        width={1400}
        footer={[
          <Button key="close" className="border-blue-500 text-blue-600 rounded-lg font-medium px-6" onClick={() => setIsDetailModalVisible(false)}>Đóng</Button>,
          <Button key="print" type="primary" className="bg-[#1d4ed8] rounded-lg font-medium px-6">In</Button>,
          <Button key="export" type="primary" className="bg-[#1d4ed8] rounded-lg font-medium px-6">Kết xuất excel</Button>,
          <Button key="export-analysis" type="primary" className="bg-[#1d4ed8] rounded-lg font-medium px-6">Kết xuất dữ liệu phân tích</Button>
        ]}
      >
        <div className="space-y-6 pt-2">
          <div className="font-semibold text-blue-800 mb-2">Thông tin chung</div>
          <Row gutter={[32, 16]}>
            <Col span={6}>
              <Text type="secondary" className="block mb-1">Môn thi</Text>
              <Text className="font-medium">Toán</Text>
            </Col>
            <Col span={10}>
              <Text type="secondary" className="block mb-1">kỳ thi</Text>
              <Text className="font-medium">Kỳ thi tốt nghiệp THPT 2025</Text>
            </Col>
            <Col span={8}>
              <Text type="secondary" className="block mb-1">Ca thi</Text>
              <Text className="font-medium">2</Text>
            </Col>
          </Row>

          <Divider className="my-2" />

          <div className="font-semibold text-blue-800 mb-2">Danh sách thí sinh</div>
          <Table
            columns={detailColumns}
            dataSource={detailData}
            pagination={{
              showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
              showSizeChanger: true,
            }}
            scroll={{ x: 1200 }}
            size="small"
            bordered
            className="rounded-lg overflow-hidden border border-slate-200"
          />
        </div>
      </Modal>

      {/* Modal Phổ điểm */}
      <Modal
        title={<span className="text-slate-800 font-semibold">Xem phổ điểm môn [{sessionName}]</span>}
        open={isChartModalVisible}
        onCancel={() => setIsChartModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" className="border-blue-500 text-blue-600 rounded-lg font-medium px-8" onClick={() => setIsChartModalVisible(false)}>Đóng</Button>
        ]}
      >
        <div className="space-y-6 pt-2">
          <div className="font-semibold text-blue-800 mb-2">Tìm kiếm thông tin</div>
          <Row gutter={16}>
            <Col span={6}>
              <div className="mb-1 text-slate-600">Đề thi gốc</div>
              <Select className="w-full" defaultValue="Tất cả" placeholder="Tất cả">
                <Select.Option value="all">Tất cả</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <div className="mb-1 text-slate-600">Kíp thi</div>
              <Select className="w-full" defaultValue="Tất cả" placeholder="Tất cả">
                <Select.Option value="all">Tất cả</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <div className="mb-1 text-slate-600">Phòng thi</div>
              <Select className="w-full" defaultValue="Tất cả" placeholder="Tất cả">
                <Select.Option value="all">Tất cả</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <div className="mb-1 text-slate-600">Khoảng cách phổ điểm</div>
              <Select className="w-full" defaultValue="0.5">
                <Select.Option value="0.5">0.5</Select.Option>
                <Select.Option value="1.0">1.0</Select.Option>
              </Select>
            </Col>
            <Col span={24} className="text-center mt-4">
              <Button type="primary" className="bg-[#1d4ed8] px-6 rounded-lg shadow-sm font-medium hover:bg-blue-700">
                Xem phổ điểm
              </Button>
            </Col>
          </Row>

          <Row gutter={24} className="mt-8">
            <Col span={16}>
              <div className="font-semibold text-slate-800 mb-4 text-center uppercase tracking-wider">Phổ điểm thô</div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="range"
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-slate-500 font-medium text-sm mt-2">Điểm</div>
              <div className="absolute top-1/2 -left-6 -translate-y-1/2 -rotate-90 text-slate-500 font-medium text-sm">Số lượng thí sinh</div>
            </Col>
            <Col span={8}>
              <div className="flex justify-between items-center mb-4">
                <div className="font-semibold text-slate-800">Kết quả</div>
                <Space>
                  <Button size="small" type="primary" className="bg-[#1d4ed8] text-xs font-medium rounded">Xuất PDF</Button>
                  <Button size="small" className="border-blue-500 text-blue-600 text-xs font-medium rounded">Xuất ảnh</Button>
                </Space>
              </div>

              <div className="font-semibold text-slate-800 mb-3 mt-4">Thống kê</div>
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="flex justify-between p-3 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Số lượng thí sinh</span>
                  <span className="font-bold text-slate-800">{stats.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-slate-600 font-medium">Điểm trung bình</span>
                  <span className="font-bold text-red-500">{stats.average}</span>
                </div>
                <div className="flex justify-between p-3 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Trung vị</span>
                  <span className="font-bold text-slate-800">{stats.median}</span>
                </div>
                <div className="flex justify-between p-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-slate-600 font-medium">Điểm nhiều thí sinh đạt nhất</span>
                  <span className="font-bold text-slate-800">{stats.mode}</span>
                </div>
                <div className="flex justify-between p-3 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Số điểm 10</span>
                  <span className="font-bold text-red-500">{stats.score10}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-600 font-medium">Số điểm 0</span>
                  <span className="font-bold text-slate-800">{stats.score0}</span>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </Modal>

    </div>
  );
}
