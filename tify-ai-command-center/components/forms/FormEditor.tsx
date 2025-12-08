import React, { useState, useEffect } from 'react';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Move,
  Type,
  Hash,
  Mail,
  Calendar,
  CheckSquare,
  AlignLeft,
  List,
  FileUp,
  Shield,
} from 'lucide-react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { api } from '../../services/api';
import { useI18n } from '../../i18n';
import RichTextEditor from './RichTextEditor';

interface FormField {
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
}

interface FormEditorProps {
  formId: string | 'new';
  onClose: () => void;
  onSave: () => void;
}

const FormEditor: React.FC<FormEditorProps> = ({ formId, onClose, onSave }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    headerContent: '',
    footerContent: '',
    successMessage: t('forms.defaultSuccessMessage'),
    isActive: true,
    isWizard: false,
    expiresAt: null as string | null,
    fields: [] as FormField[],
  });

  const FIELD_TYPES = [
    { type: 'text', label: t('forms.field.text'), icon: Type },
    { type: 'textarea', label: t('forms.field.textarea'), icon: AlignLeft },
    { type: 'number', label: t('forms.field.number'), icon: Hash },
    { type: 'email', label: t('forms.field.email'), icon: Mail },
    { type: 'date', label: t('forms.field.date'), icon: Calendar },
    { type: 'checkbox', label: t('forms.field.checkbox'), icon: CheckSquare },
    { type: 'select', label: t('forms.field.select'), icon: List },
    { type: 'file', label: t('forms.field.file'), icon: FileUp },
    { type: 'habeasData', label: t('forms.field.habeasData'), icon: Shield },
  ];

  useEffect(() => {
    if (formId !== 'new') {
      loadForm(formId);
    }
  }, [formId]);

  const loadForm = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getForm(id);
      setFormData({
        title: data.title,
        description: data.description || '',
        headerContent: data.headerContent || '',
        footerContent: data.footerContent || '',
        successMessage: data.successMessage || '',
        isActive: data.isActive,
        isWizard: data.isWizard || false,
        expiresAt: data.expiresAt || null,
        fields: data.fields || [],
      });
    } catch (err) {
      console.error(err);
      alert(t('forms.error.load'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title) return alert(t('forms.error.titleRequired'));
    setLoading(true);
    try {
      if (formId === 'new') {
        await api.createForm(formData);
      } else {
        await api.updateForm(formId, formData);
      }
      onSave();
    } catch (err) {
      console.error(err);
      alert(t('forms.error.save'));
    } finally {
      setLoading(false);
    }
  };

  const addField = (type: string) => {
    let initialOptions: any = undefined;
    let initialLabel = t('forms.field.newLabel').replace('{type}', type);
    let initialRequired = false;

    if (type === 'select') {
      initialOptions = [t('forms.field.defaultOption1'), t('forms.field.defaultOption2')];
    } else if (type === 'file') {
      initialOptions = {
        allowedTypes: ['pdf', 'image', 'video', 'document'],
        maxSize: 10
      };
      initialLabel = t('forms.field.file');
    } else if (type === 'habeasData') {
      initialOptions = {
        message: t('forms.field.habeasDataDefault').replace('[NOMBRE_ENTIDAD]', formData.title || 'la entidad')
      };
      initialLabel = t('forms.field.habeasData');
      initialRequired = true;
    }

    setFormData({
      ...formData,
      fields: [
        ...formData.fields,
        {
          type,
          label: initialLabel,
          required: initialRequired,
          placeholder: '',
          options: initialOptions,
        },
      ],
    });
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...formData.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFormData({ ...formData, fields: newFields });
  };

  const removeField = (index: number) => {
    const newFields = [...formData.fields];
    newFields.splice(index, 1);
    setFormData({ ...formData, fields: newFields });
  };

  if (loading && formId !== 'new') return <div>{t('forms.loading')}</div>;

  return (
    <div className="bg-white h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {formId === 'new' ? t('forms.editor.createTitle') : t('forms.editor.editTitle')}
          </h2>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save size={18} />
          {t('forms.editor.save')}
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 flex">
        {/* Sidebar - Tools */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            {t('forms.editor.addFields')}
          </h3>
          <div className="space-y-2">
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft.type}
                onClick={() => addField(ft.type)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all"
              >
                <ft.icon size={18} />
                <span className="text-sm font-medium">{ft.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* General Settings Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('forms.editor.generalSettings')}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('forms.editor.titleLabel')}
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={t('forms.editor.titlePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('forms.editor.descriptionLabel')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={t('forms.editor.descriptionPlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Header/Footer/Success */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('forms.editor.appearance')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <RichTextEditor
                    label={t('forms.editor.headerContent')}
                    value={formData.headerContent}
                    onChange={(val) => setFormData({ ...formData, headerContent: val })}
                    placeholder={t('forms.editor.htmlPlaceholder.header')}
                  />
                </div>
                <div className="md:col-span-2">
                  <RichTextEditor
                    label={t('forms.editor.footerContent')}
                    value={formData.footerContent}
                    onChange={(val) => setFormData({ ...formData, footerContent: val })}
                    placeholder={t('forms.editor.htmlPlaceholder.footer')}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('forms.editor.successMessage')}
                  </label>
                  <textarea
                    value={formData.successMessage}
                    onChange={(e) => setFormData({ ...formData, successMessage: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label={t('forms.editor.expiresAt')}
                      value={formData.expiresAt ? dayjs(formData.expiresAt) : null}
                      onChange={(newValue) =>
                        setFormData({
                          ...formData,
                          expiresAt: newValue ? newValue.toISOString() : null,
                        })
                      }
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </div>
                <div className="flex flex-col gap-3 justify-center">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                      {t('forms.editor.isActive')}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isWizard"
                      checked={formData.isWizard}
                      onChange={(e) => setFormData({ ...formData, isWizard: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="isWizard" className="text-sm font-medium text-gray-700">
                      {t('forms.editor.isWizard')}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Fields Editor */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">{t('forms.editor.fields')}</h3>
              {formData.fields.length === 0 && (
                <div className="text-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-500">
                  {t('forms.editor.noFields')}
                </div>
              )}

              {formData.fields.map((field, idx) => (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group"
                >
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => removeField(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title={t('forms.action.delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        {t('forms.editor.fieldLabel')}
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        {t('forms.editor.fieldPlaceholder')}
                      </label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={['date', 'checkbox', 'select', 'file', 'habeasData'].includes(field.type)}
                      />
                    </div>

                    {field.type === 'select' && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          {t('forms.editor.fieldOptions')}
                        </label>
                        <input
                          type="text"
                          value={Array.isArray(field.options) ? field.options.join(', ') : ''}
                          onChange={(e) =>
                            updateField(idx, {
                              options: e.target.value.split(',').map((s: string) => s.trim()),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    )}

                    {field.type === 'file' && (
                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {t('forms.field.fileTypes')}
                        </label>
                        <div className="flex flex-wrap gap-4">
                          {['pdf', 'image', 'video', 'document'].map((type) => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.options?.allowedTypes?.includes(type)}
                                onChange={(e) => {
                                  const current = field.options?.allowedTypes || [];
                                  const newTypes = e.target.checked
                                    ? [...current, type]
                                    : current.filter((t: string) => t !== type);
                                  updateField(idx, {
                                    options: { ...field.options, allowedTypes: newTypes },
                                  });
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm capitalize">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {field.type === 'habeasData' && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          {t('forms.field.habeasDataText')}
                        </label>
                        <textarea
                          value={field.options?.message || ''}
                          onChange={(e) =>
                            updateField(idx, {
                              options: { ...field.options, message: e.target.value },
                            })
                          }
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id={`req-${idx}`}
                        checked={field.required}
                        onChange={(e) => updateField(idx, { required: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                        disabled={field.type === 'habeasData'}
                      />
                      <label htmlFor={`req-${idx}`} className="text-sm text-gray-700">
                        {t('forms.editor.fieldRequired')}
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormEditor;
