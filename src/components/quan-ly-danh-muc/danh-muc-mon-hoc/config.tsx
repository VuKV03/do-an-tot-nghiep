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
import type { Rule } from 'antd/es/form';
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

function NumberField({
  name,
  label,
  required,
  requiredMessage,
  min = 1,
  step,
  extraRules,
  dependencies,
  disabled,
  initialValue,
}: {
  name: keyof SubjectConfigFormValues;
  label: string;
  required?: boolean;
  requiredMessage?: string;
  min?: number;
  step?: number;
  extraRules?: Rule[];
  dependencies?: (keyof SubjectConfigFormValues)[];
  disabled?: boolean;
  initialValue?: number;
}) {
  const rules: Rule[] = [];
  if (required) {
    rules.push({ required: true, message: requiredMessage });
  }
  if (extraRules) {
    rules.push(...extraRules);
  }

  return (
    <Form.Item
      name={name}
      label={
        <span className='text-gray-600 text-sm font-medium'>{label}</span>
      }
      className='!mb-0'
      rules={rules}
      dependencies={dependencies}
      initialValue={initialValue}
    >
      <InputNumber
        placeholder='Nhập'
        className='w-full h-9'
        min={min}
        step={step}
        disabled={disabled}
      />
    </Form.Item>
  );
}

function TypeSelectField({
  name,
  label,
  options,
}: {
  name: keyof SubjectConfigFormValues;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Form.Item
      name={name}
      label={
        <span className='text-gray-600 text-sm font-medium'>{label}</span>
      }
      className='!mb-0'
    >
      <Select
        placeholder='Chọn loại câu hỏi'
        className='w-full h-9'
        options={options}
        allowClear
      />
    </Form.Item>
  );
}

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

  const makeToRule = (fromName: keyof SubjectConfigFormValues): Rule => ({
    validator: (_, toValue) => {
      const fromValue = form.getFieldValue(fromName);
      if (toValue == null || fromValue == null || toValue >= fromValue) {
        return Promise.resolve();
      }
      return Promise.reject(
        new Error('Đến câu phải lớn hơn hoặc bằng Từ câu'),
      );
    },
  });

  const watchedValues = Form.useWatch([], form) as
    | SubjectConfigFormValues
    | undefined;
  const maxTotalScore = useMemo(
    () => computeMaxTotalScore(watchedValues ?? {}),
    [watchedValues],
  );
  const scaleValue = watchedValues?.scale;
  const isOverScale = scaleValue != null && maxTotalScore > scaleValue;

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

      const totalScore = computeMaxTotalScore(values);
      if (values.scale != null && totalScore > values.scale) {
        messageApi.error(
          `Tổng điểm tối đa của cấu trúc đề (${formatScore(totalScore)}) đang vượt quá thang điểm (${values.scale}). Vui lòng điều chỉnh lại điểm hoặc số câu hỏi.`,
        );
        return;
      }

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
        width={840}
        styles={{
          body: {
            maxHeight: 'calc(100vh - 260px)',
            overflowY: 'auto',
            paddingRight: 4,
          },
        }}
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
            <div>
              <section className='mb-4'>
                <h3 className='text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide'>
                  Thông tin môn học
                </h3>
                <div className='grid grid-cols-4 gap-x-3 gap-y-3'>
                  <div className='col-span-4'>
                    <label className='block text-gray-600 text-sm font-medium mb-1'>
                      Tên môn học
                    </label>
                    <div className='h-9 px-3 bg-gray-100 border border-gray-300 rounded-md flex items-center text-gray-700 text-sm'>
                      {record?.name || 'Chưa có tên môn học'}
                    </div>
                  </div>
                  <NumberField
                    name='time'
                    label='Thời gian thi (phút)'
                    required
                    requiredMessage='Vui lòng nhập thời gian thi'
                  />
                  <NumberField
                    name='number_to_create'
                    label='Số lượng đề'
                    required
                    requiredMessage='Vui lòng nhập số lượng đề'
                  />
                  <NumberField
                    name='questions_number'
                    label='Số câu hỏi'
                    required
                    requiredMessage='Vui lòng nhập số câu hỏi'
                  />
                  <NumberField
                    name='scale'
                    label='Thang điểm'
                    required
                    requiredMessage='Vui lòng nhập thang điểm'
                  />
                </div>
              </section>

              <Divider className='!my-3' />

              <section>
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='text-sm font-semibold text-gray-800 uppercase tracking-wide'>
                    Cấu trúc môn học và cách tính điểm{' '}
                    <span className='text-red-500'>*</span>
                  </h3>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                      isOverScale
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Tổng điểm tối đa: {formatScore(maxTotalScore)}
                    {scaleValue != null ? ` / ${scaleValue}` : ''}
                  </span>
                </div>
                {isOverScale && (
                  <p className='text-red-500 text-xs mb-3'>
                    Tổng điểm tối đa đang vượt quá thang điểm. Vui lòng điều
                    chỉnh lại điểm hoặc số câu hỏi trước khi lưu.
                  </p>
                )}

                <div className='space-y-3'>
                  <div className='border border-gray-200 rounded-lg p-3'>
                    <h4 className='font-semibold text-gray-700 mb-3 text-sm'>
                      Phần I
                    </h4>
                    <div className='grid grid-cols-4 gap-x-3 gap-y-3'>
                      <div className='col-span-2'>
                        <TypeSelectField
                          name='type_id_p1'
                          label='Loại câu hỏi'
                          options={typeOptions}
                        />
                      </div>
                      <NumberField
                        name='p1_from'
                        label='Từ câu'
                        disabled
                        initialValue={1}
                      />
                      <NumberField
                        name='p1_to'
                        label='Đến câu'
                        dependencies={['p1_from']}
                        extraRules={[makeToRule('p1_from')]}
                      />
                      <div className='col-span-2'>
                        <NumberField
                          name='points_for_a_correct_answers_p1'
                          label='Điểm của mỗi câu trả lời đúng'
                          min={0}
                          step={0.25}
                        />
                      </div>
                    </div>
                  </div>

                  <div className='border border-gray-200 rounded-lg p-3'>
                    <h4 className='font-semibold text-gray-700 mb-3 text-sm'>
                      Phần II
                    </h4>
                    <div className='grid grid-cols-4 gap-x-3 gap-y-3'>
                      <div className='col-span-2'>
                        <TypeSelectField
                          name='type_id_p2'
                          label='Loại câu hỏi'
                          options={typeOptions}
                        />
                      </div>
                      <NumberField
                        name='p2_from'
                        label='Từ câu'
                        disabled
                        initialValue={1}
                      />
                      <NumberField
                        name='p2_to'
                        label='Đến câu'
                        dependencies={['p2_from']}
                        extraRules={[makeToRule('p2_from')]}
                      />
                    </div>

                    <div className='mt-3 pt-3 border-t border-gray-100'>
                      <p className='text-gray-500 text-xs font-medium mb-2'>
                        Điểm theo số ý trả lời đúng trong 01 câu
                      </p>
                      <div className='grid grid-cols-4 gap-x-3 gap-y-3'>
                        <NumberField
                          name='points_for_1_correct_idea'
                          label='01 ý đúng'
                          min={0}
                          step={0.25}
                        />
                        <NumberField
                          name='points_for_2_correct_idea'
                          label='02 ý đúng'
                          min={0}
                          step={0.25}
                        />
                        <NumberField
                          name='points_for_3_correct_idea'
                          label='03 ý đúng'
                          min={0}
                          step={0.25}
                        />
                        <NumberField
                          name='points_for_4_correct_idea'
                          label='04 ý đúng'
                          min={0}
                          step={0.25}
                        />
                      </div>
                    </div>
                  </div>

                  <div className='border border-gray-200 rounded-lg p-3'>
                    <h4 className='font-semibold text-gray-700 mb-3 text-sm'>
                      Phần III
                    </h4>
                    <div className='grid grid-cols-4 gap-x-3 gap-y-3'>
                      <div className='col-span-2'>
                        <TypeSelectField
                          name='type_id_p3'
                          label='Loại câu hỏi'
                          options={typeOptions}
                        />
                      </div>
                      <NumberField
                        name='p3_from'
                        label='Từ câu'
                        disabled
                        initialValue={1}
                      />
                      <NumberField
                        name='p3_to'
                        label='Đến câu'
                        dependencies={['p3_from']}
                        extraRules={[makeToRule('p3_from')]}
                      />
                      <div className='col-span-2'>
                        <NumberField
                          name='points_for_a_correct_answers_p3'
                          label='Điểm của mỗi câu trả lời đúng'
                          min={0}
                          step={0.25}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
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
    p1_from: 1,
    p1_to: config.p1_to ?? undefined,
    points_for_a_correct_answers_p1: toNumber(
      config.points_for_a_correct_answers_p1,
    ),
    type_id_p2: config.type_id_p2 ?? undefined,
    p2_from: 1,
    p2_to: config.p2_to ?? undefined,
    points_for_1_correct_idea: toNumber(config.points_for_1_correct_idea),
    points_for_2_correct_idea: toNumber(config.points_for_2_correct_idea),
    points_for_3_correct_idea: toNumber(config.points_for_3_correct_idea),
    points_for_4_correct_idea: toNumber(config.points_for_4_correct_idea),
    type_id_p3: config.type_id_p3 ?? undefined,
    p3_from: 1,
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

function countQuestions(from?: number, to?: number): number {
  if (from == null || to == null || to < from) {
    return 0;
  }
  return to - from + 1;
}

function computeMaxTotalScore(values: SubjectConfigFormValues): number {
  const p1Max =
    countQuestions(values.p1_from, values.p1_to) *
    (values.points_for_a_correct_answers_p1 ?? 0);

  const p2PerQuestionMax = Math.max(
    values.points_for_1_correct_idea ?? 0,
    values.points_for_2_correct_idea ?? 0,
    values.points_for_3_correct_idea ?? 0,
    values.points_for_4_correct_idea ?? 0,
  );
  const p2Max = countQuestions(values.p2_from, values.p2_to) * p2PerQuestionMax;

  const p3Max =
    countQuestions(values.p3_from, values.p3_to) *
    (values.points_for_a_correct_answers_p3 ?? 0);

  return Math.round((p1Max + p2Max + p3Max) * 100) / 100;
}

function formatScore(value: number): string {
  return Number(value.toFixed(2)).toString();
}
