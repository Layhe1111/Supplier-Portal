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
  const feeStructureOptions = [
    { value: 'byArea', label: 'By Area 按面積' },
    { value: 'byProject', label: 'By Project 按項目' },
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

  const isoOptions = [
    { value: '9001', label: 'ISO 9001' },
    { value: '14001', label: 'ISO 14001' },
    { value: '45001', label: 'ISO 45001' },
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
    onChange('mainSoftware', data.mainSoftware ? [data.mainSoftware] : ['']);
  } else if (!data.mainSoftware || data.mainSoftware.length === 0) {
    onChange('mainSoftware', ['']);
  }

  // Initialize projectTypes if undefined (for backward compatibility)
  if (!data.projectTypes) {
    onChange('projectTypes', []);
  }

  // Software management functions
  const addSoftware = () => {
    onChange('mainSoftware', [...(data.mainSoftware || ['']), '']);
  };

  const updateSoftware = (index: number, value: string) => {
    const updated = [...(data.mainSoftware || [''])];
    updated[index] = value;
    onChange('mainSoftware', updated);
  };

  const removeSoftware = (index: number) => {
    const updated = (data.mainSoftware || ['']).filter((_, i) => i !== index);
    // Ensure at least one software field remains
    onChange('mainSoftware', updated.length > 0 ? updated : ['']);
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
      languages: '',
      mainProject: '',
      year: '',
      address: '',
      area: '',
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

  const removeDbInsurance = (id: string) => {
    const updated = (data.dbInsurances || []).filter((ins) => ins.id !== id);
    onChange('dbInsurances', updated);
  };

  return (
    <>
      {/* Section 1: Design Company Overview */}
      <FormSection title="Section 1: Design Company Overview / 設計公司概況">
        <FormInput
          label="Company Legal Name / 公司全稱"
          name="companyLegalName"
          required
          value={data.companyLegalName}
          onChange={(v) => onChange('companyLegalName', v)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Year Established / 成立年份"
            name="yearEstablished"
            type="number"
            required
            value={data.yearEstablished}
            onChange={(v) => onChange('yearEstablished', v)}
          />

          <FormInput
            label="Registered Capital / 註冊資本"
            name="registeredCapital"
            required
            placeholder="e.g., HKD 1,000,000"
            value={data.registeredCapital}
            onChange={(v) => onChange('registeredCapital', v)}
          />
        </div>

        <FormInput
          label="Office Address / 辦公地址"
          name="officeAddress"
          required
          value={data.officeAddress}
          onChange={(v) => onChange('officeAddress', v)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Design Qualification Level / 設計資質等級"
            name="designQualificationLevel"
            required
            value={data.designQualificationLevel}
            onChange={(v) => onChange('designQualificationLevel', v)}
          />

          <FormInput
            label="Design Team Size / 設計團隊規模"
            name="designTeamSize"
            type="number"
            required
            value={data.designTeamSize}
            onChange={(v) => onChange('designTeamSize', v)}
          />
        </div>

        <FormSelect
          label="Fee Structure / 設計收費模式"
          name="feeStructure"
          type="checkbox"
          multiple
          required
          value={data.feeStructure}
          onChange={(v) => onChange('feeStructure', v as string[])}
          options={feeStructureOptions}
        />
      </FormSection>

      {/* Section 2: Design Specialization */}
      <FormSection title="Section 2: Design Specialization / 設計專業">
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Design Focus / 設計領域
          </h4>
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
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Areas of Expertise / 專業領域
          </h4>
          <FormSelect
            label="Project Types / 主要工程類型"
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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-light text-gray-700">
                  Main Software / 主要軟件
                  <span className="text-red-500 ml-1">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    (At least one required / 至少填一個)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={addSoftware}
                  className="px-3 py-1 bg-gray-900 text-white text-xs font-light hover:bg-gray-800 transition-colors"
                >
                  + Add Software / 添加軟件
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 justify-items-start">
                {(data.mainSoftware || ['']).map((software, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={software}
                      onChange={(e) => updateSoftware(index, e.target.value)}
                      placeholder="e.g., AutoCAD"
                      required={index === 0}
                      className="w-[240px] px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                    {(data.mainSoftware || ['']).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSoftware(index)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
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
                          Projects / 項目
                          <span className="text-red-500 ml-1">*</span>
                        </h6>
                        <button
                          type="button"
                          onClick={() => addProject(designer.id)}
                          className="px-3 py-1.5 bg-gray-700 text-white text-xs font-light hover:bg-gray-600 transition-colors"
                        >
                          + Add Project / 添加項目
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
                                    label="Area / 面積"
                                    name={`project-area-${project.id}`}
                                    required
                                    value={project.area}
                                    onChange={(v) =>
                                      updateProject(designer.id, project.id, 'area', v)
                                    }
                                    placeholder="e.g., 1500 sq ft"
                                  />

                                  <FormInput
                                    label="Address / 地址"
                                    name={`project-address-${project.id}`}
                                    required
                                    value={project.address}
                                    onChange={(v) =>
                                      updateProject(designer.id, project.id, 'address', v)
                                    }
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
