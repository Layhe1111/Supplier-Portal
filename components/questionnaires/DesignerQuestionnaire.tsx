import React from 'react';
import FormSection from '../FormSection';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import FileUpload from '../FileUpload';
import MultiImageUpload from '../MultiImageUpload';
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

  const designStyleOptions = [
    { value: 'modernMinimalist', label: 'Modern Minimalist 現代簡約' },
    { value: 'chinese', label: 'Chinese Style 中式' },
    { value: 'european', label: 'European Style 歐式' },
    { value: 'industrial', label: 'Industrial 工業風' },
    { value: 'eclectic', label: 'Eclectic 混搭' },
    { value: 'other', label: 'Other 其他' },
  ];

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
      projects: [],
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

  const isHongKong = data.country === 'Hong Kong';
  const isChina = data.country === 'China';

  return (
    <>
      {/* Section 1: Design Company Overview */}
      <FormSection title="Section 1: Design Company Overview / 設計公司概況">
        <FormInput
          label="Entity Name / 公司全稱"
          name="companyLegalName"
          required
          value={data.companyLegalName}
          onChange={(v) => onChange('companyLegalName', v)}
        />

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
            label="Country / 國家和地区"
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
              label="Business Registration Number / 工商注冊號"
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
            label="Employees eligible to work legally in Hong Kong / 可以在香港合法工作的雇員數"
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
            onChange={(file) => onChange('businessRegistration', file)}
          />

          <FileUpload
            label="Company Photos / 公司形象照片"
            name="companyPhotos"
            accept=".jpg,.jpeg,.png"
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
                        label="Property Types / 主要项目類型"
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
            您可以上傳文件或提供公司網站鏈接。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-light text-gray-700 mb-2">
                Upload Files / 上傳文件
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  onChange('companySupplementFile', files.length > 0 ? files : null);
                }}
                className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: PDF, JPG, PNG / 支援格式：PDF、JPG、PNG
              </p>
              {data.companySupplementFile && (
                <p className="text-xs text-gray-500 mt-1">
                  {Array.isArray(data.companySupplementFile)
                    ? `${data.companySupplementFile.length} file(s) selected / 已選擇 ${data.companySupplementFile.length} 個文件`
                    : '1 file selected / 已選擇 1 個文件'}
                </p>
              )}
            </div>

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
        <div className="mb-6">

          <FormSelect
            label="Design Styles / 擅長風格"
            name="designStyles"
            type="checkbox"
            multiple
            required
            value={data.designStyles}
            onChange={(v) => onChange('designStyles', v as string[])}
            options={designStyleOptions}
          />
        </div>

        <div className="mb-6">
          <FormSelect
            label="Property Types / 主要项目類型"
            name="projectTypes"
            type="checkbox"
            multiple
            required
            value={data.projectTypes}
            onChange={(v) => onChange('projectTypes', v as string[])}
            options={projectTypeOptions}
          />
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
                        label="Experience / 資歷"
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
                                    label="Property Types / 主要项目類型"
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
    </>
  );
}
