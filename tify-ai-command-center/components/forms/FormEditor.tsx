import React, { useState, useEffect } from 'react';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Type,
  Hash,
  Mail,
  Calendar,
  CheckSquare,
  AlignLeft,
  List,
  FileUp,
  Shield,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Play,
  PauseCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import { api } from '../../services/api';
import { useI18n } from '../../i18n';
import RichTextEditor from './RichTextEditor';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
  isHidden?: boolean;
}

interface FormEditorProps {
  formId: string | 'new';
  onClose: () => void;
  onSave: () => void;
}

const FormEditor: React.FC<FormEditorProps> = ({ formId, onClose, onSave }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [showAdvancedAppearance, setShowAdvancedAppearance] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    headerContent: '',
    footerContent: '',
    successMessage: t('forms.defaultSuccessMessage'),
    isActive: true,
    isPublished: false,
    wasPublished: false,
    isWizard: false,
    collectUserInfo: false,
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

  const getDefaultHeader = (title: string) => 
    `<div style="text-align: center; padding: 20px 0;"><h1 class="text-3xl font-bold text-indigo-600">${title}</h1></div>`;

  const getDefaultFooter = () => 
    `<div style="text-align: center; padding: 20px; color: #6b7280; font-size: 0.875rem;"><p>&copy; ${new Date().getFullYear()} Tify. All rights reserved.</p></div>`;

  useEffect(() => {
    if (formId === 'new') {
      const key = `tify_form_draft_${formId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setDraftToRestore(parsed);
          setRestoreModalOpen(true);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      loadForm(formId);
    }
  }, [formId]);

  useEffect(() => {
    if (loading || isSaving) return;
    const key = `tify_form_draft_${formId}`;
    const handler = setTimeout(() => {
      if (formData.title || formData.fields.length > 0) {
        localStorage.setItem(key, JSON.stringify(formData));
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [formData, formId, loading, isSaving]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formData.title || formData.fields.length > 0) {
        localStorage.setItem(`tify_form_draft_${formId}`, JSON.stringify(formData));
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, formId]);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const loadForm = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getForm(id);
      
      // Check if custom appearance is used
      const defHeader = getDefaultHeader(data.title);
      const defFooter = getDefaultFooter();
      const defSuccess = t('forms.defaultSuccessMessage');
      
      const hasCustomAppearance = 
        (data.headerContent && data.headerContent !== defHeader) ||
        (data.footerContent && data.footerContent !== defFooter) ||
        (data.successMessage && data.successMessage !== defSuccess);

      setShowAdvancedAppearance(!!hasCustomAppearance);

      setFormData({
        title: data.title,
        description: data.description || '',
        headerContent: data.headerContent || '',
        footerContent: data.footerContent || '',
        successMessage: data.successMessage || '',
        isActive: data.isActive,
        isPublished: data.isPublished || false,
        wasPublished: data.wasPublished || data.isPublished || false,
        isWizard: data.isWizard || false,
        collectUserInfo: data.collectUserInfo || false,
        expiresAt: data.expiresAt || null,
        fields: (data.fields || []).map((f: any) => ({ ...f, id: f.id || generateId() })),
      });

      // Check for draft
      const key = `tify_form_draft_${id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setDraftToRestore(parsed);
          setRestoreModalOpen(true);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error(err);
      alert(t('forms.error.load'));
    } finally {
      setLoading(false);
    }
  };

  const executeStatusChange = async (newStatus: { isActive?: boolean; isPublished?: boolean }) => {
    if (!formData.title) return alert(t('forms.error.titleRequired'));
    setIsUpdatingStatus(true);
    
    try {
      if (formId === 'new') {
        // For new forms, we MUST save everything to create it
        let dataToSave = { ...formData, ...newStatus };
        if (newStatus.isPublished && !formData.wasPublished) {
          dataToSave.wasPublished = true;
        }
        
        // Apply defaults if needed
        if (!showAdvancedAppearance) {
          dataToSave.headerContent = getDefaultHeader(formData.title);
          dataToSave.footerContent = getDefaultFooter();
          dataToSave.successMessage = t('forms.defaultSuccessMessage');
        }

        await api.createForm(dataToSave);
        localStorage.removeItem(`tify_form_draft_${formId}`);
        onSave(); // We must close/refresh for new forms as we need the ID
      } else {
        // For existing forms, ONLY update the status fields
        const payload: any = { ...newStatus };
        
        // Handle wasPublished logic
        if (newStatus.isPublished && !formData.wasPublished) {
          payload.wasPublished = true;
        }

        await api.updateForm(formId, payload);
        
        // Update local state to reflect status change
        setFormData(prev => ({ 
          ...prev, 
          ...newStatus, 
          wasPublished: payload.wasPublished || prev.wasPublished 
        }));
      }
    } catch (err) {
      console.error(err);
      alert(t('forms.error.save'));
    } finally {
      setIsUpdatingStatus(false);
      setShowPublishModal(false);
    }
  };

  const executeSave = async (forcePublish?: boolean) => {
    if (!formData.title) return alert(t('forms.error.titleRequired'));
    setIsSaving(true);
    
    // Prepare full data to save
    let dataToSave = { ...formData };

    // Update publish state if requested via modal
    if (forcePublish === true) {
      dataToSave.isPublished = true;
      dataToSave.isActive = true;
      dataToSave.wasPublished = true;
    } else if (forcePublish === false) {
      // Ensure it stays as draft if explicitly requested (Publish Later)
      if (!formData.wasPublished) {
        dataToSave.isPublished = false;
      }
    }

    // Prepare data with defaults if advanced is hidden
    if (!showAdvancedAppearance) {
      dataToSave.headerContent = getDefaultHeader(formData.title);
      dataToSave.footerContent = getDefaultFooter();
      dataToSave.successMessage = t('forms.defaultSuccessMessage');
    }

    try {
      if (formId === 'new') {
        await api.createForm(dataToSave);
      } else {
        await api.updateForm(formId, dataToSave);
      }
      
      localStorage.removeItem(`tify_form_draft_${formId}`);
      onSave(); // Close editor and return to list
    } catch (err) {
      console.error(err);
      alert(t('forms.error.save'));
    } finally {
      setIsSaving(false);
      setShowPublishModal(false);
    }
  };

  const handleSaveClick = () => {
    // If form is a draft (never published), ask user
    if (!formData.isPublished && !formData.wasPublished) {
      setShowPublishModal(true);
    } else {
      executeSave();
    }
  };

  const addField = (type: string) => {
    let initialOptions: any = undefined;
    let initialLabel = '';
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

    const newId = generateId();
    setFormData({
      ...formData,
      fields: [
        ...formData.fields,
        {
          id: newId,
          type,
          label: initialLabel,
          required: initialRequired,
          placeholder: '',
          options: initialOptions,
        },
      ],
    });
    setActiveFieldId(newId);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...formData.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFormData({ ...formData, fields: newFields });
  };

  const removeField = (index: number) => {
    if (formData.wasPublished) {
      alert(t('forms.editor.cannotDeletePublished'));
      return;
    }
    const newFields = [...formData.fields];
    newFields.splice(index, 1);
    setFormData({ ...formData, fields: newFields });
  };

  const toggleFieldVisibility = (index: number) => {
    const newFields = [...formData.fields];
    newFields[index] = { ...newFields[index], isHidden: !newFields[index].isHidden };
    setFormData({ ...formData, fields: newFields });
  };

  const handleDeleteForm = async () => {
    if (!confirm(t('forms.editor.confirmDelete'))) return;
    setLoading(true);
    try {
      await api.deleteForm(formId);
      onClose();
    } catch (err) {
      console.error(err);
      alert(t('forms.error.delete'));
    } finally {
      setLoading(false);
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...formData.fields];
    if (direction === 'up' && index > 0) {
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    } else if (direction === 'down' && index < newFields.length - 1) {
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }
    setFormData({ ...formData, fields: newFields });
  };

  if (loading && formId !== 'new') {
    return (
      <div className="bg-white h-full flex flex-col animate-pulse">
        <div className="border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            <div className="h-6 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 relative">
          <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="h-6 w-48 bg-gray-200 rounded"></div>
              <div className="space-y-4">
                <div className="h-10 w-full bg-gray-200 rounded-lg"></div>
                <div className="h-20 w-full bg-gray-200 rounded-lg"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-12 bg-gray-200 rounded-lg"></div>
                <div className="h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white h-full flex flex-col relative">
      {/* Header */}
      <div className="relative border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center bg-white sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {formId === 'new' ? t('forms.editor.createTitle') : t('forms.editor.editTitle')}
          </h2>
        </div>
        <div className="flex gap-2">
          {formId !== 'new' && (
            <>
              {!formData.isPublished && (
                  <button
                      onClick={() => executeStatusChange({ isPublished: true, isActive: true })}
                      disabled={isUpdatingStatus}
                      className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    <Play size={18} />
                    <span className="hidden sm:inline">{t('forms.editor.publish')}</span>
                  </button>
              )}
              
              <button
                onClick={handleDeleteForm}
                className="text-red-500 hover:text-red-700 transition-colors p-2"
                title={t('forms.editor.delete')}
              >
                <Trash2 size={20} />
              </button>
            </>
          )}
          <button
            onClick={handleSaveClick}
            disabled={loading || isSaving}
            className="text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50 p-2"
            title={t('forms.editor.save')}
          >
            <Save size={20} />
          </button>
        </div>
      
        {/* Status Banner */}
        <div className="absolute top-full left-0 z-20 pointer-events-none">
            <div className={`px-6 py-2 text-sm font-medium flex items-center gap-2 rounded-br-2xl shadow-sm pointer-events-auto ${
                !formData.isPublished
                    ? 'bg-gray-50 text-gray-600 border border-gray-200 border-t-0 border-l-0'
                    : formData.isActive
                        ? 'bg-green-50 text-green-700 border border-green-100 border-t-0 border-l-0'
                        : 'bg-amber-50 text-amber-700 border border-amber-100 border-t-0 border-l-0'
            }`}>
            {!formData.isPublished ? (
                <><Type size={16} /> {t('forms.editor.status.draft')}</>
            ) : formData.isActive ? (
                <>
                    <span className="relative flex h-2.5 w-2.5 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    {t('forms.editor.status.active')}
                    <button
                        onClick={() => executeStatusChange({ isActive: false })}
                        disabled={isUpdatingStatus}
                        className="ml-2 text-green-700 hover:text-green-900 focus:outline-none disabled:opacity-50"
                        title={t('forms.editor.pause')}
                    >
                    <PauseCircle size={18} />
                    </button>
                </>
            ) : (
                <>
                    <span className="relative flex h-2.5 w-2.5 mr-1">
                    <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    {t('forms.editor.status.paused')}
                    <button
                        onClick={() => executeStatusChange({ isActive: true })}
                        disabled={isUpdatingStatus}
                        className="ml-2 text-amber-700 hover:text-amber-900 focus:outline-none disabled:opacity-50"
                        title={t('forms.editor.activate')}
                    >
                    <Play size={18} />
                    </button>
                </>
            )}
            </div>
        </div>
      </div>

      {/* Processing Overlay */}
      {isUpdatingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 animate-in fade-in zoom-in duration-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <div className="text-gray-900 font-medium">{t('forms.editor.processing')}</div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600 mb-2">
                <Play size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center">{t('forms.editor.publishConfirmTitle')}</h3>
              <p className="text-gray-600 text-center">{t('forms.editor.publishConfirmMessage')}</p>
              <div className="flex flex-col gap-3 pt-4">
                <button
                    onClick={() => executeSave(true)}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={18} />
                  {t('forms.editor.publishNow')}
                </button>
                <button
                    onClick={() => executeSave(false)}
                    className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  {t('forms.editor.publishLater')}
                </button>
              </div>
            </div>
          </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-50 relative">
        {/* Main Canvas */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto pt-16">
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            {/* General Settings Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('forms.editor.appearance')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="collectUserInfo"
                      checked={formData.collectUserInfo}
                      onChange={(e) => setFormData({ ...formData, collectUserInfo: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="collectUserInfo" className="text-sm font-medium text-gray-700">
                      {t('forms.editor.collectUserInfo') || 'Recopilar info del usuario (IP, Dispositivo)'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => setShowAdvancedAppearance(!showAdvancedAppearance)}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  {showAdvancedAppearance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  Personalizar apariencia y mensajes
                </button>

                {showAdvancedAppearance && (
                  <div className="grid grid-cols-1 gap-6 mt-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4">
                      <div className="p-4 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                        Estás editando la apariencia avanzada. Si desactivas esta opción, se usarán los valores por defecto al guardar.
                      </div>
                      
                      <RichTextEditor
                        label={t('forms.editor.headerContent')}
                        value={formData.headerContent}
                        onChange={(val) => setFormData({ ...formData, headerContent: val })}
                        placeholder={t('forms.editor.htmlPlaceholder.header')}
                      />
                      
                      <RichTextEditor
                        label={t('forms.editor.footerContent')}
                        value={formData.footerContent}
                        onChange={(val) => setFormData({ ...formData, footerContent: val })}
                        placeholder={t('forms.editor.htmlPlaceholder.footer')}
                      />
                      
                      <div>
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
                    </div>
                  </div>
                )}
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

              <AnimatePresence mode="popLayout">
                {formData.fields.map((field, idx) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={field.id}
                    className={`p-6 rounded-xl shadow-sm border relative group mb-4 cursor-pointer transition-all ${
                      activeFieldId === field.id 
                        ? 'bg-indigo-50/30 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md z-10' 
                        : 'bg-white border-gray-200 hover:border-indigo-300'
                    } ${field.isHidden ? 'opacity-60 border-dashed' : ''}`}
                    onClick={(e) => {
                      // Prevent triggering when clicking buttons
                      if ((e.target as HTMLElement).closest('button')) return;
                      setActiveFieldId(field.id);
                    }}
                  >
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <div className="flex items-center mr-2 bg-gray-100 rounded-lg p-1">
                        <span className="text-xs text-gray-500 font-medium px-2 border-r border-gray-300 mr-1">
                          {idx + 1} / {formData.fields.length}
                        </span>
                        <button
                          onClick={() => moveField(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 hover:text-indigo-600 transition-colors"
                          title={t('forms.action.moveUp')}
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          onClick={() => moveField(idx, 'down')}
                          disabled={idx === formData.fields.length - 1}
                          className="p-1 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 hover:text-indigo-600 transition-colors"
                          title={t('forms.action.moveDown')}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                      {formData.wasPublished ? (
                        <button
                          onClick={() => toggleFieldVisibility(idx)}
                          className={`${field.isHidden ? 'text-gray-400' : 'text-indigo-500'} hover:text-indigo-700 p-1`}
                          title={field.isHidden ? t('forms.action.show') : t('forms.action.hide')}
                        >
                          {field.isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      ) : (
                        <button
                          onClick={() => removeField(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title={t('forms.action.delete')}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {field.isHidden && (
                      <div className="md:col-span-2 bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded inline-block w-fit mb-2">
                        {t('forms.field.hidden')}
                      </div>
                    )}
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
                      <div className="md:col-span-2 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Opciones de selección
                          </label>
                        </div>
                        
                        {/* Options List */}
                        <div className="space-y-2">
                          {(Array.isArray(field.options) ? field.options : field.options?.items || []).map((opt: string, optIdx: number) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <div className="p-1.5 bg-gray-200 rounded text-gray-500">
                                <List size={14} />
                              </div>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const currentOptions = Array.isArray(field.options) 
                                    ? { items: field.options, multiple: false, allowOther: false }
                                    : (field.options || { items: [], multiple: false, allowOther: false });
                                  
                                  const newItems = [...currentOptions.items];
                                  newItems[optIdx] = e.target.value;
                                  
                                  updateField(idx, {
                                    options: { ...currentOptions, items: newItems }
                                  });
                                }}
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                                placeholder={`Opción ${optIdx + 1}`}
                              />
                              <button
                                onClick={() => {
                                  const currentOptions = Array.isArray(field.options) 
                                    ? { items: field.options, multiple: false, allowOther: false }
                                    : (field.options || { items: [], multiple: false, allowOther: false });
                                  
                                  const newItems = currentOptions.items.filter((_: any, i: number) => i !== optIdx);
                                  
                                  updateField(idx, {
                                    options: { ...currentOptions, items: newItems }
                                  });
                                }}
                                className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            const currentOptions = Array.isArray(field.options) 
                              ? { items: field.options, multiple: false, allowOther: false }
                              : (field.options || { items: [], multiple: false, allowOther: false });
                            
                            updateField(idx, {
                              options: { ...currentOptions, items: [...currentOptions.items, 'Nueva opción'] }
                            });
                          }}
                          className="flex items-center gap-1.5 text-indigo-600 text-sm font-medium hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 w-full justify-center border border-dashed border-indigo-200"
                        >
                          <Plus size={14} />
                          Añadir opción
                        </button>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!Array.isArray(field.options) && field.options?.multiple}
                              onChange={(e) => {
                                const currentOptions = Array.isArray(field.options) 
                                  ? { items: field.options, multiple: false, allowOther: false }
                                  : (field.options || { items: [], multiple: false, allowOther: false });
                                
                                updateField(idx, {
                                  options: { ...currentOptions, multiple: e.target.checked }
                                });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">Selección múltiple</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!Array.isArray(field.options) && field.options?.allowOther}
                              onChange={(e) => {
                                const currentOptions = Array.isArray(field.options) 
                                  ? { items: field.options, multiple: false, allowOther: false }
                                  : (field.options || { items: [], multiple: false, allowOther: false });
                                
                                updateField(idx, {
                                  options: { ...currentOptions, allowOther: e.target.checked }
                                });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">Permitir "Otro"</span>
                          </label>
                        </div>
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
                </motion.div>
              ))}
            </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsFieldModalOpen(true)}
        className="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 z-40"
        title={t('forms.editor.addFields')}
      >
        <Plus size={24} />
      </button>

      {isFieldModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
              <h3 className="font-semibold text-gray-900">{t('forms.editor.addFields')}</h3>
              <button
                onClick={() => setIsFieldModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-3 gap-3 overflow-y-auto">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.type}
                  onClick={() => {
                    addField(ft.type);
                    setIsFieldModalOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                >
                  <div className="p-2 rounded-full bg-gray-100 group-hover:bg-indigo-100 text-gray-600 group-hover:text-indigo-600 transition-colors">
                    <ft.icon size={20} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 text-center">
                    {ft.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {restoreModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600 mx-auto">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Recuperar cambios no guardados
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Hemos detectado cambios no guardados de una sesión anterior. ¿Deseas recuperarlos o descartarlos?
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    localStorage.removeItem(`tify_form_draft_${formId}`);
                    setRestoreModalOpen(false);
                    setDraftToRestore(null);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Descartar
                </button>
                <button
                  onClick={() => {
                    if (draftToRestore) {
                      setFormData({
                        ...draftToRestore,
                        fields: (draftToRestore.fields || []).map((f: any) => ({ ...f, id: f.id || generateId() }))
                      });
                      const defHeader = getDefaultHeader(draftToRestore.title);
                      const defFooter = getDefaultFooter();
                      const defSuccess = t('forms.defaultSuccessMessage');
                      
                      const hasCustomAppearance = 
                        (draftToRestore.headerContent && draftToRestore.headerContent !== defHeader) ||
                        (draftToRestore.footerContent && draftToRestore.footerContent !== defFooter) ||
                        (draftToRestore.successMessage && draftToRestore.successMessage !== defSuccess);

                      setShowAdvancedAppearance(!!hasCustomAppearance);
                    }
                    setRestoreModalOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                >
                  <RotateCcw size={18} />
                  Recuperar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-200 max-w-sm w-full mx-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Save size={24} className="text-indigo-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Guardando cambios</h3>
              <p className="text-sm text-gray-500">Por favor espere mientras procesamos su solicitud...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormEditor;
