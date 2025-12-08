import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import QRCodeStyling from 'qr-code-styling';
import { CheckCircle, Calendar, ChevronRight, ChevronLeft, Upload } from 'lucide-react';
import dayjs from 'dayjs';
import { useI18n } from '../../i18n';

const PublicFormViewer: React.FC<{ slug: string }> = ({ slug }) => {
  const { t } = useI18n();
  const qrRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    loadForm();
  }, [slug]);

  useEffect(() => {
    if (submitted && submissionId && qrRef.current) {
      const qrCode = new QRCodeStyling({
        width: 200,
        height: 200,
        data: submissionId,
        dotsOptions: { color: '#4f46e5', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' },
        imageOptions: { crossOrigin: 'anonymous', margin: 5 },
      });

      qrRef.current.innerHTML = '';
      qrCode.append(qrRef.current);
    }
  }, [submitted, submissionId]);

  const loadForm = async () => {
    try {
      const data = await api.getPublicForm(slug);
      setForm(data);
    } catch (err: any) {
      setError(err.message || t('forms.public.notFound'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Final Validation for all fields (or current if not wizard, but wizard validates on step)
    // If wizard, we just validate the last step here usually, or re-validate all?
    // Let's re-validate all to be safe.
    for (const field of form.fields) {
      if (field.required && !answers[field.label]) {
        if (form.isWizard) {
            // If validation fails in wizard, jump to that step?
            // For simplicity, just alert.
            const idx = form.fields.findIndex((f: any) => f.label === field.label);
            setCurrentStep(idx);
        }
        alert(t('forms.public.fieldRequired').replace('{label}', field.label));
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.submitForm(slug, answers);
      setSubmissionId(res.id);
      setSubmitted(true);
    } catch (err) {
      alert(t('forms.public.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (label: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [label]: value }));
  };

  const handleFileChange = (field: any, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(t('forms.public.fileTooLarge'));
      e.target.value = '';
      return;
    }

    // Validate type
    const allowed = field.options?.allowedTypes || [];
    let isValid = allowed.length === 0;

    for (const type of allowed) {
      if (type === 'image' && file.type.startsWith('image/')) isValid = true;
      else if (type === 'video' && file.type.startsWith('video/')) isValid = true;
      else if (type === 'pdf' && file.type === 'application/pdf') isValid = true;
      else if (type === 'document' && file.name.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)) isValid = true;
    }

    if (!isValid) {
      alert(t('forms.public.fileTypeNotAllowed'));
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleInputChange(field.label, {
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    const currentField = form.fields[currentStep];
    if (currentField.required && !answers[currentField.label]) {
      alert(t('forms.public.fieldRequired').replace('{label}', currentField.label));
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const renderField = (field: any, idx: number) => {
    return (
      <div key={idx} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>

        {field.type === 'textarea' ? (
          <textarea
            required={field.required}
            placeholder={field.placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            value={answers[field.label] || ''}
          />
        ) : field.type === 'select' ? (
          <select
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            value={answers[field.label] || ''}
          >
            <option value="" disabled>
              {t('forms.public.selectOption')}
            </option>
            {field.options &&
              field.options.map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
          </select>
        ) : field.type === 'checkbox' ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id={`field-${idx}`}
              required={field.required}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5"
              onChange={(e) => handleInputChange(field.label, e.target.checked)}
              checked={!!answers[field.label]}
            />
            <label htmlFor={`field-${idx}`} className="text-gray-600 text-sm">
              {field.placeholder || t('forms.public.yes')}
            </label>
          </div>
        ) : field.type === 'file' ? (
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor={`file-upload-${idx}`}
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                  >
                    <span>{t('forms.field.file')}</span>
                    <input
                        id={`file-upload-${idx}`}
                        name={`file-upload-${idx}`}
                        type="file"
                        className="sr-only"
                        onChange={(e) => handleFileChange(field, e)}
                        accept={
                            field.options?.allowedTypes?.map((t: string) =>
                                t === 'image' ? 'image/*' :
                                    t === 'video' ? 'video/*' :
                                        t === 'pdf' ? '.pdf' :
                                            t === 'document' ? '.doc,.docx,.xls,.xlsx,.ppt,.pptx' : ''
                            ).join(',')
                        }
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  {answers[field.label] ? answers[field.label].name : t('forms.public.fileTooLarge')}
                </p>
              </div>
            </div>
        ) : field.type === 'habeasData' ? (
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              required={field.required}
              className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5 flex-shrink-0"
              onChange={(e) => handleInputChange(field.label, e.target.checked)}
              checked={!!answers[field.label]}
            />
            <label className="text-sm text-gray-700 leading-relaxed">
              {field.options?.message || t('forms.field.habeasDataDefault')}
            </label>
          </div>
        ) : (
          <input
            type={field.type}
            required={field.required}
            placeholder={field.placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            value={answers[field.label] || ''}
          />
        )}
      </div>
    );
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {t('forms.public.loading')}
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-600">
        {error}
      </div>
    );

  if (form && form.expiresAt && dayjs().isAfter(dayjs(form.expiresAt))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white max-w-md w-full rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 mb-4">
            <Calendar size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('forms.public.expired')}</h2>
          <p className="text-gray-500">{t('forms.public.expiredMessage')}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('forms.public.successTitle')}</h2>
          <p className="text-gray-600">
            {form.successMessage || t('forms.public.defaultSuccessMessage')}
          </p>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-500 mb-4">{t('forms.public.saveQr')}</p>
            <div ref={qrRef} className="flex justify-center"></div>
            <p className="text-xs text-gray-400 mt-2">ID: {submissionId}</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {t('forms.public.submitAnother')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      {form.headerContent && (
        <header
          className="bg-white border-b border-gray-200 p-6 text-center"
          dangerouslySetInnerHTML={{ __html: form.headerContent }}
        />
      )}

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-indigo-600 px-8 py-6 text-white">
            <h1 className="text-3xl font-bold">{form.title}</h1>
            {form.description && (
              <p className="mt-2 text-indigo-100 opacity-90">{form.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {form.isWizard ? (
                <div className="space-y-6">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${((currentStep + 1) / form.fields.length) * 100}%` }}
                        ></div>
                    </div>
                    
                    <div className="min-h-[200px]">
                        {renderField(form.fields[currentStep], currentStep)}
                    </div>

                    <div className="flex justify-between pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setCurrentStep((c) => c - 1)}
                            disabled={currentStep === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                currentStep === 0
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <ChevronLeft size={20} />
                            {t('forms.public.back')}
                        </button>

                        {currentStep < form.fields.length - 1 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                            >
                                {t('forms.public.next')}
                                <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-70"
                            >
                                {submitting ? t('forms.public.submitting') : t('forms.public.submit')}
                                <CheckCircle size={20} />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {form.fields.map((field: any, idx: number) => renderField(field, idx))}
                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all disabled:opacity-70"
                        >
                            {submitting ? t('forms.public.submitting') : t('forms.public.submit')}
                        </button>
                    </div>
                </>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      {form.footerContent && (
        <footer
          className="bg-white border-t border-gray-200 p-6 text-center text-sm text-gray-500"
          dangerouslySetInnerHTML={{ __html: form.footerContent }}
        />
      )}
    </div>
  );
};

export default PublicFormViewer;
