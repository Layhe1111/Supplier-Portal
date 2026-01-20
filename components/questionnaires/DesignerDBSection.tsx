import React from 'react';
import FormSection from '../FormSection';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import FormCheckbox from '../FormCheckbox';
import FileUpload from '../FileUpload';
import MultiImageUpload from '../MultiImageUpload';
import {
  DesignerFormData,
  DesignerProject,
  Insurance,
  ProjectManager,
  ProjectManagerProject,
} from '@/types/supplier';

interface DesignerDBSectionProps {
  data: DesignerFormData;
  onChange: <K extends keyof DesignerFormData>(
    field: K,
    value: DesignerFormData[K]
  ) => void;
  addDbProjectManager: () => void;
  updateDbProjectManager: (id: string, field: keyof ProjectManager, value: any) => void;
  removeDbProjectManager: (id: string) => void;
  addDbInsurance: () => void;
  updateDbInsurance: (id: string, field: keyof Insurance, value: any) => void;
  removeDbInsurance: (id: string) => void;
}

export default function DesignerDBSection({
  data,
  onChange,
  addDbProjectManager,
  updateDbProjectManager,
  removeDbProjectManager,
  addDbInsurance,
  updateDbInsurance,
  removeDbInsurance,
}: DesignerDBSectionProps) {
  const projectTypeOptions = [
    { value: 'residential', label: 'Residential 住宅' },
    { value: 'commercial', label: 'Retail 零售' },
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

  const tomorrowDateString = React.useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  // Initialize other certifications (handle legacy string data)
  const dbOtherCerts = data.dbOtherCertifications as any;
  if (!Array.isArray(dbOtherCerts) || dbOtherCerts.length === 0) {
    onChange('dbOtherCertifications', [
      {
        id: `${Date.now()}-cert`,
        name: typeof dbOtherCerts === 'string' ? dbOtherCerts : '',
        file: null,
      },
    ]);
  }

  if (!data.dbIsoCertificateUploads) {
    onChange('dbIsoCertificateUploads', {});
  }

  if (!data.dbProjectHighlights) {
    onChange('dbProjectHighlights', []);
  }

  const isChina = data.country === 'China';
  const [showAutofillDialog, setShowAutofillDialog] = React.useState(false);
  const [autofillSource, setAutofillSource] = React.useState<DesignerProject | null>(null);
  const [autofillTarget, setAutofillTarget] = React.useState<{
    pmIndex: number;
    projectIndex: number;
  } | null>(null);

  const toggleDbIsoCertification = (isoValue: string) => {
    const current = data.dbIsocertifications || [];
    const exists = current.includes(isoValue);
    const nextSelected = exists
      ? current.filter((item) => item !== isoValue)
      : [...current, isoValue];
    onChange('dbIsocertifications', nextSelected);

    const currentUploads = data.dbIsoCertificateUploads || {};
    const nextUploads: Record<string, string | File | null> = {};
    nextSelected.forEach((iso) => {
      nextUploads[iso] = currentUploads[iso] ?? null;
    });
    onChange('dbIsoCertificateUploads', nextUploads);
  };

  const addDbOtherCertification = () => {
    onChange('dbOtherCertifications', [
      ...(data.dbOtherCertifications || []),
      { id: `${Date.now()}-cert`, name: '', file: null },
    ]);
  };

  const updateDbOtherCertification = (
    id: string,
    field: 'name' | 'file',
    value: string | File | null
  ) => {
    const updated = (data.dbOtherCertifications || []).map((cert) =>
      cert.id === id ? { ...cert, [field]: value } : cert
    );
    onChange('dbOtherCertifications', updated);
  };

  const removeDbOtherCertification = (id: string) => {
    const updated = (data.dbOtherCertifications || []).filter((cert) => cert.id !== id);
    onChange(
      'dbOtherCertifications',
      updated.length > 0 ? updated : [{ id: `${Date.now()}-cert`, name: '', file: null }]
    );
  };

  const addDbProjectHighlight = () => {
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
    onChange('dbProjectHighlights', [...(data.dbProjectHighlights || []), newProject]);
  };

  const updateDbProjectHighlight = (
    projectId: string,
    field: keyof DesignerProject,
    value: any
  ) => {
    const updatedProjects = (data.dbProjectHighlights || []).map((project) =>
      project.id === projectId ? { ...project, [field]: value } : project
    );
    onChange('dbProjectHighlights', updatedProjects);
  };

  const removeDbProjectHighlight = (projectId: string) => {
    const updatedProjects = (data.dbProjectHighlights || []).filter(
      (project) => project.id !== projectId
    );
    onChange('dbProjectHighlights', updatedProjects);
  };

  const addDbProjectToManager = (pmIndex: number) => {
    const newProject: ProjectManagerProject = {
      id: `${Date.now()}-${Math.random()}`,
      projectName: '',
      clientName: '',
      year: '',
      buildingName: '',
      area: '',
    };
    const updated = [...(data.dbProjectManagers || [])];
    const targetPm = updated[pmIndex];
    if (!targetPm) return;
    const updatedProjects = [...(targetPm.projects || []), newProject];
    updated[pmIndex] = { ...targetPm, projects: updatedProjects };
    onChange('dbProjectManagers', updated as ProjectManager[]);
  };

  const findDbHighlightByName = (projectName: string) => {
    const trimmedName = projectName.trim().toLowerCase();
    if (!trimmedName) return null;
    return (data.dbProjectHighlights || []).find(
      (project) => project.projectName.trim().toLowerCase() === trimmedName
    );
  };

  const handleProjectNameBlur = (
    pmIndex: number,
    projectIndex: number,
    projectName: string
  ) => {
    const highlight = findDbHighlightByName(projectName);
    if (!highlight) return;
    setAutofillSource(highlight);
    setAutofillTarget({ pmIndex, projectIndex });
    setShowAutofillDialog(true);
  };

  const handleAutofillConfirm = () => {
    if (!autofillSource || !autofillTarget) return;
    const updated = [...(data.dbProjectManagers || [])];
    const manager = updated[autofillTarget.pmIndex];
    if (!manager) return;
    const updatedProjects = [...(manager.projects || [])];
    const target = updatedProjects[autofillTarget.projectIndex];
    if (!target) return;
    updatedProjects[autofillTarget.projectIndex] = {
      ...target,
      year: autofillSource.year,
      buildingName: autofillSource.address,
      area: autofillSource.area,
    };
    updated[autofillTarget.pmIndex] = { ...manager, projects: updatedProjects };
    onChange('dbProjectManagers', updated as ProjectManager[]);
    setShowAutofillDialog(false);
    setAutofillSource(null);
    setAutofillTarget(null);
  };

  const handleAutofillCancel = () => {
    setShowAutofillDialog(false);
    setAutofillSource(null);
    setAutofillTarget(null);
  };

  return (
    <div className="space-y-8">
      {/* Section 2: Certifications */}
      <FormSection title="Section 2: Certifications / 資質與認證">
        <div className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-light text-gray-700 mb-2">
                Do you have RGBC certificate / 是否有RGBC牌 <span className="text-red-500">*</span>
              </label>
              <select
                value={data.dbConstructionGrade === 'RGBC' ? 'yes' : 'no'}
                onChange={(e) => {
                  if (e.target.value === 'yes') {
                    onChange('dbConstructionGrade', 'RGBC');
                  } else {
                    onChange('dbConstructionGrade', '');
                    onChange('dbLicenseNumber', '');
                    onChange('dbCertificateUpload', null);
                  }
                }}
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm h-[42px]"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {data.dbConstructionGrade === 'RGBC' && (
              <>
                <FormInput
                  label="Certificate Number / 資質證書編號"
                  name="dbLicenseNumber"
                  required
                  value={data.dbLicenseNumber}
                  onChange={(v) => onChange('dbLicenseNumber', v)}
                />
                <FileUpload
                  label="Certificate Upload / 資質證書上傳"
                  name="dbCertificateUpload"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  value={data.dbCertificateUpload}
                  onChange={(file) => onChange('dbCertificateUpload', file)}
                />
              </>
            )}
          </div>
        </div>

        <div>
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-light text-gray-700">
                ISO Certification / ISO認證
              </label>
              <div className="space-y-3">
                {isoOptions.map((option) => {
                  const checked =
                    Array.isArray(data.dbIsocertifications) &&
                    data.dbIsocertifications.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className="p-3 border border-gray-200 rounded bg-white space-y-2"
                    >
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name={`db-iso-${option.value}`}
                          checked={checked}
                          onChange={() => toggleDbIsoCertification(option.value)}
                          className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>

                      {checked && (
                        <FileUpload
                          label={`${option.label} Certificate Upload / 證書上傳`}
                          name={`db-iso-${option.value}-upload`}
                          required
                          accept=".pdf,.jpg,.jpeg,.png"
                          value={data.dbIsoCertificateUploads?.[option.value] || null}
                          onChange={(file) => {
                            onChange('dbIsoCertificateUploads', {
                              ...(data.dbIsoCertificateUploads || {}),
                              [option.value]: file,
                            });
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-light text-gray-700">
                  Other Certifications / 其他認證
                  <span className="text-xs text-gray-500 ml-2">
                    Add items and upload certificates
                  </span>
                </label>
              </div>

              <div className="space-y-3">
                {(data.dbOtherCertifications || []).map((cert, index) => (
                  <div
                    key={cert.id}
                    className="p-4 border border-gray-200 bg-gray-50 rounded space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Certification {index + 1} / 認證 {index + 1}
                      </span>
                      {(data.dbOtherCertifications || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDbOtherCertification(cert.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Remove / 刪除
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Certification Name / 認證名稱"
                        name={`db-other-cert-${cert.id}`}
                        value={cert.name}
                        onChange={(v) => updateDbOtherCertification(cert.id, 'name', v)}
                        placeholder="e.g., CIC Safety Certificate"
                      />

                      <FileUpload
                        label="Certificate Upload / 證書上傳"
                        name={`db-other-cert-upload-${cert.id}`}
                        required={!!cert.name.trim()}
                        accept=".pdf,.jpg,.jpeg,.png"
                        value={cert.file}
                        onChange={(file) => updateDbOtherCertification(cert.id, 'file', file)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addDbOtherCertification}
                  className="px-3 py-1 bg-gray-900 text-white text-xs font-light hover:bg-gray-800 transition-colors"
                >
                  + Add Certification / 添加
                </button>
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Section 3: Construction Capability */}
      <FormSection title="Section 3: Construction Capability / 施工能力">
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Areas of Expertise / 專業領域
          </h4>
          <FormSelect
            label="Property Types / 主要項目類型"
            name="dbProjectTypes"
            type="checkbox"
            multiple
            required
            value={data.dbProjectTypes}
            onChange={(v) => onChange('dbProjectTypes', v as string[])}
            options={projectTypeOptions}
          />
        </div>

        {/* Project Highlights Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Project Highlights / 亮點項目
              <span className="text-red-500 ml-1">*</span>
            </h4>
          </div>

          {(!data.dbProjectHighlights || data.dbProjectHighlights.length === 0) ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded">
              <p className="text-gray-500 text-sm">
                No projects added yet. Click "Add Project" to add project highlights.
                <br />
                尚未添加項目。點擊"添加項目"按鈕添加亮點項目。
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(data.dbProjectHighlights || []).map((project, index) => (
                <div
                  key={project.id}
                  className="border border-gray-200 p-6 bg-gray-50 rounded"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-medium text-gray-900">
                      Project {index + 1} / 項目 {index + 1}
                    </h5>
                    <button
                      type="button"
                      onClick={() => removeDbProjectHighlight(project.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove / 刪除
                    </button>
                  </div>

                  <div className="space-y-4">
                    <FormInput
                      label="Project Name / 項目名稱"
                      name={`db-project-name-${project.id}`}
                      required
                      value={project.projectName}
                      onChange={(v) =>
                        updateDbProjectHighlight(project.id, 'projectName', v)
                      }
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="Year / 年份"
                        name={`db-project-year-${project.id}`}
                        type="number"
                        required
                        value={project.year}
                        onChange={(v) =>
                          updateDbProjectHighlight(project.id, 'year', v)
                        }
                        placeholder="e.g., 2024"
                      />

                      <FormInput
                        label="Area (sqft) / 面積（平方呎）"
                        name={`db-project-area-${project.id}`}
                        type="number"
                        required
                        value={project.area}
                        onChange={(v) =>
                          updateDbProjectHighlight(project.id, 'area', v)
                        }
                        placeholder="e.g., 1500 sq ft"
                      />

                      <FormInput
                        label="Building Name / 大廈名稱"
                        name={`db-project-address-${project.id}`}
                        required
                        value={project.address}
                        onChange={(v) =>
                          updateDbProjectHighlight(project.id, 'address', v)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormSelect
                        label="Project Scope / 是否重新裝修？"
                        name={`db-project-renovation-${project.id}`}
                        type="radio"
                        required
                        value={project.renovationType}
                        onChange={(v) =>
                          updateDbProjectHighlight(project.id, 'renovationType', v)
                        }
                        options={[
                          { value: 'newFitout', label: 'New Fitout 全新装修' },
                          { value: 'remodel', label: 'Remodel 改造翻新' },
                        ]}
                      />

                      {(() => {
                        const customType = (project.projectTypes || []).find((type) =>
                          type.startsWith('custom_')
                        );
                        const selectedType =
                          (project.projectTypes || []).find((type) => !type.startsWith('custom_')) ||
                          (customType ? 'other' : '');
                        const customValue = customType ? customType.slice(7) : '';
                        return (
                          <div className="space-y-2">
                            <FormSelect
                              label="Property Types / 主要項目類型"
                              name={`db-project-types-${project.id}`}
                              type="radio"
                              required
                              value={selectedType}
                              onChange={(v) => {
                                const value = String(v);
                                if (value === 'other') {
                                  const next = customValue
                                    ? ['other', `custom_${customValue}`]
                                    : ['other'];
                                  updateDbProjectHighlight(project.id, 'projectTypes', next);
                                  return;
                                }
                                updateDbProjectHighlight(project.id, 'projectTypes', [value]);
                              }}
                              options={projectTypeOptions}
                            />
                            {selectedType === 'other' && (
                              <input
                                type="text"
                                value={customValue}
                                onChange={(e) => {
                                  const value = e.target.value.trim();
                                  const next = value ? ['other', `custom_${value}`] : ['other'];
                                  updateDbProjectHighlight(project.id, 'projectTypes', next);
                                }}
                                placeholder="Enter other type / 請輸入其他類型"
                                className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                              />
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <MultiImageUpload
                      label="Project Photos / 項目照片"
                      name={`db-project-photos-${project.id}`}
                      maxFiles={9}
                      value={project.photos}
                      onChange={(files) =>
                        updateDbProjectHighlight(project.id, 'photos', files)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={addDbProjectHighlight}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
            >
              + Add Project / 添加項目
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Company Scale / 公司規模
          </h4>
          <div className="space-y-4">
            <FormInput
              label="Accumulated Project Area per Year (sqft) / 年施工面積（平方呎）"
              name="dbAnnualConstructionCapacity"
              type="number"
              required
              value={data.dbAnnualConstructionCapacity}
              onChange={(v) => onChange('dbAnnualConstructionCapacity', v)}
              placeholder="e.g., 100000"
            />

            <FormInput
              label="Maximum Number of Projects in Parallel / 最多能同時承接的項目數"
              name="dbMaxConcurrentProjects"
              type="number"
              required
              value={data.dbMaxConcurrentProjects}
              onChange={(v) => onChange('dbMaxConcurrentProjects', v)}
              placeholder="e.g., 5"
            />

            <FormInput
              label="Average Project Value (HKD) / 平均項目金額（港幣）"
              name="dbLargestProjectValue"
              type="number"
              required
              value={data.dbLargestProjectValue}
              onChange={(v) => onChange('dbLargestProjectValue', v)}
              placeholder="e.g., 5000000"
            />
          </div>
        </div>
      </FormSection>

      {/* Section 5: Personnel */}
      <FormSection title="Section 5: Personnel / 人員">
        <div className="mb-6">
          <FileUpload
            label="Contractor Organization Chart / 施工人员組織架構圖"
            name="dbOrganizationChart"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            value={data.dbOrganizationChart}
            onChange={(file) => onChange('dbOrganizationChart', file)}
          />
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Project Managers / 項目經理
          </h4>

          <div className="space-y-6">
            {(data.dbProjectManagers || []).map((pm, pmIndex) => (
              <div key={pm.id} className="p-4 border border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-sm font-medium text-gray-700">
                    Project Manager #{pmIndex + 1} / 項目經理 #{pmIndex + 1}
                  </h5>
                  {(data.dbProjectManagers || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => removeDbProjectManager(pm.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove / 刪除
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <FormInput
                    label="Name / 姓名"
                    name={`db-pm-name-${pmIndex}`}
                    required
                    value={pm.name}
                    onChange={(v) => {
                      updateDbProjectManager(pm.id, 'name', v);
                    }}
                  />

                  <FormInput
                    label="Year of Experience / 年資"
                    name={`db-pm-experience-${pmIndex}`}
                    type="number"
                    required
                    value={pm.yearsExperience || ''}
                    onChange={(v) => {
                      updateDbProjectManager(pm.id, 'yearsExperience', v);
                    }}
                    placeholder="e.g., 8"
                  />

                  <FormInput
                    label="Languages / 語言"
                    name={`db-pm-languages-${pmIndex}`}
                    required
                    value={pm.languages}
                    onChange={(v) => {
                      updateDbProjectManager(pm.id, 'languages', v);
                    }}
                    placeholder="e.g., English, Chinese, Spanish"
                  />

                  {/* Projects Section */}
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-light text-gray-700">
                        Projects / 項目經歷
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      {(pm.projects || []).map((project, projectIndex) => (
                        <div
                          key={project.id}
                          className="p-4 border border-gray-200 bg-white rounded space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              Project {projectIndex + 1} / 項目 {projectIndex + 1}
                            </span>
                            {(pm.projects || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...(data.dbProjectManagers || [])];
                                  updated[pmIndex] = {
                                    ...updated[pmIndex],
                                    projects: updated[pmIndex].projects.filter(
                                      (_: any, idx: number) => idx !== projectIndex
                                    ),
                                  };
                                  onChange('dbProjectManagers', updated as ProjectManager[]);
                                }}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove / 刪除
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput
                              label="Project Name / 項目名稱"
                              name={`db-pm-${pmIndex}-project-${projectIndex}-name`}
                              required
                              value={project.projectName}
                              onChange={(v) => {
                                const updated = [...(data.dbProjectManagers || [])];
                                const updatedProjects = [...(updated[pmIndex].projects || [])];
                                updatedProjects[projectIndex] = {
                                  ...updatedProjects[projectIndex],
                                  projectName: v,
                                };
                                updated[pmIndex] = {
                                  ...updated[pmIndex],
                                  projects: updatedProjects,
                                };
                                onChange('dbProjectManagers', updated as ProjectManager[]);
                              }}
                              onBlur={(v) => handleProjectNameBlur(pmIndex, projectIndex, v)}
                            />

                            <FormInput
                              label="Client Name / 客戶名稱"
                              name={`db-pm-${pmIndex}-project-${projectIndex}-client`}
                              required
                              value={project.clientName}
                              onChange={(v) => {
                                const updated = [...(data.dbProjectManagers || [])];
                                const updatedProjects = [...(updated[pmIndex].projects || [])];
                                updatedProjects[projectIndex] = {
                                  ...updatedProjects[projectIndex],
                                  clientName: v,
                                };
                                updated[pmIndex] = {
                                  ...updated[pmIndex],
                                  projects: updatedProjects,
                                };
                                onChange('dbProjectManagers', updated as ProjectManager[]);
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormInput
                              label="Year / 年份"
                              name={`db-pm-${pmIndex}-project-${projectIndex}-year`}
                              type="number"
                              required
                              value={project.year}
                              onChange={(v) => {
                                const updated = [...(data.dbProjectManagers || [])];
                                const updatedProjects = [...(updated[pmIndex].projects || [])];
                                updatedProjects[projectIndex] = {
                                  ...updatedProjects[projectIndex],
                                  year: v,
                                };
                                updated[pmIndex] = {
                                  ...updated[pmIndex],
                                  projects: updatedProjects,
                                };
                                onChange('dbProjectManagers', updated as ProjectManager[]);
                              }}
                              placeholder="e.g., 2023"
                            />

                            <FormInput
                              label="Building Name / 大廈名稱"
                              name={`db-pm-${pmIndex}-project-${projectIndex}-building`}
                              required
                              value={project.buildingName}
                              onChange={(v) => {
                                const updated = [...(data.dbProjectManagers || [])];
                                const updatedProjects = [...(updated[pmIndex].projects || [])];
                                updatedProjects[projectIndex] = {
                                  ...updatedProjects[projectIndex],
                                  buildingName: v,
                                };
                                updated[pmIndex] = {
                                  ...updated[pmIndex],
                                  projects: updatedProjects,
                                };
                                onChange('dbProjectManagers', updated as ProjectManager[]);
                              }}
                            />

                            <FormInput
                              label="Area (sqft) / 面積（平方呎）"
                              name={`db-pm-${pmIndex}-project-${projectIndex}-area`}
                              type="number"
                              required
                              value={project.area}
                              onChange={(v) => {
                                const updated = [...(data.dbProjectManagers || [])];
                                const updatedProjects = [...(updated[pmIndex].projects || [])];
                                updatedProjects[projectIndex] = {
                                  ...updatedProjects[projectIndex],
                                  area: v,
                                };
                                updated[pmIndex] = {
                                  ...updated[pmIndex],
                                  projects: updatedProjects,
                                };
                                onChange('dbProjectManagers', updated as ProjectManager[]);
                              }}
                              placeholder="e.g., 5000"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => addDbProjectToManager(pmIndex)}
                        className="px-3 py-1 bg-gray-900 text-white text-xs font-light hover:bg-gray-800 transition-colors"
                      >
                        + Add Project / 添加項目經歷
                      </button>
                    </div>
                  </div>

                  <FileUpload
                    label="Project Manager CV / 項目經理簡歷"
                    name={`db-pm-cv-${pmIndex}`}
                    accept=".pdf,.doc,.docx"
                    value={pm.cv}
                    onChange={(file) => {
                      const updated = [...(data.dbProjectManagers || [])];
                      updated[pmIndex] = { ...updated[pmIndex], cv: file };
                      onChange('dbProjectManagers', updated as ProjectManager[]);
                    }}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addDbProjectManager}
              className="w-full py-2.5 border border-dashed border-gray-300 text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
            >
              + Add Project Manager / 添加項目經理
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <FormSelect
              label="Do you have Safety Officer(s)? / 是否有安全主任？"
              name="dbHasSafetyOfficer"
              type="radio"
              required
              value={data.dbHasSafetyOfficer}
              onChange={(v) => onChange('dbHasSafetyOfficer', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 有' },
                { value: 'no', label: 'No 無' },
              ]}
            />

            {data.dbHasSafetyOfficer === 'yes' && (
              <div className="mt-4">
                <FormInput
                  label="Number of Safety Officers / 安全主任人數"
                  name="dbNumberOfSafetyOfficers"
                  type="number"
                  required
                  value={data.dbNumberOfSafetyOfficers}
                  onChange={(v) => onChange('dbNumberOfSafetyOfficers', v)}
                  placeholder="e.g., 3"
                />
              </div>
            )}
          </div>

          <div>
            <FormSelect
              label="Do you have Construction Manager(s)? / 是否有施工經理？"
              name="dbHasConstructionManager"
              type="radio"
              required
              value={data.dbHasConstructionManager}
              onChange={(v) => onChange('dbHasConstructionManager', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 有' },
                { value: 'no', label: 'No 無' },
              ]}
            />

            {data.dbHasConstructionManager === 'yes' && (
              <div className="mt-4">
                <FormInput
                  label="Number of Construction Managers / 施工經理人數"
                  name="dbNumberOfConstructionManagers"
                  type="number"
                  required
                  value={data.dbNumberOfConstructionManagers}
                  onChange={(v) => onChange('dbNumberOfConstructionManagers', v)}
                  placeholder="e.g., 5"
                />
              </div>
            )}
          </div>

          <div>
            <FormSelect
              label="Do you have MEP Lead(s)? / 是否有機電負責人？"
              name="dbHasMepLead"
              type="radio"
              required
              value={data.dbHasMepLead}
              onChange={(v) => onChange('dbHasMepLead', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 有' },
                { value: 'no', label: 'No 無' },
              ]}
            />

            {data.dbHasMepLead === 'yes' && (
              <div className="mt-4">
                <FormInput
                  label="Number of MEP Leads / 機電負責人人數"
                  name="dbNumberOfMepLeads"
                  type="number"
                  required
                  value={data.dbNumberOfMepLeads}
                  onChange={(v) => onChange('dbNumberOfMepLeads', v)}
                  placeholder="e.g., 2"
                />
              </div>
            )}
          </div>
        </div>
      </FormSection>

      {/* Section 6: Compliance and Governance */}
      <FormSection title="Section 6: Compliance and Governance / 合規與治理">
        {isChina && (
          <div className="mb-6">
            <FormCheckbox
              label="If taking projects in Hong Kong, we commit to hiring workers who can legally work in Hong Kong and hold valid HKID and Construction Safety Certificate / 如在香港承接項目，保證聘請可在香港合法工作的工人且持有有效香港身份證與建造業安全證明書（平安咭）"
              name="dbCnHkProjectCompliance"
              checked={!!data.dbCnHkProjectCompliance}
              onChange={(v) => onChange('dbCnHkProjectCompliance', v)}
              required
            />
          </div>
        )}

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Insurance / 保險 (At least one required / 至少需要一個)
          </h4>

          <div className="space-y-6">
            {(data.dbInsurances || []).map((insurance, index) => (
              <div key={insurance.id} className="p-4 border border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-sm font-medium text-gray-700">
                    Insurance #{index + 1} / 保險 #{index + 1}
                  </h5>
                  {(data.dbInsurances || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDbInsurance(insurance.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove / 刪除
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <FormSelect
                    label="Insurance Type / 保險類型"
                    name={`db-insurance-type-${index}`}
                    required
                    value={insurance.type}
                    onChange={(v) => updateDbInsurance(insurance.id, 'type', v)}
                    options={[
                      { value: "Contractors' All Risks", label: "Contractors' All Risks 建築工程保險" },
                      { value: 'General Liability insurance', label: 'General Liability insurance 第三者責任保險' },
                      { value: 'Worker Compensation', label: 'Worker Compensation 僱員補償保險' },
                    ]}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Insurance Provider / 保險公司"
                      name={`db-insurance-provider-${index}`}
                      required
                      value={insurance.provider}
                      onChange={(v) => updateDbInsurance(insurance.id, 'provider', v)}
                      placeholder="e.g., AIA, HSBC Insurance"
                    />

                    <FormInput
                      label="Expiry Date / 到期日期"
                      name={`db-insurance-expiry-${index}`}
                      type="date"
                      required
                      value={insurance.expiryDate}
                      min={tomorrowDateString}
                      onChange={(v) => updateDbInsurance(insurance.id, 'expiryDate', v)}
                    />
                  </div>

                  <FileUpload
                    label="Insurance Certificate / 保險證明"
                    name={`db-insurance-file-${index}`}
                    accept=".pdf,.jpg,.jpeg,.png"
                    value={insurance.file}
                    onChange={(file) => updateDbInsurance(insurance.id, 'file', file)}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addDbInsurance}
              className="w-full py-2.5 border border-dashed border-gray-300 text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
            >
              + Add Insurance / 添加保險
            </button>
          </div>
        </div>

        <div className="mb-6">
          <FormSelect
            label="Do you have Environmental Health and Safety policy? / 是否有環境健康安全政策？"
            name="dbHasEnvironmentalHealthSafety"
            type="radio"
            required
            value={data.dbHasEnvironmentalHealthSafety}
            onChange={(v) => onChange('dbHasEnvironmentalHealthSafety', v as 'yes' | 'no')}
            options={[
              { value: 'yes', label: 'Yes 有' },
              { value: 'no', label: 'No 無' },
            ]}
          />

          {data.dbHasEnvironmentalHealthSafety === 'yes' && (
            <div className="mt-4">
              <FileUpload
                label="Environmental Health and Safety Document / 環境健康安全文件"
                name="dbEnvironmentalHealthSafetyFile"
                accept=".pdf"
                value={data.dbEnvironmentalHealthSafetyFile}
                onChange={(file) => onChange('dbEnvironmentalHealthSafetyFile', file)}
              />
            </div>
          )}
        </div>

        <div className="mb-6">
          <FormSelect
            label="Any incidents in the past 3 years? / 過去3年是否有任何事故？"
            name="dbHasIncidentsPast3Years"
            type="radio"
            required
            value={data.dbHasIncidentsPast3Years}
            onChange={(v) => onChange('dbHasIncidentsPast3Years', v as 'yes' | 'no')}
            options={[
              { value: 'yes', label: 'Yes 有' },
              { value: 'no', label: 'No 無' },
            ]}
          />

          {data.dbHasIncidentsPast3Years === 'yes' && (
            <div className="mt-4">
              <FileUpload
                label="Incidents Report / 事故報告"
                name="dbIncidentsFile"
                required
                accept=".pdf"
                value={data.dbIncidentsFile}
                onChange={(file) => onChange('dbIncidentsFile', file)}
              />
            </div>
          )}
        </div>

        <div>
          <FormSelect
            label="Any litigation in the past 3 years? / 過去3年是否有任何訴訟？"
            name="dbHasLitigationPast3Years"
            type="radio"
            required
            value={data.dbHasLitigationPast3Years}
            onChange={(v) => onChange('dbHasLitigationPast3Years', v as 'yes' | 'no')}
            options={[
              { value: 'yes', label: 'Yes 有' },
              { value: 'no', label: 'No 無' },
            ]}
          />

          {data.dbHasLitigationPast3Years === 'yes' && (
            <div className="mt-4">
              <FileUpload
                label="Litigation Report / 訴訟報告"
                name="dbLitigationFile"
                required
                accept=".pdf"
                value={data.dbLitigationFile}
                onChange={(file) => onChange('dbLitigationFile', file)}
              />
            </div>
          )}
        </div>
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
    </div>
  );
}
