import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  ConfigProvider,
  Divider,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  message,
} from 'antd';
import type { SubjectCategoryType } from './index';
import {
  questionTypeApi,
  subjectConfigApi,
  type QuestionTypeAPI,
  type SubjectConfigAPI,
} from '../../../services/danhMucApi.ts';

interface CauHinhMonHocModalProps {
  open: boolean;
  onClose: () => void;
  record?: SubjectCategoryType | null;
}

type SubjectConfigFormValues = {
  time?: number;
  number_to_create?: number;
  questions_number?: number;
  scale?: number;
  type_id_p1?: string;
  p1_from?: number;
  p1_to?: number;
  points_for_a_correct_answers_p1?: number;
  type_id_p2?: string;
  p2_from?: number;
  p2_to?: number;
  points_for_1_correct_idea?: number;
  points_for_2_correct_idea?: number;
  points_for_3_correct_idea?: number;
  points_for_4_correct_idea?: number;
  type_id_p3?: string;
  p3_from?: number;
  p3_to?: number;
  points_for_a_correct_answers_p3?: number;
};

const SECTION_LABELS = {
  p1: 'Phần I',
  p2: 'Phần II',
  p3: 'Phần III',
};

export default function CauHinhMonHocModal({
  open,
  onClose,
  record,
}: CauHinhMonHocModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeAPI[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  const typeOptions = useMemo(
    () =>
      questionTypes.map((item) => ({
        value: item.id,
        label: `${item.code} - ${item.name}`,
      })),
    [questionTypes],
  );

  useEffect(() => {
    if (!open || !record) return;

    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [typesRes, configRes] = await Promise.all([
          questionTypeApi.list(),
          subjectConfigApi.getBySubjectId(record.id).catch(() => null),
        ]);

        if (!mounted) return;

        setQuestionTypes(typesRes.data ?? []);

        let config = configRes?.data ?? null;
        if (!config) {
          const listRes = await subjectConfigApi.list();
          config =
            listRes.data?.find((item) => item.subject_id === record.id) ?? null;
        }

        setConfigId(config?.id ?? null);
        form.setFieldsValue(mapConfigToFormValues(config));
      } catch {
        if (mounted) {
          messageApi.error('Không thể tải dữ liệu cấu hình môn học.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, [open, record, form, messageApi]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setConfigId(null);
      setQuestionTypes([]);
    }
  }, [open, form]);

  const handleSubmit = async () => {
    if (!record) return;

    try {
      const values = (await form.validateFields()) as SubjectConfigFormValues;
      setSaving(true);

      const payload = {
        subject_id: record.id,
        content_p1: SECTION_LABELS.p1,
        content_p2: SECTION_LABELS.p2,
        content_p3: SECTION_LABELS.p3,
        ...normalizePayload(values),
      };

      if (configId) {
        await subjectConfigApi.update(configId, payload);
        messageApi.success('Cập nhật cấu hình môn học thành công!');
      } else {
        await subjectConfigApi.create(
          payload as Omit<SubjectConfigAPI, 'id' | 'created_at' | 'updated_at'>,
        );
        messageApi.success('Thêm cấu hình môn học thành công!');
      }

      form.resetFields();
      setConfigId(null);
      onClose();
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      messageApi.error(error?.message || 'Lỗi khi lưu cấu hình môn học!');
    } finally {
      setSaving(false);
    }
  };

  const handleOk = () => {
    void handleSubmit();
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <ConfigProvider
      theme={{ token: { colorPrimary: '#1d4ed8', borderRadius: 6 } }}
    >
      {contextHolder}
      <Modal
        title={
          <div className='flex items-center gap-2'>
            <span className='text-xl font-semibold text-[#1e3a8a]'>
              Cấu hình môn học
            </span>
          </div>
        }
        open={open}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={saving}
        width={900}
        footer={
          <Space>
            <Button
              onClick={handleCancel}
              className='border-blue-600 text-blue-600'
            >
              Đóng
            </Button>
            <Button
              type='primary'
              onClick={handleOk}
              loading={saving}
              className='bg-blue-600 hover:bg-blue-700 border-none'
            >
              Lưu
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Form form={form} layout='vertical'>
            <div className='mt-4'>
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-gray-800 mb-4'>
                  Thông tin môn học
                </h3>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-gray-600 text-sm font-medium mb-1.5'>
                      Tên môn học
                    </label>
                    <div className='h-10 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md flex items-center text-gray-700'>
                      {record?.name || 'Chưa có tên môn học'}
                    </div>
                  </div>
                  <Form.Item
                    name='time'
                    label={
                      <span className='text-gray-600 text-sm font-medium'>
                        Thời gian thi (phút)
                      </span>
                    }
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng nhập thời gian thi',
                      },
                    ]}
                  >
                    <InputNumber
                      placeholder='Nhập'
                      className='w-full h-10'
                      min={1}
                    />
                  </Form.Item>
                  <Form.Item
                    name='number_to_create'
                    label={
                      <span className='text-gray-600 text-sm font-medium'>
                        Số lượng đề
                      </span>
                    }
                    rules={[
                      { required: true, message: 'Vui lòng nhập số lượng đề' },
                    ]}
                  >
                    <InputNumber
                      placeholder='Nhập'
                      className='w-full h-10'
                      min={1}
                    />
                  </Form.Item>
                  <Form.Item
                    name='questions_number'
                    label={
                      <span className='text-gray-600 text-sm font-medium'>
                        Số câu hỏi
                      </span>
                    }
                    rules={[
                      { required: true, message: 'Vui lòng nhập số câu hỏi' },
                    ]}
                  >
                    <InputNumber
                      placeholder='Nhập'
                      className='w-full h-10'
                      min={1}
                    />
                  </Form.Item>
                  <Form.Item
                    name='scale'
                    label={
                      <span className='text-gray-600 text-sm font-medium'>
                        Thang điểm
                      </span>
                    }
                    className='col-span-2'
                    rules={[
                      { required: true, message: 'Vui lòng nhập thang điểm' },
                    ]}
                  >
                    <InputNumber
                      placeholder='Nhập'
                      className='w-full h-10'
                      min={1}
                    />
                  </Form.Item>
                </div>
              </div>

              <Divider />

              <div>
                <h3 className='text-lg font-semibold text-gray-800 mb-4'>
                  Cấu trúc môn học và cách tính điểm{' '}
                  <span className='text-red-500'>*</span>
                </h3>

                <div className='space-y-6'>
                  <div className='border border-gray-200 rounded-lg p-4'>
                    <h4 className='font-semibold text-gray-700 mb-3'>Phần I</h4>
                    <div className='grid grid-cols-2 gap-4'>
                      <Form.Item
                        name='type_id_p1'
                        label={
                          <span className='text-gray-600 text-sm font-medium'>
                            Loại câu hỏi
                          </span>
                        }
                      >
                        <Select
                          placeholder='Chọn loại câu hỏi'
                          className='w-full h-10'
                          options={typeOptions}
                          allowClear
                        />
                      </Form.Item>
                      <div className='grid grid-cols-2 gap-2'>
                        <Form.Item
                          name='p1_from'
                          label={
                            <span className='text-gray-600 text-sm font-medium'>
                              Từ câu
                            </span>
                          }
                        >
                          <InputNumber
                            placeholder='Nhập'
                            className='w-full h-10'
                            min={1}
                          />
                        </Form.Item>
                        <Form.Item
                          name='p1_to'
                          label={
                            <span className='text-gray-600 text-sm font-medium'>
                              Đến câu
                            </span>
                          }
                        >
                          <InputNumber
                            placeholder='Nhập'
                            className='w-full h-10'
                            min={1}
                          />
                        </Form.Item>
                      </div>
                    </div>
                    <Form.Item
                      name='points_for_a_correct_answers_p1'
                      label={
                        <span className='text-gray-600 text-sm font-medium'>
                          Điểm của mỗi câu trả lời đúng
                        </span>
                      }
                    >
                      <InputNumber
                        placeholder='Nhập'
                        className='w-32 h-10'
                        min={0}
                        step={0.25}
                      />
                    </Form.Item>
                  </div>

                  <div className='border border-gray-200 rounded-lg p-4'>
                    <h4 className='font-semibold text-gray-700 mb-3'>
                      Phần II
                    </h4>
                    <div className='grid grid-cols-2 gap-4'>
                      <Form.Item
                        name='type_id_p2'
                        label={
                          <span className='text-gray-600 text-sm font-medium'>
                            Loại câu hỏi
                          </span>
                        }
                      >
                        <Select
                          placeholder='Chọn loại câu hỏi'
                          className='w-full h-10'
                          options={typeOptions}
                          allowClear
                        />
                      </Form.Item>
                      <div className='grid grid-cols-2 gap-2'>
                        <Form.Item
                          name='p2_from'
                          label={
                            <span className='text-gray-600 text-sm font-medium'>
                              Từ câu
                            </span>
                          }
                        >
                          <InputNumber
                            placeholder='Nhập'
                            className='w-full h-10'
                            min={1}
                          />
                        </Form.Item>
                        <Form.Item
                          name='p2_to'
                          label={
                            <span className='text-gray-600 text-sm font-medium'>
                              Đến câu
                            </span>
                          }
                        >
                          <InputNumber
                            placeholder='Nhập'
                            className='w-full h-10'
                            min={1}
                          />
                        </Form.Item>
                      </div>
                    </div>

                    <div className='mt-4 space-y-3'>
                      <Form.Item
                        name='points_for_1_correct_idea'
                        label={
                          <span className='text-gray-700 text-sm'>
                            Lựa chọn 01 ý trả lời đúng trong 01 câu được
                          </span>
                        }
                      >
                        <InputNumber
                          placeholder='Nhập'
                          className='w-24 h-10'
                          min={0}
                          step={0.25}
                        />
                      </Form.Item>
                      <Form.Item
                        name='points_for_2_correct_idea'
                        label={
                          <span className='text-gray-700 text-sm'>
                            Lựa chọn 02 ý trả lời đúng trong 01 câu được
                          </span>
                        }
                      >
                        <InputNumber
                          placeholder='Nhập'
                          className='w-24 h-10'
                          min={0}
                          step={0.25}
                        />
                      </Form.Item>
                      <Form.Item
                        name='points_for_3_correct_idea'
                        label={
                          <span className='text-gray-700 text-sm'>
                            Lựa chọn 03 ý trả lời đúng trong 01 câu được
                          </span>
                        }
                      >
                        <InputNumber
                          placeholder='Nhập'
                          className='w-24 h-10'
                          min={0}
                          step={0.25}
                        />
                      </Form.Item>
                      <Form.Item
                        name='points_for_4_correct_idea'
                        label={
                          <span className='text-gray-700 text-sm'>
                            Lựa chọn 04 ý trả lời đúng trong 01 câu được
                          </span>
                        }
                      >
                        <InputNumber
                          placeholder='Nhập'
                          className='w-24 h-10'
                          min={0}
                          step={0.25}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  <div className='border border-gray-200 rounded-lg p-4'>
                    <h4 className='font-semibold text-gray-700 mb-3'>
                      Phần III
                    </h4>
                    <div className='grid grid-cols-2 gap-4'>
                      <Form.Item
                        name='type_id_p3'
                        label={
                          <span className='text-gray-600 text-sm font-medium'>
                            Loại câu hỏi
                          </span>
                        }
                      >
                        <Select
                          placeholder='Chọn loại câu hỏi'
                          className='w-full h-10'
                          options={typeOptions}
                          allowClear
                        />
                      </Form.Item>
                      <div className='grid grid-cols-2 gap-2'>
                        <Form.Item
                          name='p3_from'
                          label={
                            <span className='text-gray-600 text-sm font-medium'>
                              Từ câu
                            </span>
                          }
                        >
                          <InputNumber
                            placeholder='Nhập'
                            className='w-full h-10'
                            min={1}
                          />
                        </Form.Item>
                        <Form.Item
                          name='p3_to'
                          label={
                            <span className='text-gray-600 text-sm font-medium'>
                              Đến câu
                            </span>
                          }
                        >
                          <InputNumber
                            placeholder='Nhập'
                            className='w-full h-10'
                            min={1}
                          />
                        </Form.Item>
                      </div>
                    </div>
                    <Form.Item
                      name='points_for_a_correct_answers_p3'
                      label={
                        <span className='text-gray-600 text-sm font-medium'>
                          Điểm của mỗi câu trả lời đúng
                        </span>
                      }
                    >
                      <InputNumber
                        placeholder='Nhập'
                        className='w-32 h-10'
                        min={0}
                        step={0.25}
                      />
                    </Form.Item>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </Spin>
      </Modal>
    </ConfigProvider>
  );
}

function mapConfigToFormValues(
  config: SubjectConfigAPI | null,
): SubjectConfigFormValues {
  if (!config) {
    return {};
  }

  return {
    time: config.time ?? undefined,
    number_to_create: config.number_to_create ?? undefined,
    questions_number: config.questions_number ?? undefined,
    scale: config.scale ?? undefined,
    type_id_p1: config.type_id_p1 ?? undefined,
    p1_from: config.p1_from ?? undefined,
    p1_to: config.p1_to ?? undefined,
    points_for_a_correct_answers_p1: toNumber(
      config.points_for_a_correct_answers_p1,
    ),
    type_id_p2: config.type_id_p2 ?? undefined,
    p2_from: config.p2_from ?? undefined,
    p2_to: config.p2_to ?? undefined,
    points_for_1_correct_idea: toNumber(config.points_for_1_correct_idea),
    points_for_2_correct_idea: toNumber(config.points_for_2_correct_idea),
    points_for_3_correct_idea: toNumber(config.points_for_3_correct_idea),
    points_for_4_correct_idea: toNumber(config.points_for_4_correct_idea),
    type_id_p3: config.type_id_p3 ?? undefined,
    p3_from: config.p3_from ?? undefined,
    p3_to: config.p3_to ?? undefined,
    points_for_a_correct_answers_p3: toNumber(
      config.points_for_a_correct_answers_p3,
    ),
  };
}

function normalizePayload(values: SubjectConfigFormValues) {
  return {
    time: values.time ?? null,
    number_to_create: values.number_to_create ?? null,
    questions_number: values.questions_number ?? null,
    scale: values.scale ?? null,
    type_id_p1: values.type_id_p1 ?? null,
    p1_from: values.p1_from ?? null,
    p1_to: values.p1_to ?? null,
    points_for_a_correct_answers_p1:
      values.points_for_a_correct_answers_p1 ?? null,
    type_id_p2: values.type_id_p2 ?? null,
    p2_from: values.p2_from ?? null,
    p2_to: values.p2_to ?? null,
    points_for_1_correct_idea: values.points_for_1_correct_idea ?? null,
    points_for_2_correct_idea: values.points_for_2_correct_idea ?? null,
    points_for_3_correct_idea: values.points_for_3_correct_idea ?? null,
    points_for_4_correct_idea: values.points_for_4_correct_idea ?? null,
    type_id_p3: values.type_id_p3 ?? null,
    p3_from: values.p3_from ?? null,
    p3_to: values.p3_to ?? null,
    points_for_a_correct_answers_p3:
      values.points_for_a_correct_answers_p3 ?? null,
  };
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
