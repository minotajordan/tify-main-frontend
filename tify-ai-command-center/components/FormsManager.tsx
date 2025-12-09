import React, { useState } from 'react';
import FormsList from './forms/FormsList';
import FormEditor from './forms/FormEditor';
import FormSubmissions from './forms/FormSubmissions';
import { useI18n } from '../i18n';

const FormsManager: React.FC = () => {
  const { t } = useI18n();
  const [view, setView] = useState<'list' | 'edit' | 'submissions'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Check for AI generated draft
  React.useEffect(() => {
    const pendingForm = localStorage.getItem('tify_pending_ai_form');
    if (pendingForm) {
      try {
        const form = JSON.parse(pendingForm);
        // Transform to FormEditor structure
        const editorDraft = {
          title: form.title,
          description: form.description,
          fields: form.fields,
          headerContent: `<div style="text-align: center; padding: 20px 0;"><h1 class="text-3xl font-bold text-indigo-600">${form.title}</h1></div>`,
          footerContent: `<div style="text-align: center; padding: 20px; color: #6b7280; font-size: 0.875rem;"><p>&copy; ${new Date().getFullYear()} Tify. All rights reserved.</p></div>`,
          successMessage: 'Gracias por tu respuesta.',
          isActive: true,
          isPublished: false,
          collectUserInfo: false,
        };
        
        localStorage.setItem('tify_form_draft_new', JSON.stringify(editorDraft));
        localStorage.removeItem('tify_pending_ai_form');
        
        setSelectedId('new');
        setView('edit');
      } catch (e) {
        console.error('Error parsing AI draft', e);
      }
    }
  }, []);

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
    <div className="h-full bg-gray-50">
      <FormsList onEdit={handleEdit} onViewSubmissions={handleViewSubmissions} />
    </div>
  );
};

export default FormsManager;
