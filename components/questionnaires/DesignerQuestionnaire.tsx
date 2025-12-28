import React from 'react';
import FormSection from '../FormSection';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import FileUpload from '../FileUpload';
import MultiFileUpload from '../MultiFileUpload';
import MultiImageUpload from '../MultiImageUpload';
import MultiSelectWithSearch from '../MultiSelectWithSearch';
import DesignerDBSection from './DesignerDBSection';
import { DesignerFormData, Designer, DesignerProject, ProjectManager, Insurance } from '@/types/supplier';

interface DesignerQuestionnaireProps {
  data: DesignerFormData;
  onChange: <K extends keyof DesignerFormData>(
    field: K,
    value: DesignerFormData[K]
  ) => void;
}

export default function DesignerQuestionnaire({
  data,
  onChange,
}: DesignerQuestionnaireProps) {
  // State for project autofill dialog
  const [showAutofillDialog, setShowAutofillDialog] = React.useState(false);
  const [autofillSource, setAutofillSource] = React.useState<DesignerProject | null>(null);
  const [autofillTarget, setAutofillTarget] = React.useState<{
    type: 'designHighlight' | 'designerProject';
    projectId: string;
    designerId?: string;
  } | null>(null);

  const countryOptions = [
    { value: 'Hong Kong', label: 'Hong Kong 香港' },
    { value: 'China', label: 'China 中國' },
    { value: 'Macau', label: 'Macau 澳門' },
    { value: 'Taiwan', label: 'Taiwan 台灣' },
    { value: 'Singapore', label: 'Singapore 新加坡' },
    { value: 'Malaysia', label: 'Malaysia 馬來西亞' },
    { value: 'Japan', label: 'Japan 日本' },
    { value: 'South Korea', label: 'South Korea 韓國' },
    { value: 'Thailand', label: 'Thailand 泰國' },
    { value: 'Vietnam', label: 'Vietnam 越南' },
    { value: 'Philippines', label: 'Philippines 菲律賓' },
    { value: 'Indonesia', label: 'Indonesia 印尼' },
    { value: 'India', label: 'India 印度' },
    { value: 'United Arab Emirates', label: 'UAE 阿聯酋' },
    { value: 'United Kingdom', label: 'United Kingdom 英國' },
    { value: 'United States', label: 'United States 美國' },
    { value: 'Canada', label: 'Canada 加拿大' },
    { value: 'Australia', label: 'Australia 澳洲' },
    { value: 'Germany', label: 'Germany 德國' },
    { value: 'France', label: 'France 法國' },
  ];
  const feeStructureOptions = [
    { value: 'byArea', label: 'By Area 按面積' },
    { value: 'byProject', label: 'By Project 按項目' },
    { value: 'byPeriod', label: 'By Period 按時間' },
    { value: 'other', label: 'Other 其他' },
  ];

  // Project type to style mappings
  const projectTypeStyleMap: Record<string, { value: string; label: string }[]> = {
    residential: [
      { value: 'modernMinimalist', label: '現代簡約風 / Modern Minimalist' },
      { value: 'nordic', label: '北歐風 / Nordic Style' },
      { value: 'newChinese', label: '新中式風 / New Chinese Style' },
      { value: 'lightLuxury', label: '輕奢風 / Light Luxury Style' },
      { value: 'japaneseLog', label: '日式原木風 / Japanese Log Style' },
      { value: 'industrial', label: '工業風 / Industrial Style' },
      { value: 'classic', label: '復古風 / Classic Style' },
      { value: 'french', label: '法式風 / French Style' },
      { value: 'hongKong', label: '港式風 / Hong Kong Style' },
    ],
    commercial: [
      { value: 'modernLightLuxury', label: '現代輕奢風 / Modern Light Luxury Style' },
      { value: 'industrial', label: '工業風 / Industrial Style' },
      { value: 'wabiSabi', label: '侘寂風 / Wabi-sabi Style' },
      { value: 'chineseFashion', label: '國潮風 / Chinese Fashion Style' },
      { value: 'minimalist', label: '極簡風 / Minimalist Style' },
    ],
    office: [
      { value: 'modernMinimalist', label: '現代簡約風 / Modern Minimalist' },
      { value: 'industrial', label: '工業風 / Industrial Style' },
      { value: 'newChinese', label: '新中式風 / New Chinese Style' },
      { value: 'lightLuxuryBusiness', label: '輕奢商務風 / Light Luxury Business Style' },
      { value: 'nordic', label: '北歐風 / Nordic Style' },
      { value: 'intelligentTech', label: '智能科技風 / Intelligent Technology Style' },
    ],
    hotel: [
      { value: 'modernLightLuxury', label: '現代輕奢風 / Modern Light Luxury Style' },
      { value: 'newChinese', label: '新中式風 / New Chinese Style' },
      { value: 'wabiSabi', label: '侘寂風 / Wabi-sabi Style' },
      { value: 'southeastAsian', label: '東南亞風 / Southeast Asian Style' },
      { value: 'industrial', label: '工業風 / Industrial Style' },
      { value: 'frenchRetro', label: '法式復古風 / French Retro Style' },
    ],
    medical: [
      { value: 'modernMinimalist', label: '現代簡約風 / Modern Minimalist' },
      { value: 'healingLog', label: '療癒系原木風 / Healing Log Style' },
      { value: 'minimalistMedical', label: '極簡醫療風 / Minimalist Medical Style' },
      { value: 'lightLuxury', label: '輕奢風 / Light Luxury Style' },
    ],
    education: [
      { value: 'childlikeNature', label: '童趣自然風 / Childlike Nature Style' },
      { value: 'modernMinimalist', label: '現代簡約風 / Modern Minimalist' },
      { value: 'newChinese', label: '新中式風 / New Chinese Style' },
      { value: 'nordic', label: '北歐風 / Nordic Style' },
    ],
    industrial: [
      { value: 'originalIndustrial', label: '工業風 / Original Industrial Style' },
      { value: 'modernMinimalist', label: '現代極簡風 / Modern Minimalist' },
      { value: 'technology', label: '科技風 / Technology Style' },
    ],
    other: [],
  };

  const projectTypeOptions = [
    { value: 'residential', label: 'Residential 住宅' },
    { value: 'commercial', label: 'Commercial 商業' },
    { value: 'office', label: 'Office 辦公' },
    { value: 'hotel', label: 'Hotel 酒店' },
    { value: 'medical', label: 'Medical 醫療' },
    { value: 'education', label: 'Education 教育' },
    { value: 'industrial', label: 'Industrial 工業' },
    { value: 'other', label: 'Other 其他' },
  ];

  const softwareOptions = [
    { value: 'AutoCAD', label: 'AutoCAD' },
    { value: 'SketchUp', label: 'SketchUp' },
    { value: 'Revit', label: 'Revit' },
    { value: '3DMax', label: '3DMax' },
  ];

  // Initialize designers array if undefined (for backward compatibility with old data)
  if (!data.designers) {
    onChange('designers', []);
  }

  // Initialize organizationChart if undefined
  if (data.organizationChart === undefined) {
    onChange('organizationChart', null);
  }

  // Initialize mainSoftware if it's a string (for backward compatibility)
  if (typeof data.mainSoftware === 'string') {
    onChange('mainSoftware', data.mainSoftware ? [data.mainSoftware] : []);
  } else if (!data.mainSoftware) {
    onChange('mainSoftware', []);
  }

  // Initialize designAwards if undefined (for backward compatibility)
  if (!data.designAwards || data.designAwards.length === 0) {
    onChange('designAwards', ['']);
  }

  // Initialize designHighlights if undefined
  if (!data.designHighlights) {
    onChange('designHighlights', []);
  }

  // Initialize projectTypes if undefined (for backward compatibility)
  if (!data.projectTypes) {
    onChange('projectTypes', []);
  }

  // Initialize designStyles if undefined or not an array (for backward compatibility)
  if (!Array.isArray(data.designStyles)) {
    onChange('designStyles', []);
  }

  // Get available styles based on selected project types
  const getAvailableStyles = React.useMemo(() => {
    if (!data.projectTypes || data.projectTypes.length === 0) {
      return [];
    }

    // Collect all unique styles from selected project types
    const stylesMap = new Map<string, { value: string; label: string }>();

    data.projectTypes.forEach((type) => {
      const styles = projectTypeStyleMap[type] || [];
      styles.forEach((style) => {
        if (!stylesMap.has(style.value)) {
          stylesMap.set(style.value, style);
        }
      });
    });

    // Add custom styles that are already selected
    if (data.designStyles && Array.isArray(data.designStyles)) {
      data.designStyles.forEach((style) => {
        if (style.startsWith('custom_') && !stylesMap.has(style)) {
          // Extract the custom name (remove 'custom_' prefix)
          const customName = style.substring(7);
          stylesMap.set(style, {
            value: style,
            label: `${customName} (Custom / 自定義)`,
          });
        }
      });
    }

    return Array.from(stylesMap.values());
  }, [data.projectTypes, data.designStyles]);

  // Clean up selected styles that are no longer available when project types change
  React.useEffect(() => {
    if (data.projectTypes && data.projectTypes.length > 0) {
      const availableStyleValues = new Set(getAvailableStyles.map(s => s.value));
      // Keep custom styles even if project types change
      const validStyles = (data.designStyles || []).filter(
        style => availableStyleValues.has(style) || style.startsWith('custom_')
      );

      if (validStyles.length !== (data.designStyles || []).length) {
        onChange('designStyles', validStyles);
      }
    }
  }, [data.projectTypes]);

  // Award management functions
  const addAward = () => {
    onChange('designAwards', [...(data.designAwards || ['']), '']);
  };

  const updateAward = (index: number, value: string) => {
    const updated = [...(data.designAwards || [''])];
    updated[index] = value;
    onChange('designAwards', updated);
  };

  const removeAward = (index: number) => {
    const updated = (data.designAwards || ['']).filter((_, i) => i !== index);
    // Ensure at least one award field remains
    onChange('designAwards', updated.length > 0 ? updated : ['']);
  };

  // Designer management functions
  const addDesigner = () => {
    const newDesigner: Designer = {
      id: Date.now().toString(),
      name: '',
      experience: '',
      cv: null,
      projects: [],
    };
    onChange('designers', [...(data.designers || []), newDesigner]);
  };

  const updateDesigner = (id: string, field: keyof Designer, value: any) => {
    const updatedDesigners = (data.designers || []).map((designer) =>
      designer.id === id ? { ...designer, [field]: value } : designer
    );
    onChange('designers', updatedDesigners);
  };

  const removeDesigner = (id: string) => {
    const updatedDesigners = (data.designers || []).filter((designer) => designer.id !== id);
    onChange('designers', updatedDesigners);
  };

  // Project management functions
  const addProject = (designerId: string) => {
    const newProject: DesignerProject = {
      id: Date.now().toString(),
      projectName: '',
      year: '',
      address: '',
      area: '',
      renovationType: '',
      projectTypes: [],
      projectHighlight: false,
      photos: [],
    };
    const updatedDesigners = (data.designers || []).map((designer) =>
      designer.id === designerId
        ? { ...designer, projects: [...designer.projects, newProject] }
        : designer
    );
    onChange('designers', updatedDesigners);
  };

  const updateProject = (
    designerId: string,
    projectId: string,
    field: keyof DesignerProject,
    value: any
  ) => {
    const updatedDesigners = (data.designers || []).map((designer) =>
      designer.id === designerId
        ? {
            ...designer,
            projects: designer.projects.map((project) =>
              project.id === projectId ? { ...project, [field]: value } : project
            ),
          }
        : designer
    );
    onChange('designers', updatedDesigners);
  };

  const removeProject = (designerId: string, projectId: string) => {
    const updatedDesigners = (data.designers || []).map((designer) =>
      designer.id === designerId
        ? {
            ...designer,
            projects: designer.projects.filter((project) => project.id !== projectId),
          }
        : designer
    );
    onChange('designers', updatedDesigners);
  };

  // D&B Project Manager management functions
  const addDbProjectManager = () => {
    const newManager: ProjectManager = {
      id: Date.now().toString(),
      name: '',
      yearsExperience: '',
      languages: '',
      mainProject: '',
      year: '',
      address: '',
      area: '',
      projects: [
        {
          id: `${Date.now()}-project`,
          projectName: '',
          clientName: '',
          year: '',
          buildingName: '',
          area: '',
        },
      ],
      cv: null,
    };
    onChange('dbProjectManagers', [...(data.dbProjectManagers || []), newManager]);
  };

  const updateDbProjectManager = (id: string, field: keyof ProjectManager, value: any) => {
    const updated = (data.dbProjectManagers || []).map((pm) =>
      pm.id === id ? { ...pm, [field]: value } : pm
    );
    onChange('dbProjectManagers', updated);
  };

  const removeDbProjectManager = (id: string) => {
    const updated = (data.dbProjectManagers || []).filter((pm) => pm.id !== id);
    onChange('dbProjectManagers', updated);
  };

  // D&B Insurance management functions
  const addDbInsurance = () => {
    const newInsurance: Insurance = {
      id: Date.now().toString(),
      type: '',
      provider: '',
      expiryDate: '',
      file: null,
    };
    onChange('dbInsurances', [...(data.dbInsurances || []), newInsurance]);
  };

  const updateDbInsurance = (id: string, field: keyof Insurance, value: any) => {
    const updated = (data.dbInsurances || []).map((ins) =>
      ins.id === id ? { ...ins, [field]: value } : ins
    );
    onChange('dbInsurances', updated);
  };

  // Design highlight management functions
  const addDesignHighlight = () => {
    const newProject: DesignerProject = {
      id: Date.now().toString(),
      projectName: '',
      year: '',
      address: '',
      area: '',
      renovationType: '',
      projectTypes: [],
      projectHighlight: false,
      photos: [],
    };
    onChange('designHighlights', [...(data.designHighlights || []), newProject]);
  };

  const updateDesignHighlight = (
    projectId: string,
    field: keyof DesignerProject,
    value: any
  ) => {
    const updatedProjects = (data.designHighlights || []).map((project) =>
      project.id === projectId ? { ...project, [field]: value } : project
    );
    onChange('designHighlights', updatedProjects);
  };

  const removeDesignHighlight = (projectId: string) => {
    const updatedProjects = (data.designHighlights || []).filter((project) => project.id !== projectId);
    onChange('designHighlights', updatedProjects);
  };

  const removeDbInsurance = (id: string) => {
    const updated = (data.dbInsurances || []).filter((ins) => ins.id !== id);
    onChange('dbInsurances', updated);
  };

  // Function to find existing project by name
  const findExistingProjectByName = (projectName: string, excludeId?: string): DesignerProject | null => {
    if (!projectName || projectName.trim() === '') return null;

    const trimmedName = projectName.trim().toLowerCase();

    // Search in Design Highlights
    const highlightMatch = (data.designHighlights || []).find(
      (p) => p.id !== excludeId && p.projectName.trim().toLowerCase() === trimmedName
    );
    if (highlightMatch) return highlightMatch;

    // Search in all designers' projects
    for (const designer of data.designers || []) {
      const projectMatch = designer.projects.find(
        (p) => p.id !== excludeId && p.projectName.trim().toLowerCase() === trimmedName
      );
      if (projectMatch) return projectMatch;
    }

    return null;
  };

  // Function to handle project name blur event
  const handleProjectNameBlur = (
    projectName: string,
    targetType: 'designHighlight' | 'designerProject',
    projectId: string,
    designerId?: string
  ) => {
    if (!projectName || projectName.trim() === '') return;

    const existingProject = findExistingProjectByName(projectName, projectId);
    if (existingProject) {
      setAutofillSource(existingProject);
      setAutofillTarget({ type: targetType, projectId, designerId });
      setShowAutofillDialog(true);
    }
  };

  // Function to handle autofill confirmation
  const handleAutofillConfirm = () => {
    if (!autofillSource || !autofillTarget) return;

    const { type, projectId, designerId } = autofillTarget;

    // Copy all fields except id and projectName (keep the original projectName)
    const fieldsToAutofill = {
      year: autofillSource.year,
      address: autofillSource.address,
      area: autofillSource.area,
      renovationType: autofillSource.renovationType,
      projectTypes: autofillSource.projectTypes,
      photos: autofillSource.photos,
    };

    if (type === 'designHighlight') {
      // Update design highlight
      const updatedProjects = (data.designHighlights || []).map((project) =>
        project.id === projectId ? { ...project, ...fieldsToAutofill } : project
      );
      onChange('designHighlights', updatedProjects);
    } else if (type === 'designerProject' && designerId) {
      // Update designer project
      const updatedDesigners = (data.designers || []).map((designer) =>
        designer.id === designerId
          ? {
              ...designer,
              projects: designer.projects.map((project) =>
                project.id === projectId ? { ...project, ...fieldsToAutofill } : project
              ),
            }
          : designer
      );
      onChange('designers', updatedDesigners);
    }

    // Close dialog and reset state
    setShowAutofillDialog(false);
    setAutofillSource(null);
    setAutofillTarget(null);
  };

  // Function to handle autofill cancellation
  const handleAutofillCancel = () => {
    setShowAutofillDialog(false);
    setAutofillSource(null);
    setAutofillTarget(null);
  };

  const isHongKong = data.country === 'Hong Kong';
  const isChina = data.country === 'China';

  return (
    <>
      {/* Section 1: Design Company Overview */}
      <FormSection title="Section 1: Design Company Overview / 設計公司概況">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Company English Name / 公司英文名"
            name="companyName"
            value={data.companyName}
            onChange={(v) => onChange('companyName', v)}
          />

          <FormInput
            label="Company Chinese Name / 公司中文名"
            name="companyNameChinese"
            value={data.companyNameChinese || ''}
            onChange={(v) => onChange('companyNameChinese', v)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Year of Incorporation / 成立年份"
            name="yearEstablished"
            type="number"
            required
            value={data.yearEstablished}
            onChange={(v) => onChange('yearEstablished', v)}
          />

          <FormInput
            label="Registered Capital / 註冊資本"
            name="registeredCapital"
            required={!isHongKong}
            placeholder="e.g., HKD 1,000,000"
            value={data.registeredCapital}
            onChange={(v) => onChange('registeredCapital', v)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            label="Country / 國家和地區"
            name="country"
            required
            value={data.country}
            onChange={(v) => onChange('country', v as string)}
            options={countryOptions}
          />

          <FormInput
            label="Office Address / 辦公地址"
            name="officeAddress"
            required
            value={data.officeAddress}
            onChange={(v) => onChange('officeAddress', v)}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-light text-gray-700 mb-1">
            Business Description / 公司或業務簡介{' '}
            <span className="text-gray-400">(Optional / 選填)</span>
          </label>
          <textarea
            value={data.businessDescription || ''}
            onChange={(e) => onChange('businessDescription', e.target.value)}
            rows={4}
            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
            placeholder="Brief introduction of your company and business"
          />
        </div>

        {isHongKong && (
          <FormInput
            label="Business Registration Number / 商業登記號"
            name="hkBusinessRegistrationNumber"
            required
            value={data.hkBusinessRegistrationNumber}
            onChange={(v) => onChange('hkBusinessRegistrationNumber', v)}
            placeholder="e.g., 12345678-000"
          />
        )}

        {isChina && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Business Registration Number / 工商註冊號"
              name="cnBusinessRegistrationNumber"
              required
              value={data.cnBusinessRegistrationNumber}
              onChange={(v) => onChange('cnBusinessRegistrationNumber', v)}
              placeholder="e.g., 123456789012345"
            />

            <FormInput
              label="Unified Social Credit Code / 統一社會信用代碼"
              name="cnUnifiedSocialCreditCode"
              required
              value={data.cnUnifiedSocialCreditCode}
              onChange={(v) => onChange('cnUnifiedSocialCreditCode', v)}
              placeholder="e.g., 123456789012345678"
            />
          </div>
        )}

        {isChina && (
          <FormInput
            label="Employees eligible to work legally in Hong Kong / 可以在香港合法工作的僱員數"
            name="hkWorkEligibleEmployees"
            type="number"
            required
            value={data.hkWorkEligibleEmployees}
            onChange={(v) => onChange('hkWorkEligibleEmployees', v)}
            placeholder="e.g., 5"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <FileUpload
            label="Business Registration / 商業登記證"
            name="businessRegistration"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            value={data.businessRegistration}
            onChange={(file) => onChange('businessRegistration', file)}
          />

          <FileUpload
            label="Company Photos / 公司形象照片"
            name="companyPhotos"
            accept=".jpg,.jpeg,.png"
            value={data.companyPhotos}
            onChange={(file) => onChange('companyPhotos', file)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-light text-gray-700">
              Design Awards / 設計獎項
            </label>
            <button
              type="button"
              onClick={addAward}
              className="px-3 py-1 bg-gray-900 text-white text-xs font-light hover:bg-gray-800 transition-colors"
            >
              + Add Award / 添加獎項
            </button>
          </div>

          <div className="space-y-2">
            {(data.designAwards || ['']).map((award, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={award}
                  onChange={(e) => updateAward(index, e.target.value)}
                  placeholder="e.g., Best Design Award 2024"
                  className="flex-1 px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                {(data.designAwards || ['']).length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAward(index)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <FormInput
          label="Design Team Size / 設計團隊規模"
          name="designTeamSize"
          type="number"
          required
          value={data.designTeamSize}
          onChange={(v) => onChange('designTeamSize', v)}
        />

        <FormSelect
          label="Prefered Fee Structure / 設計收費模式"
          name="feeStructure"
          type="checkbox"
          multiple
          required
          value={data.feeStructure}
          onChange={(v) => onChange('feeStructure', v as string[])}
          options={feeStructureOptions}
        />

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Design Highlights / 設計亮點</h4>
            <button
              type="button"
              onClick={addDesignHighlight}
              className="px-3 py-1.5 bg-gray-900 text-white text-xs font-light hover:bg-gray-800 transition-colors"
            >
              + Add Highlight / 添加亮點
            </button>
          </div>

          {(!data.designHighlights || data.designHighlights.length === 0) ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded bg-white">
              <p className="text-gray-500 text-xs">
                No highlights added yet. Click "Add Highlight" to add a project.
                <br />
                尚未添加亮點。點擊“添加亮點”添加項目。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(data.designHighlights || []).map((project, index) => (
                <div key={project.id} className="border border-gray-200 p-4 bg-gray-50 rounded">
                  <div className="flex items-center justify-between mb-3">
                    <h6 className="text-xs font-medium text-gray-900">
                      Highlight {index + 1} / 亮點 {index + 1}
                    </h6>
                    <button
                      type="button"
                      onClick={() => removeDesignHighlight(project.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove / 刪除
                    </button>
                  </div>

                  <div className="space-y-3">
                    <FormInput
                      label="Project Name / 項目名稱"
                      name={`highlight-project-name-${project.id}`}
                      required
                      value={project.projectName}
                      onChange={(v) => updateDesignHighlight(project.id, 'projectName', v)}
                      onBlur={(v) => handleProjectNameBlur(v, 'designHighlight', project.id)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormInput
                        label="Year / 年份"
                        name={`highlight-year-${project.id}`}
                        type="number"
                        required
                        value={project.year}
                        onChange={(v) => updateDesignHighlight(project.id, 'year', v)}
                        placeholder="e.g., 2024"
                      />

                      <FormInput
                        label="Area (sqft) / 面積（平方呎）"
                        name={`highlight-area-${project.id}`}
                        required
                        value={project.area}
                        onChange={(v) => updateDesignHighlight(project.id, 'area', v)}
                        placeholder="e.g., 1500 sq ft"
                      />

                      <FormInput
                        label="Building Name / 大廈名稱"
                        name={`highlight-address-${project.id}`}
                        required
                        value={project.address}
                        onChange={(v) => updateDesignHighlight(project.id, 'address', v)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormSelect
                        label="Project Scope / 是否重新裝修？"
                        name={`highlight-renovation-${project.id}`}
                        type="radio"
                        required
                        value={project.renovationType}
                        onChange={(v) => updateDesignHighlight(project.id, 'renovationType', v)}
                        options={[
                          { value: 'newFitout', label: 'New Fitout 全新装修' },
                          { value: 'remodel', label: 'Remodel 改造翻新' },
                        ]}
                      />

                      <FormSelect
                        label="Property Types / 主要項目類型"
                        name={`highlight-project-types-${project.id}`}
                        type="checkbox"
                        multiple
                        required
                        value={project.projectTypes || []}
                        onChange={(v) =>
                          updateDesignHighlight(project.id, 'projectTypes', v as string[])
                        }
                        options={projectTypeOptions}
                      />
                    </div>

                    <MultiImageUpload
                      label="Project Photos / 項目照片"
                      name={`highlight-photos-${project.id}`}
                      maxFiles={9}
                      value={project.photos}
                      onChange={(files) => updateDesignHighlight(project.id, 'photos', files)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Company Brochure
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            You can upload files or provide a link to your company website.
            <br />
            您可以上傳文件或提供公司網站連結。
          </p>

          <div className="space-y-4">
            <MultiFileUpload
              label="Upload Files / 上傳文件"
              name="companySupplementFile"
              accept=".pdf,.jpg,.jpeg,.png"
              maxFiles={10}
              value={data.companySupplementFile}
              onChange={(paths) =>
                onChange('companySupplementFile', paths.length > 0 ? paths : null)
              }
            />

            <FormInput
              label="Or enter company website / 或輸入公司網站"
              name="companySupplementLink"
              type="url"
              value={data.companySupplementLink}
              onChange={(v) => onChange('companySupplementLink', v)}
              placeholder="https://..."
            />
          </div>
        </div>
      </FormSection>

      {/* Section 2: Design Specialization */}
      <FormSection title="Section 2: Design Specialization / 設計專業">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left Column: Project Types */}
          <div>
            <FormSelect
              label="Property Types / 主要項目類型"
              name="projectTypes"
              type="checkbox"
              multiple
              required
              value={data.projectTypes}
              onChange={(v) => onChange('projectTypes', v as string[])}
              options={projectTypeOptions}
            />
          </div>

          {/* Right Column: Design Styles */}
          <div>
            {(!data.projectTypes || data.projectTypes.length === 0) ? (
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Design Styles / 擅長風格 <span className="text-red-500">*</span>
                </label>
                <div className="p-4 border-2 border-dashed border-gray-300 rounded bg-gray-50 text-center">
                  <p className="text-xs text-gray-500">
                    Please select Property Types first to see available design styles.
                    <br />
                    請先選擇項目類型，然後會顯示可選的設計風格。
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <MultiSelectWithSearch
                  label="Design Styles / 擅長風格"
                  name="designStyles"
                  value={data.designStyles || []}
                  onChange={(v) => onChange('designStyles', v)}
                  options={getAvailableStyles}
                  required
                  placeholder="Search and select styles... / 搜尋並選擇風格..."
                  emptyMessage="No styles found / 找不到風格"
                />

                {/* Custom style input when "other" is selected */}
                {data.projectTypes.includes('other') && (
                  <div className="pt-2 border-t border-gray-200">
                    <label className="block text-xs font-light text-gray-600 mb-2">
                      Custom Style / 自定義風格
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="customStyleInput"
                        placeholder="Enter custom style / 輸入自定義風格"
                        className="flex-1 px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.currentTarget;
                            const value = input.value.trim();
                            if (value) {
                              const customStyle = `custom_${value}`;
                              if (!(data.designStyles || []).includes(customStyle)) {
                                onChange('designStyles', [...(data.designStyles || []), customStyle]);
                                input.value = '';
                              }
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('customStyleInput') as HTMLInputElement;
                          if (input) {
                            const value = input.value.trim();
                            if (value) {
                              const customStyle = `custom_${value}`;
                              if (!(data.designStyles || []).includes(customStyle)) {
                                onChange('designStyles', [...(data.designStyles || []), customStyle]);
                                input.value = '';
                              }
                            }
                          }
                        }}
                        className="px-4 py-2 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors whitespace-nowrap"
                      >
                        Add / 添加
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Press Enter or click Add to add custom style / 按 Enter 或點擊添加來添加自定義風格
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Software Capability / 軟件能力
          </h4>
          <div className="space-y-4">
            <FormSelect
              label="BIM Capability / BIM能力"
              name="bimCapability"
              type="radio"
              required
              value={data.bimCapability}
              onChange={(v) => onChange('bimCapability', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 是' },
                { value: 'no', label: 'No 否' },
              ]}
            />

            <div>
              <FormSelect
                label="Main Software / 主要軟件"
                name="mainSoftware"
                type="checkbox"
                multiple
                required
                value={(data.mainSoftware || []).filter(s => softwareOptions.some(opt => opt.value === s))}
                onChange={(v) => {
                  const predefinedSoftware = v as string[];
                  const customSoftware = (data.mainSoftware || []).filter(s => !softwareOptions.some(opt => opt.value === s));
                  onChange('mainSoftware', [...predefinedSoftware, ...customSoftware]);
                }}
                options={softwareOptions}
              />

              {/* Custom Software Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-light text-gray-600">
                    Other Software / 其他軟件
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const customSoftware = (data.mainSoftware || []).filter(s => !softwareOptions.some(opt => opt.value === s));
                      onChange('mainSoftware', [...(data.mainSoftware || []), '']);
                    }}
                    className="px-2 py-1 bg-gray-600 text-white text-xs font-light hover:bg-gray-700 transition-colors"
                  >
                    + Add Other / 添加其他
                  </button>
                </div>

                <div className="space-y-2">
                  {(data.mainSoftware || [])
                    .map((software, index) => ({ software, index }))
                    .filter(({ software }) => !softwareOptions.some(opt => opt.value === software))
                    .map(({ software, index }) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={software}
                          onChange={(e) => {
                            const updated = [...(data.mainSoftware || [])];
                            updated[index] = e.target.value;
                            onChange('mainSoftware', updated);
                          }}
                          placeholder="e.g., Rhino"
                          className="flex-1 px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (data.mainSoftware || []).filter((_, i) => i !== index);
                            onChange('mainSoftware', updated);
                          }}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Section 3: Personnel Information */}
      <FormSection title="Section 3: Personnel Information / 人員信息">
        <div className="space-y-6">
          {/* Organization Chart Upload */}
          <FileUpload
            label="Organization Chart / 組織架構圖"
            name="organizationChart"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            value={data.organizationChart}
            onChange={(file) => onChange('organizationChart', file)}
          />

          {/* Designers List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">
                Design Personnel / 設計人員
                <span className="text-red-500 ml-1">*</span>
              </h4>
              <button
                type="button"
                onClick={addDesigner}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
              >
                + Add Designer / 添加設計師
              </button>
            </div>

            {(!data.designers || data.designers.length === 0) ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded">
                <p className="text-gray-500 text-sm">
                  No designers added yet. Click "Add Designer" to add personnel information.
                  <br />
                  尚未添加設計師。點擊"添加設計師"按鈕添加人員信息。
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {(data.designers || []).map((designer, designerIndex) => (
                  <div
                    key={designer.id}
                    className="border border-gray-200 p-6 bg-gray-50 rounded"
                  >
                    {/* Designer Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-sm font-medium text-gray-900">
                        Designer {designerIndex + 1} / 設計師 {designerIndex + 1}
                      </h5>
                      <button
                        type="button"
                        onClick={() => removeDesigner(designer.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Remove / 刪除
                      </button>
                    </div>

                    {/* Designer Basic Information */}
                    <div className="space-y-4 mb-6">
                      <FormInput
                        label="Designer Name / 設計師姓名"
                        name={`designer-name-${designer.id}`}
                        required
                        value={designer.name}
                        onChange={(v) => updateDesigner(designer.id, 'name', v)}
                      />

                      <FormInput
                        label="Years of Experience / 年資"
                        name={`designer-experience-${designer.id}`}
                        required
                        value={designer.experience}
                        onChange={(v) => updateDesigner(designer.id, 'experience', v)}
                        placeholder="e.g., 10 years in residential design"
                      />

                      <FileUpload
                        label="CV / 簡歷"
                        name={`designer-cv-${designer.id}`}
                        required={false}
                        accept=".pdf,.jpg,.jpeg,.png"
                        value={designer.cv}
                        onChange={(file) => updateDesigner(designer.id, 'cv', file)}
                      />
                    </div>

                    {/* Projects Section */}
                    <div className="border-t border-gray-300 pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h6 className="text-sm font-medium text-gray-900">
                          Projects / 項目經歷
                          <span className="text-red-500 ml-1">*</span>
                        </h6>
                        <button
                          type="button"
                          onClick={() => addProject(designer.id)}
                          className="px-3 py-1.5 bg-gray-700 text-white text-xs font-light hover:bg-gray-600 transition-colors"
                        >
                          + Add Project / 添加項目經歷
                        </button>
                      </div>

                      {designer.projects.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-gray-300 rounded bg-white">
                          <p className="text-gray-500 text-xs">
                            No projects added. Click "Add Project" to add project information.
                            <br />
                            尚未添加項目。點擊"添加項目"按鈕添加項目信息。
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {designer.projects.map((project, projectIndex) => (
                            <div
                              key={project.id}
                              className="border border-gray-300 p-4 bg-white rounded"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h6 className="text-xs font-medium text-gray-900">
                                  Project {projectIndex + 1} / 項目 {projectIndex + 1}
                                </h6>
                                <button
                                  type="button"
                                  onClick={() => removeProject(designer.id, project.id)}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  Remove / 刪除
                                </button>
                              </div>

                              <div className="space-y-3">
                                <FormInput
                                  label="Project Name / 項目名稱"
                                  name={`project-name-${project.id}`}
                                  required
                                  value={project.projectName}
                                  onChange={(v) =>
                                    updateProject(designer.id, project.id, 'projectName', v)
                                  }
                                  onBlur={(v) => handleProjectNameBlur(v, 'designerProject', project.id, designer.id)}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <FormInput
                                    label="Year / 年份"
                                    name={`project-year-${project.id}`}
                                    type="number"
                                    required
                                    value={project.year}
                                    onChange={(v) =>
                                      updateProject(designer.id, project.id, 'year', v)
                                    }
                                    placeholder="e.g., 2024"
                                  />

                                  <FormInput
                                    label="Area (sqft) / 面積（平方呎）"
                                    name={`project-area-${project.id}`}
                                    required
                                    value={project.area}
                                    onChange={(v) =>
                                      updateProject(designer.id, project.id, 'area', v)
                                    }
                                    placeholder="e.g., 1500 sq ft"
                                  />

                                  <FormInput
                                    label="Building Name / 大廈名稱"
                                    name={`project-address-${project.id}`}
                                    required
                                    value={project.address}
                                    onChange={(v) =>
                                      updateProject(designer.id, project.id, 'address', v)
                                    }
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormSelect
                                    label="Project Scope / 是否重新裝修？"
                                    name={`project-renovation-${project.id}`}
                                    type="radio"
                                    required
                                    value={project.renovationType}
                                    onChange={(v) =>
                                      updateProject(designer.id, project.id, 'renovationType', v)
                                    }
                                    options={[
                                      { value: 'newFitout', label: 'New Fitout 全新装修' },
                                      { value: 'remodel', label: 'Remodel 改造翻新' },
                                    ]}
                                  />

                                  <FormSelect
                                    label="Property Types / 主要項目類型"
                                    name={`project-types-${project.id}`}
                                    type="checkbox"
                                    multiple
                                    required
                                    value={project.projectTypes || []}
                                    onChange={(v) =>
                                      updateProject(designer.id, project.id, 'projectTypes', v as string[])
                                    }
                                    options={projectTypeOptions}
                                  />
                                </div>

                                <MultiImageUpload
                                  label="Project Photos / 項目照片"
                                  name={`project-photos-${project.id}`}
                                  maxFiles={9}
                                  value={project.photos}
                                  onChange={(files) =>
                                    updateProject(designer.id, project.id, 'photos', files)
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </FormSection>

      {/* Section 4: Design & Build Capability */}
      <FormSection title="Section 4: Design & Build Capability / D&B能力">
        <FormSelect
          label="Can you provide Design & Build services? / 是否能提供D&B服務？"
          name="canDoDesignBuild"
          type="radio"
          required
          value={data.canDoDesignBuild}
          onChange={(v) => onChange('canDoDesignBuild', v as 'yes' | 'no')}
          options={[
            { value: 'yes', label: 'Yes 是' },
            { value: 'no', label: 'No 否' },
          ]}
        />

        {data.canDoDesignBuild === 'yes' && (
          <div className="mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
              <p className="text-sm text-blue-900">
                Since you offer Design & Build services, please provide the following contractor information.
                <br />
                由於您提供D&B服務，請提供以下承包商信息。
              </p>
            </div>

            <DesignerDBSection
              data={data}
              onChange={onChange}
              addDbProjectManager={addDbProjectManager}
              updateDbProjectManager={updateDbProjectManager}
              removeDbProjectManager={removeDbProjectManager}
              addDbInsurance={addDbInsurance}
              updateDbInsurance={updateDbInsurance}
              removeDbInsurance={removeDbInsurance}
            />
          </div>
        )}
      </FormSection>

      {/* Project Autofill Confirmation Dialog */}
      {showAutofillDialog && autofillSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2 whitespace-nowrap">
                Duplicate Project Name Detected / 檢測到重複的項目名稱
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                A project with the name "{autofillSource.projectName}" already exists. Would you like to autofill the project details?
                <br />
                <br />
                已存在名為 "{autofillSource.projectName}" 的項目。是否需要自動填充項目信息？
              </p>

              <div className="bg-gray-50 rounded p-3 mb-4 text-xs">
                <p className="font-medium text-gray-700 mb-2 whitespace-nowrap">Existing project details / 現有項目詳情:</p>
                <div className="space-y-1 text-gray-600">
                  {autofillSource.year && <div className="whitespace-nowrap">Year / 年份: {autofillSource.year}</div>}
                  {autofillSource.area && <div className="whitespace-nowrap">Area / 面積: {autofillSource.area}</div>}
                  {autofillSource.address && <div className="whitespace-nowrap">Building Name / 大廈名稱: {autofillSource.address}</div>}
                  {autofillSource.renovationType && (
                    <div className="whitespace-nowrap">
                      Project Scope / 裝修類型:{' '}
                      {autofillSource.renovationType === 'newFitout' ? 'New Fitout 全新装修' : 'Remodel 改造翻新'}
                    </div>
                  )}
                  {autofillSource.projectTypes && autofillSource.projectTypes.length > 0 && (
                    <div className="whitespace-nowrap">Property Types / 項目類型: {autofillSource.projectTypes.join(', ')}</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleAutofillCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  No, Keep Current / 否，保持當前
                </button>
                <button
                  type="button"
                  onClick={handleAutofillConfirm}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
                >
                  Yes, Autofill / 是，自動填充
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
