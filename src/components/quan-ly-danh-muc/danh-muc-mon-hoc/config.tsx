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
  points_for_1_correct_idea_p1?: number;
  points_for_2_correct_idea_p1?: number;
  points_for_3_correct_idea_p1?: number;
  points_for_4_correct_idea_p1?: number;
  type_id_p2?: string;
  p2_from?: number;
  p2_to?: number;
  points_for_a_correct_answers_p2?: number;
  points_for_1_correct_idea_p2?: number;
  points_for_2_correct_idea_p2?: number;
  points_for_3_correct_idea_p2?: number;
  points_for_4_correct_idea_p2?: number;
  type_id_p3?: string;
  p3_from?: number;
  p3_to?: number;
  points_for_a_correct_answers_p3?: number;
  points_for_1_correct_idea_p3?: number;
  points_for_2_correct_idea_p3?: number;
  points_for_3_correct_idea_p3?: number;
  points_for_4_correct_idea_p3?: number;
};

type PartKey = 'p1' | 'p2' | 'p3';

type DsFlags = Record<PartKey, boolean>;

/** Mã loại câu hỏi được coi là "Đúng/Sai" — phần này sẽ tính điểm theo số ý đúng
 * thay vì điểm cố định cho mỗi câu trả lời đúng. */
const DS_QUESTION_TYPE_CODE = 'DS';

const SECTION_LABELS = {
  p1: 'Phần I',
  p2: 'Phần II',
  p3: 'Phần III',
};

/** Phím điều hướng/chỉnh sửa luôn được phép, không phải ký tự nhập số. */
const NUMERIC_CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Tab',
  'Home',
  'End',
  'Enter',
  'Escape',
]);

/** Chặn ngay tại thao tác gõ phím thay vì để nhập rồi làm tròn/cắt sau — không cho
 * gõ dấu phẩy, dấu âm, ký tự chữ,... Chỉ số thập phân (điểm theo ý) mới cho gõ dấu chấm. */
function handleNumericKeyDown(
  event: React.KeyboardEvent<HTMLInputElement>,
  allowDecimalPoint: boolean,
) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (NUMERIC_CONTROL_KEYS.has(event.key)) return;
  const isDigit = /^[0-9]$/.test(event.key);
  const isAllowedDecimalPoint = allowDecimalPoint && event.key === '.';
  if (!isDigit && !isAllowedDecimalPoint) {
    event.preventDefault();
  }
}

/** Chốt chặn cho trường hợp dán (paste) văn bản có ký tự không hợp lệ. */
function sanitizeNumericInput(
  value: string | undefined,
  allowDecimalPoint: boolean,
): string {
  const raw = value ?? '';
  return allowDecimalPoint ? raw.replace(/[^0-9.]/g, '') : raw.replace(/[^0-9]/g, '');
}

function NumberField({
  name,
  label,
  required,
  requiredMessage,
  min = 1,
  step,
  integerOnly = true,
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
  integerOnly?: boolean;
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

  const allowDecimalPoint = !integerOnly;

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
        onKeyDown={(event) => handleNumericKeyDown(event, allowDecimalPoint)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData('text');
          const cleaned = sanitizeNumericInput(pasted, allowDecimalPoint);
          if (cleaned !== pasted) {
            event.preventDefault();
          }
        }}
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

/** Hiển thị cách tính điểm của 1 phần: nếu loại câu hỏi đã chọn là 'DS' (Đúng/Sai)
 * thì tính theo số ý đúng, ngược lại tính điểm cố định cho mỗi câu trả lời đúng. */
function PartScoringFields({
  isDs,
  answerFieldName,
  ideaFieldNames,
}: {
  isDs: boolean;
  answerFieldName: keyof SubjectConfigFormValues;
  ideaFieldNames: [
    keyof SubjectConfigFormValues,
    keyof SubjectConfigFormValues,
    keyof SubjectConfigFormValues,
    keyof SubjectConfigFormValues,
  ];
}) {
  if (isDs) {
    return (
      <div className='mt-3 pt-3 border-t border-gray-100'>
        <p className='text-gray-500 text-xs font-medium mb-2'>
          Điểm theo số ý trả lời đúng trong 01 câu
        </p>
        <div className='grid grid-cols-4 gap-x-3 gap-y-3'>
          <NumberField
            name={ideaFieldNames[0]}
            label='01 ý đúng'
            min={0}
            step={0.25}
            integerOnly={false}
          />
          <NumberField
            name={ideaFieldNames[1]}
            label='02 ý đúng'
            min={0}
            step={0.25}
            integerOnly={false}
          />
          <NumberField
            name={ideaFieldNames[2]}
            label='03 ý đúng'
            min={0}
            step={0.25}
            integerOnly={false}
          />
          <NumberField
            name={ideaFieldNames[3]}
            label='04 ý đúng'
            min={0}
            step={0.25}
            integerOnly={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className='mt-3 pt-3 border-t border-gray-100'>
      <div className='grid grid-cols-4 gap-x-3 gap-y-3'>
        <div className='col-span-2'>
          <NumberField
            name={answerFieldName}
            label='Điểm của mỗi câu trả lời đúng'
            min={0}
            step={1}
          />
        </div>
      </div>
    </div>
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

  const getTypeCode = (typeId?: string): string | undefined =>
    questionTypes.find((item) => item.id === typeId)?.code;

  const isDsType = (typeId?: string): boolean =>
    (getTypeCode(typeId) ?? '').trim().toUpperCase() === DS_QUESTION_TYPE_CODE;

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

  const dsFlags: DsFlags = {
    p1: isDsType(watchedValues?.type_id_p1),
    p2: isDsType(watchedValues?.type_id_p2),
    p3: isDsType(watchedValues?.type_id_p3),
  };

  const maxTotalScore = useMemo(
    () => computeMaxTotalScore(watchedValues ?? {}, dsFlags),
    [watchedValues, dsFlags.p1, dsFlags.p2, dsFlags.p3],
  );
  const scaleValue = watchedValues?.scale;
  const isOverScale = scaleValue != null && maxTotalScore > scaleValue;

  const totalQuestionCount = useMemo(
    () => computeTotalQuestionCount(watchedValues ?? {}),
    [watchedValues],
  );
  const questionsNumberValue = watchedValues?.questions_number;
  const isQuestionCountMismatch =
    questionsNumberValue != null && totalQuestionCount !== questionsNumberValue;

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

      const submitDsFlags: DsFlags = {
        p1: isDsType(values.type_id_p1),
        p2: isDsType(values.type_id_p2),
        p3: isDsType(values.type_id_p3),
      };

      const totalScore = computeMaxTotalScore(values, submitDsFlags);
      if (values.scale != null && totalScore > values.scale) {
        messageApi.error(
          `Tổng điểm tối đa của cấu trúc đề (${formatScore(totalScore)}) đang vượt quá thang điểm (${values.scale}). Vui lòng điều chỉnh lại điểm hoặc số câu hỏi.`,
        );
        return;
      }

      const totalQuestions = computeTotalQuestionCount(values);
      if (values.questions_number != null && totalQuestions !== values.questions_number) {
        messageApi.error(
          `Tổng số câu của các phần (${totalQuestions}) không khớp với Số câu hỏi (${values.questions_number}). Vui lòng điều chỉnh lại "Đến câu" của từng phần hoặc Số câu hỏi.`,
        );
        return;
      }

      setSaving(true);

      const payload = {
        subject_id: record.id,
        content_p1: SECTION_LABELS.p1,
        content_p2: SECTION_LABELS.p2,
        content_p3: SECTION_LABELS.p3,
        ...normalizePayload(values, submitDsFlags),
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
                  <div className='flex items-center gap-2'>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                        isQuestionCountMismatch
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      Tổng số câu: {totalQuestionCount}
                      {questionsNumberValue != null ? ` / ${questionsNumberValue}` : ''}
                    </span>
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
                </div>
                {isQuestionCountMismatch && (
                  <p className='text-red-500 text-xs mb-3'>
                    Tổng số câu của các phần đang không khớp với Số câu hỏi.
                    Vui lòng điều chỉnh lại "Đến câu" của từng phần hoặc Số
                    câu hỏi trước khi lưu.
                  </p>
                )}
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
                    </div>
                    <PartScoringFields
                      isDs={dsFlags.p1}
                      answerFieldName='points_for_a_correct_answers_p1'
                      ideaFieldNames={[
                        'points_for_1_correct_idea_p1',
                        'points_for_2_correct_idea_p1',
                        'points_for_3_correct_idea_p1',
                        'points_for_4_correct_idea_p1',
                      ]}
                    />
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
                    <PartScoringFields
                      isDs={dsFlags.p2}
                      answerFieldName='points_for_a_correct_answers_p2'
                      ideaFieldNames={[
                        'points_for_1_correct_idea_p2',
                        'points_for_2_correct_idea_p2',
                        'points_for_3_correct_idea_p2',
                        'points_for_4_correct_idea_p2',
                      ]}
                    />
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
                    </div>
                    <PartScoringFields
                      isDs={dsFlags.p3}
                      answerFieldName='points_for_a_correct_answers_p3'
                      ideaFieldNames={[
                        'points_for_1_correct_idea_p3',
                        'points_for_2_correct_idea_p3',
                        'points_for_3_correct_idea_p3',
                        'points_for_4_correct_idea_p3',
                      ]}
                    />
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
    points_for_1_correct_idea_p1: toNumber(
      config.points_for_1_correct_idea_p1,
    ),
    points_for_2_correct_idea_p1: toNumber(
      config.points_for_2_correct_idea_p1,
    ),
    points_for_3_correct_idea_p1: toNumber(
      config.points_for_3_correct_idea_p1,
    ),
    points_for_4_correct_idea_p1: toNumber(
      config.points_for_4_correct_idea_p1,
    ),

    type_id_p2: config.type_id_p2 ?? undefined,
    p2_from: 1,
    p2_to: config.p2_to ?? undefined,
    points_for_a_correct_answers_p2: toNumber(
      config.points_for_a_correct_answers_p2,
    ),
    points_for_1_correct_idea_p2: toNumber(
      config.points_for_1_correct_idea_p2,
    ),
    points_for_2_correct_idea_p2: toNumber(
      config.points_for_2_correct_idea_p2,
    ),
    points_for_3_correct_idea_p2: toNumber(
      config.points_for_3_correct_idea_p2,
    ),
    points_for_4_correct_idea_p2: toNumber(
      config.points_for_4_correct_idea_p2,
    ),

    type_id_p3: config.type_id_p3 ?? undefined,
    p3_from: 1,
    p3_to: config.p3_to ?? undefined,
    points_for_a_correct_answers_p3: toNumber(
      config.points_for_a_correct_answers_p3,
    ),
    points_for_1_correct_idea_p3: toNumber(
      config.points_for_1_correct_idea_p3,
    ),
    points_for_2_correct_idea_p3: toNumber(
      config.points_for_2_correct_idea_p3,
    ),
    points_for_3_correct_idea_p3: toNumber(
      config.points_for_3_correct_idea_p3,
    ),
    points_for_4_correct_idea_p3: toNumber(
      config.points_for_4_correct_idea_p3,
    ),
  };
}

/** Với mỗi phần: chỉ lưu bộ điểm khớp với cách tính điểm đang hiển thị (theo câu
 * hay theo ý) — bộ còn lại được ghi null để không lưu dữ liệu không còn áp dụng. */
function normalizePayload(values: SubjectConfigFormValues, dsFlags: DsFlags) {
  return {
    time: values.time ?? null,
    number_to_create: values.number_to_create ?? null,
    questions_number: values.questions_number ?? null,
    scale: values.scale ?? null,

    type_id_p1: values.type_id_p1 ?? null,
    p1_from: values.p1_from ?? null,
    p1_to: values.p1_to ?? null,
    points_for_a_correct_answers_p1: dsFlags.p1
      ? null
      : (values.points_for_a_correct_answers_p1 ?? null),
    points_for_1_correct_idea_p1: dsFlags.p1
      ? (values.points_for_1_correct_idea_p1 ?? null)
      : null,
    points_for_2_correct_idea_p1: dsFlags.p1
      ? (values.points_for_2_correct_idea_p1 ?? null)
      : null,
    points_for_3_correct_idea_p1: dsFlags.p1
      ? (values.points_for_3_correct_idea_p1 ?? null)
      : null,
    points_for_4_correct_idea_p1: dsFlags.p1
      ? (values.points_for_4_correct_idea_p1 ?? null)
      : null,

    type_id_p2: values.type_id_p2 ?? null,
    p2_from: values.p2_from ?? null,
    p2_to: values.p2_to ?? null,
    points_for_a_correct_answers_p2: dsFlags.p2
      ? null
      : (values.points_for_a_correct_answers_p2 ?? null),
    points_for_1_correct_idea_p2: dsFlags.p2
      ? (values.points_for_1_correct_idea_p2 ?? null)
      : null,
    points_for_2_correct_idea_p2: dsFlags.p2
      ? (values.points_for_2_correct_idea_p2 ?? null)
      : null,
    points_for_3_correct_idea_p2: dsFlags.p2
      ? (values.points_for_3_correct_idea_p2 ?? null)
      : null,
    points_for_4_correct_idea_p2: dsFlags.p2
      ? (values.points_for_4_correct_idea_p2 ?? null)
      : null,

    type_id_p3: values.type_id_p3 ?? null,
    p3_from: values.p3_from ?? null,
    p3_to: values.p3_to ?? null,
    points_for_a_correct_answers_p3: dsFlags.p3
      ? null
      : (values.points_for_a_correct_answers_p3 ?? null),
    points_for_1_correct_idea_p3: dsFlags.p3
      ? (values.points_for_1_correct_idea_p3 ?? null)
      : null,
    points_for_2_correct_idea_p3: dsFlags.p3
      ? (values.points_for_2_correct_idea_p3 ?? null)
      : null,
    points_for_3_correct_idea_p3: dsFlags.p3
      ? (values.points_for_3_correct_idea_p3 ?? null)
      : null,
    points_for_4_correct_idea_p3: dsFlags.p3
      ? (values.points_for_4_correct_idea_p3 ?? null)
      : null,
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

function computeTotalQuestionCount(values: SubjectConfigFormValues): number {
  return (
    countQuestions(values.p1_from, values.p1_to) +
    countQuestions(values.p2_from, values.p2_to) +
    countQuestions(values.p3_from, values.p3_to)
  );
}

function partMaxScore(
  from: number | undefined,
  to: number | undefined,
  isDs: boolean,
  answerPoints: number | undefined,
  ideaPoints: [
    number | undefined,
    number | undefined,
    number | undefined,
    number | undefined,
  ],
): number {
  const count = countQuestions(from, to);
  if (isDs) {
    const perQuestionMax = Math.max(
      ideaPoints[0] ?? 0,
      ideaPoints[1] ?? 0,
      ideaPoints[2] ?? 0,
      ideaPoints[3] ?? 0,
    );
    return count * perQuestionMax;
  }
  return count * (answerPoints ?? 0);
}

function computeMaxTotalScore(
  values: SubjectConfigFormValues,
  dsFlags: DsFlags,
): number {
  const p1Max = partMaxScore(
    values.p1_from,
    values.p1_to,
    dsFlags.p1,
    values.points_for_a_correct_answers_p1,
    [
      values.points_for_1_correct_idea_p1,
      values.points_for_2_correct_idea_p1,
      values.points_for_3_correct_idea_p1,
      values.points_for_4_correct_idea_p1,
    ],
  );
  const p2Max = partMaxScore(
    values.p2_from,
    values.p2_to,
    dsFlags.p2,
    values.points_for_a_correct_answers_p2,
    [
      values.points_for_1_correct_idea_p2,
      values.points_for_2_correct_idea_p2,
      values.points_for_3_correct_idea_p2,
      values.points_for_4_correct_idea_p2,
    ],
  );
  const p3Max = partMaxScore(
    values.p3_from,
    values.p3_to,
    dsFlags.p3,
    values.points_for_a_correct_answers_p3,
    [
      values.points_for_1_correct_idea_p3,
      values.points_for_2_correct_idea_p3,
      values.points_for_3_correct_idea_p3,
      values.points_for_4_correct_idea_p3,
    ],
  );

  return Math.round((p1Max + p2Max + p3Max) * 100) / 100;
}

function formatScore(value: number): string {
  return Number(value.toFixed(2)).toString();
}
