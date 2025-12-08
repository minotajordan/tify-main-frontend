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
  const [error, setError] = useState<{message: string, status?: string} | null>(null);
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
      // Check if error response has status/message
      const errorData = err.response?.data || {};
      setError({
        message: errorData.message || err.message || t('forms.public.notFound'),
        status: errorData.status || (err.response?.status === 403 ? 'paused' : err.response?.status === 410 ? 'deleted' : 'error')
      });
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
          (() => {
            const opts = Array.isArray(field.options) 
              ? { items: field.options, multiple: false, allowOther: false } 
              : (field.options || { items: [], multiple: false, allowOther: false });

            const handleSelectChange = (val: string, checked: boolean) => {
              const current = answers[field.label] ? (Array.isArray(answers[field.label]) ? answers[field.label] : [answers[field.label]]) : [];
              let newVal;
              if (checked) {
                newVal = [...current, val];
              } else {
                newVal = current.filter((v: string) => v !== val);
              }
              handleInputChange(field.label, newVal);
            };

            const handleSingleChange = (val: string) => {
              handleInputChange(field.label, val);
            };

            return (
              <div className="space-y-3">
                {opts.items.map((opt: string, optIdx: number) => (
                  <div key={optIdx} className="flex items-center gap-3">
                    <input
                      type={opts.multiple ? "checkbox" : "radio"}
                      name={`field-${idx}`}
                      id={`field-${idx}-opt-${optIdx}`}
                      value={opt}
                      checked={
                        opts.multiple 
                          ? (Array.isArray(answers[field.label]) && answers[field.label].includes(opt))
                          : answers[field.label] === opt
                      }
                      onChange={(e) => {
                        if (opts.multiple) {
                          handleSelectChange(opt, e.target.checked);
                        } else {
                          handleSingleChange(opt);
                        }
                      }}
                      className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`field-${idx}-opt-${optIdx}`} className="text-gray-700 cursor-pointer select-none">
                      {opt}
                    </label>
                  </div>
                ))}

                {opts.allowOther && (
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type={opts.multiple ? "checkbox" : "radio"}
                      name={`field-${idx}`}
                      id={`field-${idx}-other`}
                      checked={
                        opts.multiple 
                          ? (Array.isArray(answers[field.label]) && answers[field.label]?.some((v: string) => !opts.items.includes(v)))
                          : (answers[field.label] && !opts.items.includes(answers[field.label]))
                      }
                      onChange={(e) => {
                        if (!opts.multiple && e.target.checked) {
                          // Clear selection to prepare for "Other" text input
                          handleSingleChange('');
                        }
                      }}
                      className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Otro (especificar)"
                        value={
                          opts.multiple 
                            ? (Array.isArray(answers[field.label]) ? answers[field.label].find((v: string) => !opts.items.includes(v)) || '' : '')
                            : (answers[field.label] && !opts.items.includes(answers[field.label]) ? answers[field.label] : '')
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (opts.multiple) {
                            const current = Array.isArray(answers[field.label]) ? answers[field.label] : [];
                            // Remove old custom value if exists
                            const clean = current.filter((v: string) => opts.items.includes(v));
                            if (val) {
                              handleInputChange(field.label, [...clean, val]);
                            } else {
                              handleInputChange(field.label, clean);
                            }
                          } else {
                            handleSingleChange(val);
                          }
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                        disabled={
                          opts.multiple 
                            ? false // Always enabled if checkbox checked logic is weird, actually better to just check if input has value
                            : false
                        }
                        onFocus={() => {
                          // Auto select radio when focusing input
                          if (!opts.multiple && answers[field.label] && opts.items.includes(answers[field.label])) {
                             handleSingleChange('');
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 animate-pulse">
        <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-48 bg-gray-200 w-full"></div>
          <div className="p-8 space-y-6">
            <div className="h-10 w-3/4 bg-gray-200 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
            <div className="space-y-6 pt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  <div className="h-10 w-full bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  if (error) {
    const isDeleted = error.status === 'deleted';
    const isPaused = error.status === 'paused';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
            isDeleted ? 'bg-red-100 text-red-600' : 
            isPaused ? 'bg-amber-100 text-amber-600' : 
            'bg-gray-100 text-gray-600'
          }`}>
            {isDeleted ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            ) : isPaused ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            )}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {isDeleted ? t('forms.public.deletedTitle') : 
               isPaused ? t('forms.public.pausedTitle') : 
               t('forms.public.errorTitle')}
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed">
              {isDeleted ? t('forms.public.deletedMessage') : 
               isPaused ? t('forms.public.pausedMessage') : 
               error.message || t('forms.public.notFound')}
            </p>
          </div>

          <div className="pt-4">
             <a href="/" className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
               {t('forms.public.goHome')}
             </a>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Loading Modal */}
      {submitting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-200 max-w-sm w-full mx-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle size={24} className="text-indigo-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">{t('forms.public.submitting')}</h3>
              <p className="text-sm text-gray-500">{t('forms.public.submittingMessage')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicFormViewer;
