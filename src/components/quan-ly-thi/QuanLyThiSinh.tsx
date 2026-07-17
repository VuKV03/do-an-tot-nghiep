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
  App,
  Tabs
} from 'antd';
import {
  QuestionCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { quanLyThiAdminApi } from '../../services/quanLyThiApi';
import { subjectCategoryApi } from '../../services/danhMucApi';

const { Title, Text } = Typography;

interface Candidate {
  id: string;
  stt: number;
  fullName: string;
  gender: string;
  dob: string;
  sbd: string;
  subject1: string;
  subject2: string;
  subject3: string;
  cccd: string;
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
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [candidateToReset, setCandidateToReset] = useState<Candidate | null>(null);
  const [selectedSubjectToReset, setSelectedSubjectToReset] = useState<string>('');

  const [data, setData] = useState<Candidate[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<{ label: string, value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  const [candidateHistory, setCandidateHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async (candidateId: string) => {
    setLoadingHistory(true);
    try {
      const res = await quanLyThiAdminApi.getCandidateHistory(candidateId);
      if (res && res.history) {
        setCandidateHistory(res.history);
      } else {
        setCandidateHistory([]);
      }
    } catch (err) {
      console.error(err);
      message.error("Lỗi lấy lịch sử thi");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Search filter states
  const [searchText, setSearchText] = useState('');

  const filteredData = useMemo(() => {
    return data.filter(c => {
      // Filter by name, SBD, or CCCD
      const kwText = searchText.trim().toLowerCase();
      const textMatch = kwText === '' ||
        c.fullName.toLowerCase().includes(kwText) ||
        c.sbd.toLowerCase().includes(kwText) ||
        c.cccd.toLowerCase().includes(kwText);

      return textMatch;
    });
  }, [data, searchText]);

  React.useEffect(() => {
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



  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const candidatesData: any = await quanLyThiAdminApi.getAllCandidates();
      const candidatesList = candidatesData.data || candidatesData;

      const formatted = (Array.isArray(candidatesList) ? candidatesList : []).map((c: any, index: number) => {
        const subjects = c.subjects || [];
        return {
          id: c.id,
          stt: index + 1,
          fullName: c.full_name,
          gender: c.gender || '',
          dob: c.dob || '',
          sbd: c.username,
          subject1: subjects[0] || '',
          subject2: subjects[1] || '',
          subject3: subjects[2] || '',
          cccd: c.cccd || '',
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
          fetchHistory(record.id);
          setIsModalVisible(true);
        }}>{text}</a>
      )
    },
    { title: 'Giới tính', dataIndex: 'gender', key: 'gender', width: 90 },
    { title: 'Ngày sinh', dataIndex: 'dob', key: 'dob', width: 110 },
    { title: 'SBD', dataIndex: 'sbd', key: 'sbd', width: 100 },
    { title: 'CCCD', dataIndex: 'cccd', key: 'cccd', width: 100 },
    {
      title: 'Môn thi',
      dataIndex: 'registeredSubjects',
      key: 'registeredSubjects',
      render: (subjects: string[]) => subjects && subjects.length > 0 ? subjects.join(', ') : <span className="text-gray-400 italic">Chưa đăng ký</span>
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Thi lại">
            <Button
              type="text"
              icon={<ReloadOutlined className="text-green-600" />}
              className="bg-green-50 border border-green-100 hover:bg-green-100 p-0 w-8 h-8 flex items-center justify-center rounded"
              onClick={() => {
                setCandidateToReset(record);
                setResetModalVisible(true);
              }}
            />
          </Tooltip>
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
          cccd: values.cccd,
          gender: values.gender,
          dob: dobStr,
          note: values.note,
          subjects: values.registeredSubjects || []
        }];
        await quanLyThiAdminApi.addCandidates(payload);
        message.success('Thêm mới thí sinh thành công!');
      } else if (modalMode === 'edit' && editingCandidate) {
        const calculatedSBD = values.sbd || generateSBD(values.fullName, dobStr) || editingCandidate.sbd;
        const payload = {
          full_name: values.fullName,
          username: calculatedSBD,
          password: dobStr ? dobStr.replace(/\//g, '') : undefined, // Cập nhật lại mật khẩu nếu ngày sinh thay đổi
          cccd: values.cccd,
          gender: values.gender,
          dob: dobStr,
          note: values.note,
          subjects: values.registeredSubjects || []
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

  const handleReset = async () => {
    if (!candidateToReset || !selectedSubjectToReset) return;
    try {
      await quanLyThiAdminApi.resetCandidateExamResult(candidateToReset.id, selectedSubjectToReset);
      message.success(`Đã đặt lại kết quả môn ${selectedSubjectToReset} cho thí sinh ${candidateToReset.fullName}!`);
      setResetModalVisible(false);
      setCandidateToReset(null);
      setSelectedSubjectToReset('');
      fetchCandidates();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi đặt lại kết quả thi');
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
          <Col span={24} className="text-center mt-6">
            <Space>
              <Button type="primary" className="bg-[#1d4ed8] px-8 rounded-lg shadow-sm font-medium hover:bg-blue-700">
                Tìm kiếm
              </Button>
              <Button
                className="px-6 rounded-lg font-medium"
                onClick={() => {
                  setSearchText('');
                }}
              >
                Đặt lại
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
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
          <Tabs defaultActiveKey="1">
            <Tabs.TabPane tab="Thông tin cá nhân" key="1">
              <div className="py-4 space-y-4">
                <Row gutter={[24, 16]}>
                  <Col span={12}><Text type="secondary">Họ và tên</Text><div className="font-medium mt-1">{editingCandidate.fullName}</div></Col>
                  <Col span={12}><Text type="secondary">Số CCCD</Text><div className="font-medium mt-1">{editingCandidate.cccd}</div></Col>
                  <Col span={12}><Text type="secondary">Giới tính</Text><div className="font-medium mt-1">{editingCandidate.gender}</div></Col>
                  <Col span={12}><Text type="secondary">Ngày sinh</Text><div className="font-medium mt-1">{editingCandidate.dob}</div></Col>
                  {/* <Col span={24}><Text type="secondary">Kỳ thi</Text><div className="font-medium mt-1">{sessions.find(s => s.id === editingCandidate.dotThi)?.name || editingCandidate.dotThi}</div></Col> */}
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
            </Tabs.TabPane>
            <Tabs.TabPane tab="Lịch sử thi" key="2">
              <Table
                dataSource={candidateHistory}
                loading={loadingHistory}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: 'Tên môn', dataIndex: 'subject', key: 'subject' },
                  { title: 'Tên Gói đề', dataIndex: 'package_name', key: 'package_name' },
                  { title: 'Mã đề', dataIndex: 'exam_code', key: 'exam_code' },
                  {
                    title: 'Thời gian nộp',
                    dataIndex: 'submitted_at',
                    key: 'submitted_at',
                    render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : ''
                  },
                  {
                    title: 'Điểm số',
                    dataIndex: 'score',
                    key: 'score',
                    render: (val) => val !== null ? <span className="font-semibold text-green-600">{val}</span> : '-'
                  },
                ]}
              />
            </Tabs.TabPane>
          </Tabs>
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
                <Form.Item
                  label="Số CCCD/ Hộ chiếu"
                  name="cccd"
                  getValueFromEvent={(e) => e.target.value.replace(/[^0-9]/g, '')}
                  rules={[
                    { pattern: /^[0-9]*$/, message: 'Chỉ được nhập số' }
                  ]}
                >
                  <Input placeholder="Nhập số CCCD" maxLength={12} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Giới tính"
                  name="gender"
                  rules={[{ required: true, message: 'Vui lòng chọn giới tính' }]}
                >
                  <Select placeholder="Chọn">
                    <Select.Option value="Nam">Nam</Select.Option>
                    <Select.Option value="Nữ">Nữ</Select.Option>
                    <Select.Option value="Khác">Khác</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Ngày sinh"
                  name="dob"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày sinh' }]}
                >
                  <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="dd/mm/yyyy" />
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
            </Col>
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

      <Modal
        title={<span className="text-slate-800 font-semibold">Xác nhận Thi lại</span>}
        open={resetModalVisible}
        onCancel={() => {
          setResetModalVisible(false);
          setCandidateToReset(null);
          setSelectedSubjectToReset('');
        }}
        footer={[
          <Button key="close" className="border-blue-500 text-blue-600 rounded-lg font-medium px-8" onClick={() => {
            setResetModalVisible(false);
            setCandidateToReset(null);
            setSelectedSubjectToReset('');
          }}>Đóng</Button>,
          <Button key="reset" type="primary" className="bg-green-600 rounded-lg font-medium px-8 hover:bg-green-700" onClick={handleReset} disabled={!selectedSubjectToReset}>Khôi phục</Button>
        ]}
      >
        <p className="py-4 text-slate-700 text-base">
          Bạn muốn cho thí sinh <b>{candidateToReset?.fullName}</b> thi lại môn nào?
          <br /><span className="text-sm text-red-500 italic">(Thao tác này sẽ xóa kết quả thi trước đó của môn học được chọn)</span>
        </p>
        <Select
          className="w-full"
          placeholder="Chọn môn học để thi lại"
          value={selectedSubjectToReset || undefined}
          onChange={(val) => setSelectedSubjectToReset(val)}
          options={candidateToReset?.registeredSubjects?.map(subj => ({ label: subj, value: subj })) || []}
        />
      </Modal>

    </div >
  );
}
