import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
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
  message
} from 'antd';
import {
  QuestionCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  PlusOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { quanLyThiAdminApi, ExamSessionAPI } from '../../services/quanLyThiApi';
import { subjectCategoryApi } from '../../services/danhMucApi';

const { Title, Text } = Typography;

interface Candidate {
  id: string;
  stt: number;
  dotThi: string;
  fullName: string;
  gender: string;
  dob: string;
  sbd: string;
  subject1: string;
  subject2: string;
  subject3: string;
  cccd: string;
  diemThi: string;
  note: string;
  registeredSubjects?: string[];
}

const generateSBD = (fullName: string, dobStr: string) => {
  if (!fullName || !dobStr) return '';
  let str = fullName;
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");

  const initials = str.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase()).join('');
  const dobPart = dobStr.replace(/\//g, '');
  return `${initials}${dobPart}`;
};

export default function QuanLyThiSinh() {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  const [data, setData] = useState<Candidate[]>([]);
  const [sessions, setSessions] = useState<ExamSessionAPI[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<{ label: string, value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  // Search filter states
  const [searchText, setSearchText] = useState('');
  const [searchSession, setSearchSession] = useState('all');

  const filteredData = useMemo(() => {
    return data.filter(c => {
      // Filter by name, SBD, or CCCD
      const kwText = searchText.trim().toLowerCase();
      const textMatch = kwText === '' ||
        c.fullName.toLowerCase().includes(kwText) ||
        c.sbd.toLowerCase().includes(kwText) ||
        c.cccd.toLowerCase().includes(kwText);

      // Filter by session (kỳ thi)
      const sessionMatch = searchSession === 'all' || c.dotThi === searchSession;

      return textMatch && sessionMatch;
    });
  }, [data, searchText, searchSession]);

  React.useEffect(() => {
    fetchSessions();
    fetchCandidates();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await subjectCategoryApi.list();
      if (res.success && res.data) {
        setSubjectOptions(res.data.map(s => ({ label: s.name, value: s.name })));
      }
    } catch (err) {
      console.error('Lỗi tải danh mục môn học:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await quanLyThiAdminApi.listSessions();
      setSessions(data);
    } catch (err: any) {
      message.error(err.message || 'Lỗi tải danh sách kỳ thi');
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const candidatesData = await quanLyThiAdminApi.getAllCandidates();

      const formatted = candidatesData.map((c: any, index: number) => {
        const subjects = c.registered_subjects ? c.registered_subjects.split(',') : [];
        return {
          id: c.id,
          stt: index + 1,
          dotThi: c.session_id, // We'll map this to session name below
          fullName: c.full_name,
          gender: c.gender || '',
          dob: c.dob || '',
          sbd: c.username,
          subject1: subjects[0] || '',
          subject2: subjects[1] || '',
          subject3: subjects[2] || '',
          cccd: c.cccd || '',
          diemThi: c.diem_thi || '',
          note: c.note || '',
          registeredSubjects: subjects
        };
      });
      setData(formatted);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Lỗi tải dữ liệu thí sinh');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<Candidate> = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 60, align: 'center' },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text, record) => (
        <a onClick={() => {
          setModalMode('view');
          setEditingCandidate(record);
          const formData = {
            ...record,
            dob: record.dob ? dayjs(record.dob, 'DD/MM/YYYY') : undefined
          };
          form.setFieldsValue(formData);
          setIsModalVisible(true);
        }}>{text}</a>
      )
    },
    { title: 'Giới tính', dataIndex: 'gender', key: 'gender', width: 90 },
    { title: 'Ngày sinh', dataIndex: 'dob', key: 'dob', width: 110 },
    { title: 'SBD', dataIndex: 'sbd', key: 'sbd', width: 100 },
    { title: 'CCCD', dataIndex: 'cccd', key: 'cccd', width: 100 },
    {
      title: 'Kỳ thi',
      dataIndex: 'dotThi',
      key: 'dotThi',
      render: (val: string) => sessions.find(s => s.id === val)?.name || val
    },
    // { title: 'Môn thi 1', dataIndex: 'subject1', key: 'subject1' },
    // { title: 'Môn thi 2', dataIndex: 'subject2', key: 'subject2' },
    // { title: 'Môn thi 3', dataIndex: 'subject3', key: 'subject3' },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined className="text-blue-600" />}
            className="bg-blue-50 border border-blue-100 hover:bg-blue-100 p-0 w-8 h-8 flex items-center justify-center rounded"
            onClick={() => {
              setModalMode('edit');
              setEditingCandidate(record);
              const formData = {
                ...record,
                dob: record.dob ? dayjs(record.dob, 'DD/MM/YYYY') : undefined
              };
              form.setFieldsValue(formData);
              setIsModalVisible(true);
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined className="text-red-500" />}
            className="bg-red-50 border border-red-100 hover:bg-red-100 p-0 w-8 h-8 flex items-center justify-center rounded"
            onClick={() => {
              setCandidateToDelete(record);
              setDeleteModalVisible(true);
            }}
          />
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const handleAdd = () => {
    form.resetFields();
    setEditingCandidate(null);
    setModalMode('add');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      const dobStr = values.dob ? values.dob.format('DD/MM/YYYY') : '';

      if (modalMode === 'add') {
        const calculatedSBD = values.sbd || generateSBD(values.fullName, dobStr) || `TS${Math.floor(Math.random() * 10000)}`;
        const payload = [{
          username: calculatedSBD,
          full_name: values.fullName,
          password: dobStr ? dobStr.replace(/\//g, '') : '123456', // Mật khẩu là ngày sinh (VD: 30092003)
          status: 'not_started',
          cccd: values.cccd,
          gender: values.gender,
          dob: dobStr,
          diem_thi: values.diemThi,
          note: values.note,
          registered_subjects: values.registeredSubjects ? values.registeredSubjects.join(',') : ''
        }];
        await quanLyThiAdminApi.addCandidates(values.dotThi, payload);
        message.success('Thêm mới thí sinh thành công!');
      } else if (modalMode === 'edit' && editingCandidate) {
        const calculatedSBD = values.sbd || generateSBD(values.fullName, dobStr) || editingCandidate.sbd;
        const payload = {
          session_id: values.dotThi,
          full_name: values.fullName,
          username: calculatedSBD,
          password: dobStr ? dobStr.replace(/\//g, '') : undefined, // Cập nhật lại mật khẩu nếu ngày sinh thay đổi
          cccd: values.cccd,
          gender: values.gender,
          dob: dobStr,
          diem_thi: values.diemThi,
          note: values.note,
          registered_subjects: values.registeredSubjects ? values.registeredSubjects.join(',') : ''
        };
        await quanLyThiAdminApi.updateCandidate(editingCandidate.id, payload);
        message.success('Cập nhật thí sinh thành công!');
      }
      setIsModalVisible(false);
      fetchCandidates();
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.message || 'Lỗi lưu thông tin thí sinh');
    }
  };

  const handleDelete = async () => {
    try {
      if (candidateToDelete) {
        await quanLyThiAdminApi.deleteCandidate(candidateToDelete.id);
        message.success('Đã xóa thành công!');
      } else if (selectedRowKeys.length > 0) {
        for (const key of selectedRowKeys) {
          await quanLyThiAdminApi.deleteCandidate(key as string);
        }
        message.success(`Đã xóa ${selectedRowKeys.length} thí sinh!`);
        setSelectedRowKeys([]);
      }
      setDeleteModalVisible(false);
      setCandidateToDelete(null);
      fetchCandidates();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi xóa thí sinh');
    }
  };

  const getModalTitle = () => {
    if (modalMode === 'add') return 'Thêm mới thông tin thí sinh';
    if (modalMode === 'edit') return 'Sửa thông tin thí sinh';
    return 'Thông tin thí sinh';
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      <Card title={<span className="text-blue-800 font-semibold">Tìm kiếm thông tin</span>} className="shadow-sm rounded-xl">
        <Row gutter={24} align="bottom">
          <Col span={8}>
            <div className="mb-1 text-slate-600">Mã/ tên thí sinh</div>
            <Input
              placeholder="Nhập tên, SBD hoặc CCCD"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={8}>
            <div className="mb-1 text-slate-600">Kỳ thi</div>
            <Select
              className="w-full"
              placeholder="Tất cả"
              value={searchSession}
              onChange={setSearchSession}
            >
              <Select.Option value="all">Tất cả</Select.Option>
              {sessions.map(s => (
                <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={24} className="text-center mt-6">
            <Space>
              <Button type="primary" className="bg-[#1d4ed8] px-8 rounded-lg shadow-sm font-medium hover:bg-blue-700">
                Tìm kiếm
              </Button>
              <Button
                className="px-6 rounded-lg font-medium"
                onClick={() => {
                  setSearchText('');
                  setSearchSession('all');
                }}
              >
                Đặt lại
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Space>
            <Button type="primary" style={{ backgroundColor: '#1d39c4' }} onClick={handleAdd}>
              Thêm mới
            </Button>
            <Button danger disabled={selectedRowKeys.length === 0} onClick={() => setDeleteModalVisible(true)}>
              Xóa
            </Button>
          </Space>
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 10,
          }}
        />
      </Card>

      <Modal
        title={<span className="text-blue-800 font-semibold">{getModalTitle()}</span>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={700}
        footer={modalMode === 'view' ? [
          <Button key="close" className="border-blue-500 text-blue-600 rounded-lg font-medium px-8" onClick={() => setIsModalVisible(false)}>Đóng</Button>
        ] : [
          <Button key="close" className="border-blue-500 text-blue-600 rounded-lg font-medium px-8" onClick={() => setIsModalVisible(false)}>Đóng</Button>,
          <Button key="save" type="primary" className="bg-[#1d4ed8] rounded-lg font-medium px-8" onClick={handleSave}>Lưu</Button>
        ]}
      >
        {modalMode === 'view' && editingCandidate ? (
          <div className="py-4 space-y-4">
            <Row gutter={[24, 16]}>
              <Col span={12}><Text type="secondary">Họ và tên</Text><div className="font-medium mt-1">{editingCandidate.fullName}</div></Col>
              <Col span={12}><Text type="secondary">Số CCCD</Text><div className="font-medium mt-1">{editingCandidate.cccd}</div></Col>
              <Col span={12}><Text type="secondary">Giới tính</Text><div className="font-medium mt-1">{editingCandidate.gender}</div></Col>
              <Col span={12}><Text type="secondary">Ngày sinh</Text><div className="font-medium mt-1">{editingCandidate.dob}</div></Col>
              <Col span={24}><Text type="secondary">Kỳ thi</Text><div className="font-medium mt-1">{sessions.find(s => s.id === editingCandidate.dotThi)?.name || editingCandidate.dotThi}</div></Col>
              <Col span={12}><Text type="secondary">SBD</Text><div className="font-medium mt-1">{editingCandidate.sbd}</div></Col>
              <Col span={24}><Text type="secondary">Ghi chú</Text><div className="font-medium mt-1">{editingCandidate.note}</div></Col>
              <Col span={24}>
                <Text type="secondary" className="mb-2 block">Môn đăng ký</Text>
                <div className="font-medium mt-1">
                  {editingCandidate.registeredSubjects
                    ? editingCandidate.registeredSubjects.join(', ')
                    : [editingCandidate.subject1, editingCandidate.subject2, editingCandidate.subject3].filter(Boolean).join(', ')}
                </div>
              </Col>
            </Row>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            className="mt-4"
            onValuesChange={(changedValues, allValues) => {
              if (changedValues.fullName !== undefined || changedValues.dob !== undefined) {
                const dobStr = allValues.dob ? allValues.dob.format('DD/MM/YYYY') : '';
                const sbd = generateSBD(allValues.fullName || '', dobStr);
                form.setFieldsValue({ sbd });
              }
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                  <Input placeholder="Nhập họ tên" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Số CCCD/ Hộ chiếu" name="cccd">
                  <Input placeholder="Nhập số CCCD" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Giới tính" name="gender">
                  <Select placeholder="Chọn">
                    <Select.Option value="Nam">Nam</Select.Option>
                    <Select.Option value="Nữ">Nữ</Select.Option>
                    <Select.Option value="Khác">Khác</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Ngày sinh" name="dob">
                  <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="dd/mm/yyyy" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="Kỳ thi" name="dotThi" rules={[{ required: true, message: 'Vui lòng chọn kỳ thi' }]}>
                  <Select placeholder="Chọn kỳ thi">
                    {sessions.map(s => (
                      <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="SBD" name="sbd">
                  <Input placeholder="Nhập SBD" disabled className="bg-slate-100" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="Ghi chú" name="note">
                  <Input.TextArea placeholder="Nhập" rows={2} />
                </Form.Item>
              </Col>
            </Row>
            {/* 
            <Col span={24}>
              <Form.Item
                label={<span className="font-semibold text-slate-800">Môn đăng ký *</span>}
                name="registeredSubjects"
                rules={[
                  { required: true, message: 'Vui lòng chọn ít nhất 1 môn thi' }
                ]}
              >
                <Select
                  mode="multiple"
                  placeholder="Chọn môn thi"
                  className="w-full"
                  options={subjectOptions}
                />
              </Form.Item>
            </Col> */}
          </Form>
        )}
      </Modal>

      <Modal
        title={<span className="text-slate-800 font-semibold">Xác nhận Xóa</span>}
        open={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          setCandidateToDelete(null);
        }}
        footer={[
          <Button key="close" className="border-blue-500 text-blue-600 rounded-lg font-medium px-8" onClick={() => {
            setDeleteModalVisible(false);
            setCandidateToDelete(null);
          }}>Đóng</Button>,
          <Button key="delete" danger type="primary" className="bg-[#e11d48] rounded-lg font-medium px-8 hover:bg-rose-700" onClick={handleDelete}>Xóa</Button>
        ]}
      >
        <p className="py-4 text-slate-700 text-base">
          {candidateToDelete
            ? `Bạn có chắc chắn muốn xóa bản ghi có tên thí sinh "${candidateToDelete.fullName}"?`
            : `Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} bản ghi thí sinh?`
          }
        </p>
      </Modal>

    </div >
  );
}
