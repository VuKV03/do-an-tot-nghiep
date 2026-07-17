import React, { useState, useEffect, useMemo } from 'react';
import { Card, Select, Button, Table, Row, Col, Typography, Tag, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

interface Package {
  id: string;
  name: string;
  subject: string;
  status: string;
  totalCandidates: number;
}

interface ExamResultRow {
  id: string;
  candidate_id: string;
  full_name: string;
  sbd: string;
  exam_id: string;
  status: string; // Đang làm, Đã nộp
  score: number | null;
  started_at: string | null;
  submitted_at: string | null;
}

export default function QuanLyKetQuaThi() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      // Lấy danh sách gói đề từ exam_service
      const res = await fetch('/api/exam/packages');
      if (res.ok) {
        const data = await res.json();
        const packagesListRaw = data.data || data; // Handle both wrapped and unwrapped arrays
        const packagesList = Array.isArray(packagesListRaw) ? packagesListRaw : [];
        setPackages(packagesList);
        const uniqueSubjects = Array.from(new Set(packagesList.map((p: any) => p.subject).filter(Boolean))) as string[];
        setSubjects(uniqueSubjects);
      }
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi tải danh sách gói đề");
    } finally {
      setLoadingPackages(false);
    }
  };

  const fetchResults = async () => {
    if (!selectedPackageId) {
      message.warning("Vui lòng chọn gói đề");
      return;
    }
    setLoadingResults(true);
    try {
      const res = await fetch(`/api/exam/admin/packages/${selectedPackageId}/results`);
      if (res.ok) {
        const data = await res.json();
        const resultsList = data.data || data;
        setResults(Array.isArray(resultsList) ? resultsList : []);
      } else {
        message.error("Lỗi khi tải kết quả thi");
      }
    } catch (error) {
      console.error(error);
      message.error("Lỗi kết nối");
    } finally {
      setLoadingResults(false);
    }
  };

  const filteredPackages = useMemo(() => {
    if (!selectedSubject) return packages;
    return packages.filter(p => p.subject === selectedSubject);
  }, [packages, selectedSubject]);

  const columns: ColumnsType<ExamResultRow> = [
    { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, index) => index + 1 },
    { title: 'Họ tên thí sinh', dataIndex: 'full_name', key: 'full_name', className: 'font-medium text-slate-800' },
    { title: 'SBD', dataIndex: 'sbd', key: 'sbd' },
    { title: 'Mã đề đã làm', dataIndex: 'exam_id', key: 'exam_id' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      align: 'center',
      render: (status: string) => {
        if (status === 'Đã nộp') return <Tag color="success" className="px-3 py-1 rounded-md bg-green-50 text-green-600 border-green-200">Đã nộp</Tag>;
        return <Tag color="processing" className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 border-blue-200">Đang làm</Tag>;
      }
    },
    { 
      title: 'Điểm số', 
      dataIndex: 'score', 
      key: 'score',
      align: 'center',
      render: (score: number | null) => score !== null ? <span className="font-bold text-red-500">{score.toFixed(2)}</span> : '-'
    },
    {
      title: 'Thời gian làm bài',
      key: 'thoi_gian_lam_bai',
      align: 'center',
      render: (_, record: ExamResultRow) => {
        const start = record.started_at ? dayjs(record.started_at + 'Z').format('HH:mm:ss DD/MM/YYYY') : '-';
        const end = record.submitted_at ? dayjs(record.submitted_at + 'Z').format('HH:mm:ss DD/MM/YYYY') : 'Đang thi';
        if (start === '-' && end === 'Đang thi') return '-';
        return (
          <div className="text-sm">
            <div className="text-slate-500 whitespace-nowrap">Từ: {start}</div>
            <div className="text-green-600 whitespace-nowrap">Đến: {end}</div>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Card title={<span className="text-blue-800 font-semibold text-lg">Thống kê kết quả thi</span>} className="shadow-sm rounded-xl">
        <Row gutter={24} align="bottom">
          <Col span={8}>
            <div className="mb-2 text-slate-700 font-medium">Lọc theo Môn học</div>
            <Select
              className="w-full"
              placeholder="Chọn môn học"
              allowClear
              value={selectedSubject}
              onChange={(val) => {
                setSelectedSubject(val);
                setSelectedPackageId(null);
                setResults([]);
              }}
              options={subjects.map(s => ({ label: s, value: s }))}
            />
          </Col>
          <Col span={10}>
            <div className="mb-2 text-slate-700 font-medium">Chọn Gói đề</div>
            <Select
              className="w-full"
              placeholder="Chọn gói đề"
              allowClear
              value={selectedPackageId}
              onChange={(val) => setSelectedPackageId(val)}
              loading={loadingPackages}
              options={filteredPackages.map(p => ({ 
                label: `${p.name} - ${p.status === 'active' ? '(Đang phát)' : '(Đã hoàn thành)'}`, 
                value: p.id 
              }))}
            />
          </Col>
          <Col span={6}>
            <Button 
              type="primary" 
              icon={<SearchOutlined />} 
              onClick={fetchResults}
              loading={loadingResults}
              disabled={!selectedPackageId}
              className="w-full bg-[#1d4ed8] hover:bg-blue-700 font-medium rounded-lg h-8"
            >
              Xem kết quả
            </Button>
          </Col>
        </Row>
      </Card>

      {selectedPackageId && (
        <Card
          title={
            <div className="flex justify-between items-center">
              <span className="text-blue-800 font-semibold text-lg">Danh sách thí sinh</span>
              <Button icon={<ReloadOutlined />} onClick={fetchResults} size="small" className="rounded-lg">Làm mới</Button>
            </div>
          }
          className="shadow-sm rounded-xl"
        >
          <Table
            columns={columns}
            dataSource={results}
            rowKey="id"
            loading={loadingResults}
            pagination={{
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
            }}
            className="overflow-hidden rounded-xl border border-slate-200"
            rowClassName={() => 'hover:bg-slate-50 transition-colors'}
          />
        </Card>
      )}
    </div>
  );
}
