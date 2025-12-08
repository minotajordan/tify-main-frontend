import React, { useState } from 'react';
import FormsList from './forms/FormsList';
import FormEditor from './forms/FormEditor';
import FormSubmissions from './forms/FormSubmissions';
import { useI18n } from '../i18n';

const FormsManager: React.FC = () => {
  const { t } = useI18n();
  const [view, setView] = useState<'list' | 'edit' | 'submissions'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setView('edit');
  };

  const handleViewSubmissions = (id: string) => {
    setSelectedId(id);
    setView('submissions');
  };

  const handleClose = () => {
    setSelectedId(null);
    setView('list');
  };

  if (view === 'edit' && selectedId) {
    return <FormEditor formId={selectedId} onClose={handleClose} onSave={handleClose} />;
  }

  if (view === 'submissions' && selectedId) {
    return <FormSubmissions formId={selectedId} onClose={handleClose} />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('forms.manager.title')}</h1>
        <p className="text-gray-500">{t('forms.manager.subtitle')}</p>
      </div>
      <FormsList onEdit={handleEdit} onViewSubmissions={handleViewSubmissions} />
    </div>
  );
};

export default FormsManager;
