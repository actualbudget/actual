import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Modal } from '@desktop-client/components/common/Modal';
import { useCategories } from '@desktop-client/hooks/useCategories';

type TemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onTemplateChange: () => void;
  templates: Array<{
    id: string;
    name: string;
    template: Record<string, number>;
    created_at: string;
  }>;
};

export function TemplateModal({
  isOpen,
  onClose,
  onTemplateChange,
  templates,
}: TemplateModalProps) {
  const { t } = useTranslation();
  const { grouped: categoryGroups } = useCategories();
  const [templateName, setTemplateName] = useState('');
  const [templateValues, setTemplateValues] = useState<Record<string, number>>(
    {},
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setTemplateName('');
      setTemplateValues({});
      setSelectedTemplate('');
    }
  }, [isOpen]);

  const handleLoadTemplate = async (templateId: string) => {
    if (!templateId) return;

    try {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setTemplateName(template.name);
        setTemplateValues(template.template);
        setSelectedTemplate(templateId);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;

    try {
      console.log('Saving template:', {
        name: templateName,
        values: templateValues,
      });

      // For now, store in localStorage as a simplified approach
      const templates = JSON.parse(
        localStorage.getItem('futureTemplates') || '[]',
      );
      const templateId = selectedTemplate || Date.now().toString();

      const existingIndex = templates.findIndex(t => t.id === templateId);
      const templateData = {
        id: templateId,
        name: templateName,
        template: templateValues,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        templates[existingIndex] = templateData;
      } else {
        templates.push(templateData);
      }

      localStorage.setItem('futureTemplates', JSON.stringify(templates));
      console.log('Template saved successfully to localStorage');

      onTemplateChange();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template: ' + error.message);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const templates = JSON.parse(
        localStorage.getItem('futureTemplates') || '[]',
      );
      const filteredTemplates = templates.filter(
        t => t.id !== selectedTemplate,
      );
      localStorage.setItem(
        'futureTemplates',
        JSON.stringify(filteredTemplates),
      );

      onTemplateChange();
      setSelectedTemplate('');
      setTemplateName('');
      setTemplateValues({});
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleCategoryValueChange = (categoryId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTemplateValues(prev => ({
      ...prev,
      [categoryId]: numValue * 100, // Convert to cents
    }));
  };

  return (
    <Modal
      title={t('Manage Budget Templates')}
      isOpen={isOpen}
      onClose={onClose}
      style={{ width: '90%', maxWidth: 800, maxHeight: '90vh' }}
    >
      <View
        style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <View style={{ flexShrink: 0 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              marginBottom: 12,
              lineHeight: 1.4,
            }}
          >
            {t('Load Existing Template')}
          </Text>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <select
              value={selectedTemplate}
              onChange={e => handleLoadTemplate(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                backgroundColor: theme.buttonNormalBackground,
                color: theme.buttonNormalText,
                padding: '10px 14px',
                borderRadius: 4,
                border: 'none',
                minHeight: 40,
                fontSize: 14,
              }}
            >
              <option value="">{t('Select existing template...')}</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <Button
                type="bare"
                onClick={handleDeleteTemplate}
                style={{
                  backgroundColor: theme.errorText,
                  color: theme.tableBackground,
                  padding: '10px 16px',
                  borderRadius: 4,
                  minHeight: 40,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                <Trans>Delete</Trans>
              </Button>
            )}
          </View>
        </View>

        <View style={{ flexShrink: 0 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              marginBottom: 12,
              lineHeight: 1.4,
            }}
          >
            {t('Template Name')}
          </Text>
          <Input
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder={t('Enter template name...')}
            style={{
              width: '100%',
              minHeight: 40,
              fontSize: 14,
              padding: '10px 14px',
            }}
          />
        </View>

        <View
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              marginBottom: 12,
              lineHeight: 1.4,
              flexShrink: 0,
            }}
          >
            {t('Monthly Budget Categories')}
          </Text>
          <View
            style={{
              flex: 1,
              overflowY: 'auto',
              border: `1px solid ${theme.tableBorderColor}`,
              borderRadius: 6,
              padding: 16,
              backgroundColor: theme.pageBackground,
            }}
          >
            {categoryGroups &&
              categoryGroups.map(group => (
                <View key={group.id} style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 'bold',
                      color: theme.tableText,
                      marginBottom: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    {group.name}
                  </Text>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {group.categories.map(category => (
                      <View
                        key={category.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingLeft: 12,
                          paddingRight: 8,
                          minHeight: 40,
                          gap: 12,
                          backgroundColor: theme.tableBackground,
                          borderRadius: 4,
                          padding: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.tableText,
                            flex: 1,
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                          }}
                        >
                          {category.name}
                        </Text>
                        <Input
                          value={
                            templateValues[category.id]
                              ? (templateValues[category.id] / 100).toFixed(2)
                              : ''
                          }
                          onChange={e =>
                            handleCategoryValueChange(
                              category.id,
                              e.target.value,
                            )
                          }
                          placeholder="0.00"
                          style={{
                            width: 100,
                            textAlign: 'right',
                            WebkitAppearance: 'none',
                            MozAppearance: 'textfield',
                            minHeight: 32,
                            fontSize: 12,
                            padding: '6px 8px',
                            flexShrink: 0,
                          }}
                          inputMode="decimal"
                          type="text"
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
          </View>
        </View>

        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 12,
            justifyContent: 'flex-end',
            borderTop: `1px solid ${theme.tableBorderColor}`,
            paddingTop: 16,
            flexShrink: 0,
          }}
        >
          <Button
            type="bare"
            onClick={onClose}
            style={{ padding: '10px 16px' }}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button
            type="primary"
            onClick={handleSaveTemplate}
            disabled={!templateName.trim()}
            style={{ padding: '10px 16px' }}
          >
            {t('Save Template')}
          </Button>
        </View>
      </View>
    </Modal>
  );
}
